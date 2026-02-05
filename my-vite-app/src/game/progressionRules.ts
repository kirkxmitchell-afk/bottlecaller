// src/game/progressionRules.ts

export type Tier = 1 | 2 | 3;

export type ProgressionSnapshot = {
  // minimum signals needed to decide tier
  encountersTotal: number;

  last10Count: number;
  last10Greens: number;
  last10Reds: number;

  anyRedT2Plus: boolean;

  pivotsTaken: number;
  pivotsSuccess: number;
};

export type TierRule = {
  minEncountersTotal: number;
  minGreenRateLast10: number; // 0..1
  maxRedsLast10: number; // integer (0..10)
  forbidRedT2Plus: boolean;
  requirePivotSuccess: boolean;
};

// LOCKED contract: Tier 1 always allowed, Tier 2 requires stability, Tier 3 requires mastery + no red in T2+
export const PROGRESSION_RULES: Record<Tier, TierRule> = {
  1: {
    minEncountersTotal: 0,
    minGreenRateLast10: 0,
    maxRedsLast10: 10,
    forbidRedT2Plus: false,
    requirePivotSuccess: false,
  },
  2: {
    minEncountersTotal: 5,      // must have finished Tier 1 (1–5)
    minGreenRateLast10: 0.6,    // at least 60% green in last 10
    maxRedsLast10: 1,           // allow at most 1 red in last 10
    forbidRedT2Plus: false,
    requirePivotSuccess: false,
  },
  3: {
    minEncountersTotal: 12,     // must have completed through Tier 2 range (6–12)
    minGreenRateLast10: 0.8,    // at least 80% green in last 10
    maxRedsLast10: 0,           // zero reds in last 10
    forbidRedT2Plus: true,      // **hard rule**
    requirePivotSuccess: true,  // must prove at least one successful pivot
  },
};
