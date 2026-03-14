import { ENCOUNTERS, tierFromEncounterNumber } from "../src/game/encounter.ts";
import { computeReaction } from "../src/game/engine.ts";

const GUEST = Object.freeze({
  DECIDER: "decider",
  FANCY: "fancy",
  GRIEVER: "griever",
  CELEBRATOR: "celebrator",
  BARGAIN_SMART: "bargain_smart",
});

const MODE_MAP_BY_TIER = {
  1: {
    [GUEST.DECIDER]: { optimal: "guide", neutral: "scout", damaging: "charm" },
    [GUEST.BARGAIN_SMART]: { optimal: "scout", neutral: "guide", damaging: "charm" },
    [GUEST.FANCY]: { optimal: "charm", neutral: "guide", damaging: "scout" },
    [GUEST.GRIEVER]: { optimal: "scout", neutral: "guide", damaging: "charm" },
    [GUEST.CELEBRATOR]: { optimal: "charm", neutral: "guide", damaging: "scout" },
  },
  2: {
    [GUEST.DECIDER]: { optimal: "authority", neutral: "guide", damaging: "charm" },
    [GUEST.BARGAIN_SMART]: { optimal: "scout", neutral: "authority", damaging: "charm" },
    [GUEST.FANCY]: { optimal: "guide", neutral: "authority", damaging: "scout" },
    [GUEST.GRIEVER]: { optimal: "scout", neutral: "guide", damaging: "authority" },
    [GUEST.CELEBRATOR]: { optimal: "authority", neutral: "guide", damaging: "scout" },
  },
  3: {
    [GUEST.DECIDER]: { optimal: "authority", neutral: "guide", damaging: "charm" },
    [GUEST.BARGAIN_SMART]: { optimal: "scout", neutral: "authority", damaging: "charm" },
    [GUEST.FANCY]: { optimal: "guide", neutral: "authority", damaging: "scout" },
    [GUEST.GRIEVER]: { optimal: "scout", neutral: "guide", damaging: "authority" },
    [GUEST.CELEBRATOR]: { optimal: "authority", neutral: "guide", damaging: "scout" },
  },
};

const HOOK_MAP_BY_GUEST = {
  [GUEST.DECIDER]: { optimal: "VALUE", neutral: "FLAVOUR", damaging: "STORY" },
  [GUEST.BARGAIN_SMART]: { optimal: "VALUE", neutral: "FLAVOUR", damaging: "STORY" },
  [GUEST.FANCY]: { optimal: "STORY", neutral: "FLAVOUR", damaging: "VALUE" },
  [GUEST.GRIEVER]: { optimal: "FLAVOUR", neutral: "STORY", damaging: "VALUE" },
  [GUEST.CELEBRATOR]: { optimal: "STORY", neutral: "FLAVOUR", damaging: "VALUE" },
};

const SCENARIOS = [
  {
    id: "optimal",
    guestRead: true,
    modeKey: "optimal",
    hookKey: "optimal",
    deliveryCorrect: true,
    expectedOutcome: "clean_close",
    minSignalRank: 2,
  },
  {
    id: "recovery_window",
    guestRead: true,
    modeKey: "optimal",
    hookKey: "neutral",
    deliveryCorrect: false,
    reportOnly: true,
  },
  {
    id: "failure",
    guestRead: false,
    modeKey: "damaging",
    hookKey: "damaging",
    deliveryCorrect: false,
    expectedOutcome: "recovery",
    maxSignalRank: 1,
  },
];

