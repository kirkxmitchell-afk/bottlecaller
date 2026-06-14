import { getMasterProfile, QUALITY_EFFECTS } from "./masterProfiles";
import { getVariant } from "./variants";
import type {
  ActionGroup,
  ActionType,
  ApplyChoiceResult,
  ChoiceEvaluationResult,
  ChoiceQuality,
  EncounterOutcome,
  EncounterV2,
  GameStateV2,
  MasterProfile,
  PlayerChoice,
  Product,
  QualityEffect,
  QualityMatrix,
  TurnHistoryItem,
  VariantDefinition,
} from "./typesV2";

const DEFAULT_REWARDS = {
  premiumSuccess: 30,
  standardSuccess: 20,
  weakSuccess: 10,
  neutralExit: 5,
  failure: -15,
};

function clampFrustration(value: number): number {
  return Math.max(0, Math.round(value));
}

function clampProgress(value: number): number {
  return Math.max(0, Math.round(value));
}

function clampMistakeCount(value: number): number {
  return Math.max(0, Math.round(value));
}

export function getProgressMood(progress: number): GameStateV2["progressMood"] {
  if (progress <= 2) return "guarded";
  if (progress <= 5) return "warming_up";
  if (progress <= 8) return "engaged";
  return "ready";
}

export function getFrustrationMood(frustration: number): GameStateV2["frustrationMood"] {
  if (frustration <= 1) return "normal";
  if (frustration <= 3) return "resistant";
  return "critical_resistance";
}

function applyMatrixOverride(base: QualityMatrix, variant: VariantDefinition | null): QualityMatrix {
  if (!variant?.matrix) return base;

  return {
    ask: { ...base.ask, ...(variant.matrix.ask || {}) },
    recommend: { ...base.recommend, ...(variant.matrix.recommend || {}) },
    commit: { ...base.commit, ...(variant.matrix.commit || {}) },
  };
}

export function getQualityMatrix(
  masterProfile: MasterProfile,
  variant: VariantDefinition | null,
): QualityMatrix {
  return applyMatrixOverride(masterProfile.matrix, variant);
}

function getQualityEffect(quality: ChoiceQuality): QualityEffect {
  return QUALITY_EFFECTS[quality] || QUALITY_EFFECTS.good;
}

function isAskType(type: ActionType): type is keyof QualityMatrix["ask"] {
  return type === "preference" || type === "occasion" || type === "experience" || type === "budget";
}

function isRecommendType(type: ActionType): type is keyof QualityMatrix["recommend"] {
  return type === "flavour" || type === "story" || type === "value" || type === "confidence";
}

function isCommitType(type: ActionType): type is keyof QualityMatrix["commit"] {
  return type === "recommendation" || type === "assumption" || type === "celebration" || type === "value";
}

function qualityForChoice(matrix: QualityMatrix, choice: PlayerChoice): ChoiceQuality {
  if (choice.group === "ask" && isAskType(choice.type)) {
    return matrix.ask[choice.type];
  }
  if (choice.group === "recommend" && isRecommendType(choice.type)) {
    return matrix.recommend[choice.type];
  }
  if (choice.group === "commit" && isCommitType(choice.type)) {
    return matrix.commit[choice.type];
  }
  if (choice.group === "walk_away") {
    return "good";
  }
  return "poor";
}

function qualityFromGuestResponse(
  encounter: EncounterV2,
  playerChoice: PlayerChoice,
): ChoiceQuality | null {
  if (playerChoice.group === "ask" && isAskType(playerChoice.type)) {
    return encounter.guestResponses?.ask?.[playerChoice.type]?.quality || null;
  }
  if (playerChoice.group === "recommend" && isRecommendType(playerChoice.type)) {
    return encounter.guestResponses?.recommend?.[playerChoice.type]?.quality || null;
  }
  if (playerChoice.group === "commit" && isCommitType(playerChoice.type)) {
    return encounter.guestResponses?.commit?.[playerChoice.type]?.quality || null;
  }
  return null;
}

