import type {
  EncounterOutcome,
  EncounterV2,
  GameStateV2,
  PlayerChoice,
  Product,
} from "./typesV2";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getProgressMood(progress: number): GameStateV2["progressMood"] {
  if (progress >= 6) return "ready";
  if (progress >= 4) return "engaged";
  if (progress >= 2) return "warming_up";
  return "guarded";
}

export function getFrustrationMood(frustration: number): GameStateV2["frustrationMood"] {
  if (frustration >= 5) return "critical_resistance";
  if (frustration >= 3) return "heated";
  if (frustration >= 1) return "guarded";
  return "calm";
}

function inferReaction(progressDelta: number, frustrationDelta: number, encounter: EncounterV2): string {
  if (frustrationDelta >= 2) return "That feels a bit fast for us.";
  if (progressDelta >= 3) return encounter.verbalClue;
  if (progressDelta >= 2) return "Yes, that sounds more like what we mean.";
  if (progressDelta >= 1) return "Okay, we are with you so far.";
  if (frustrationDelta > 0) return "We are not quite there yet.";
  return "Tell me a little more.";
}

function resolveCommitOutcome(progress: number, frustration: number): EncounterOutcome {
  if (progress >= 7 && frustration <= 2) return "premium_success";
  if (progress >= 6 && frustration <= 3) return "standard_success";
  if (progress >= 5 && frustration <= 4) return "weak_success";
  return "failure";
}

export function summarizeBestPath(encounter: EncounterV2): string[] {
  return (encounter.bestPath || []).map((item) => `${item.group}:${item.type}`);
}

export function createGameStateV2(_encounter: EncounterV2, _product: Product | null): GameStateV2 {
  return {
    progress: 0,
    frustration: 0,
    progressMood: "guarded",
    frustrationMood: "calm",
    walkAwayUnlocked: false,
    outcome: null,
    authorityDelta: 0,
    turnCount: 0,
    history: [],
  };
}

export function applyChoice(gameState: GameStateV2, choice: PlayerChoice, encounter?: EncounterV2): GameStateV2 {
  if (!encounter) return gameState;
  if (gameState.outcome && gameState.outcome !== "continue") return gameState;

  const quality = Number(encounter.choiceScores?.[choice.group]?.[choice.type] ?? 0);
  let progressDelta = 0;
  let frustrationDelta = 0;

  if (choice.group === "ask") {
    progressDelta = quality >= 2 ? 2 : quality >= 1 ? 1 : 0;
    frustrationDelta = quality === 0 ? 1 : 0;
  } else if (choice.group === "recommend") {
    progressDelta = quality >= 3 ? 2 : quality >= 2 ? 1 : 0;
    frustrationDelta = quality <= 0 ? 2 : quality === 1 ? 1 : 0;
  } else if (choice.group === "commit") {
    if (gameState.progress < 4) {
      progressDelta = 0;
      frustrationDelta = 3;
    } else {
      progressDelta = quality >= 2 ? 1 : 0;
      frustrationDelta = quality === 0 ? 2 : 0;
    }
  } else if (choice.group === "walk_away") {
    gameState.outcome = "neutral_exit";
  }

  gameState.turnCount += 1;
  gameState.progress = clamp(gameState.progress + progressDelta, 0, 8);
  gameState.frustration = clamp(gameState.frustration + frustrationDelta, 0, 6);
  gameState.progressMood = getProgressMood(gameState.progress);
  gameState.frustrationMood = getFrustrationMood(gameState.frustration);
  gameState.walkAwayUnlocked = gameState.frustration >= 5;
  gameState.authorityDelta = clamp(gameState.progress - gameState.frustration, -3, 8);

  if (choice.group === "commit") {
    gameState.outcome = resolveCommitOutcome(gameState.progress, gameState.frustration);
  } else if (choice.group === "walk_away") {
    gameState.outcome = "neutral_exit";
  } else if (gameState.frustration >= 6) {
    gameState.outcome = "failure";
  } else {
    gameState.outcome = "continue";
  }

  const reaction = inferReaction(progressDelta, frustrationDelta, encounter);
  gameState.history.push({
    turn: gameState.turnCount,
    choice: `${choice.group}:${choice.type}`,
    quality,
    progressDelta,
    frustrationDelta,
    resultingProgress: gameState.progress,
    resultingFrustration: gameState.frustration,
    reaction,
  });

  return gameState;
}
