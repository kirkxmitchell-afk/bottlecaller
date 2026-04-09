import type {
  BuildReactionArgs,
  EncounterGuestState,
  EncounterStepKey,
  FinalizeReactionPartial,
  ReactionAccuracy,
  ReactionRecord,
  StepEvalResult,
} from "./reactionTypes";

export function mapEvalToAccuracy(
  evalResult: StepEvalResult
): ReactionAccuracy {
  switch (evalResult.outcome) {
    case "correct":
      return "correct";
    case "partial":
      return "slight";
    case "wrong":
    default:
      return "wrong";
  }
}

export function mapAccuracyToPolarity(
  accuracy: ReactionAccuracy
): 1 | 0 | -1 {
  if (accuracy === "correct") return 1;
  if (accuracy === "slight") return 0;
  return -1;
}

export function buildStepReaction(args: BuildReactionArgs): ReactionRecord {
  switch (args.stepKey) {
    case "observe":
      return buildObserveReaction(args);
    case "mode":
      return buildModeReaction(args);
    case "flash_learn":
      return buildFlashLearnReaction(args);
    case "problem_solve":
      return buildProblemSolveReaction(args);
    default:
      return buildFallbackReaction(args);
  }
}

export function buildObserveReaction(args: BuildReactionArgs): ReactionRecord {
  const accuracy = mapEvalToAccuracy(args.evalResult);

  if (accuracy === "correct") {
    return finalizeReactionRecord(
      {
        stepKey: "observe",
        guestState: args.guestState,
      },
      {
        accuracy,
        emotion: "curious",
        intensity: 1,
        tableCue: "Guest looks up, open to interaction.",
        physicalCue: "Guest lifts eyes from the menu.",
        microExpression: "eyebrows rise briefly",
        trustDelta: 1,
        interestDelta: 1,
        resistanceDelta: -1,
        stepScore: 1,
        successPolarity: 1,
      }
    );
  }

  if (accuracy === "slight") {
    return finalizeReactionRecord(
      {
        stepKey: "observe",
        guestState: args.guestState,
      },
      {
        accuracy,
        emotion: "neutral",
        intensity: 1,
        tableCue: "Guest glances up briefly, then back to the menu.",
        physicalCue: "Guest gives short eye contact.",
        microExpression: "small pause",
        trustDelta: 0,
        interestDelta: 0,
        resistanceDelta: 0,
        stepScore: 0,
        successPolarity: 0,
      }
    );
  }

  return finalizeReactionRecord(
    {
      stepKey: "observe",
      guestState: args.guestState,
    },
    {
      accuracy,
      emotion: "guarded",
      intensity: 2,
      tableCue: "Guest stays closed off.",
      physicalCue: "Guest keeps focus on the menu and leans back slightly.",
      microExpression: "lips tighten",
      trustDelta: -1,
      interestDelta: -1,
      resistanceDelta: 1,
      stepScore: -1,
      successPolarity: -1,
    }
  );
}

export function buildModeReaction(args: BuildReactionArgs): ReactionRecord {
  const accuracy = mapEvalToAccuracy(args.evalResult);

  if (accuracy === "correct") {
    return finalizeReactionRecord(
      {
        stepKey: "mode",
        guestState: args.guestState,
      },
      {
        accuracy,
        emotion: "interested",
        intensity: 1,
        tableCue: "Guest relaxes into the tone.",
        physicalCue: "Guest lowers their shoulders and maintains eye contact.",
        microExpression: "brief smile flicker",
        trustDelta: 1,
        interestDelta: 2,
        resistanceDelta: -1,
        stepScore: 1,
        successPolarity: 1,
      }
    );
  }

  if (accuracy === "slight") {
    return finalizeReactionRecord(
      {
        stepKey: "mode",
        guestState: args.guestState,
      },
      {
        accuracy,
        emotion: "uncertain",
        intensity: 1,
        tableCue: "Guest listens, but seems unsure of your tone.",
        physicalCue: "Guest tilts head slightly.",
        microExpression: "brow furrows lightly",
        trustDelta: 0,
        interestDelta: 1,
        resistanceDelta: 0,
        stepScore: 0,
        successPolarity: 0,
      }
    );
  }

  return finalizeReactionRecord(
    {
      stepKey: "mode",
      guestState: args.guestState,
    },
    {
      accuracy,
      emotion: "guarded",
      intensity: 2,
      tableCue: "Guest stiffens slightly.",
      physicalCue: "Guest leans back and breaks eye contact.",
      microExpression: "jaw tightens",
      trustDelta: -1,
      interestDelta: -1,
      resistanceDelta: 1,
      stepScore: -1,
      successPolarity: -1,
    }
  );
}

