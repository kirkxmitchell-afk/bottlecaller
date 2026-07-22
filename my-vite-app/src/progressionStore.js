// progressionStore.js
export const AVAILABLE_TONES = ["guide", "charm", "authority"];

export function deriveTier(points) {
  const pts = Number(points || 0);
  if (pts >= 12) return 3;
  if (pts >= 5) return 2;
  return 1;
}

export function unlockedGuestTypes(points) {
  const pts = Number(points || 0);
  const tier = deriveTier(pts);
  const base = ["dictator", "bargain_smart", "griever"];
  if (tier >= 2) base.push("fancy");
  if (tier >= 3) base.push("celebrator");
  return base;
}

export function encounterRangeForPoints(points) {
  const tier = deriveTier(points);
  return tier === 1 ? [1, 5] : tier === 2 ? [1, 12] : [1, 20];
}

export function getUnlockedModesForTier(tier) {
  void tier;
  return AVAILABLE_TONES.slice();
}

export function getUnlockedModesForPoints(points) {
  const pts = Number(points || 0);
  const tier = deriveTier(pts);
  return getUnlockedModesForTier(tier);
}

export function getAvailableTones() {
  return AVAILABLE_TONES.slice();
}

export function getBaseReward(activityType) {
  switch (String(activityType || "").toLowerCase()) {
    case "drill":
      return 1;
    case "encounter":
      return 1;
    case "timed_challenge":
      return 2;
    default:
      return 1;
  }
}

export function getTierMultiplier(tier) {
  const t = Number(tier || 1);
  if (t >= 3) return 1.5;
  if (t === 2) return 1.25;
  return 1.0;
}

export function getDifficultyMultiplier(effectiveDifficulty) {
  const d = Number(effectiveDifficulty || 0);
  if (!Number.isFinite(d) || d <= 0) return 1.0;
  if (d >= 8) return 1.2;
  if (d >= 5) return 1.1;
  return 1.0;
}

export function getPressureMultiplier(pressureLevel) {
  const p = Number(pressureLevel || 0);
  if (!Number.isFinite(p) || p <= 0) return 1.0;
  if (p >= 3) return 1.1;
  if (p >= 2) return 1.05;
  return 1.0;
}

export function getQualityMultiplier(qualityState) {
  switch (String(qualityState || "").toLowerCase()) {
    case "mastered":
      return 1.25;
    case "passed":
      return 1.0;
    case "completed":
      return 0.0;
    default:
      return 1.0;
  }
}

export function getCompetitionMultiplier(competitionType) {
  switch (String(competitionType || "").toLowerCase()) {
    case "tournament":
      return 1.5;
    case "timed_challenge":
      return 1.25;
    default:
      return 1.0;
  }
}

export function roundReward(value) {
  const n = Number(value || 0);
  return Math.max(0, Math.round(n * 10) / 10);
}

export function round1(value) {
  const n = Number(value || 0);
  return Math.round(n * 10) / 10;
}

export function sumRewardPoints(rows) {
  return round1(
    (rows || []).reduce((sum, row) => {
      return sum + Number(row?.rewardPoints || row?.reward?.totalPoints || 0);
    }, 0)
  );
}

export function calculateRewardValue({
  activityType,
  tier = 1,
  effectiveDifficulty = null,
  pressureLevel = null,
  qualityState = "passed",
  competitionType = "normal",
  premiumBonus = 0,
} = {}) {
  const baseReward = getBaseReward(activityType);
  const tierMultiplier = getTierMultiplier(tier);
  const difficultyMultiplier = getDifficultyMultiplier(effectiveDifficulty);
  const pressureMultiplier = getPressureMultiplier(pressureLevel);
  const qualityMultiplier = getQualityMultiplier(qualityState);
  const competitionMultiplier = getCompetitionMultiplier(competitionType);

  const rawValue =
    baseReward *
    tierMultiplier *
    difficultyMultiplier *
    pressureMultiplier *
    qualityMultiplier *
    competitionMultiplier;

  const totalPoints = roundReward(rawValue + Number(premiumBonus || 0));

  return {
    activityType,
    tier: Number(tier || 1),
    effectiveDifficulty: Number.isFinite(Number(effectiveDifficulty))
      ? Number(effectiveDifficulty)
      : null,
    pressureLevel: Number.isFinite(Number(pressureLevel))
      ? Number(pressureLevel)
      : null,
    qualityState,
    competitionType,
    baseReward,
    tierMultiplier,
    difficultyMultiplier,
    pressureMultiplier,
    qualityMultiplier,
    competitionMultiplier,
    premiumBonus: Number(premiumBonus || 0),
    rawValue,
    totalPoints,
  };
}

