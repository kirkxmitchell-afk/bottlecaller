import test from "node:test";
import assert from "node:assert/strict";
import { getTier1VerticalSliceEncounters } from "../src/game/encounterV2";
import {
  applyChoice,
  createGameStateV2,
  getDifficultyPolicyV2,
  walkAway,
} from "../src/game/engineV2";
import { decideAllowedTierFromSnapshot } from "../src/game/progressionEvaluator";
import type { ProgressionSnapshot } from "../src/game/progressionRules";
import { calculateRewardValue, deriveTier } from "../src/progressionStore.js";
import {
  getWalkAwayMistakeThreshold,
  mergeV2ProgressionAuthorityStates,
  resolveCanonicalWriteState,
  shouldPreferAuthoritativeV2Authority,
  shouldSubmitV2ProgressReportGate,
  splitProgressReportScoring,
  V2_AP_TIER_UNLOCKS,
  V2_RULES_TIER_UNLOCKS,
} from "../src/game/v2ProgressionAuthority";
import {
  buildV2EconomyEvidence,
  createPlayerAuthoritySnapshot,
  PLAYER_SKILL_UNLOCKS,
  resolveGuestGreetingAccess,
} from "../src/game/playerAuthorityContract";
import {
  getEncounterMoodImageV3,
  resolveEncounterMoodV3,
} from "../src/game/encounterV3";
import { evaluateObjectPath } from "../src/game/guestProfiles";

test("V2 vertical slice uses the configured five-encounter demo order", () => {
  const demoEncounters = getTier1VerticalSliceEncounters();

  assert.equal(demoEncounters.length, 5);
  assert.deepEqual(demoEncounters.map((encounter) => encounter.id), [
    "encounter_v2_014",
    "encounter_v2_013",
    "encounter_v2_011",
    "encounter_v2_015",
    "encounter_v2_016",
  ]);
  assert.equal(getTier1VerticalSliceEncounters(16).length, 16);
  assert.equal(getTier1VerticalSliceEncounters(16).at(-1)?.id, "encounter_v2_016");
});

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

test("V3 mood ladder is deterministic and keeps friction authoritative", () => {
  assert.equal(resolveEncounterMoodV3({ progress: 0 }), "neutral");
  assert.equal(resolveEncounterMoodV3({ progress: 2 }), "mild_interest");
  assert.equal(resolveEncounterMoodV3({ progress: 3 }), "mild_interest");
  assert.equal(resolveEncounterMoodV3({ progress: 5 }), "engaged");
  assert.equal(resolveEncounterMoodV3({ progress: 7 }), "very_engaged");
  assert.equal(resolveEncounterMoodV3({ progress: 9 }), "ready_to_buy");
  assert.equal(resolveEncounterMoodV3({ progress: 9, lastQuality: "poor" }), "confused");
  assert.equal(resolveEncounterMoodV3({ progress: 9, frustration: 2 }), "slightly_annoyed");
  assert.equal(resolveEncounterMoodV3({ progress: 9, lastQuality: "disaster" }), "annoyed");
  assert.equal(
    resolveEncounterMoodV3({ progress: 9, frustration: 3, difficultyMode: "hard" }),
    "furious",
  );
  assert.equal(
    resolveEncounterMoodV3({ progress: 8, difficultyMode: "easy" }),
    "ready_to_buy",
  );
});

test("V3 image lookup uses exact mood art and legacy seven-frame fallbacks", () => {
  assert.equal(
    getEncounterMoodImageV3(
      {
        schema: "v3",
        mainNeutral: "/neutral.png",
        mainPositive: "/positive.png",
        mainNegative: "/negative.png",
        moods: { engaged: "/exact-engaged.png" },
      },
      "engaged",
    ),
    "/exact-engaged.png",
  );
  assert.equal(
    getEncounterMoodImageV3(
      {
        schema: "v3",
        mainNeutral: "/neutral.png",
        mainPositive: "/positive.png",
        mainNegative: "/negative.png",
      },
      "furious",
    ),
    "/negative.png",
  );
});

