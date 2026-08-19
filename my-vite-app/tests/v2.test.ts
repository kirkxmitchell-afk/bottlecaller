import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  mergeBottleRewardStates,
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
import {
  applySkillBankUpdate,
  outcomeBiasForSkillBank,
  SKILL_BANK_LEARNING_RATE,
} from "../src/game/skillBank";
import { evaluateObjectPath, evaluateOfferAccess } from "../src/game/guestProfiles";

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

test("V2 success quality awards 20, 15, or 10 authority points", () => {
  for (const encounter of getTier1VerticalSliceEncounters(16)) {
    assert.equal(encounter.rewards?.premiumSuccess, 20, encounter.id);
    assert.equal(encounter.rewards?.standardSuccess, 15, encounter.id);
    assert.equal(encounter.rewards?.weakSuccess, 10, encounter.id);
  }
});

test("browser V2 reward mapping matches the encounter authority contract", () => {
  const gameHtml = readFileSync(resolve(process.cwd(), "game/game.html"), "utf8");

  assert.match(gameHtml, /case "premium_success": return 20;/);
  assert.match(gameHtml, /case "standard_success": return 15;/);
  assert.match(gameHtml, /case "weak_success": return 10;/);
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
  assert.equal(
    resolveEncounterMoodV3({ progress: 0, frustration: 3, mistakeCount: 3, difficultyMode: "medium" }),
    "annoyed",
  );
  assert.equal(
    resolveEncounterMoodV3({ progress: 0, frustration: 4, mistakeCount: 4, difficultyMode: "medium" }),
    "furious",
  );
});

test("V2 recommendation scoring is the authority for response quality", () => {
  for (const encounter of getTier1VerticalSliceEncounters()) {
    for (const [angle, quality] of Object.entries(encounter.recommendScoring || {})) {
      assert.equal(
        encounter.guestResponses?.recommend?.[angle as keyof typeof encounter.guestResponses.recommend]?.quality,
        quality,
        `${encounter.id}:${angle}`,
      );
    }
  }
});

test("the five demo encounters use their authored ideal-path reactions", () => {
  const expectedPaths = {
    encounter_v2_014: {
      ask: "experience",
      askReaction: "Not much. We want your help finding something local that still feels easy tonight.",
      recommend: "story",
      recommendReaction: "That gives the night a sense of place without making the bottle too serious.",
      commitReaction: "Yes, that feels right for us.",
    },
    encounter_v2_013: {
      ask: "preference",
      askReaction: "Exactly. You remember the style.",
      recommend: "flavour",
      recommendReaction: "That sounds right. Familiar, but not lazy.",
      commitReaction: "Yes. That is the kind of bottle I meant.",
    },
    encounter_v2_011: {
      ask: "preference",
      askReaction: "Elegant and structured. I do not want anything heavy-handed.",
      recommend: "story",
      recommendReaction: "That is a useful reason. Keep it there.",
      commitReaction: "Alright. That was specific enough. Bring it.",
    },
    encounter_v2_015: {
      ask: "preference",
      askReaction: "Structured, elegant, not too heavy. That is the lane.",
      recommend: "story",
      recommendReaction: "Good. That is an actual reason.",
      commitReaction: "Alright. That makes sense. Bring it.",
    },
    encounter_v2_016: {
      ask: "preference",
      askReaction: "Exactly. Same lane, just something with a little more lift.",
      recommend: "flavour",
      recommendReaction: "That sounds like us. Familiar, but still interesting.",
      commitReaction: "Yes, that feels right. Bring that one.",
    },
  } as const;

  for (const encounter of getTier1VerticalSliceEncounters()) {
    const expected = expectedPaths[encounter.id as keyof typeof expectedPaths];
    const state = createGameStateV2(encounter, null, "medium");

    applyChoice(state, { group: "ask", type: expected.ask });
    assert.equal(state.history.at(-1)?.reaction, expected.askReaction, `${encounter.id}:ask`);

    applyChoice(state, { group: "recommend", type: expected.recommend });
    assert.equal(state.history.at(-1)?.reaction, expected.recommendReaction, `${encounter.id}:recommend`);

    const commit = applyChoice(state, { group: "commit", type: "recommendation" });
    assert.equal(commit.outcome, "premium_success", `${encounter.id}:outcome`);
    assert.equal(state.history.at(-1)?.reaction, expected.commitReaction, `${encounter.id}:commit`);
  }
});