export function resolveDrillQualityState({
  repsDone,
  repTarget,
  accuracy = null,
  qualityScore = null,
} = {}) {
  const reps = Number(repsDone || 0);
  const target = Number(repTarget || 0);
  const completed = target > 0 && reps >= target;
  if (!completed) return "completed";

  const score = Number.isFinite(Number(accuracy))
    ? Number(accuracy)
    : Number(qualityScore);
  if (!Number.isFinite(score)) return "completed";
  if (score >= 0.9) return "mastered";
  if (score >= 0.7) return "passed";
  return "completed";
}

export function resolveEncounterQualityState({
  performanceGrade,
  success,
} = {}) {
  if (!success) return "completed";
  const grade = String(performanceGrade || "").toUpperCase();
  if (grade === "A") return "mastered";
  if (grade === "B") return "passed";
  return "completed";
}

export function buildRewardsSummary(state = {}) {
  const encounterEntries = Object.values(
    state?.rewards?.encounters ||
    state?.run?.scoredThisRun ||
    {}
  );
  const drillEntries = Object.values(state?.rewards?.drills || {});
  const challengeEntries = Object.values(state?.rewards?.timedChallenges || {});
  const premiumEntries = Object.values(state?.rewards?.premiumByEncounter || {});
  const legacyEntries = Object.values(state?.rewards?.legacy || {});

  return {
    encounters: {
      count: encounterEntries.length,
      totalPoints: sumRewardPoints(encounterEntries),
    },
    drills: {
      count: drillEntries.length,
      totalPoints: sumRewardPoints(drillEntries),
    },
    timedChallenges: {
      count: challengeEntries.length,
      totalPoints: sumRewardPoints(challengeEntries),
    },
    premium: {
      count: premiumEntries.length,
      totalPoints: sumRewardPoints(premiumEntries),
    },
    legacy: {
      count: legacyEntries.length,
      totalPoints: sumRewardPoints(legacyEntries),
    },
  };
}

export function calculateRewardSummaryTotal(summary = {}) {
  return round1(
    Number(summary?.encounters?.totalPoints || 0) +
    Number(summary?.drills?.totalPoints || 0) +
    Number(summary?.timedChallenges?.totalPoints || 0) +
    Number(summary?.premium?.totalPoints || 0) +
    Number(summary?.legacy?.totalPoints || 0)
  );
}

export function logProgressionConsistency(state) {
  const rewardsSummary = buildRewardsSummary(state);
  const points = round1(Number(state?.economy?.points ?? state?.points ?? 0));
  const summaryTotal = calculateRewardSummaryTotal(rewardsSummary);

  console.log("[BC progression consistency]", {
    points,
    summaryTotal,
    delta: round1(points - summaryTotal),
    rewardsSummary,
  });
}

