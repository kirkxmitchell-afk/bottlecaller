import { getBottleChoiceSet, scoreBottleChoice } from "./bottleChoice";
import { buildCampaignProductPool, selectCampaignProduct } from "./campaign";
import { getTier1VerticalSliceEncounters } from "./encounterV2";
import { getCoreCampaignProducts, getProductById } from "./products";
import {
  applyChoice,
  createGameStateV2,
  failEncounter,
  getFrustrationMood,
  getProgressMood,
  summarizeBestPath,
} from "./engineV2";
import {
  applyGuestCompositionToEncounter,
  composeGuestV21,
  type GuestCompositionV21,
} from "./guestCompositionV21";
import {
  applyEncounterStartToGameState,
  buildKnownGuestInformation,
  createEncounterStartContext,
  evaluateGreeting,
  getReviewProfileForGuest,
  greetingChoiceToRoute,
  normalizeDiscoveryNeed,
  normalizeResistanceLevel,
  DEFAULT_ENCOUNTER_TRAITS,
  type EncounterStartContext,
  type GreetingEvaluation,
  type KnownGuestInformation,
} from "./guestService";
import type {
  ActionGroup,
  ActionType,
  EncounterOutcome,
  EncounterV2,
  GameStateV2,
  PlayerChoice,
  Product,
  ProductSelectionContext,
  RecommendAngle,
  V2DifficultyMode,
} from "./typesV2";

export interface RuntimeV2Session {
  encounter: EncounterV2;
  product: Product | null;
  gameState: GameStateV2;
  encounterLimit: number;
  difficultyMode: V2DifficultyMode;
  outcomeEmitted?: boolean;
  composition?: GuestCompositionV21 | null;
  greetingEvaluation?: GreetingEvaluation | null;
  knownGuestInformation?: KnownGuestInformation;
  encounterStartContext?: EncounterStartContext | null;
}

export interface RuntimeV2StartOptions {
  tier?: number;
  encounterId?: string | null;
  encounterLimit?: number;
  difficultyMode?: V2DifficultyMode | string | null;
  /** v2.1 — when set, applies guest type + party-shape depiction to dialogue/scoring. */
  guestId?: string | null;
  partyShape?: string | null;
  depiction?: string | null;
  guestHint?: string | null;
  artPath?: string | null;
  /** Modular table-service context from Godot floor. */
  greetingChoice?: string | null;
  greetingRating?: string | null;
  knownFoodChoice?: string | null;
  knownOccasion?: string | null;
  knownBudgetSignal?: string | null;
  foodOrdered?: boolean;
}

export interface RuntimeV2Snapshot {
  encounterId: string;
  encounterTitle: string;
  encounterOrdinal: number;
  encounterCount: number;
  productId: string | null;
  productName: string | null;
  tier: number;
  difficultyMode: V2DifficultyMode;
  progress: number;
  frustration: number;
  mistakeCount: number;
  progressMood: ReturnType<typeof getProgressMood>;
  frustrationMood: ReturnType<typeof getFrustrationMood>;
  walkAwayUnlocked: boolean;
  outcome: EncounterOutcome | null;
  authorityDelta: number;
  turnCount: number;
  actionCount: number;
  bestPath: string[];
  serviceStage: EncounterV2["serviceStage"];
  targetRecommendAngle: RecommendAngle | null;
  availableGroups: ActionGroup[];
  usedChoices: string[];
  /** v2.1 composition metadata when a guest profile drove the session. */
  guestId?: string | null;
  guestType?: string | null;
  partyShape?: string | null;
  depiction?: string | null;
  compositionVersion?: string | null;
  bottleChoiceFit?: string | null;
  bottleChoiceScore?: number;
  bottleChoiceReaction?: string | null;
  wineCommercialRole?: string | null;
  wineMatchRating?: string | null;
  wineVariantId?: string | null;
  greetingRoute?: string | null;
  greetingRating?: string | null;
  scenarioId?: string | null;
}

export interface RuntimeV2ChoiceResult {
  snapshot: RuntimeV2Snapshot;
  reaction: string;
}

function normalizeEncounterLimit(limit: number | null | undefined): number {
  const parsed = Number(limit);
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return 5;
}

function getTier1EncounterById(encounterId: string | null | undefined, encounterLimit: number): EncounterV2 | null {
  if (!encounterId) return null;
  return getTier1VerticalSliceEncounters(encounterLimit).find((encounter) => encounter.id === encounterId) || null;
}

const TIER1_ROTATION_KEY = "BC_V2_TIER1_ROTATION_INDEX";

