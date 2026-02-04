// src/game/gameEntry.ts
import { installEngineBridge } from "./engineBridge";
import { ENCOUNTERS, validateEncounters } from "./encounter";
import * as WineBridge from "./wineBridge";
import * as EventLogBridge from "./eventLogBridge";
import * as ProgressionBridge from "./progressionBridge";
import { installProgressionGuards } from "./progressionGuards";


declare global {
  interface Window {
    EngineBridge?: any;
    WineBridge?: any;
    EventLogBridge?: any;
    ProgressionBridge?: any;
    __BC_ENCOUNTERS__?: any;
    __BC_GAME_ENTRY_INSTALLED__?: boolean;
    __BC_CTX__?: any;
  }
}

function getCtxFromWindow() {
  // @ts-ignore
  return window.__BC_CTX__ || null;
}

(function boot() {
  // Prevent double-install (HMR / re-import / iframe reload edge cases)
  if (window.__BC_GAME_ENTRY_INSTALLED__) {
    console.log("[BC] gameEntry already installed (skipping) ✅");
    return;
  }
  window.__BC_GAME_ENTRY_INSTALLED__ = true;

  // Validate encounters (throws loud if broken)
  validateEncounters(ENCOUNTERS);

  // Install bridge -> window.EngineBridge
  installEngineBridge();

  // ✅ expose wine API
  window.WineBridge = WineBridge;
  window.EventLogBridge = EventLogBridge;
  window.ProgressionBridge = ProgressionBridge;

  // Install guards ONLY when ctx arrives
  window.addEventListener("BC_CTX_READY", () => {
    const bridge = installProgressionGuards(getCtxFromWindow);
    console.log("[BC] ProgressionBridge installed ✅", bridge);
  });

  // In case ctx already arrived before this module loaded:
  if ((window as any).__BC_CTX__) {
    const bridge = installProgressionGuards(getCtxFromWindow);
    console.log("[BC] ProgressionBridge installed (late) ✅", bridge);
  }

  // Expose encounters -> game.html can read this without importing TS
  window.__BC_ENCOUNTERS__ = ENCOUNTERS;

  console.log("[BC] EngineBridge installed ✅", window.EngineBridge);
  console.log("[BC] WineBridge installed ✅", window.WineBridge);
  console.log("[BC] ProgressionBridge installed ✅", window.ProgressionBridge);
  console.log("[BC] Encounters loaded ✅", {
    demo: ENCOUNTERS.demo.length,
    premium: ENCOUNTERS.premium.length,
  });
})();
