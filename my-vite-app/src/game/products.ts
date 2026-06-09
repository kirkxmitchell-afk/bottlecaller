import type { Product } from "./typesV2";

const PRODUCTS: Product[] = [
  {
    id: "product_001",
    name: "Iona Sauvignon Blanc",
    category: "wine",
    style: "Sauvignon Blanc",
    varietalOrBlend: "Sauvignon Blanc",
    region: "Elgin",
    price: 520,
    flavourAngle: "Bright citrus, fresh herbs, and clean acidity.",
    storyAngle: "A cool-climate South African white that feels clearly local.",
    valueAngle: "Premium feel without jumping straight to the top of the list.",
    confidenceLine: "If you want something fresh and easy to trust, I would land here.",
    bestFoodPairings: ["seafood", "salad"],
    bestGuestPressures: ["local_experience", "safe_choice"],
    avoidWhen: ["big_red_expectation"],
    pairingTags: ["seafood", "fresh_food", "light_food"],
    introducedTier: 1,
    activeFromTier: 1,
    activeToTier: 5,
    isCoreCampaignProduct: true,
  },
  {
    id: "product_002",
    name: "Restless River Pinot Noir",
    category: "wine",
    style: "Pinot Noir",
    varietalOrBlend: "Pinot Noir",
    region: "Hemel-en-Aarde",
    price: 780,
    flavourAngle: "Soft red fruit, fine spice, and an elegant finish.",
    storyAngle: "A refined Cape pinot that feels thoughtful rather than heavy.",
    valueAngle: "A polished step-up when the table wants elegance.",
    confidenceLine: "If the table wants something graceful and quietly impressive, this works.",
    bestFoodPairings: ["duck", "mushroom", "chicken"],
    bestGuestPressures: ["romantic_table", "refined_choice"],
    avoidWhen: ["wants_big_structured_red"],
    pairingTags: ["duck", "mushroom", "light_red_meat"],
    introducedTier: 1,
    activeFromTier: 1,
    activeToTier: 5,
    isCoreCampaignProduct: true,
  },
  {
    id: "product_003",
    name: "Badenhorst Secateurs Red",
    category: "wine",
    style: "Cape Red Blend",
    varietalOrBlend: "Shiraz Blend",
    region: "Swartland",
    price: 440,
    flavourAngle: "Juicy dark fruit, soft spice, and easy warmth.",
    storyAngle: "A modern Cape red with broad appeal and character.",
    valueAngle: "One of the safest value reds when the table wants a smart spend.",
    confidenceLine: "If you want a red that lands for a lot of guests, this is a safe call.",
    bestFoodPairings: ["burger", "lamb", "chargrill"],
    bestGuestPressures: ["smart_spend", "group_table"],
    avoidWhen: ["wants_ultra_fine_pinot"],
    pairingTags: ["red_meat", "charred", "rich_food"],
    introducedTier: 1,
    activeFromTier: 1,
    activeToTier: 5,
    isCoreCampaignProduct: true,
  },
];

export function getCoreCampaignProducts(): Product[] {
  return PRODUCTS.slice();
}

export function getProductsByCategory(products: Product[], category: Product["category"]): Product[] {
  return (Array.isArray(products) ? products : []).filter((product) => product.category === category);
}

export function getProductById(products: Product[], productId: string | null | undefined): Product | null {
  if (!productId) return null;
  return (Array.isArray(products) ? products : []).find((product) => product.id === productId) || null;
}
