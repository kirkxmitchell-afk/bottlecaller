// src/lib/bcSync.ts
import { peekBatch, markSent, markFailed, BCQueuedEvent } from "./bcQueue";
import { getSupabaseParent } from "./supabaseParent.js";

const supabase = getSupabaseParent();

const BATCH_SIZE = 50;
const BASE_BACKOFF_MS = 800;
const MAX_BACKOFF_MS = 10_000;

// Cache context so we don't refetch profile every flush
const CTX_TTL_MS = 60_000; // 60s is plenty
let ctxCache:
  | { userId: string; restaurantId: string | null; fetchedAt: number }
  | null = null;

let isFlushing = false;
let backoffMs = BASE_BACKOFF_MS;

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function computeBackoff() {
  backoffMs = Math.min(MAX_BACKOFF_MS, Math.floor(backoffMs * 1.6));
  return backoffMs;
}

function resetBackoff() {
  backoffMs = BASE_BACKOFF_MS;
}

/**
 * Fetch authenticated user + (optional) restaurant_id from profiles.
 * - Cached for CTX_TTL_MS
 * - If profile/restaurant_id not set yet, returns null safely
 */
async function getContext(forceRefresh = false) {
  if (
    !forceRefresh &&
    ctxCache &&
    Date.now() - ctxCache.fetchedAt < CTX_TTL_MS
  ) {
    return { userId: ctxCache.userId, restaurantId: ctxCache.restaurantId };
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  const userId = session?.user?.id;
  if (!userId) throw new Error("not_authenticated");

  // Fetch restaurant_id from profiles (optional)
  let restaurantId: string | null = null;

  // IMPORTANT:
  // - If your profiles table uses "id" instead of "user_id", change the eq() column.
  // - Many Supabase setups use profiles.user_id referencing auth.users.id (uuid).
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("restaurant_id")
    .eq("user_id", userId)
    .maybeSingle();

  // If profiles row doesn't exist yet, maybeSingle returns null data without error in many cases.
  // If your schema behaves differently, we still won't block logging.
  if (profErr) {
    console.warn("[BC] getContext profile fetch failed (continuing):", profErr);
  } else {
    restaurantId = (profile?.restaurant_id as string | null) ?? null;
  }

  ctxCache = { userId, restaurantId, fetchedAt: Date.now() };
  return { userId, restaurantId };
}

function toDbRow(
  e: BCQueuedEvent,
  ctx: { userId: string; restaurantId: string | null }
) {
  return {
    event_id: e.eventId,
    user_id: ctx.userId,
    restaurant_id: ctx.restaurantId, // ✅ now wired from profiles when available
    event_type: e.eventType,         // ✅ supports encounter_resolved + ritual_completed + future events
    payload: e.payload,
    occurred_at: new Date(e.createdAt).toISOString(),
  };
}

export async function flushQueueToServer(opts?: {
  force?: boolean;
  online?: boolean;
}) {
  if (isFlushing) return;

  const online = opts?.online ?? navigator.onLine;
  if (!online && !opts?.force) return;

  isFlushing = true;

  try {
    // Always refresh context once per flush (but cached)
    const ctx = await getContext(false);

    while (true) {
      const batch = peekBatch(BATCH_SIZE);
      if (batch.length === 0) break;

      const rows = batch.map((e) => toDbRow(e, ctx));
      const ids = batch.map((e) => e.eventId);

      const { error } = await supabase
        .from("bc_event_log")
        .upsert(rows, { onConflict: "event_id" });

      if (error) throw error;

      markSent(ids);
      resetBackoff();
    }
  } catch (err) {
    // Mark the oldest pending batch as failed (increments attempts)
    const batch = peekBatch(BATCH_SIZE);
    if (batch.length) markFailed(batch.map((e) => e.eventId));

    const wait = computeBackoff();
    await sleep(wait);
  } finally {
    isFlushing = false;
  }
}
