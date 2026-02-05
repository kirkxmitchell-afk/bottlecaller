// src/game/progressionRules.ts

export type Tier = 1 | 2 | 3;

export interface ProgressionSnapshot {
  encountersTotal: number;

  // Last-N window (already derivable from views)
  last10Count: number;
  last10Greens: number;
  last10Yellows: number;
  last10Reds: number;

  // Tier-specific risk
  anyRedT2Plus: boolean;

  // Pivot signal
  pivotsTaken: number;
  pivotsSuccess: number;
}

export interface TierRule {
  minEncountersTotal: number;
  minGreenRateLast10: number;     // 0–1
  maxRedsLast10: number;          // absolute
  forbidRedT2Plus: boolean;
  requirePivotSuccess: boolean;
}

export const PROGRESSION_RULES: Record<Tier, TierRule> = {
  1: {
    // Tier 1 is always allowed
    minEncountersTotal: 0,
    minGreenRateLast10: 0,
    maxRedsLast10: Infinity,
    forbidRedT2Plus: false,
    requirePivotSuccess: false,
  },

  2: {
    // “Can you perform cleanly without pressure?”
    minEncountersTotal: 8,
    minGreenRateLast10: 0.7,   // 7 / 10 greens
    maxRedsLast10: 1,          // tolerance for learning
    forbidRedT2Plus: false,
    requirePivotSuccess: false,
  },

  3: {
    // “Can you survive pressure?”
    minEncountersTotal: 12,
    minGreenRateLast10: 0.75,  // 3 out of 4 decisions correct
    maxRedsLast10: 0,          // zero tolerance
    forbidRedT2Plus: true,
    requirePivotSuccess: true, // must prove recovery skill
  },
};
