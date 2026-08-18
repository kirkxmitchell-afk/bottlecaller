/** Shared types for modular guest review → greeting → wine → encounter. */

export type GreetingRoute = "aperitif" | "wine" | "food";
export type GreetingRating = "strong" | "acceptable" | "weak" | "poor";

export type GuestPace = "fast" | "direct" | "relaxed" | "guided" | "cautious";
export type Familiarity = "new" | "somewhat_familiar" | "regular";
export type DiscoveryNeed = "low" | "medium" | "high";
export type BudgetSignal = "low" | "medium" | "high" | "unknown";
export type Tolerance = "low" | "medium" | "high";
export type CommitReadiness = "early" | "normal" | "late";

export type MealCertainty = "confirmed" | "likely" | "considering";

export interface MealIntent {
  dish: string;
  description?: string;
  certainty: MealCertainty;
}

export interface MealProfile {
  protein?: string;
  richness?: "low" | "medium" | "high";
  sauce?: string;
  preparation?: string;
}

export type WineCommercialRole = "premium" | "safe" | "partner";
export type WineMatchRating = "strong" | "acceptable" | "risky" | "poor";
export type Compatibility = "strong" | "acceptable" | "poor";
export type PriceCompatibility = "strong" | "acceptable" | "risky" | "poor";

export type RecommendAngle = "flavour" | "story" | "value" | "confidence";

export type TableServicePhase =
  | "arriving"
  | "waiting_at_door"
  | "seated"
  | "ready_for_review"
  | "reviewed"
  | "greeting_selected"
  | "opening_service"
  | "ready_for_wine_selection"
  | "wine_selected"
  | "encounter_active"
  | "encounter_resolved"
  | "continuing_service"
  | "departed"
  | "failed"
  | "abandoned"
  | "unfinished"
  | "impatient";

export type GreetingNextStep =
  | "complete_aperitif_service"
  | "open_wine_selection"
  | "complete_food_order";

export interface GuestEncounterTraits {
  askTolerance: Tolerance;
  recommendationTolerance: Tolerance;
  commitReadiness: CommitReadiness;
  pressureSensitivity: Tolerance;
}

export interface GuestReviewProfile {
  scenarioId: string;
  guestId: string;
  guestType: string;
  pace: GuestPace;
  familiarity: Familiarity;
  discoveryNeed: DiscoveryNeed;
  /** Short player-facing who/why line. Never names a wine or opening. */
  reviewContext?: string;
  mealIntent?: MealIntent;
  mealProfile?: MealProfile;
  knownFoodIntent?: string;
  knownFoodCategory?: string;
  knownOccasion?: string;
  knownBudgetSignal?: BudgetSignal;
  /** Player-visible only. Never includes correct greet/wine/action. */
  reviewClues: string[];
  preferredGreetingRoutes: GreetingRoute[];
  acceptableGreetingRoutes: GreetingRoute[];
  weakGreetingRoutes: GreetingRoute[];
  usefulWineStyles?: string[];
  unsuitableWineStyles?: string[];
  encounterTraits: GuestEncounterTraits;
}

export interface GreetingEvaluation {
  route: GreetingRoute;
  rating: GreetingRating;
  timeSeconds: number;
  moodDelta: number;
  patienceDelta: number;
  encounterProgressDelta: number;
  maxApModifier: number;
  revealsFoodChoice?: boolean;
  revealsOccasion?: boolean;
  revealsBudgetSignal?: boolean;
  revealsWinePreference?: boolean;
  createsStationTask?: {
    stationId: "bar" | "kitchen" | "pos" | "mise_en_place";
    taskType: string;
  };
  guestResponse: string;
  nextStep: GreetingNextStep;
}

export interface ScenarioWineCandidate {
  productId: string;
  commercialRole: WineCommercialRole;
  matchRating: WineMatchRating;
  foodCompatibility: Compatibility;
  guestCompatibility: Compatibility;
  priceCompatibility: PriceCompatibility;
  maxApModifier: number;
  startingMoodDelta: number;
  startingProgressDelta: number;
  startingFrustrationDelta: number;
  encounterVariantId: string;
  guestOpeningLine?: string;
  guestProductConcern?: string;
  preferredRecommendAngles?: RecommendAngle[];
  acceptableRecommendAngles?: RecommendAngle[];
  weakRecommendAngles?: RecommendAngle[];
  resistanceLevel?: "low" | "medium" | "high";
}

export interface WineEncounterVariant {
  id: string;
  productId: string;
  guestOpeningLine: string;
  guestProductConcern?: string;
  preferredRecommendAngles: RecommendAngle[];
  acceptableRecommendAngles: RecommendAngle[];
  weakRecommendAngles: RecommendAngle[];
  resistanceLevel: "low" | "medium" | "high";
  successResponse: string;
  weakSuccessResponse: string;
  failureResponse: string;
}

export interface TableServiceScenario {
  id: string;
  guestId: string;
  review: GuestReviewProfile;
  wineCandidates: ScenarioWineCandidate[];
  variants: Record<string, WineEncounterVariant>;
  /** Second wine is allowed only after a failed wine playthrough reopens food. */
  secondWineOpportunityAllowed: boolean;
}

export interface KnownGuestInformation {
  foodChoice?: string;
  occasion?: string;
  budgetSignal?: string;
  winePreference?: string;
  mealIntent?: MealIntent;
  mealProfile?: MealProfile;
}

export interface EncounterStartModifiers {
  startingProgressDelta: number;
  startingMoodDelta: number;
  startingFrustrationDelta: number;
  maxApModifier: number;
  timeAlreadyUsedSeconds: number;
}

export interface EncounterStartContext {
  scenarioId: string;
  guestId: string;
  encounterId: string;
  greetingRoute: GreetingRoute;
  greetingRating: GreetingRating;
  knownGuestInformation: KnownGuestInformation;
  selectedWineId: string;
  selectedWineCommercialRole: WineCommercialRole;
  selectedWineMatchRating: WineMatchRating;
  wineVariantId: string;
  modifiers: EncounterStartModifiers;
  variant: WineEncounterVariant | null;
  /** Commercial role never feeds this — match rating does. */
  selectionApHint: number;
}