export function evaluateChoice(
  encounter: EncounterV2,
  playerChoice: PlayerChoice,
): ChoiceEvaluationResult {
  const masterProfile = getMasterProfile(encounter.masterProfile);
  if (!masterProfile) {
    return {
      quality: "poor",
      progressDelta: 1,
      frustrationDelta: 1,
      mistakeDelta: 0,
    };
  }

  const variant = getVariant(encounter.variant);
  const matrix = getQualityMatrix(masterProfile, variant);
  const quality = qualityFromGuestResponse(encounter, playerChoice) || qualityForChoice(matrix, playerChoice);
  const effect = getQualityEffect(quality);

  return {
    quality,
    progressDelta: effect.progress,
    frustrationDelta: effect.frustration,
    mistakeDelta: 0,
  };
}

export function createGameStateV2(encounter: EncounterV2, product: Product | null = null): GameStateV2 {
  const progress = clampProgress(encounter.startingProgress);
  const frustration = clampFrustration(encounter.startingFrustration);

  return {
    encounter,
    product,
    progress,
    frustration,
    progressMood: getProgressMood(progress),
    frustrationMood: getFrustrationMood(frustration),
    walkAwayUnlocked: frustration >= 4,
    mistakeCount: 0,
    outcome: null,
    authorityDelta: 0,
    turnCount: 0,
    history: [],
  };
}

function buildHistoryReaction(
  encounter: EncounterV2,
  choice: PlayerChoice,
  quality: ChoiceQuality,
): string {
  const fallbackReaction = (() => {
    if (choice.group === "ask") {
      if (quality === "optimal") return "Yes, that is exactly the kind of thing we were hoping you would ask.";
      if (quality === "good") return "That helps. I suppose we can narrow it from there.";
      if (quality === "poor") return "Ya... maybe. I am not sure that is quite what we are after.";
      return "Er... no, that is not really what we meant.";
    }
    if (choice.group === "recommend") {
      if (quality === "optimal") return "That sounds exactly like what we were looking for.";
      if (quality === "good") return "That sounds nice. What makes that one different?";
      if (quality === "poor") return "I guess... but I am not completely sure that is the right direction.";
      return "Er... no, that is not really what we are looking for.";
    }
    if (choice.group === "commit") {
      if (quality === "optimal") return "Perfect. Let's do that.";
      if (quality === "good") return "Alright, that sounds good.";
      if (quality === "poor") return "Maybe... can we think about it for a second?";
      return "No, thanks. We will choose ourselves.";
    }
    if (choice.group === "walk_away") {
      if (quality === "good") return "Thanks. We appreciate you giving us a moment.";
      return "We are fine for now, thanks.";
    }
    return encounter.verbalClue || "I am not sure that is what we meant.";
  })();

  if (choice.group === "ask" && isAskType(choice.type)) {
    const direct = encounter.guestResponses?.ask?.[choice.type];
    if (direct?.text && direct.quality === quality) return direct.text;
    return encounter.guestReactions.ask?.[choice.type]?.[quality] || fallbackReaction;
  }
  if (choice.group === "recommend" && isRecommendType(choice.type)) {
    const direct = encounter.guestResponses?.recommend?.[choice.type];
    if (direct?.text && direct.quality === quality) return direct.text;
    return encounter.guestReactions.recommend?.[choice.type]?.[quality] || fallbackReaction;
  }
  if (choice.group === "commit" && isCommitType(choice.type)) {
    const direct = encounter.guestResponses?.commit?.[choice.type];
    if (direct?.text && direct.quality === quality) return direct.text;
    return encounter.guestReactions.commit?.[choice.type]?.[quality] || fallbackReaction;
  }
  if (choice.group === "walk_away") {
    return fallbackReaction;
  }
  return fallbackReaction;
}

