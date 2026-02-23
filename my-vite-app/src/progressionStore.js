// progressionStore.js
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

  function deriveTier(points) {
    if (points >= 10) return 3;
    if (points >= 5) return 2;
    return 1;
  }

  function unlockedGuestTypes(points) {
    const pts = Number(points || 0);
    const tier = pts >= 10 ? 3 : pts >= 5 ? 2 : 1;
    const base = ["decider", "bargain_smart", "griever"];
    if (tier >= 2) base.push("budget_guard");
    if (tier >= 3) base.push("make_it_easy");
    return base;
  }

  function unlockedModes(points) {
    // Keep boring for now
    return ["standard"];
  }

  function clampEncounterByTier(encounterId, points) {
    const tier = deriveTier(points);
    const max = tier === 1 ? 5 : tier === 2 ? 12 : 20;
    const min = 1;
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
        mode: "standard",
        guestTypeSelected: "Decider",
        runEase: 1.0,
        runEaseRemaining: 0
      }
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
    s.session.mode = typeof s.session.mode === "string" ? s.session.mode : "standard";
    s.session.guestTypeSelected = typeof s.session.guestTypeSelected === "string" ? s.session.guestTypeSelected : "Decider";
    if (!Number.isFinite(s.session.runEase)) s.session.runEase = 1.0;
    if (!Number.isFinite(s.session.runEaseRemaining)) s.session.runEaseRemaining = 0;

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

  function applyEncounterResult({ encounterId, success, pointEligible }) {
    const now = Date.now();
    state.difficulty.lastUpdatedAt = now;

    if (success) {
      state.history.successCount += 1;

      if (!state.history.completedEncounterIds.includes(encounterId)) {
        state.history.completedEncounterIds.push(encounterId);
      }

      if (pointEligible) {
        state.points += 1; // points drive tier unlocks
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

    save();
    emit();
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
        modes: () => unlockedModes(state.points),
        encounterRange: () => {
          const tier = deriveTier(state.points);
          return tier === 1 ? [1, 5] : tier === 2 ? [1, 12] : [1, 20];
        }
      },
      actions: { resetEncounterFlow, setSessionSelection, applyEncounterResult }
    };
  }

  return { init };
}
