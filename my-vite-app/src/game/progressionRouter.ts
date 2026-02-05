// src/game/progressionRouter.ts
import { supabase } from "../lib/supabaseClient";
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
  snapshot: ProgressionSnapshot;
};

export async function decideAllowedTier(
  input: DecideAllowedTierInput
): Promise<DecideAllowedTierOutput> {
  const desiredTier: Tier =
    input.desiredTier === 3 ? 3 : input.desiredTier === 2 ? 2 : 1;

  // --- DB READ (bc_readiness_v1) ---
  let snap: ProgressionSnapshot = {
    encountersTotal: 0,
    last10Count: 0,
    last10Greens: 0,
    last10Reds: 0,
    anyRedT2Plus: false,
    pivotsTaken: 0,
    pivotsSuccess: 0,
  };

  if (input.userId && input.restaurantId) {
    const { data: r, error: rErr } = await supabase
      .from("bc_readiness_v1")
      .select("last10_count,last10_greens,last10_reds,session_any_red_t2plus")
      .eq("user_id", input.userId)
      .eq("restaurant_id", input.restaurantId)
      .maybeSingle();

    if (rErr) throw rErr;

    const { data: t, error: tErr } = await supabase
      .from("bc_sessions_v1")
      .select("encounters_total:encounters_resolved.sum(),pivots_taken_total:pivots_taken.sum(),pivots_success_total:pivots_success.sum()")
      .eq("user_id", input.userId)
      .eq("restaurant_id", input.restaurantId)
      .maybeSingle();

    if (tErr) throw tErr;

    snap.last10Count = Number(r?.last10_count ?? 0) || 0;
    snap.last10Greens = Number(r?.last10_greens ?? 0) || 0;
    snap.last10Reds = Number(r?.last10_reds ?? 0) || 0;
    snap.anyRedT2Plus = !!r?.session_any_red_t2plus;

    snap.encountersTotal = Number(t?.encounters_total ?? 0) || 0;
    snap.pivotsTaken = Number(t?.pivots_taken_total ?? 0) || 0;
    snap.pivotsSuccess = Number(t?.pivots_success_total ?? 0) || 0;
  } else {
    // optional extras if you later wire them
    snap.encountersTotal = input.encountersTotal ?? snap.last10Count;
    snap.pivotsTaken = input.pivotsTaken ?? 0;
    snap.pivotsSuccess = input.pivotsSuccess ?? 0;
  }

  const { tierToServe, reasonsByTier } =
    decideAllowedTierFromSnapshot(snap);

  // never serve higher than requested
  const finalTier: Tier =
    tierToServe > desiredTier ? desiredTier : tierToServe;

  const reasons = reasonsByTier[desiredTier] || [];

  return {
    tierToServe: finalTier,
    reasons,
    reasonsHuman: describeLockReasons(reasons),
    snapshot: snap,
  };
}