function getStoredTier1RotationIndex(): number {
  try {
    const raw = window.localStorage.getItem(TIER1_ROTATION_KEY);
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  } catch {}
  return 0;
}

function setStoredTier1RotationIndex(index: number): void {
  try {
    window.localStorage.setItem(TIER1_ROTATION_KEY, String(Math.max(0, index)));
  } catch {}
}

function getTierEncounterPool(tier: number, encounterLimit: number): EncounterV2[] {
  const allEncounters = getTier1VerticalSliceEncounters(encounterLimit);
  const encounters = allEncounters.filter((encounter) => encounter.tier === tier);
  return encounters.length ? encounters : allEncounters;
}

function chooseEncounter(tier: number, encounterLimit: number, encounterId?: string | null): EncounterV2 {
  const explicit = getTier1EncounterById(encounterId, encounterLimit);
  if (explicit) return explicit;

  const encounters = getTierEncounterPool(tier, encounterLimit);
  if (!encounters.length) {
    throw new Error("No V2 encounters available");
  }

  const index = getStoredTier1RotationIndex();
  const nextEncounter = encounters[index % encounters.length] || encounters[0];
  setStoredTier1RotationIndex(index + 1);
  return nextEncounter;
}

function buildSelectionContext(encounter: EncounterV2): ProductSelectionContext {
  return {
    tier: encounter.tier,
    serviceStage: encounter.serviceStage,
    targetProductId: encounter.targetProductId || null,
    targetProductCategory: encounter.targetProductCategory || null,
    targetRecommendAngle: encounter.targetRecommendAngle || null,
    allowedProductIds: encounter.allowedProductIds || [],
    foodOrder: encounter.foodOrder || null,
  };
}

function formatProductTitle(product: Product | null): string | null {
  if (!product) return null;
  const name = String(product.name || "").replace(/^Scroll of\s+/i, "").trim();
  const varietal = String(product.varietalOrBlend || "").trim();
  return [name, varietal].filter(Boolean).join(", ") || null;
}

function availableActionGroups(gameState: GameStateV2): ActionGroup[] {
  if (gameState.outcome && gameState.outcome !== "continue" && gameState.outcome !== "not_available") {
    return [];
  }

  const groups: ActionGroup[] = ["ask", "recommend", "commit"];
  if (gameState.walkAwayUnlocked) groups.push("walk_away");
  return groups;
}

export function getActionTypesForGroup(group: ActionGroup): ActionType[] {
  if (group === "ask") {
    return ["preference", "occasion", "experience", "budget"];
  }
  if (group === "recommend") {
    return ["flavour", "story", "value", "confidence"];
  }
  if (group === "commit") {
    return ["recommendation", "assumption", "celebration", "value"];
  }
  return ["walk_away"];
}

export function snapshotRuntimeV2(session: RuntimeV2Session): RuntimeV2Snapshot {
  const { encounter, product, gameState, composition } = session;
  const encounterPool = getTierEncounterPool(encounter.tier, session.encounterLimit);
  const encounterOrdinal = Math.max(
    1,
    encounterPool.findIndex((item) => item.id === encounter.id) + 1,
  );
  return {
    encounterId: encounter.id,
    encounterTitle: encounter.title,
    encounterOrdinal,
    encounterCount: encounterPool.length,
    productId: product?.id || null,
    productName: formatProductTitle(product),
    tier: encounter.tier,
    difficultyMode: session.difficultyMode || gameState.difficultyMode || "medium",
    progress: gameState.progress,
    frustration: gameState.frustration,
    mistakeCount: gameState.mistakeCount,
    progressMood: gameState.progressMood,
    frustrationMood: gameState.frustrationMood,
    walkAwayUnlocked: gameState.walkAwayUnlocked,
    outcome: gameState.outcome,
    authorityDelta: gameState.authorityDelta,
    turnCount: gameState.turnCount,
    actionCount: gameState.actionCount,
    bestPath: summarizeBestPath(encounter),
    serviceStage: encounter.serviceStage,
    targetRecommendAngle: encounter.targetRecommendAngle || null,
    availableGroups: availableActionGroups(gameState),
    usedChoices: Array.isArray(gameState.usedChoiceKeys) ? gameState.usedChoiceKeys.slice() : [],
    guestId: composition?.guestId || null,
    guestType: composition?.guestType || null,
    partyShape: composition?.partyShape || null,
    depiction: composition?.depiction || null,
    compositionVersion: composition?.version || null,
    bottleChoiceFit: gameState.bottleChoice?.fit || null,
    bottleChoiceScore: Number(gameState.bottleChoice?.score || 0) || 0,
    bottleChoiceReaction: gameState.bottleChoice?.reaction || null,
    wineCommercialRole: session.encounterStartContext?.selectedWineCommercialRole || null,
    wineMatchRating: session.encounterStartContext?.selectedWineMatchRating || null,
    wineVariantId: session.encounterStartContext?.wineVariantId || null,
    greetingRoute: session.encounterStartContext?.greetingRoute || session.greetingEvaluation?.route || null,
    greetingRating: session.encounterStartContext?.greetingRating || session.greetingEvaluation?.rating || null,
    scenarioId: session.encounterStartContext?.scenarioId || null,
  };
}

