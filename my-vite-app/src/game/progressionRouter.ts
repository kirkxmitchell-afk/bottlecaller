// src/game/progressionRouter.ts
import { BCProgressionGuard, type Tier } from "./progressionGuards";
import { buildProgressionInputs } from "./progressionState";

export async function decideAllowedTier(params: {
  userId: string;
  restaurantId: string;
  desiredTier: Tier;
  allowedTiers?: Tier[];
  attemptedPromotion?: Tier | null;
}) {
  const allowedTiers = params.allowedTiers ?? [1, 2, 3];

  const { state, win } = await buildProgressionInputs({
    userId: params.userId,
    restaurantId: params.restaurantId,
  });

  const guard = BCProgressionGuard.enforce(state, win, {
    allowedTiers,
    requestedEncounterTier: params.desiredTier,
    nextTier: params.attemptedPromotion ?? undefined,
  });

  return {
    tierToServe: (guard.decision.requestedEncounterTier ?? params.desiredTier) as Tier,
    promotionGranted: (guard.decision.nextTier ?? null) as Tier | null,
    reasons: guard.reasons,
    state,
    win,
  };
}