test("the five Godot-linked demo guests are V3 visual-state enabled", () => {
  const demoEncounters = getTier1VerticalSliceEncounters();
  const expectedMoods = [
    "confused",
    "slightly_annoyed",
    "annoyed",
    "furious",
    "neutral",
    "mild_interest",
    "engaged",
    "very_engaged",
    "ready_to_buy",
  ];

  for (const encounter of demoEncounters) {
    assert.equal(encounter.images?.schema, "v3");
    assert.deepEqual(Object.keys(encounter.images?.moods || {}).sort(), [...expectedMoods].sort());
  }

  for (const id of [
    "encounter_v2_011",
    "encounter_v2_013",
    "encounter_v2_014",
    "encounter_v2_015",
    "encounter_v2_016",
  ]) {
    const encounter = demoEncounters.find((item) => item.id === id);
    assert.equal(new Set(Object.values(encounter?.images?.moods || {})).size, 9);
    assert.match(String(encounter?.images?.previewArt || ""), /\/v3\/preview-art\.png$/);
  }

  const dontGuess = demoEncounters.find((item) => item.id === "encounter_v2_015");
  assert.equal(dontGuess?.images?.moods?.neutral, dontGuess?.images?.previewArt);
  assert.equal(dontGuess?.images?.mainNeutral, dontGuess?.images?.previewArt);
});

