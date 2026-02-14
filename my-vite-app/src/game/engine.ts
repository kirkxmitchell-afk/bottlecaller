// engine.ts
// BottleCaller Encounter Engine v1 (LOCKED)
// Core: Read -> GuestType -> Mode -> Hook -> PivotGate -> (Pivot + optional GuestShift) -> FinalHook -> Outcome

export type Stage = 1 | 2 | 3;
export type Signal = "green" | "yellow" | "red";

export type GuestType =
  | "browser"
  | "budget_guard"
  | "celebrator"
  | "alpha"
  | "analyst"
  | "make_it_easy";

export type Mode = "scout" | "guide" | "charm" | "authority" | "closer";

export type Tier = "right" | "slightly" | "wrong" | "wrong_npc";

export interface GuestSetup {
  bodyLanguage: string[]; // e.g. ["leans back", "scanning menu"]
  spokenLine: string; // e.g. "We’re just looking."
}

export interface GradingSpec<T> {
  right: T;
  slightlyRight: T | T[]; // allow 1 or many slightly-right
}

export interface Feedback {
  microExpression?: string; // used after guest type
  verbalCue?: string; // used after mode/hook/pivot
  signal: Signal;
}

export interface GuestTypeStep {
  prompt: string;
  options: { id: GuestType; label: string }[];
  grading: GradingSpec<GuestType>;
  feedback: {
    right: Feedback;
    slightly: Feedback;
    wrong: Feedback;
  };
}

export interface ModeStep {
  prompt: string;
  grading: GradingSpec<Mode>;
  feedback: {
    right: Feedback;
    slightly: Feedback;
    wrong: Feedback;
  };
}

export interface HookOption {
  id: string;
  text: string;
  tier: Tier;
  wineId?: string;
  hookStyle?: "safe" | "premium" | "vibe" | "authority";
}

export interface HookStep {
  prompt: string;
  options: HookOption[];
  feedback: {
    right: Feedback;
    slightly: Feedback;
    wrong: Feedback;
  };
}

export interface PivotGate {
  scoring: { right: number; slightly: number; wrong: number };
  unlockThreshold: number; // LOCKED at 2.0
}

export type PivotType = "recovery" | "opportunity";

export interface GuestTypeShiftRule {
  whenSignal: Signal;
  from: GuestType;
  to: GuestType;
  reason: string;
}

export interface GuestTypeShift {
  enabled: boolean;
  rules: GuestTypeShiftRule[];
}

export interface PivotStep {
  enabled: boolean; // per encounter
  pivotType: PivotType; // recovery or opportunity
  triggerSignalsAllowed: Signal[]; // e.g. ["yellow","red"] or ["green"]
  allowReset: boolean; // reset only if first mode was scout
}

export interface FinalHookStep {
  prompt: string;
  options: HookOption[]; // same tier pattern
}

export type OutcomeId = "yes_nod" | "upgrade" | "neutral" | "reject";
export interface OutcomeStep {
  outcomes: { id: OutcomeId; label: string; result: "pass" | "pass_big" | "pass_small" | "fail" }[];
}

export interface Encounter {
  id: number;
  title: string;
  stage: Stage;
  difficulty: 1 | 2 | 3 | 4 | 5;

  guestSetup: GuestSetup;

  guestTypeStep: GuestTypeStep;
  modeStep: ModeStep;
  hookStep: HookStep;

  pivotGate: PivotGate;
  pivotStep: PivotStep;

  guestTypeShift?: GuestTypeShift; // optional, only on select encounters

  // Pivot Mode step only used if user chooses pivot
  pivotModeStep?: ModeStep;

  finalHookStep: FinalHookStep;
  outcomeStep: OutcomeStep;
}

export interface AttemptState {
  encounterId: number;

  // initial 3 decisions
  guestTypePick?: GuestType;
  modePick?: Mode;
  hookPickId?: string;

  // derived evaluation
  guestTypeTier?: "right" | "slightly" | "wrong";
  modeTier?: "right" | "slightly" | "wrong";
  hookTier?: "right" | "slightly" | "wrong";

  // signal after hook step (drives pivot)
  signalAfterHook?: Signal;

  // pivot eligibility
  pivotUnlocked?: boolean;

  // pivot choice
  pivotChoice?: "hold" | "pivot" | "reset" | "none";

