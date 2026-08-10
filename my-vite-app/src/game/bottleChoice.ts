import { getCoreCampaignProducts, getProductById } from "./products";
import type {
  BottleChoiceResult,
  BottleFit,
  EncounterV2,
  Product,
} from "./typesV2";
import {
  matchRatingToBottleFit,
  resolveWineCandidates,
  type ScenarioWineCandidate,
  type WineCommercialRole,
} from "./guestService";

export const BOTTLE_CHOICE_SCORES: Record<BottleFit, number> = {
  ideal: 10,
  safe: 5,
  trap: -5,
};

export const BOTTLE_CHOICE_REACTIONS: Record<BottleFit, string> = {
  ideal: "Right bottle for this table.",
  safe: "Acceptable, but not the strongest fit.",
  trap: "Tempting, but wrong for this guest.",
};

export interface BottleChoiceOption {
  productId: string;
  fit: BottleFit;
  product: Product | null;
  /** Internal only — never shown on cards. */
  commercialRole?: WineCommercialRole | null;
  matchRating?: string | null;
  encounterVariantId?: string | null;
}

export interface BottleChoiceSet {
  clue: string;
  idealProductId: string;
  safeProductId: string;
  trapProductId: string;
  options: BottleChoiceOption[];
  /** Scenario id when Premium/Safe/Partner candidates drove the set. */
  scenarioId?: string | null;
  guestId?: string | null;
}

const PRODUCT_SAUVIGNON = "product_coastal_sauvignon";
const PRODUCT_CHENIN = "product_cartology_chenin";
const PRODUCT_CABERNET = "product_uva_mira_cabernet";
const PRODUCT_PINOT = "product_valmoissine_pinot_noir";
const PRODUCT_ROSE = "product_cape_rose";

const FAMILY_TRIADS: Record<string, { ideal: string; safe: string; trap: string; clue?: string }> = {
  tourist: {
    ideal: PRODUCT_SAUVIGNON,
    safe: PRODUCT_CHENIN,
    trap: PRODUCT_CABERNET,
    clue: "We want something local, fresh, and not too heavy before starters.",
  },
  discovery: {
    ideal: PRODUCT_SAUVIGNON,
    safe: PRODUCT_CHENIN,
    trap: PRODUCT_CABERNET,
    clue: "We want something local, fresh, and not too heavy before starters.",
  },
  skeptic: {
    ideal: PRODUCT_CABERNET,
    safe: PRODUCT_PINOT,
    trap: PRODUCT_SAUVIGNON,
  },
  recognition: {
    ideal: PRODUCT_CABERNET,
    safe: PRODUCT_PINOT,
    trap: PRODUCT_ROSE,
  },
  regular: {
    ideal: PRODUCT_PINOT,
    safe: PRODUCT_CHENIN,
    trap: PRODUCT_CABERNET,
  },
  reassurance: {
    ideal: PRODUCT_PINOT,
    safe: PRODUCT_CHENIN,
    trap: PRODUCT_CABERNET,
  },
  date: {
    ideal: PRODUCT_PINOT,
    safe: PRODUCT_ROSE,
    trap: PRODUCT_CABERNET,
  },
  family: {
    ideal: PRODUCT_PINOT,
    safe: PRODUCT_CHENIN,
    trap: PRODUCT_CABERNET,
  },
  celebration: {
    ideal: PRODUCT_ROSE,
    safe: PRODUCT_PINOT,
    trap: PRODUCT_CHENIN,
  },
  private_table: {
    ideal: PRODUCT_CHENIN,
    safe: PRODUCT_SAUVIGNON,
    trap: PRODUCT_CABERNET,
  },
};

function shuffleOptions<T>(items: T[]): T[] {
  const next = items.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = next[i];
    next[i] = next[j];
    next[j] = current;
  }
  return next;
}

function fallbackTriad(encounter: EncounterV2 | null | undefined): { ideal: string; safe: string; trap: string } {
  const products = getCoreCampaignProducts().filter((product) => product.bottleImage);
  const ideal =
    String(encounter?.idealProductId || encounter?.targetProductId || "").trim() ||
    products[0]?.id ||
    PRODUCT_CHENIN;
  const remaining = products.filter((product) => product.id !== ideal);
  return {
    ideal,
    safe: remaining[0]?.id || PRODUCT_PINOT,
    trap: remaining[1]?.id || PRODUCT_CABERNET,
  };
}

