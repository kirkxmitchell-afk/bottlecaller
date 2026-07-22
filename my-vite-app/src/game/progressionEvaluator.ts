// src/game/progressionEvaluator.ts
import { PROGRESSION_RULES, type Tier, type ProgressionSnapshot } from "./progressionRules";

export type LockReason =
  | "insufficient_total_encounters"
  | "insufficient_last10_data"
  | "green_rate_too_low"
  | "too_many_reds_last10"
  | "red_in_t2plus_forbidden"
  | "pivot_success_required";

export interface TierEvaluation {
  tier: Tier;
  ok: boolean;
  reasons: LockReason[];
  details: Record<string, unknown>;
}

/** Safe division helper */
function rate(num: number, den: number): number {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return 0;
  return num / den;
}

/**
 * Evaluates whether a player is eligible to be SERVED a given tier.
 * Pure function: no window, no DB, no side-effects.
 */
export function evaluateTierEligibility(tier: Tier, s: ProgressionSnapshot): TierEvaluation {
  const rule = PROGRESSION_RULES[tier];
  const reasons: LockReason[] = [];

  const encountersTotal = Number(s.encountersTotal ?? 0) || 0;
  const last10Count = Number(s.last10Count ?? 0) || 0;
  const last10Greens = Number(s.last10Greens ?? 0) || 0;
  const last10Reds = Number(s.last10Reds ?? 0) || 0;

  // Tier 1 is always ok (by contract)
  if (tier === 1) {
    return {
      tier,
      ok: true,
      reasons: [],
      details: {
        encountersTotal,
        last10Count,
      },
    };
  }

  // Total encounters gate
  if (encountersTotal < rule.minEncountersTotal) {
    reasons.push("insufficient_total_encounters");
  }

  // Window gate: if you require last10 quality metrics, ensure we actually have last10
  const needsLast10 =
    rule.minGreenRateLast10 > 0 || Number.isFinite(rule.maxRedsLast10) || rule.maxRedsLast10 !== Infinity;

  const requiredRecentCount = tier === 2 ? Math.min(10, rule.minEncountersTotal) : 10;

  if (needsLast10 && last10Count < requiredRecentCount) {
    reasons.push("insufficient_last10_data");
  }

  // Green rate gate
  const greenRate = rate(last10Greens, last10Count);
  if (last10Count >= requiredRecentCount && greenRate < rule.minGreenRateLast10) {
    reasons.push("green_rate_too_low");
  }

  // Reds gate
  if (last10Count >= requiredRecentCount && last10Reds > rule.maxRedsLast10) {
    reasons.push("too_many_reds_last10");
  }

  // Tier 3: forbid any red in T2+
  if (tier === 3 && rule.forbidRedT2Plus && !!s.anyRedT2Plus) {
    reasons.push("red_in_t2plus_forbidden");
  }

  // Tier 3: must show pivot success evidence (simple version)
  if (tier === 3 && rule.requirePivotSuccess) {
    const pivotsSuccess = Number(s.pivotsSuccess ?? 0) || 0;
    if (pivotsSuccess < 1) reasons.push("pivot_success_required");
  }

  return {
    tier,
    ok: reasons.length === 0,
    reasons,
    details: {
      rule,
      requiredRecentCount,
      encountersTotal,
      last10Count,
      last10Greens,
      last10Reds,
      greenRate,
      anyRedT2Plus: !!s.anyRedT2Plus,
      pivotsTaken: Number(s.pivotsTaken ?? 0) || 0,
      pivotsSuccess: Number(s.pivotsSuccess ?? 0) || 0,
    },
  };
}

/**
 * Decide the highest tier allowed (1..3) given a snapshot.
 * This is what your ProgressionBridge should call.
 */
export function decideAllowedTierFromSnapshot(s: ProgressionSnapshot): {
  tierToServe: Tier;
  reasonsByTier: Record<Tier, LockReason[]>;
} {
  const t2 = evaluateTierEligibility(2, s);
  const t3 = evaluateTierEligibility(3, s);

  const reasonsByTier: Record<Tier, LockReason[]> = {
    1: [],
    2: t2.reasons,
    3: t3.reasons,
  };

  if (t3.ok) return { tierToServe: 3, reasonsByTier };
  if (t2.ok) return { tierToServe: 2, reasonsByTier };
  return { tierToServe: 1, reasonsByTier };
}

/** Optional: turn lock reasons into manager-readable copy */
export function describeLockReasons(reasons: LockReason[]): string[] {
  const uniq = Array.from(new Set(reasons));
  return uniq.map((r) => {
    switch (r) {
      case "insufficient_total_encounters":
        return "Not enough encounters completed yet.";
      case "insufficient_last10_data":
        return "Need 10 recent encounters to evaluate readiness.";
      case "green_rate_too_low":
        return "Recent green rate is too low.";
      case "too_many_reds_last10":
        return "Too many reds in the last 10.";
      case "red_in_t2plus_forbidden":
        return "A red occurred in Tier 2+ (Tier 3 requires zero).";
      case "pivot_success_required":
        return "Tier 3 requires at least one successful pivot recovery.";
      default:
        return "Progression requirement not met.";
    }
  });
}
