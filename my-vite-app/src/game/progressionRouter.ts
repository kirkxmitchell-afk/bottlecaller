// src/game/progressionRouter.ts
import { decideAllowedTierFromSnapshot, describeLockReasons } from "./progressionEvaluator";
import type { Tier, ProgressionSnapshot } from "./progressionRules";

export type DecideAllowedTierInput = {
  // ctx (iframe always has these once handshake works)
  userId?: string | null;
  restaurantId?: string | null;

  desiredTier: Tier;

  // optional “caller-supplied stats”
  encountersTotal?: number | null;
  last10Count?: number | null;
  last10Greens?: number | null;
  last10Reds?: number | null;
  anyRedT2Plus?: boolean | null;
  pivotsTaken?: number | null;
  pivotsSuccess?: number | null;

  attemptedPromotion?: Tier | null;
};

export type DecideAllowedTierOutput = {
  tierToServe: Tier;
  reasons: string[];        // reasons for the *requested* tier
  reasonsHuman: string[];   // same, manager-readable
  snapshot?: ProgressionSnapshot; // optional: for debugging
};

function num(x: unknown, fallback = 0): number {
  const v = typeof x === "number" ? x : Number(x);
  return Number.isFinite(v) ? v : fallback;
}

function normalizeTier(x: unknown): Tier {
  return x === 3 ? 3 : x === 2 ? 2 : 1;
}

function hasStats(input: DecideAllowedTierInput): boolean {
  // if any stat exists, treat as “stats provided”
  return (
    input.encountersTotal != null ||
    input.last10Count != null ||
    input.last10Greens != null ||
    input.last10Reds != null ||
    input.anyRedT2Plus != null ||
    input.pivotsTaken != null ||
    input.pivotsSuccess != null
  );
}

function snapFromInput(input: DecideAllowedTierInput): ProgressionSnapshot {
  return {
    encountersTotal: num(input.encountersTotal, 0),
    last10Count: num(input.last10Count, 0),
    last10Greens: num(input.last10Greens, 0),
    last10Reds: num(input.last10Reds, 0),
    anyRedT2Plus: !!input.anyRedT2Plus,
    pivotsTaken: num(input.pivotsTaken, 0),
    pivotsSuccess: num(input.pivotsSuccess, 0),
  };
}

/**
 * Optional injection point:
 * - In iframe OR parent you can set:
 *   window.__BC_GET_PROGRESSION_SNAPSHOT__ = async ({ userId, restaurantId }) => ProgressionSnapshot
 */
async function maybeFetchSnapshot(input: DecideAllowedTierInput): Promise<ProgressionSnapshot | null> {
  const g: any = globalThis as any;
  const fn = g.__BC_GET_PROGRESSION_SNAPSHOT__;
  if (typeof fn !== "function") return null;

  const userId = input.userId || null;
  const restaurantId = input.restaurantId || null;
  if (!userId || !restaurantId) return null;

  const snap = await fn({ userId, restaurantId });
  if (!snap) return null;

  // normalize for safety
  return {
    encountersTotal: num((snap as any).encountersTotal, 0),
    last10Count: num((snap as any).last10Count, 0),
    last10Greens: num((snap as any).last10Greens, 0),
    last10Reds: num((snap as any).last10Reds, 0),
    anyRedT2Plus: !!(snap as any).anyRedT2Plus,
    pivotsTaken: num((snap as any).pivotsTaken, 0),
    pivotsSuccess: num((snap as any).pivotsSuccess, 0),
  };
}

/**
 * NOTE: async is intentional — iframe already `await`s it.
 * If you don't inject a snapshot fetcher, this still works (falls back safely).
 */
export async function decideAllowedTier(input: DecideAllowedTierInput): Promise<DecideAllowedTierOutput> {
  const desiredTier: Tier = normalizeTier(input.desiredTier);

  // 1) prefer caller-provided stats
  let snap: ProgressionSnapshot;
  if (hasStats(input)) {
    snap = snapFromInput(input);
  } else {
    // 2) otherwise try injected snapshot fetcher
    const fetched = await maybeFetchSnapshot(input);
    snap = fetched ?? {
      encountersTotal: 0,
      last10Count: 0,
      last10Greens: 0,
      last10Reds: 0,
      anyRedT2Plus: false,
      pivotsTaken: 0,
      pivotsSuccess: 0,
    };
  }

  const { tierToServe, reasonsByTier } = decideAllowedTierFromSnapshot(snap);

  // never serve higher than requested
  const finalTier: Tier = (tierToServe > desiredTier ? desiredTier : tierToServe) as Tier;

  const reasons = (reasonsByTier[desiredTier] || []).map(String);
  const reasonsHuman = describeLockReasons(reasonsByTier[desiredTier] || []);

  return {
    tierToServe: finalTier,
    reasons,
    reasonsHuman,
    snapshot: snap,
  };
}
