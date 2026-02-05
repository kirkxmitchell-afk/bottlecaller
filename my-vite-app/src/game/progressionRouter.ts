// src/game/progressionRouter.ts
import { decideAllowedTierFromSnapshot } from "./progressionEvaluator";
import type { Tier, ProgressionSnapshot } from "./progressionRules";

export type DecideAllowedTierInput = {
  userId?: string | null;
  restaurantId?: string | null;

  desiredTier: Tier;

  // stats coming from views (or computed)
  encountersTotal?: number | null;

  last10Count?: number | null;
  last10Greens?: number | null;
  last10Reds?: number | null;

  anyRedT2Plus?: boolean | null;

  pivotsTaken?: number | null;
  pivotsSuccess?: number | null;

  attemptedPromotion?: Tier | null; // optional
};

export type DecideAllowedTierOutput = {
  tierToServe: Tier;
  reasons: string[]; // keep as string to avoid coupling your UI to evaluator enums
};

function n(x: unknown, fallback = 0): number {
  const v = typeof x === "number" ? x : Number(x);
  return Number.isFinite(v) ? v : fallback;
}

export function decideAllowedTier(input: DecideAllowedTierInput): DecideAllowedTierOutput {
  const desiredTier: Tier = input.desiredTier === 3 ? 3 : input.desiredTier === 2 ? 2 : 1;

  // If caller wants Tier 1, always allow (cheap fast-path)
  if (desiredTier === 1) return { tierToServe: 1, reasons: [] };

  const snapshot: ProgressionSnapshot = {
    encountersTotal: n(input.encountersTotal, 0),

    last10Count: n(input.last10Count, 0),
    last10Greens: n(input.last10Greens, 0),
    last10Reds: n(input.last10Reds, 0),

    anyRedT2Plus: !!input.anyRedT2Plus,

    pivotsTaken: n(input.pivotsTaken, 0),
    pivotsSuccess: n(input.pivotsSuccess, 0),
  };

  const { tierToServe, reasonsByTier } = decideAllowedTierFromSnapshot(snapshot);

  // Don’t ever serve higher than desiredTier (engine asked for a specific tier window)
  const finalTier: Tier = (tierToServe > desiredTier ? desiredTier : tierToServe) as Tier;

  // Reasons should correspond to the *desired* tier gate failing (what manager expects)
  const reasons = (reasonsByTier[desiredTier] || []).map(String);

  return { tierToServe: finalTier, reasons };
}