function appendHistory(
  gameState: GameStateV2,
  choice: PlayerChoice,
  result: ChoiceEvaluationResult,
): void {
  const nextTurn = Number(gameState.turnCount || 0) + 1;
  const item: TurnHistoryItem = {
    turn: nextTurn,
    choice,
    quality: result.quality,
    progressDelta: result.progressDelta,
    frustrationDelta: result.frustrationDelta,
    resultingProgress: gameState.progress,
    resultingFrustration: gameState.frustration,
    mistakeDelta: result.mistakeDelta,
    resultingMistakeCount: gameState.mistakeCount,
    reaction: buildHistoryReaction(gameState.encounter, choice, result.quality),
  };
  gameState.turnCount = nextTurn;
  gameState.history = [...gameState.history, item];
}

function applyEarlyCommitPenalty(gameState: GameStateV2): void {
  if (gameState.progress >= 6) {
    gameState.progress = clampProgress(gameState.progress + 1);
    gameState.frustration = clampFrustration(gameState.frustration + 1);
    return;
  }
  if (gameState.progress >= 3) {
    gameState.frustration = clampFrustration(gameState.frustration + 2);
    return;
  }
  gameState.frustration = clampFrustration(gameState.frustration + 3);
}

function isCloseWindowOpen(gameState: GameStateV2, commitQuality: ChoiceQuality): boolean {
  return canCommitSucceed(gameState, commitQuality);
}

function getMistakeDeltaForChoice(
  gameState: GameStateV2,
  playerChoice: PlayerChoice,
  quality: ChoiceQuality,
): number {
  let mistakeDelta = 0;
  if (quality === "poor") mistakeDelta += 1;
  if (quality === "disaster") mistakeDelta += 2;
  if (playerChoice.group === "commit" && !isCloseWindowOpen(gameState, quality)) {
    mistakeDelta += 2;
  }
  if (quality === "optimal" && gameState.outcome !== "failure") {
    mistakeDelta -= 1;
  }
  return mistakeDelta;
}

export function canCommitSucceed(
  gameState: GameStateV2,
  commitQuality: ChoiceQuality,
): boolean {
  const progress = Number(gameState.progress || 0);
  const frustration = Number(gameState.frustration || 0);
  const profile = gameState.encounter.masterProfile;
  const priorTurns = Number(gameState.turnCount || 0);

  if (priorTurns < 2) return false;
  if (commitQuality === "disaster") return false;
  if (frustration >= 5) return false;
  if ((commitQuality === "optimal" || commitQuality === "good") && progress >= 6 && frustration <= 3) return true;
  if (commitQuality === "optimal" && progress >= 6 && profile === "momentum") return true;
  if (progress >= 9 && commitQuality !== "disaster") return true;
  return false;
}

export function calculateSuccessOutcome(
  gameState: GameStateV2,
  commitQuality: ChoiceQuality,
): EncounterOutcome {
  const frustration = Number(gameState.frustration || 0);

  if (commitQuality === "optimal" && frustration <= 1) {
    return "premium_success";
  }
  if (commitQuality === "good" || frustration <= 3) {
    return "standard_success";
  }
  return "weak_success";
}

function authorityForOutcome(encounter: EncounterV2, outcome: EncounterOutcome): number {
  const rewards = encounter.rewards || DEFAULT_REWARDS;
  if (outcome === "premium_success") return Number(rewards.premiumSuccess || 0);
  if (outcome === "standard_success") return Number(rewards.standardSuccess || 0);
  if (outcome === "weak_success") return Number(rewards.weakSuccess || 0);
  if (outcome === "neutral_exit") return Number(rewards.neutralExit || 0);
  if (outcome === "failure") return Number(rewards.failure || 0);
  return 0;
}

function finalizeState(gameState: GameStateV2, outcome: EncounterOutcome): void {
  if (gameState.mistakeCount >= 3) {
    gameState.frustration = Math.max(gameState.frustration, 4);
  }
  gameState.progressMood = getProgressMood(gameState.progress);
  gameState.frustrationMood = getFrustrationMood(gameState.frustration);
  gameState.walkAwayUnlocked = gameState.frustration >= 4 || gameState.mistakeCount >= 3;
  gameState.outcome = outcome;
  if (outcome !== "continue" && outcome !== "not_available") {
    gameState.authorityDelta = authorityForOutcome(gameState.encounter, outcome);
  }
}

