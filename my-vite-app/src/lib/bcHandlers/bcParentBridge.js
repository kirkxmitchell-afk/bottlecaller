import { BC_TYPES } from "./bcMessages"; // optional if you already have
// If you don’t want constants yet, keep string literals.

export function mountBcParentBridge({
  supabase,
  appState,

  // your existing functions:
  doLogout,
  isHardLoggedOut,
  destroyPremiumIframe,
  destroyDemoIframe,
  getSourceCtx,
  setSourceCtx,
  buildBcCtxSafe,
  flushPendingCtx,
  getActiveRestaurantId,
  isUuid,
  hasRestaurantBoundAccess,
  wireManagerBoardMenu,
  loadManagerBoardData,
  loadManagerInsights,
  shouldIgnoreDuplicateNav,
  setPremiumOverlayActive,
  showScreen,
  tagSource,
}) {
  const ORIGIN = window.location.origin;

  const notifyLoggedOut = (event) => {
    try {
      if (event.source && typeof event.source.postMessage === "function") {
        event.source.postMessage(
          { source: "BC_MSG", v: 1, type: "auth_state", authed: false },
          event.origin || "*"
        );
        event.source.postMessage(
          { source: "BC_MSG", v: 1, type: "parent_logged_out" },
          event.origin || "*"
        );
      }
    } catch {}
  };

  const getCurrentPremiumFrameWindow = () => {
    const frame =
      document.getElementById("bcPremiumFrame") ||
      document.getElementById("premiumRootFrame");
    return frame?.contentWindow || null;
  };

  // 🔒 central auth gate: single helper (so it’s not copied everywhere)
  async function requireLiveSessionOrKick(event, type) {
    const { data: live } = await supabase.auth.getSession();
    const liveSession = live?.session || null;
    if (!liveSession) {
      console.warn("[PARENT] BC_MSG blocked: live session is null", { type });
      notifyLoggedOut(event);
      try { destroyPremiumIframe("parent_no_session_msg_gate"); } catch {}
      try { destroyDemoIframe("parent_no_session_msg_gate"); } catch {}
      return null;
    }
    appState.session = liveSession;
    return liveSession;
  }

  // ✅ routing table
  const handlers = {
    // keep “logout” + “bc_logout_request”
    logout: async ({ event }) => doLogout("bc_msg_logout"),
    bc_logout_request: async ({ event }) => doLogout("bc_msg_logout"),

    runs_count_request: async ({ msg, event }) => {
      console.warn("[BC] bcParentBridge runs_count_request disabled; main bridge owns this", {
        reqId: msg?.reqId || null
      });
      return;
    },

    ritual_status_request: async ({ msg, event }) => {
      const reqId = msg.reqId || null;
      try {
        const senderCtx = getSourceCtx(event.source);
        const userId = senderCtx?.userId || null;
        const restaurantId = senderCtx?.restaurantId || null;

        if (!isUuid(userId) || !isUuid(restaurantId)) {
          event.source?.postMessage(
            { source: "BC_MSG", v: 1, type: "ritual_status_response", reqId, ok: false, doneToday: false, error: "invalid_ctx" },
            event.origin
          );
          return;
        }

        const now = new Date();
        const zaNow = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Johannesburg" }));
        const startZA = new Date(zaNow);
        startZA.setHours(0, 0, 0, 0);
        const startIso = startZA.toISOString();

        const { data, error } = await supabase
          .from("bc_event_log")
          .select("id")
          .eq("event_type", "ritual_completed")
          .eq("user_id", userId)
          .eq("restaurant_id", restaurantId)
          .gte("occurred_at", startIso)
          .limit(1);

        if (error) throw error;

        event.source?.postMessage(
          { source: "BC_MSG", v: 1, type: "ritual_status_response", reqId, ok: true, doneToday: Array.isArray(data) && data.length > 0 },
          event.origin
        );
      } catch (e) {
        event.source?.postMessage(
          { source: "BC_MSG", v: 1, type: "ritual_status_response", reqId, ok: false, doneToday: false, error: e?.message || String(e) },
          event.origin
        );
      }
    },

    bc_ctx_request: async ({ msg, event }) => {
      // keep your premium frame + epoch gate exactly
      const prem = document.getElementById("premiumRootFrame");
      const isFromPremiumFrame = !!(prem && event.source === prem.contentWindow);
      if (!isFromPremiumFrame) {
        console.warn("[PARENT] denied bc_ctx_request: not from current premium frame");
        return;
      }

      const epoch = Number(window.__BC_IFRAME_EPOCH__ || 0);
      const msgEpoch = Number(msg?.epoch || 0);
      if (msgEpoch !== epoch) {
        console.warn("[PARENT] denied bc_ctx_request: epoch mismatch", { msgEpoch, epoch });
        return;
      }

      const requestedMode = String(msg?.mode || msg?.requestedMode || "").toLowerCase();

      if (requestedMode === "demo") {
        window.__BC_LAST_CTX_MODE__ = "demo";
        const demoCtx = await buildBcCtxSafe("demo");
        if (!demoCtx?.userId || !demoCtx?.role) return;
        event.source?.postMessage({ source: "BC_MSG", v: 1, type: "bc_ctx", ...demoCtx, drill: null }, event.origin);
        setSourceCtx(event.source, demoCtx);
        return;
      }

      // your readiness wait
      try {
        if (window.__BC_ACTIVE_REST_READY__) {
          await Promise.race([
            window.__BC_ACTIVE_REST_READY__,
            new Promise((r) => setTimeout(r, 600)),
          ]);
        }
      } catch {}

      const needRestaurant = requestedMode !== "demo";
      const rid = getActiveRestaurantId?.();
      const ready =
        !!window.appState?.session &&
        !!window.appState?.profile?.role &&
        (needRestaurant ? !!rid : true);

      if (!ready) {
        console.warn("[PARENT] ctx not ready — queued bc_ctx_request");
        window.__BC_PENDING_CTX_REQ__ = { source: event.source, origin: event.origin, mode: msg?.mode ?? null, at: Date.now() };

        if (!window.__BC_CTX_FLUSH_TICK__) {
          window.__BC_CTX_FLUSH_TICK__ = setInterval(() => {
            const p = window.__BC_PENDING_CTX_REQ__;
            if (!p) {
              clearInterval(window.__BC_CTX_FLUSH_TICK__);
              window.__BC_CTX_FLUSH_TICK__ = null;
              return;
            }
            if (Date.now() - p.at > 30000) {
              console.warn("[PARENT] ctx flush timed out (30s) — still not ready");
              clearInterval(window.__BC_CTX_FLUSH_TICK__);
              window.__BC_CTX_FLUSH_TICK__ = null;
              return;
            }
            flushPendingCtx();
          }, 250);
        }
        return;
      }

      const bcCtx = await buildBcCtxSafe(msg?.mode ?? null);
      window.__BC_LAST_CTX_MODE__ = "premium";
      if (bcCtx) bcCtx.drill = window.__BC_DRILL_CONFIG__ || window.BC_DRILL_CONFIG || null;

      if (!bcCtx?.userId || !bcCtx?.role || (!bcCtx?.restaurantId && requestedMode !== "demo")) {
        console.warn("[PARENT] refusing to send null/partial bc_ctx", bcCtx);
        return;
      }

      event.source?.postMessage({ source: "BC_MSG", v: 1, type: "bc_ctx", ...bcCtx }, event.origin);
      setSourceCtx(event.source, bcCtx);
    },

    wines_request: async ({ msg, event }) => {
      const reqId = msg.reqId || null;
      const senderCtx = getSourceCtx(event.source);

      const rid =
        msg.restaurantId ||
        senderCtx?.restaurantId ||
        getActiveRestaurantId?.() ||
        appState.activeRestaurantId ||
        appState.profile?.restaurant_id ||
        null;

      try {
        const { data: live } = await supabase.auth.getSession();
        if (!live?.session) throw new Error("no_session");
        if (!rid) throw new Error("missing_restaurant_id");

        const { data, error } = await supabase
          .from("bc_wines")
          .select("*")
          .eq("restaurant_id", rid)
          .order("created_at", { ascending: true });

        if (error) throw error;

        event.source?.postMessage(
          { source: "BC_MSG", v: 1, type: "wines_report", reqId, ok: true, wines: data || [] },
          event.origin
        );
      } catch (e) {
        event.source?.postMessage(
          { source: "BC_MSG", v: 1, type: "wines_report", reqId, ok: false, error: e?.message || String(e), wines: [] },
          event.origin
        );
      }
    },

    wines_mutate: async ({ msg, event }) => {
      // same as your block (unchanged) — just moved here
      // IMPORTANT: keep senderCtx rid trust rules if you want to tighten it later.
      // (I can rewrite it so it NEVER trusts msg.restaurantId too.)
      const reqId = msg.reqId || null;
      const action = String(msg.action || "");
      const payload = msg.payload || {};
      const senderCtx = getSourceCtx(event.source);

      const rid =
        msg.restaurantId ||
        senderCtx?.restaurantId ||
        getActiveRestaurantId?.() ||
        appState.activeRestaurantId ||
        appState.profile?.restaurant_id ||
        null;

      try {
        const { data: live } = await supabase.auth.getSession();
        const userId = live?.session?.user?.id || null;
        if (!userId) throw new Error("no_session");

        if (action === "add") {
          if (!rid) throw new Error("missing_restaurant_id");
          const row = {
            restaurant_id: rid,
            created_by: userId,
            name: payload?.name || "",
            varietal: payload?.varietal || "",
            fruit_tags: payload?.fruit_tags || [],
            texture_tags: payload?.texture_tags || [],
            oak_level: payload?.oak_level || "",
            process: payload?.process || "",
            region: payload?.region || "",
            story: payload?.story || "",
          };
          const { error } = await supabase.from("bc_wines").insert(row);
          if (error) throw error;
        } else if (action === "upsert") {
          if (!rid) throw new Error("missing_restaurant_id");
          const row = {
            id: payload?.id || undefined,
            restaurant_id: rid,
            created_by: userId,
            name: payload?.name || "",
            varietal: payload?.varietal || "",
            fruit_tags: payload?.fruit_tags || [],
            texture_tags: payload?.texture_tags || [],
            oak_level: payload?.oak_level || "",
            process: payload?.process || "",
            region: payload?.region || "",
            story: payload?.story || "",
          };
          const { error } = await supabase.from("bc_wines").upsert(row, { onConflict: "id" });
          if (error) throw error;
        } else if (action === "delete") {
          const wineId = payload?.wineId || payload?.id;
          if (!wineId) throw new Error("missing_wine_id");
          const { error } = await supabase.from("bc_wines").delete().eq("id", wineId);
          if (error) throw error;
        } else if (action === "delete_all") {
          if (!rid) throw new Error("missing_restaurant_id");
          const { error } = await supabase.from("bc_wines").delete().eq("restaurant_id", rid);
          if (error) throw error;
        } else {
          throw new Error("unsupported_action");
        }

        event.source?.postMessage({ source: "BC_MSG", v: 1, type: "wines_mutate_result", reqId, ok: true }, event.origin);
      } catch (e) {
        event.source?.postMessage(
          { source: "BC_MSG", v: 1, type: "wines_mutate_result", reqId, ok: false, error: e?.message || String(e) },
          event.origin
        );
      }
    },

    nav: async ({ msg }) => {
      if (shouldIgnoreDuplicateNav(msg)) return;

      const roleNow = String(appState?.profile?.role || "").toLowerCase();
      const dest = msg.to || msg.target || msg.backTo || "screenHome";
      console.log("[PARENT] NAV ->", dest, msg);

      if (msg.to === "screenManagerBoard") {
        if (!hasRestaurantBoundAccess()) {
          console.warn("[NAV] blocked -> managerboard (no restaurant-bound access)");
          showScreen("screenPremiumApp");
          return;
        }
        showScreen("screenManagerBoard");
        wireManagerBoardMenu?.();
        if (msg.mbTab) window.__BC_MB_SHOWTAB__?.(msg.mbTab);

        destroyPremiumIframe("exit drill -> managerboard");
        setPremiumOverlayActive(false);

        if (msg.mbTab === "insights") await loadManagerInsights();
        return;
      }

      if (String(dest).startsWith("screen")) {
        if (dest === "screenManagerBoard" && !hasRestaurantBoundAccess()) {
          console.warn("[NAV] blocked -> managerboard (no restaurant-bound access)");
          showScreen("screenPremiumApp");
          return;
        }
        setPremiumOverlayActive(dest === "screenPlay" || dest === "screenPremiumApp");
        showScreen(dest);

        if (dest === "screenManagerBoard") {
          wireManagerBoardMenu?.();
          if (msg.mbTab) {
            window.__BC_MB_SHOWTAB__?.(msg.mbTab);
            if (msg.mbTab === "insights") await loadManagerInsights();
            if (msg.mbTab === "overview") await loadManagerBoardData();
          } else {
            await loadManagerBoardData();
          }
        }
      }
    },

    nav_back: async ({ msg }) => {
      if (shouldIgnoreDuplicateNav(msg)) return;

      const roleNow = String(appState?.profile?.role || "").toLowerCase();
      const requested = String(msg.backTo || msg.to || "screenPremiumApp");
      const backTo = (roleNow === "waiter" && requested === "screenManagerBoard")
        ? "screenPremiumApp"
        : requested;

      console.log("[PARENT] NAV_BACK ->", backTo, msg);
      destroyPremiumIframe("nav_back");
      setPremiumOverlayActive(false);
      showScreen(backTo);
    },

    drill_pick: async ({ msg }) => {
      window.__BC_PARENT_LAST_ENCOUNTER__ = msg;
      console.log("[PARENT] drill_pick stored ✅", msg);
    },

    event_log: async ({ msg, event }) => {
      // keep your entire event_log block; I’m not rewriting it here to keep this message readable.
      // BUT: this handler is now isolated and testable.
      // (If you want: next step I’ll paste your event_log chunk into here verbatim.)
      // For now, call your existing function:
      await window.__BC_HANDLE_EVENT_LOG__?.(msg, event);
    },
  };

  async function onMessage(event) {
    try {
      const msg = event?.data;
      if (!msg || msg.source !== "BC_MSG" || msg.v !== 1) return;

      // same-origin only
      if (event.origin !== ORIGIN) return;

      const type = msg.type;

      // global logout gates
      if (isHardLoggedOut()) {
        console.warn("[PARENT] BC_MSG blocked: hard logged out", type);
        notifyLoggedOut(event);
        try { destroyPremiumIframe("hard_logged_out_msg_gate"); } catch {}
        try { destroyDemoIframe("hard_logged_out_msg_gate"); } catch {}
        return;
      }

      if (window.__BC_LOGOUT_LOCK__) {
        console.warn("[PARENT] BC_MSG blocked: logout lock active", type);
        notifyLoggedOut(event);
        try { destroyPremiumIframe("logout_lock"); } catch {}
        try { destroyDemoIframe("logout_lock"); } catch {}
        return;
      }

      // allow logout requests even if session is dead
      if (type === "logout" || type === "bc_logout_request") {
        await handlers[type]?.({ msg, event });
        return;
      }

      // 🔒 require parent session for everything else
      const liveSession = await requireLiveSessionOrKick(event, type);
      if (!liveSession) return;

      // only accept from mounted iframe window (protects against random window messages)
      const premiumWin = getCurrentPremiumFrameWindow();
      if (!premiumWin || event.source !== premiumWin) return;

      const handler = handlers[type];
      if (!handler) return;

      await handler({ msg, event });
    } catch (e) {
      console.error("[BC] parent bridge failed:", e);
      try {
        event.source?.postMessage(
          { source: "BC_MSG", v: 1, type: "event_log_ack", ok: false, error: String(e?.message || e) },
          event.origin
        );
      } catch {}
    }
  }

  window.addEventListener("message", onMessage);

  return {
    dispose() {
      window.removeEventListener("message", onMessage);
    },
    handledTypes: new Set(Object.keys(handlers)),
  };
}