function normalizeGuestType(raw) {
  return String(raw || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function canonicalGuestType(raw) {
  const g = normalizeGuestType(raw);
  if (g === "budget_guard") return GUEST.FANCY;
  if (g === "make_it_easy") return GUEST.CELEBRATOR;
  if (g === "analyst") return GUEST.BARGAIN_SMART;
  if (g === "browser" || g === "alpha") return GUEST.DECIDER;
  return g;
}

function canonicalModeFromUi(mode) {
  const raw = String(mode || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "auth") return "authority";
  if (raw === "close") return "closer";
  if (raw === "hold") return "scout";
  if (raw === "direct" || raw === "push" || raw === "reflect") return "guide";
  if (raw === "lead") return "authority";
  return raw;
}

function difficultyPolicy(d) {
  d = Math.max(1, Math.min(7, Number(d || 1)));
  return {
    d,
    pivotChance: d <= 2 ? 0.1 : d <= 4 ? 0.2 : d <= 6 ? 0.35 : 0.45,
    hookStrictness: d <= 2 ? "lenient" : d <= 4 ? "normal" : d <= 6 ? "strict" : "hard",
  };
}

function getEncounterTier(encounter) {
  const raw = Number(encounter?.meta?.tier || encounter?.tier || 0);
  return raw || tierFromEncounterNumber(Number(encounter?.encounterNumber || 1));
}

function getModeRule(encounter) {
  const tier = getEncounterTier(encounter);
  const guest = canonicalGuestType(encounter?.guestStateActual);
  return MODE_MAP_BY_TIER[tier]?.[guest] || { optimal: "guide", neutral: "scout", damaging: "charm" };
}

function getHookRule(encounter) {
  const guest = canonicalGuestType(encounter?.guestStateActual);
  return HOOK_MAP_BY_GUEST[guest] || { optimal: "VALUE", neutral: "FLAVOUR", damaging: "STORY" };
}

function applyHookStrictness(status, strictness) {
  if (strictness === "lenient") return status === "neutral" ? "optimal" : status;
  if (strictness === "strict") return status === "neutral" ? "damaging" : status;
  if (strictness === "hard") return status === "optimal" ? "optimal" : "damaging";
  return status;
}

function tierToScore(tier) {
  if (tier === "right" || tier === "optimal") return 2;
  if (tier === "slightly" || tier === "neutral") return 1;
  return 0;
}

function signalRank(signal) {
  if (signal === "green") return 2;
  if (signal === "yellow") return 1;
  return 0;
}

function getRepresentativeHookMeta(hookStatus) {
  if (hookStatus === "optimal") {
    return {
      deciderHookType: "guest_centered",
      deciderHookText: "Quick, easy, safe pick. I would go with this.",
    };
  }
  if (hookStatus === "neutral") {
    return {
      deciderHookType: "diagnostic",
      deciderHookText: "Red or white tonight?",
    };
  }
  return {
    deciderHookType: "outcome_centered",
    deciderHookText: "Our best premium bottle is the move tonight.",
  };
}

function buildScenarioEvaluation(encounter, scenario) {
  const modeRule = getModeRule(encounter);
  const hookRule = getHookRule(encounter);
  const difficulty = Number(encounter?.difficulty || encounter?.meta?.difficulty || 1);
  const policy = difficultyPolicy(difficulty);

  const chosenMode = canonicalModeFromUi(modeRule[scenario.modeKey]);
  const rawHookStatus =
    scenario.hookKey === "optimal" ? "optimal" :
    scenario.hookKey === "neutral" ? "neutral" :
    "damaging";
  const hookStatus = applyHookStrictness(rawHookStatus, policy.hookStrictness);
  const modeStatus =
    scenario.modeKey === "optimal" ? "optimal" :
    scenario.modeKey === "neutral" ? "neutral" :
    "damaging";
  const hookType = hookRule[scenario.hookKey];
  const deliveryScore = scenario.deliveryCorrect ? 2 : 0;

  let total =
    tierToScore(scenario.guestRead ? "right" : "wrong") +
    tierToScore(modeStatus) +
    tierToScore(hookStatus) +
    deliveryScore;

  const cleanCloseThreshold = 6;
  const softCloseThreshold = 4;
  const recoveryPivotThreshold = 1;

  let outcome = "recovery";
  if (total >= cleanCloseThreshold) outcome = "clean_close";
  else if (total >= softCloseThreshold) outcome = "soft_close";
  else if (total >= recoveryPivotThreshold) outcome = "soft_close";

  const repHook = getRepresentativeHookMeta(hookStatus);
  const reaction = computeReaction({
    guestRead: scenario.guestRead,
    deliveryCorrect: scenario.deliveryCorrect,
    firstMode: chosenMode,
    guestStateActual: String(encounter?.guestStateActual || ""),
    modeSelected: chosenMode,
    deciderMode: chosenMode,
    hookType,
    hookText: repHook.deciderHookText,
    deciderHookType: repHook.deciderHookType,
    deciderHookText: repHook.deciderHookText,
    modeStatus,
    hookStatus,
    resetUsed: false,
    powerMoveAllowed: true,
    tier: getEncounterTier(encounter),
  });

  return {
    policy,
    chosenMode,
    hookType,
    guestRead: scenario.guestRead,
    modeStatus,
    hookStatus,
    deliveryCorrect: scenario.deliveryCorrect,
    total,
    outcome,
    reaction,
  };
}

function scenarioPasses(expectation, evaluation) {
  if (expectation.reportOnly) return [];
  const failures = [];

  if (expectation.expectedOutcome && evaluation.outcome !== expectation.expectedOutcome) {
    failures.push(`expected outcome=${expectation.expectedOutcome}, got=${evaluation.outcome}`);
  }
  if (
    expectation.expectedOutcomeOneOf &&
    !expectation.expectedOutcomeOneOf.includes(evaluation.outcome)
  ) {
    failures.push(`expected outcome in [${expectation.expectedOutcomeOneOf.join(", ")}], got=${evaluation.outcome}`);
  }
  if (
    Number.isFinite(expectation.minSignalRank) &&
    signalRank(evaluation.reaction.chainSignal) < expectation.minSignalRank
  ) {
    failures.push(`expected signal >= ${expectation.minSignalRank}, got=${evaluation.reaction.chainSignal}`);
  }
  if (
    Number.isFinite(expectation.maxSignalRank) &&
    signalRank(evaluation.reaction.chainSignal) > expectation.maxSignalRank
  ) {
    failures.push(`expected signal <= ${expectation.maxSignalRank}, got=${evaluation.reaction.chainSignal}`);
  }

  return failures;
}

function runPack(name, encounters) {
  const rows = [];

  for (const encounter of encounters) {
    for (const scenario of SCENARIOS) {
      const evaluation = buildScenarioEvaluation(encounter, scenario);
      const failures = scenarioPasses(scenario, evaluation);
      rows.push({
        pack: name,
        encounterNumber: encounter.encounterNumber,
        guest: encounter.guestStateActual,
        difficulty: Number(encounter?.difficulty || encounter?.meta?.difficulty || 1),
        scenario: scenario.id,
        reportOnly: !!scenario.reportOnly,
        ok: failures.length === 0,
        failures,
        evaluation,
      });
    }
  }

  return rows;
}

function printResults(rows) {
  const byPack = new Map();
  rows.forEach((row) => {
    const bucket = byPack.get(row.pack) || [];
    bucket.push(row);
    byPack.set(row.pack, bucket);
  });

  console.log("Encounter passability sweep");
  console.log("==========================");
  for (const [pack, bucket] of byPack) {
    const asserted = bucket.filter((row) => !row.reportOnly);
    const ok = asserted.filter((row) => row.ok).length;
    console.log(`${pack}: ${ok}/${asserted.length} asserted scenario checks passed`);
  }

  const observations = rows.filter((row) => row.reportOnly);
  if (observations.length) {
    console.log("\nRecovery-window observations");
    observations.forEach((row) => {
      console.log(
        `- ${row.pack} #${row.encounterNumber}: reaction=${row.evaluation.reaction.chainSignal}:${row.evaluation.reaction.chainScore} ` +
        `outcome=${row.evaluation.outcome}:${row.evaluation.total} mode=${row.evaluation.chosenMode} hook=${row.evaluation.hookType} ` +
        `statuses=${row.evaluation.modeStatus}/${row.evaluation.hookStatus}`
      );
    });
  }

  const failures = rows.filter((row) => !row.reportOnly && !row.ok);
  if (!failures.length) {
    console.log("\nAll encounter scenarios passed.");
    return;
  }

  console.log(`\nFailures (${failures.length})`);
  failures.forEach((row) => {
    console.log(
      `- ${row.pack} #${row.encounterNumber} ${row.scenario}: ${row.failures.join("; ")}`
    );
    console.log(
      `  guest=${row.guest} d=${row.difficulty} mode=${row.evaluation.chosenMode} hook=${row.evaluation.hookType} ` +
      `statuses=${row.evaluation.modeStatus}/${row.evaluation.hookStatus} delivery=${row.evaluation.deliveryCorrect} ` +
      `reaction=${row.evaluation.reaction.chainSignal}:${row.evaluation.reaction.chainScore} outcome=${row.evaluation.outcome}:${row.evaluation.total}`
    );
  });
}

const rows = [
  ...runPack("demo", ENCOUNTERS.demo || []),
  ...runPack("premium", ENCOUNTERS.premium || []),
];

printResults(rows);

if (rows.some((row) => !row.reportOnly && !row.ok)) {
  process.exitCode = 1;
}