export function walkAway(gameState: GameStateV2): { outcome: EncounterOutcome; authority: number } {
  if (gameState.frustration >= 4 || gameState.mistakeCount >= 3) {
    const authority = authorityForOutcome(gameState.encounter, "neutral_exit");
    finalizeState(gameState, "neutral_exit");
    return {
      outcome: "neutral_exit",
      authority,
    };
  }

  return {
    outcome: "not_available",
    authority: 0,
  };
}

export function failEncounter(gameState: GameStateV2): { outcome: EncounterOutcome; authority: number } {
  const authority = authorityForOutcome(gameState.encounter, "failure");
  finalizeState(gameState, "failure");
  return {
    outcome: "failure",
    authority,
  };
}

export function applyChoice(
  gameState: GameStateV2,
  playerChoice: PlayerChoice,
): ApplyChoiceResult {
  if (playerChoice.group === "walk_away") {
    const result = walkAway(gameState);
    appendHistory(gameState, playerChoice, {
      quality: result.outcome === "neutral_exit" ? "good" : "poor",
      progressDelta: 0,
      frustrationDelta: 0,
      mistakeDelta: 0,
    });
    return {
      quality: result.outcome === "neutral_exit" ? "good" : "poor",
      progressDelta: 0,
      frustrationDelta: 0,
      mistakeDelta: 0,
      progress: gameState.progress,
      frustration: gameState.frustration,
      mistakeCount: gameState.mistakeCount,
      progressMood: gameState.progressMood,
      frustrationMood: gameState.frustrationMood,
      walkAwayUnlocked: gameState.walkAwayUnlocked,
      outcome: result.outcome,
    };
  }

  const result = evaluateChoice(gameState.encounter, playerChoice);

  gameState.progress = clampProgress(gameState.progress + result.progressDelta);
  gameState.frustration = clampFrustration(gameState.frustration + result.frustrationDelta);
  const mistakeDelta = getMistakeDeltaForChoice(gameState, playerChoice, result.quality);
  gameState.mistakeCount = clampMistakeCount(gameState.mistakeCount + mistakeDelta);

  let outcome: EncounterOutcome = "continue";
  let effectiveQuality = result.quality;

  if (playerChoice.group === "commit") {
    if (canCommitSucceed(gameState, result.quality)) {
      outcome = calculateSuccessOutcome(gameState, result.quality);
    } else {
      applyEarlyCommitPenalty(gameState);
      if (result.quality !== "disaster") {
        effectiveQuality = "poor";
      }
    }
  }

  const resultWithMistakes: ChoiceEvaluationResult = {
    ...result,
    quality: effectiveQuality,
    mistakeDelta,
  };

  if (outcome === "continue" && gameState.mistakeCount >= 4) {
    outcome = "failure";
  } else if (outcome === "continue" && gameState.frustration >= 5 && result.quality === "disaster") {
    outcome = "failure";
  }

  finalizeState(gameState, outcome);
  appendHistory(gameState, playerChoice, resultWithMistakes);

  return {
    ...resultWithMistakes,
    progress: gameState.progress,
    frustration: gameState.frustration,
    mistakeCount: gameState.mistakeCount,
    progressMood: gameState.progressMood,
    frustrationMood: gameState.frustrationMood,
    walkAwayUnlocked: gameState.walkAwayUnlocked,
    outcome,
  };
}

export function summarizeBestPath(encounter: EncounterV2): string[] {
  return (Array.isArray(encounter.idealRhythm) ? encounter.idealRhythm : []).map((step) =>
    String(step || "").toUpperCase(),
  );
}

export function getOutcomeStars(outcome: EncounterOutcome): number {
  if (outcome === "premium_success") return 3;
  if (outcome === "standard_success") return 2;
  if (outcome === "weak_success") return 1;
  return 0;
}
