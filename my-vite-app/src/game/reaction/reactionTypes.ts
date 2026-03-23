export type EncounterStepKey = "observe" | "mode" | "hook" | "deliver";

export type ReactionAccuracy = "correct" | "slight" | "wrong";

export type ReactionEmotion =
  | "engaged"
  | "interested"
  | "curious"
  | "neutral"
  | "uncertain"
  | "guarded"
  | "resistant"
  | "disengaged";

export type StepEvalOutcome = "correct" | "partial" | "wrong";

export type StepEvalResult = {
  outcome: StepEvalOutcome;
  score: number;
  tags?: string[];
  reasoning?: string;
  recoveryEligible?: boolean;
  bottleProgress?: boolean;
};

export type EncounterGuestState = {
  trust: number;
  interest: number;
  resistance: number;
  emotion: ReactionEmotion;
};

export type ReactionRecord = {
  step: EncounterStepKey;
  accuracy: ReactionAccuracy;
  emotion: ReactionEmotion;
  intensity: 1 | 2 | 3;
  tableCue: string;
  physicalCue: string;
  microExpression?: string;
  trustDelta: number;
  interestDelta: number;
  resistanceDelta: number;
  guestStateAfter: EncounterGuestState;
  stepScore: number;
  successPolarity: 1 | 0 | -1;
};

export type StepSpineNode = {
  step: EncounterStepKey;
  score: 1 | 0 | -1;
};

export type EncounterSummaryRecord = {
  encounterId: string;
  profileId: string;
  timestamp: number;
  bestPath: string[];
  chosenPath: string[];
  aiPerception: string;
  bottleServed: boolean;
  stepSpine: StepSpineNode[];
  reactionHistory: ReactionRecord[];
};

export type EncounterRuntimeState = {
  guestState: EncounterGuestState;
  reactionHistory: ReactionRecord[];
  stepSpine: StepSpineNode[];
  encounterId?: string;
  profileId?: string;
  encounter?: any;
  chosenPath?: string[];
  bestPath?: string[];
  bottleServed?: boolean;
  debug?: boolean;
  [key: string]: any;
};

export type BuildReactionArgs = {
  stepKey: EncounterStepKey;
  evalResult: StepEvalResult;
  runtime: EncounterRuntimeState;
  guestState: EncounterGuestState;
};

export type FinalizeReactionPartial = {
  accuracy: ReactionAccuracy;
  emotion: ReactionEmotion;
  intensity: 1 | 2 | 3;
  tableCue: string;
  physicalCue: string;
  microExpression?: string;
  trustDelta: number;
  interestDelta: number;
  resistanceDelta: number;
  stepScore: number;
  successPolarity: 1 | 0 | -1;
};

export type ReflectionPayload = {
  reactionHistory: ReactionRecord[];
  stepSpine: StepSpineNode[];
  guestState: EncounterGuestState;
  aiPerception: string;
  chosenPath: string[];
  bestPath: string[];
  bottleServed: boolean;
};
