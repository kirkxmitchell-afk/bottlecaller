// src/parent/progressionRouter.ts
import { getSupabaseParent } from "../lib/supabaseParent.js";
import { decideAllowedTierFromSnapshot, describeLockReasons } from "../game/progressionEvaluator";
import type { Tier, ProgressionSnapshot } from "../game/progressionRules";
import { normalizeProgressionSnapshot } from "./progressionShared.js";

export type DecideAllowedTierInput = {
  userId?: string | null;
  restaurantId?: string | null;

  desiredTier: Tier;
  snapshot?: ProgressionSnapshot | null;
  pointsTotal?: number | null;

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

function buildSnapshotFromPoints(pointsTotal: number): ProgressionSnapshot {
  const points = Math.max(0, Math.floor(Number(pointsTotal || 0)));

  if (points >= 12) {
    return {
      encountersTotal: 12,
      last10Count: 10,
      last10Greens: 10,
      last10Reds: 0,
      anyRedT2Plus: false,
      pivotsTaken: 1,
      pivotsSuccess: 1,
    };
  }

  if (points >= 5) {
    return {
      encountersTotal: 5,
      last10Count: Math.min(10, Math.max(points, 5)),
      last10Greens: Math.min(10, Math.max(points, 5)),
      last10Reds: 0,
      anyRedT2Plus: false,
      pivotsTaken: 0,
      pivotsSuccess: 0,
    };
  }

  return {
    encountersTotal: points,
    last10Count: Math.min(points, 4),
    last10Greens: Math.min(points, 4),
    last10Reds: 0,
    anyRedT2Plus: false,
    pivotsTaken: 0,
    pivotsSuccess: 0,
  };
}

export async function decideAllowedTier(
  input: DecideAllowedTierInput
): Promise<DecideAllowedTierOutput> {
  const desiredTier: Tier =
    input.desiredTier === 3 ? 3 : input.desiredTier === 2 ? 2 : 1;

  let snap: ProgressionSnapshot = normalizeProgressionSnapshot(input.snapshot) || {
    encountersTotal: 0,
    last10Count: 0,
    last10Greens: 0,
    last10Reds: 0,
    anyRedT2Plus: false,
    pivotsTaken: 0,
    pivotsSuccess: 0,
  };

  const pointsTotal = Number(input.pointsTotal);
  if (!input.snapshot && Number.isFinite(pointsTotal) && pointsTotal >= 0) {
    snap = buildSnapshotFromPoints(pointsTotal);
  } else if (!input.snapshot && input.userId && input.restaurantId) {
    const supabase = getSupabaseParent();

    // Fallback legacy DB views if no points-backed spine is available.
    const { data: r, error: rErr } = await supabase
      .from("bc_readiness_v1")
      .select("last10_count,last10_greens,last10_reds,session_any_red_t2plus")
      .eq("user_id", input.userId)
      .eq("restaurant_id", input.restaurantId)
      .maybeSingle();

    if (rErr) throw rErr;

    snap.last10Count = Number(r?.last10_count ?? 0) || 0;
    snap.last10Greens = Number(r?.last10_greens ?? 0) || 0;
    snap.last10Reds = Number(r?.last10_reds ?? 0) || 0;
    snap.anyRedT2Plus = !!r?.session_any_red_t2plus;

    // Totals (pre-aggregated in a view)
    const { data: t, error: tErr } = await supabase
      .from("bc_totals_v1")
      .select("encounters_total,pivots_taken_total,pivots_success_total")
      .eq("user_id", input.userId)
      .eq("restaurant_id", input.restaurantId)
      .maybeSingle();

    if (tErr) throw tErr;

    snap.encountersTotal = Number(t?.encounters_total ?? 0) || 0;
    snap.pivotsTaken = Number(t?.pivots_taken_total ?? 0) || 0;
    snap.pivotsSuccess = Number(t?.pivots_success_total ?? 0) || 0;
  } else if (!input.snapshot) {
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
