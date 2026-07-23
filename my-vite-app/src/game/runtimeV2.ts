import { buildCampaignProductPool, selectCampaignProduct } from "./campaign";
import { getTier1VerticalSliceEncounters } from "./encounterV2";
import {
  applyChoice,
  createGameStateV2,
  getFrustrationMood,
  getProgressMood,
  summarizeBestPath,
} from "./engineV2";
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
}

export interface RuntimeV2StartOptions {
  tier?: number;
  encounterId?: string | null;
  encounterLimit?: number;
  difficultyMode?: V2DifficultyMode | string | null;
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
  const { encounter, product, gameState } = session;
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
  };
}

export function startRuntimeV2Session(options: RuntimeV2StartOptions = {}): RuntimeV2Session {
  const tier = Number(options.tier || 1);
  const encounterLimit = normalizeEncounterLimit(options.encounterLimit);
  const requestedDifficulty = String(options.difficultyMode || "medium").toLowerCase();
  const difficultyMode: V2DifficultyMode =
    requestedDifficulty === "easy" || requestedDifficulty === "hard"
      ? requestedDifficulty
      : "medium";
  const encounter = chooseEncounter(tier, encounterLimit, options.encounterId);
  const pool = buildCampaignProductPool(encounter.tier);
  const product = selectCampaignProduct(pool, buildSelectionContext(encounter));
  const gameState = createGameStateV2(encounter, product, difficultyMode);

  return {
    encounter,
    product,
    gameState,
    encounterLimit,
    difficultyMode,
    outcomeEmitted: false,
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
    choose(group: ActionGroup, type: ActionType) {
      if (!activeSession) return null;
      return applyChoiceRuntimeV2(activeSession, { group, type });
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