  // guest type may shift (A->B)
  effectiveGuestType?: GuestType; // after shift

  // if pivot selected
  pivotModePick?: Mode;
  pivotModeTier?: "right" | "slightly" | "wrong";

  // final hook
  finalHookPickId?: string;
  finalHookTier?: "right" | "slightly" | "wrong";

  // outcome
  outcomeId?: OutcomeId;

  // grading
  encounterGrade?: "right" | "slightly_right" | "wrong";
}

const GUEST_TYPES: { id: GuestType; label: string }[] = [
  { id: "browser", label: "Browser" },
  { id: "budget_guard", label: "Budget Guard" },
  { id: "celebrator", label: "Celebrator" },
  { id: "alpha", label: "Alpha" },
  { id: "analyst", label: "Analyst" },
  { id: "make_it_easy", label: "Make-It-Easy" },
];

// LOCKED mode pools
export function getModesForStage(stage: Stage): Mode[] {
  if (stage === 1) return ["scout", "guide", "charm"];
  if (stage === 2) return ["scout", "guide", "charm", "authority"];
  return ["scout", "guide", "charm", "authority", "closer"];
}

function asArray<T>(v: T | T[]): T[] {
  return Array.isArray(v) ? v : [v];
}

function tierFromPick<T>(pick: T, grading: GradingSpec<T>): "right" | "slightly" | "wrong" {
  if (pick === grading.right) return "right";
  if (asArray(grading.slightlyRight).includes(pick)) return "slightly";
  return "wrong";
}

// Pivot Gate scoring (LOCKED)
export function computePivotGateScore(state: AttemptState, gate: PivotGate): number {
  const s1 =
    state.guestTypeTier === "right"
      ? gate.scoring.right
      : state.guestTypeTier === "slightly"
        ? gate.scoring.slightly
        : gate.scoring.wrong;

  const s2 =
    state.modeTier === "right"
      ? gate.scoring.right
      : state.modeTier === "slightly"
        ? gate.scoring.slightly
        : gate.scoring.wrong;

  const s3 =
    state.hookTier === "right"
      ? gate.scoring.right
      : state.hookTier === "slightly"
        ? gate.scoring.slightly
        : gate.scoring.wrong;

  return s1 + s2 + s3;
}

export function pivotUnlocked(state: AttemptState, gate: PivotGate): boolean {
  return computePivotGateScore(state, gate) >= gate.unlockThreshold;
}

// ✅ NEW: Signal comes from FULL CHAIN SCORE (not just hook tier)
export function signalFromScore(score: number): Signal {
  if (score >= 2.5) return "green";
  if (score >= 1.5) return "yellow";
  return "red";
}

// Guest type shift (A->B), only if enabled and pivot gate passed
export function applyGuestTypeShift(enc: Encounter, state: AttemptState): GuestType {
  const base = state.guestTypePick ?? enc.guestTypeStep.grading.right;
  const shift = enc.guestTypeShift;
  if (!shift?.enabled) return base;
  if (!state.pivotUnlocked) return base;

  const sig = state.signalAfterHook ?? "yellow";
  const rule = shift.rules.find((r) => r.whenSignal === sig && r.from === base);
  return rule ? rule.to : base;
}

// ✅ NEW: Right final hook can NEVER fail
export function outcomeFromFinalHook(finalTier: "right" | "slightly" | "wrong"): OutcomeId {
  if (finalTier === "right") return Math.random() < 0.4 ? "upgrade" : "yes_nod";
  if (finalTier === "slightly") return Math.random() < 0.6 ? "neutral" : "yes_nod";
  return Math.random() < 0.75 ? "reject" : "neutral";
}

// ✅ NEW: Tightened grading (deterministic + skill-based)
export function gradeEncounter(state: AttemptState): "right" | "slightly_right" | "wrong" {
  if (state.outcomeId === "reject") return "wrong";

  const rights = [
    state.guestTypeTier === "right",
    state.modeTier === "right",
    state.hookTier === "right",
    state.finalHookTier === "right",
  ].filter(Boolean).length;

  if (rights >= 3) return "right";
  if (rights >= 2) return "slightly_right";
  return "wrong";
}

// MAIN: run an encounter attempt step-by-step
export function startAttempt(enc: Encounter): AttemptState {
  return {
    encounterId: enc.id,
    effectiveGuestType: undefined,
    pivotChoice: "none",
  };
}

