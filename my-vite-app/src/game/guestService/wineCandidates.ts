import type {
  ScenarioWineCandidate,
  TableServiceScenario,
  WineCommercialRole,
  WineMatchRating,
  WineEncounterVariant,
} from "./types";
import { getProductById, getCoreCampaignProducts } from "../products";
import { getScenarioForGuest } from "./scenarios";

/** Match rating drives selection AP — never commercial role. */
export const MATCH_RATING_SELECTION_AP: Record<WineMatchRating, number> = {
  strong: 10,
  acceptable: 5,
  risky: -2,
  poor: -5,
};

/**
 * Map match rating onto legacy BottleFit labels used by the existing scorer.
 * Commercial role stays separate and must not feed this mapping.
 */
export function matchRatingToBottleFit(
  rating: WineMatchRating,
): "ideal" | "safe" | "trap" {
  if (rating === "strong") return "ideal";
  if (rating === "acceptable") return "safe";
  return "trap";
}

export function resolveWineCandidates(
  guestId: string | null | undefined,
): ScenarioWineCandidate[] {
  const scenario = getScenarioForGuest(guestId);
  if (!scenario) return [];
  return resolveScenarioWineCandidates(scenario);
}

export function resolveScenarioWineCandidates(
  scenario: TableServiceScenario,
): ScenarioWineCandidate[] {
  const products = getCoreCampaignProducts();
  const resolved: ScenarioWineCandidate[] = [];
  const usedRoles = new Set<WineCommercialRole>();

  for (const candidate of scenario.wineCandidates) {
    const product = getProductById(products, candidate.productId);
    if (!product) continue;
    resolved.push({ ...candidate });
    usedRoles.add(candidate.commercialRole);
  }

  // Partner missing → substitute another catalogue wine without favouring it.
  if (!usedRoles.has("partner") && resolved.length < 3) {
    const usedIds = new Set(resolved.map((item) => item.productId));
    const fallback = products.find(
      (product) =>
        product.category === "wine" &&
        !usedIds.has(product.id) &&
        product.bottleImage,
    );
    if (fallback) {
      resolved.push({
        productId: fallback.id,
        commercialRole: "partner",
        matchRating: "acceptable",
        foodCompatibility: "acceptable",
        guestCompatibility: "acceptable",
        priceCompatibility: "strong",
        maxApModifier: 0,
        startingMoodDelta: 0,
        startingProgressDelta: 0,
        startingFrustrationDelta: 0,
        encounterVariantId: `${scenario.id}_partner_fallback`,
        guestOpeningLine: "We do not know that producer. What is the wine like?",
        preferredRecommendAngles: ["story", "flavour"],
        resistanceLevel: "medium",
      });
    }
  }

  return resolved.slice(0, 3);
}

export function getWineCandidate(
  guestId: string | null | undefined,
  productId: string | null | undefined,
): ScenarioWineCandidate | null {
  const id = String(productId || "").trim();
  if (!id) return null;
  return resolveWineCandidates(guestId).find((item) => item.productId === id) || null;
}

export function getWineVariant(
  scenario: TableServiceScenario | null | undefined,
  candidate: ScenarioWineCandidate | null | undefined,
): WineEncounterVariant | null {
  if (!scenario || !candidate) return null;
  const fromMap = scenario.variants[candidate.encounterVariantId];
  if (fromMap) return fromMap;
  return {
    id: candidate.encounterVariantId,
    productId: candidate.productId,
    guestOpeningLine:
      candidate.guestOpeningLine ||
      "Tell us why this bottle belongs with us.",
    guestProductConcern: candidate.guestProductConcern,
    preferredRecommendAngles: candidate.preferredRecommendAngles || ["flavour"],
    acceptableRecommendAngles: candidate.acceptableRecommendAngles || [
      "flavour",
      "confidence",
    ],
    weakRecommendAngles: candidate.weakRecommendAngles || ["value"],
    resistanceLevel: candidate.resistanceLevel || "medium",
    successResponse: "That works for us.",
    weakSuccessResponse: "Alright — we will take it.",
    failureResponse: "Not this bottle.",
  };
}

/** Partner commercial role must never alter scoring. */
export function commercialRoleAffectsScoring(_role: WineCommercialRole): boolean {
  return false;
}
