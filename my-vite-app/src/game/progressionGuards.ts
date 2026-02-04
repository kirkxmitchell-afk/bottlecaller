// src/game/progressionGuards.ts
// BottleCaller Progression Contract — Runtime Guards (LOCKED)
//
// Philosophy:
// - Guards do NOT compute skill.
// - Guards only prevent illegal states and illegal transitions.
// - If a guard triggers, you clamp or block. No negotiation.

export type Tier = 1 | 2 | 3;
export type Signal = "green" | "yellow" | "red";

export type WeakestLink = "READ" | "MODE" | "HOOK" | "DELIVERY" | "PIVOT" | "NONE";

export type Readiness = "STABLE" | "GROWING" | "FRAGILE" | "UNKNOWN";

export type RecentWindow = {
  // rolling window metrics (e.g., last 10)
  n: number;

  greens: number;
  yellows: number;
  reds: number;

  avgChainScore: number | null;

  // recovery behaviour (recent window)
  recoveryAttempts: number;        // pivot_taken true count (or recovery prompts)
  recoverySuccess: number;         // pivot_success true count
  recoveryAvoidance: number;       // "should have recovered but didn't" if you track it; else 0

  // pressure / panic heuristics (simple)
  panicPattern: boolean;           // derived from repeated reds, rapid resets, etc.
  fatigueTrend: boolean;           // if your fatigue view says trend-fatigue is high

  // weakest link snapshot
  weakestLink: WeakestLink;
  weakestRate: number | null;      // 0..1, null if insufficient
};

export type ProgressionState = {
  tier: Tier;
  readiness: Readiness;
  weakestLink: WeakestLink;
  drillDoneToday: boolean;
};

export type ProgressionDecision = {
  // what the engine is trying to do
  nextTier?: Tier;                 // attempted tier change
  allowedTiers: Tier[];            // tiers engine is willing to serve encounters from
  requestedEncounterTier?: Tier;   // if encounter router requests a tier
};

export type GuardResult = {
  ok: boolean;
  // sanitized/clamped decision the engine MUST obey
  decision: ProgressionDecision;
  // for debug/logging only (not shown to player)
  reasons: string[];
};

export type BcCtx = {
  userId: string | null;
  restaurantId: string | null;
  role: string | null;
  mode: "demo" | "premium" | null;
};

function hardAssert(cond: any, msg: string): asserts cond {
  if (!cond) throw new Error(`[BC_GUARD] ${msg}`);
}

function clampTier(t: number): Tier {
  if (t <= 1) return 1;
  if (t >= 3) return 3;
  return 2;
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

// -------------------------------
// Guard rules (LOCKED contract)
// -------------------------------
export const BCProgressionGuard = {
  // Run this BEFORE selecting the next encounter or applying tier changes.
  enforce(
    state: ProgressionState,
    win: RecentWindow,
    intent: ProgressionDecision
  ): GuardResult {
    const reasons: string[] = [];

    // ========== Invariants ==========
    // Rule: weakest link must be singular.
    hardAssert(!!state.weakestLink, "weakestLink missing");
    hardAssert(
      ["READ","MODE","HOOK","DELIVERY","PIVOT","NONE"].includes(state.weakestLink),
      `invalid weakestLink=${state.weakestLink}`
    );

    // Rule: system cannot respond to time/plays directly (engine guard can't detect that),
    // but we can enforce: no tier promotion from drills alone.
    if (state.drillDoneToday && intent.nextTier && intent.nextTier > state.tier) {
      reasons.push("block.promo_from_drill");
      intent.nextTier = undefined;
    }

    // ========== Tier permission is revocable ==========
    // Hard regression: panic pattern => revoke higher tiers immediately.
    if (win.panicPattern) {
      reasons.push("hard_regression.panic_pattern");
      intent.allowedTiers = [1];
      intent.nextTier = undefined;
      intent.requestedEncounterTier = 1;
      return { ok: false, decision: sanitize(intent), reasons };
    }

    // Fatigue trend: do not increase complexity
    if (win.fatigueTrend && intent.nextTier && intent.nextTier > state.tier) {
      reasons.push("block.promo_under_fatigue");
      intent.nextTier = undefined;
    }

    // ========== Promotion gates ==========
    // Tier 1 -> 2
    if (state.tier === 1 && intent.nextTier === 2) {
      const pass = gate_T1_to_T2(win);
      if (!pass.ok) {
        reasons.push(...pass.reasons.map(r => `block.t1_to_t2.${r}`));
        intent.nextTier = undefined;
      }
    }

    // Tier 2 -> 3
    if (state.tier === 2 && intent.nextTier === 3) {
      const pass = gate_T2_to_T3(win);
      if (!pass.ok) {
        reasons.push(...pass.reasons.map(r => `block.t2_to_t3.${r}`));
        intent.nextTier = undefined;
      }
    }

    // ========== Soft regression ==========
    // Repeated yellows / stagnation => narrow difficulty, prefer safer tiers.
    const yellowCluster = win.n >= 6 && win.yellows >= Math.ceil(win.n * 0.5) && win.reds === 0;
    if (yellowCluster) {
      reasons.push("soft_regression.yellow_cluster");
      // Keep tier, but narrow allowed tiers to current or below.
      intent.allowedTiers = uniq(intent.allowedTiers.filter(t => t <= state.tier)) as Tier[];
      if (!intent.allowedTiers.length) intent.allowedTiers = [state.tier];
      if (intent.requestedEncounterTier && intent.requestedEncounterTier > state.tier) {
        intent.requestedEncounterTier = state.tier;
      }
    }

    // ========== Weakest Link Law ==========
    // Any attempt to increase tier while weakest rate is high is illegal.
    if (
      intent.nextTier &&
      intent.nextTier > state.tier &&
      win.weakestLink !== "NONE" &&
      (win.weakestRate ?? 0) >= 0.35 // tune; "danger threshold"
    ) {
      reasons.push("block.promo.weakest_link_not_resolved");
      intent.nextTier = undefined;
    }

    // ========== Encounter tier cannot exceed allowed tiers ==========
    if (intent.requestedEncounterTier) {
      if (!intent.allowedTiers.includes(intent.requestedEncounterTier)) {
        reasons.push("clamp.encounter_tier_to_allowed");
        intent.requestedEncounterTier = Math.min(...intent.allowedTiers) as Tier;
      }
    }

    // Final sanitize
    const decision = sanitize(intent);
    const ok = reasons.length === 0;
    return { ok, decision, reasons };
  },
};

// -------------------------------
// Gate logic (pure checks)
// -------------------------------
function gate_T1_to_T2(win: RecentWindow): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  // “no repeated reds”
  if (win.reds >= 2) reasons.push("too_many_reds");
  // “avg chain score >= stability threshold”
  if (win.avgChainScore == null || win.avgChainScore < 3.0) reasons.push("low_chain_score");
  // “at least one successful recovery”
  if (win.recoverySuccess < 1) reasons.push("no_recovery_success");
  // “weakest link below danger threshold”
  if ((win.weakestRate ?? 1) >= 0.35) reasons.push("weakest_rate_high");
  return { ok: reasons.length === 0, reasons };
}

