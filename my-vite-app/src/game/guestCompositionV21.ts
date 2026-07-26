/**
 * BottleCaller update v2.1 — guest composition.
 *
 * guestType  → scoring / timing / difficulty bias
 * guestId    → depiction seed + art
 * partyShape → single | couple (explicit, or inferred from art/copy)
 * depiction  → contextual floor + wine dialogue
 */

import type { GuestProfile, GuestType, PartyShape } from "./guestProfiles";
import {
  getGuestProfile,
  inferPartyShapeFromArt,
  resolvePartyShape,
} from "./guestProfiles";
import type {
  AskType,
  ChoiceQuality,
  CommitType,
  EncounterGuestResponseMap,
  EncounterV2,
  RecommendAngle,
} from "./typesV2";

export const GUEST_COMPOSITION_VERSION = "v2.1" as const;

/** Optimal wine lanes by guest type — preference→flavour→recommendation is NOT universal. */
export const TYPE_OPTIMAL_LANES: Record<
  GuestType,
  {
    ask: AskType;
    recommend: RecommendAngle;
    commit: CommitType;
  }
> = {
  tourist: {
    ask: "experience",
    recommend: "story",
    commit: "recommendation",
  },
  regular: {
    ask: "preference",
    recommend: "flavour",
    commit: "recommendation",
  },
  skeptic: {
    ask: "preference",
    recommend: "story",
    commit: "recommendation",
  },
};

/** Floor wine-service time multipliers (POS entry / bar collect / wine deliver). */
export const TYPE_WINE_SERVICE_TIME_MULTIPLIER: Record<GuestType, number> = {
  tourist: 1.12,
  regular: 0.92,
  skeptic: 1.2,
};

export type GuestCompositionV21 = {
  version: typeof GUEST_COMPOSITION_VERSION;
  guestId: string;
  guestType: GuestType;
  partyShape: PartyShape;
  partyShapeSource: "explicit" | "inferred";
  depiction: string;
  displayName: string;
  optimalLane: (typeof TYPE_OPTIMAL_LANES)[GuestType];
  wineServiceTimeMultiplier: number;
};

export function composeGuestV21(
  guestId: string | null | undefined,
  overrides: {
    partyShape?: PartyShape | string | null;
    depiction?: string | null;
    artPath?: string | null;
    guestHint?: string | null;
  } = {},
): GuestCompositionV21 | null {
  const profile = getGuestProfile(guestId);
  if (!profile) return null;

  const hasExplicit =
    overrides.partyShape === "single" ||
    overrides.partyShape === "couple" ||
    profile.partyShape === "single" ||
    profile.partyShape === "couple";

  const partyShape = resolvePartyShape({
    explicit: overrides.partyShape ?? profile.partyShape,
    guestId: profile.guestId,
    depiction: overrides.depiction || profile.depiction,
    guestHint: overrides.guestHint || profile.depiction,
    artPath: overrides.artPath,
  });

  const inferredOnly = inferPartyShapeFromArt({
    guestId: profile.guestId,
    depiction: overrides.depiction || profile.depiction,
    guestHint: overrides.guestHint || profile.depiction,
    artPath: overrides.artPath,
  });

  const partyShapeSource: "explicit" | "inferred" =
    hasExplicit && (overrides.partyShape === partyShape || profile.partyShape === partyShape)
      ? "explicit"
      : inferredOnly === partyShape
        ? "inferred"
        : "explicit";

  const partyLabel = partyShape === "couple" ? "Couple table" : "Single guest";
  const baseDepiction = String(overrides.depiction || profile.depiction || "").trim();
  const depiction = baseDepiction.startsWith(partyLabel)
    ? baseDepiction
    : `${partyLabel}. ${baseDepiction}`;

  return {
    version: GUEST_COMPOSITION_VERSION,
    guestId: profile.guestId,
    guestType: profile.guestType,
    partyShape,
    partyShapeSource,
    depiction,
    displayName: profile.displayName,
    optimalLane: TYPE_OPTIMAL_LANES[profile.guestType],
    wineServiceTimeMultiplier: TYPE_WINE_SERVICE_TIME_MULTIPLIER[profile.guestType],
  };
}