function buildScenarioChoiceSet(
  encounter: EncounterV2 | null | undefined,
  guestId: string,
  candidates: ScenarioWineCandidate[],
): BottleChoiceSet | null {
  if (candidates.length < 3) return null;
  const products = getCoreCampaignProducts();
  const options = shuffleOptions(
    candidates.slice(0, 3).map((candidate) => ({
      productId: candidate.productId,
      fit: matchRatingToBottleFit(candidate.matchRating),
      product: getProductById(products, candidate.productId),
      commercialRole: candidate.commercialRole,
      matchRating: candidate.matchRating,
      encounterVariantId: candidate.encounterVariantId,
    })),
  );

  const byFit = (fit: BottleFit) =>
    options.find((option) => option.fit === fit)?.productId || options[0]?.productId || "";

  return {
    clue:
      String(encounter?.bottleChoiceClue || "").trim() ||
      String(encounter?.verbalClue || "").trim() ||
      String(encounter?.contextClue || "").trim() ||
      "Read the guest, then choose the bottle that fits.",
    idealProductId: byFit("ideal"),
    safeProductId: byFit("safe"),
    trapProductId: byFit("trap"),
    options,
    scenarioId: String(encounter?.id || "").trim() || null,
    guestId,
  };
}

export function getBottleChoiceSet(
  encounter: EncounterV2 | null | undefined,
  options: { guestId?: string | null } = {},
): BottleChoiceSet {
  const guestId = String(options.guestId || "").trim();
  if (guestId) {
    const scenarioCandidates = resolveWineCandidates(guestId);
    const scenarioSet = buildScenarioChoiceSet(encounter, guestId, scenarioCandidates);
    if (scenarioSet) return scenarioSet;
  }

  const family = String(encounter?.family || "").trim().toLowerCase();
  const mapped = FAMILY_TRIADS[family] || null;
  const triad = {
    ideal: String(encounter?.idealProductId || mapped?.ideal || "").trim() || fallbackTriad(encounter).ideal,
    safe: String(encounter?.safeProductId || mapped?.safe || "").trim() || fallbackTriad(encounter).safe,
    trap: String(encounter?.trapProductId || mapped?.trap || "").trim() || fallbackTriad(encounter).trap,
  };
  const products = getCoreCampaignProducts();
  const clue =
    String(encounter?.bottleChoiceClue || "").trim() ||
    mapped?.clue ||
    String(encounter?.verbalClue || "").trim() ||
    String(encounter?.contextClue || "").trim() ||
    "Read the guest, then choose the bottle that fits.";

  const choiceOptions = shuffleOptions<BottleChoiceOption>([
    { productId: triad.ideal, fit: "ideal", product: getProductById(products, triad.ideal) },
    { productId: triad.safe, fit: "safe", product: getProductById(products, triad.safe) },
    { productId: triad.trap, fit: "trap", product: getProductById(products, triad.trap) },
  ]);

  return {
    clue,
    idealProductId: triad.ideal,
    safeProductId: triad.safe,
    trapProductId: triad.trap,
    options: choiceOptions,
    guestId: guestId || null,
  };
}

export function scoreBottleChoice(
  productId: string | null | undefined,
  choiceSet: BottleChoiceSet,
): BottleChoiceResult {
  const id = String(productId || "").trim();
  const option = choiceSet.options.find((item) => item.productId === id) || null;
  const fit: BottleFit = option?.fit || "trap";
  const matchScore =
    option?.matchRating === "strong"
      ? 10
      : option?.matchRating === "acceptable"
        ? 5
        : option?.matchRating === "risky"
          ? -2
          : option?.matchRating === "poor"
            ? -5
            : BOTTLE_CHOICE_SCORES[fit];
  return {
    productId: id,
    productName: option?.product?.name || null,
    fit,
    score: matchScore,
    reaction:
      option?.matchRating === "strong"
        ? "Strong match for this table."
        : option?.matchRating === "acceptable"
          ? "Acceptable match — explain it well."
          : option?.matchRating === "risky"
            ? "Risky match — expect resistance."
            : option?.matchRating === "poor"
              ? "Poor match — judgement cost remains even if sold."
              : BOTTLE_CHOICE_REACTIONS[fit],
  };
}
