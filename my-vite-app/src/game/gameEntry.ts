// src/game/gameEntry.ts
import { installEngineBridge } from "./engineBridge";
import { ENCOUNTERS, validateEncounters } from "./encounters";

declare global {
  interface Window {
    EngineBridge?: any;
    __BC_ENCOUNTERS__?: any;
    __BC_GAME_ENTRY_INSTALLED__?: boolean;
  }
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

  // Expose encounters -> game.html can read this without importing TS
  window.__BC_ENCOUNTERS__ = ENCOUNTERS;

  console.log("[BC] EngineBridge installed ✅", window.EngineBridge);
  console.log("[BC] Encounters loaded ✅", {
    demo: ENCOUNTERS.demo.length,
    premium: ENCOUNTERS.premium.length,
  });
})();