export function pickGuestType(enc: Encounter, state: AttemptState, pick: GuestType): Feedback {
  state.guestTypePick = pick;
  state.guestTypeTier = tierFromPick(pick, enc.guestTypeStep.grading);
  if (state.guestTypeTier === "right") return enc.guestTypeStep.feedback.right;
  if (state.guestTypeTier === "slightly") return enc.guestTypeStep.feedback.slightly;
  return enc.guestTypeStep.feedback.wrong;
}

export function pickMode(enc: Encounter, state: AttemptState, pick: Mode): Feedback {
  state.modePick = pick;
  state.modeTier = tierFromPick(pick, enc.modeStep.grading);
  if (state.modeTier === "right") return enc.modeStep.feedback.right;
  if (state.modeTier === "slightly") return enc.modeStep.feedback.slightly;
  return enc.modeStep.feedback.wrong;
}

// ✅ UPDATED: hook -> compute score -> derive signal -> unlock pivot
export function pickHook(enc: Encounter, state: AttemptState, hookId: string): Feedback {
  const opt = enc.hookStep.options.find((o) => o.id === hookId);
  if (!opt) throw new Error(`Unknown hook option: ${hookId}`);

  state.hookPickId = hookId;

  state.hookTier = opt.tier === "right" ? "right" : opt.tier === "slightly" ? "slightly" : "wrong";

  const score = computePivotGateScore(state, enc.pivotGate);
  state.signalAfterHook = signalFromScore(score);
  state.pivotUnlocked = score >= enc.pivotGate.unlockThreshold;

  // If pivot unlocked, guest type may shift (only on authored encounters)
  state.effectiveGuestType = applyGuestTypeShift(enc, state);

  if (state.hookTier === "right") return enc.hookStep.feedback.right;
  if (state.hookTier === "slightly") return enc.hookStep.feedback.slightly;
  return enc.hookStep.feedback.wrong;
}

export function canOfferPivot(enc: Encounter, state: AttemptState): boolean {
  if (!enc.pivotStep.enabled) return false;
  if (!state.pivotUnlocked) return false;
  const sig = state.signalAfterHook ?? "yellow";
  return enc.pivotStep.triggerSignalsAllowed.includes(sig);
}

// ✅ UPDATED: Reset only allowed if first mode was scout AND allowReset is true
export function choosePivot(
  enc: Encounter,
  state: AttemptState,
  choice: "hold" | "pivot" | "reset" | "none"
) {
  if (choice === "reset") {
    if (!enc.pivotStep.allowReset) return;
    if (state.modePick !== "scout") return;
  }
  state.pivotChoice = choice;
}

export function pickPivotMode(enc: Encounter, state: AttemptState, pick: Mode): Feedback {
  if (!enc.pivotModeStep) throw new Error("pivotModeStep missing in encounter");
  state.pivotModePick = pick;
  state.pivotModeTier = tierFromPick(pick, enc.pivotModeStep.grading);
  if (state.pivotModeTier === "right") return enc.pivotModeStep.feedback.right;
  if (state.pivotModeTier === "slightly") return enc.pivotModeStep.feedback.slightly;
  return enc.pivotModeStep.feedback.wrong;
}

export function pickFinalHook(enc: Encounter, state: AttemptState, hookId: string): void {
  const opt = enc.finalHookStep.options.find((o) => o.id === hookId);
  if (!opt) throw new Error(`Unknown final hook: ${hookId}`);

  state.finalHookPickId = hookId;
  state.finalHookTier = opt.tier === "right" ? "right" : opt.tier === "slightly" ? "slightly" : "wrong";

  state.outcomeId = outcomeFromFinalHook(state.finalHookTier);
  state.encounterGrade = gradeEncounter(state);
}

