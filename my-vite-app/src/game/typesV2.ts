export type ProductCategory =
  | "wine"
  | "dessert_wine"
  | "spirit"
  | "cocktail"
  | "beer"
  | "dish"
  | "weekly_special";

export type RecommendAngle = "flavour" | "story" | "value" | "confidence";

export type ActionGroup = "ask" | "recommend" | "commit" | "walk_away";

export type ActionType =
  | "preference"
  | "occasion"
  | "experience"
  | "budget"
  | "flavour"
  | "story"
  | "value"
  | "confidence"
  | "recommendation"
  | "assumption"
  | "celebration"
  | "walk_away";

export type EncounterOutcome =
  | "continue"
  | "premium_success"
  | "standard_success"
  | "weak_success"
  | "neutral_exit"
  | "failure"
  | "not_available";

export interface FoodOrder {
  dishName: string;
  dishType: string;
  flavourProfile: string[];
  pairingNeed: string;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  style: string;
  varietalOrBlend?: string;
  region: string;
  price: number;
  flavourAngle: string;
  storyAngle: string;
  valueAngle: string;
  confidenceLine: string;
  bestFoodPairings: string[];
  bestGuestPressures: string[];
  avoidWhen: string[];
  pairingTags: string[];
  introducedTier: number;
  activeFromTier: number;
  activeToTier: number;
  isCoreCampaignProduct?: boolean;
}

export interface CampaignTierRule {
  tier: number;
  activeCoreProducts: number;
  allowDessertWine: boolean;
  allowSpirit: boolean;
  mainServiceStages: string[];
  newlyIntroducedWeight: number;
  legacyRotationWeight: number;
}

export interface CampaignProductPool {
  tier: number;
  products: Product[];
  activeWineIds: string[];
  activeDessertWineId: string | null;
  activeSpiritId: string | null;
}

export interface ProductSelectionContext {
  tier: number;
  serviceStage: string;
  targetProductId: string | null;
  targetProductCategory: ProductCategory | null;
  targetRecommendAngle: RecommendAngle | null;
  allowedProductIds: string[];
  foodOrder: FoodOrder | null;
}

export interface EncounterChoiceCopy {
  ask: Record<string, string>;
  recommend: Record<string, string>;
  commit: Record<string, string>;
}

export interface EncounterV2 {
  id: string;
  tier: number;
  title: string;
  serviceStage: "opening" | "after_food_order" | "end_of_meal";
  family: string;
  hiddenPressure: string;
  masterProfile: string;
  variant: string;
  scene: string;
  verbalClue: string;
  visualClues: string[];
  lesson: string;
  targetProductId?: string | null;
  targetProductCategory?: ProductCategory | null;
  targetRecommendAngle?: RecommendAngle | null;
  allowedProductIds?: string[];
  foodOrder?: FoodOrder | null;
  bestPath: Array<{ group: ActionGroup; type: ActionType }>;
  choiceLines: EncounterChoiceCopy;
  choiceScores: Partial<Record<ActionGroup, Partial<Record<ActionType, number>>>>;
}

export interface HistoryEntry {
  turn: number;
  choice: string;
  quality: number;
  progressDelta: number;
  frustrationDelta: number;
  resultingProgress: number;
  resultingFrustration: number;
  reaction: string;
}

export interface GameStateV2 {
  progress: number;
  frustration: number;
  progressMood: "guarded" | "warming_up" | "engaged" | "ready";
  frustrationMood: "calm" | "guarded" | "heated" | "critical_resistance";
  walkAwayUnlocked: boolean;
  outcome: EncounterOutcome | null;
  authorityDelta: number;
  turnCount: number;
  history: HistoryEntry[];
}

export interface PlayerChoice {
  group: ActionGroup;
  type: ActionType;
}
