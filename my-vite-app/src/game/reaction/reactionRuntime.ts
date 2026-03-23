import { buildStepReaction } from "./reactionBuilders";
import type {
  EncounterGuestState,
  EncounterRuntimeState,
  EncounterStepKey,
  ReactionRecord,
  StepEvalResult,
} from "./reactionTypes";

export function createInitialGuestState(encounter: any): EncounterGuestState {
  const baseTrust = clampNumber(encounter?.guestProfile?.trustBase ?? 0, -5, 5);
  const baseInterest = clampNumber(
    encounter?.guestProfile?.interestBase ?? 0,
    -5,
    5
  );
  const baseResistance = clampNumber(
    encounter?.guestProfile?.resistanceBase ?? 0,
    -5,
    5
  );

  return {
    trust: baseTrust,
    interest: baseInterest,
    resistance: baseResistance,
    emotion: "neutral",
  };
}

export function attachReactionRuntimeFields(
  runtime: EncounterRuntimeState,
  encounter: any
): EncounterRuntimeState {
  runtime.guestState = createInitialGuestState(encounter);
  runtime.reactionHistory = [];
  runtime.stepSpine = [];
  return runtime;
}

export function resolveEncounterStepWithReaction(args: {
  stepKey: EncounterStepKey;
  playerInput: any;
  runtime: EncounterRuntimeState;
  evaluateEncounterStep: (
    stepKey: EncounterStepKey,
    playerInput: any,
    runtime: EncounterRuntimeState
  ) => StepEvalResult;
  applyStepOutcome: (
    runtime: EncounterRuntimeState,
    evalResult: StepEvalResult
  ) => void;
  shouldEnterRecovery: (
    evalResult: StepEvalResult,
    runtime: EncounterRuntimeState
  ) => boolean;
  enterRecovery: (
    runtime: EncounterRuntimeState,
    evalResult: StepEvalResult
  ) => void;
  advanceEncounter: (
    runtime: EncounterRuntimeState,
    evalResult: StepEvalResult
  ) => void;
}): {
  evalResult: StepEvalResult;
  reaction: ReactionRecord;
} {
  const {
    stepKey,
    playerInput,
    runtime,
    evaluateEncounterStep,
    applyStepOutcome,
    shouldEnterRecovery,
    enterRecovery,
    advanceEncounter,
  } = args;

  const evalResult = evaluateEncounterStep(stepKey, playerInput, runtime);

  const reaction = buildStepReaction({
    stepKey,
    evalResult,
    runtime,
    guestState: runtime.guestState,
  });

  applyStepReaction(runtime, reaction);
  storeStepReaction(runtime, reaction);
  applyStepOutcome(runtime, evalResult);

  if (shouldEnterRecovery(evalResult, runtime)) {
    enterRecovery(runtime, evalResult);
  } else {
    advanceEncounter(runtime, evalResult);
  }

  return { evalResult, reaction };
}

export function applyStepReaction(
  runtime: EncounterRuntimeState,
  reaction: ReactionRecord
): void {
  runtime.guestState = reaction.guestStateAfter;
}

export function storeStepReaction(
  runtime: EncounterRuntimeState,
  reaction: ReactionRecord
): void {
  if (!Array.isArray(runtime.reactionHistory)) {
    runtime.reactionHistory = [];
  }

  if (!Array.isArray(runtime.stepSpine)) {
    runtime.stepSpine = [];
  }

  runtime.reactionHistory.push(reaction);
  runtime.stepSpine.push({
    step: reaction.step,
    score: reaction.successPolarity,
  });
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