// Example encounter object (showing structure)
export function exampleEncounter(stage: Stage = 1): Encounter {
  const modes = getModesForStage(stage);

  return {
    id: 1,
    title: "We’re just looking",
    stage,
    difficulty: 1,

    guestSetup: {
      bodyLanguage: ["leans back", "scanning menu", "minimal eye contact"],
      spokenLine: "We’re just looking for now.",
    },

    guestTypeStep: {
      prompt: "What type of guest is this?",
      options: GUEST_TYPES,
      grading: { right: "browser", slightlyRight: "budget_guard" },
      feedback: {
        right: { microExpression: "soft smile + small nod", signal: "green" },
        slightly: { microExpression: "pause + slight eyebrow lift", signal: "yellow" },
        wrong: { microExpression: "pulls back + frown", signal: "red" },
      },
    },

    modeStep: {
      prompt: "Choose your Mode.",
      grading: { right: "scout", slightlyRight: ["guide"] },
      feedback: {
        right: { verbalCue: "Okay cool… go on.", signal: "green" },
        slightly: { verbalCue: "Hmm… okay.", signal: "yellow" },
        wrong: { verbalCue: "No, we’re fine.", signal: "red" },
      },
    },

    hookStep: {
      prompt: "Choose your Hook.",
      options: [
        { id: "h1", text: "Quick one — lighter and fresh, or richer and smooth?", tier: "right", hookStyle: "safe" },
        { id: "h2", text: "Red or white tonight?", tier: "slightly", hookStyle: "safe" },
        { id: "h3", text: "Our best bottle tonight is the premium red.", tier: "wrong", hookStyle: "premium" },
        { id: "h4", text: "Sorry to bother you… are you ready?", tier: "wrong_npc" },
      ],
      feedback: {
        right: { verbalCue: "Okay that helps.", signal: "green" },
        slightly: { verbalCue: "Maybe… what else?", signal: "yellow" },
        wrong: { verbalCue: "Nah, we’re good.", signal: "red" },
      },
    },

    pivotGate: {
      scoring: { right: 1.0, slightly: 0.5, wrong: 0.0 },
      unlockThreshold: 2.0,
    },

    pivotStep: {
      enabled: true,
      pivotType: "opportunity",
      triggerSignalsAllowed: ["green", "yellow"], // opportunity / small correction
      allowReset: true,
    },

    guestTypeShift: {
      enabled: true,
      rules: [
        {
          whenSignal: "green",
          from: "browser",
          to: "make_it_easy",
          reason: "They now trust your leadership",
        },
      ],
    },

    pivotModeStep: {
      prompt: "Pivot your Mode.",
      grading: { right: "guide", slightlyRight: ["scout"] },
      feedback: {
        right: { verbalCue: "Okay… that’s better.", signal: "green" },
        slightly: { verbalCue: "Hmm… okay.", signal: "yellow" },
        wrong: { verbalCue: "No, not that.", signal: "red" },
      },
    },

    finalHookStep: {
      prompt: "Final Hook. Close it in 2 sentences.",
      options: [
        { id: "fh1", text: "Perfect — I’ll do the clean easy bottle. It always wins.", tier: "right" },
        { id: "fh2", text: "I think you’ll enjoy this one.", tier: "slightly" },
        { id: "fh3", text: "Uhm… unless you want something else?", tier: "wrong_npc" },
      ],
    },

    outcomeStep: {
      outcomes: [
        { id: "yes_nod", label: "Yes / Nod", result: "pass" },
        { id: "upgrade", label: "Upgrade", result: "pass_big" },
        { id: "neutral", label: "Neutral", result: "pass_small" },
        { id: "reject", label: "Reject", result: "fail" },
      ],
    },
  };
}

// ============================================================
// Engine Overlay: Reaction Calculator (for current UI prototype)
// - Pure functions only
// - No DOM, no storage, no routing, no Supabase
// - IMPORTANT: uses distinct type names to avoid collisions
// ============================================================

export type UiMode = "LEAD" | "REFLECT" | "HOLD";
export type UiHook = "FLAVOUR" | "STORY" | "VALUE";
export type ModeStatus = "optimal" | "neutral" | "damaging";
export type HookStatus = "optimal" | "neutral" | "damaging";

export type ReactionChecks = {
  guestRead: boolean;
  modeStatus: ModeStatus;
  hookStatus: HookStatus;
  deliveryCorrect: boolean;

  /**
   * v1 locked rule:
   * reset only allowed if first mode was "scout".
   * In current prototype UI we map scout ≈ HOLD.
   */
  firstMode: UiMode | "" | null | undefined;
  deciderMode?: string;
  deciderHookText?: string;
  deciderHookType?: string;
};

