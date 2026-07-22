import test from "node:test";
import assert from "node:assert/strict";
import { getTier1VerticalSliceEncounters } from "../src/game/encounterV2";
import { applyChoice, createGameStateV2, getDifficultyPolicyV2 } from "../src/game/engineV2";
import { decideAllowedTierFromSnapshot } from "../src/game/progressionEvaluator";
import type { ProgressionSnapshot } from "../src/game/progressionRules";
import { calculateRewardValue, deriveTier } from "../src/progressionStore.js";

test("V2 difficulty settings affect gameplay pressure", () => {
  const encounter = getTier1VerticalSliceEncounters(1)[0];
  const easy = createGameStateV2(encounter, null, "easy");
  const hard = createGameStateV2(encounter, null, "hard");

  const easyResult = applyChoice(easy, { group: "ask", type: "budget" });
  const hardResult = applyChoice(hard, { group: "ask", type: "budget" });

  assert.equal(easy.difficultyMode, "easy");
  assert.equal(hard.difficultyMode, "hard");
  assert.equal(easyResult.quality, "disaster");
  assert.equal(hardResult.quality, "disaster");
  assert.ok(hardResult.frustration > easyResult.frustration);
  assert.ok(getDifficultyPolicyV2("hard").maxActions < getDifficultyPolicyV2("easy").maxActions);
});

test("reward value and local tier fallback stay aligned", () => {
  const reward = calculateRewardValue({
    activityType: "encounter",
    tier: 2,
    effectiveDifficulty: 8,
    pressureLevel: 3,
    qualityState: "mastered",
    premiumBonus: 1,
  });

  assert.equal(reward.totalPoints, 3.1);
  assert.equal(deriveTier(4), 1);
  assert.equal(deriveTier(5), 2);
  assert.equal(deriveTier(10), 2);
  assert.equal(deriveTier(12), 3);
});

test("progression evaluator allows Tier 2 after five recent encounters and Tier 3 after mastery evidence", () => {
  const tier2Snapshot: ProgressionSnapshot = {
    encountersTotal: 5,
    last10Count: 5,
    last10Greens: 3,
    last10Reds: 1,
    anyRedT2Plus: false,
    pivotsTaken: 0,
    pivotsSuccess: 0,
  };

  const tier3Snapshot: ProgressionSnapshot = {
    encountersTotal: 12,
    last10Count: 10,
    last10Greens: 8,
    last10Reds: 0,
    anyRedT2Plus: false,
    pivotsTaken: 1,
    pivotsSuccess: 1,
  };

  assert.equal(decideAllowedTierFromSnapshot(tier2Snapshot).tierToServe, 2);
  assert.equal(decideAllowedTierFromSnapshot(tier3Snapshot).tierToServe, 3);
  assert.equal(
    decideAllowedTierFromSnapshot({ ...tier3Snapshot, pivotsSuccess: 0 }).tierToServe,
    2,
  );
});
