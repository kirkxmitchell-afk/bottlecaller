import type { MasterProfile, QualityEffect, QualityMatrix } from "./typesV2";

export const QUALITY_EFFECTS: Record<string, QualityEffect> = {
  optimal: { progress: 3, frustration: -1 },
  good: { progress: 2, frustration: 0 },
  poor: { progress: 0, frustration: 1 },
  disaster: { progress: 0, frustration: 2 },
  early_commit: { progress: 0, frustration: 2 },
};

function makeMatrix(matrix: QualityMatrix): QualityMatrix {
  return matrix;
}

export const MASTER_PROFILES: Record<string, MasterProfile> = {
  discovery: {
    id: "discovery",
    coreNeed: "Help me understand.",
    appliesTo: ["tourist", "first_time_visitor", "local_experience", "wine_newcomer"],
    matrix: makeMatrix({
      ask: {
        preference: "good",
        occasion: "poor",
        experience: "optimal",
        budget: "disaster",
      },
      recommend: {
        flavour: "good",
        story: "optimal",
        value: "disaster",
        confidence: "poor",
      },
      commit: {
        recommendation: "optimal",
        assumption: "good",
        celebration: "poor",
        value: "disaster",
      },
    }),
  },
  reassurance: {
    id: "reassurance",
    coreNeed: "Help me feel safe.",
    appliesTo: ["overwhelmed_guest", "decision_fatigue", "fear_of_wrong_choice", "griever"],
    matrix: makeMatrix({
      ask: {
        preference: "optimal",
        occasion: "disaster",
        experience: "good",
        budget: "poor",
      },
      recommend: {
        flavour: "good",
        story: "disaster",
        value: "poor",
        confidence: "optimal",
      },
      commit: {
        recommendation: "good",
        assumption: "optimal",
        celebration: "disaster",
        value: "poor",
      },
    }),
  },
  recognition: {
    id: "recognition",
    coreNeed: "Show me you understand me.",
    appliesTo: ["regular", "skeptic", "wine_lover", "collector", "returning_guest"],
    matrix: makeMatrix({
      ask: {
        preference: "optimal",
        occasion: "good",
        experience: "poor",
        budget: "disaster",
      },
      recommend: {
        flavour: "good",
        story: "optimal",
        value: "disaster",
        confidence: "poor",
      },
      commit: {
        recommendation: "optimal",
        assumption: "poor",
        celebration: "good",
        value: "disaster",
      },
    }),
  },
  momentum: {
    id: "momentum",
    coreNeed: "Lead me.",
    appliesTo: ["birthday_table", "celebrator", "time_pressure", "large_group", "dictator"],
    matrix: makeMatrix({
      ask: {
        preference: "good",
        occasion: "optimal",
        experience: "disaster",
        budget: "poor",
      },
      recommend: {
        flavour: "good",
        story: "poor",
        value: "disaster",
        confidence: "optimal",
      },
      commit: {
        recommendation: "poor",
        assumption: "optimal",
        celebration: "good",
        value: "disaster",
      },
    }),
  },
};

export function getMasterProfile(profileId: string | null | undefined): MasterProfile | null {
  if (!profileId) return null;
  return MASTER_PROFILES[String(profileId).trim().toLowerCase()] || null;
}