function gate_T2_to_T3(win: RecentWindow): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  // “recovery success > failure”
  const fails = Math.max(0, (win.recoveryAttempts ?? 0) - (win.recoverySuccess ?? 0));
  if ((win.recoveryAttempts ?? 0) < 1) reasons.push("recovery_not_attempted");
  if (!((win.recoverySuccess ?? 0) > fails)) {
    reasons.push("recovery_not_net_positive");
  }
  // “no panic pattern” handled earlier
  // “confidence trend rising or stable” -> approximate using weakestRate + reds
  if (win.reds > 0) reasons.push("recent_red_present");
  if ((win.weakestRate ?? 1) >= 0.25) reasons.push("weakest_rate_not_low_enough");
  return { ok: reasons.length === 0, reasons };
}

function sanitize(intent: ProgressionDecision): ProgressionDecision {
  // Ensure allowedTiers are valid + sorted
  const allowed = uniq((intent.allowedTiers || []).map(t => clampTier(t))).sort() as Tier[];
  hardAssert(allowed.length > 0, "allowedTiers empty");
  const out: ProgressionDecision = { ...intent, allowedTiers: allowed };

  if (out.nextTier != null) out.nextTier = clampTier(out.nextTier);
  if (out.requestedEncounterTier != null) out.requestedEncounterTier = clampTier(out.requestedEncounterTier);

  // nextTier cannot exceed max allowed tier
  if (out.nextTier && out.nextTier > Math.max(...allowed)) out.nextTier = undefined;

  return out;
}

export function installProgressionGuards(getCtx: () => BcCtx | null) {
  // runtime assertions you want the game to obey
  function assertCtx() {
    const ctx = getCtx();
    const mode = ctx?.mode || (window as any).__BC_MODE__ || null;
    if (!mode) throw new Error("[PROGRESSION] ctx missing mode");
    if (!ctx?.userId) throw new Error("[PROGRESSION] ctx missing userId");
    if (mode === "premium" && !ctx.restaurantId) {
      throw new Error("[PROGRESSION] premium requires restaurantId");
    }
    return { ...ctx, mode };
  }

  // expose a single callable “contract” API inside the iframe
  const ProgressionBridge = {
    getCtx: () => getCtx(),
    assertCtx,

    // Example guard: forbid Tier2+ if not enough Tier1 reps (you can swap your logic in here)
    decideAllowedTier(stats: {
      tier1Wins: number;
      tier2Wins: number;
      tier3Wins: number;
      last10Greens: number;
      anyRedT2Plus: boolean;
    }) {
      const ctx = assertCtx();

      // demo: lock at tier1
      if (ctx.mode === "demo") return 1;

      // premium: example rule (replace with your “contract”)
      if (stats.anyRedT2Plus) return 1;
      if (stats.tier1Wins < 3) return 1;
      if (stats.tier2Wins < 2) return 2;
      return 3;
    },
  };

  // install onto iframe window (this is what you'll call from console/tests)
  // @ts-ignore
  window.ProgressionBridge = ProgressionBridge;

  return ProgressionBridge;
}
