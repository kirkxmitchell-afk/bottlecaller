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

function sumTotals(results = []) {
  const totals = {
    entriesPlayed: 0,
    wins: 0,
    losses: 0,
    totalScore: 0,
  };
  for (const result of results) {
    totals.entriesPlayed += 1;
    if (result?.outcome === "win") totals.wins += 1;
    if (result?.outcome === "loss" || result?.outcome === "timeout" || result?.outcome === "abandoned") {
      totals.losses += 1;
    }
    totals.totalScore += Number(result?.score || 0);
  }
  return totals;
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

function buildActiveEntry(definition, entry, index) {
  const encounterId =
    entry?.kind === "encounter"
      ? entry.encounterId
      : entry?.baseEncounterId;
  const deterministic = !!definition?.rules?.deterministic;
  const baseSeed =
    definition?.rules?.sharedSeed ||
    definition?.tournamentId ||
    null;
  const seed = deterministic && baseSeed ? `${baseSeed}::${index}` : null;
  const encounterRunId = `${definition.tournamentId}::${index}::run_1`;
  const durationSec = Math.max(60, Number(entry?.timerSec || 300) || 300);
  const startedAt = Date.now();

  return {
    entryId: entry.entryId,
    kind: entry.kind,
    encounterRunId,
    encounterId,
    seed,
    timer:
      entry.kind === "timed_challenge" || entry.kind === "display_method_challenge"
        ? {
            startedAt,
            expiresAt: startedAt + durationSec * 1000,
            durationSec,
          }
        : null,
    challengeMeta:
      entry.kind === "encounter"
        ? undefined
        : {
            challengeKey: entry?.challengeKey || null,
            placement: entry?.placement || "before_start",
            strictness: entry?.strictness || null,
            methodKey: entry?.methodKey || null,
          },
  };
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

      const activeEntry = buildActiveEntry(
        current.definition,
        current.definition.entries[0],
        0
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
      const tournamentId = msg?.payload?.tournamentId || null;
      const completedEntry = clone(msg?.payload?.completedEntry || null);
      const restore = clone(msg?.payload?.restore || null);
      const current = getDefinitionAndRuntime(tournamentId);
      if (!current.definition || !current.runtime) {
        replyErr(reply, BC_TYPES.TOURNAMENT_ADVANCED, requestId, "tournament_not_found");
        return;
      }
      if (current.runtime?.status !== "active" || !current.runtime?.activeEntry) {
        replyErr(reply, BC_TYPES.TOURNAMENT_ADVANCED, requestId, "tournament_not_active");
        return;
      }
      if (String(completedEntry?.entryId || "") !== String(current.runtime.activeEntry.entryId || "")) {
        replyErr(reply, BC_TYPES.TOURNAMENT_ADVANCED, requestId, "entry_mismatch");
        return;
      }
      if (String(completedEntry?.runId || "") !== String(current.runtime.activeEntry.encounterRunId || "")) {
        replyErr(reply, BC_TYPES.TOURNAMENT_ADVANCED, requestId, "run_mismatch");
        return;
      }

      const nextIndex = Number(current.runtime.currentEntryIndex || 0) + 1;
      const results = [...(Array.isArray(current.runtime.results) ? current.runtime.results : []), completedEntry];
      const totals = sumTotals(results);

      const nextRuntime =
        nextIndex < current.definition.entries.length
          ? {
              ...clone(current.runtime),
              status: "active",
              currentEntryIndex: nextIndex,
              activeEntry: buildActiveEntry(
                current.definition,
                current.definition.entries[nextIndex],
                nextIndex
              ),
              restore: restore && typeof restore === "object" ? restore : null,
              results,
              totals,
            }
          : {
              ...clone(current.runtime),
              status: "complete",
              currentEntryIndex: nextIndex,
              activeEntry: null,
              restore: null,
              completedAt: Date.now(),
              results,
              totals,
            };

      const runtime = store.updateRuntime(current.definition.tournamentId, () => nextRuntime);
      replyOk(reply, BC_TYPES.TOURNAMENT_ADVANCED, requestId, {
        runtime,
      });
    },

    [BC_TYPES.TOURNAMENT_RESTORE]: async ({ msg, reply }) => {
      const requestId = msg?.requestId || null;
      const tournamentId = msg?.payload?.tournamentId || null;
      const current = getDefinitionAndRuntime(tournamentId);
      if (!current.definition || !current.runtime) {
        replyErr(reply, BC_TYPES.TOURNAMENT_RESTORED, requestId, "tournament_not_found");
        return;
      }

      replyOk(reply, BC_TYPES.TOURNAMENT_RESTORED, requestId, {
        definition: current.definition,
        runtime: current.runtime,
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
      if (String(restore?.runId || "") !== String(current.runtime.activeEntry.encounterRunId || "")) {
        replyErr(reply, BC_TYPES.TOURNAMENT_CHECKPOINT_RESULT, requestId, "run_mismatch");
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