test("three medium mistakes unlock restraint without forcing furious mood", () => {
  const encounter = getTier1VerticalSliceEncounters().find((item) => item.id === "encounter_v2_013");
  assert.ok(encounter);
  const state = createGameStateV2(encounter, null, "medium");

  applyChoice(state, { group: "ask", type: "occasion" });
  applyChoice(state, { group: "ask", type: "budget" });
  const third = applyChoice(state, { group: "recommend", type: "story" });

  assert.equal(third.outcome, "continue");
  assert.equal(state.mistakeCount, 3);
  assert.equal(state.frustration, 3);
  assert.equal(state.walkAwayUnlocked, true);
  assert.equal(
    resolveEncounterMoodV3({
      progress: state.progress,
      frustration: state.frustration,
      mistakeCount: state.mistakeCount,
      difficultyMode: state.difficultyMode,
      lastQuality: state.history.at(-1)?.quality,
    }),
    "annoyed",
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

test("bottle reward merge keeps claimed rewards from both server and incoming", () => {
  const merged = mergeBottleRewardStates(
    {
      totalAP: 120,
      tierUnlocked: 2,
      rewards: [
        { id: "starter_bottle", name: "Starter Bottle", claimed: true, claimedAt: 100 },
      ],
    },
    {
      totalAP: 180,
      tierUnlocked: 2,
      rewards: [
        { id: "bronze_bottle", name: "Bronze Bottle", claimed: true, claimedAt: 200 },
      ],
    },
  );

  assert.equal(merged?.totalAP, 180);
  assert.equal(merged?.rewards?.length, 2);
  assert.ok(merged?.rewards?.some((reward) => reward.id === "starter_bottle" && reward.claimed));
  assert.ok(merged?.rewards?.some((reward) => reward.id === "bronze_bottle" && reward.claimed));
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

test("Godot shift stats accumulate guests, bottles, and greetings without double-counting a rerun", async () => {
  const {
    accumulateGodotShiftStats,
    mergeGodotShiftCanonical,
    buildGodotShiftEncounterDrafts,
    mergeCanonicalProgressionState,
  } = await import("../src/game/v2ProgressionAuthority");

  const first = accumulateGodotShiftStats(null, {
    shiftRunId: "shift-1",
    guestServices: 3,
    walkAways: 1,
    wineSales: 2,
    wineOffers: 3,
    bottleMeter: 2,
    bottleMeterMax: 5,
    operationalAuthorityDelta: 12,
    elapsedShiftTime: 240,
    interactionAuthorityEvents: [
      { accepted: true, greetingRating: "strong" },
      { accepted: false, greetingRating: "poor" },
      { recovered: true, greetingRating: "acceptable" },
    ],
  }, { shiftRunId: "shift-1", coinBalance: 9, speedPct: 61 });

  assert.equal(first.guestsServed, 2);
  assert.equal(first.guestsLost, 1);
  assert.equal(first.bottlesSold, 2);
  assert.equal(first.bottlesAttempted, 3);
  assert.equal(first.shiftsCompleted, 1);
  assert.equal(first.greetingAcceptedCount, 2);
  assert.equal(first.greetingSampleCount, 3);
  assert.equal(first.lastWineStreak, 2);
  assert.equal(first.avgTimeSellingBottleSec, 120);

  const rerun = accumulateGodotShiftStats(first, {
    shiftRunId: "shift-1",
    guestServices: 3,
    walkAways: 1,
    wineSales: 2,
    wineOffers: 3,
  }, { shiftRunId: "shift-1" });
  assert.equal(rerun.guestsServed, 2);
  assert.equal(rerun.shiftsCompleted, 1);

  const second = accumulateGodotShiftStats(first, {
    shiftRunId: "shift-2",
    guestServices: 1,
    walkAways: 0,
    wineSales: 1,
    wineOffers: 1,
    operationalAuthorityDelta: 4,
  }, { shiftRunId: "shift-2" });
  assert.equal(second.guestsServed, 3);
  assert.equal(second.bottlesSold, 3);
  assert.equal(second.shiftsCompleted, 2);
  assert.equal(second.authorityDeltas.length, 2);

  const merged = mergeGodotShiftCanonical(first, second);
  assert.equal(merged.guestsServed, 3);
  assert.equal(merged.lastShiftRunId, "shift-2");

  const staleClient = accumulateGodotShiftStats(null, {
    shiftRunId: "shift-2",
    guestServices: 1,
    walkAways: 0,
    wineSales: 1,
    wineOffers: 1,
  }, { shiftRunId: "shift-2" });
  const recovered = mergeGodotShiftCanonical(first, staleClient);
  assert.equal(recovered.guestsServed, 3);
  assert.equal(recovered.bottlesSold, 3);

  const drafts = buildGodotShiftEncounterDrafts({
    shiftRunId: "shift-1",
    guestServices: 2,
    walkAways: 1,
  });
  assert.equal(drafts.length, 2);
  assert.equal(drafts.filter((row) => row.chainSignal === "green").length, 1);
  assert.equal(drafts.filter((row) => row.chainSignal === "red").length, 1);

  const detailedDrafts = buildGodotShiftEncounterDrafts({
    shiftRunId: "shift-detailed",
    guestServices: 3,
    walkAways: 1,
    guestOutcomes: [
      {
        serviceId: "0:guest-a",
        guestId: "guest-a",
        v2EncounterId: "encounter_v2_014",
        completionKind: "paid_completion",
        performanceGrade: "A",
        chainSignal: "green",
        outcome: "premium_success",
        finalMood: "green",
        serviceQualityScore: 94,
        moodHistory: [{ mood: "green", reason: "seated" }],
        wineSold: true,
      },
      {
        serviceId: "1:guest-b",
        guestId: "guest-b",
        completionKind: "paid_completion",
        performanceGrade: "C",
        chainSignal: "yellow",
        outcome: "weak_success",
        finalMood: "orange",
        serviceQualityScore: 64,
        moodHistory: [
          { mood: "green", reason: "seated" },
          { mood: "orange", reason: "table_patience" },
        ],
        wineSold: false,
      },
      {
        serviceId: "2:guest-c",
        guestId: "guest-c",
        completionKind: "seated_walkout",
        performanceGrade: "F",
        chainSignal: "red",
        outcome: "failure",
        finalMood: "annoyed",
        serviceQualityScore: 0,
        walkedOut: true,
      },
    ],
  });
  assert.deepEqual(detailedDrafts.map((row) => row.performanceGrade), ["A", "C", "F"]);
  assert.deepEqual(detailedDrafts.map((row) => row.chainSignal), ["green", "yellow", "red"]);
  assert.deepEqual(
    detailedDrafts.map((row) => row.outcome),
    ["premium_success", "weak_success", "failure"],
  );
  assert.equal(detailedDrafts[0].bottleServed, true);
  assert.equal(detailedDrafts[1].reflection.serviceQualityScore, 64);
  assert.equal(detailedDrafts[1].reflection.moodHistory.length, 2);
  assert.equal(detailedDrafts[2].reflection.finalMood, "annoyed");
  assert.equal(new Set(detailedDrafts.map((row) => row.eventId)).size, 3);

  const detailedStats = accumulateGodotShiftStats(null, {
    shiftRunId: "shift-detailed",
    guestServices: 3,
    guestsServed: 99,
    walkAways: 99,
    guestOutcomes: [
      { serviceId: "0:guest-a", outcome: "premium_success" },
      { serviceId: "1:guest-b", outcome: "weak_success" },
      { serviceId: "2:guest-c", outcome: "failure", walkedOut: true },
    ],
  });
  assert.equal(detailedStats.guestsServed, 2);
  assert.equal(detailedStats.guestsLost, 1);
  assert.equal(detailedStats.guestOutcomes.length, 3);

  const canonical = mergeCanonicalProgressionState(
    { godotShift: first, economy: { ap: 10 } },
    { godotShift: second, economy: { ap: 20 } },
  );
  assert.equal(canonical.godotShift.guestsServed, 3);
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

test("food and wine offers are independent accept/decline paths", () => {
  const wineOnly = evaluateOfferAccess({
    guestType: "tourist",
    greeting: "greet_wine",
    offer: "offer_wine",
  });
  assert.equal(wineOnly.accepted, true);
  assert.equal(wineOnly.placesWineOrder, true);
  assert.equal(wineOnly.placesFoodOrder, false);

  const foodOnly = evaluateOfferAccess({
    guestType: "regular",
    greeting: "greet_food",
    offer: "offer_food",
  });
  assert.equal(foodOnly.accepted, true);
  assert.equal(foodOnly.placesFoodOrder, true);
  assert.equal(foodOnly.placesWineOrder, false);

  const aperitifWine = evaluateOfferAccess({
    guestType: "tourist",
    greeting: "greet_aperitif",
    offer: "offer_wine",
  });
  assert.equal(aperitifWine.accepted, true);
  assert.equal(aperitifWine.placesWineOrder, true);
  assert.equal(aperitifWine.placesFoodOrder, false);

  const skepticFood = evaluateOfferAccess({
    guestType: "skeptic",
    greeting: "greet_food",
    offer: "offer_food",
    profileTier: 1,
    hasFoodRecovery: false,
  });
  assert.equal(skepticFood.accepted, true);
  assert.equal(skepticFood.placesFoodOrder, true);

  const skepticWineAfterFood = evaluateOfferAccess({
    guestType: "skeptic",
    greeting: "greet_food",
    offer: "offer_wine",
  });
  assert.equal(skepticWineAfterFood.accepted, true);
  assert.equal(skepticWineAfterFood.placesWineOrder, true);
  assert.equal(skepticWineAfterFood.placesFoodOrder, false);
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

test("V2 choose bottle scores ideal safe and trap without replacing encounter play", async () => {
  const { startRuntimeV2Session, applyBottleChoiceRuntimeV2 } = await import("../src/game/runtimeV2");
  const { applyChoice } = await import("../src/game/engineV2");
  const { getBottleChoiceSet, BOTTLE_CHOICE_SCORES } = await import("../src/game/bottleChoice");

  const session = startRuntimeV2Session({ encounterId: "encounter_v2_001" });
  const set = getBottleChoiceSet(session.encounter);
  assert.equal(set.idealProductId, "product_coastal_sauvignon");
  assert.equal(set.safeProductId, "product_cartology_chenin");
  assert.equal(set.trapProductId, "product_uva_mira_cabernet");
  assert.match(String(set.clue || ""), /local, fresh/i);

  const trapSnapshot = applyBottleChoiceRuntimeV2(session, set.trapProductId);
  assert.equal(trapSnapshot.bottleChoiceFit, "trap");
  assert.equal(trapSnapshot.bottleChoiceScore, BOTTLE_CHOICE_SCORES.trap);
  assert.equal(session.product?.id, set.trapProductId);

  applyChoice(session.gameState, { group: "ask", type: "experience" });
  assert.equal(session.gameState.bottleChoice?.score, BOTTLE_CHOICE_SCORES.trap);
});

test("guest review clues stay player-facing and hide evaluation fields", async () => {
  const {
    getReviewProfileForGuest,
    getVisibleReviewClues,
    evaluateGreeting,
    resolveWineCandidates,
    commercialRoleAffectsScoring,
    createEncounterStartContext,
    getScenarioForGuest,
  } = await import("../src/game/guestService");

  const review = getReviewProfileForGuest("blonde_date");
  assert.ok(review);
  const clues = getVisibleReviewClues(review);
  assert.equal(clues.length, 4);
  assert.equal(clues.join(" ").includes("aperitif"), false);
  assert.equal(clues.join(" ").toLowerCase().includes("premium"), false);
  assert.equal(clues.join(" ").toLowerCase().includes("partner"), false);
  assert.match(String(review?.mealIntent?.dish || ""), /rib-eye/i);

  const aperitif = evaluateGreeting(review!, "aperitif");
  assert.equal(aperitif.rating, "strong");
  assert.equal(aperitif.nextStep, "complete_aperitif_service");
  assert.equal(aperitif.createsStationTask?.stationId, "bar");

  const wine = evaluateGreeting(review!, "wine");
  assert.equal(wine.rating, "acceptable");
  assert.equal(wine.nextStep, "open_wine_selection");

  const food = evaluateGreeting(review!, "food");
  assert.equal(food.rating, "acceptable");
  assert.equal(food.revealsFoodChoice, true);

  const fish = getReviewProfileForGuest("african_older_gentleman");
  assert.equal(evaluateGreeting(fish!, "wine").rating, "strong");
  assert.equal(evaluateGreeting(fish!, "aperitif").rating, "acceptable");
  assert.equal(evaluateGreeting(fish!, "food").rating, "weak");

  const steakWines = resolveWineCandidates("blonde_date");
  assert.equal(steakWines.length, 3);
  const roles = steakWines.map((item) => item.commercialRole).sort();
  assert.deepEqual(roles, ["partner", "premium", "safe"]);
  const safe = steakWines.find((item) => item.commercialRole === "safe");
  assert.equal(safe?.matchRating, "strong");
  assert.equal(commercialRoleAffectsScoring("partner"), false);

  const partner = steakWines.find((item) => item.commercialRole === "partner");
  const partnerContext = createEncounterStartContext({
    guestId: "blonde_date",
    greetingRoute: "greet_aperitif",
    greetingEvaluation: aperitif,
    selectedWineId: partner?.productId,
  });
  assert.equal(partnerContext?.selectedWineCommercialRole, "partner");
  assert.equal(partnerContext?.selectionApHint, 5);
  assert.ok(partnerContext?.variant?.guestOpeningLine);

  const fishScenario = getScenarioForGuest("african_older_gentleman");
  assert.equal(fishScenario?.id, "regular_fish_guest");
  const fishWines = resolveWineCandidates("african_older_gentleman");
  assert.equal(fishWines.every((item) => item.productId.includes("product_")), true);
  assert.ok(fishWines.some((item) => item.matchRating === "strong" && item.commercialRole === "safe"));
});

test("each first-run guest review has its own meal before wine is committed", async () => {
  const {
    getReviewProfileForGuest,
    getVisibleReviewClues,
    formatGuestReviewCard,
    mealHeadingForCertainty,
  } = await import("../src/game/guestService");
  const { startRuntimeV2Session, applyBottleChoiceRuntimeV2 } = await import("../src/game/runtimeV2");
  const { getBottleChoiceSet } = await import("../src/game/bottleChoice");

  const guests = [
    { id: "blonde_date", dish: /rib-eye/i, heading: "LIKELY MEAL" },
    { id: "african_older_gentleman", dish: /kingklip/i, heading: "ORDERING" },
    { id: "skeptic_reader", dish: /lamb/i, heading: "CONSIDERING MEAL" },
    { id: "skeptic_v1", dish: /chicken/i, heading: "ORDERING" },
    { id: "african_regular_table", dish: /line fish/i, heading: "LIKELY MEAL" },
  ];
  const dishes = new Set<string>();
  for (const guest of guests) {
    const review = getReviewProfileForGuest(guest.id);
    assert.ok(review, guest.id);
    const card = formatGuestReviewCard(review);
    assert.match(card.mealDish, guest.dish);
    assert.equal(card.mealHeading, guest.heading);
    assert.equal(mealHeadingForCertainty(review!.mealIntent?.certainty), guest.heading);
    assert.ok(review!.mealProfile?.protein);
    dishes.add(card.mealDish.toLowerCase());
    const leaked = `${card.body} ${getVisibleReviewClues(review).join(" ")}`.toLowerCase();
    assert.equal(leaked.includes("aperitif"), false, guest.id);
    assert.equal(leaked.includes("premium"), false, guest.id);
    assert.equal(leaked.includes("choose red"), false, guest.id);
    assert.equal(leaked.includes("partner"), false, guest.id);

    const session = startRuntimeV2Session({
      encounterId: "encounter_v2_001",
      guestId: guest.id,
      greetingChoice: "greet_wine",
    });
    assert.match(String(session.knownGuestInformation?.mealIntent?.dish || ""), guest.dish);
    assert.equal(session.gameState.bottleChoice, null);
    const set = getBottleChoiceSet(session.encounter, { guestId: guest.id });
    const chosen = set.options[1]?.productId || set.options[0]?.productId;
    applyBottleChoiceRuntimeV2(session, chosen);
    assert.equal(session.product?.id, chosen);
    assert.equal(session.encounterStartContext?.selectedWineId, chosen);
  }
  assert.equal(dishes.size, 5);
});

test("first-run guests reopen food after one wine fail, then allow a dependent second wine", async () => {
  const { getScenarioForGuest, scenarioHasSecondWineOpportunity } = await import(
    "../src/game/guestService"
  );
  for (const guestId of [
    "blonde_date",
    "african_older_gentleman",
    "skeptic_reader",
    "skeptic_v1",
    "african_regular_table",
  ]) {
    const scenario = getScenarioForGuest(guestId);
    assert.equal(scenario?.secondWineOpportunityAllowed, true, guestId);
    assert.equal(scenarioHasSecondWineOpportunity(scenario), true, guestId);
  }
});

test("scenario wine selection uses match rating not commercial role for AP", async () => {
  const { startRuntimeV2Session, applyBottleChoiceRuntimeV2 } = await import("../src/game/runtimeV2");
  const { getBottleChoiceSet } = await import("../src/game/bottleChoice");
  const { evaluateOfferAccess } = await import("../src/game/guestProfiles");

  const session = startRuntimeV2Session({
    encounterId: "encounter_v2_014",
    guestId: "blonde_date",
    greetingChoice: "greet_wine",
  });
  const set = getBottleChoiceSet(session.encounter, { guestId: "blonde_date" });
  assert.equal(set.options.length, 3);
  assert.ok(set.options.every((option) => option.commercialRole));
  assert.equal(
    set.options.some((option) => /premium|safe|partner|ideal|correct/i.test(String(option.product?.name || ""))),
    false,
  );

  const safeOption = set.options.find((option) => option.commercialRole === "safe");
  assert.ok(safeOption);
  const snapshot = applyBottleChoiceRuntimeV2(session, safeOption!.productId);
  assert.equal(snapshot.wineCommercialRole, "safe");
  assert.equal(snapshot.wineMatchRating, "strong");
  assert.equal(snapshot.bottleChoiceScore, 10);
  assert.equal(snapshot.greetingRoute, "wine");
  assert.ok(snapshot.wineVariantId);
  assert.match(String(session.encounter.contextClue || ""), /normally enjoy|serious bottle|producer/i);

  // Food remains independent of wine selection/sale path.
  const wineOffer = evaluateOfferAccess({
    guestType: "tourist",
    greeting: "greet_wine",
    offer: "offer_wine",
  });
  assert.equal(wineOffer.placesFoodOrder, false);
  assert.equal(wineOffer.placesWineOrder, true);
});

test("partner maxAp does not stack on match rating; second wine is scenario-gated", async () => {
  const {
    createEncounterStartContext,
    getScenarioForGuest,
    scenarioHasSecondWineOpportunity,
    evaluateGreeting,
    getReviewProfileForGuest,
  } = await import("../src/game/guestService");

  const steak = getScenarioForGuest("blonde_date");
  const skeptic = getScenarioForGuest("skeptic_reader");
  assert.equal(scenarioHasSecondWineOpportunity(steak), true);
  assert.equal(scenarioHasSecondWineOpportunity(skeptic), true);

  const partner = steak!.wineCandidates.find((item) => item.commercialRole === "partner");
  assert.ok(partner);
  // Even if a candidate carries maxApModifier, start context must ignore it.
  partner!.maxApModifier = -5;
  const review = getReviewProfileForGuest("blonde_date");
  const greet = evaluateGreeting(review!, "wine");
  const context = createEncounterStartContext({
    guestId: "blonde_date",
    greetingRoute: "greet_wine",
    greetingEvaluation: greet,
    selectedWineId: partner!.productId,
  });
  assert.equal(context?.selectedWineCommercialRole, "partner");
  assert.equal(context?.modifiers.maxApModifier, greet.maxApModifier);
  assert.equal(context?.selectionApHint, 5);

  const poorPartner = skeptic!.wineCandidates.find(
    (item) => item.commercialRole === "partner",
  );
  assert.ok(poorPartner);
  const skepticContext = createEncounterStartContext({
    guestId: "skeptic_reader",
    greetingRoute: "greet_wine",
    selectedWineId: poorPartner!.productId,
  });
  assert.equal(skepticContext?.selectedWineMatchRating, "poor");
  assert.equal(skepticContext?.selectionApHint, -5);
  assert.equal(skepticContext?.modifiers.maxApModifier, 0);
});

test("encounterTraits reshape Ask tolerance and Commit readiness", async () => {
  const { startRuntimeV2Session, applyBottleChoiceRuntimeV2, applyChoiceRuntimeV2 } = await import(
    "../src/game/runtimeV2"
  );
  const { getBottleChoiceSet } = await import("../src/game/bottleChoice");
  const { canCommitSucceed } = await import("../src/game/engineV2");
  const { maxAskBeforePenalty } = await import("../src/game/guestService");

  const regular = startRuntimeV2Session({
    encounterId: "encounter_v2_013",
    guestId: "african_older_gentleman",
    greetingChoice: "greet_wine",
  });
  assert.equal(regular.gameState.encounterTraits?.askTolerance, "low");
  assert.equal(regular.gameState.encounterTraits?.commitReadiness, "early");
  assert.equal(regular.gameState.discoveryNeed, "low");
  assert.equal(maxAskBeforePenalty("low"), 1);

  const set = getBottleChoiceSet(regular.encounter, { guestId: "african_older_gentleman" });
  const safe = set.options.find((option) => option.commercialRole === "safe");
  applyBottleChoiceRuntimeV2(regular, safe!.productId);
  assert.equal(regular.gameState.resistanceLevel, "low");

  // First ask is allowed; second ask (before recommend) should draw over-ask pressure for low tolerance.
  applyChoiceRuntimeV2(regular, { group: "ask", type: "experience" });
  const frustrationBefore = Number(regular.gameState.frustration || 0);
  const secondAsk = applyChoiceRuntimeV2(regular, { group: "ask", type: "budget" });
  assert.ok(Number(regular.gameState.frustration || 0) > frustrationBefore);
  assert.match(
    String(regular.gameState.history.at(-1)?.feedbackText || secondAsk.reaction || ""),
    /questions|Energy drops|already|pull/i,
  );

  // Early commit readiness: with enough progress, commit can succeed sooner than late guests.
  regular.gameState.progress = 7;
  regular.gameState.frustration = 0;
  regular.gameState.turnCount = 1;
  assert.equal(canCommitSucceed(regular.gameState, "optimal"), true);

  const tourist = startRuntimeV2Session({
    encounterId: "encounter_v2_014",
    guestId: "blonde_date",
    greetingChoice: "greet_wine",
  });
  assert.equal(tourist.gameState.encounterTraits?.askTolerance, "medium");
  assert.equal(tourist.gameState.encounterTraits?.commitReadiness, "normal");
  tourist.gameState.progress = 7;
  tourist.gameState.frustration = 0;
  tourist.gameState.turnCount = 1;
  assert.equal(canCommitSucceed(tourist.gameState, "optimal"), false);
});

test("polish: forced greeting rating recomputes modifiers; vague winePreference does not lock Ask", async () => {
  const {
    evaluateGreeting,
    getReviewProfileForGuest,
    buildKnownGuestInformation,
    scenarioHasSecondWineOpportunity,
    getScenarioForGuest,
  } = await import("../src/game/guestService");
  const { startRuntimeV2Session, applyChoiceRuntimeV2 } = await import("../src/game/runtimeV2");

  const review = getReviewProfileForGuest("blonde_date");
  const natural = evaluateGreeting(review!, "wine");
  assert.equal(natural.rating, "acceptable");
  const forcedPoor = evaluateGreeting(review!, "wine", "poor");
  assert.equal(forcedPoor.rating, "poor");
  assert.ok(forcedPoor.maxApModifier < natural.maxApModifier);
  assert.ok(forcedPoor.moodDelta < natural.moodDelta);

  const session = startRuntimeV2Session({
    encounterId: "encounter_v2_014",
    guestId: "blonde_date",
    greetingChoice: "greet_wine",
    greetingRating: "poor",
  });
  assert.equal(session.greetingEvaluation?.rating, "poor");
  assert.equal(
    session.greetingEvaluation?.maxApModifier,
    forcedPoor.maxApModifier,
  );
  assert.equal(session.knownGuestInformation?.winePreference, undefined);

  const known = buildKnownGuestInformation({
    greeting: { ...natural, revealsWinePreference: true },
    discovered: { winePreference: "open" },
  });
  assert.equal(known.winePreference, undefined);

  // Preference Ask remains available when only a vague open preference exists.
  session.gameState.knownGuestInformation = { winePreference: "open" };
  const ask = applyChoiceRuntimeV2(session, { group: "ask", type: "preference" });
  assert.equal(
    /already made that clear/i.test(String(ask.reaction || "")),
    false,
  );

  assert.equal(scenarioHasSecondWineOpportunity(getScenarioForGuest("skeptic_reader")), true);
  assert.equal(scenarioHasSecondWineOpportunity(null), false);
});

test("known Ask is penalized and greeting maxAp survives finalize", async () => {
  const { startRuntimeV2Session, applyBottleChoiceRuntimeV2, applyChoiceRuntimeV2 } = await import(
    "../src/game/runtimeV2"
  );
  const { getBottleChoiceSet } = await import("../src/game/bottleChoice");
  const { evaluateGreeting, getReviewProfileForGuest } = await import("../src/game/guestService");
  const { failEncounter } = await import("../src/game/engineV2");

  const review = getReviewProfileForGuest("african_older_gentleman");
  const weakFood = evaluateGreeting(review!, "food");
  assert.equal(weakFood.rating, "weak");
  assert.ok(weakFood.maxApModifier < 0);

  const session = startRuntimeV2Session({
    encounterId: "encounter_v2_013",
    guestId: "african_older_gentleman",
    greetingChoice: "greet_food",
    knownFoodChoice: "fish",
  });
  assert.equal(session.knownGuestInformation?.foodChoice, "fish");
  assert.equal(session.greetingEvaluation?.rating, "weak");

  const set = getBottleChoiceSet(session.encounter, { guestId: "african_older_gentleman" });
  const safe = set.options.find((option) => option.commercialRole === "safe");
  applyBottleChoiceRuntimeV2(session, safe!.productId);
  assert.equal(
    Number(session.gameState.selectionAuthorityBonus || 0),
    Number(session.greetingEvaluation?.maxApModifier || 0),
  );

  const ask = applyChoiceRuntimeV2(session, { group: "ask", type: "preference" });
  assert.match(String(ask.reaction || ""), /already/i);

  const failed = failEncounter(session.gameState);
  assert.equal(failed.outcome, "failure");
  const rewards = session.encounter.rewards || {};
  assert.equal(
    Number(session.gameState.authorityDelta),
    Number(rewards.failure || 0),
  );
});

test("skill bank seeds on first measurement then blends with outcome bias", () => {
  assert.equal(outcomeBiasForSkillBank("premium_success"), 2);
  assert.equal(outcomeBiasForSkillBank("failure"), -2);

  const seed = applySkillBankUpdate({
    currentBank: null,
    measurement: {
      read: 70,
      framing: 60,
      delivery: 80,
      recovery: 50,
      closing: 75,
      speed: 55,
    },
    outcome: "premium_success",
    mode: "full",
  });
  assert.ok(seed);
  assert.equal(seed.seeded, true);
  assert.equal(seed.bank.read, 70);

  const afterFail = applySkillBankUpdate({
    currentBank: seed.bank,
    measurement: {
      read: 40,
      framing: 40,
      delivery: 30,
      recovery: 20,
      closing: 25,
      speed: 40,
    },
    outcome: "failure",
    mode: "full",
    sampleCount: seed.meta.sampleCount,
  });
  assert.ok(afterFail);
  assert.equal(afterFail.seeded, false);
  // Sticky blend: moves partway toward 40, plus failure bias (-2).
  const expectedRead = Math.round(70 + SKILL_BANK_LEARNING_RATE * (40 - 70) - 2);
  assert.equal(afterFail.bank.read, expectedRead);
  assert.ok(afterFail.bank.read < 70 && afterFail.bank.read > 40);

  const speedOnly = applySkillBankUpdate({
    currentBank: afterFail.bank,
    measurement: {
      read: 0,
      framing: 0,
      delivery: 0,
      recovery: 0,
      closing: 0,
      speed: 90,
    },
    mode: "speed_only",
    sampleCount: afterFail.meta.sampleCount,
  });
  assert.ok(speedOnly);
  assert.equal(speedOnly.bank.read, afterFail.bank.read);
  assert.ok(speedOnly.bank.speed > afterFail.bank.speed);
  assert.ok(speedOnly.bank.speed < 90);
});