export type ReactionResult = {
  chainScore: number;       // 0..4
  chainSignal: Signal;      // uses your existing Signal type (green/yellow/red)
  pivotUnlocked: boolean;   // score band gate
  resetAllowed: boolean;    // firstMode == HOLD (scout-mapped)
  deliveryCorrect: boolean; // passed through
  pivotType: "POWER_MOVE_PIVOT" | "RECOVERY_PIVOT" | "";
  __decider: DeciderResult;
};

type DeciderSignal = "DECIDER_NEUTRAL" | "DECIDER_TRUST_GAINED" | "DECIDER_FRICTION";

type DeciderResult = {
  total: number;
  signal: DeciderSignal;
  modeScore: number;
  hookScore: number;
};

const DECIDER_DEFAULT: DeciderResult = {
  total: 0,
  signal: "DECIDER_NEUTRAL",
  modeScore: 0,
  hookScore: 0,
};

export function computeChainScore(checks: ReactionChecks): number {
  const read = checks.guestRead ? 1.0 : 0.0;
  const mode = checks.modeStatus === "optimal" ? 1.0 : checks.modeStatus === "neutral" ? 0.5 : 0.0;
  const hook = checks.hookStatus === "optimal" ? 1.0 : checks.hookStatus === "neutral" ? 0.5 : 0.0;
  const delivery = checks.deliveryCorrect ? 1.0 : 0.0;
  return read + mode + hook + delivery;
}

export function signalFromChainScore(score: number): Signal {
  if (score >= 3.0) return "green";
  if (score >= 2.0) return "yellow";
  return "red";
}

export function pivotUnlockedFromScore(score: number): boolean {
  return score >= 2.0;
}

export function resetAllowedFromFirstMode(firstMode: ReactionChecks["firstMode"]): boolean {
  return firstMode === "HOLD";
}

export function computeReaction(checks: ReactionChecks): ReactionResult {
  let chainScore = computeChainScore(checks);
  const deciderResult: DeciderResult =
    (checks.deciderMode || checks.deciderHookText || checks.deciderHookType)
      ? (scoreDecider(checks) ?? DECIDER_DEFAULT)
      : DECIDER_DEFAULT;
  chainScore = Math.max(0, Math.min(4, chainScore + deciderResult.total));
  const chainSignal = signalFromChainScore(chainScore);
  const pivotUnlocked = pivotUnlockedFromScore(chainScore);
  const resetAllowed = resetAllowedFromFirstMode(checks.firstMode);

  let pivotType: ReactionResult["pivotType"] = "";
  if (!checks.deliveryCorrect && pivotUnlocked) {
    pivotType = chainSignal === "green" ? "POWER_MOVE_PIVOT" : "RECOVERY_PIVOT";
  }

  return {
    chainScore,
    chainSignal,
    pivotUnlocked,
    resetAllowed,
    deliveryCorrect: checks.deliveryCorrect,
    pivotType,
    __decider: deciderResult,
  };
}

function scoreDecider(checks: ReactionChecks): DeciderResult {
  const mode = (checks.deciderMode || "").toLowerCase();
  const text = (checks.deciderHookText || "").toLowerCase();
  const hookType = (checks.deciderHookType || "").toLowerCase();

  let modeScore = 0;
  if (mode === "authority") modeScore = 2;
  else if (mode === "guide") modeScore = 1;
  else if (mode === "scout") modeScore = -1;
  else if (mode === "charm") modeScore = -2;

  let hookScore = 0;
  if (hookType.includes("guest_centered")) hookScore += 1;
  if (hookType.includes("outcome_centered")) hookScore -= 1;

  const good = ["quick", "simple", "easy", "safe", "best", "i’d go", "i'd go", "can’t miss", "can't miss", "straightforward", "in a rush"];
  const bad  = ["leaning", "or", "maybe", "perhaps", "few options", "what do you feel", "do you prefer"];

  for (const k of good) if (text.includes(k)) hookScore += 1;
  for (const k of bad) if (text.includes(k)) hookScore -= 1;

  const total = modeScore + hookScore;

  let signal: ReactionResult["__decider"]["signal"] = "DECIDER_NEUTRAL";
  if (total >= 3) signal = "DECIDER_TRUST_GAINED";
  else if (total <= -2) signal = "DECIDER_FRICTION";

  return { total, signal, modeScore, hookScore };
}
