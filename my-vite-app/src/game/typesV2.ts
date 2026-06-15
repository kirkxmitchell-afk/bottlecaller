export type ProductCategory =
  | "wine"
  | "dessert_wine"
  | "spirit"
  | "cocktail"
  | "beer"
  | "dish"
  | "weekly_special";

export type RecommendAngle =
  | "flavour"
  | "story"
  | "value"
  | "confidence";

export type ActionGroup =
  | "ask"
  | "recommend"
  | "commit"
  | "walk_away";

export type AskType =
  | "preference"
  | "occasion"
  | "experience"
  | "budget";

export type CommitType =
  | "recommendation"
  | "assumption"
  | "celebration"
  | "value";

export type ActionType = AskType | RecommendAngle | CommitType | "walk_away";

export type ChoiceQuality =
  | "optimal"
  | "good"
  | "poor"
  | "disaster";

export type MasterProfileId =
  | "discovery"
  | "reassurance"
  | "recognition"
  | "momentum";

export type VariantId =
  | "smart_value"
  | "comfort"
  | "privacy"
  | "celebration"
  | "decision_hierarchy"
  | "expertise"
  | "emotional_status";

export type ServiceStage =
  | "opening"
  | "after_food_order"
  | "end_of_meal";

export type PairingNeed =
  | "structured_red"
  | "bright_white"
  | "rich_white"
  | "dessert_pair"
  | "digestif"
  | "flex";

export type EncounterOutcome =
  | "premium_success"
  | "standard_success"
  | "weak_success"
  | "neutral_exit"
  | "failure"
  | "continue"
  | "not_available";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  style: string;
  varietalOrBlend: string;
  region: string;
  price: number;
  flavourAngle: string;
  storyAngle: string;
  valueAngle: string;
  confidenceLine: string;
  bestFoodPairings: string[];
  bestGuestPressures: string[];
  avoidWhen: string[];
  pairingTags?: string[];
  introducedTier: number;
  activeFromTier: number;
  activeToTier: number;
  isCoreCampaignProduct: boolean;
  recommendLines?: Record<RecommendAngle, string>;
}

export interface FoodOrder {
  dishName: string;
  dishType: string;
  flavourProfile: string[];
  pairingNeed: PairingNeed;
}

export interface EncounterRewards {
  premiumSuccess: number;
  standardSuccess: number;
  weakSuccess: number;
  neutralExit: number;
  failure: number;
}

export interface EncounterChoiceLines {
  ask: Record<AskType, string>;
  recommend: Record<RecommendAngle, string>;
  commit: Record<CommitType, string>;
}

export interface EncounterReactionMap {
  ask?: Partial<Record<AskType, Partial<Record<ChoiceQuality, string>>>>;
  recommend?: Partial<Record<RecommendAngle, Partial<Record<ChoiceQuality, string>>>>;
  commit?: Partial<Record<CommitType, Partial<Record<ChoiceQuality, string>>>>;
}

export interface GuestResponse {
  text: string;
  quality?: ChoiceQuality;
}

export interface EncounterGuestResponseMap {
  ask?: Partial<Record<AskType, GuestResponse>>;
  recommend?: Partial<Record<RecommendAngle, GuestResponse>>;
  commit?: Partial<Record<CommitType, GuestResponse>>;
}

export interface EncounterV2 {
  id: string;
  title: string;
  tier: number;
  difficulty: "easy" | "medium" | "hard";
  family: string;
  modifier: string;
  hiddenPressure: string;
  masterProfile: MasterProfileId;
  variant: VariantId | null;
  startingProgress: number;
  startingFrustration: number;
  idealRhythm: ActionGroup[];
  scene: string;
  visualClues: string[];
  verbalClue: string;
  contextClue: string;
  redHerring: string;
  lesson: string;
  rewards: EncounterRewards;
  choiceLines: EncounterChoiceLines;
  guestReactions: EncounterReactionMap;
  guestResponses?: EncounterGuestResponseMap;
  serviceStage: ServiceStage;
  foodOrder?: FoodOrder | null;
  targetProductId?: string | null;
  targetProductCategory?: ProductCategory | null;
  targetRecommendAngle?: RecommendAngle | null;
  recommendScoring?: Partial<Record<RecommendAngle, ChoiceQuality>>;
  allowedProductIds?: string[];
}

export interface QualityEffect {
  progress: number;
  frustration: number;
}

export interface QualityMatrix {
  ask: Record<AskType, ChoiceQuality>;
  recommend: Record<RecommendAngle, ChoiceQuality>;
  commit: Record<CommitType, ChoiceQuality>;
}

export interface MasterProfile {
  id: MasterProfileId;
  coreNeed: string;
  appliesTo: string[];
  matrix: QualityMatrix;
}

export interface VariantDefinition {
  id: VariantId;
  matrix: Partial<QualityMatrix>;
}

export interface CampaignTierRule {
  tier: number;
  activeCoreProducts: number;
  allowDessertWine: boolean;
  allowSpirit: boolean;
  mainServiceStages: ServiceStage[];
  newlyIntroducedWeight: number;
  legacyRotationWeight: number;
}

export interface ProductSelectionContext {
  tier: number;
  serviceStage: ServiceStage;
  targetProductId?: string | null;
  targetProductCategory?: ProductCategory | null;
  targetRecommendAngle?: RecommendAngle | null;
  allowedProductIds?: string[];
  foodOrder?: FoodOrder | null;
}

export interface CampaignProductPool {
  tier: number;
  products: Product[];
  activeWineIds: string[];
  activeDessertWineId?: string | null;
  activeSpiritId?: string | null;
}

export interface PlayerChoice {
  group: ActionGroup;
  type: ActionType;
}

export interface TurnHistoryItem {
  turn: number;
  choice: PlayerChoice;
  quality: ChoiceQuality;
  progressDelta: number;
  frustrationDelta: number;
  resultingProgress: number;
  resultingFrustration: number;
  mistakeDelta: number;
  resultingMistakeCount: number;
  reaction: string;
}

export interface GameStateV2 {
  encounter: EncounterV2;
  product: Product | null;
  progress: number;
  frustration: number;
  progressMood: "guarded" | "warming_up" | "engaged" | "ready";
  frustrationMood: "normal" | "resistant" | "critical_resistance";
  walkAwayUnlocked: boolean;
  mistakeCount: number;
  outcome: EncounterOutcome | null;
  authorityDelta: number;
  turnCount: number;
  history: TurnHistoryItem[];
  usedChoiceKeys: string[];
}

export interface ChoiceEvaluationResult {
  quality: ChoiceQuality;
  progressDelta: number;
  frustrationDelta: number;
  mistakeDelta: number;
}

export interface ApplyChoiceResult extends ChoiceEvaluationResult {
  progress: number;
  frustration: number;
  mistakeCount: number;
  progressMood: GameStateV2["progressMood"];
  frustrationMood: GameStateV2["frustrationMood"];
  walkAwayUnlocked: boolean;
  outcome: EncounterOutcome;
}
