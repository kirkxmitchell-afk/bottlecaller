// src/game/progressionRouter.ts
import { decideAllowedTierFromSnapshot, describeLockReasons } from "./progressionEvaluator";
import type { Tier, ProgressionSnapshot } from "./progressionRules";

export type DecideAllowedTierInput = {
  userId?: string | null;
  restaurantId?: string | null;

  desiredTier: Tier;

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
  reasons: string[];
  reasonsHuman?: string[];
};

function num(x: unknown, fallback = 0): number {
  const v = typeof x === "number" ? x : Number(x);
  return Number.isFinite(v) ? v : fallback;
}

export function decideAllowedTier(input: DecideAllowedTierInput): DecideAllowedTierOutput {
  const desiredTier: Tier = input.desiredTier === 3 ? 3 : input.desiredTier === 2 ? 2 : 1;

  const snap: ProgressionSnapshot = {
    encountersTotal: num(input.encountersTotal, 0),
    last10Count: num(input.last10Count, 0),
    last10Greens: num(input.last10Greens, 0),
    last10Reds: num(input.last10Reds, 0),
    anyRedT2Plus: !!input.anyRedT2Plus,
    pivotsTaken: num(input.pivotsTaken, 0),
    pivotsSuccess: num(input.pivotsSuccess, 0),
  };

  const { tierToServe, reasonsByTier } = decideAllowedTierFromSnapshot(snap);

  // never serve higher than requested
  const finalTier: Tier = (tierToServe > desiredTier ? desiredTier : tierToServe) as Tier;

  const reasons = (reasonsByTier[desiredTier] || []).map(String);

  return {
    tierToServe: finalTier,
    reasons,
    reasonsHuman: describeLockReasons(reasonsByTier[desiredTier] || []),
  };
}