export function applyBottleChoiceRuntimeV2(
  session: RuntimeV2Session,
  productId: string | null | undefined,
): RuntimeV2Snapshot {
  const guestId = session.composition?.guestId || null;
  const choiceSet = getBottleChoiceSet(session.encounter, { guestId });
  const result = scoreBottleChoice(productId, choiceSet);
  const product =
    getProductById(getCoreCampaignProducts(), result.productId) ||
    session.product ||
    null;
  session.product = product;
  session.encounter = {
    ...session.encounter,
    targetProductId: product?.id || session.encounter.targetProductId || null,
  };
  session.gameState.product = product;
  session.gameState.bottleChoice = {
    ...result,
    productName: product?.name || result.productName || null,
  };

  const startContext = createEncounterStartContext({
    guestId,
    greetingRoute: session.greetingEvaluation?.route || null,
    greetingEvaluation: session.greetingEvaluation || null,
    selectedWineId: product?.id || result.productId,
    knownGuestInformation: session.knownGuestInformation || {},
    encounterId: session.encounter.id,
  });
  session.encounterStartContext = startContext;

  if (startContext) {
    const next = applyEncounterStartToGameState({
      progress: session.gameState.progress,
      frustration: session.gameState.frustration,
      context: startContext,
    });
    session.gameState.progress = next.progress;
    session.gameState.frustration = next.frustration;
    session.gameState.progressMood = getProgressMood(session.gameState.progress);
    session.gameState.frustrationMood = getFrustrationMood(session.gameState.frustration);

    const variant = startContext.variant;
    if (variant?.guestOpeningLine) {
      session.encounter = {
        ...session.encounter,
        contextClue: variant.guestOpeningLine,
        verbalClue: variant.guestOpeningLine,
      };
    }
    if (variant?.resistanceLevel) {
      session.gameState.resistanceLevel = normalizeResistanceLevel(variant.resistanceLevel);
    } else if (
      startContext.selectedWineMatchRating === "risky" ||
      startContext.selectedWineMatchRating === "poor"
    ) {
      session.gameState.resistanceLevel = "high";
    } else if (startContext.selectedWineMatchRating === "strong") {
      session.gameState.resistanceLevel = "low";
    } else {
      session.gameState.resistanceLevel = "medium";
    }
    if (variant?.preferredRecommendAngles?.length) {
      const recommendScoring: Record<string, string> = {
        ...(session.encounter.recommendScoring || {}),
      };
      for (const angle of variant.preferredRecommendAngles) {
        recommendScoring[angle] = "optimal";
      }
      for (const angle of variant.acceptableRecommendAngles || []) {
        if (!recommendScoring[angle] || recommendScoring[angle] === "disaster") {
          recommendScoring[angle] = "good";
        }
      }
      for (const angle of variant.weakRecommendAngles || []) {
        if (!recommendScoring[angle]) {
          recommendScoring[angle] = "poor";
        }
      }
      session.encounter = {
        ...session.encounter,
        targetRecommendAngle:
          variant.preferredRecommendAngles[0] || session.encounter.targetRecommendAngle,
        recommendScoring: recommendScoring as typeof session.encounter.recommendScoring,
      };
    }

    // Greeting judgement only. Match rating already scored via bottleChoice.
    // Partner / candidate maxApModifier must never stack on top of match AP.
    session.gameState.selectionAuthorityBonus =
      Number(session.gameState.selectionAuthorityBonus || 0) +
      Number(startContext.modifiers.maxApModifier || 0);
  }

  return snapshotRuntimeV2(session);
}

