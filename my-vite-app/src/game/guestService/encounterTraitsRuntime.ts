import type {
  CommitReadiness,
  DiscoveryNeed,
  GuestEncounterTraits,
  Tolerance,
} from "./types";

export type ResistanceLevel = "low" | "medium" | "high";

export type EncounterTraitRuntime = {
  traits: GuestEncounterTraits;
  resistanceLevel: ResistanceLevel;
  discoveryNeed: DiscoveryNeed;
};

export const DEFAULT_ENCOUNTER_TRAITS: GuestEncounterTraits = {
  askTolerance: "medium",
  recommendationTolerance: "medium",
  commitReadiness: "normal",
  pressureSensitivity: "medium",
};

export function normalizeResistanceLevel(
  value: string | null | undefined,
): ResistanceLevel {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "low" || raw === "high") return raw;
  return "medium";
}

export function normalizeDiscoveryNeed(
  value: string | null | undefined,
): DiscoveryNeed {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "low" || raw === "high") return raw;
  return "medium";
}

export function maxAskBeforePenalty(tolerance: Tolerance): number {
  if (tolerance === "low") return 1;
  if (tolerance === "high") return 3;
  return 2;
}

export function maxRecommendBeforePenalty(tolerance: Tolerance): number {
  if (tolerance === "low") return 1;
  if (tolerance === "high") return 3;
  return 2;
}

export function commitProgressFloor(
  readiness: CommitReadiness,
  standardProgress: number,
  readyProgress: number,
): { standard: number; ready: number; minTurnsDelta: number } {
  if (readiness === "early") {
    return {
      standard: Math.max(4, standardProgress - 2),
      ready: Math.max(6, readyProgress - 1),
      minTurnsDelta: -1,
    };
  }
  if (readiness === "late") {
    return {
      standard: standardProgress + 1,
      ready: readyProgress + 1,
      minTurnsDelta: 1,
    };
  }
  return {
    standard: standardProgress,
    ready: readyProgress,
    minTurnsDelta: 0,
  };
}

export function pressureFrictionMultiplier(
  sensitivity: Tolerance,
  resistance: ResistanceLevel,
): number {
  let multiplier = 1;
  if (sensitivity === "high") multiplier += 0.35;
  if (sensitivity === "low") multiplier -= 0.25;
  if (resistance === "high") multiplier += 0.25;
  if (resistance === "low") multiplier -= 0.2;
  return Math.max(0.5, multiplier);
}

/**
 * Low discovery guests get less value from exploratory Asks.
 * High discovery guests get a small boost on first useful Ask.
 */
export function askProgressMultiplier(
  discoveryNeed: DiscoveryNeed,
  askCountBeforeThis: number,
): number {
  if (discoveryNeed === "low") {
    return askCountBeforeThis === 0 ? 0.5 : 0.25;
  }
  if (discoveryNeed === "high") {
    return askCountBeforeThis === 0 ? 1.25 : 1;
  }
  return 1;
}
