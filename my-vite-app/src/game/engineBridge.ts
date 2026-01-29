// src/game/engineBridge.ts
import {
  initEncounter,
  pickGuestType,
  pickMode,
  pickHook,
  finalizeEncounter,
  type EngineState,
  type EngineFeedback,
} from "./engine";

// Store state only in memory (no storage, no side effects)
let state: EngineState | null = null;

// Helper: ensure we always have a state
function requireState(): EngineState {
  if (!state) throw new Error("Engine not initialized. Call startEncounter() first.");
  return state;
}

// Define the global API the UI will call
export function installEngineBridge() {
  const api = {
    startEncounter(encounterId: string) {
      state = initEncounter(encounterId);
      return { ok: true, encounterId };
    },

    chooseGuestType(guestType: string): EngineFeedback {
      state = pickGuestType(requireState(), guestType);
      return state.feedback; // your engine should expose feedback
    },

    chooseMode(mode: string): EngineFeedback {
      state = pickMode(requireState(), mode);
      return state.feedback;
    },

    chooseHook(hookId: string): EngineFeedback {
      state = pickHook(requireState(), hookId);
      return state.feedback;
    },

    finalize(): EngineFeedback {
      state = finalizeEncounter(requireState());
      return state.feedback;
    },

    getState() {
      return state; // useful for debugging
    },
  };

  // Attach to window (iframe global)
  (window as any).EngineBridge = api;
}
