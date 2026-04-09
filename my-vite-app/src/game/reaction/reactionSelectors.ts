import type {
  EncounterRuntimeState,
  EncounterSummaryRecord,
  ReactionRecord,
  ReflectionPayload,
} from "./reactionTypes";

export function deriveReflectionPayload(
  runtime: EncounterRuntimeState
): ReflectionPayload {
  return {
    reactionHistory: runtime.reactionHistory ?? [],
    stepSpine: runtime.stepSpine ?? [],
    guestState: runtime.guestState,
    aiPerception: deriveAiPerception(runtime),
    chosenPath: deriveChosenPath(runtime),
    bestPath: deriveBestPath(runtime),
    bottleServed: deriveBottleServed(runtime),
  };
}

export function buildEncounterSummaryRecord(
  runtime: EncounterRuntimeState,
  profileId: string,
  encounterId: string
): EncounterSummaryRecord {
  return {
    encounterId,
    profileId,
    timestamp: Date.now(),
    bestPath: deriveBestPath(runtime),
    chosenPath: deriveChosenPath(runtime),
    aiPerception: deriveAiPerception(runtime),
    bottleServed: deriveBottleServed(runtime),
    stepSpine: [...(runtime.stepSpine ?? [])],
    reactionHistory: [...(runtime.reactionHistory ?? [])],
  };
}

export function persistEncounterSummary(
  record: EncounterSummaryRecord,
  options?: {
    saveFn?: (record: EncounterSummaryRecord) => void;
  }
): void {
  if (options?.saveFn) {
    options.saveFn(record);
    return;
  }

  console.log("[BottleCaller] persistEncounterSummary stub", record);
}

export function getLatestReaction(
  runtime: EncounterRuntimeState
): ReactionRecord | null {
  const history = runtime.reactionHistory ?? [];
  return history.length ? history[history.length - 1] : null;
}

export function getLiveReactionText(runtime: EncounterRuntimeState): {
  tableCue: string;
  physicalCue: string;
  microExpression?: string;
} | null {
  const latest = getLatestReaction(runtime);
  if (!latest) return null;

  return {
    tableCue: latest.tableCue,
    physicalCue: latest.physicalCue,
    microExpression: latest.microExpression,
  };
}

export function getEncounterSpineDisplay(
  runtime: EncounterRuntimeState
): Array<{
  step: string;
  label: string;
  score: 1 | 0 | -1;
}> {
  return (runtime.stepSpine ?? []).map((node) => ({
    step: node.step,
    label: formatSpineLabel(node.step, node.score),
    score: node.score,
  }));
}

export function formatSpineLabel(
  step: string,
  score: 1 | 0 | -1
): string {
  if (score === 1) return `${step} +1`;
  if (score === -1) return `${step} -1`;
  return `${step} 0`;
}

export function deriveAiPerception(runtime: EncounterRuntimeState): string {
  const reactions = runtime.reactionHistory ?? [];
  const total = reactions.reduce((sum, reaction) => sum + reaction.successPolarity, 0);

  if (total >= 3) return "Confident and socially aligned";
  if (total >= 1) return "Mostly effective with some hesitation";
  if (total === 0) return "Mixed execution";
  if (total <= -3) return "Disconnected and poorly aligned";
  return "Hesitant and inconsistent";
}

export function deriveChosenPath(runtime: EncounterRuntimeState): string[] {
  if (Array.isArray(runtime.chosenPath) && runtime.chosenPath.length > 0) {
    return runtime.chosenPath;
  }

  return (runtime.reactionHistory ?? []).map((reaction) => reaction.step);
}

export function deriveBestPath(runtime: EncounterRuntimeState): string[] {
  if (Array.isArray(runtime.bestPath) && runtime.bestPath.length > 0) {
    return runtime.bestPath;
  }

  return ["observe", "mode", "problem_solve"];
}

export function deriveBottleServed(runtime: EncounterRuntimeState): boolean {
  if (typeof runtime.bottleServed === "boolean") {
    return runtime.bottleServed;
  }

  const problemSolveReaction = (runtime.reactionHistory ?? []).find(
    (reaction) => reaction.step === "problem_solve"
  );

  if (problemSolveReaction?.accuracy === "correct") return true;

  const total = (runtime.reactionHistory ?? []).reduce(
    (sum, reaction) => sum + reaction.successPolarity,
    0
  );

  return total >= 2;
}