export function startRuntimeV2Session(options: RuntimeV2StartOptions = {}): RuntimeV2Session {
  const tier = Number(options.tier || 1);
  const encounterLimit = normalizeEncounterLimit(options.encounterLimit);
  const requestedDifficulty = String(options.difficultyMode || "medium").toLowerCase();
  const difficultyMode: V2DifficultyMode =
    requestedDifficulty === "easy" || requestedDifficulty === "hard"
      ? requestedDifficulty
      : "medium";
  let encounter = chooseEncounter(tier, encounterLimit, options.encounterId);

  const composition = options.guestId
    ? composeGuestV21(options.guestId, {
        partyShape: options.partyShape,
        depiction: options.depiction,
        guestHint: options.guestHint,
        artPath: options.artPath,
      })
    : null;

  if (composition) {
    encounter = applyGuestCompositionToEncounter(encounter, composition);
  }

  const review = getReviewProfileForGuest(options.guestId);
  const route = greetingChoiceToRoute(options.greetingChoice);
  let greetingEvaluation: GreetingEvaluation | null = null;
  if (review && route) {
    // Forced floor rating recomputes all modifiers — never label-only overwrite.
    greetingEvaluation = evaluateGreeting(review, route, options.greetingRating);
  }

  const knownGuestInformation = buildKnownGuestInformation({
    reviewFoodIntent: review?.knownFoodIntent,
    greeting: greetingEvaluation,
    foodOrdered: !!options.foodOrdered,
    discovered: {
      foodChoice: options.knownFoodChoice || undefined,
      occasion: options.knownOccasion || undefined,
      budgetSignal: options.knownBudgetSignal || undefined,
    },
  });

  const pool = buildCampaignProductPool(encounter.tier);
  const product = selectCampaignProduct(pool, buildSelectionContext(encounter));
  const gameState = createGameStateV2(encounter, product, difficultyMode, {
    traits: review?.encounterTraits || DEFAULT_ENCOUNTER_TRAITS,
    resistanceLevel: "medium",
    discoveryNeed: normalizeDiscoveryNeed(review?.discoveryNeed),
  });
  gameState.knownGuestInformation = knownGuestInformation;

  return {
    encounter,
    product,
    gameState,
    encounterLimit,
    difficultyMode,
    outcomeEmitted: false,
    composition,
    greetingEvaluation,
    knownGuestInformation,
    encounterStartContext: null,
  };
}

export function applyChoiceRuntimeV2(
  session: RuntimeV2Session,
  choice: PlayerChoice,
): RuntimeV2ChoiceResult {
  const result = applyChoice(session.gameState, choice);
  const reaction = session.gameState.history[session.gameState.history.length - 1]?.reaction || "";
  return {
    snapshot: snapshotRuntimeV2(session),
    reaction,
  };
}

export function createDemoRuntimeV2Api() {
  let activeSession: RuntimeV2Session | null = null;

  return {
    start(options: RuntimeV2StartOptions = {}) {
      activeSession = startRuntimeV2Session(options);
      return snapshotRuntimeV2(activeSession);
    },
    getSession() {
      return activeSession;
    },
    snapshot() {
      return activeSession ? snapshotRuntimeV2(activeSession) : null;
    },
    chooseBottle(productId: string | null | undefined) {
      if (!activeSession) return null;
      if (activeSession.gameState.bottleChoice) {
        return snapshotRuntimeV2(activeSession);
      }
      return applyBottleChoiceRuntimeV2(activeSession, productId);
    },
    getBottleChoiceSet() {
      if (!activeSession) return getBottleChoiceSet(null);
      return getBottleChoiceSet(activeSession.encounter, {
        guestId: activeSession.composition?.guestId || null,
      });
    },
    choose(group: ActionGroup, type: ActionType) {
      if (!activeSession) return null;
      return applyChoiceRuntimeV2(activeSession, { group, type });
    },
    fail(reason = "timeout") {
      if (!activeSession) return null;
      if (
        activeSession.gameState.outcome &&
        activeSession.gameState.outcome !== "continue" &&
        activeSession.gameState.outcome !== "not_available"
      ) {
        return {
          snapshot: snapshotRuntimeV2(activeSession),
          reaction: String(reason || "Encounter ended."),
        };
      }
      failEncounter(activeSession.gameState);
      return {
        snapshot: snapshotRuntimeV2(activeSession),
        reaction: String(reason || "Time ran out."),
      };
    },
    availableActionGroups() {
      if (!activeSession) return [];
      return availableActionGroups(activeSession.gameState);
    },
    availableActionTypes(group: ActionGroup) {
      return getActionTypesForGroup(group);
    },
    reset() {
      activeSession = null;
    },
  };
}