export function createProgressionStore(storage = window.localStorage) {
  let state = null;
  let storageKey = null;
  const listeners = new Set();

  function emit() { listeners.forEach(fn => fn(getState())); }

  function getState() {
    if (!state) throw new Error("Progression store not initialized.");
    return structuredClone(state);
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function unlockedModes(points) {
    return getUnlockedModesForPoints(points);
  }

  function clampEncounterByTier(encounterId, points) {
    const [min, max] = encounterRangeForPoints(points);
    return Math.max(min, Math.min(max, encounterId));
  }

  function save() {
    storage.setItem(storageKey, JSON.stringify(state));
  }

  function fresh(identity) {
    return {
      version: 1,
      identity,
      points: 0,
      difficulty: { seed: 1.0, lastUpdatedAt: Date.now() },
      history: { completedEncounterIds: [], successCount: 0, failCount: 0 },
      session: {
        currentEncounterId: 1,
        mode: "guide",
        guestTypeSelected: "dictator",
        runEase: 1.0,
        runEaseRemaining: 0
      },
      run: {
        runId: 0,
        scoredThisRun: {}
      },
      rewards: {
        encounters: {},
        timedChallenges: {},
        drills: {},
        premiumByEncounter: {}
      },
      mirror: {}
    };
  }

  function normalize(s, identity) {
    if (!s || s.version !== 1) return fresh(identity);

    s.identity = identity;

    s.points = Number.isFinite(s.points) ? s.points : 0;

    s.difficulty = s.difficulty && Number.isFinite(s.difficulty.seed)
      ? { seed: s.difficulty.seed, lastUpdatedAt: s.difficulty.lastUpdatedAt || Date.now() }
      : { seed: 1.0, lastUpdatedAt: Date.now() };

    s.history = s.history || {};
    s.history.completedEncounterIds = Array.isArray(s.history.completedEncounterIds) ? s.history.completedEncounterIds : [];
    s.history.successCount = Number.isFinite(s.history.successCount) ? s.history.successCount : 0;
    s.history.failCount = Number.isFinite(s.history.failCount) ? s.history.failCount : 0;

    s.session = s.session || {};
    s.session.currentEncounterId = Number.isFinite(s.session.currentEncounterId) ? s.session.currentEncounterId : 1;
    s.session.mode = typeof s.session.mode === "string" ? s.session.mode : "guide";
    s.session.guestTypeSelected = typeof s.session.guestTypeSelected === "string"
      ? s.session.guestTypeSelected.toLowerCase().replace("decider", "dictator")
      : "dictator";
    if (!Number.isFinite(s.session.runEase)) s.session.runEase = 1.0;
    if (!Number.isFinite(s.session.runEaseRemaining)) s.session.runEaseRemaining = 0;

    s.run = s.run || {};
    s.run.runId = Number.isFinite(s.run.runId) ? s.run.runId : 0;
    s.run.scoredThisRun = s.run.scoredThisRun && typeof s.run.scoredThisRun === "object" ? s.run.scoredThisRun : {};

    s.rewards = s.rewards || {};
    s.rewards.encounters =
      s.rewards.encounters && typeof s.rewards.encounters === "object"
        ? s.rewards.encounters
        : {};
    s.rewards.timedChallenges =
      s.rewards.timedChallenges && typeof s.rewards.timedChallenges === "object"
        ? s.rewards.timedChallenges
        : {};
    s.rewards.drills =
      s.rewards.drills && typeof s.rewards.drills === "object"
        ? s.rewards.drills
        : {};
    s.rewards.premiumByEncounter =
      s.rewards.premiumByEncounter && typeof s.rewards.premiumByEncounter === "object"
        ? s.rewards.premiumByEncounter
        : {};
    s.rewards.legacy =
      s.rewards.legacy && typeof s.rewards.legacy === "object"
        ? s.rewards.legacy
        : {};
    s.mirror =
      s.mirror && typeof s.mirror === "object"
        ? s.mirror
        : {};

    // clamp to allowed by tier/points
    s.session.currentEncounterId = clampEncounterByTier(s.session.currentEncounterId, s.points);

    const allowedGT = unlockedGuestTypes(s.points);
    if (!allowedGT.includes(s.session.guestTypeSelected)) s.session.guestTypeSelected = allowedGT[0];

    const allowedModes = unlockedModes(s.points);
    if (!allowedModes.includes(s.session.mode)) s.session.mode = allowedModes[0];

    return s;
  }

  function init(identity) {
    const { email, license, groupId } = identity;
    if (!email || !license) throw new Error("Missing identity.email or identity.license");

    storageKey = `bottlecaller:progress:v1:${email}|${license}|${groupId || "solo"}`;

    const raw = storage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = normalize(parsed, identity);
    } else {
      state = fresh(identity);
      save();
    }
    emit();
    return getSelectors();
  }

  function resetEncounterFlow() {
    // ONLY reset gameplay flow, not progression
    state.session.currentEncounterId = 1;
    state.session.runEase = 0.75;
    state.session.runEaseRemaining = 3;
    save();
    emit();
  }

  function resetRunScoring() {
    console.log("[PROG] resetRunScoring", {
      prevRunId: state.run?.runId || 0,
      nextRunId: (state.run?.runId || 0) + 1
    });
    state.run = state.run || {};
    state.run.scoredThisRun = {};
    state.run.runId = (state.run.runId || 0) + 1;
    save();
    emit();
  }

  function grantPoints(pts) {
    const n = Math.max(0, Number(pts || 0));
    if (!n) return false;
    state.points = Number(state.points || 0) + n;
    state.session.currentEncounterId = clampEncounterByTier(state.session.currentEncounterId, state.points);

    const allowedGT = unlockedGuestTypes(state.points);
    if (!allowedGT.includes(state.session.guestTypeSelected)) {
      state.session.guestTypeSelected = allowedGT[0];
    }

    const allowedModes = unlockedModes(state.points);
    if (!allowedModes.includes(state.session.mode)) {
      state.session.mode = allowedModes[0];
    }

    return true;
  }

  function setSessionSelection({ encounterId, mode, guestType }) {
    if (encounterId != null) {
      state.session.currentEncounterId = clampEncounterByTier(encounterId, state.points);
    }
    if (mode != null) {
      const modes = unlockedModes(state.points);
      state.session.mode = modes.includes(mode) ? mode : modes[0];
    }
    if (guestType != null) {
      const types = unlockedGuestTypes(state.points);
      state.session.guestTypeSelected = types.includes(guestType) ? guestType : types[0];
    }
    save();
    emit();
  }

  function hydrateFromCanonicalState(canonicalState) {
    const c = canonicalState && typeof canonicalState === "object" ? canonicalState : null;
    if (!c) return { ok: false, reason: "missing" };

    const economy = c.economy && typeof c.economy === "object" ? c.economy : {};
    const session = c.session && typeof c.session === "object" ? c.session : {};
    const display = c.display && typeof c.display === "object" ? c.display : {};

    if (Number.isFinite(Number(economy.points))) {
      state.points = Math.max(0, Math.floor(Number(economy.points)));
    }

    if (Number.isFinite(Number(display.difficultySeed))) {
      state.difficulty.seed = Math.max(1, Number(display.difficultySeed));
      state.difficulty.lastUpdatedAt = Date.now();
    }

    if (Number.isFinite(Number(session.runEase))) {
      state.session.runEase = Number(session.runEase);
    }

    if (Number.isFinite(Number(session.runEaseRemaining))) {
      state.session.runEaseRemaining = Math.max(0, Number(session.runEaseRemaining));
    }

    if (Number.isFinite(Number(session.currentEncounterId ?? session.encounterId))) {
      state.session.currentEncounterId = Number(session.currentEncounterId ?? session.encounterId);
    } else if (Array.isArray(economy.encounterRange) && economy.encounterRange.length === 2) {
      state.session.currentEncounterId = Math.max(
        Number(economy.encounterRange[0] ?? 1),
        Number(state.session.currentEncounterId ?? 1)
      );
    }

    if (typeof session.mode === "string" && session.mode.trim()) {
      state.session.mode = session.mode.trim().toLowerCase();
    }

    if (typeof session.guestTypeSelected === "string" && session.guestTypeSelected.trim()) {
      state.session.guestTypeSelected = session.guestTypeSelected.trim().toLowerCase();
    }

    if (Number.isFinite(Number(session.runId))) {
      state.run.runId = Math.max(state.run.runId || 0, Number(session.runId));
    }

    const canonicalRun = c.run && typeof c.run === "object" ? c.run : {};
    if (canonicalRun.scoredThisRun && typeof canonicalRun.scoredThisRun === "object") {
      state.run.scoredThisRun = structuredClone(canonicalRun.scoredThisRun);
    }

    const canonicalRewards = c.rewards && typeof c.rewards === "object" ? c.rewards : {};
    const canonicalMirror = c.mirror && typeof c.mirror === "object" ? c.mirror : null;
    if (canonicalRewards.encounters && typeof canonicalRewards.encounters === "object") {
      state.rewards.encounters = structuredClone(canonicalRewards.encounters);
    }
    if (canonicalRewards.drills && typeof canonicalRewards.drills === "object") {
      state.rewards.drills = structuredClone(canonicalRewards.drills);
    }
    if (canonicalRewards.timedChallenges && typeof canonicalRewards.timedChallenges === "object") {
      state.rewards.timedChallenges = structuredClone(canonicalRewards.timedChallenges);
    }
    if (canonicalRewards.premiumByEncounter && typeof canonicalRewards.premiumByEncounter === "object") {
      state.rewards.premiumByEncounter = structuredClone(canonicalRewards.premiumByEncounter);
    }
    if (canonicalRewards.legacy && typeof canonicalRewards.legacy === "object") {
      state.rewards.legacy = structuredClone(canonicalRewards.legacy);
    }
    if (canonicalMirror) {
      state.mirror = structuredClone(canonicalMirror);
    }

    state = normalize(state, state.identity);
    logProgressionConsistency(state);
    save();
    emit();
    return { ok: true, points: state.points, tier: deriveTier(state.points) };
  }

  function applyEncounterResult({
    encounterId,
    success,
    pointEligible,
    encounterKey = null,
    tier = null,
    effectiveDifficulty = null,
    pressureLevel = null,
    performanceGrade = null,
    premiumAchieved = false,
  } = {}) {
    const id = String(encounterId || "").trim();
    const scoreKey = String(encounterKey || id || "").trim();

    state.difficulty.lastUpdatedAt = Date.now();
    state.run = state.run || {};
    state.run.scoredThisRun = state.run.scoredThisRun || {};
    if (!state.rewards) state.rewards = {};
    if (!state.rewards.encounters) state.rewards.encounters = {};

    if (success) {
      state.history.successCount += 1;

      if (id && !state.history.completedEncounterIds.includes(id)) {
        state.history.completedEncounterIds.push(id);
      }

      if (pointEligible && scoreKey && !state.run.scoredThisRun[scoreKey]) {
        const resolvedTier = Number(
          tier ||
          deriveTier(Number(state.points || 0))
        );

        const resolvedQuality = resolveEncounterQualityState({
          performanceGrade,
          success,
        });

        const reward = calculateRewardValue({
          activityType: "encounter",
          tier: resolvedTier,
          effectiveDifficulty,
          pressureLevel,
          qualityState: resolvedQuality,
          competitionType: "normal",
          premiumBonus: premiumAchieved ? 1 : 0,
        });
        console.log("[BC reward output][encounter]", reward);

        if (reward.totalPoints > 0) {
          grantPoints(reward.totalPoints);
        }

        state.run.scoredThisRun[scoreKey] = {
          rewardedAt: Date.now(),
          encounterId: id || null,
          rewardPoints: reward.totalPoints,
          reward,
        };

        state.rewards.encounters[scoreKey] = {
          rewardedAt: Date.now(),
          encounterId: id || null,
          rewardPoints: reward.totalPoints,
          reward,
        };
      }

      // boring difficulty update (don’t tune yet)
      state.difficulty.seed = Math.min(10, state.difficulty.seed + 0.05);
    } else {
      state.history.failCount += 1;
      state.difficulty.seed = Math.max(1, state.difficulty.seed - 0.02);
    }

    if (success && (state.session.runEaseRemaining || 0) > 0) {
      state.session.runEaseRemaining -= 1;
      if (state.session.runEaseRemaining <= 0) {
        state.session.runEase = 1.0;
        state.session.runEaseRemaining = 0;
      }
    }

    // clamp session state after mutation
    state.session.currentEncounterId = clampEncounterByTier(state.session.currentEncounterId, state.points);

    const allowedGT = unlockedGuestTypes(state.points);
    if (!allowedGT.includes(state.session.guestTypeSelected)) state.session.guestTypeSelected = allowedGT[0];

    logProgressionConsistency(state);
    save();
    emit();
  }

  function applyTimedChallengeReward({
    challengeId,
    qualityState = "passed",
    tier = null,
    effectiveDifficulty = null,
    pressureLevel = null,
    premiumAchieved = false,
  } = {}) {
    const id = String(challengeId || "").trim();
    if (!id) {
      return { ok: false, reason: "missing_challenge_id", points: Number(state.points || 0) };
    }

    state.rewards = state.rewards || {};
    state.rewards.timedChallenges = state.rewards.timedChallenges || {};

    if (state.rewards.timedChallenges[id]) {
      return {
        ok: true,
        duplicate: true,
        points: Number(state.points || 0),
        reward: state.rewards.timedChallenges[id]?.reward || null,
      };
    }

    const resolvedTier = Number(
      tier ||
      deriveTier(Number(state.points || 0))
    );

    const reward = calculateRewardValue({
      activityType: "timed_challenge",
      tier: resolvedTier,
      effectiveDifficulty,
      pressureLevel,
      qualityState: qualityState || "passed",
      competitionType: "timed_challenge",
      premiumBonus: premiumAchieved ? 1 : 0,
    });
    console.log("[BC reward output][timed_challenge]", reward);

    if (reward.totalPoints > 0) {
      grantPoints(reward.totalPoints);
    }

    state.rewards.timedChallenges[id] = {
      challengeId: id,
      qualityState: qualityState || "passed",
      rewardedAt: Date.now(),
      rewardPoints: reward.totalPoints,
      reward,
    };

    logProgressionConsistency(state);
    save();
    emit();
    return { ok: true, duplicate: false, points: Number(state.points || 0), reward };
  }

  function applyDisplayMethodChallengeReward({
    challengeId,
    qualityState = "passed",
    tier = null,
    effectiveDifficulty = null,
    pressureLevel = null,
    premiumAchieved = false,
  } = {}) {
    const id = String(challengeId || "").trim();
    if (!id) {
      return { ok: false, reason: "missing_challenge_id", points: Number(state.points || 0) };
    }

    state.rewards = state.rewards || {};
    state.rewards.displayMethodChallenges = state.rewards.displayMethodChallenges || {};

    if (state.rewards.displayMethodChallenges[id]) {
      return {
        ok: true,
        duplicate: true,
        points: Number(state.points || 0),
        reward: state.rewards.displayMethodChallenges[id]?.reward || null,
      };
    }

    const resolvedTier = Number(
      tier ||
      deriveTier(Number(state.points || 0))
    );

    const reward = calculateRewardValue({
      activityType: "display_method_challenge",
      tier: resolvedTier,
      effectiveDifficulty,
      pressureLevel,
      qualityState: qualityState || "passed",
      competitionType: "display_method_challenge",
      premiumBonus: premiumAchieved ? 1 : 0,
    });
    console.log("[BC reward output][display_method_challenge]", reward);

    if (reward.totalPoints > 0) {
      grantPoints(reward.totalPoints);
    }

    state.rewards.displayMethodChallenges[id] = {
      challengeId: id,
      qualityState: qualityState || "passed",
      rewardedAt: Date.now(),
      rewardPoints: reward.totalPoints,
      reward,
    };

    logProgressionConsistency(state);
    save();
    emit();
    return { ok: true, duplicate: false, points: Number(state.points || 0), reward };
  }

  function applyDrillReward({
    assignedMessageId,
    repsDone,
    repTarget,
    accuracy = null,
    qualityScore = null,
    tier = null,
    effectiveDifficulty = null,
    pressureLevel = null,
  } = {}) {
    const id = String(assignedMessageId || "").trim();
    if (!id) {
      return { ok: false, reason: "missing_assigned_message_id", points: Number(state.points || 0) };
    }

    state.rewards = state.rewards || {};
    state.rewards.drills = state.rewards.drills || {};

    if (state.rewards.drills[id]) {
      return {
        ok: true,
        duplicate: true,
        points: Number(state.points || 0),
        reward: state.rewards.drills[id]?.reward || null,
      };
    }

    const resolvedTier = Number(
      tier ||
      deriveTier(Number(state.points || 0))
    );

    const qualityState = resolveDrillQualityState({
      repsDone,
      repTarget,
      accuracy,
      qualityScore,
    });

    const reward = calculateRewardValue({
      activityType: "drill",
      tier: resolvedTier,
      effectiveDifficulty,
      pressureLevel,
      qualityState,
      competitionType: "normal",
      premiumBonus: 0,
    });
    console.log("[BC reward output][drill]", reward);

    if (reward.totalPoints > 0) {
      grantPoints(reward.totalPoints);
    }

    state.rewards.drills[id] = {
      assignedMessageId: id,
      repsDone: Number(repsDone || 0),
      repTarget: Number(repTarget || 0),
      accuracy: Number.isFinite(Number(accuracy)) ? Number(accuracy) : null,
      qualityScore: Number.isFinite(Number(qualityScore)) ? Number(qualityScore) : null,
      qualityState,
      rewardedAt: Date.now(),
      rewardPoints: reward.totalPoints,
      reward,
    };

    logProgressionConsistency(state);
    save();
    emit();
    return { ok: true, duplicate: false, points: Number(state.points || 0), reward };
  }

  function applyPremiumBonus({ encounterId, bonusPoints = 1 }) {
    const id = String(encounterId || "").trim();
    const pts = Math.max(0, Number(bonusPoints || 0));
    if (!id) {
      return {
        ok: false,
        reason: "missing_encounter_id",
        points: Number(state.points || 0),
      };
    }
    if (!pts) {
      return {
        ok: false,
        reason: "no_bonus_points",
        points: Number(state.points || 0),
      };
    }

    state.rewards = state.rewards || {};
    state.rewards.premiumByEncounter = state.rewards.premiumByEncounter || {};

    if (state.rewards.premiumByEncounter[id]) {
      return { ok: true, duplicate: true, points: Number(state.points || 0) };
    }

    grantPoints(pts);
    state.rewards.premiumByEncounter[id] = {
      encounterId: id,
      rewardPoints: pts,
      rewardedAt: Date.now(),
    };

    logProgressionConsistency(state);
    save();
    emit();
    return { ok: true, duplicate: false, points: Number(state.points || 0) };
  }

  function getSelectors() {
    return {
      subscribe,
      getState,
      selectors: {
        tier: () => deriveTier(state.points),
        points: () => state.points,
        difficultySeed: () => state.difficulty.seed,
        effectiveDifficultySeed: () => state.difficulty.seed * (state.session.runEase || 1.0),
        runEase: () => state.session.runEase || 1.0,
        runEaseRemaining: () => state.session.runEaseRemaining || 0,
        guestTypes: () => unlockedGuestTypes(state.points),
        tones: () => getAvailableTones(),
        modes: () => unlockedModes(state.points),
        encounterRange: () => encounterRangeForPoints(state.points)
      },
      actions: {
        resetEncounterFlow,
        resetRunScoring,
        setSessionSelection,
        hydrateFromCanonicalState,
        applyEncounterResult,
        applyTimedChallengeReward,
        applyDisplayMethodChallengeReward,
        applyDrillReward,
        applyPremiumBonus
      }
    };
  }

  return { init };
}
