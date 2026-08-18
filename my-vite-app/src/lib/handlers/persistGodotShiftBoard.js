import { buildGodotShiftEncounterDrafts } from "../../game/v2ProgressionAuthority.ts";

function isMissingRelationError(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "42703" ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("could not find")
  );
}

export async function upsertWaiterLeaderboardRow({
  supabase,
  userId,
  restaurantId,
  canonicalState = null,
} = {}) {
  if (!supabase || !userId || !restaurantId) return { ok: false, skipped: true };
  const economy = canonicalState?.economy && typeof canonicalState.economy === "object"
    ? canonicalState.economy
    : {};
  const authority = canonicalState?.authority && typeof canonicalState.authority === "object"
    ? canonicalState.authority
    : {};
  const totalPoints = Math.max(
    0,
    Number(economy.authorityPoints ?? economy.ap ?? authority.totalAP ?? economy.points ?? 0) || 0,
  );
  const servedTier = Math.max(
    1,
    Math.min(3, Math.round(Number(authority.tierToServe ?? economy.tier ?? 1) || 1)),
  );
  const row = {
    user_id: userId,
    restaurant_id: restaurantId,
    total_points: totalPoints,
    last_activity_at: new Date().toISOString(),
    served_tier: servedTier,
    tier_to_serve: servedTier,
  };

  const { error } = await supabase
    .from("bc_waiter_leaderboard_v1")
    .upsert(row, { onConflict: "user_id,restaurant_id" });
  if (!error) return { ok: true };

  if (isMissingRelationError(error)) {
    const slim = {
      user_id: userId,
      restaurant_id: restaurantId,
      total_points: totalPoints,
      last_activity_at: row.last_activity_at,
    };
    const retry = await supabase
      .from("bc_waiter_leaderboard_v1")
      .upsert(slim, { onConflict: "user_id,restaurant_id" });
    if (!retry.error) return { ok: true };
    console.warn("[LEADERBOARD] upsert failed", retry.error);
    return { ok: false, error: retry.error };
  }

  console.warn("[LEADERBOARD] upsert failed", error);
  return { ok: false, error };
}

export async function persistGodotShiftEncounterRows({
  supabase,
  userId,
  restaurantId,
  payload = {},
  occurredAt = null,
} = {}) {
  if (!supabase || !userId || !restaurantId) return { ok: false, skipped: true, inserted: 0 };
  const drafts = buildGodotShiftEncounterDrafts(payload);
  if (!drafts.length) return { ok: true, inserted: 0 };

  const stamp = occurredAt || payload?.occurredAt || payload?.occurred_at || new Date().toISOString();
  let inserted = 0;
  for (const draft of drafts) {
    const row = {
      event_id: draft.eventId,
      user_id: userId,
      restaurant_id: restaurantId,
      occurred_at: stamp,
      encounter_id: draft.encounterId,
      performance_grade: draft.performanceGrade,
      chain_signal: draft.chainSignal,
      is_green: draft.isGreen,
      is_red: draft.isRed,
      outcome: draft.outcome,
      mode: draft.mode,
      bottle_served: draft.bottleServed,
      reflection: draft.reflection,
    };
    const { error } = await supabase
      .from("bc_encounter_resolutions_v2")
      .upsert(row, { onConflict: "event_id" });
    if (error) {
      console.warn("[GODOT BOARD] encounter upsert failed", { eventId: draft.eventId, error });
      continue;
    }
    inserted += 1;
  }
  return { ok: true, inserted };
}
