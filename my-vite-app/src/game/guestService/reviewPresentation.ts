import type { GuestReviewProfile, MealCertainty, MealIntent } from "./types";

export function mealHeadingForCertainty(certainty: MealCertainty | null | undefined): string {
  if (certainty === "confirmed") return "ORDERING";
  if (certainty === "considering") return "CONSIDERING MEAL";
  return "LIKELY MEAL";
}

export function getMealIntentForReview(
  review: GuestReviewProfile | null | undefined,
): MealIntent | null {
  const dish = String(review?.mealIntent?.dish || review?.knownFoodIntent || "").trim();
  if (!dish) return null;
  return {
    dish,
    description: String(review?.mealIntent?.description || "").trim() || undefined,
    certainty: review?.mealIntent?.certainty || "likely",
  };
}

/** Player-facing review copy. Never names a wine, greeting, or "correct" bottle. */
export function formatGuestReviewCard(
  review: GuestReviewProfile | null | undefined,
): {
  contextLine: string;
  paceLine: string;
  mealHeading: string;
  mealDish: string;
  mealDetail: string;
  body: string;
} {
  const meal = getMealIntentForReview(review);
  const contextLine = String(review?.reviewContext || "").trim();
  const mealHeading = meal ? mealHeadingForCertainty(meal.certainty) : "";
  const mealDish = meal?.dish || "";
  // Keep meal detail short — sauce/side already lives in the dish line when possible.
  const mealDetail = "";
  const lines = [contextLine].filter(Boolean);
  if (meal) {
    lines.push("", mealHeading, mealDish);
  }
  return {
    contextLine,
    paceLine: "",
    mealHeading,
    mealDish,
    mealDetail,
    body: lines.join("\n"),
  };
}

export function formatGuestReviewMealLine(
  review: GuestReviewProfile | null | undefined,
): string {
  const card = formatGuestReviewCard(review);
  if (!card.mealDish) return "";
  return [card.mealHeading, card.mealDish].filter(Boolean).join(" — ");
}
