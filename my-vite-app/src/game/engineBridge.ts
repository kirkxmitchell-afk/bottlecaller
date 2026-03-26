// src/game/engineBridge.ts
import {
  computeReaction,
  type ReactionChecks,
  type ReactionResult,
} from "./engine";

// Debug memory only (in-memory, no storage)
let lastChecks: ReactionChecks | null = null;
let lastResult: ReactionResult | null = null;

type EngineBridgeAPI = {
  // Phase 1: overlay calculator used by the current UI (game.html)
  computeReaction: (checks: ReactionChecks) => ReactionResult;

  // Debug helpers
  __debug: {
    getLast: () => { lastChecks: ReactionChecks | null; lastResult: ReactionResult | null };
    clear: () => void;
  };
};

export function installEngineBridge() {
  const api: EngineBridgeAPI = {
    computeReaction(checks) {
      lastChecks = checks;
      lastResult = computeReaction(checks);
      return lastResult;
    },

    __debug: {
      getLast: () => ({ lastChecks, lastResult }),
      clear: () => {
        lastChecks = null;
        lastResult = null;
      },
    },
  };

  // Attach to window (iframe global)
  (window as any).EngineBridge = api;

  console.log("[BottleCaller] EngineBridge installed", api);
}
