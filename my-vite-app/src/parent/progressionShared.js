// src/parent/progressionShared.js

export function normalizeProgressionTierFromEncounterNumber(encounterNumber, fallback = 1) {
  const n = Number(encounterNumber);
  if (Number.isFinite(n)) {
    if (n >= 1 && n <= 5) return 1;
    if (n >= 6 && n <= 12) return 2;
    return 3;
  }

  const f = Number(fallback);
  if (f <= 1) return 1;
  if (f >= 3) return 3;
  return 2;
}

export function normalizeProgressionSnapshot(snapshot = null) {
  if (!snapshot || typeof snapshot !== "object") return null;

  const encountersTotal = Math.max(0, Number(snapshot.encountersTotal ?? snapshot.encounters_total ?? 0) || 0);
  const last10Count = Math.max(0, Number(snapshot.last10Count ?? snapshot.last10_count ?? 0) || 0);
  const last10Greens = Math.max(0, Number(snapshot.last10Greens ?? snapshot.last10_greens ?? 0) || 0);
  const last10Reds = Math.max(0, Number(snapshot.last10Reds ?? snapshot.last10_reds ?? 0) || 0);
  const pivotsTaken = Math.max(0, Number(snapshot.pivotsTaken ?? snapshot.pivots_taken ?? 0) || 0);
  const pivotsSuccess = Math.max(0, Number(snapshot.pivotsSuccess ?? snapshot.pivots_success ?? 0) || 0);
  const anyRedT2Plus = !!(snapshot.anyRedT2Plus ?? snapshot.any_red_t2plus);

  const normalized = {
    encountersTotal,
    last10Count,
    last10Greens,
    last10Reds,
    anyRedT2Plus,
    pivotsTaken,
    pivotsSuccess,
  };

  const hasSignal =
    encountersTotal > 0 ||
    last10Count > 0 ||
    last10Greens > 0 ||
    last10Reds > 0 ||
    pivotsTaken > 0 ||
    pivotsSuccess > 0 ||
    anyRedT2Plus;

  return hasSignal ? normalized : null;
}

export function getLivePremiumIframeProgressionState() {
  if (typeof window === "undefined" || typeof document === "undefined") return null;

  const iframe = document.getElementById("premiumRootFrame");
  const frameWin = iframe?.contentWindow || null;
  const state = frameWin?.__BC_STATE__?.get?.() || null;
  const ctx = state?.ctx || frameWin?.__BC_CTX__ || null;

  if (!state && !ctx) return null;

  return {
    iframe,
    frameWin,
    state,
    ctx,
    progression: state?.runtime?.progression || frameWin?.PROG || null,
  };
}

export function logLiveProgressionContractCheck(userId, restaurantId) {
  const live = getLivePremiumIframeProgressionState();
  if (!live?.state && !live?.ctx) return live;

  const ctxMatches =
    String(live?.ctx?.userId || "") === String(userId || "") &&
    String(live?.ctx?.restaurantId || "") === String(restaurantId || "");

  console.log("[BC] progression bc-ctx/bc-state check", {
    ctxMatches,
    ctxReady: !!live?.state?.ctxReady,
    progressionReady: !!live?.state?.progressionReady,
    stateHealth: live?.state?.stateHealth || null,
  });

  if (!ctxMatches) {
    console.warn("[BC] progression bc-ctx/bc-state mismatch", {
      expectedUserId: userId,
      expectedRestaurantId: restaurantId,
      liveUserId: live?.ctx?.userId || null,
      liveRestaurantId: live?.ctx?.restaurantId || null,
    });
  }

  return live;
}

export function extractLiveProgressionSnapshot(live = null) {
  const progression = live?.progression && typeof live.progression === "object" ? live.progression : null;
  if (!progression) return null;

  return (
    normalizeProgressionSnapshot(progression?.snapshot) ||
    normalizeProgressionSnapshot(progression?.result?.snapshot) ||
    normalizeProgressionSnapshot(progression?.authority?.payload?.snapshot) ||
    normalizeProgressionSnapshot(progression?.authority?.snapshot) ||
    normalizeProgressionSnapshot(progression?.payload?.snapshot) ||
    null
  );
}

export function classifyEncounterResolutionForProgression(row = {}) {
  const payload = row?.payload && typeof row.payload === "object" ? row.payload : {};
  const checks = payload?.checks && typeof payload.checks === "object" ? payload.checks : {};
  const pivot = payload?.pivot && typeof payload.pivot === "object" ? payload.pivot : {};

  const performanceGrade = String(
    payload?.performanceGrade ??
    payload?.performance_grade ??
    row?.performance_grade ??
    row?.latest_grade ??
    ""
  ).trim().toUpperCase();
  const chainSignal = String(
    payload?.chainSignal ??
    payload?.chain_signal ??
    row?.chain_signal ??
    row?.latest_chain_signal ??
    ""
  ).trim().toLowerCase();
  const chainScore = Number(
    payload?.chainScore ??
    payload?.chain_score ??
    row?.chain_score ??
    row?.latest_chain_score ??
    NaN
  );

  const isGreen =
    row?.is_green === true ||
    checks?.modeStatus === "optimal" ||
    checks?.hookStatus === "optimal" ||
    !!checks?.deliveryCorrect ||
    chainSignal === "green" ||
    performanceGrade === "A" ||
    performanceGrade === "B" ||
    (Number.isFinite(chainScore) && chainScore >= 3);

  const isRed =
    row?.is_red === true ||
    chainSignal === "red" ||
    performanceGrade === "C" ||
    performanceGrade === "D" ||
    performanceGrade === "F" ||
    (!!checks?.readCorrect === false && !!checks?.deliveryCorrect === false && chainScore <= 0);

  const encounterNumber = Number(
    payload?.encounterNumber ??
    payload?.encounter_number ??
    row?.encounter_number ??
    NaN
  );
  const tier = normalizeProgressionTierFromEncounterNumber(
    Number.isFinite(Number(payload?.tier)) ? Number(payload.tier) : null,
    Number.isFinite(encounterNumber) ? encounterNumber : null
  );

  const pivotTaken =
    pivot?.taken === true ||
    payload?.pivotTaken === true ||
    payload?.pivot_taken === true ||
    row?.pivot_taken === true ||
    !!payload?.recoveryChoice ||
    !!payload?.resetUsed;

  const pivotSuccess =
    pivot?.success === true ||
    payload?.pivotSuccess === true ||
    payload?.pivot_success === true ||
    row?.pivot_success === true ||
    payload?.recoveryCorrect === true ||
    payload?.pivotCorrect === true;

  return {
    tier,
    isGreen,
    isRed,
    pivotTaken,
    pivotSuccess,
    checks,
  };
}
