import type {
  EncounterStartContext,
  GreetingEvaluation,
  KnownGuestInformation,
  ScenarioWineCandidate,
  TableServiceScenario,
} from "./types";
import { getScenarioForGuest } from "./scenarios";
import {
  getWineCandidate,
  getWineVariant,
  MATCH_RATING_SELECTION_AP,
} from "./wineCandidates";
import { greetingChoiceToRoute } from "./greetingRoutes";

export function buildKnownGuestInformation(args: {
  reviewFoodIntent?: string | null;
  greeting?: GreetingEvaluation | null;
  foodOrdered?: boolean;
  discovered?: KnownGuestInformation | null;
  mealIntent?: KnownGuestInformation["mealIntent"] | null;
  mealProfile?: KnownGuestInformation["mealProfile"] | null;
}): KnownGuestInformation {
  const known: KnownGuestInformation = { ...(args.discovered || {}) };
  if (args.mealIntent?.dish) {
    known.mealIntent = {
      dish: String(args.mealIntent.dish).trim(),
      description: String(args.mealIntent.description || "").trim() || undefined,
      certainty: args.mealIntent.certainty || "likely",
    };
  }
  if (args.mealProfile) {
    known.mealProfile = { ...args.mealProfile };
  }
  if (args.greeting?.revealsFoodChoice || args.foodOrdered) {
    known.foodChoice =
      known.foodChoice ||
      known.mealIntent?.dish ||
      String(args.reviewFoodIntent || "").trim() ||
      undefined;
  }
  if (args.greeting?.revealsOccasion) {
    known.occasion = known.occasion || "leisure";
  }
  if (args.greeting?.revealsBudgetSignal) {
    known.budgetSignal = known.budgetSignal || "unknown";
  }
  // Vague "open" must never count as a known wine preference.
  const winePref = String(known.winePreference || "").trim();
  if (!winePref || winePref.toLowerCase() === "open") {
    delete known.winePreference;
  }
  return known;
}

/**
 * BASE GUEST SCENARIO + GREETING MODIFIER + SELECTED WINE VARIANT
 * = encounter start state (no per-combo encounter files).
 */
export function createEncounterStartContext(args: {
  guestId: string | null | undefined;
  greetingRoute?: string | null;
  greetingEvaluation?: GreetingEvaluation | null;
  selectedWineId: string | null | undefined;
  knownGuestInformation?: KnownGuestInformation | null;
  encounterId?: string | null;
  timeAlreadyUsedSeconds?: number;
}): EncounterStartContext | null {
  const guestId = String(args.guestId || "").trim();
  const scenario = getScenarioForGuest(guestId);
  if (!scenario) return null;

  const candidate =
    getWineCandidate(guestId, args.selectedWineId) ||
    scenario.wineCandidates[0] ||
    null;
  if (!candidate) return null;

  const route =
    args.greetingEvaluation?.route ||
    greetingChoiceToRoute(args.greetingRoute) ||
    "wine";
  const rating = args.greetingEvaluation?.rating || "acceptable";
  const variant = getWineVariant(scenario, candidate);

  const greetingProgress = Number(args.greetingEvaluation?.encounterProgressDelta || 0);
  const greetingMood = Number(args.greetingEvaluation?.moodDelta || 0);
  const greetingMaxAp = Number(args.greetingEvaluation?.maxApModifier || 0);

  return {
    scenarioId: scenario.id,
    guestId,
    encounterId: String(args.encounterId || "").trim(),
    greetingRoute: route,
    greetingRating: rating,
    knownGuestInformation: args.knownGuestInformation || {},
    selectedWineId: candidate.productId,
    selectedWineCommercialRole: candidate.commercialRole,
    selectedWineMatchRating: candidate.matchRating,
    wineVariantId: candidate.encounterVariantId,
    modifiers: {
      startingProgressDelta:
        greetingProgress + Number(candidate.startingProgressDelta || 0),
      startingMoodDelta: greetingMood + Number(candidate.startingMoodDelta || 0),
      startingFrustrationDelta: Number(candidate.startingFrustrationDelta || 0),
      // Match rating alone drives selection AP via bottleChoice.score.
      // Commercial role and candidate.maxApModifier must never stack here.
      maxApModifier: greetingMaxAp,
      timeAlreadyUsedSeconds: Number(args.timeAlreadyUsedSeconds || 0) || 0,
    },
    variant,
    selectionApHint: MATCH_RATING_SELECTION_AP[candidate.matchRating],
  };
}

export function applyEncounterStartToGameState(args: {
  progress?: number;
  frustration?: number;
  context: EncounterStartContext;
}): { progress: number; frustration: number } {
  const moodAsProgress = Number(args.context.modifiers.startingMoodDelta || 0);
  const progress = Math.max(
    0,
    Math.min(
      100,
      Number(args.progress || 0) +
        args.context.modifiers.startingProgressDelta +
        moodAsProgress,
    ),
  );
  const frustration = Math.max(
    0,
    Math.min(
      100,
      Number(args.frustration || 0) +
        args.context.modifiers.startingFrustrationDelta,
    ),
  );
  return { progress, frustration };
}

export function scenarioHasSecondWineOpportunity(
  scenario: TableServiceScenario | null | undefined,
): boolean {
  return !!scenario?.secondWineOpportunityAllowed;
}

export function summarizeCandidateRoles(
  candidates: ScenarioWineCandidate[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const candidate of candidates) {
    out[candidate.commercialRole] = candidate.productId;
  }
  return out;
}
