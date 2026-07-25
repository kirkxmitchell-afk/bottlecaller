import { getCoreCampaignProducts, getProductById, getProductsByCategory } from "./products";
import type {
  CampaignProductPool,
  CampaignTierRule,
  FoodOrder,
  Product,
  ProductCategory,
  ProductSelectionContext,
} from "./typesV2";

export const CAMPAIGN_TIER_RULES: CampaignTierRule[] = [
  {
    tier: 1,
    activeCoreProducts: 3,
    allowDessertWine: false,
    allowSpirit: false,
    mainServiceStages: ["opening"],
    newlyIntroducedWeight: 1.8,
    legacyRotationWeight: 1,
  },
  {
    tier: 2,
    activeCoreProducts: 5,
    allowDessertWine: false,
    allowSpirit: false,
    mainServiceStages: ["after_food_order"],
    newlyIntroducedWeight: 1.8,
    legacyRotationWeight: 1,
  },
  {
    tier: 3,
    activeCoreProducts: 6,
    allowDessertWine: true,
    allowSpirit: true,
    mainServiceStages: ["after_food_order", "end_of_meal"],
    newlyIntroducedWeight: 1.9,
    legacyRotationWeight: 1,
  },
  {
    tier: 4,
    activeCoreProducts: 8,
    allowDessertWine: true,
    allowSpirit: true,
    mainServiceStages: ["opening", "after_food_order", "end_of_meal"],
    newlyIntroducedWeight: 1.7,
    legacyRotationWeight: 1,
  },
  {
    tier: 5,
    activeCoreProducts: 10,
    allowDessertWine: true,
    allowSpirit: true,
    mainServiceStages: ["opening", "after_food_order", "end_of_meal"],
    newlyIntroducedWeight: 1.6,
    legacyRotationWeight: 1.05,
  },
];

export function getCampaignTierRule(tier: number): CampaignTierRule {
  return CAMPAIGN_TIER_RULES.find((rule) => rule.tier === tier) || CAMPAIGN_TIER_RULES[0];
}

export function isProductActiveForTier(product: Product, tier: number): boolean {
  return product.activeFromTier <= tier && product.activeToTier >= tier;
}

function getNewestActiveProducts(products: Product[], tier: number, count: number): Product[] {
  return products
    .filter((product) => product.category === "wine" && isProductActiveForTier(product, tier))
    .sort((a, b) => {
      if (b.introducedTier !== a.introducedTier) return b.introducedTier - a.introducedTier;
      return a.id.localeCompare(b.id);
    })
    .slice(0, count);
}

export function buildCampaignProductPool(
  tier: number,
  inventory: Product[] = getCoreCampaignProducts(),
): CampaignProductPool {
  const rule = getCampaignTierRule(tier);
  const products = Array.isArray(inventory) && inventory.length ? inventory : getCoreCampaignProducts();
  const activeWineProducts = getNewestActiveProducts(products, tier, rule.activeCoreProducts);
  const activeDessertWineId = rule.allowDessertWine
    ? getProductsByCategory(products, "dessert_wine").find((product) => isProductActiveForTier(product, tier))?.id || null
    : null;
  const activeSpiritId = rule.allowSpirit
    ? getProductsByCategory(products, "spirit").find((product) => isProductActiveForTier(product, tier))?.id || null
    : null;
  const activeIds = [
    ...activeWineProducts.map((product) => product.id),
    ...(activeDessertWineId ? [activeDessertWineId] : []),
    ...(activeSpiritId ? [activeSpiritId] : []),
  ];

  return {
    tier,
    products: products.filter((product) => activeIds.includes(product.id)),
    activeWineIds: activeWineProducts.map((product) => product.id),
    activeDessertWineId,
    activeSpiritId,
  };
}

function pairingScore(product: Product, foodOrder?: FoodOrder | null): number {
  if (!foodOrder) return 0;
  const tags = Array.isArray(product.pairingTags) ? product.pairingTags : [];
  let score = 0;
  if (tags.includes(foodOrder.dishType)) score += 3;
  for (const tag of foodOrder.flavourProfile || []) {
    if (tags.includes(tag)) score += 1;
  }
  if (tags.includes(foodOrder.pairingNeed)) score += 3;
  return score;
}

function categoryScore(product: Product, category?: ProductCategory | null): number {
  if (!category) return 0;
  return product.category === category ? 5 : -10;
}

function angleScore(product: Product, angle?: string | null): number {
  if (!angle) return 0;
  if (angle === "flavour" && product.flavourAngle) return 2;
  if (angle === "story" && product.storyAngle) return 2;
  if (angle === "value" && product.valueAngle) return 2;
  if (angle === "confidence" && product.confidenceLine) return 2;
  return 0;
}

function noveltyWeight(product: Product, tier: number, rule: CampaignTierRule): number {
  if (product.introducedTier === tier) return rule.newlyIntroducedWeight;
  return rule.legacyRotationWeight;
}

export function selectCampaignProduct(
  pool: CampaignProductPool,
  context: ProductSelectionContext,
): Product | null {
  const products = Array.isArray(pool?.products) ? pool.products.slice() : [];
  if (!products.length) return null;

  if (context.targetProductId) {
    const explicit = getProductById(products, context.targetProductId);
    if (explicit) return explicit;
  }

  let candidates = products;
  if (Array.isArray(context.allowedProductIds) && context.allowedProductIds.length) {
    const allowed = new Set(context.allowedProductIds);
    candidates = candidates.filter((product) => allowed.has(product.id));
  }

  if (context.targetProductCategory) {
    candidates = candidates.filter((product) => product.category === context.targetProductCategory);
  }

  if (!candidates.length) candidates = products;

  const rule = getCampaignTierRule(context.tier);
  return candidates
    .map((product) => ({
      product,
      score:
        pairingScore(product, context.foodOrder) +
        categoryScore(product, context.targetProductCategory) +
        angleScore(product, context.targetRecommendAngle) +
        noveltyWeight(product, context.tier, rule),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.product.id.localeCompare(b.product.id);
    })[0]?.product || null;
}
