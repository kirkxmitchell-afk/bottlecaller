import type {
  GreetingEvaluation,
  GreetingRating,
  GreetingRoute,
  GuestReviewProfile,
  TableServiceScenario,
} from "./types";
import { TABLE_SERVICE_SCENARIOS, getScenarioForGuest } from "./scenarios";

export { TABLE_SERVICE_SCENARIOS, getScenarioForGuest };

/** Player-facing review clues only — never expose preferred routes or wine roles. */
export function getVisibleReviewClues(
  review: GuestReviewProfile | null | undefined,
): string[] {
  if (!review) return [];
  return (review.reviewClues || []).map((clue) => String(clue || "").trim()).filter(Boolean);
}

export function getReviewProfileForGuest(
  guestId: string | null | undefined,
): GuestReviewProfile | null {
  return getScenarioForGuest(guestId)?.review ?? null;
}

export function rateGreetingRoute(
  review: GuestReviewProfile,
  route: GreetingRoute,
): GreetingRating {
  if (review.preferredGreetingRoutes.includes(route)) return "strong";
  if (review.acceptableGreetingRoutes.includes(route)) return "acceptable";
  if (review.weakGreetingRoutes.includes(route)) return "weak";
  return "poor";
}

const GREETING_BASE: Record<
  GreetingRoute,
  Omit<GreetingEvaluation, "route" | "rating" | "guestResponse">
> = {
  aperitif: {
    timeSeconds: 5,
    moodDelta: 0,
    patienceDelta: 0,
    encounterProgressDelta: 0,
    maxApModifier: 0,
    revealsFoodChoice: false,
    createsStationTask: { stationId: "bar", taskType: "prepare_aperitif" },
    nextStep: "complete_aperitif_service",
  },
  wine: {
    timeSeconds: 1,
    moodDelta: 0,
    patienceDelta: 0,
    encounterProgressDelta: 0,
    maxApModifier: 0,
    revealsFoodChoice: false,
    nextStep: "open_wine_selection",
  },
  food: {
    timeSeconds: 3,
    moodDelta: 0,
    patienceDelta: 0,
    encounterProgressDelta: 0,
    maxApModifier: 0,
    revealsFoodChoice: true,
    nextStep: "complete_food_order",
  },
};

const RATING_MODIFIERS: Record<
  GreetingRating,
  Partial<Pick<
    GreetingEvaluation,
    | "moodDelta"
    | "patienceDelta"
    | "encounterProgressDelta"
    | "maxApModifier"
    | "timeSeconds"
  >>
> = {
  strong: {
    moodDelta: 1,
    encounterProgressDelta: 1,
    maxApModifier: 0,
  },
  acceptable: {
    moodDelta: 0,
    encounterProgressDelta: 0,
    maxApModifier: 0,
  },
  weak: {
    moodDelta: -1,
    patienceDelta: -1,
    encounterProgressDelta: 0,
    maxApModifier: -2,
    timeSeconds: 2,
  },
  poor: {
    moodDelta: -2,
    patienceDelta: -2,
    encounterProgressDelta: -1,
    maxApModifier: -5,
    timeSeconds: 3,
  },
};

function defaultGuestResponse(
  review: GuestReviewProfile,
  route: GreetingRoute,
  rating: GreetingRating,
): string {
  if (route === "aperitif") {
    if (rating === "strong" || rating === "acceptable") {
      return review.pace === "relaxed"
        ? "That sounds good. We are taking our time tonight."
        : "An aperitif is fine — keep it simple.";
    }
    return "We were not really thinking about a drink first.";
  }
  if (route === "wine") {
    if (rating === "strong") {
      return review.familiarity === "regular"
        ? "You know our kind of bottle. Keep it in that lane."
        : "We are open to a bottle if it fits.";
    }
    if (rating === "acceptable") {
      return review.knownFoodIntent
        ? `We are still deciding, but we will probably have ${review.knownFoodIntent}.`
        : "We can look at wine, though we are still settling in.";
    }
    return "Wine already? We have barely looked at the menu.";
  }
  // food
  if (rating === "strong" || rating === "acceptable") {
    return review.knownFoodIntent
      ? `We will go with the ${review.knownFoodIntent}.`
      : "Food first works. We will follow your lead.";
  }
  return "We know what we want — no need to walk the whole menu.";
}

/**
 * Evaluate a greeting route against the review profile.
 * Does not decide wine/food accept/decline — that stays in evaluateOfferAccess.
 * Optional forcedRating recomputes all modifiers from that rating (no label-only override).
 */
export function evaluateGreeting(
  review: GuestReviewProfile,
  selectedGreeting: GreetingRoute,
  forcedRating?: GreetingRating | string | null,
): GreetingEvaluation {
  const forced = String(forcedRating || "").trim().toLowerCase();
  const rating: GreetingRating =
    forced === "strong" ||
    forced === "acceptable" ||
    forced === "weak" ||
    forced === "poor"
      ? forced
      : rateGreetingRoute(review, selectedGreeting);
  const base = GREETING_BASE[selectedGreeting];
  const mods = RATING_MODIFIERS[rating];

  const evaluation: GreetingEvaluation = {
    route: selectedGreeting,
    rating,
    timeSeconds: (base.timeSeconds || 0) + Number(mods.timeSeconds || 0),
    moodDelta: (base.moodDelta || 0) + Number(mods.moodDelta || 0),
    patienceDelta: (base.patienceDelta || 0) + Number(mods.patienceDelta || 0),
    encounterProgressDelta:
      (base.encounterProgressDelta || 0) + Number(mods.encounterProgressDelta || 0),
    maxApModifier: (base.maxApModifier || 0) + Number(mods.maxApModifier || 0),
    revealsFoodChoice: base.revealsFoodChoice || selectedGreeting === "food",
    revealsOccasion: selectedGreeting === "aperitif" && rating === "strong",
    revealsBudgetSignal: false,
    // Strong wine greet opens wine direction, but does not invent a concrete preference.
    revealsWinePreference: false,
    createsStationTask: base.createsStationTask,
    guestResponse: defaultGuestResponse(review, selectedGreeting, rating),
    nextStep: base.nextStep,
  };

  if (selectedGreeting === "aperitif" && (rating === "strong" || rating === "acceptable")) {
    evaluation.revealsFoodChoice = true;
  }

  return evaluation;
}

export function greetingChoiceToRoute(
  choice: string | null | undefined,
): GreetingRoute | null {
  const value = String(choice || "").trim().toLowerCase();
  if (value === "greet_aperitif" || value === "aperitif") return "aperitif";
  if (value === "greet_wine" || value === "wine") return "wine";
  if (value === "greet_food" || value === "food") return "food";
  return null;
}

export function routeToGreetChoice(route: GreetingRoute): string {
  if (route === "aperitif") return "greet_aperitif";
  if (route === "food") return "greet_food";
  return "greet_wine";
}

export function listConfiguredScenarios(): TableServiceScenario[] {
  return Object.values(TABLE_SERVICE_SCENARIOS);
}