export function buildFlashLearnReaction(args: BuildReactionArgs): ReactionRecord {
  const accuracy = mapEvalToAccuracy(args.evalResult);

  if (accuracy === "correct") {
    return finalizeReactionRecord(
      {
        stepKey: "flash_learn",
        guestState: args.guestState,
      },
      {
        accuracy,
        emotion: "engaged",
        intensity: 2,
        tableCue: "Guest leans in, clearly interested.",
        physicalCue: "Guest lowers the menu and nods.",
        microExpression: "eyes brighten",
        trustDelta: 1,
        interestDelta: 3,
        resistanceDelta: -1,
        stepScore: 1,
        successPolarity: 1,
      }
    );
  }

  if (accuracy === "slight") {
    return finalizeReactionRecord(
      {
        stepKey: "flash_learn",
        guestState: args.guestState,
      },
      {
        accuracy,
        emotion: "curious",
        intensity: 1,
        tableCue: "Guest shows mild interest, but hesitates.",
        physicalCue: "Guest glances at you, then back at the menu.",
        microExpression: "lips press together in thought",
        trustDelta: 0,
        interestDelta: 1,
        resistanceDelta: 0,
        stepScore: 0,
        successPolarity: 0,
      }
    );
  }

  return finalizeReactionRecord(
    {
      stepKey: "flash_learn",
      guestState: args.guestState,
    },
    {
      accuracy,
      emotion: "resistant",
      intensity: 2,
      tableCue: "Guest disengages from the pitch.",
      physicalCue: "Guest looks away and closes posture.",
      microExpression: "quick exhale",
      trustDelta: -1,
      interestDelta: -2,
      resistanceDelta: 2,
      stepScore: -1,
      successPolarity: -1,
    }
  );
}

export function buildProblemSolveReaction(args: BuildReactionArgs): ReactionRecord {
  const accuracy = mapEvalToAccuracy(args.evalResult);

  if (accuracy === "correct") {
    return finalizeReactionRecord(
      {
        stepKey: "problem_solve",
        guestState: args.guestState,
      },
      {
        accuracy,
        emotion: "engaged",
        intensity: 3,
        tableCue: "Guest nods confidently, ready to decide.",
        physicalCue: "Guest turns fully toward you and smiles.",
        microExpression: "confident nod",
        trustDelta: 2,
        interestDelta: 2,
        resistanceDelta: -1,
        stepScore: 1,
        successPolarity: 1,
      }
    );
  }

  if (accuracy === "slight") {
    return finalizeReactionRecord(
      {
        stepKey: "problem_solve",
        guestState: args.guestState,
      },
      {
        accuracy,
        emotion: "uncertain",
        intensity: 2,
        tableCue: "Guest nods slowly, still weighing it up.",
        physicalCue: "Guest pauses with the menu half lowered.",
        microExpression: "brow furrows lightly",
        trustDelta: 0,
        interestDelta: 0,
        resistanceDelta: 1,
        stepScore: 0,
        successPolarity: 0,
      }
    );
  }

  return finalizeReactionRecord(
    {
      stepKey: "problem_solve",
      guestState: args.guestState,
    },
    {
      accuracy,
      emotion: "resistant",
      intensity: 3,
      tableCue: "Guest declines and shuts down the offer.",
      physicalCue: "Guest shakes head and withdraws from the interaction.",
      microExpression: "lips tighten",
      trustDelta: -2,
      interestDelta: -2,
      resistanceDelta: 2,
      stepScore: -1,
      successPolarity: -1,
    }
  );
}

export function buildFallbackReaction(args: BuildReactionArgs): ReactionRecord {
  const accuracy = mapEvalToAccuracy(args.evalResult);
  const polarity = mapAccuracyToPolarity(accuracy);

  return finalizeReactionRecord(
    {
      stepKey: args.stepKey,
      guestState: args.guestState,
    },
    {
      accuracy,
      emotion: args.guestState.emotion,
      intensity: 1,
      tableCue: "Guest reacts, but the response is not specialized yet.",
      physicalCue: "Guest shifts slightly in their seat.",
      microExpression: undefined,
      trustDelta: polarity,
      interestDelta: polarity,
      resistanceDelta: -polarity,
      stepScore: polarity,
      successPolarity: polarity,
    }
  );
}

export function finalizeReactionRecord(
  args: {
    stepKey: EncounterStepKey;
    guestState: EncounterGuestState;
  },
  partial: FinalizeReactionPartial
): ReactionRecord {
  const guestStateAfter: EncounterGuestState = {
    trust: clampNumber(args.guestState.trust + partial.trustDelta, -10, 10),
    interest: clampNumber(
      args.guestState.interest + partial.interestDelta,
      -10,
      10
    ),
    resistance: clampNumber(
      args.guestState.resistance + partial.resistanceDelta,
      -10,
      10
    ),
    emotion: partial.emotion,
  };

  return {
    step: args.stepKey,
    accuracy: partial.accuracy,
    emotion: partial.emotion,
    intensity: partial.intensity,
    tableCue: partial.tableCue,
    physicalCue: partial.physicalCue,
    microExpression: partial.microExpression,
    trustDelta: partial.trustDelta,
    interestDelta: partial.interestDelta,
    resistanceDelta: partial.resistanceDelta,
    guestStateAfter,
    stepScore: partial.stepScore,
    successPolarity: partial.successPolarity,
  };
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
