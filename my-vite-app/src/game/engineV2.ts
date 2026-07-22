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
  V2DifficultyMode,
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

export interface DifficultyPolicyV2 {
  mode: V2DifficultyMode;
  frictionMultiplier: number;
  badChoiceExtraFriction: number;
  positiveProgressBonus: number;
  nonOptimalProgressPenalty: number;
  earlyCommitFrustration: number;
  criticalResistance: number;
  maxMistakes: number;
  maxActions: number;
  minCommitTurns: number;
  standardCommitProgress: number;
  readyCommitProgress: number;
  closeFrustrationLimit: number;
}

export function normalizeDifficultyModeV2(value: unknown): V2DifficultyMode {
  const mode = String(value || "").trim().toLowerCase();
  if (mode === "easy" || mode === "hard") return mode;
  return "medium";
}

export function getDifficultyPolicyV2(value: unknown): DifficultyPolicyV2 {
  const mode = normalizeDifficultyModeV2(value);
  if (mode === "easy") {
    return {
      mode,
      frictionMultiplier: 0.65,
      badChoiceExtraFriction: 0,
      positiveProgressBonus: 1,
      nonOptimalProgressPenalty: 0,
      earlyCommitFrustration: 1,
      criticalResistance: 5,
      maxMistakes: 5,
      maxActions: 7,
      minCommitTurns: 1,
      standardCommitProgress: 5,
      readyCommitProgress: 8,
      closeFrustrationLimit: 5,
    };
  }
  if (mode === "hard") {
    return {
      mode,
      frictionMultiplier: 1.25,
      badChoiceExtraFriction: 1,
      positiveProgressBonus: 0,
      nonOptimalProgressPenalty: 1,
      earlyCommitFrustration: 3,
      criticalResistance: 3,
      maxMistakes: 3,
      maxActions: 5,
      minCommitTurns: 2,
      standardCommitProgress: 7,
      readyCommitProgress: 10,
      closeFrustrationLimit: 4,
    };
  }
  return {
    mode,
    frictionMultiplier: 1,
    badChoiceExtraFriction: 0,
    positiveProgressBonus: 0,
    nonOptimalProgressPenalty: 0,
    earlyCommitFrustration: 2,
    criticalResistance: 4,
    maxMistakes: 4,
    maxActions: 6,
    minCommitTurns: 2,
    standardCommitProgress: 6,
    readyCommitProgress: 9,
    closeFrustrationLimit: 5,
  };
}

export function getProgressMood(progress: number): GameStateV2["progressMood"] {
  if (progress <= 2) return "guarded";
  if (progress <= 5) return "warming_up";
  if (progress <= 8) return "engaged";
  return "ready";
}

