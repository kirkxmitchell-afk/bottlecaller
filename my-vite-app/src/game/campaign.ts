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
];

function getCampaignTierRule(tier: number): CampaignTierRule {
  return CAMPAIGN_TIER_RULES.find((rule) => rule.tier === tier) || CAMPAIGN_TIER_RULES[0];
}

function isProductActiveForTier(product: Product, tier: number): boolean {
  return product.activeFromTier <= tier && product.activeToTier >= tier;
}

export function buildCampaignProductPool(tier: number): CampaignProductPool {
  const rule = getCampaignTierRule(tier);
  const products = getCoreCampaignProducts();
  const activeWines = products
    .filter((product) => product.category === "wine" && isProductActiveForTier(product, tier))
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, rule.activeCoreProducts);

  return {
    tier,
    products: activeWines,
    activeWineIds: activeWines.map((product) => product.id),
    activeDessertWineId: getProductsByCategory(products, "dessert_wine")[0]?.id || null,
    activeSpiritId: getProductsByCategory(products, "spirit")[0]?.id || null,
  };
}

function pairingScore(product: Product, foodOrder?: FoodOrder | null): number {
  if (!foodOrder) return 0;
  const tags = Array.isArray(product.pairingTags) ? product.pairingTags : [];
  let score = 0;
  if (tags.includes(foodOrder.dishType)) score += 3;
  if (tags.includes(foodOrder.pairingNeed)) score += 3;
  for (const tag of foodOrder.flavourProfile || []) {
    if (tags.includes(tag)) score += 1;
  }
  return score;
}

function categoryScore(product: Product, category?: ProductCategory | null): number {
  return category ? (product.category === category ? 5 : -10) : 0;
}

function angleScore(product: Product, angle?: string | null): number {
  if (angle === "flavour" && product.flavourAngle) return 2;
  if (angle === "story" && product.storyAngle) return 2;
  if (angle === "value" && product.valueAngle) return 2;
  if (angle === "confidence" && product.confidenceLine) return 2;
  return 0;
}

export function selectCampaignProduct(
  pool: CampaignProductPool,
  context: ProductSelectionContext,
): Product | null {
  const products = Array.isArray(pool.products) ? pool.products.slice() : [];
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

  return candidates
    .map((product) => ({
      product,
      score:
        pairingScore(product, context.foodOrder) +
        categoryScore(product, context.targetProductCategory) +
        angleScore(product, context.targetRecommendAngle),
    }))
    .sort((a, b) => b.score - a.score || a.product.id.localeCompare(b.product.id))[0]?.product || null;
}
