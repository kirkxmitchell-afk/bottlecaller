// src/game/gameEntry.ts
console.log("[BOOT] gameEntry.ts evaluated");

// 🚫 IFRAME MUST NOT USE SUPABASE
if (window.self !== window.top) {
  if ((window as any).__BC_SUPABASE__ || (window as any).supabase) {
    console.error("[IFRAME] Supabase client detected in iframe. This WILL break logout.");
  }

  // If any code tries to create a supabase singleton in iframe, crash hard.
  if ((window as any).__BC_SUPABASE_SINGLETON_TOUCHED__) {
    throw new Error("Supabase singleton touched inside iframe. Remove Supabase imports from /game bundle.");
  }
}

import { installEngineBridge } from "./engineBridge";
import { ENCOUNTERS, validateEncounters } from "./encounter";
import { createDemoRuntimeV2Api } from "./runtimeV2";
import { createGodotShiftBridgeApi } from "./godotShiftBridge";
import * as WineBridge from "./wineBridge";
import * as EventLogBridge from "./eventLogBridge";
import * as ProgressionBridge from "./progressionBridge.ts";
import * as TournamentBridge from "./tournamentBridge";
import * as ReactionRuntime from "./reaction/reactionIndex";
import * as V2ProgressionAuthority from "./v2ProgressionAuthority";
import { installProgressionGuards } from "./progressionGuards";


declare global {
  interface Window {
    EngineBridge?: any;
    WineBridge?: any;
    EventLogBridge?: any;
    ProgressionBridge?: any;
    TournamentBridge?: any;
    ReactionRuntime?: any;
    V2ProgressionAuthority?: any;
    __BC_ENCOUNTERS__?: any;
    __BC_GAME_ENTRY_INSTALLED__?: boolean;
    __BC_CTX__?: any;
    __BC_PROGRESSION__?: any;
    __BC_V2_HARNESS__?: any;
    __BC_GODOT_SHIFT__?: any;
    __BC_GODOT_SHIFT_BASE__?: string;
  }
}

function getCtxFromWindow() {
  // @ts-ignore
  return window.__BC_CTX__ || null;
}

(function bootLogs() {
  window.addEventListener("DOMContentLoaded", () => {
    console.log("[BOOT] DOM ready, mounting screens");
    console.log("[BOOT] screenWelcome?", !!document.querySelector("#screenWelcome"));
    console.log("[BOOT] screenPlay?", !!document.querySelector("#screenPlay"));
  });

  window.addEventListener("BC_MSG_HANDLER_READY", () => {
    console.log("[BOOT] postMessage listener attached");
  });
})();

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
  window.TournamentBridge = TournamentBridge;
  window.ReactionRuntime = ReactionRuntime;
  window.V2ProgressionAuthority = V2ProgressionAuthority;

  ProgressionBridge.onProgressionSnapshot((payload: any) => {
    window.__BC_PROGRESSION__ = payload || null;
    console.log("[BC] progression snapshot updated", {
      ok: !!payload?.ok,
      demo: !!payload?.demo,
      tierToServe: payload?.tierToServe ?? null,
    });
  });

  async function refreshProgressionSnapshot() {
    try {
      const payload = await ProgressionBridge.requestProgressionSnapshot(3);
      window.__BC_PROGRESSION__ = payload || null;
    } catch {}
  }

  // Install guards ONLY when ctx arrives
  window.addEventListener("BC_CTX_READY", () => {
    const bridge = installProgressionGuards(getCtxFromWindow);
    console.log("[BC] ProgressionBridge installed ✅", bridge);
    void refreshProgressionSnapshot();
  });

  // In case ctx already arrived before this module loaded:
  if ((window as any).__BC_CTX__) {
    const bridge = installProgressionGuards(getCtxFromWindow);
    console.log("[BC] ProgressionBridge installed (late) ✅", bridge);
    void refreshProgressionSnapshot();
  }

  // Expose encounters -> game.html can read this without importing TS
  window.__BC_ENCOUNTERS__ = ENCOUNTERS;
  const v2HarnessEnabled =
    new URLSearchParams(window.location.search).get("bcV2") === "1";
  window.__BC_V2_HARNESS__ = {
    enabled: v2HarnessEnabled,
    api: createDemoRuntimeV2Api(),
  };
  window.__BC_GODOT_SHIFT_BASE__ = String(
    (import.meta as any).env?.VITE_GODOT_SHIFT_BASE || "/godot-shift",
  ).replace(/\/$/, "") || "/godot-shift";
  window.__BC_GODOT_SHIFT__ = createGodotShiftBridgeApi({
    baseUrl: window.__BC_GODOT_SHIFT_BASE__,
  });

  console.log("[BC] EngineBridge installed ✅", window.EngineBridge);
  console.log("[BC] WineBridge installed ✅", window.WineBridge);
  console.log("[BC] ProgressionBridge installed ✅", window.ProgressionBridge);
  console.log("[BC] TournamentBridge installed ✅", window.TournamentBridge);
  console.log("[BC] ReactionRuntime installed ✅", window.ReactionRuntime);
  console.log("[BC] V2ProgressionAuthority installed ✅", window.V2ProgressionAuthority);
  console.log("[BC] V2 harness installed ✅", { enabled: v2HarnessEnabled });
  console.log("[BC] Godot shift bridge installed ✅", window.__BC_GODOT_SHIFT__);
  console.log("[BC] Encounters loaded ✅", {
    demo: ENCOUNTERS.demo.length,
    premium: ENCOUNTERS.premium.length,
  });
})();