export function getFrustrationMood(frustration: number): GameStateV2["frustrationMood"] {
  if (frustration <= 2) return "normal";
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

export function choiceKey(choice: PlayerChoice): string {
  return `${String(choice.group || "")}:${String(choice.type || "")}`;
}

export function hasChoiceBeenUsed(gameState: GameStateV2, choice: PlayerChoice): boolean {
  const usedChoiceKeys = Array.isArray(gameState.usedChoiceKeys) ? gameState.usedChoiceKeys : [];
  return usedChoiceKeys.includes(choiceKey(choice));
}

function qualityFromGuestResponse(
  encounter: EncounterV2,
  playerChoice: PlayerChoice,
): ChoiceQuality | null {
  if (playerChoice.group === "ask" && isAskType(playerChoice.type)) {
    return encounter.guestResponses?.ask?.[playerChoice.type]?.quality || null;
  }
  if (playerChoice.group === "recommend" && isRecommendType(playerChoice.type)) {
    const scoredQuality = encounter.recommendScoring?.[playerChoice.type] || null;
    if (scoredQuality) return scoredQuality;
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
      progressDelta: 0,
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

export function createGameStateV2(
  encounter: EncounterV2,
  product: Product | null = null,
  difficultyMode: V2DifficultyMode = "medium",
): GameStateV2 {
  const progress = clampProgress(encounter.startingProgress);
  const frustration = clampFrustration(encounter.startingFrustration);
  const normalizedDifficulty = normalizeDifficultyModeV2(difficultyMode);
  const policy = getDifficultyPolicyV2(normalizedDifficulty);

  return {
    encounter,
    product,
    difficultyMode: normalizedDifficulty,
    progress,
    frustration,
    progressMood: getProgressMood(progress),
    frustrationMood: getFrustrationMood(frustration),
    walkAwayUnlocked: frustration >= policy.criticalResistance,
    mistakeCount: 0,
    outcome: null,
    authorityDelta: 0,
    turnCount: 0,
    actionCount: 0,
    history: [],
    usedChoiceKeys: [],
  };
}

function groupUseCount(gameState: GameStateV2, group: ActionGroup): number {
  return (Array.isArray(gameState.history) ? gameState.history : []).filter((item) => item.choice?.group === group).length;
}

function hasUsedGroup(gameState: GameStateV2, group: ActionGroup): boolean {
  return groupUseCount(gameState, group) > 0;
}

function nonCommitActionCount(gameState: GameStateV2): number {
  return (Array.isArray(gameState.history) ? gameState.history : []).filter((item) => item.choice?.group !== "commit").length;
}

function hasUsedActionType(gameState: GameStateV2, type: ActionType): boolean {
  return (Array.isArray(gameState.history) ? gameState.history : []).some((item) => item.choice?.type === type);
}

function applyTimingPressure(
  gameState: GameStateV2,
  playerChoice: PlayerChoice,
  result: ChoiceEvaluationResult,
): ChoiceEvaluationResult {
  let next: ChoiceEvaluationResult = { ...result };
  const policy = getDifficultyPolicyV2(gameState.difficultyMode);
  const progress = Number(gameState.progress || 0);
  const priorActionCount = Number(gameState.actionCount ?? gameState.turnCount ?? 0);

  if (progress >= 9 && playerChoice.group === "ask") {
    next = {
      ...next,
      quality: "poor",
      progressDelta: 0,
      frustrationDelta: Math.max(next.frustrationDelta, 1),
      feedbackText: "Too much. Momentum stalls.",
    };
  } else if (progress >= 9 && playerChoice.group === "recommend" && next.quality !== "optimal") {
    next = {
      ...next,
      quality: "poor",
      progressDelta: 0,
      frustrationDelta: Math.max(next.frustrationDelta, 1),
      feedbackText: "Extra detail. Energy drops.",
    };
  }

  if (playerChoice.group === "ask" && !hasUsedGroup(gameState, "recommend") && groupUseCount(gameState, "ask") >= 2) {
    next = {
      ...next,
      progressDelta: Math.min(next.progressDelta, 0),
      frustrationDelta: next.frustrationDelta + 1,
      feedbackText: next.feedbackText || "Too many questions. Energy drops.",
    };
  }

  if (playerChoice.group === "recommend" && progress >= 7 && groupUseCount(gameState, "recommend") >= 2) {
    next = {
      ...next,
      progressDelta: Math.min(next.progressDelta, 0),
      frustrationDelta: next.frustrationDelta + 1,
      feedbackText: next.feedbackText || "Too much detail. They pull back.",
    };
  }

  if (playerChoice.group !== "commit" && nonCommitActionCount(gameState) >= 4) {
    next = {
      ...next,
      progressDelta: Math.min(next.progressDelta, 0),
      frustrationDelta: next.frustrationDelta + 1,
      feedbackText: next.feedbackText || "Wrong pace. Momentum fades.",
    };
  }

  if (priorActionCount >= 3 && playerChoice.group !== "commit" && progress < 9) {
    next = {
      ...next,
      frustrationDelta: next.frustrationDelta + 1,
      feedbackText: next.feedbackText || "You had the opening. Now they're cooling.",
    };
  }

  if (next.frustrationDelta > 0) {
    const badChoiceExtra =
      next.quality === "poor" || next.quality === "disaster" || next.quality === "early_commit"
        ? policy.badChoiceExtraFriction
        : 0;
    next.frustrationDelta = Math.max(
      0,
      Math.round(next.frustrationDelta * policy.frictionMultiplier + badChoiceExtra),
    );
  }
  if (next.progressDelta > 0 && policy.positiveProgressBonus > 0) {
    next.progressDelta += policy.positiveProgressBonus;
  }
  if (
    next.progressDelta > 0 &&
    policy.nonOptimalProgressPenalty > 0 &&
    next.quality !== "optimal"
  ) {
    next.progressDelta = Math.max(0, next.progressDelta - policy.nonOptimalProgressPenalty);
  }

  return next;
}

function buildHistoryReaction(
  gameState: GameStateV2,
  choice: PlayerChoice,
  result: ChoiceEvaluationResult,
): string {
  const { encounter } = gameState;
  const quality = result.quality;
  const progress = Number(gameState.progress || 0);
  const friction = Number(gameState.frustration || 0);
  const isReady = progress >= 9;
  const isCooling =
    choice.group !== "commit" &&
    (friction >= 3 ||
      result.feedbackText === "You had the opening. Now they're cooling." ||
      result.feedbackText === "Too much detail. They pull back." ||
      result.feedbackText === "Extra detail. Energy drops.");

  const stateReaction = (() => {
    if (choice.group === "walk_away") return "";
    if (isCooling) {
      if (friction >= 4) return "Okay, maybe we'll just have another look.";
      if (choice.group === "recommend") return "I think we're overthinking it now.";
      return "Okay, I think we've got enough to decide.";
    }
    if (isReady && choice.group !== "commit") {
      return "That sounds like what we came for.";
    }
    if (quality === "optimal") {
      if (progress >= 6) return "That sounds like the kind of direction we wanted.";
      return "That helps. We wanted something local, but not too heavy.";
    }
    if (quality === "good") {
      if (progress >= 6) return "Okay, that makes sense.";
      return "That helps. We wanted something local, but not too heavy.";
    }
    if (quality === "poor") {
      if (friction >= 3) return "Okay, maybe we'll just have another look.";
      return "I guess... but I am not completely sure that is the right direction.";
    }
    if (quality === "disaster") {
      if (friction >= 3) return "Okay, maybe we'll just have another look.";
      return "Er... no, that is not really what we are looking for.";
    }
    if (quality === "early_commit") {
      return "That feels a bit rushed. We are not ready to decide yet.";
    }
    return "";
  })();

  const directResponsePointsToUsedOption = (text: string): boolean => {
    const normalized = text.toLowerCase();
    if (hasUsedActionType(gameState, "story") && /south african|local|story/.test(normalized)) return true;
    if (hasUsedActionType(gameState, "flavour") && /taste|flavour|flavor/.test(normalized)) return true;
    if (hasUsedActionType(gameState, "value") && /worth|price|value/.test(normalized)) return true;
    if (hasUsedActionType(gameState, "confidence") && /would you choose|why that one|choose/.test(normalized)) return true;
    return false;
  };

  const canUseDirectResponse = (text: string | undefined): text is string => {
    if (!text) return false;
    if (isReady && choice.group !== "commit") return false;
    if (isCooling) return false;
    return !directResponsePointsToUsedOption(text);
  };

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
      if (quality === "early_commit") return "That feels a bit rushed. We are not ready to decide yet.";
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
    if (direct?.quality === quality && canUseDirectResponse(direct.text)) return direct.text;
    const authored = encounter.guestReactions.ask?.[choice.type]?.[quality];
    if (canUseDirectResponse(authored)) return authored;
    return stateReaction || fallbackReaction;
  }
  if (choice.group === "recommend" && isRecommendType(choice.type)) {
    const direct = encounter.guestResponses?.recommend?.[choice.type];
    if (direct?.quality === quality && canUseDirectResponse(direct.text)) return direct.text;
    const authored = encounter.guestReactions.recommend?.[choice.type]?.[quality];
    if (canUseDirectResponse(authored)) return authored;
    return stateReaction || fallbackReaction;
  }
  if (choice.group === "commit" && isCommitType(choice.type)) {
    const direct = encounter.guestResponses?.commit?.[choice.type];
    if (direct?.quality === quality && canUseDirectResponse(direct.text)) return direct.text;
    const authored = encounter.guestReactions.commit?.[choice.type]?.[quality];
    if (canUseDirectResponse(authored)) return authored;
    return stateReaction || fallbackReaction;
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
    reaction: buildHistoryReaction(gameState, choice, result),
    feedbackText: result.feedbackText,
  };
  gameState.turnCount = nextTurn;
  gameState.actionCount = Number(gameState.actionCount || 0) + 1;
  gameState.history = [...gameState.history, item];
}

function applyEarlyCommitPenalty(gameState: GameStateV2): ChoiceEvaluationResult {
  const frustrationDelta = getDifficultyPolicyV2(gameState.difficultyMode).earlyCommitFrustration;
  gameState.frustration = clampFrustration(gameState.frustration + frustrationDelta);
  return {
    quality: "early_commit",
    progressDelta: 0,
    frustrationDelta,
    mistakeDelta: 0,
    feedbackText: "Too soon. Pressure rises.",
  };
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
  if (quality === "early_commit") mistakeDelta += 2;
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
  const policy = getDifficultyPolicyV2(gameState.difficultyMode);

  if (priorTurns < policy.minCommitTurns) return false;
  if (commitQuality === "disaster") return false;
  if (frustration >= policy.closeFrustrationLimit) return false;
  if (
    (commitQuality === "optimal" || commitQuality === "good") &&
    progress >= policy.standardCommitProgress &&
    frustration <= 3
  ) return true;
  if (commitQuality === "optimal" && progress >= policy.standardCommitProgress && profile === "momentum") return true;
  if (progress >= policy.readyCommitProgress && commitQuality !== "disaster") return true;
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
  const policy = getDifficultyPolicyV2(gameState.difficultyMode);
  if (gameState.mistakeCount >= 3) {
    gameState.frustration = Math.max(gameState.frustration, policy.criticalResistance);
  }
  gameState.progressMood = getProgressMood(gameState.progress);
  gameState.frustrationMood = getFrustrationMood(gameState.frustration);
  gameState.walkAwayUnlocked =
    gameState.frustration >= policy.criticalResistance ||
    gameState.mistakeCount >= Math.max(3, policy.maxMistakes);
  gameState.outcome = outcome;
  if (outcome !== "continue" && outcome !== "not_available") {
    gameState.authorityDelta = authorityForOutcome(gameState.encounter, outcome);
  }
}

export function walkAway(gameState: GameStateV2): { outcome: EncounterOutcome; authority: number } {
  const policy = getDifficultyPolicyV2(gameState.difficultyMode);
  if (
    gameState.frustration >= policy.criticalResistance ||
    gameState.mistakeCount >= Math.max(3, policy.maxMistakes)
  ) {
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
  if (hasChoiceBeenUsed(gameState, playerChoice)) {
    return {
      quality: "poor",
      progressDelta: 0,
      frustrationDelta: 0,
      mistakeDelta: 0,
      progress: gameState.progress,
      frustration: gameState.frustration,
      mistakeCount: gameState.mistakeCount,
      progressMood: gameState.progressMood,
      frustrationMood: gameState.frustrationMood,
      walkAwayUnlocked: gameState.walkAwayUnlocked,
      outcome: "not_available",
    };
  }

  if (playerChoice.group === "walk_away") {
    const result = walkAway(gameState);
    gameState.usedChoiceKeys = [...(gameState.usedChoiceKeys || []), choiceKey(playerChoice)];
    appendHistory(gameState, playerChoice, {
      quality: result.outcome === "neutral_exit" ? "good" : "poor",
      progressDelta: 0,
      frustrationDelta: 0,
      mistakeDelta: 0,
      feedbackText: result.outcome === "neutral_exit" ? "Good restraint. Experience preserved." : "",
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

  const policy = getDifficultyPolicyV2(gameState.difficultyMode);
  const wasCriticalResistance = Number(gameState.frustration || 0) >= policy.criticalResistance;
  const result = applyTimingPressure(gameState, playerChoice, evaluateChoice(gameState.encounter, playerChoice));
  gameState.usedChoiceKeys = [...(gameState.usedChoiceKeys || []), choiceKey(playerChoice)];

  gameState.progress = clampProgress(gameState.progress + result.progressDelta);
  gameState.frustration = clampFrustration(gameState.frustration + result.frustrationDelta);
  let mistakeDelta = getMistakeDeltaForChoice(gameState, playerChoice, result.quality);
  gameState.mistakeCount = clampMistakeCount(gameState.mistakeCount + mistakeDelta);

  let outcome: EncounterOutcome = "continue";
  let effectiveQuality = result.quality;
  let effectiveResult: ChoiceEvaluationResult = result;

  if (playerChoice.group === "commit") {
    if (canCommitSucceed(gameState, result.quality)) {
      outcome = calculateSuccessOutcome(gameState, result.quality);
    } else {
      gameState.progress = clampProgress(gameState.progress - result.progressDelta);
      gameState.frustration = clampFrustration(gameState.frustration - result.frustrationDelta);
      const earlyCommit = applyEarlyCommitPenalty(gameState);
      const correctedMistakeDelta = 2;
      gameState.mistakeCount = clampMistakeCount(gameState.mistakeCount - mistakeDelta + correctedMistakeDelta);
      effectiveQuality = "early_commit";
      mistakeDelta = correctedMistakeDelta;
      effectiveResult = {
        ...result,
        quality: "early_commit",
        progressDelta: earlyCommit.progressDelta,
        frustrationDelta: earlyCommit.frustrationDelta,
        mistakeDelta,
        feedbackText: earlyCommit.feedbackText,
      };
    }
  }

  const resultWithMistakes: ChoiceEvaluationResult = {
    ...effectiveResult,
    quality: effectiveQuality,
    mistakeDelta,
  };

  if (
    outcome === "continue" &&
    wasCriticalResistance &&
    (effectiveQuality === "poor" || effectiveQuality === "disaster" || effectiveQuality === "early_commit")
  ) {
    outcome = "failure";
  } else if (outcome === "continue" && gameState.mistakeCount >= policy.maxMistakes) {
    outcome = "failure";
  } else if (
    outcome === "continue" &&
    gameState.frustration >= policy.closeFrustrationLimit &&
    result.quality === "disaster"
  ) {
    outcome = "failure";
  } else if (outcome === "continue" && Number(gameState.actionCount || 0) + 1 >= policy.maxActions) {
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
