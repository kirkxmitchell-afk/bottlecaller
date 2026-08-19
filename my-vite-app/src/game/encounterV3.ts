import { getDifficultyPolicyV2 } from "./engineV2";
import type {
  ChoiceQuality,
  EncounterImageSet,
  EncounterMoodV3,
  V2DifficultyMode,
} from "./typesV2";

export const ENCOUNTER_MOOD_V3_ORDER: readonly EncounterMoodV3[] = [
  "furious",
  "annoyed",
  "slightly_annoyed",
  "confused",
  "neutral",
  "mild_interest",
  "engaged",
  "very_engaged",
  "ready_to_buy",
] as const;

export interface EncounterMoodV3Input {
  progress?: number | null;
  frustration?: number | null;
  mistakeCount?: number | null;
  difficultyMode?: V2DifficultyMode | string | null;
  lastQuality?: ChoiceQuality | string | null;
}

function asCount(value: unknown): number {
  const count = Number(value || 0);
  return Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
}

export function resolveEncounterMoodV3(input: EncounterMoodV3Input): EncounterMoodV3 {
  const progress = asCount(input.progress);
  const frustration = asCount(input.frustration);
  const mistakeCount = asCount(input.mistakeCount);
  const quality = String(input.lastQuality || "").toLowerCase();
  const policy = getDifficultyPolicyV2(input.difficultyMode);

  // Friction has visual priority over progress so a damaged table cannot look won over.
  if (
    frustration >= policy.criticalResistance ||
    mistakeCount >= policy.maxMistakes
  ) {
    return "furious";
  }
  if (
    frustration >= 3 ||
    mistakeCount >= 3 ||
    quality === "disaster" ||
    quality === "early_commit"
  ) {
    return "annoyed";
  }
  if (frustration >= 2 || mistakeCount >= 2) {
    return "slightly_annoyed";
  }
  if (frustration >= 1 || mistakeCount >= 1 || quality === "poor") {
    return "confused";
  }

  if (progress >= policy.readyCommitProgress) return "ready_to_buy";
  if (progress >= Math.max(7, policy.standardCommitProgress + 1)) return "very_engaged";
  if (progress >= 5) return "engaged";
  if (progress >= 2) return "mild_interest";
  return "neutral";
}

const MOOD_FALLBACKS: Record<EncounterMoodV3, readonly EncounterMoodV3[]> = {
  furious: ["furious", "annoyed", "slightly_annoyed", "confused"],
  annoyed: ["annoyed", "slightly_annoyed", "furious", "confused"],
  slightly_annoyed: ["slightly_annoyed", "confused", "annoyed", "furious"],
  confused: ["confused", "slightly_annoyed", "neutral"],
  neutral: ["neutral", "confused", "mild_interest"],
  mild_interest: ["mild_interest", "engaged", "neutral"],
  engaged: ["engaged", "very_engaged", "mild_interest"],
  very_engaged: ["very_engaged", "ready_to_buy", "engaged"],
  ready_to_buy: ["ready_to_buy", "very_engaged", "engaged"],
};

function legacyMoodImage(images: EncounterImageSet, mood: EncounterMoodV3): string {
  if (
    mood === "confused" ||
    mood === "slightly_annoyed" ||
    mood === "annoyed" ||
    mood === "furious"
  ) {
    return String(images.mainNegative || images.mainNeutral || "");
  }
  if (
    mood === "mild_interest" ||
    mood === "engaged" ||
    mood === "very_engaged" ||
    mood === "ready_to_buy"
  ) {
    return String(images.mainPositive || images.mainNeutral || "");
  }
  return String(images.mainNeutral || "");
}

export function getEncounterMoodImageV3(
  images: EncounterImageSet | null | undefined,
  mood: EncounterMoodV3,
): string {
  if (!images) return "";
  for (const candidate of MOOD_FALLBACKS[mood]) {
    const source = String(images.moods?.[candidate] || "");
    if (source) return source;
  }
  return legacyMoodImage(images, mood);
}

export function getEncounterMoodNeighborsV3(mood: EncounterMoodV3): EncounterMoodV3[] {
  const index = ENCOUNTER_MOOD_V3_ORDER.indexOf(mood);
  if (index < 0) return ["neutral"];
  return [
    ENCOUNTER_MOOD_V3_ORDER[index - 1],
    ENCOUNTER_MOOD_V3_ORDER[index],
    ENCOUNTER_MOOD_V3_ORDER[index + 1],
  ].filter((value): value is EncounterMoodV3 => Boolean(value));
}
