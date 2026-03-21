import { BC_TYPES } from "../bcMessages.js";

const STORAGE_KEY = "bc_tournament_bridge_v1";

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function loadState(storage) {
  try {
    const raw = storage?.getItem?.(STORAGE_KEY);
    if (!raw) return { definitions: {}, runtimes: {} };
    const parsed = JSON.parse(raw);
    return {
      definitions: parsed?.definitions && typeof parsed.definitions === "object" ? parsed.definitions : {},
      runtimes: parsed?.runtimes && typeof parsed.runtimes === "object" ? parsed.runtimes : {},
    };
  } catch {
    return { definitions: {}, runtimes: {} };
  }
}

function saveState(storage, state) {
  try {
    storage?.setItem?.(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function createStore(storage = globalThis?.window?.localStorage) {
  let state = loadState(storage);

  function commit(next) {
    state = next;
    saveState(storage, state);
    return state;
  }

  return {
    getState() {
      return state;
    },
    getDefinition(tournamentId) {
      return state.definitions?.[tournamentId] || null;
    },
    getRuntime(tournamentId) {
      return state.runtimes?.[tournamentId] || null;
    },
    put(definition, runtime) {
      const next = {
        definitions: {
          ...state.definitions,
          [definition.tournamentId]: clone(definition),
        },
        runtimes: {
          ...state.runtimes,
          [definition.tournamentId]: clone(runtime),
        },
      };
      commit(next);
      return {
        definition: next.definitions[definition.tournamentId],
        runtime: next.runtimes[definition.tournamentId],
      };
    },
    updateRuntime(tournamentId, updater) {
      const current = state.runtimes?.[tournamentId] || null;
      const nextRuntime = updater(clone(current));
      const next = {
        ...state,
        runtimes: {
          ...state.runtimes,
          [tournamentId]: clone(nextRuntime),
        },
      };
      commit(next);
      return next.runtimes[tournamentId];
    },
  };
}

function resolveTournamentId(state, requestedId = null) {
  const explicit = String(requestedId || "").trim();
  if (explicit) return explicit;

  const entries = Object.entries(state.runtimes || {});
  const active = entries.find(([, runtime]) => runtime?.status === "active");
  if (active) return active[0];

  const ready = entries.find(([, runtime]) => runtime?.status === "ready");
  if (ready) return ready[0];

  return Object.keys(state.definitions || {})[0] || null;
}

function buildRuntimeSkeleton(tournamentId) {
  return {
    tournamentId,
    status: "ready",
    currentEntryIndex: 0,
    startedAt: null,
    completedAt: null,
    activeEntry: null,
    restore: null,
    results: [],
    totals: {
      entriesPlayed: 0,
      wins: 0,
      losses: 0,
      totalScore: 0,
    },
  };
}

function isValidStrictness(value) {
  return value == null || ["easy", "normal", "hard"].includes(String(value));
}

function assertTournamentAdvanceAllowed(runtime, completedEntry) {
  if (!runtime || String(runtime.status || "") !== "active") {
    throw new Error("Tournament is not active.");
  }

  if (!runtime.activeEntry) {
    throw new Error("Tournament has no active entry.");
  }

  const expectedEntryId = String(runtime.activeEntry.entryId || "");
  const expectedRunId = String(runtime.activeEntry.encounterRunId || "");
  const actualEntryId = String(completedEntry?.entryId || "");
  const actualRunId = String(completedEntry?.runId || "");

  if (!expectedEntryId || !expectedRunId) {
    throw new Error("Tournament active entry identity is incomplete.");
  }

  if (actualEntryId !== expectedEntryId) {
    throw new Error(`Tournament entryId mismatch. Expected ${expectedEntryId}, got ${actualEntryId}.`);
  }

  if (actualRunId !== expectedRunId) {
    throw new Error(`Tournament runId mismatch. Expected ${expectedRunId}, got ${actualRunId}.`);
  }
}

function assertTournamentCheckpointAllowed(runtime, restore) {
  if (!runtime || String(runtime.status || "") !== "active") {
    throw new Error("Tournament is not active.");
  }

  if (!runtime.activeEntry) {
    throw new Error("Tournament has no active entry.");
  }

  const expectedRunId = String(runtime.activeEntry.encounterRunId || "");
  const expectedEncounterId = String(runtime.activeEntry.encounterId || "");
  const actualRunId = String(restore?.runId || "");
  const actualEncounterId = String(restore?.encounterId || "");

  if (!expectedRunId || !expectedEncounterId) {
    throw new Error("Tournament active entry restore identity is incomplete.");
  }

  if (actualRunId !== expectedRunId) {
    throw new Error(`Tournament checkpoint runId mismatch. Expected ${expectedRunId}, got ${actualRunId}.`);
  }

  if (actualEncounterId !== expectedEncounterId) {
    throw new Error(`Tournament checkpoint encounterId mismatch. Expected ${expectedEncounterId}, got ${actualEncounterId}.`);
  }
}

function buildTournamentRunId(tournamentId, entryIndex, ordinal = 1) {
  return `${String(tournamentId || "tournament")}::${Number(entryIndex || 0)}::run_${Number(ordinal || 1)}`;
}

function buildTournamentTimer(entry, now = Date.now()) {
  const durationSec = Math.max(60, Number(entry?.timerSec || 300) || 300);
  return {
    startedAt: now,
    expiresAt: now + durationSec * 1000,
    durationSec,
  };
}

function buildActiveTournamentEntry(definition, runtime, entry) {
  const tournamentId = String(definition?.tournamentId || "");
  const entryIndex = Number(runtime?.currentEntryIndex || 0) || 0;
  const encounterRunId = buildTournamentRunId(tournamentId, entryIndex, 1);
  const seedBase =
    String(definition?.rules?.sharedSeed || "").trim() ||
    tournamentId ||
    "tournament_seed";

  const kind = String(entry?.kind || "encounter");
  const active = {
    entryId: String(entry?.entryId || ""),
    kind,
    encounterId: String(
      kind === "encounter"
        ? (entry?.encounterId || "")
        : (entry?.baseEncounterId || "")
    ),
    encounterRunId,
    seed: `${seedBase}::${entryIndex}::${String(entry?.entryId || "")}`,
    timer: null,
    challengeMeta: null,
  };

  if (kind === "timed_challenge") {
    active.timer = buildTournamentTimer(entry);
    active.challengeMeta = {
      challengeKey: entry?.challengeKey || null,
      placement: entry?.placement || "before_start",
      title: entry?.title || "Timed Challenge",
    };
  }

  if (kind === "display_method_challenge") {
    active.timer = buildTournamentTimer(entry);
    active.challengeMeta = {
      challengeKey: entry?.challengeKey || null,
      placement: entry?.placement || "before_start",
      strictness: entry?.strictness || "normal",
      methodKey: entry?.methodKey || null,
      title: entry?.title || "Display Method Challenge",
    };
  }

  return active;
}

function sanitizeRuntimeRestore(runtime) {
  if (!runtime || !runtime.activeEntry) return runtime;

  const restore = runtime.restore;
  if (!restore || typeof restore !== "object") return runtime;

  const expectedRunId = String(runtime.activeEntry.encounterRunId || "");
  const expectedEncounterId = String(runtime.activeEntry.encounterId || "");
  const actualRunId = String(restore?.runId || "");
  const actualEncounterId = String(restore?.encounterId || "");

  if (expectedRunId && actualRunId && expectedRunId !== actualRunId) {
    return {
      ...runtime,
      restore: null,
    };
  }

  if (expectedEncounterId && actualEncounterId && expectedEncounterId !== actualEncounterId) {
    return {
      ...runtime,
      restore: null,
    };
  }

  return runtime;
}

function validateDefinition(definition, resolveEncounterById) {
  if (!definition || typeof definition !== "object") return "missing_definition";
  if (!String(definition.tournamentId || "").trim()) return "missing_tournament_id";
  if (!["demo", "premium", "drill"].includes(String(definition.mode || ""))) return "invalid_mode";
  if (!Array.isArray(definition.entries) || !definition.entries.length) return "missing_entries";

  const seenEntryIds = new Set();
  for (const entry of definition.entries) {
    const entryId = String(entry?.entryId || "").trim();
    if (!entryId) return "missing_entry_id";
    if (seenEntryIds.has(entryId)) return "duplicate_entry_id";
    seenEntryIds.add(entryId);

    const kind = String(entry?.kind || "");
    if (!["encounter", "timed_challenge", "display_method_challenge"].includes(kind)) {
      return "invalid_entry_kind";
    }

    const encounterId =
      kind === "encounter"
        ? entry?.encounterId
        : entry?.baseEncounterId;
    if (!String(encounterId || "").trim()) return "missing_encounter_id";
    if (!resolveEncounterById(String(encounterId))) return `unknown_encounter:${encounterId}`;

    if ((kind === "timed_challenge" || kind === "display_method_challenge") && !String(entry?.challengeKey || "").trim()) {
      return "missing_challenge_key";
    }

    if (entry?.timerSec != null && Number(entry.timerSec) < 60) return "invalid_timer_sec";
    if (kind === "display_method_challenge" && !isValidStrictness(entry?.strictness)) return "invalid_strictness";
  }

  return null;
}

export function makeTournamentHandlers({
  resolveEncounterById,
  getIframeEpoch,
}) {
  if (typeof resolveEncounterById !== "function") {
    throw new Error("makeTournamentHandlers: resolveEncounterById required");
  }
  if (typeof getIframeEpoch !== "function") {
    throw new Error("makeTournamentHandlers: getIframeEpoch required");
  }

  const store = createStore();

  function replyOk(reply, type, requestId, payload = {}) {
    reply(type, {
      requestId: requestId || null,
      epoch: Number(getIframeEpoch() || 0),
      payload,
    });
  }

  function replyErr(reply, type, requestId, error, extraPayload = {}) {
    reply(type, {
      requestId: requestId || null,
      epoch: Number(getIframeEpoch() || 0),
      payload: {
        ok: false,
        error: String(error || "unknown_error"),
        ...extraPayload,
      },
    });
  }

  function getDefinitionAndRuntime(requestedId) {
    const tournamentId = resolveTournamentId(store.getState(), requestedId);
    if (!tournamentId) return { tournamentId: null, definition: null, runtime: null };
    return {
      tournamentId,
      definition: store.getDefinition(tournamentId),
      runtime: store.getRuntime(tournamentId),
    };
  }

  function setTournamentRuntime(tournamentId, nextRuntime) {
    return store.updateRuntime(tournamentId, () => clone(nextRuntime));
  }

  function getTournamentDefinition(tournamentId) {
    return store.getDefinition(tournamentId);
  }

  function getTournamentRuntime(tournamentId) {
    return store.getRuntime(tournamentId);
  }

  function handleTournamentAdvance(payload = {}) {
    const tournamentId = String(payload?.tournamentId || "").trim();
    const completedEntry = clone(payload?.completedEntry || null);

    if (!tournamentId) {
      throw new Error("Tournament id is required.");
    }

    const definition = getTournamentDefinition(tournamentId);
    const runtime = getTournamentRuntime(tournamentId);

    if (!definition) {
      throw new Error(`Tournament definition not found for ${tournamentId}.`);
    }

    if (!runtime) {
      throw new Error(`Tournament runtime not found for ${tournamentId}.`);
    }

    assertTournamentAdvanceAllowed(runtime, completedEntry);

    const entries = Array.isArray(definition?.entries) ? definition.entries : [];
    const nextIndex = Number(runtime.currentEntryIndex || 0) + 1;
    const results = [...(Array.isArray(runtime.results) ? runtime.results : []), completedEntry];
    const prevTotals = runtime?.totals || {
      entriesPlayed: 0,
      wins: 0,
      losses: 0,
      totalScore: 0,
    };

    const nextRuntime = {
      ...runtime,
      restore: null,
      lastCompletedEntry: {
        ...completedEntry,
      },
      results,
      totals: {
        entriesPlayed: Number(prevTotals.entriesPlayed || 0) + 1,
        wins: Number(prevTotals.wins || 0) + (completedEntry?.outcome === "win" ? 1 : 0),
        losses: Number(prevTotals.losses || 0) + (completedEntry?.outcome === "win" ? 0 : 1),
        totalScore: Number(prevTotals.totalScore || 0) + (Number(completedEntry?.score || 0) || 0),
      },
    };

    if (nextIndex >= entries.length) {
      nextRuntime.status = "complete";
      nextRuntime.currentEntryIndex = nextIndex;
      nextRuntime.activeEntry = null;
      nextRuntime.completedAt = Date.now();

      setTournamentRuntime(tournamentId, nextRuntime);

      return {
        definition,
        runtime: nextRuntime,
      };
    }

    const nextEntry = entries[nextIndex];
    nextRuntime.status = "active";
    nextRuntime.currentEntryIndex = nextIndex;
    nextRuntime.activeEntry = buildActiveTournamentEntry(
      definition,
      { ...nextRuntime, currentEntryIndex: nextIndex },
      nextEntry
    );

    setTournamentRuntime(tournamentId, nextRuntime);

    return {
      definition,
      runtime: nextRuntime,
    };
  }

  return {
    [BC_TYPES.TOURNAMENT_CREATE]: async ({ msg, reply }) => {
      const requestId = msg?.requestId || null;
      const definition = clone(msg?.payload?.definition || null);
      const validationError = validateDefinition(definition, resolveEncounterById);
      if (validationError) {
        replyErr(reply, BC_TYPES.TOURNAMENT_CREATED, requestId, validationError);
        return;
      }

      const runtime = buildRuntimeSkeleton(definition.tournamentId);
      const saved = store.put(definition, runtime);
      replyOk(reply, BC_TYPES.TOURNAMENT_CREATED, requestId, {
        ok: true,
        tournamentId: saved.definition.tournamentId,
        version: Number(saved.definition.version || 1),
      });
    },

    [BC_TYPES.TOURNAMENT_SNAPSHOT]: async ({ msg, reply }) => {
      const requestId = msg?.requestId || null;
      const tournamentId = msg?.payload?.tournamentId || null;
      const current = getDefinitionAndRuntime(tournamentId);
      if (!current.definition || !current.runtime) {
        replyErr(reply, BC_TYPES.TOURNAMENT_SNAPSHOT_RESULT, requestId, "tournament_not_found");
        return;
      }

      replyOk(reply, BC_TYPES.TOURNAMENT_SNAPSHOT_RESULT, requestId, {
        definition: current.definition,
        runtime: current.runtime,
      });
    },

    [BC_TYPES.TOURNAMENT_START]: async ({ msg, reply }) => {
      const requestId = msg?.requestId || null;
      const tournamentId = msg?.payload?.tournamentId || null;
      const current = getDefinitionAndRuntime(tournamentId);
      if (!current.definition || !current.runtime) {
        replyErr(reply, BC_TYPES.TOURNAMENT_STARTED, requestId, "tournament_not_found");
        return;
      }
      if (!["ready", "draft"].includes(String(current.runtime.status || ""))) {
        replyErr(reply, BC_TYPES.TOURNAMENT_STARTED, requestId, "tournament_not_ready");
        return;
      }

      const activeEntry = buildActiveTournamentEntry(
        current.definition,
        {
          ...clone(current.runtime),
          currentEntryIndex: 0,
        },
        current.definition.entries[0]
      );
      const runtime = store.updateRuntime(current.definition.tournamentId, () => ({
        ...clone(current.runtime),
        status: "active",
        currentEntryIndex: 0,
        startedAt: Date.now(),
        completedAt: null,
        activeEntry,
        restore: null,
      }));

      replyOk(reply, BC_TYPES.TOURNAMENT_STARTED, requestId, {
        runtime,
      });
    },

    [BC_TYPES.TOURNAMENT_ADVANCE]: async ({ msg, reply }) => {
      const requestId = msg?.requestId || null;
      try {
        const result = handleTournamentAdvance(msg?.payload || {});
        replyOk(reply, BC_TYPES.TOURNAMENT_ADVANCED, requestId, result);
      } catch (error) {
        replyErr(reply, BC_TYPES.TOURNAMENT_ADVANCED, requestId, error?.message || String(error || "Unknown error"));
      }
    },

    [BC_TYPES.TOURNAMENT_RESTORE]: async ({ msg, reply }) => {
      const requestId = msg?.requestId || null;
      const tournamentId = msg?.payload?.tournamentId || null;
      const current = getDefinitionAndRuntime(tournamentId);
      if (!current.definition || !current.runtime) {
        replyErr(reply, BC_TYPES.TOURNAMENT_RESTORED, requestId, "tournament_not_found");
        return;
      }

      const sanitizedRuntime = sanitizeRuntimeRestore(current.runtime);
      if (sanitizedRuntime !== current.runtime) {
        setTournamentRuntime(current.definition.tournamentId, sanitizedRuntime);
      }

      replyOk(reply, BC_TYPES.TOURNAMENT_RESTORED, requestId, {
        definition: current.definition,
        runtime: sanitizedRuntime,
      });
    },

    [BC_TYPES.TOURNAMENT_CHECKPOINT]: async ({ msg, reply }) => {
      const requestId = msg?.requestId || null;
      const tournamentId = msg?.payload?.tournamentId || null;
      const restore = clone(msg?.payload?.restore || null);
      const current = getDefinitionAndRuntime(tournamentId);
      if (!current.definition || !current.runtime) {
        replyErr(reply, BC_TYPES.TOURNAMENT_CHECKPOINT_RESULT, requestId, "tournament_not_found");
        return;
      }
      if (current.runtime?.status !== "active" || !current.runtime?.activeEntry) {
        replyErr(reply, BC_TYPES.TOURNAMENT_CHECKPOINT_RESULT, requestId, "tournament_not_active");
        return;
      }
      try {
        assertTournamentCheckpointAllowed(current.runtime, restore);
      } catch (error) {
        replyErr(reply, BC_TYPES.TOURNAMENT_CHECKPOINT_RESULT, requestId, error?.message || String(error || "checkpoint_invalid"));
        return;
      }

      const runtime = store.updateRuntime(current.definition.tournamentId, (runtimeNow) => ({
        ...clone(runtimeNow),
        restore: restore && typeof restore === "object" ? restore : null,
      }));

      replyOk(reply, BC_TYPES.TOURNAMENT_CHECKPOINT_RESULT, requestId, {
        ok: true,
        runtime,
      });
    },
  };
}