test("medium walk-away unlock stays at 3 mistakes", () => {
  const encounter = getTier1VerticalSliceEncounters(1)[0];
  const medium = createGameStateV2(encounter, null, "medium");
  medium.mistakeCount = 3;
  medium.frustration = 0;

  assert.equal(getWalkAwayMistakeThreshold(getDifficultyPolicyV2("medium").maxMistakes), 3);
  assert.equal(walkAway(medium).outcome, "neutral_exit");
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
  assert.equal(V2_RULES_TIER_UNLOCKS[2].minEncountersTotal, 5);
  assert.equal(V2_RULES_TIER_UNLOCKS[3].minEncountersTotal, 12);
  assert.equal(V2_AP_TIER_UNLOCKS[2], 180);
  assert.equal(V2_AP_TIER_UNLOCKS[3], 500);
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

test("hydrate prefers merge and never replaces richer local attempts with AP-only server payloads", () => {
  const local = {
    totalAP: 100,
    updatedAt: 100,
    attempts: [
      { key: "a1", completedAt: 1, isGreen: true, tier: 1 },
      { key: "a2", completedAt: 2, isGreen: true, tier: 1 },
      { key: "a3", completedAt: 3, isRed: true, tier: 1 },
      { key: "a4", completedAt: 4, isGreen: true, tier: 1 },
      { key: "a5", completedAt: 5, isGreen: true, tier: 1 },
    ],
    progressionSnapshot: { encountersTotal: 5, last10Count: 5, last10Greens: 4, last10Reds: 1, anyRedT2Plus: false, pivotsTaken: 0, pivotsSuccess: 0 },
    tierToServe: 1,
    apTierUnlocked: 1,
    rulesTierToServe: 1,
  };
  const authoritative = {
    totalAP: 180,
    updatedAt: 999,
    attempts: [],
    progressionSnapshot: { encountersTotal: 5, last10Count: 5, last10Greens: 4, last10Reds: 1, anyRedT2Plus: false, pivotsTaken: 0, pivotsSuccess: 0 },
    tierToServe: 2,
    apTierUnlocked: 2,
    rulesTierToServe: 1,
  };

  assert.equal(shouldPreferAuthoritativeV2Authority(authoritative, local), false);
  const merged = mergeV2ProgressionAuthorityStates(authoritative, local);
  assert.equal(merged.attempts.length, 5);
  assert.ok(merged.attempts.some((item) => item.key === "a5"));
  assert.equal(merged.totalAP, 100);
});

test("canonical upsert merges attempts and keeps server base when client basedOn is stale", () => {
  const serverRow = {
    updated_at: new Date(2_000).toISOString(),
    canonical_state: {
      capturedAt: 1_500,
      economy: { points: 2, authorityPoints: 40, ap: 40, tier: 1 },
      authority: {
        totalAP: 40,
        tierToServe: 1,
        apTierUnlocked: 1,
        rulesTierToServe: 1,
        attempts: [{ key: "s1", completedAt: 1, isGreen: true, tier: 1 }],
        progressionSnapshot: { encountersTotal: 1, last10Count: 1, last10Greens: 1, last10Reds: 0, anyRedT2Plus: false, pivotsTaken: 0, pivotsSuccess: 0 },
      },
      v2: {
        authority: {
          totalAP: 40,
          tierToServe: 1,
          apTierUnlocked: 1,
          rulesTierToServe: 1,
          attempts: [{ key: "s1", completedAt: 1, isGreen: true, tier: 1 }],
          progressionSnapshot: { encountersTotal: 1, last10Count: 1, last10Greens: 1, last10Reds: 0, anyRedT2Plus: false, pivotsTaken: 0, pivotsSuccess: 0 },
        },
      },
    },
  };

  const incoming = {
    basedOnUpdatedAt: 1_000,
    capturedAt: 3_000,
    economy: { points: 2, authorityPoints: 60, ap: 60, tier: 1 },
    authority: {
      totalAP: 60,
      tierToServe: 1,
      apTierUnlocked: 1,
      rulesTierToServe: 1,
      attempts: [{ key: "c1", completedAt: 2, isGreen: true, tier: 1 }],
      progressionSnapshot: { encountersTotal: 1, last10Count: 1, last10Greens: 1, last10Reds: 0, anyRedT2Plus: false, pivotsTaken: 0, pivotsSuccess: 0 },
    },
    v2: {
      authority: {
        totalAP: 60,
        tierToServe: 1,
        apTierUnlocked: 1,
        rulesTierToServe: 1,
        attempts: [{ key: "c1", completedAt: 2, isGreen: true, tier: 1 }],
        progressionSnapshot: { encountersTotal: 1, last10Count: 1, last10Greens: 1, last10Reds: 0, anyRedT2Plus: false, pivotsTaken: 0, pivotsSuccess: 0 },
      },
    },
  };

  const result = resolveCanonicalWriteState({ serverRow, incomingState: incoming });
  assert.equal(result.rejectedStale, true);
  assert.equal(result.merged, true);
  assert.equal(result.state.v2.authority.attempts.length, 2);
  assert.ok(result.state.v2.authority.attempts.some((item: any) => item.key === "s1"));
  assert.ok(result.state.v2.authority.attempts.some((item: any) => item.key === "c1"));
});

test("demo mode does not submit premium V2 progress reports", () => {
  assert.equal(
    shouldSubmitV2ProgressReportGate({
      isDemo: true,
      bcMode: "demo",
      isIframe: true,
      ctx: { userId: "u1", restaurantId: "r1", role: "waiter" },
    }),
    false,
  );
  assert.equal(
    shouldSubmitV2ProgressReportGate({
      isDemo: false,
      bcMode: "premium",
      isIframe: true,
      ctx: { userId: "u1", restaurantId: "r1", role: "waiter" },
    }),
    true,
  );
});

test("progress report payload keeps skill score separate from progression authority", () => {
  const split = splitProgressReportScoring({
    skills: { read: 70, framing: 65, delivery: 80, recovery: 55, closing: 90 },
    progressionState: {
      economy: { authorityPoints: 120, ap: 120, points: 4 },
      v2: { authority: { totalAP: 120, tierToServe: 1 } },
    },
    v2Snapshot: { bottleRewards: { totalAP: 120 } },
  });

  assert.equal(split.hasSkillScore, true);
  assert.equal(split.hasProgressionAuthority, true);
  assert.equal(split.skills?.delivery, 80);
  assert.equal(split.authorityPoints, 120);
  assert.notEqual(split.skills?.delivery, split.authorityPoints);
});

test("player authority contract keeps AP, measured skills, unlocks, and Godot coins separate", () => {
  const snapshot = createPlayerAuthoritySnapshot({
    authorityPoints: 240,
    tierToServe: 2,
    apTierUnlocked: 2,
    rulesTierToServe: 2,
    unlockedSkillIds: [PLAYER_SKILL_UNLOCKS.FOOD_RECOVERY],
    skillMeasurements: { read: 81, delivery: 73 },
    godotCoins: 47,
  });

  assert.equal(snapshot.progression.authorityPoints, 240);
  assert.equal(snapshot.progression.tierToServe, 2);
  assert.deepEqual(snapshot.skills.unlockedSkillIds, [
    PLAYER_SKILL_UNLOCKS.FOOD_RECOVERY,
  ]);
  assert.equal(snapshot.skills.measurements.read, 81);
  assert.equal(snapshot.economy.godotCoins, 47);
  assert.equal(snapshot.economy.owner, "godot_shift");
});

test("guest greeting access uses guest type plus tier and explicit unlock authority", () => {
  const lockedFood = resolveGuestGreetingAccess({
    guestType: "skeptic",
    greeting: "food",
    profileTier: 2,
    unlockedSkillIds: [],
  });
  const recoveredFood = resolveGuestGreetingAccess({
    guestType: "skeptic",
    greeting: "food",
    profileTier: 2,
    unlockedSkillIds: [PLAYER_SKILL_UNLOCKS.FOOD_RECOVERY],
  });
  const wine = resolveGuestGreetingAccess({
    guestType: "skeptic",
    greeting: "wine",
    profileTier: 1,
    unlockedSkillIds: [],
  });

  assert.equal(lockedFood.accepted, false);
  assert.deepEqual(lockedFood.allowedOffers, []);
  assert.equal(recoveredFood.recovered, true);
  assert.deepEqual(recoveredFood.allowedOffers, ["food"]);
  assert.deepEqual(wine.allowedOffers, ["wine"]);
});

test("walking away after an aperitif rejection does not consume another greeting attempt", () => {
  const deferred = evaluateObjectPath("greet_aperitif", "walk_away");
  const converted = evaluateObjectPath("greet_aperitif", "offer_food");

  assert.equal(deferred.objectSuccess, false);
  assert.equal(deferred.aperitifOpportunityUsed, false);
  assert.equal(converted.objectSuccess, true);
  assert.equal(converted.aperitifOpportunityUsed, true);
});

test("V2 sends economy evidence but never calculates a Godot coin amount", () => {
  const evidence = buildV2EconomyEvidence({
    resultId: "result-1",
    outcome: "premium_success",
    wineSold: true,
    progress: 10,
    frustration: 0,
    mistakes: 0,
    actionCount: 4,
    turn: 4,
  });

  assert.equal(evidence.coinAuthority, "godot_shift");
  assert.equal(evidence.outcome, "premium_success");
  assert.equal(Object.hasOwn(evidence, "coins"), false);
  assert.equal(Object.hasOwn(evidence, "coinReward"), false);
});

test("Godot guests map 1:1 onto the V2 demo encounter order", async () => {
  const {
    GODOT_GUEST_ORDER,
    V2_DEMO_ENCOUNTER_ORDER,
    resolveV2EncounterIdFromGodotGuest,
  } = await import("../src/game/godotShiftBridge");

  assert.equal(GODOT_GUEST_ORDER.length, 5);
  assert.deepEqual(
    GODOT_GUEST_ORDER.map((guestId, guestIndex) =>
      resolveV2EncounterIdFromGodotGuest({ guestId, guestIndex }),
    ),
    [...V2_DEMO_ENCOUNTER_ORDER],
  );
  assert.equal(
    resolveV2EncounterIdFromGodotGuest({ guestId: "blonde_date" }),
    "encounter_v2_014",
  );
});

test("v2.1 composition: party shape explicit + inferred, type lanes differ", async () => {
  const {
    GUEST_PROFILES,
    inferPartyShapeFromArt,
    resolvePartyShape,
  } = await import("../src/game/guestProfiles");
  const {
    composeGuestV21,
    TYPE_OPTIMAL_LANES,
  } = await import("../src/game/guestCompositionV21");
  const { startRuntimeV2Session } = await import("../src/game/runtimeV2");
  const { evaluateChoice } = await import("../src/game/engineV2");

  assert.equal(GUEST_PROFILES.blonde_date.partyShape, "couple");
  assert.equal(GUEST_PROFILES.african_older_gentleman.partyShape, "single");
  assert.equal(inferPartyShapeFromArt({ depiction: "African regular couple" }), "couple");
  assert.equal(inferPartyShapeFromArt({ guestId: "skeptic_reader" }), "single");
  assert.equal(
    resolvePartyShape({ explicit: "couple", depiction: "solo gentleman" }),
    "couple",
  );

  assert.notDeepEqual(TYPE_OPTIMAL_LANES.tourist, TYPE_OPTIMAL_LANES.regular);
  assert.notDeepEqual(TYPE_OPTIMAL_LANES.tourist, TYPE_OPTIMAL_LANES.skeptic);

  const tourist = composeGuestV21("blonde_date");
  assert.equal(tourist?.partyShape, "couple");
  assert.match(String(tourist?.depiction || ""), /^Couple table\./);

  const singleRegular = composeGuestV21("african_older_gentleman");
  assert.equal(singleRegular?.partyShape, "single");

  const touristSession = startRuntimeV2Session({
    encounterId: "encounter_v2_014",
    guestId: "blonde_date",
  });
  const regularSession = startRuntimeV2Session({
    encounterId: "encounter_v2_013",
    guestId: "african_older_gentleman",
  });
  const skepticSession = startRuntimeV2Session({
    encounterId: "encounter_v2_011",
    guestId: "skeptic_reader",
  });

  const path = { group: "recommend", type: "flavour" };
  const touristFlavour = evaluateChoice(touristSession.encounter, path).quality;
  const regularFlavour = evaluateChoice(regularSession.encounter, path).quality;
  const skepticFlavour = evaluateChoice(skepticSession.encounter, path).quality;

  assert.equal(regularFlavour, "optimal");
  assert.notEqual(touristFlavour, "optimal");
  assert.notEqual(skepticFlavour, "optimal");

  assert.match(String(touristSession.encounter.verbalClue || ""), /us|we|two/i);
  assert.equal(touristSession.composition?.version, "v2.1");
  assert.equal(touristSession.composition?.partyShape, "couple");
  assert.equal(regularSession.composition?.partyShape, "single");
});