/** Rewrite guest voice for single vs couple context. */
export function applyPartyShapeToDialogue(
  text: string,
  partyShape: PartyShape,
): string {
  const raw = String(text || "");
  if (!raw) return raw;

  if (partyShape === "couple") {
    return raw
      .replace(/\bfor me\b/gi, "for us")
      .replace(/\bI usually\b/g, "We usually")
      .replace(/\bI just want\b/g, "We just want")
      .replace(/\bI do not\b/g, "We do not")
      .replace(/\bI don't\b/g, "We don't")
      .replace(/\bI've\b/g, "We've")
      .replace(/\bI know\b/g, "We know");
  }

  return raw
    .replace(/\bthe two of us\b/gi, "me")
    .replace(/\bboth of us\b/gi, "me")
    .replace(/\bWe're\b/g, "I'm")
    .replace(/\bwe're\b/g, "I'm")
    .replace(/\bWe've\b/g, "I've")
    .replace(/\bwe've\b/g, "I've")
    .replace(/\bWe\b/g, "I")
    .replace(/\bwe\b/g, "I")
    .replace(/\bOur\b/g, "My")
    .replace(/\bour\b/g, "my")
    .replace(/\bUs\b/g, "Me")
    .replace(/\bus\b/g, "me");
}

function mapResponsePack(
  pack: EncounterGuestResponseMap | undefined,
  partyShape: PartyShape,
): EncounterGuestResponseMap | undefined {
  if (!pack) return pack;

  const mapGroup = <T extends string>(
    group: Record<T, { text: string; quality: ChoiceQuality }> | undefined,
  ) => {
    if (!group) return group;
    const next = { ...group };
    (Object.keys(next) as T[]).forEach((key) => {
      const row = next[key];
      if (!row) return;
      next[key] = {
        ...row,
        text: applyPartyShapeToDialogue(row.text, partyShape),
      };
    });
    return next;
  };

  return {
    ask: mapGroup(pack.ask),
    recommend: mapGroup(pack.recommend),
    commit: mapGroup(pack.commit),
  };
}

/**
 * Apply v2.1 composition onto an authored encounter:
 * party-shaped dialogue + type lane scoring overrides.
 */
export function applyGuestCompositionToEncounter(
  encounter: EncounterV2,
  composition: GuestCompositionV21,
): EncounterV2 {
  const lane = composition.optimalLane;
  const recommendScoring: Partial<Record<RecommendAngle, ChoiceQuality>> = {
    ...(encounter.recommendScoring || {}),
  };

  // Enforce type-differentiated recommend underperformance.
  if (composition.guestType === "tourist") {
    recommendScoring.story = "optimal";
    recommendScoring.flavour = "good";
    recommendScoring.value = "disaster";
    recommendScoring.confidence = "poor";
  } else if (composition.guestType === "regular") {
    recommendScoring.flavour = "optimal";
    recommendScoring.story = "disaster";
    recommendScoring.confidence = "good";
    recommendScoring.value = "poor";
  } else if (composition.guestType === "skeptic") {
    recommendScoring.story = "optimal";
    recommendScoring.flavour = "poor";
    recommendScoring.confidence = "poor";
    recommendScoring.value = "disaster";
  }

  const guestResponses = mapResponsePack(
    encounter.guestResponses,
    composition.partyShape,
  );

  // Soft-mark non-optimal ask/commit qualities when packs still score them high.
  if (guestResponses?.ask) {
    (Object.keys(guestResponses.ask) as AskType[]).forEach((askType) => {
      const row = guestResponses.ask?.[askType];
      if (!row) return;
      if (askType === lane.ask) {
        guestResponses.ask![askType] = { ...row, quality: "optimal" };
      } else if (row.quality === "optimal") {
        guestResponses.ask![askType] = { ...row, quality: "good" };
      }
    });
  }
  if (guestResponses?.commit) {
    (Object.keys(guestResponses.commit) as CommitType[]).forEach((commitType) => {
      const row = guestResponses.commit?.[commitType];
      if (!row) return;
      if (commitType === lane.commit) {
        guestResponses.commit![commitType] = { ...row, quality: "optimal" };
      } else if (row.quality === "optimal" && commitType !== "assumption") {
        guestResponses.commit![commitType] = { ...row, quality: "good" };
      }
    });
  }

  return {
    ...encounter,
    verbalClue: applyPartyShapeToDialogue(
      encounter.verbalClue,
      composition.partyShape,
    ),
    contextClue: applyPartyShapeToDialogue(
      encounter.contextClue,
      composition.partyShape,
    ),
    sceneClue: encounter.sceneClue
      ? applyPartyShapeToDialogue(encounter.sceneClue, composition.partyShape)
      : encounter.sceneClue,
    scene: applyPartyShapeToDialogue(encounter.scene, composition.partyShape),
    guestResponses,
    recommendScoring,
    targetRecommendAngle: lane.recommend,
    modifier: `${encounter.modifier}|v21:${composition.guestType}:${composition.partyShape}`,
  };
}

export function compositionFromGuestProfile(
  profile: GuestProfile,
  overrides: Parameters<typeof composeGuestV21>[1] = {},
): GuestCompositionV21 {
  return composeGuestV21(profile.guestId, overrides)!;
}
