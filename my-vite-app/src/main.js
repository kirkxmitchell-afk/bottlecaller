// src/main.js
import "./style.css";
import { parentSignIn, parentSignOutGlobal, parentSignUp, parentGetSession } from "./lib/authParent.js";
import { getSupabaseParent, purgeAuthStorage } from "./lib/supabaseParent.js";
import { createBcBridge } from "./lib/bcBridge.js";
import { BC_TYPES } from "./lib/bcMessages.js";
import { makeLogoutHandler } from "./lib/bcHandlers/logout.js";
import { makeCtxHandler } from "./lib/bcHandlers/ctx.js";
import { makeWinesHandler } from "./lib/bcHandlers/wines.js";
import { makeWinesMutateHandler } from "./lib/bcHandlers/winesMutate.js";
import { makeRunsCountHandler } from "./lib/bcHandlers/runsCount.js";
import { makeRitualStatusHandler } from "./lib/bcHandlers/ritualStatus.js";
import { makeMessagesUnreadHandler } from "./lib/bcHandlers/messagesUnread.js";
import { makeMessageMarkReadHandler } from "./lib/bcHandlers/messagesMarkRead.js";
import { makeLeaderboardHandler } from "./lib/bcHandlers/leaderboard.js";
import { makeProgressionSnapshotHandler } from "./lib/bcHandlers/progressionSnapshot.js";
import { makeProgressReportSubmitHandler } from "./lib/bcHandlers/progressReportSubmit.js";
import { makeHardResetProgressionHandler } from "./lib/bcHandlers/hardResetProgression.js";
import { makeTournamentHandlers } from "./lib/bcHandlers/tournament.js";
import { handleEventLog } from "./lib/handlers/handleEventLog.js";
import { createProgressionStore } from "./progressionStore.js";
import {
  classifyEncounterResolutionForProgression,
  normalizeProgressionSnapshot,
  logLiveProgressionContractCheck,
} from "./parent/progressionShared.js";

let supabase = null;
let bootError = null;

function getBootErrorMessage(error) {
  if (!error) return "Unknown startup error.";
  if (typeof error === "string") return error;
  if (typeof error?.message === "string" && error.message.trim()) return error.message;
  return String(error);
}

function renderBootError(error) {
  const root = document.querySelector("#app");
  if (!root) return;
  root.innerHTML = `
    <section class="screen" style="width:min(880px, 100%);">
      <div class="panel stack">
        <div class="app-chrome-title">BottleCaller</div>
        <div class="small-text" style="text-transform:uppercase; letter-spacing:0.14em; opacity:0.72;">Startup Error</div>
        <p class="subtle" style="margin:0;">
          The app failed during boot. Check the message below and browser console.
        </p>
        <pre style="margin:0; white-space:pre-wrap; overflow:auto; border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:14px; background:rgba(0,0,0,0.28); color:rgba(255,240,240,0.96);">${escapeHtml(getBootErrorMessage(error))}</pre>
      </div>
    </section>
  `;
}

try {
  supabase = getSupabaseParent();
} catch (error) {
  bootError = error;
  console.error("[BC][BOOT] failed to initialize Supabase", error);
}

// ==== SUPABASE FINGERPRINT ====
if (supabase && !supabase.__BC_ID__) supabase.__BC_ID__ = "sb_" + Math.random().toString(16).slice(2);
if (supabase && !supabase.__BC_FINGERPRINT_PATCHED__) {
  const _getSession = supabase.auth.getSession.bind(supabase.auth);
  supabase.auth.getSession = async (...args) => {
    const r = await _getSession(...args);
    if (BC_VERBOSE_LOGS) {
      console.log("[SB]", supabase.__BC_ID__, "getSession ->", !!r?.data?.session);
    }
    return r;
  };

  const _signOut = supabase.auth.signOut.bind(supabase.auth);
  supabase.auth.signOut = async (...args) => {
    if (BC_VERBOSE_LOGS) {
      console.log("[SB]", supabase.__BC_ID__, "signOut CALLED", args);
    }
    const r = await _signOut(...args);
    if (BC_VERBOSE_LOGS) {
      console.log("[SB]", supabase.__BC_ID__, "signOut DONE", r?.error || "ok");
    }
    return r;
  };
  supabase.__BC_FINGERPRINT_PATCHED__ = true;
}

// Avoid redeclare crash (no sweep needed)
window.escapeHtml =
  window.escapeHtml ||
  function escapeHtml(s = "") {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  };

// Keep existing calls working: escapeHtml("x")
var escapeHtml = window.escapeHtml;
const BC_VERBOSE_LOGS =
  new URLSearchParams(window.location.search).get("bcDebug") === "1" ||
  (() => {
    try {
      return localStorage.getItem("BC_DEBUG_LOGS") === "1";
    } catch {
      return false;
    }
  })();

let progressionRouterModulePromise = null;
function loadProgressionRouterModule() {
  if (!progressionRouterModulePromise) {
    progressionRouterModulePromise = import("./parent/progressionRouter");
  }
  return progressionRouterModulePromise;
}

async function decideAllowedTierLazy(args) {
  const mod = await loadProgressionRouterModule();
  return mod.decideAllowedTier(args);
}

let encounterCatalogModulePromise = null;
let encounterCatalogResolver = null;
function preloadEncounterCatalog() {
  if (!encounterCatalogModulePromise) {
    encounterCatalogModulePromise = import("./game/encounter")
      .then((mod) => {
        encounterCatalogResolver = (encounterId) => mod.getEncounterById(String(encounterId || ""));
        return mod;
      })
      .catch((error) => {
        encounterCatalogModulePromise = null;
        console.warn("[BC] encounter catalog preload failed", error);
        throw error;
      });
  }
  return encounterCatalogModulePromise;
}

function getAuthoredEncounterByIdLazy(encounterId) {
  if (typeof encounterCatalogResolver === "function") {
    return encounterCatalogResolver(encounterId);
  }
  void preloadEncounterCatalog();
  return null;
}

let tutorialRuntimePromise = null;
function loadTutorialRuntime() {
  if (!tutorialRuntimePromise) {
    tutorialRuntimePromise = import("./parent/tutorialRuntime.js").then(({ createTutorialRuntime }) =>
      createTutorialRuntime({
        showScreen,
        openPremiumSetupScreen,
        routeManagerBoard,
        normalizeManagerBoardTab,
        getParentCtxSnapshot,
        escapeHtml,
      })
    );
  }
  return tutorialRuntimePromise;
}

function startTutorial(id) {
  return loadTutorialRuntime().then((runtime) => runtime.startTutorial(id));
}

function openTutorialMenu() {
  return loadTutorialRuntime().then((runtime) => runtime.openTutorialMenu());
}

function safeCall(label, fn) {
  try {
    return typeof fn === "function" ? fn() : undefined;
  } catch (err) {
    console.error(`[BC][SAFE_CALL] ${label} failed`, err);
    return undefined;
  }
}

if (window.__BOTTLECALLER_BOOTED__) {
  throw new Error("BottleCaller boot attempted twice.");
}
window.__BOTTLECALLER_BOOTED__ = true;

function isBottleCallerMobileEnv() {
  const narrow = window.matchMedia("(max-width: 860px)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const coarseNarrow = coarse && window.matchMedia("(max-width: 1100px)").matches;
  return narrow || coarseNarrow;
}

function isV2DemoRequested() {
  if (new URLSearchParams(window.location.search).get("bcV2Demo") === "1") return true;
  try {
    return localStorage.getItem("BC_V2_DEMO") === "1";
  } catch {
    return false;
  }
}

function rememberV2DemoRequest() {
  try {
    if (new URLSearchParams(window.location.search).get("bcV2Demo") === "1") {
      localStorage.setItem("BC_V2_DEMO", "1");
    }
  } catch {}
}

function persistV2DemoRequest() {
  try { localStorage.setItem("BC_V2_DEMO", "1"); } catch {}
}

function replaceUrlKeepingV2Demo(url) {
  try {
    history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {}
}

rememberV2DemoRequest();

function syncBottleCallerViewportEnv() {
  const isMobile = isBottleCallerMobileEnv();
  document.documentElement.dataset.bcMobileEnv = isMobile ? "true" : "false";
  document.documentElement.dataset.bcViewport = isMobile ? "mobile" : "desktop";
  const isV2Demo = isV2DemoRequested();
  document.documentElement.dataset.bcV2Demo = isV2Demo ? "true" : "false";
  window.__BC_ENV__ = { ...(window.__BC_ENV__ || {}), mobile: isMobile };
  syncManagerMessengerViewportLayout();
}

function syncManagerMessengerViewportLayout() {
  const isMobile = document.documentElement.dataset.bcMobileEnv === "true";
  const columns = document.getElementById("mbMessengerColumns");
  const threadsPane = document.getElementById("mbMessengerThreadsPane");
  const detailPane = document.getElementById("mbMessengerDetailPane");
  const threadList = document.getElementById("mbThreadList");
  const threadMessages = document.getElementById("mbThreadMessages");
  if (!columns || !threadsPane || !detailPane) return;

  if (isMobile) {
    columns.style.display = "grid";
    columns.style.gridTemplateColumns = "minmax(0, 1fr)";
    columns.style.gap = "8px";
    columns.style.width = "100%";
    columns.style.alignItems = "stretch";
    columns.style.overflow = "visible";
    threadsPane.style.width = "100%";
    threadsPane.style.minWidth = "0";
    threadsPane.style.overflow = "hidden";
    detailPane.style.width = "100%";
    detailPane.style.minWidth = "0";
    detailPane.style.display = "flex";
    detailPane.style.flexDirection = "column";
    detailPane.style.minHeight = "0";
    detailPane.style.overflow = "visible";
    if (threadList) {
      threadList.style.maxHeight = "260px";
      threadList.style.overflowY = "auto";
    }
    if (threadMessages) {
      threadMessages.style.minHeight = "220px";
      threadMessages.style.maxHeight = "42dvh";
      threadMessages.style.overflowY = "auto";
    }
  } else {
    columns.style.display = "grid";
    columns.style.gridTemplateColumns = "280px 1fr";
    columns.style.gap = "12px";
    columns.style.width = "";
    columns.style.alignItems = "";
    columns.style.overflow = "";
    threadsPane.style.width = "";
    threadsPane.style.minWidth = "";
    threadsPane.style.overflow = "";
    detailPane.style.width = "";
    detailPane.style.minWidth = "";
    detailPane.style.display = "";
    detailPane.style.flexDirection = "";
    detailPane.style.minHeight = "";
    detailPane.style.overflow = "";
    if (threadList) {
      threadList.style.maxHeight = "";
      threadList.style.overflowY = "";
    }
    if (threadMessages) {
      threadMessages.style.minHeight = "";
      threadMessages.style.maxHeight = "";
      threadMessages.style.overflowY = "";
    }
  }
}

syncBottleCallerViewportEnv();
window.addEventListener("resize", syncBottleCallerViewportEnv, { passive: true });
window.addEventListener("orientationchange", syncBottleCallerViewportEnv, { passive: true });

window.addEventListener("storage", (e) => {
  if (e.key === "__BC_LOGOUT_LOCK__" && e.newValue) {
    console.warn("[CROSS-TAB] logout lock detected -> forcing logout UI");
    try { window.__BC_FORCE_LOGGED_OUT__ = true; } catch {}
    try { window.location.replace("/?loggedOut=1&ts=" + Date.now()); } catch {}
  }
});

// ===== CANONICAL MODES =====
const MODE = {
  SCOUT: "guide",
  GUIDE: "guide",
  CHARM: "charm",
  AUTH: "authority",
};

function canonicalModeFromUi(label) {
  const s = String(label || "").trim().toLowerCase();
  if (s === "scout") return MODE.GUIDE;
  if (s === "guide") return MODE.GUIDE;
  if (s === "charm") return MODE.CHARM;
  if (s === "authority") return MODE.AUTH;
  if (s === "hold") return MODE.GUIDE;
  if (s === "reflect") return MODE.GUIDE;
  if (s === "lead") return MODE.AUTH;
  if (s === MODE.SCOUT || s === MODE.GUIDE || s === MODE.CHARM || s === MODE.AUTH) return s;
  return "";
}

function uiModeLabel(modeKey, uiStyle) {
  const k = String(modeKey || "").toLowerCase();
  if (uiStyle === "game") {
    if (k === MODE.SCOUT) return "HOLD";
    if (k === MODE.GUIDE) return "REFLECT";
    if (k === MODE.AUTH) return "LEAD";
    if (k === MODE.CHARM) return "CHARM";
  } else {
    if (k === MODE.SCOUT) return "Guide";
    if (k === MODE.GUIDE) return "Guide";
    if (k === MODE.CHARM) return "Charm";
    if (k === MODE.AUTH) return "Authority";
  }
  return String(modeKey || "");
}

let wines = [];

console.log("supabase client present:", !!supabase);
window.__BC_SUPABASE__ = supabase;

function hidePremiumPlayOverlay() {
  setPremiumOverlayActive(false);
}

function showPremiumPlayOverlay() {
  setPremiumOverlayActive(true);
}

function setPremiumOverlayActive(isActive) {
  const root = document.getElementById("premiumRoot");
  const frame = document.getElementById("premiumRootFrame");

  if (root) {
    root.classList.toggle("hidden", !isActive);
    root.style.display = isActive ? "" : "none";
    root.style.pointerEvents = isActive ? "auto" : "none";
  }
  if (frame) frame.style.pointerEvents = isActive ? "auto" : "none";
}

function setDrillConfig(cfg) {
  window.__BC_DRILL_CONFIG__ = cfg;
  window.BC_DRILL_CONFIG = cfg;
  return cfg;
}

function setPendingStartDrill(payload) {
  const next = payload
    ? { ...payload, __epoch: Number(window.__BC_IFRAME_EPOCH__ || 0) }
    : null;
  window.__BC_PENDING_START_DRILL__ = next;
  window.BC_PENDING_START_DRILL = next;
  return next;
}

function clearQueuedDrillStart({ resetConfig = false } = {}) {
  setPendingStartDrill(null);
  if (resetConfig) setDrillConfig(null);
}

window.__BC_ACTIVE_TIMED_CHALLENGE__ = window.__BC_ACTIVE_TIMED_CHALLENGE__ || null;
window.__BC_LAST_TIMED_CHALLENGE_RESULT__ = window.__BC_LAST_TIMED_CHALLENGE_RESULT__ || null;
window.__BC_TUTORIAL__ = window.__BC_TUTORIAL__ || {
  active: false,
  steps: [],
  stepIndex: 0,
  role: null,
};

window.setDefaultDrillConfig =
  window.setDefaultDrillConfig ||
  function setDefaultDrillConfig(overrides = {}) {
    const base = {
      focus: "read",
      pool: ["dictator", "bargain_smart", "griever"],
      durationSec: 300,
    };
    const cfg = { ...base, ...overrides };
    setDrillConfig(cfg);
    console.log("[PARENT] __BC_DRILL_CONFIG__ set ✅", window.__BC_DRILL_CONFIG__);
    return window.__BC_DRILL_CONFIG__;
  };

// ------------------------------------------------------------
// UI
// ------------------------------------------------------------
document.querySelector("#app").innerHTML = `
  <div class="app-chrome">
    <div class="app-chrome-brand">
      <div class="app-chrome-eyebrow">Service Training Cockpit</div>
      <div class="app-chrome-title-row">
        <div class="app-chrome-title">BottleCaller</div>
        <span class="app-chrome-badge" id="appChromeStatus">Public Access</span>
      </div>
      <div class="app-chrome-copy">A premium shell for live service training, guided reps, and manager-side coaching.</div>
    </div>
    <div id="appChromePlayCta" class="app-chrome-play-cta hidden">
      <button id="btnAppChromeEnter" class="app-chrome-enter-button" type="button">Play / Enter</button>
    </div>
    <div id="appChromePremiumBar" class="app-chrome-premium-bar hidden">
      <div id="premiumTopbarMenuWrap" class="premium-topbar-menu-wrap">
        <button
          id="btnPremiumTopbarMenu"
          class="premium-topbar-menu-button"
          type="button"
          aria-label="Open premium menu"
          aria-expanded="false"
          aria-controls="premiumTopbarMenuPanel"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M19.14 12.94c.04-.31.06-.62.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.22-1.12.53-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.62-.06.94s.02.63.06.94L2.82 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.58-.22 1.13-.54 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" />
          </svg>
        </button>
        <div id="premiumTopbarMenuPanel" class="premium-topbar-menu-panel hidden">
          <button id="btnPremiumSignupMenu" class="btn-ghost hidden" type="button">Premium Sign Up</button>
          <button id="btnOpenMessages" class="btn-ghost" type="button">Messages</button>
          <button id="btnWaiterPerformanceLeaderboard" class="btn-ghost" type="button">Leaderboard</button>
          <button id="btnPremiumWineSetup" class="btn-ghost" type="button" data-tutorial="nav-wine-setup">Wine Setup</button>
          <button id="btnTutorial" class="btn-ghost" type="button">Tutorials</button>
          <button id="btnManagerBoard" class="btn-ghost" type="button">Manager Board</button>
          <button id="btnOpenProfile" class="btn-ghost" type="button">Profile</button>
          <button id="btnLogoutPremium" class="btn-danger" type="button">Logout</button>
        </div>
      </div>
    </div>
  </div>

  <!-- FACE WINDOW -->
  <section id="screenHome" class="screen">
    <div class="panel stack">
      <div class="topbar">
        <div class="brand">
          <h2>BottleCaller</h2>
          <span id="homeAuthBadge" class="badge hidden">LOGGED IN</span>
        </div>
        <div class="row">
          <button id="btnHomePremium" class="btn-ghost" type="button">Premium</button>
          <button id="btnHomeExitPremium" class="btn-ghost hidden" type="button">Exit Premium</button>
          <button id="btnHomeLogout" class="btn-danger hidden" type="button">Logout</button>
        </div>
      </div>

      <h1 class="title">Join Game</h1>
      <p class="subtle">
        Waiters play Demo immediately and can join by code. Managers enter Premium to configure the restaurant.
      </p>

      <div id="authFields" class="stack" style="margin-top:6px;">
        <input id="authEmail" type="email" placeholder="Email" />
        <input id="authPassword" type="password" placeholder="Password" />

        <!-- ✅ Premium intent extras -->
        <div id="premiumIntentBlock" class="hidden" style="margin-top:10px;color:#fff;">
          <div class="small auth-subselector-label">Premium Access</div>
          <input id="premiumLicenseCode" type="text" placeholder="Enter your join or license code" />
          <div class="small premium-contact-copy" style="margin-top:8px;">
            Contact us for purchase:
            <a href="mailto:hello@bottlecaller.com" style="color:#fff;">hello@bottlecaller.com</a>
          </div>
        </div>

        <!-- Auth mode first; signup reveals the role selector underneath -->
        <div class="tabs" id="modeTabs" data-selected="login" style="--selector-x: 0px;">
          <button id="tabModeLogin" class="tab active" type="button">Login</button>
          <button id="tabModeSignup" class="tab" type="button">Sign up</button>
        </div>

        <div id="roleTabsWrap" class="hidden">
          <div class="small auth-subselector-label">Choose role</div>
          <div class="tabs" id="roleTabs" data-selected="waiter" style="margin-top:10px; --selector-x: 0px;">
            <button id="tabRoleWaiter" class="tab active" type="button">Waiter</button>
            <button id="tabRoleManager" class="tab" type="button">Manager</button>
          </div>
        </div>

        <div id="displayNameWrap" class="hidden">
          <input id="authDisplayName" type="text" placeholder="Display name (optional)" />
        </div>

        <div id="signupContactBlock" class="hidden">
          <div class="small auth-subselector-label">Contact Us</div>
          <div class="small premium-contact-copy">
            Email <a href="mailto:hello@bottlecaller.com">hello@bottlecaller.com</a> with the setup you want and we will send the matching join or license code.
          </div>
        </div>

        <div id="managerSignupConfig" class="hidden">
          <div class="small auth-subselector-label">Premium Manager Setup</div>
          <div class="premium-signup-card">
            <div class="premium-signup-copy">
              Choose the manager package and seat plan you want provisioned. Keep this setup selected when you enter the code we issue for your account.
            </div>

            <div class="small auth-subselector-label">Manager Tier</div>
            <div class="tabs tabs-3" id="managerPackageTabs" data-selected="single_manager">
              <button id="tabManagerSingle" class="tab active" type="button">Single</button>
              <button id="tabManagerGroup" class="tab" type="button">Group</button>
              <button id="tabManagerEnterprise" class="tab" type="button">Enterpriser</button>
            </div>

            <div class="small auth-subselector-label">Seat Plan</div>
            <div class="tabs tabs-3" id="seatPlanTabs" data-selected="15">
              <button id="tabSeat15" class="tab active" type="button">15 Seats</button>
              <button id="tabSeat30" class="tab" type="button">30 Seats</button>
              <button id="tabSeat60" class="tab" type="button">60 Seats</button>
            </div>

            <div id="restaurantCountWrap" class="hidden">
              <div class="small auth-subselector-label">Number of Restaurants</div>
              <div class="tabs tabs-4" id="restaurantCountTabs" data-selected="3">
                <button id="tabRestaurant3" class="tab active" type="button">3</button>
                <button id="tabRestaurant5" class="tab" type="button">5</button>
                <button id="tabRestaurant7" class="tab" type="button">7</button>
                <button id="tabRestaurant10" class="tab" type="button">10</button>
              </div>
            </div>

            <div id="premiumRestaurantNameWrap" class="hidden">
              <input id="premiumRestaurantName" type="text" placeholder="Restaurant name for single-manager setup" />
            </div>

            <div class="small premium-contact-copy">
              Contact us at <a href="mailto:hello@bottlecaller.com">hello@bottlecaller.com</a> with your desired package, seat plan, and restaurant count if applicable. We will email back the correct code for this setup.
            </div>
          </div>
        </div>

        <div class="row">
          <button id="btnAuthSubmit" class="btn-primary" type="button">Continue</button>
        </div>

        <div id="authMsg" class="small"></div>
      </div>
    </div>
  </section>

  <!-- PREMIUM: Create Restaurant (Manager) -->
  <section id="screenCreateRestaurant" class="screen hidden">
    <div class="panel stack">
      <div class="topbar">
        <div class="brand">
          <h2>Create Restaurant</h2>
          <span class="badge">PREMIUM</span>
        </div>
        <button id="btnLogoutCreate" class="btn-danger" type="button">Logout</button>
      </div>

      <p class="small">Seat provisioning now starts from Premium signup and your issued license code.</p>

      <input id="restName" type="text" placeholder="Restaurant name" />
      <button id="btnCreateRestaurant" class="btn-primary" type="button">Create</button>

      <div id="createRestMsg" class="small"></div>

      <div id="invitePanel" class="hidden">
        <hr class="hr"/>
        <h3>Created</h3>
        <p class="small">Join code is inside the Premium menu.</p>
        <p class="small"><b>Join code:</b> <span id="inviteCodeText" class="mono"></span></p>
        <div class="row">
          <button id="btnCopyCode" type="button">Copy code</button>
          <button id="btnEnterPremium" class="btn-primary" type="button">Enter Premium</button>
        </div>
        <div id="inviteMsg" class="small"></div>
      </div>
    </div>
  </section>

  <!-- PREMIUM APP -->
  <section id="screenPremiumApp" class="screen hidden">
    <div class="panel stack">
      <div id="bcUnlockNotice" class="bc-unlock" style="display:none;"></div>

      <!-- Game lives here (isolated) -->
      <div id="premiumRoot"></div>
    </div>
  </section>

  <section id="screenProfile" class="screen hidden">
    <div class="panel stack">
      <div class="topbar">
        <div class="brand">
          <h2>Profile</h2>
          <span class="badge">PREMIUM</span>
        </div>
        <div class="row">
          <button id="btnBackFromProfile" class="btn-ghost" type="button">Back</button>
        </div>
      </div>

      <div class="card">
        <div class="score-row">Display name: <span id="profileDisplayName">-</span></div>
        <div class="score-row">Role: <span id="profileRole">-</span></div>
        <div class="score-row">Restaurant: <span id="profileRestaurant">-</span></div>
        <div class="score-row">Scope type: <span id="profileScopeType">-</span></div>
        <div class="score-row">Scope id: <span id="profileScopeId">-</span></div>
        <div class="score-row">Access tier: <span id="profileAccessTier">-</span></div>
      </div>

      <div id="profileStandingCard" style="margin-top:12px;"></div>
      <div id="profileBadgeShelf" style="margin-top:12px;"></div>
      <div id="profileSkillsCard" style="margin-top:12px;"></div>
      <div id="profilePerformanceHistoryCard" style="margin-top:12px;">
        <div id="mbPerformanceHistoryPanel" style="margin-top:12px;">
          <details class="card mb-disclosure">
            <summary class="mb-disclosure-summary">
              <div>
                <strong>Performance History</strong>
                <div class="small-text" style="margin-top:6px; opacity:.85;">
                  Skill growth and encounter reactions for your profile.
                </div>
              </div>
              <label class="small-text" style="display:flex; align-items:center; gap:8px;">
                Waiter
                <select id="mbHistoryUser" class="input" style="min-width:220px;"></select>
              </label>
            </summary>
            <div class="mb-disclosure-body">
              <div id="mbHistorySummaryStrip" style="margin-top:10px;"></div>
              <canvas id="mbHistoryChart"
                width="600"
                height="280"
                style="margin-top:12px;">
              </canvas>
              <div id="mbPerformanceLegend" style="margin-top:8px;"></div>
              <div id="managerEncounterSummaryHost" class="manager-encounter-summary-host" style="margin-top:12px;"></div>
            </div>
          </details>
        </div>
      </div>
      <div id="profileWeeklyReportPanel" class="card" style="margin-top:12px;">
        <strong>Weekly Training Report</strong>

        <div class="small-text" style="margin-top:6px; opacity:.85;">
          Summary of team progress over the last 7 days.
        </div>

        <div id="mbWeeklyReport" style="margin-top:10px;">
          <div class="small-text" style="opacity:.7;">Loading report…</div>
        </div>
      </div>
      <div id="profileTutorialCard" class="hidden" style="margin-top:12px;">
        <div class="card">
          <div style="font-weight:600; margin-bottom:8px;">Tutorials</div>
          <div id="profileTutorialCopy" class="small" style="opacity:.8; margin-bottom:10px;">
            Launch the guided encounter walkthrough directly from your profile.
          </div>
          <button id="btnProfileEncounterTutorial" class="btn" type="button">Start Encounter Tutorial</button>
        </div>
      </div>
      <div id="profileMultiRestaurantCard" style="margin-top:12px;"></div>
    </div>
  </section>

  <section id="screenWaiterLeaderboard" class="screen hidden">
    <div class="panel stack">
      <div class="topbar">
        <div class="brand">
          <h2>Performance Leaderboard</h2>
          <span class="badge">PREMIUM</span>
        </div>
        <div class="row">
          <button id="btnCloseWaiterLeaderboard" class="btn-ghost" type="button">Close</button>
        </div>
      </div>

      <div class="card">
        <div class="mb-section-header">
          <strong>Performance Leaderboard</strong>
          <div class="small-text" id="waiterLeaderboardRestaurantLabel">Live performance snapshot for this restaurant.</div>
        </div>
        <div id="waiterLeaderboardManagerContext" class="small-text" style="margin-top:8px;"></div>
        <div id="waiterLeaderboardMsg" class="small-text" style="margin-top:10px;"></div>
        <div class="mb-performance-table-wrap" style="margin-top:12px;">
          <table class="mb-performance-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team Member</th>
                <th>Total Points</th>
                <th>Drill Pass %</th>
                <th>Encounter Pass %</th>
                <th>Challenge Success %</th>
                <th>Premium Success %</th>
                <th>Mastery %</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody id="waiterLeaderboardRows"></tbody>
          </table>
        </div>
      </div>
    </div>
  </section>

  <section id="screenManagerMessenger" class="screen hidden">
    <div class="panel stack">
      <div class="topbar">
        <div class="brand">
          <h2>Messenger</h2>
          <span class="badge">PREMIUM</span>
        </div>
        <div class="row">
          <button id="btnCloseManagerMessenger" class="btn-ghost" type="button">Close</button>
        </div>
      </div>

      <div class="card" data-tutorial="mb-panel-messenger">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <strong>Messenger</strong>
          <div style="display:flex; gap:8px; align-items:center;">
            <button id="mbToggleMessengerPanel" class="btn-ghost" type="button">Close Inbox</button>
            <button id="mbMsgRefresh" class="btn-ghost" type="button">Refresh</button>
          </div>
        </div>

        <div class="small-text" style="margin-top:6px; opacity:.85;">
          Progress reports from staff + coaching replies. (Per active restaurant.)
        </div>

        <div id="mbMessengerDeck" style="display:flex; flex-direction:column; gap:0; margin-top:12px;">
        <div id="mbMessengerColumns" style="display:grid; grid-template-columns: 280px 1fr; gap:12px; margin-top:12px;">
          <div id="mbMessengerThreadsPane" style="border:1px solid rgba(255,255,255,0.10); border-radius:12px; overflow:hidden;">
          <div style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.10); font-weight:600;">
              Staff Threads
            </div>

            <div style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.10);">
              <div style="display:flex; gap:8px; align-items:center;">
                <input
                  id="mbMessengerSearch"
                  class="input"
                  type="search"
                  placeholder="Search threads by person, message, or type"
                  style="width:100%;"
                />
                <button id="mbMessengerSearchClear" class="btn-ghost" type="button" title="Clear thread search">Clear</button>
              </div>
            </div>

            <div id="mbThreadList" style="display:flex; flex-direction:column; gap:0;"></div>

            <div id="mbThreadEmpty" class="small-text" style="padding:10px; display:none; opacity:.8;">
              No waiter threads yet.
            </div>
          </div>

          <div id="mbMessengerDetailPane" style="border:1px solid rgba(255,255,255,0.10); border-radius:12px; overflow:hidden; display:flex; flex-direction:column; min-height:520px;">
          <div style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.10);">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
              <strong id="mbThreadTitle">Select a waiter</strong>
              <span id="mbThreadMeta" class="small-text" style="opacity:.75;"></span>
            </div>
          </div>

          <div id="mbThreadTimelinePanel" class="card" style="margin:10px 10px 0; padding:10px;"></div>

            <div id="mbThreadMessages"
              style="flex:1; padding:10px; display:flex; flex-direction:column; gap:8px; overflow-y:auto; min-height:280px; border-top:1px solid rgba(255,255,255,0.10);">
              <div class="small-text" style="opacity:.8;">Select a waiter thread in this restaurant to assign a timed challenge.</div>
            </div>

            <div id="mbThreadActions" style="padding:10px; border-top:1px solid rgba(255,255,255,0.10); display:flex; flex-direction:column; gap:10px;">
              <div id="mbThreadStatePanel" class="card" style="padding:10px;"></div>

              <div id="mbThreadRecommendationsPanel" class="card" style="padding:10px;">
                <div>
                  <strong>Suggested prompts</strong>
                  <div id="mbSuggestedPrompts" style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;"></div>
                </div>

                <div id="mbThreadChallengeRecommendations" style="margin-top:12px;"></div>
              </div>

              <div class="small-text" style="opacity:.75;">Actions</div>
              <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                <button id="mbInstrRunDrill" class="btn-ghost" type="button">Run Drill</button>
                <button id="mbInstrUseSuggestion" class="btn-ghost" type="button">Use Suggestion</button>
              </div>

              <textarea id="mbInstrBody" class="input"
                style="width:100%; min-height:110px;"
                placeholder="Example: Tonight: keep it short + confirm intent first. Run 5-min Guest Reading before shift."></textarea>

              <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                <button id="mbInstrSend" class="btn" type="button">Send Message</button>
              </div>

              <div class="small-text" id="mbInstrQuota" style="opacity:.78;"></div>
              <div class="small-text" id="mbInstrStatus" style="opacity:.85;"></div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  </section>

  <!-- PREMIUM SETUP (PARENT-OWNED) -->
  <section id="screenSetupPremium" class="screen hidden">
    <div class="panel app-setup-shell">
      <div class="app-setup-header">
        <h2>Setup</h2>
        <div class="score-row app-score-row">Wines added: <span id="wineCountPremium">0 / 10</span></div>
      </div>

      <div class="manager-panel app-setup-list">
        <h3>Wine Cards</h3>
        <div id="premiumWineCards" class="wine-cards" data-tutorial="wine-list"></div>

        <details id="premiumWineAdvanced" class="wine-advanced panel-spaced app-advanced-panel">
          <summary>Advanced (add wines + table)</summary>

          <div id="wineAdminPanel" class="panel-spaced app-admin-panel" data-tutorial="wine-panel">
            <div class="manager-row app-form-row">
              <input type="text" id="wineNameInputPremium" data-tutorial="wine-name" placeholder="Wine Name (required)" />
              <input type="text" id="wineVarietalInputPremium" data-tutorial="wine-varietal" placeholder="Varietal (required)" />
            </div>

            <div class="manager-row app-form-row app-form-section">
              <strong>Fruit Profile (choose up to 2):</strong>
              <div class="option-grid" id="fruitOptionsPremium" data-tutorial="fruit-options"></div>
            </div>

            <div class="manager-row app-form-row app-form-section">
              <strong>Structure/Texture (choose up to 2):</strong>
              <div class="option-grid" id="textureOptionsPremium" data-tutorial="texture-options"></div>
            </div>

            <div class="manager-row app-form-row app-form-section">
              <strong>Oak Level (choose 1):</strong>
              <div class="option-grid" id="oakOptionsPremium" data-tutorial="oak-options"></div>
            </div>

            <div class="manager-row app-form-row app-form-section">
              <input type="text" id="regionInputPremium" data-tutorial="wine-region" placeholder="Region (optional)" />
            </div>

            <div class="manager-row app-form-row">
              <button id="addWineBtnPremium" type="button" data-tutorial="wine-add">Add Wine</button>
            </div>

            <h3 style="margin-top:16px;">Wine List</h3>
            <table class="wine-table">
              <thead>
                <tr>
                  <th>Name</th><th>Varietal</th><th>Fruit</th><th>Texture</th><th>Oak</th><th>Region</th><th>Action</th>
                </tr>
              </thead>
              <tbody id="premiumWineTableBody"></tbody>
            </table>
          </div>
        </details>
      </div>

      <div class="button-row app-setup-actions">
        <button id="btnContinuePremium" type="button" data-tutorial="encounter-start">Start</button>
        <button id="btnBackHomeFromSetupPremium" type="button" data-tutorial="encounter-back">Back</button>
      </div>
    </div>
  </section>

  <!-- MANAGER BOARD -->
  <section id="screenManagerBoard" class="screen hidden">
    <div class="panel stack">
      <div class="topbar">
        <div class="brand">
          <h2>Manager Board</h2>
          <span class="badge">PREMIUM</span>
        </div>
        <div class="row">
          <button id="btnBackToPremium" class="btn-ghost" type="button">Back</button>
        </div>
      </div>

      <div id="mbMenu" class="card" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <button class="btn" type="button" data-mbtab="overview" data-tutorial="mb-tab-overview">Overview</button>
        <button class="btn" type="button" data-mbtab="gameplay_adjustments" data-tutorial="mb-tab-gameplay-adjustments">Gameplay Adjustments</button>
        <button class="btn" type="button" data-mbtab="performance" data-tutorial="mb-tab-performance">Team Performance</button>
        <button class="btn" type="button" data-mbtab="billing" data-tutorial="mb-tab-billing">Listing</button>
        <button class="btn hidden" type="button" data-mbtab="enterprise" id="mbEnterpriseTabBtn" data-tutorial="mb-tab-enterprise">Enterprise</button>
        <select id="mbRestaurantPicker" class="hidden input" data-tutorial="restaurant-picker" style="margin-left:auto; min-width:220px;"></select>
      </div>

      <div id="mbPanels">
        <div id="mbTab_overview" class="mbTab" data-tutorial="mb-panel-overview">
          <div id="mbOverviewRitualStatus" style="margin-top:12px;"></div>

          <div id="mbRestaurantContextCard" style="margin-top:12px;"></div>
          <div id="mbGroupOverviewCard" style="margin-top:12px;"></div>
          <div id="mbGroupRestaurantComparisonCard" style="margin-top:12px;"></div>
          <div id="mbInviteSummary" style="margin-top:12px;"></div>
        </div>

        <div id="mbTab_gameplay_adjustments" class="mbTab hidden" data-tutorial="mb-panel-gameplay-adjustments">
          <div id="mbOverviewLiveEffects" class="hidden" style="display:none; margin-top:12px;"></div>
          <div id="mbGameplayAdjustmentsPanel" style="margin-top:12px;"></div>
          <div id="mbAttributeAbilitiesPanel" style="margin-top:12px;"></div>
          <div id="mbAreaAbilitiesPanel" style="margin-top:12px;"></div>
          <div id="mbDrillQuickActionsPanel" style="margin-top:12px;"></div>
          <div id="mbTimedChallengeQuickActionsPanel" style="margin-top:12px;"></div>
          <div id="mbDisplayMethodQuickActionsPanel" class="hidden" style="display:none; margin-top:12px;"></div>
          <div id="mbTimedChallengeComposer" class="card" style="display:flex; flex-direction:column; gap:10px; padding:12px; margin-top:12px; margin-bottom:12px;">
            <div style="font-weight:600;">Send Timed Challenge</div>

            <div class="row" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
              <select id="mbTimedChallengeTarget" style="min-width:180px;"></select>

              <select id="mbTimedChallengeType">
                <optgroup label="Skill Focus">
                  <option value="closing_push">Closing Push</option>
                  <option value="recovery_window">Recovery Window</option>
                  <option value="read_first">Read First</option>
                  <option value="full_delivery">Full Delivery</option>
                </optgroup>
                <optgroup label="Outcome">
                  <option value="clean_close">Clean Close</option>
                  <option value="soft_close">Soft Close</option>
                  <option value="successful_pivot">Successful Pivot</option>
                </optgroup>
                <optgroup label="Discipline">
                  <option value="no_reset_run">No Reset Run</option>
                  <option value="stable_signal">Stable Signal</option>
                  <option value="controlled_table">Controlled Table</option>
                </optgroup>
                <optgroup label="Momentum">
                  <option value="solid_interaction">Solid Interaction</option>
                  <option value="premium_moment">Premium Moment</option>
                  <option value="commanding_presence">Commanding Presence</option>
                </optgroup>
              </select>

              <select id="mbTimedChallengeWine" style="min-width:220px;"></select>

              <select id="mbTimedChallengeDuration">
                <option value="3600">1 hr</option>
                <option value="7200">2 hrs</option>
                <option value="10800" selected>3 hrs</option>
              </select>

              <select id="mbTimedChallengePlacement">
                <option value="before_start" selected>Before encounter 1</option>
                <option value="after_first_encounter">After encounter 1</option>
              </select>

              <input
                id="mbTimedChallengeReward"
                type="number"
                min="1"
                max="5"
                step="1"
                value="5"
                style="width:110px;"
                placeholder="Points"
              />
            </div>

            <div class="small" style="opacity:.8;">
              Assign a live objective by skill focus, outcome, discipline, or momentum.
            </div>

            <div class="row" style="display:flex; gap:8px; align-items:center;">
              <button id="btnSendTimedChallenge" class="btn" type="button">Send Challenge</button>
              <div id="mbTimedChallengeStatus" class="small" style="opacity:.85;"></div>
            </div>

            <div id="mbTimedChallengeRecentSummary" class="small" style="opacity:.85; margin-top:4px;"></div>
          </div>
          <div id="mbOverviewAbilityEconomy" style="margin-top:12px;"></div>
        </div>

        <div id="mbTab_performance" class="mbTab hidden" data-tutorial="mb-panel-performance">
        <div id="mbInsightsPanel" style="margin-top:12px;"></div>
        </div>

        <div id="mbTab_billing" class="mbTab hidden" data-tutorial="mb-panel-billing">
          <div id="mbBillingAccess" class="card" style="margin-top:12px;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
              <strong>Billing & Access</strong>
              <span id="mbSeatStatus" class="badge">Seats: —</span>
            </div>

            <div class="small-text" id="mbSeatDetail" style="margin-top:6px;">
              Loading seat usage…
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
              <button id="mbRefreshSeats" class="btn-ghost" type="button">Refresh</button>
            </div>
            <div class="small-text premium-contact-copy" style="margin-top:10px;">
              Seat plans are now provisioned through Premium signup and licensing. Contact <a href="mailto:hello@bottlecaller.com">hello@bottlecaller.com</a> if you need a different seat package issued.
            </div>
          </div>

          <div id="mbListingMenuPanel" class="card" style="margin-top:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
              <strong>Premium Menu</strong>
            </div>

            <div style="margin-top:10px; font-size:13px; opacity:.95;">
              <div><b>Role:</b> <span id="mbListingRole">-</span></div>
              <div><b>Restaurant:</b> <span id="mbListingRestName">-</span></div>
              <div id="mbListingJoinRow" class="row" style="margin-top:10px; align-items:center; gap:10px; flex-wrap:wrap;">
                <div><b>Join code:</b> <span id="mbListingJoinCode">-</span></div>
                <button id="btnMbListingCopyCode" type="button">Copy join code</button>
              </div>
              <div><b>Seat limit:</b> <span id="mbListingSeatLimit">-</span></div>
              <div><b>Invite required:</b> <span id="mbListingRequireInvite">-</span></div>
            </div>
          </div>

          <div id="mbListingManagerOnlyBlock" style="margin-top:12px;">
            <div id="mbListingManagerSetupSection">
              <div id="mbListingGroupSetupCard" class="card" style="margin-top:12px;">
                <strong>Group Manager Signup</strong>
                <div class="small-text" style="margin-top:6px;">
                  Paste a GROUP manager_setup code to create or upgrade a manager scope for multi-restaurant control.
                </div>

                <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                  <input id="mbListingGroupSetupCode" type="text" placeholder="GROUP_XXXXX" style="flex:1; min-width:220px;" />
                  <button id="mbListingRedeemGroupSetup" class="btn-primary" type="button">Redeem</button>
                </div>

                <div id="mbListingGroupSetupMsg" class="small-text" style="margin-top:8px;"></div>
                <div class="small-text premium-contact-copy" style="margin-top:10px;">
                  Contact us at <a href="mailto:hello@bottlecaller.com">hello@bottlecaller.com</a> with the upgrade and seat plan you want. We will issue the matching code for this profile.
                </div>
              </div>

              <div id="mbListingProvisionAccess" class="card" style="margin-top:12px;">
                <strong>Enterprise Signup</strong>
                <div class="small-text" style="margin-top:6px;">
                  Paste an Enterprise manager_setup code to upgrade this manager scope.
                </div>

                <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                  <input id="mbListingEnterpriseCode" type="text" placeholder="ENTERPRISE_XXXXX" style="flex:1; min-width:220px;" />
                  <button id="mbListingRedeemEnterprise" class="btn-primary" type="button">Redeem</button>
                </div>

                <div id="mbListingEnterpriseMsg" class="small-text" style="margin-top:8px;"></div>
                <div class="small-text premium-contact-copy" style="margin-top:10px;">
                  Contact us at <a href="mailto:hello@bottlecaller.com">hello@bottlecaller.com</a> for enterprise provisioning. We will send the correct enterprise code for this account.
                </div>
              </div>
            </div>

            <div id="mbListingActiveRestaurantCard" class="card" style="margin-top:12px;">
              <strong>Active Restaurant</strong>
              <div class="small-text" style="margin-top:6px;">
                Switch which restaurant you’re managing right now.
              </div>

              <div style="display:flex; gap:8px; margin-top:10px; align-items:center;">
                <select id="mbListingActiveRestaurant" class="input" style="flex:1;"></select>
                <button id="mbListingSetActiveRestaurant" class="btn" type="button">Set</button>
              </div>

              <div id="mbListingActiveRestaurantHint" class="small-text" style="margin-top:8px;"></div>
            </div>

            <div class="card" style="margin-top:12px;">
              <strong>Invite emails</strong>
              <div style="margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                <input id="mbListingInviteEmailInput" type="email" placeholder="waiter@email.com" style="flex:1; min-width:220px;" />
                <button id="mbListingAddInvite" class="btn-primary" type="button">Add waiter</button>
              </div>

              <div id="mbInvitesList" style="margin-top:10px; font-size:12px; opacity:.95;"></div>
            </div>
          </div>

          <div id="mbListingMsg" class="small-text" style="margin-top:10px;"></div>
        </div>

        <div id="mbTab_enterprise" class="mbTab hidden" data-tutorial="mb-panel-enterprise">
          <div id="mbEnterprisePanel" style="margin-top:12px;">
            <div class="card" style="padding:12px;">
              <div style="font-weight:600;">Enterprise</div>
              <div class="small-text" style="margin-top:8px; opacity:.8;">
                Enterprise-level controls will appear here for enterpriser roles.
              </div>
            </div>
          </div>
        </div>

      </div>

      <div id="mbMsg" class="small"></div>
    </div>
  </section>

  <!-- DEMO APP -->
  <section id="screenGameDemo" class="screen hidden">
    <div class="panel stack">
      <div class="topbar">
        <div class="brand">
          <h2>BottleCaller</h2>
          <span class="badge">DEMO</span>
          <span id="demoAuthedBadge" class="badge hidden">LOGGED IN</span>
        </div>
        <div class="row">
          <button id="btnDemoPremium" class="btn-ghost" type="button">Premium</button>
          <button id="btnDemoExit" type="button">Exit</button>
        </div>
      </div>

      <!-- Join block: only for logged-in waiter with no restaurant -->
      <div id="demoJoinBlock" class="hidden card">
        <div class="row" style="justify-content:space-between; align-items:flex-start;">
          <div style="min-width:220px;">
            <b>Join a restaurant</b>
            <p class="small" style="margin-top:6px;">
              Paste the join code. You can keep playing Demo while Premium access is restricted.
            </p>
          </div>

          <div style="min-width:260px;">
            <input id="demoJoinCode" type="text" placeholder="Join code" />
            <div class="row" style="margin-top:10px;">
              <button id="btnDemoJoin" class="btn-primary" type="button">Submit</button>
            </div>
          </div>
        </div>

        <div id="demoJoinMsg" class="small" style="margin-top:10px;"></div>
      </div>

      <!-- Game lives here (isolated) -->
      <div id="gameRootDemo"></div>
      <div id="demoContactFooter" class="small hidden" style="margin-top:8px;">
        Contact us for purchase:
        <a href="mailto:hello@bottlecaller.com" style="color:#fff;">hello@bottlecaller.com</a>
      </div>
    </div>
  </section>

  <!-- HUD BACKDROP -->
  <div id="hudBackdrop" class="hidden"
    style="position:fixed; inset:0; background: rgba(0,0,0,0.55); z-index: 99998;"></div>

  <div id="waiterMessagesBackdrop" class="hidden"
    style="position:fixed; inset:0; background: rgba(0,0,0,0.55); z-index: 2147482999;"></div>

  <div id="waiterMessagesPanel" class="hidden"
    style="
      position:fixed; right:12px; top:12px;
      width:min(560px, 94vw);
      max-height:calc(100vh - 24px);
      overflow-y:auto;
      z-index:2147483001;
      background:#0b0d0f; color:#fff;
      border-radius:14px;
      padding:12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      border:1px solid rgba(255,255,255,0.10);
    ">
    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
      <b>Coach Messages</b>
      <button id="btnCloseMessages" type="button" style="font-size:12px;">Close</button>
    </div>

    <div style="margin-top:14px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.10);">
      <button id="btnWaiterSendProgress" class="btn-ghost" type="button">Send Progress</button>
      <div id="waiterSendProgressStatus" class="small-text" style="margin-top:6px; opacity:.85;"></div>
    </div>

    <div id="waiterMessagesThread" style="margin-top:12px; display:flex; flex-direction:column; gap:8px;">
      <div class="small-text" style="opacity:.8;">No messages yet.</div>
    </div>
  </div>

  <!-- HUD PANEL -->
  <div id="hudPanel" class="hidden"
    style="
      position:fixed; right: 12px; top: 12px;
      width: min(520px, 92vw);
      max-height: calc(100vh - 24px);
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-gutter: stable;
      z-index: 2147483000;
      pointer-events: auto;
      background: #0b0d0f; color: #fff;
      border-radius: 14px;
      padding: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.10);
    ">
    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
      <b>Premium Menu</b>
      <button id="btnCloseHud" type="button" style="font-size:12px;">Close</button>
    </div>

    <div style="margin-top:10px; font-size:13px; opacity:.95;">
      <div><b>Role:</b> <span id="hudRole">-</span></div>
      <div><b>Restaurant:</b> <span id="hudRestName">-</span></div>

      <!-- Join code MANAGER ONLY -->
      <div id="hudJoinRow" class="row hidden" style="margin-top:10px; align-items:center; gap:10px; flex-wrap:wrap;">
        <div><b>Join code:</b> <span id="hudJoinCode">-</span></div>
        <button id="btnCopyHudCode" type="button">Copy join code</button>
      </div>

      <div><b>Seat limit:</b> <span id="hudSeatLimit">-</span></div>
      <div><b>Invite required:</b> <span id="hudRequireInvite">-</span></div>
    </div>
    <div style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.10);">
      <button id="btnHudSendProgress" class="btn-ghost" type="button">Send progress to manager</button>
      <div id="hudSendProgressStatus" class="small-text" style="margin-top:6px; opacity:.85;"></div>
    </div>

    <div id="managerOnlyBlock" class="hidden">
      <hr style="opacity:.25; margin:12px 0;" />

      <h3 style="margin:0;">Manager controls</h3>

      <hr style="opacity:.25; margin:12px 0;" />
      <div id="managerSetupSection">
      <h3 style="margin:0;">Manager setup codes</h3>
      <div class="small-text" style="margin-top:6px; opacity:.9;">
        Redeem Group / Enterprise manager_setup codes.
      </div>
      <div id="mbGroupSetupCard" class="card" style="margin-top:10px;">
        <strong>Group Manager Signup</strong>
        <div class="small-text" style="margin-top:6px;">
          Paste a GROUP manager_setup code to create/upgrade a manager scope for multi-restaurant control.
        </div>

        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
          <input id="mbGroupSetupCode" type="text" placeholder="GROUP_XXXXX" style="flex:1; min-width:220px;" />
          <button id="mbRedeemGroupSetup" class="btn-primary" type="button">Redeem</button>
        </div>

        <div id="mbGroupSetupMsg" class="small-text" style="margin-top:8px;"></div>
        <div class="small-text premium-contact-copy" style="margin-top:10px;">
          Contact us at <a href="mailto:hello@bottlecaller.com">hello@bottlecaller.com</a> with the upgrade and seat plan you want. We will issue the matching code for this profile.
        </div>
      </div>

      <div id="mbProvisionAccess" class="card" style="margin-top:12px;">
        <strong>Enterprise Signup</strong>
        <div class="small-text" style="margin-top:6px;">
          Paste an Enterprise manager_setup code to upgrade this manager scope.
        </div>

        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
          <input id="mbEnterpriseCode" type="text" placeholder="ENTERPRISE_XXXXX" style="flex:1; min-width:220px;" />
          <button id="mbRedeemEnterprise" class="btn-primary" type="button">Redeem</button>
        </div>

        <div id="mbEnterpriseMsg" class="small-text" style="margin-top:8px;"></div>
        <div class="small-text premium-contact-copy" style="margin-top:10px;">
          Contact us at <a href="mailto:hello@bottlecaller.com">hello@bottlecaller.com</a> for enterprise provisioning. We will send the correct enterprise code for this account.
        </div>
      </div>
      </div>

      <hr style="opacity:.25; margin:12px 0;" />
      <div id="premiumActiveRestaurantCard" class="card" style="margin-top:12px;">
        <strong>Active Restaurant</strong>
        <div class="small-text" style="margin-top:6px;">
          Switch which restaurant you’re managing right now.
        </div>

        <div style="display:flex; gap:8px; margin-top:10px; align-items:center;">
          <select id="selActiveRestaurant" class="input" style="flex:1;"></select>
          <button id="btnSetActiveRestaurant" class="btn" type="button">Set</button>
        </div>

        <div id="activeRestaurantHint" class="small-text" style="margin-top:8px;"></div>
      </div>
      <div id="hudRestaurantPickerMsg" class="small-text" style="margin-top:8px;"></div>

      <hr style="opacity:.25; margin:12px 0;" />

      <h3 style="margin:0;">Invite emails</h3>
      <div style="margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <input id="inviteEmailInput" type="email" placeholder="waiter@email.com" style="flex:1; min-width:220px;" />
        <button id="btnAddInvite" class="btn-primary" type="button">Add waiter</button>
      </div>

      <div id="invitesList" style="margin-top:10px; font-size:12px; opacity:.95;"></div>
    </div>

    <div id="hudMsg" class="small" style="margin-top:10px;"></div>
  </div>
`;

if (bootError) {
  renderBootError(bootError);
  throw bootError;
}

// ------------------------------------------------------------
// Debug + global crash catcher
// ------------------------------------------------------------
function setDebug(obj) {
  return obj;
}

window.addEventListener("error", (e) => {
  setDebug({
    step: "window.error",
    message: e?.message,
    source: e?.filename,
    line: e?.lineno,
    col: e?.colno,
  });
});
window.addEventListener("unhandledrejection", (e) => {
  setDebug({ step: "unhandledrejection", reason: String(e?.reason?.message || e?.reason) });
});

// ------------------------------------------------------------
// State
// ------------------------------------------------------------
let appMode = "public"; // public | demo | premium
let routingLock = false;
let lastRouteAt = 0;

let authIntent = "login"; // login/public | premium

const uiState = {
  role: "waiter", // waiter | manager (used only for signup UI)
  mode: "login", // login | signup
  managerPackage: "single_manager", // single_manager | group_manager | enterpriser
  seatPlan: "15", // provisioning preference only
  restaurantCount: "3", // group / enterpriser provisioning preference
};

const appState = {
  session: null,
  profile: null,
  restaurant: null,
  invites: [],
};

let authedStateInflight = null;
let authedStateLoadedAt = 0;
const AUTHED_STATE_CACHE_MS = 10000;
let managerRestaurantChoicesCache = {
  key: "",
  loadedAt: 0,
  rows: null,
};
let managerRestaurantChoicesInflight = null;
const MANAGER_RESTAURANT_CHOICES_CACHE_MS = 120000;
const MANAGER_BOARD_OVERVIEW_CACHE_MS = 15000;
const MANAGER_BOARD_MEMBERS_CACHE_MS = 15000;
const MANAGER_BOARD_MESSENGER_CACHE_MS = 10000;
const MANAGER_BOARD_PERFORMANCE_CACHE_MS = 20000;
const MANAGER_BOARD_SELECTION_CACHE_MS = 20000;
let managerBoardOverviewCache = { rid: "", loadedAt: 0 };
let managerBoardMembersCache = { rid: "", loadedAt: 0, rows: null };
let managerBoardMessengerCache = { rid: "", loadedAt: 0, rows: null };

function isFreshCacheEntry(entry, ttlMs, rid) {
  return (
    entry &&
    String(entry.rid || "") === String(rid || "") &&
    Date.now() - Number(entry.loadedAt || 0) < Number(ttlMs || 0)
  );
}

function invalidateManagerBoardCaches(rid = null) {
  const key = String(rid || "");
  if (!key || String(managerBoardOverviewCache.rid || "") === key) {
    managerBoardOverviewCache = { rid: "", loadedAt: 0 };
  }
  if (!key || String(managerBoardMembersCache.rid || "") === key) {
    managerBoardMembersCache = { rid: "", loadedAt: 0, rows: null };
  }
  if (!key || String(managerBoardMessengerCache.rid || "") === key) {
    managerBoardMessengerCache = { rid: "", loadedAt: 0, rows: null };
  }
}

function shouldBypassAuthedStateCache(reason = "") {
  const text = String(reason || "").toLowerCase();
  return (
    text.includes("refresh") ||
    text.includes("claim") ||
    text.includes("signup") ||
    text.includes("login.ok") ||
    text.includes("logout")
  );
}

function getParentCtxSnapshot(requestedMode = "premium") {
  const session = appState?.session || null;
  const profile = appState?.profile || null;
  const progressionOwner = getActiveProgressionOwnerContext();
  const membershipRole = normalizeMembershipRole(profile || null) || profile?.role || "waiter";
  const activeRestaurantId =
    window.getActiveRestaurantId?.() ||
    appState?.activeRestaurantId ||
    profile?.restaurant_id ||
    appState?.restaurant?.id ||
    null;
  const epoch = Number(window.__BC_IFRAME_EPOCH__ || 0);
  const mode = requestedMode ?? "premium";
  const userId = session?.user?.id || null;
  const profileUserId = profile?.user_id || userId || null;
  const scopeId = profile?.scope_id || null;
  const scopeType = profile?.scope_type || null;
  const accessTier = profile?.access_tier || "demo";

  return {
    session,
    profile,
    requestedMode: mode,
    mode,
    epoch,
    userId,
    profileUserId,
    membershipRole,
    role: membershipRole,
    membership_role: membershipRole,
    gameplayRole: membershipRole,
    gameplay_role: membershipRole,
    scopeId,
    scopeType,
    accessTier,
    restaurantId: activeRestaurantId,
    activeRestaurantId,
    progressionOwnerUserId: progressionOwner.userId || profileUserId,
    progressionOwnerRestaurantId: progressionOwner.restaurantId || activeRestaurantId,
    progressionOwner,
    ctxReady: !!userId && !!membershipRole && (String(mode).toLowerCase() === "demo" || !!activeRestaurantId),
    premiumIframeMounted: !!document.getElementById("premiumRootFrame")?.contentWindow,
    lastSourceCtx: window.__BC_LAST_SOURCE_CTX__ || null,
  };
}

function isParentCtxReady(requestedMode = "premium") {
  return !!getParentCtxSnapshot(requestedMode).ctxReady;
}

function isPremiumIframeHealthy() {
  const iframe = document.getElementById("premiumRootFrame");
  const targetEpoch = Number(window.__BC_IFRAME_EPOCH__ || iframe?.dataset?.bcEpoch || 0);
  const frameCtx = iframe?.contentWindow?.__BC_CTX__ || null;
  const frameEpoch = Number(iframe?.contentWindow?.__BC_EPOCH__ || 0);
  return !!frameCtx?.userId &&
    !!frameCtx?.restaurantId &&
    !!(frameCtx?.membershipRole || frameCtx?.role) &&
    (!!targetEpoch ? frameEpoch === targetEpoch : true);
}

window.__BC_PARENT_STATE__ = {
  get: getParentCtxSnapshot,
  isCtxReady: isParentCtxReady,
  isPremiumIframeHealthy,
};
window.__BC_PARENT_SMOKE_TEST__ = function __BC_PARENT_SMOKE_TEST__() {
  const snapshot = getParentCtxSnapshot("premium");
  const iframe = document.getElementById("premiumRootFrame");
  const frameWin = iframe?.contentWindow || null;
  const iframeState = frameWin?.__BC_STATE__?.get?.() || null;
  const iframeSmoke = frameWin?.__BC_IFRAME_SMOKE_TEST__?.() || null;
  const frameCtx = frameWin?.__BC_CTX__ || null;
  const frameEpoch = Number(frameWin?.__BC_EPOCH__ || 0);
  const targetEpoch = Number(window.__BC_IFRAME_EPOCH__ || iframe?.dataset?.bcEpoch || 0);
  const checks = [
    { id: "parent_ctx_ready", ok: !!snapshot.ctxReady, value: snapshot.ctxReady },
    { id: "iframe_mounted", ok: !!frameWin, value: !!frameWin },
    { id: "iframe_healthy", ok: isPremiumIframeHealthy(), value: isPremiumIframeHealthy() },
    { id: "epoch_match", ok: !!targetEpoch && frameEpoch === targetEpoch, value: { parentEpoch: targetEpoch, iframeEpoch: frameEpoch } },
    {
      id: "user_match",
      ok: !!snapshot.userId && !!frameCtx?.userId && snapshot.userId === frameCtx.userId,
      value: { parentUserId: snapshot.userId || null, iframeUserId: frameCtx?.userId || null }
    },
    {
      id: "restaurant_match",
      ok: !!snapshot.activeRestaurantId && !!frameCtx?.restaurantId && snapshot.activeRestaurantId === frameCtx.restaurantId,
      value: { parentRestaurantId: snapshot.activeRestaurantId || null, iframeRestaurantId: frameCtx?.restaurantId || null }
    },
    {
      id: "role_match",
      ok: !!snapshot.membershipRole &&
        !!(frameCtx?.membershipRole || frameCtx?.membership_role || frameCtx?.role) &&
        snapshot.membershipRole === (frameCtx?.membershipRole || frameCtx?.membership_role || frameCtx?.role),
      value: {
        parentRole: snapshot.membershipRole || null,
        iframeRole: frameCtx?.membershipRole || frameCtx?.membership_role || frameCtx?.role || null
      }
    },
    {
      id: "iframe_state_ready",
      ok: iframeState?.stateHealth === "ready",
      value: iframeState?.stateHealth || null
    },
  ];
  const failed = checks.filter((check) => !check.ok).map((check) => check.id);
  return {
    ok: failed.length === 0,
    summary: failed.length ? `failed:${failed.join(",")}` : "ok",
    parent: snapshot,
    iframe: {
      epoch: frameEpoch,
      ctx: frameCtx,
      state: iframeState,
      smoke: iframeSmoke,
    },
    checks,
  };
};

(function bcAuthInvariantWatchdog() {
  if (window.__BC_AUTH_WATCHDOG__) return;
  window.__BC_AUTH_WATCHDOG__ = true;

  function killPremium(reason) {
    try { document.getElementById("premiumRootFrame")?.remove(); } catch {}
    try {
      const r = document.getElementById("premiumRoot");
      if (r) r.innerHTML = "";
    } catch {}
    try {
      const d = document.getElementById("gameRootDemo");
      if (d) d.innerHTML = "";
    } catch {}
    try {
      const b = document.getElementById("btnLogout");
      if (b) b.style.display = "none";
    } catch {}
    try { showScreen("screenHome"); } catch {}

    window.__BC_PENDING_START_DRILL__ = null;
    window.BC_PENDING_START_DRILL = null;

    console.warn("[AUTH_WATCHDOG] enforced logged-out UI:", reason);
  }

  const tick = () => {
    if (document.hidden) return;
    const hasSession = !!window.appState?.session;
    if (!hasSession) {
      const premRoot = document.getElementById("premiumRoot");
      const hasFrame = !!document.getElementById("premiumRootFrame");
      const hasHtml = premRoot ? premRoot.innerHTML.trim().length > 0 : false;
      if (hasFrame || hasHtml) {
        killPremium("interval.detected_premium_without_session");
      }
    }
  };

  tick();
  window.__BC_AUTH_WATCHDOG_TICK__ = window.setInterval(tick, 2500);
})();

let __BC_ROLE_CAPABILITIES_TABLE__ = null;
function getRoleCapabilitiesTable() {
  if (__BC_ROLE_CAPABILITIES_TABLE__) return __BC_ROLE_CAPABILITIES_TABLE__;

  __BC_ROLE_CAPABILITIES_TABLE__ = Object.freeze({
    waiter: Object.freeze({
      membershipRole: "waiter",
      gameplayRole: "waiter",
      canPlay: true,
      canInviteWaiters: false,
      canManageRestaurant: false,
      canManageGroup: false,
      canManageEnterprise: false,
      canUseIntuit: false,
      hasManagerControls: false,
    }),
    single_manager: Object.freeze({
      membershipRole: "single_manager",
      gameplayRole: "single_manager",
      canPlay: true,
      canInviteWaiters: true,
      canManageRestaurant: true,
      canManageGroup: false,
      canManageEnterprise: false,
      canUseIntuit: false,
      hasManagerControls: true,
    }),
    group_manager: Object.freeze({
      membershipRole: "group_manager",
      gameplayRole: "group_manager",
      canPlay: true,
      canInviteWaiters: true,
      canManageRestaurant: true,
      canManageGroup: true,
      canManageEnterprise: false,
      canUseIntuit: false,
      hasManagerControls: true,
    }),
    enterpriser: Object.freeze({
      membershipRole: "enterpriser",
      gameplayRole: "enterpriser",
      canPlay: true,
      canInviteWaiters: true,
      canManageRestaurant: true,
      canManageGroup: true,
      canManageEnterprise: true,
      canUseIntuit: true,
      hasManagerControls: true,
    }),
    demo: Object.freeze({
      membershipRole: "demo",
      gameplayRole: "demo",
      canPlay: true,
      canInviteWaiters: false,
      canManageRestaurant: false,
      canManageGroup: false,
      canManageEnterprise: false,
      canUseIntuit: false,
      hasManagerControls: false,
    }),
  });

  return __BC_ROLE_CAPABILITIES_TABLE__;
}

function normalizeMembershipRole(input) {
  const table = getRoleCapabilitiesTable();
  const rawRole =
    typeof input === "string"
      ? input
      : (input?.membershipRole ?? input?.membership_role ?? input?.role ?? "");

  const role = String(rawRole || "").trim().toLowerCase();
  return table[role] ? role : "waiter";
}

function getRoleCapabilities(rawRole) {
  const table = getRoleCapabilitiesTable();
  return table[normalizeMembershipRole(rawRole)];
}

const PREMIUM_ROLE_CAPABILITIES = Object.freeze({
  waiter: Object.freeze({
    canAccessManagerBoard: false,
    canOpenSetupPremium: false,
    canInviteWaiters: false,
    canReadInvites: false,
    canAssignDrills: false,
    canAssignTimedChallenges: false,
    canUseManagerAbilities: false,
    canManageMultipleRestaurants: false,
    canUseEnterpriseControls: false,
    canImportEnterpriseMedia: false,
  }),
  single_manager: Object.freeze({
    canAccessManagerBoard: true,
    canOpenSetupPremium: true,
    canInviteWaiters: true,
    canReadInvites: true,
    canAssignDrills: true,
    canAssignTimedChallenges: true,
    canUseManagerAbilities: true,
    canManageMultipleRestaurants: false,
    canUseEnterpriseControls: false,
    canImportEnterpriseMedia: false,
  }),
  group_manager: Object.freeze({
    canAccessManagerBoard: true,
    canOpenSetupPremium: true,
    canInviteWaiters: true,
    canReadInvites: true,
    canAssignDrills: true,
    canAssignTimedChallenges: true,
    canUseManagerAbilities: true,
    canManageMultipleRestaurants: true,
    canUseEnterpriseControls: false,
    canImportEnterpriseMedia: false,
  }),
  enterpriser: Object.freeze({
    canAccessManagerBoard: true,
    canOpenSetupPremium: true,
    canInviteWaiters: true,
    canReadInvites: true,
    canAssignDrills: true,
    canAssignTimedChallenges: true,
    canUseManagerAbilities: true,
    canManageMultipleRestaurants: true,
    canUseEnterpriseControls: true,
    canImportEnterpriseMedia: true,
  }),
});

function getPremiumRoleCapabilities(roleLike) {
  const role = normalizeMembershipRole(roleLike);
  return PREMIUM_ROLE_CAPABILITIES[role] || PREMIUM_ROLE_CAPABILITIES.waiter;
}

function roleAliasesForMatching(role) {
  const raw = String(
    typeof role === "string"
      ? role
      : (role?.membershipRole ?? role?.membership_role ?? role?.role ?? "")
  ).trim().toLowerCase();
  const r = normalizeMembershipRole(raw);
  // Transitional compatibility only.
  // Accept legacy manager / enterprise_admin aliases while migrating to:
  // waiter, single_manager, group_manager, enterpriser.
  if (raw === "manager") return ["manager", "single_manager"];
  if (raw === "enterprise_admin") return ["enterprise_admin", "enterpriser"];
  if (r === "single_manager") return ["single_manager", "manager"];
  if (r === "group_manager") return ["group_manager"];
  if (r === "enterpriser") return ["enterpriser", "enterprise_admin"];
  if (r) return [r];
  return [];
}

function isManagerRole(roleLike) {
  // Transitional compatibility helper.
  // Prefer specific premium capability checks for active product behavior.
  const caps = getRoleCapabilities(roleLike);
  return !!caps.hasManagerControls;
}

function getDisplayRoleLabel(roleLike) {
  const role = normalizeMembershipRole(roleLike);
  switch (role) {
    case "waiter":
      return "Waiter";
    case "single_manager":
      return "Manager";
    case "group_manager":
      return "Group Manager";
    case "enterpriser":
      return "Enterpriser";
    default:
      return "Unknown";
  }
}
function isUuid(s) {
  return typeof s === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}
function hasRestaurantBoundAccess() {
  const role = normalizeMembershipRole(appState?.profile || null);
  const rid =
    window.getActiveRestaurantId?.() ||
    appState.activeRestaurantId ||
    appState.profile?.restaurant_id ||
    null;
  return isManagerRole(role) && isUuid(rid);
}

function canActOnRestaurant(roleLike, actorProfile, restaurantId) {
  const role = normalizeMembershipRole(roleLike);
  const rid = String(restaurantId || "");
  if (!rid) return false;

  if (role === "waiter") return false;

  const allowed = getActorRestaurantSet(actorProfile);
  return allowed.includes(rid);
}

function getActorRestaurantSet(profileLike) {
  const profile = profileLike || {};
  const role = normalizeMembershipRole(profile);

  const ownRestaurantId = String(
    profile?.restaurant_id ||
    profile?.restaurantId ||
    ""
  );

  const scopedRestaurantIds = Array.isArray(window.__BC_ALLOWED_RESTAURANT_IDS__)
    ? window.__BC_ALLOWED_RESTAURANT_IDS__.map((x) => String(x || "")).filter(Boolean)
    : [];

  if (role === "single_manager") {
    return ownRestaurantId ? [ownRestaurantId] : [];
  }

  if (role === "group_manager" || role === "enterpriser") {
    if (scopedRestaurantIds.length) return scopedRestaurantIds;
    return ownRestaurantId ? [ownRestaurantId] : [];
  }

  return [];
}

function getManagerActiveRestaurantId() {
  const scopeId = appState?.profile?.scope_id || null;
  const explicit =
    window.__BC_ACTIVE_MANAGER_RESTAURANT_ID__ ||
    window.__BC_ACTIVE_RESTAURANT_ID__ ||
    getStoredActiveRestaurantId?.(scopeId) ||
    null;

  if (explicit) return String(explicit);

  return String(
    appState?.restaurant?.id ||
    appState?.profile?.restaurant_id ||
    appState?.profile?.restaurantId ||
    ""
  ) || null;
}

function setManagerActiveRestaurantId(nextRestaurantId) {
  const rid = String(nextRestaurantId || "");
  if (!rid) return false;

  const profile = appState?.profile || {};
  if (!canActOnRestaurant(profile, profile, rid)) {
    console.warn("[MB] denied active restaurant switch", {
      rid,
      role: normalizeMembershipRole(profile)
    });
    return false;
  }

  window.__BC_ACTIVE_MANAGER_RESTAURANT_ID__ = rid;
  appState.activeRestaurantId = rid;
  setStoredActiveRestaurantId(profile?.scope_id || null, rid);
  setTimeout(() => {
    try { hydrateStoredDifficultyForProfile(); } catch {}
  }, 0);

  if (!appState.restaurant) appState.restaurant = {};
  appState.restaurant.id = rid;

  return true;
}
// --- storage key should be per-scope (group/enterprise) ---
function activeRestaurantStorageKey(scopeId) {
  return `bc_active_restaurant_id::${scopeId || "noscope"}`;
}

function getStoredActiveRestaurantId(scopeId = window.appState?.profile?.scope_id || null) {
  try { return localStorage.getItem(activeRestaurantStorageKey(scopeId)) || null; }
  catch { return null; }
}

function setStoredActiveRestaurantId(scopeId = window.appState?.profile?.scope_id || null, rid = null) {
  if (!rid) return;
  try { localStorage.setItem(activeRestaurantStorageKey(scopeId), rid); } catch {}
}

function difficultyStorageKey(userId = null, restaurantId = null) {
  return `bc_selected_difficulty_v1::${userId || "nouser"}::${restaurantId || "norestaurant"}`;
}

function getStoredDifficultyValue(userId = null, restaurantId = null) {
  try {
    const raw = localStorage.getItem(difficultyStorageKey(userId, restaurantId));
    if (raw == null) return null;
    const n = Number(raw);
    if (n <= 1) return 1;
    if (n >= 3) return 3;
    return 2;
  } catch {
    return null;
  }
}

function setStoredDifficultyValue(userId = null, restaurantId = null, difficulty = null) {
  const n = Number(difficulty);
  const normalized = n <= 1 ? 1 : n >= 3 ? 3 : 2;
  try {
    localStorage.setItem(difficultyStorageKey(userId, restaurantId), String(normalized));
  } catch {}
}

function hydrateStoredDifficultyForProfile() {
  const userId =
    appState?.profile?.user_id ||
    appState?.session?.user?.id ||
    null;
  const restaurantId =
    getManagerActiveRestaurantId?.() ||
    appState?.activeRestaurantId ||
    appState?.restaurant?.id ||
    appState?.profile?.restaurant_id ||
    null;
  const stored = getStoredDifficultyValue(userId, restaurantId);
  if (stored == null) return false;
  appState.difficulty = stored;
  try {
    postToGame?.("difficulty_set", { difficulty: stored });
  } catch (e) {
    console.warn("[HUD] difficulty hydrate post failed", e);
  }
  renderHudDifficultyControls?.();
  return true;
}

appState.activeRestaurantId = getStoredActiveRestaurantId();
window.__BC_APP_STATE__ = appState;
appState.progressionView = appState.progressionView || {
  level: "Building recognition",
  focus: "Reading guest intent",
  next: "Keep playing encounters",
  note: null
};
appState._lastAllowedTier = appState._lastAllowedTier || 1;
appState.runState = appState.runState || {
  inRun: false,
  encounterId: null,
  level: 1,
  chapter: 1,
  tier: 1, // 1 Fundamental, 2 Core, 3 Pressure

  // loop
  read: null,          // inferred guest vector / signals chosen
  mode: null,          // Scout/Guide/Authority/Charm/Closer
  hook: null,          // hookId
  drift: { vec: null, persist: 0 },

  // physics
  momentum: 0,
  selectivity: 0,

  // recovery / fragility
  authority: 0,
  recovery: null,      // { type, step, progress }

  // audit
  turn: 0,
  log: []
};
window.__BC_ABILITY_LIBRARY__ = window.__BC_ABILITY_LIBRARY__ || [
  {
    id: "closing_surge",
    family: "attribute",
    title: "Closing Surge",
    description: "Boost your closing pressure for a short time.",
    unlocked: true,
    available: true,
    active: false,
    usesRemaining: 1,
    durationSec: 120,
    allowedRoles: ["waiter", "single_manager", "group_manager", "enterpriser"],
    allowedModes: ["premium"],
    allowedSurfaces: ["gameplay_panel", "manager_board"],
    gameplayUsable: true,
    scope: "self",
    activationRules: {
      requireCtx: true,
      requirePremium: true,
      requireEncounter: true,
      allowDuringDrill: true,
      oncePerEncounter: true,
    },
    payload: { focus: "closing", strength: 1 }
  },
  {
    id: "recovery_focus",
    family: "attribute",
    title: "Recovery Focus",
    description: "Gain better recovery control for a short time.",
    unlocked: true,
    available: true,
    active: false,
    usesRemaining: 1,
    durationSec: 120,
    allowedRoles: ["waiter", "single_manager", "group_manager", "enterpriser"],
    allowedModes: ["premium"],
    allowedSurfaces: ["gameplay_panel", "manager_board"],
    gameplayUsable: true,
    scope: "self",
    activationRules: {
      requireCtx: true,
      requirePremium: true,
      requireEncounter: true,
      allowDuringDrill: true,
      oncePerEncounter: true,
    },
    payload: { focus: "recovery", strength: 1 }
  },
  {
    id: "calm_floor",
    family: "area",
    title: "Calm Floor",
    description: "Reduce encounter pressure for a short time.",
    unlocked: true,
    available: true,
    active: false,
    usesRemaining: 1,
    durationSec: 180,
    allowedRoles: ["waiter", "single_manager", "group_manager", "enterpriser"],
    allowedModes: ["premium"],
    allowedSurfaces: ["gameplay_panel", "manager_board"],
    gameplayUsable: true,
    scope: "encounter",
    activationRules: {
      requireCtx: true,
      requirePremium: true,
      requireEncounter: true,
      allowDuringDrill: true,
      oncePerEncounter: true,
    },
    payload: { effect: "pressure_down", strength: 1 }
  },
  {
    id: "premium_window",
    family: "area",
    title: "Premium Window",
    description: "Improve premium opportunity conditions briefly.",
    unlocked: true,
    available: true,
    active: false,
    usesRemaining: 1,
    durationSec: 180,
    allowedRoles: ["waiter", "single_manager", "group_manager", "enterpriser"],
    allowedModes: ["premium"],
    allowedSurfaces: ["gameplay_panel", "manager_board"],
    gameplayUsable: true,
    scope: "encounter",
    activationRules: {
      requireCtx: true,
      requirePremium: true,
      requireEncounter: true,
      allowDuringDrill: true,
      oncePerEncounter: true,
    },
    payload: { effect: "premium_bias_up", strength: 1 }
  }
];
window.__BC_ACTIVE_ABILITIES__ = window.__BC_ACTIVE_ABILITIES__ || [];
window.__BC_ABILITY_ENCOUNTER_USAGE__ = window.__BC_ABILITY_ENCOUNTER_USAGE__ || {};
window.__BC_ABILITY_UI__ = window.__BC_ABILITY_UI__ || { hudFamily: "attribute" };
let _unlockHideTimer = null;

window.__BC_DEBUG__ = {
  get session() { return appState.session; },
  get profile() { return appState.profile; }
};

// ---- expose appState globally (ctx bridge needs this) ----
window.appState = window.__BC_APP_STATE__;

const progressionStore = createProgressionStore();
let progressionSpine = null;

function initProgressionSpineFromState() {
  if (progressionSpine) return progressionSpine;
  const email = appState.session?.user?.email || null;
  const license =
    appState.restaurant?.code ||
    appState.profile?.restaurant_id ||
    null;
  const groupId = appState.profile?.scope_id || null;
  if (!email || !license) return null;
  progressionSpine = progressionStore.init({ email, license, groupId });
  window.BottleCaller = window.BottleCaller || {};
  window.BottleCaller.progression = progressionSpine;
  return progressionSpine;
}

function isMissingRelationError(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "");
  return code === "42P01" || /does not exist|undefined table|schema cache/i.test(message);
}

function isMissingColumnError(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "");
  return (
    code === "42703" ||
    /could not find the '[^']+' column|column "?[^"\s]+"? does not exist|schema cache/i.test(message)
  );
}

function parseMissingColumnFromError(error) {
  const message = String(error?.message || "");
  const match =
    message.match(/Could not find the '([^']+)' column/i) ||
    message.match(/column "?([^"\s]+)"? does not exist/i);
  return match?.[1] ? String(match[1]) : null;
}

const ENCOUNTER_RESOLUTION_SUMMARY_COLUMNS = [
  "user_id",
  "occurred_at",
  "performance_grade",
  "chain_signal",
  "chain_score",
  "is_green",
  "is_red",
  "tier",
  "chosen_guest_type",
  "chosen_mode",
  "chosen_hook",
  "actual_guest_type",
  "read_correct",
  "delivery_correct",
  "mode_status",
  "hook_status",
  "reflection",
  "reaction_summary",
  "step_reaction_trail",
  "step_spine",
  "ai_perception",
  "bottle_served",
  "chosen_path",
  "best_path",
];

async function fetchEncounterResolutionSummaries({
  restaurantId,
  userId = null,
  sinceIso = null,
  limit = 20,
} = {}) {
  let columns = [...ENCOUNTER_RESOLUTION_SUMMARY_COLUMNS];

  for (let attempt = 0; attempt < ENCOUNTER_RESOLUTION_SUMMARY_COLUMNS.length; attempt += 1) {
    let query = supabase
      .from("bc_encounter_resolutions_v2")
      .select(columns.join(", "))
      .eq("restaurant_id", restaurantId)
      .neq("mode", "demo")
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (userId) query = query.eq("user_id", userId);
    if (sinceIso) query = query.gte("occurred_at", sinceIso);

    const res = await query;
    if (!res?.error) return res;
    if (!isMissingColumnError(res.error)) return res;

    const missingColumn = parseMissingColumnFromError(res.error);
    if (!missingColumn || !columns.includes(missingColumn)) return res;

    console.warn("[MB][PERFORMANCE] bc_encounter_resolutions_v2 missing column, retrying without it", {
      missingColumn,
    });
    columns = columns.filter((column) => column !== missingColumn);
  }

  return {
    data: [],
    error: new Error("Unable to query bc_encounter_resolutions_v2 with any compatible column set."),
  };
}

function setActiveProgressionOwner(profileLike = null) {
  const userId =
    profileLike?.user_id ||
    profileLike?.userId ||
    null;

  const restaurantId =
    profileLike?.restaurant_id ||
    profileLike?.restaurantId ||
    null;

  window.__BC_PROGRESS_OWNER_USER_ID__ = userId;
  window.__BC_ACTIVE_WAITER_USER_ID__ = userId;
  window.__BC_ACTIVE_WAITER_RESTAURANT_ID__ = restaurantId;

  console.log("[BC progression owner set]", {
    userId,
    restaurantId,
    source: profileLike,
  });
}

function getActiveProgressionOwnerContext() {
  return {
    userId:
      window.__BC_PROGRESS_OWNER_USER_ID__ ||
      window.__BC_ACTIVE_WAITER_USER_ID__ ||
      null,
    restaurantId:
      window.__BC_ACTIVE_WAITER_RESTAURANT_ID__ ||
      null,
  };
}

function getProgressionResetMarkerKey(userId, restaurantId) {
  return `bc_prog_reset_marker_${userId}_${restaurantId}`;
}

function clearLocalProgressionKeysForReset({ userId, restaurantId }) {
  if (!userId || !restaurantId) return null;

  const progKey = `bc_prog_v1_${userId}_${restaurantId}`;
  const skillsKey = `bc_skills_v2_${userId}_${restaurantId}`;
  const resetMarkerKey = getProgressionResetMarkerKey(userId, restaurantId);

  try { localStorage.removeItem(progKey); } catch {}
  try { localStorage.removeItem("bc_prog_v1_fallback_premium"); } catch {}
  try { localStorage.removeItem("bc_premium_encounter_index"); } catch {}
  try { localStorage.removeItem(skillsKey); } catch {}

  try { localStorage.setItem(resetMarkerKey, String(Date.now())); } catch {}

  return { progKey, skillsKey, resetMarkerKey };
}

function resolveProgressionOwnerUserId(ctx = {}, session = null) {
  return (
    ctx?.targetUserId ||
    ctx?.waiterUserId ||
    ctx?.receiver_user_id ||
    ctx?.activeProfile?.user_id ||
    ctx?.membership?.user_id ||
    window.__BC_PROGRESS_OWNER_USER_ID__ ||
    window.__BC_ACTIVE_WAITER_USER_ID__ ||
    ctx?.profile?.user_id ||
    session?.user?.id ||
    null
  );
}

function resolveProgressionOwnerRestaurantId(ctx = {}) {
  return (
    ctx?.restaurantId ||
    ctx?.activeProfile?.restaurant_id ||
    ctx?.membership?.restaurant_id ||
    window.__BC_ACTIVE_WAITER_RESTAURANT_ID__ ||
    ctx?.profile?.restaurant_id ||
    null
  );
}

async function hydrateProgressionSpineFromLatestSnapshot({
  userId = null,
  restaurantId = null,
  activeProfile = null,
  membership = null,
  targetUserId = null,
  waiterUserId = null,
  receiver_user_id = null,
} = {}) {
  const session = appState.session || null;
  const authProfile = appState.profile || null;
  const ownerCtx = getActiveProgressionOwnerContext();
  const progressionOwnerUserId = resolveProgressionOwnerUserId({
    targetUserId: targetUserId || userId || ownerCtx.userId || null,
    waiterUserId,
    receiver_user_id,
    activeProfile,
    profile: activeProfile || authProfile || null,
    membership,
    restaurantId:
      restaurantId ||
      activeProfile?.restaurant_id ||
      membership?.restaurant_id ||
      ownerCtx.restaurantId ||
      appState.activeRestaurantId ||
      authProfile?.restaurant_id ||
      null,
  }, session);
  const progressionOwnerRestaurantId = resolveProgressionOwnerRestaurantId({
    restaurantId:
      restaurantId ||
      activeProfile?.restaurant_id ||
      membership?.restaurant_id ||
      ownerCtx.restaurantId ||
      appState.activeRestaurantId ||
      authProfile?.restaurant_id ||
      null,
    activeProfile,
    profile: activeProfile || authProfile || null,
    membership,
  });

  console.log("[BC progression hydrate target]", {
    authUserId: session?.user?.id || null,
    authProfileUserId: authProfile?.user_id || null,
    progressionOwnerUserId,
    progressionOwnerRestaurantId,
    ownerCtx,
    explicitArgs: {
      userId,
      restaurantId,
      targetUserId,
      waiterUserId,
      receiver_user_id,
      activeProfile,
      membership,
    },
  });

  if (!progressionOwnerUserId || !progressionOwnerRestaurantId) {
    console.warn("[BC progression hydrate] missing owner identity", {
      authUserId: session?.user?.id || null,
      progressionOwnerUserId,
      progressionOwnerRestaurantId,
    });
    return null;
  }

  setActiveProgressionOwner({
    user_id: progressionOwnerUserId,
    restaurant_id: progressionOwnerRestaurantId,
  });

  const spine = initProgressionSpineFromState();
  const hydrate = spine?.actions?.hydrateFromCanonicalState;
  if (typeof hydrate !== "function") return null;

  try {
    const { data: progressionRow, error } = await supabase
      .from("bc_progression_state_v1")
      .select("*")
      .eq("user_id", progressionOwnerUserId)
      .eq("restaurant_id", progressionOwnerRestaurantId)
      .maybeSingle();

    console.log("[BC progression hydrate result]", {
      authUserId: session?.user?.id || null,
      progressionOwnerUserId,
      progressionOwnerRestaurantId,
      found: !!progressionRow,
      error: error?.message || null,
    });

    if (error && !isMissingRelationError(error)) {
      console.warn("[PROGRESSION STATE] dedicated load failed", error);
    }

    if (!error && progressionRow?.canonical_state && typeof progressionRow.canonical_state === "object") {
      return hydrate(progressionRow.canonical_state);
    }
  } catch (e) {
    console.warn("[PROGRESSION STATE] dedicated load failed, falling back", e);
  }

  const { data, error } = await supabase
    .from("bc_skill_snapshots_v1")
    .select("payload, created_at")
    .eq("user_id", progressionOwnerUserId)
    .eq("restaurant_id", progressionOwnerRestaurantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.payload || typeof data.payload !== "object") {
    return null;
  }

  const canonicalState =
    data.payload.progressionState ||
    data.payload.progression_state ||
    null;

  if (!canonicalState || typeof canonicalState !== "object") {
    return null;
  }

  return hydrate(canonicalState);
}

// ---- expose restaurantId getter globally (for debug + bridge) ----
window.getActiveRestaurantId =
  window.getActiveRestaurantId ||
  function getActiveRestaurantId() {
    const S = window.appState;
    return (
      window.__BC_ACTIVE_MANAGER_RESTAURANT_ID__ ||
      S?.activeRestaurantId ||
      getStoredActiveRestaurantId?.() ||
      S?.profile?.restaurant_id ||
      null
    );
  };

window.__BC_ACTIVE_REST_READY__ =
  window.__BC_ACTIVE_REST_READY__ ||
  new Promise((resolve) => {
    window.__BC_RESOLVE_ACTIVE_REST_READY__ = resolve;
  });

function armActiveRestaurantReadyPromise() {
  window.__BC_ACTIVE_REST_READY__ = new Promise((resolve) => {
    window.__BC_RESOLVE_ACTIVE_REST_READY__ = resolve;
  });
}

function markActiveRestaurantReady() {
  if (window.__BC_RESOLVE_ACTIVE_REST_READY__) {
    window.__BC_RESOLVE_ACTIVE_REST_READY__();
    window.__BC_RESOLVE_ACTIVE_REST_READY__ = null;
  }
}

function getAbilityLibrary() {
  return Array.isArray(window.__BC_ABILITY_LIBRARY__) ? window.__BC_ABILITY_LIBRARY__ : [];
}

function getAbilityById(id) {
  return getAbilityLibrary().find((x) => String(x?.id || "") === String(id || "")) || null;
}

function getAbilitiesByFamily(family) {
  const f = String(family || "").toLowerCase();
  return getAbilityLibrary().filter((x) => String(x?.family || "").toLowerCase() === f);
}

function getActiveAbilities() {
  return Array.isArray(window.__BC_ACTIVE_ABILITIES__) ? window.__BC_ACTIVE_ABILITIES__ : [];
}

function isAbilityActive(id) {
  return getActiveAbilities().some((x) => String(x?.id || "") === String(id || ""));
}

function getCurrentAbilityUseContext() {
  const ctx = window.__BC_CTX__ || {};
  const identity = window.__BC_IDENTITY__ || {};

  const role =
    ctx.membershipRole ||
    ctx.membership_role ||
    identity.membershipRole ||
    ctx.role ||
    null;

  const mode = String(ctx.mode || window.bcMode || "demo").toLowerCase();

  return {
    role: role ? String(role).toLowerCase() : null,
    mode,
    isDemo: mode === "demo",
  };
}

function canUseAbilityOnSurface(ability, surface = "gameplay_panel") {
  if (!ability) return false;

  const useCtx = getCurrentAbilityUseContext();
  const role = String(useCtx.role || "").toLowerCase();
  const mode = String(useCtx.mode || "").toLowerCase();

  const allowedRoles = Array.isArray(ability.allowedRoles) ? ability.allowedRoles : [];
  const allowedModes = Array.isArray(ability.allowedModes) ? ability.allowedModes : [];
  const allowedSurfaces = Array.isArray(ability.allowedSurfaces) ? ability.allowedSurfaces : [];

  if (allowedRoles.length && !allowedRoles.includes(role)) return false;
  if (allowedModes.length && !allowedModes.includes(mode)) return false;
  if (allowedSurfaces.length && !allowedSurfaces.includes(surface)) return false;

  return true;
}

function getGameplayAbilityFrameWindow() {
  try {
    return document.getElementById("premiumRootFrame")?.contentWindow || null;
  } catch {
    return null;
  }
}

function getAbilityGameplayState() {
  const frameWin = getGameplayAbilityFrameWindow();
  const frameCtx = frameWin?.__BC_CTX__ || null;
  const modeRaw =
    window.__BC_CTX__?.mode ||
    frameCtx?.mode ||
    frameWin?.bcMode ||
    window.bcMode ||
    "demo";
  const screenPlayLocal = document.getElementById("screenPlay");
  const screenPlayFrame = frameWin?.document?.getElementById?.("screenPlay") || null;

  return {
    hasCtx: !!(window.__BC_CTX__?.userId || frameCtx?.userId),
    isDemo: String(modeRaw).toLowerCase() === "demo",
    isInEncounter: !!(window.currentEncounter || frameWin?.currentEncounter),
    isOnPlayScreen:
      (!!screenPlayLocal && !screenPlayLocal.classList.contains("hidden")) ||
      (!!screenPlayFrame && !screenPlayFrame.classList.contains("hidden")),
    sessionType: String(
      window.__BC_SESSION_TYPE__ ||
      window.sessionType ||
      frameWin?.__BC_SESSION_TYPE__ ||
      frameWin?.sessionType ||
      "normal"
    ).toLowerCase(),
    hasAssignedDrill: !!(window.__BC_LAST_ASSIGNED_DRILL__?.id || frameWin?.__BC_LAST_ASSIGNED_DRILL__?.id),
  };
}

function getCurrentEncounterAbilityKey() {
  const frameWin = getGameplayAbilityFrameWindow();
  const encounter =
    window.currentEncounter ||
    frameWin?.currentEncounter ||
    null;
  const encounterId =
    encounter?.id ||
    encounter?.key ||
    encounter?.encounterId ||
    window.encounterIndex ||
    frameWin?.encounterIndex ||
    "unknown";

  return String(encounterId);
}

function hasUsedAbilityThisEncounter(abilityId) {
  const k = getCurrentEncounterAbilityKey();
  return !!window.__BC_ABILITY_ENCOUNTER_USAGE__?.[k]?.[abilityId];
}

function markAbilityUsedThisEncounter(abilityId) {
  const k = getCurrentEncounterAbilityKey();
  window.__BC_ABILITY_ENCOUNTER_USAGE__ = window.__BC_ABILITY_ENCOUNTER_USAGE__ || {};
  window.__BC_ABILITY_ENCOUNTER_USAGE__[k] = window.__BC_ABILITY_ENCOUNTER_USAGE__[k] || {};
  window.__BC_ABILITY_ENCOUNTER_USAGE__[k][abilityId] = true;
}

function getActiveAbilityByFamily(family) {
  const f = String(family || "").toLowerCase();
  return getActiveAbilities().find((x) => String(x?.family || "").toLowerCase() === f) || null;
}

function hasConflictingActiveAbility(ability) {
  if (!ability) return null;
  const family = String(ability.family || "").toLowerCase();
  if (!family) return null;
  return getActiveAbilityByFamily(family);
}

function canActivateAbilityNow(ability) {
  if (!ability) return { ok: false, reason: "missing_ability" };

  const state = getAbilityGameplayState();
  const rules = ability.activationRules || {};

  if (rules.requireCtx && !state.hasCtx) {
    return { ok: false, reason: "ctx_required" };
  }

  if (rules.requirePremium && state.isDemo) {
    return { ok: false, reason: "premium_required" };
  }

  if (rules.requireEncounter && !state.isInEncounter) {
    return { ok: false, reason: "encounter_required" };
  }

  if (rules.allowDuringDrill === false && state.sessionType === "drill") {
    return { ok: false, reason: "blocked_during_drill" };
  }

  if (rules.oncePerEncounter && hasUsedAbilityThisEncounter(ability.id)) {
    return { ok: false, reason: "already_used_this_encounter" };
  }

  const conflicting = hasConflictingActiveAbility(ability);
  if (conflicting && String(conflicting.id || "") !== String(ability.id || "")) {
    return {
      ok: false,
      reason: "family_conflict",
      conflictAbilityId: conflicting.id || null,
      conflictTitle: conflicting.title || null,
    };
  }

  return { ok: true, reason: null };
}

function getAbilityBlockedReasonText(ability) {
  const result = canActivateAbilityNow(ability);
  if (result.ok) return "";

  switch (result.reason) {
    case "ctx_required": return "Ctx required";
    case "premium_required": return "Premium only";
    case "encounter_required": return "Only during encounters";
    case "blocked_during_drill": return "Blocked during drill";
    case "already_used_this_encounter": return "Used this encounter";
    case "family_conflict":
      return result.conflictTitle
        ? `Active: ${result.conflictTitle}`
        : "Family already active";
    default: return "Unavailable";
  }
}

function isAbilityAvailable(ability, surface = "gameplay_panel") {
  if (!ability) return false;
  if (!canUseAbilityOnSurface(ability, surface)) return false;
  if (!ability.unlocked) return false;
  if (!ability.available) return false;
  if (Number(ability.usesRemaining || 0) <= 0) return false;
  if (isAbilityActive(ability.id)) return false;

  const stateCheck = canActivateAbilityNow(ability);
  if (!stateCheck.ok && surface === "gameplay_panel") return false;

  return true;
}

function setHudAbilityFamily(family) {
  const next = String(family || "attribute").toLowerCase() === "area" ? "area" : "attribute";
  window.__BC_ABILITY_UI__.hudFamily = next;

  const btnAttribute = document.getElementById("btnHudAbilitiesAttribute");
  const btnArea = document.getElementById("btnHudAbilitiesArea");
  const listAttribute = document.getElementById("hudAbilitiesAttributeList");
  const listArea = document.getElementById("hudAbilitiesAreaList");

  if (btnAttribute) {
    btnAttribute.classList.toggle("btn", next === "attribute");
    btnAttribute.classList.toggle("btn-ghost", next !== "attribute");
  }
  if (btnArea) {
    btnArea.classList.toggle("btn", next === "area");
    btnArea.classList.toggle("btn-ghost", next !== "area");
  }

  if (listAttribute) {
    listAttribute.classList.toggle("hidden", next !== "attribute");
    listAttribute.style.display = next === "attribute" ? "flex" : "none";
  }
  if (listArea) {
    listArea.classList.toggle("hidden", next !== "area");
    listArea.style.display = next === "area" ? "flex" : "none";
  }
}

function renderHudAbilityFamilyList(family, targetId) {
  const root = document.getElementById(targetId);
  if (!root) return;

  const items = getAbilitiesByFamily(family).filter((x) => canUseAbilityOnSurface(x, "gameplay_panel"));
  root.innerHTML = "";

  if (!items.length) {
    root.innerHTML = '<div class="small-text" style="opacity:.7;">No abilities in this family yet.</div>';
    return;
  }

  for (const ability of items) {
    const active = isAbilityActive(ability.id);
    const available = isAbilityAvailable(ability, "gameplay_panel");
    const blockedReasonText = !active && !available ? getAbilityBlockedReasonText(ability) : "";

    const card = document.createElement("div");
    card.className = "card";
    card.style.padding = "10px";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "8px";

    const meta = active
      ? "Active"
      : available
        ? `Ready • ${Number(ability.usesRemaining || 0)} use left`
        : blockedReasonText || (
            Number(ability.usesRemaining || 0) <= 0
              ? "No uses left"
              : "Unavailable"
          );

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
        <div style="min-width:0;">
          <div style="font-weight:600;">${escapeHtml(ability.title || "Ability")}</div>
          <div class="small-text" style="opacity:.8; margin-top:2px;">
            ${escapeHtml(ability.description || "")}
          </div>
        </div>
        <div class="small-text" style="opacity:.75; white-space:nowrap;">${escapeHtml(meta)}</div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
        <div class="small-text" style="opacity:.75;">
          Duration: ${Number(ability.durationSec || 0)}s
        </div>
        <button type="button" class="${available ? "btn" : "btn-ghost"}" ${available ? "" : "disabled"}>
          ${active ? "Active" : "Activate"}
        </button>
      </div>
    `;

    const btn = card.querySelector("button");
    if (btn && available) {
      btn.addEventListener("click", () => {
        activateAbility(ability.id);
      });
    }

    root.appendChild(card);
  }
}

function getAbilityFamilySlotState(family) {
  const items = getAbilitiesByFamily(family).filter((x) => canUseAbilityOnSurface(x, "gameplay_panel"));
  const active = getActiveAbilityByFamily(family);
  const state = getAbilityGameplayState();

  if (active) {
    const secsLeft = Math.max(0, Math.ceil(((active.expiresAt || 0) - Date.now()) / 1000));
    return {
      status: "Active",
      meta: `${active.title || active.id} • ${secsLeft}s left`,
      tone: "active",
    };
  }

  if (!state.hasCtx) {
    return {
      status: "Blocked",
      meta: "Ctx required",
      tone: "blocked",
    };
  }

  if (state.isDemo) {
    return {
      status: "Blocked",
      meta: "Premium only",
      tone: "blocked",
    };
  }

  if (!state.isInEncounter) {
    return {
      status: "Waiting",
      meta: "Only during encounters",
      tone: "idle",
    };
  }

  const ready = items.some((x) => isAbilityAvailable(x, "gameplay_panel"));
  if (ready) {
    return {
      status: "Ready",
      meta: "Slot available",
      tone: "ready",
    };
  }

  const usedThisEncounter = items.some((x) => {
    const rules = x.activationRules || {};
    return !!rules.oncePerEncounter && hasUsedAbilityThisEncounter(x.id);
  });

  if (usedThisEncounter) {
    return {
      status: "Spent",
      meta: "Used this encounter",
      tone: "spent",
    };
  }

  const hasUsesLeft = items.some((x) => Number(x.usesRemaining || 0) > 0);
  if (!hasUsesLeft) {
    return {
      status: "Empty",
      meta: "No uses left",
      tone: "spent",
    };
  }

  return {
    status: "Blocked",
    meta: "Unavailable",
    tone: "blocked",
  };
}

function applySlotTone(cardId, tone) {
  const el = document.getElementById(cardId);
  if (!el) return;

  el.style.borderColor = "rgba(255,255,255,0.08)";
  el.style.opacity = "1";

  if (tone === "active") {
    el.style.borderColor = "rgba(255,255,255,0.18)";
  } else if (tone === "ready") {
    el.style.borderColor = "rgba(255,255,255,0.12)";
  } else if (tone === "blocked") {
    el.style.opacity = ".9";
  } else if (tone === "spent") {
    el.style.opacity = ".75";
  }
}

function renderHudAbilitySlots() {
  const attr = getAbilityFamilySlotState("attribute");
  const area = getAbilityFamilySlotState("area");

  const attrStatus = document.getElementById("hudAttributeSlotStatus");
  const attrMeta = document.getElementById("hudAttributeSlotMeta");
  const areaStatus = document.getElementById("hudAreaSlotStatus");
  const areaMeta = document.getElementById("hudAreaSlotMeta");

  if (attrStatus) attrStatus.textContent = attr.status || "-";
  if (attrMeta) attrMeta.textContent = attr.meta || "-";
  if (areaStatus) areaStatus.textContent = area.status || "-";
  if (areaMeta) areaMeta.textContent = area.meta || "-";

  applySlotTone("hudAttributeSlotCard", attr.tone);
  applySlotTone("hudAreaSlotCard", area.tone);
}

function renderHudAbilities() {
  renderHudAbilitySlots();
  renderHudAbilityFamilyList("attribute", "hudAbilitiesAttributeList");
  renderHudAbilityFamilyList("area", "hudAbilitiesAreaList");
  renderHudActiveEffects();
  renderHudTimedChallenge();
  renderHudDisplayMethodChallenge();
  setHudAbilityFamily(window.__BC_ABILITY_UI__?.hudFamily || "attribute");
}

function getAbilityEffectLabel(id) {
  switch (String(id || "")) {
    case "closing_surge":
      return "Closing boosted";
    case "recovery_focus":
      return "Recovery steadier";
    case "calm_floor":
      return "Pressure reduced";
    case "premium_window":
      return "Premium chance up";
    default:
      return "Active";
  }
}

function renderHudActiveEffects() {
  const root = document.getElementById("hudActiveEffectsList");
  const status = document.getElementById("hudAbilitiesStatus");
  if (!root) return;

  const active = getActiveAbilities();
  root.innerHTML = "";

  if (!active.length) {
    root.innerHTML = '<div style="opacity:.7;">No active abilities.</div>';
    if (status) status.textContent = "No active effects";
    return;
  }

  if (status) {
    const summary = getActiveAbilityFamilySummary();
    const bits = [];
    if (summary.attribute?.title) bits.push(`Attribute: ${summary.attribute.title}`);
    if (summary.area?.title) bits.push(`Area: ${summary.area.title}`);
    status.textContent = bits.length ? bits.join(" • ") : "No active effects";
  }

  for (const entry of active) {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.gap = "8px";

    const secsLeft = Math.max(0, Math.ceil(((entry.expiresAt || 0) - Date.now()) / 1000));

    row.innerHTML = `
      <div>
        <div style="font-weight:600;">${escapeHtml(entry.title || entry.id || "Ability")}</div>
        <div style="opacity:.75;">${escapeHtml(getAbilityEffectLabel(entry.id))} • ${secsLeft}s left</div>
      </div>
    `;

    root.appendChild(row);
  }
}

function getActiveAbilityFamilySummary() {
  return {
    attribute: getActiveAbilityByFamily("attribute"),
    area: getActiveAbilityByFamily("area"),
  };
}

function applyAbilityEffect(ability) {
  if (!ability) return;

  window.__BC_LAST_USED_ABILITY__ = {
    id: ability.id,
    family: ability.family,
    at: Date.now(),
  };

  console.log("[ABILITY] applied ✅", {
    id: ability.id,
    family: ability.family,
    payload: ability.payload || null,
  });

  if (ability.family === "attribute") {
    window.showToast?.(`${ability.title} activated ✅`);
  } else if (ability.family === "area") {
    window.showToast?.(`${ability.title} activated ✅`);
  }
}

function expireAbility(abilityId) {
  const id = String(abilityId || "");
  if (!id) return;

  const nextActive = getActiveAbilities().filter((x) => String(x?.id || "") !== id);
  window.__BC_ACTIVE_ABILITIES__ = nextActive;

  const ability = getAbilityById(id);
  if (ability) {
    ability.active = false;
  }

  console.log("[ABILITY] expired", { id });
  renderHudAbilities();
  renderManagerBoardAbilityTabs();
}

function activateAbility(abilityId) {
  const ability = getAbilityById(abilityId);
  if (!ability) return false;
  if (!isAbilityAvailable(ability, "gameplay_panel")) return false;

  const stateCheck = canActivateAbilityNow(ability);
  if (!stateCheck.ok) {
    window.showToast?.("Ability not available right now.");
    return false;
  }

  ability.active = true;
  ability.usesRemaining = Math.max(0, Number(ability.usesRemaining || 0) - 1);
  markAbilityUsedThisEncounter(ability.id);

  const activeEntry = {
    id: ability.id,
    title: ability.title,
    family: ability.family,
    startedAt: Date.now(),
    expiresAt: Date.now() + Number(ability.durationSec || 0) * 1000,
    payload: ability.payload || {},
  };

  window.__BC_ACTIVE_ABILITIES__ = [
    ...getActiveAbilities().filter((x) => String(x?.id || "") !== String(ability.id || "")),
    activeEntry,
  ];

  applyAbilityEffect(ability);
  renderHudAbilities();
  renderManagerBoardAbilityTabs();

  try {
    clearTimeout(ability.__expireTimer__);
  } catch {}

  ability.__expireTimer__ = setTimeout(() => {
    expireAbility(ability.id);
  }, Math.max(0, Number(ability.durationSec || 0) * 1000));

  return true;
}

function wireHudAbilities() {
  const btnAttribute = document.getElementById("btnHudAbilitiesAttribute");
  const btnArea = document.getElementById("btnHudAbilitiesArea");

  if (btnAttribute && !btnAttribute.__bcBound) {
    btnAttribute.__bcBound = true;
    btnAttribute.addEventListener("click", () => {
      setHudAbilityFamily("attribute");
    });
  }

  if (btnArea && !btnArea.__bcBound) {
    btnArea.__bcBound = true;
    btnArea.addEventListener("click", () => {
      setHudAbilityFamily("area");
    });
  }

  renderHudAbilities();
}

function tickHudActiveAbilities() {
  if (window.__BC_HUD_ABILITIES_TICK_WIRED__) return;
  window.__BC_HUD_ABILITIES_TICK_WIRED__ = true;
  const tick = () => {
    const hud = document.getElementById("hudPanel");
    if (!hud || hud.classList.contains("hidden") || document.hidden) return;
    const active = getActiveAbilities();
    const challenge = getActiveTimedChallenge();
    if (!challenge && window.__BC_ACTIVE_TIMED_CHALLENGE__) {
      expireTimedChallenge("expired");
    }
    let changed = false;
    const now = Date.now();
    for (const entry of active) {
      if ((entry.expiresAt || 0) <= now) {
        expireAbility(entry.id);
        changed = true;
      }
    }

    if (!changed) {
      renderHudAbilitySlots();
      if (active.length) {
        renderHudActiveEffects();
      }
      renderHudTimedChallenge();
    }
  };

  tick();
  window.__BC_HUD_ABILITIES_TICK__ = window.setInterval(tick, 1500);
}

function getManagerBoardActiveAbilitySummary() {
  const active = getActiveAbilities();

  const attribute = active.filter((x) => String(x?.family || "") === "attribute");
  const area = active.filter((x) => String(x?.family || "") === "area");

  return {
    total: active.length,
    attributeCount: attribute.length,
    areaCount: area.length,
    active,
  };
}

function renderManagerBoardOverviewLiveEffects() {
  const root = document.getElementById("mbOverviewLiveEffects");
  if (!root) return;

  const synced = getManagerLiveEffectsState?.() || {
    attributeEffects: [],
    areaEffects: [],
    updatedAt: 0,
  };

  const runtimeActive = Array.isArray(getActiveAbilities?.())
    ? getActiveAbilities()
    : [];

  const syncedAttribute = (synced.attributeEffects || []).filter((x) => !!x?.active);
  const syncedArea = (synced.areaEffects || []).filter((x) => !!x?.active);

  const runtimeAttribute = runtimeActive.filter(
    (x) => String(x?.family || "").toLowerCase() === "attribute"
  );
  const runtimeArea = runtimeActive.filter(
    (x) => String(x?.family || "").toLowerCase() === "area"
  );

  const syncedIds = [
    ...syncedAttribute.map((x) => String(x?.id || "")),
    ...syncedArea.map((x) => String(x?.id || "")),
  ].filter(Boolean).sort();

  const runtimeIds = [
    ...runtimeAttribute.map((x) => String(x?.id || "")),
    ...runtimeArea.map((x) => String(x?.id || "")),
  ].filter(Boolean).sort();

  const syncedCount = syncedIds.length;
  const runtimeCount = runtimeIds.length;

  const idsEqual =
    syncedIds.length === runtimeIds.length &&
    syncedIds.every((id, i) => id === runtimeIds[i]);

  let syncLabel = "In sync";
  if (syncedCount === 0 && runtimeCount === 0) {
    syncLabel = "No active effects";
  } else if (syncedCount > 0 && runtimeCount === 0) {
    syncLabel = "Sent, waiting on runtime";
  } else if (syncedCount === 0 && runtimeCount > 0) {
    syncLabel = "Runtime active without synced state";
  } else if (!idsEqual) {
    syncLabel = "Mismatch detected";
  }

  const renderEffectList = (items = [], emptyText = "None") => {
    if (!items.length) {
      return `<div class="small-text" style="opacity:.7;">${escapeHtml(emptyText)}</div>`;
    }

    return items.map((item) => {
      const expiresAt = Number(item?.expiresAt || 0);
      const secsLeft = expiresAt
        ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
        : null;
      const name = item?.title || item?.name || item?.id || "Effect";
      const desc = item?.description || item?.body || "";

      return `
        <div style="padding:8px; border:1px solid rgba(255,255,255,0.08); border-radius:10px;">
          <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
            <div style="font-weight:600;">${escapeHtml(name)}</div>
            <div class="small-text" style="opacity:.75;">
              ${secsLeft != null ? `${secsLeft}s left` : "active"}
            </div>
          </div>
          ${desc ? `<div class="small-text" style="opacity:.8; margin-top:4px;">${escapeHtml(desc)}</div>` : ``}
        </div>
      `;
    }).join("");
  };

  root.innerHTML = `
    <div class="card" style="display:flex; flex-direction:column; gap:12px; padding:12px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
        <div style="font-weight:600;">Live Effects</div>
        <div class="small-text" style="opacity:.75;">
          Last manager update ${synced.updatedAt ? new Date(synced.updatedAt).toLocaleTimeString() : "just now"}
        </div>
      </div>

      <div class="small-text" style="opacity:.82;">
        Gameplay Adjustments effects sent to the waiter experience, compared with the current game runtime.
      </div>

      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <div style="padding:8px 10px; border:1px solid rgba(255,255,255,0.08); border-radius:999px;" class="small-text">
          Sent: ${syncedCount}
        </div>
        <div style="padding:8px 10px; border:1px solid rgba(255,255,255,0.08); border-radius:999px;" class="small-text">
          Runtime: ${runtimeCount}
        </div>
        <div style="padding:8px 10px; border:1px solid rgba(255,255,255,0.08); border-radius:999px;" class="small-text">
          Status: ${escapeHtml(syncLabel)}
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:12px;">
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="font-weight:600;">Sent to Game: Attribute</div>
          ${renderEffectList(syncedAttribute, "No attribute effects sent")}
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="font-weight:600;">Sent to Game: Area</div>
          ${renderEffectList(syncedArea, "No area effects sent")}
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:12px;">
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="font-weight:600;">Game Runtime: Attribute</div>
          ${renderEffectList(runtimeAttribute, "No runtime attribute effects")}
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="font-weight:600;">Game Runtime: Area</div>
          ${renderEffectList(runtimeArea, "No runtime area effects")}
        </div>
      </div>
    </div>
  `;
}

function renderManagerBoardActiveEffectsSummary() {
  const summary = getManagerBoardActiveAbilitySummary();
  const active = summary.active || [];

  const wrap = document.createElement("div");
  wrap.className = "card";
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "8px";
  wrap.style.padding = "12px";
  wrap.style.marginBottom = "12px";

  const title = document.createElement("div");
  title.style.fontWeight = "600";
  title.textContent = "Live Ability Status";
  wrap.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "small";
  meta.style.opacity = ".8";
  meta.textContent = `Active total: ${summary.total} • Attribute: ${summary.attributeCount} • Area: ${summary.areaCount}`;
  wrap.appendChild(meta);

  const list = document.createElement("div");
  list.style.display = "flex";
  list.style.flexDirection = "column";
  list.style.gap = "6px";

  if (!active.length) {
    const empty = document.createElement("div");
    empty.className = "small";
    empty.style.opacity = ".7";
    empty.textContent = "No live effects active.";
    list.appendChild(empty);
  } else {
    for (const entry of active) {
      const row = document.createElement("div");
      row.className = "small";
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.gap = "8px";

      const secsLeft = Math.max(0, Math.ceil(((entry?.expiresAt || 0) - Date.now()) / 1000));

      row.innerHTML = `
        <div>
          <b>${escapeHtml(entry?.title || entry?.id || "Ability")}</b>
          <span style="opacity:.75;"> • ${escapeHtml(entry?.family || "ability")}</span>
        </div>
        <div style="opacity:.8;">${secsLeft}s left</div>
      `;

      list.appendChild(row);
    }
  }

  wrap.appendChild(list);
  return wrap;
}

function getAbilityStatusText(ability, surface = "manager_board") {
  if (!ability) return "Unknown";

  if (isAbilityActive(ability.id)) {
    const entry = getActiveAbilities().find((x) => String(x?.id || "") === String(ability.id || ""));
    const secsLeft = Math.max(0, Math.ceil(((entry?.expiresAt || 0) - Date.now()) / 1000));
    return `Active • ${secsLeft}s left`;
  }

  if (!ability.unlocked) return "Locked";
  if (!canUseAbilityOnSurface(ability, surface)) return "Hidden";
  if (!ability.available) return "Unavailable";
  if (Number(ability.usesRemaining || 0) <= 0) return "No uses left";
  const stateCheck = canActivateAbilityNow(ability);
  switch (stateCheck.reason) {
    case "family_conflict":
      return "Blocked by active family effect";
    case "already_used_this_encounter":
      return "Used this encounter";
    case "encounter_required":
      return "Only during encounters";
    case "blocked_during_drill":
      return "Blocked during drill";
    case "premium_required":
      return "Premium only";
    case "ctx_required":
      return "Ctx required";
    default:
      break;
  }
  if (isAbilityAvailable(ability, "gameplay_panel")) return "Ready";
  return "Idle";
}

function getActiveTimedChallenge() {
  const challenge = window.__BC_ACTIVE_TIMED_CHALLENGE__ || null;
  if (!challenge) return null;
  if (Number(challenge.expiresAt || 0) > Date.now()) return challenge;
  return null;
}

function getDisplayMethodChallengeLabel(methodKey) {
  const key = String(methodKey || "").toLowerCase();
  const map = {
    comparison: "Display Method: Comparison",
    pairing: "Display Method: Pairing",
    value_justification: "Display Method: Value Justification",
  };
  return map[key] || "Display Method Challenge";
}

function getActiveDisplayMethodChallenge() {
  const challenge = window.__BC_ACTIVE_DISPLAY_METHOD_CHALLENGE__ || null;
  if (!challenge) return null;
  if (Number(challenge.expiresAt || 0) > Date.now()) return challenge;
  return null;
}

function expireTimedChallenge(status = "expired") {
  const active = window.__BC_ACTIVE_TIMED_CHALLENGE__ || null;
  if (!active) return;

  window.__BC_LAST_TIMED_CHALLENGE_RESULT__ = {
    id: active.id || null,
    title: active.title || "Timed Challenge",
    challengeKey: active.challengeKey || null,
    status,
    endedAt: Date.now(),
  };
  window.__BC_ACTIVE_TIMED_CHALLENGE__ = null;
}

function renderHudTimedChallenge() {
  const statusEl = document.getElementById("hudTimedChallengeStatus");
  const bodyEl = document.getElementById("hudTimedChallengeBody");
  if (!statusEl || !bodyEl) return;

  const challenge = getActiveTimedChallenge();
  const pending = window.__BC_PENDING_TIMED_CHALLENGE__ || null;
  if (!challenge) {
    if (pending) {
      statusEl.textContent = "Queued • Starts after encounter 1";
      bodyEl.innerHTML = `
        <div><b>${escapeHtml(pending.title || "Timed Challenge")}</b></div>
        <div style="opacity:.85;">Focus: ${escapeHtml(pending?.payload?.focus || pending?.focus || "-")}</div>
        <div style="opacity:.85;">Reward: ${Number(pending?.payload?.rewardPoints || pending?.rewardPoints || 0)} pts</div>
      `;
      return;
    }

    statusEl.textContent = "No active challenge";
    bodyEl.innerHTML = '<div style="opacity:.7;">No challenge assigned.</div>';
    return;
  }

  const secsLeft = Math.max(0, Math.ceil(((challenge.expiresAt || 0) - Date.now()) / 1000));
  statusEl.textContent = `Active • ${secsLeft}s left`;
  bodyEl.innerHTML = `
    <div><b>${escapeHtml(challenge.title || "Timed Challenge")}</b></div>
    <div style="opacity:.85;">Focus: ${escapeHtml(challenge?.payload?.focus || "-")}</div>
    <div style="opacity:.85;">Reward: ${Number(challenge?.payload?.rewardPoints || 0)} pts</div>
  `;
}

function renderHudDisplayMethodChallenge() {
  const statusEl = document.getElementById("hudDisplayMethodChallengeStatus");
  const bodyEl = document.getElementById("hudDisplayMethodChallengeBody");
  if (!statusEl || !bodyEl) return;

  const challenge = getActiveDisplayMethodChallenge();
  const pending = window.__BC_PENDING_DISPLAY_METHOD_CHALLENGE__ || null;
  if (!challenge) {
    if (pending) {
      statusEl.textContent =
        String(pending?.placement || "before_start") === "after_first_encounter"
          ? "Queued • Starts after encounter 1"
          : "Queued • Starts next encounter";
      bodyEl.innerHTML = `
        <div><b>${escapeHtml(pending.title || "Display Method Challenge")}</b></div>
        <div style="opacity:.85;">Method: ${escapeHtml(getDisplayMethodChallengeLabel(pending?.methodKey || pending?.payload?.methodKey))}</div>
        <div style="opacity:.85;">Reward: ${Number(pending?.payload?.rewardPoints || pending?.rewardPoints || 0)} pts</div>
      `;
      return;
    }

    statusEl.textContent = "No active challenge";
    bodyEl.innerHTML = '<div style="opacity:.7;">No challenge assigned.</div>';
    return;
  }

  const secsLeft = Math.max(0, Math.ceil(((challenge.expiresAt || 0) - Date.now()) / 1000));
  bodyEl.innerHTML = `
    <div><b>${escapeHtml(challenge.title || "Display Method Challenge")}</b></div>
    <div style="opacity:.85;">Method: ${escapeHtml(getDisplayMethodChallengeLabel(challenge?.methodKey || challenge?.payload?.methodKey))}</div>
    <div style="opacity:.85;">Reward: ${Number(challenge?.payload?.rewardPoints || challenge?.rewardPoints || 0)} pts</div>
  `;
  statusEl.textContent = `Active • ${secsLeft}s left`;
}

function getTimedChallengeLabel(challengeKey) {
  const key = String(challengeKey || "").toLowerCase();
  const map = {
    closing_push: "Closing Push",
    recovery_window: "Recovery Window",
    clean_close: "Clean Close",
    soft_close: "Soft Close",
    successful_pivot: "Successful Pivot",
    read_first: "Read First",
    full_delivery: "Full Delivery",
    no_reset_run: "No Reset Run",
    stable_signal: "Stable Signal",
    controlled_table: "Controlled Table",
    solid_interaction: "Solid Interaction",
    premium_moment: "Premium Moment",
    commanding_presence: "Commanding Presence",
  };

  return map[key] || (key
    ? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Timed Challenge");
}

function getTimedChallengeResultLabel(status) {
  switch (String(status || "").toLowerCase()) {
    case "completed":
      return "Completed";
    case "expired":
      return "Expired";
    default:
      return "Unknown";
  }
}

function getTimedChallengeTone(kind) {
  switch (String(kind || "")) {
    case "completed":
      return "opacity:.95;";
    case "expired":
      return "opacity:.75;";
    case "assigned":
      return "opacity:.9;";
    default:
      return "opacity:.85;";
  }
}

function renderManagerBoardOverviewTimedChallenge() {
  const root = document.getElementById("mbOverviewTimedChallenge");
  if (!root) return;

  const lastSent = getRecentTimedChallengeSentRow();
  const lastResult = getRecentTimedChallengeResultRow();

  if (!lastSent) {
    root.innerHTML = `
      <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
        <div style="font-weight:600;">Timed Challenge</div>
        <div class="small" style="opacity:.75;">No active timed challenge.</div>
        ${lastResult ? `
          <div class="small" style="opacity:.85;">
            Last result: <b>${escapeHtml(getTimedChallengeLabel(lastResult?.payload?.challengeKey))}</b> •
            ${escapeHtml(getTimedChallengeMessageMeta(lastResult)?.label || "Result")}
            ${getTimedChallengeMessageMeta(lastResult)?.strongestSkill ? ` • Strongest skill: ${escapeHtml(getTimedChallengeMessageMeta(lastResult)?.strongestSkill)}` : ""}
          </div>
        ` : ""}
      </div>
    `;
    return;
  }

  const sentPayload = lastSent?.payload || {};
  root.innerHTML = `
    <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
      <div style="font-weight:600;">Timed Challenge</div>
      <div><b>${escapeHtml(getTimedChallengeLabel(sentPayload?.challengeKey))}</b></div>
      <div class="small" style="opacity:.85;">Focus: ${escapeHtml(sentPayload?.focus || "-")}</div>
      <div class="small" style="opacity:.85;">Reward: ${Number(sentPayload?.rewardPoints || 0)} pts</div>
      <div class="small" style="opacity:.85;">Target: ${escapeHtml(getTimedChallengeActorLabel(lastSent))}</div>
      <div class="small" style="opacity:.85;">Sent: ${escapeHtml(formatRecentChallengeTime(lastSent?.created_at))}</div>
      ${lastResult ? `
        <div class="small" style="opacity:.75; margin-top:4px;">
          Last result: ${escapeHtml(getTimedChallengeMessageMeta(lastResult)?.label || "Result")} •
          ${escapeHtml(formatRecentChallengeTime(lastResult?.created_at))}
        </div>
      ` : ""}
    </div>
  `;
}

function getRecentDisplayMethodChallengeRows() {
  const rows = getManagerBoardMessageRows();
  return [...rows]
    .filter((row) => {
      const type = String(row?.type || "");
      return (
        type === "display_method_challenge" ||
        type === "display_method_challenge_completed" ||
        type === "display_method_challenge_expired"
      );
    })
    .sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())
    .slice(0, 5);
}

function getRecentDisplayMethodChallengeSentRow() {
  return getRecentDisplayMethodChallengeRows().find((row) => String(row?.type || "") === "display_method_challenge") || null;
}

function getRecentDisplayMethodChallengeResultRow() {
  return getRecentDisplayMethodChallengeRows().find((row) => {
    const type = String(row?.type || "");
    return type === "display_method_challenge_completed" || type === "display_method_challenge_expired";
  }) || null;
}

function getDisplayMethodChallengeActorLabel(row) {
  const type = String(row?.type || "");
  if (type === "display_method_challenge") {
    return getTimedChallengeTargetLabel(row);
  }
  return resolveManagerBoardUserLabel(row?.sender_user_id || null);
}

function getDisplayMethodChallengeMessageMeta(row) {
  const type = String(row?.type || "");
  const payload = row?.payload || {};
  const title = getDisplayMethodChallengeLabel(payload?.methodKey || payload?.challengeKey);
  if (type === "display_method_challenge") {
    return { label: "Challenge Sent", title };
  }
  if (type === "display_method_challenge_completed") {
    return { label: "Completed", title };
  }
  if (type === "display_method_challenge_expired") {
    return { label: "Expired", title };
  }
  return null;
}

function renderDisplayMethodChallengeRecentSummary() {
  const lastSent = getRecentDisplayMethodChallengeSentRow();
  const lastResult = getRecentDisplayMethodChallengeResultRow();
  const latest = (() => {
    if (!lastSent) return lastResult;
    if (!lastResult) return lastSent;
    return new Date(lastSent?.created_at || 0).getTime() >= new Date(lastResult?.created_at || 0).getTime()
      ? lastSent
      : lastResult;
  })();
  const root = document.getElementById("mbLcDisplayMethodRecentSummary");
  if (!root) return;
  if (!latest) {
    root.innerHTML = `
      <div style="font-weight:600;">Recent Display Method Activity</div>
      <div class="small-text" style="margin-top:4px; opacity:.75;">No recent display method activity.</div>
    `;
    return;
  }
  const meta = getDisplayMethodChallengeMessageMeta(latest);
  const actorText = getDisplayMethodChallengeActorLabel(latest);
  const timeText = formatRecentChallengeTime(latest?.created_at);
  root.innerHTML = `
    <div style="font-weight:600;">Recent Display Method Activity</div>
    <div class="small-text" style="margin-top:4px; opacity:.92;">${escapeHtml(meta?.label || "Result")} • ${escapeHtml(meta?.title || "Display Method Challenge")}</div>
    <div class="small-text" style="margin-top:4px; opacity:.75;">${escapeHtml([actorText, timeText].filter(Boolean).join(" • "))}</div>
  `;
}

function renderManagerBoardOverviewDisplayMethodChallenge() {
  const root = document.getElementById("mbOverviewDisplayMethodChallenge");
  if (!root) return;

  const lastSent = getRecentDisplayMethodChallengeSentRow();
  const lastResult = getRecentDisplayMethodChallengeResultRow();

  if (!lastSent) {
    root.innerHTML = `
      <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
        <div style="font-weight:600;">Display Method Challenge</div>
        <div class="small" style="opacity:.75;">No active display method challenge.</div>
        ${lastResult ? `
          <div class="small" style="opacity:.85;">
            Last result: <b>${escapeHtml(getDisplayMethodChallengeMessageMeta(lastResult)?.title || "Display Method Challenge")}</b> •
            ${escapeHtml(getDisplayMethodChallengeMessageMeta(lastResult)?.label || "Result")}
          </div>
        ` : ""}
      </div>
    `;
    return;
  }

  const sentPayload = lastSent?.payload || {};
  root.innerHTML = `
    <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
      <div style="font-weight:600;">Display Method Challenge</div>
      <div><b>${escapeHtml(getDisplayMethodChallengeLabel(sentPayload?.methodKey || sentPayload?.challengeKey))}</b></div>
      <div class="small" style="opacity:.85;">Method: ${escapeHtml(getDisplayMethodChallengeLabel(sentPayload?.methodKey || sentPayload?.challengeKey))}</div>
      <div class="small" style="opacity:.85;">Reward: ${Number(sentPayload?.rewardPoints || 0)} pts</div>
      <div class="small" style="opacity:.85;">Target: ${escapeHtml(getDisplayMethodChallengeActorLabel(lastSent))}</div>
      <div class="small" style="opacity:.85;">Sent: ${escapeHtml(formatRecentChallengeTime(lastSent?.created_at))}</div>
      ${lastResult ? `
        <div class="small" style="opacity:.75; margin-top:4px;">
          Last result: ${escapeHtml(getDisplayMethodChallengeMessageMeta(lastResult)?.label || "Result")} •
          ${escapeHtml(formatRecentChallengeTime(lastResult?.created_at))}
        </div>
      ` : ""}
    </div>
  `;
}

function getManagerBoardMessageRows() {
  return (
    window.__BC_MB_MESSAGES__ ||
    window.__BC_MESSENGER_ROWS__ ||
    []
  );
}

function getManagerBoardStaffRows() {
  return (
    window.__BC_MB_STAFF_ROWS__ ||
    window.__BC_MB_WAITERS__ ||
    []
  );
}

function resolveManagerBoardUserLabel(userId) {
  const id = String(userId || "");
  if (!id) return "Unknown waiter";

  const rows = getManagerBoardStaffRows();
  const match = rows.find((row) => {
    const rowId = String(row?.user_id || row?.id || "");
    return rowId === id;
  });

  if (!match) {
    return `Waiter ${id.slice(0, 8)}`;
  }

  return (
    match.display_name ||
    match.full_name ||
    match.name ||
    match.email ||
    `Waiter ${id.slice(0, 8)}`
  );
}

function getTimedChallengeTargetLabel(row) {
  const payload = row?.payload || {};

  const targetUserId =
    payload?.targetUserId ||
    row?.receiver_user_id ||
    null;

  return resolveManagerBoardUserLabel(targetUserId);
}

function getTimedChallengeActorLabel(row) {
  const type = String(row?.type || "");
  if (type === "timed_challenge") {
    return getTimedChallengeTargetLabel(row);
  }

  const senderUserId = row?.sender_user_id || null;
  return resolveManagerBoardUserLabel(senderUserId);
}

function getRecentTimedChallengeRows() {
  const rows = getManagerBoardMessageRows();

  return [...rows]
    .filter((row) => {
      const type = String(row?.type || "");
      return (
        type === "timed_challenge" ||
        type === "timed_challenge_completed" ||
        type === "timed_challenge_expired"
      );
    })
    .sort((a, b) => {
      const ta = new Date(a?.created_at || 0).getTime();
      const tb = new Date(b?.created_at || 0).getTime();
      return tb - ta;
    })
    .slice(0, 5);
}

function getRecentDrillAssignedRow() {
  const rows = getManagerBoardMessageRows();

  return [...rows]
    .filter((row) => String(row?.type || "") === "drill_override")
    .sort((a, b) => {
      const ta = new Date(a?.created_at || 0).getTime();
      const tb = new Date(b?.created_at || 0).getTime();
      return tb - ta;
    })[0] || null;
}

function getRecentDrillCompletedRow() {
  const rows = getManagerBoardMessageRows();

  return [...rows]
    .filter((row) => String(row?.type || "") === "drill_completed")
    .sort((a, b) => {
      const ta = new Date(a?.created_at || 0).getTime();
      const tb = new Date(b?.created_at || 0).getTime();
      return tb - ta;
    })[0] || null;
}

function formatRecentChallengeTime(value) {
  const ts = new Date(value || 0).getTime();
  if (!ts) return "Recent";

  const diffMs = Date.now() - ts;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function getRecentTimedChallengeSentRow() {
  const rows = getManagerBoardMessageRows();

  return [...rows]
    .filter((row) => String(row?.type || "") === "timed_challenge")
    .sort((a, b) => {
      const ta = new Date(a?.created_at || 0).getTime();
      const tb = new Date(b?.created_at || 0).getTime();
      return tb - ta;
    })[0] || null;
}

function getRecentTimedChallengeResultRow() {
  const rows = getManagerBoardMessageRows();

  return [...rows]
    .filter((row) => {
      const type = String(row?.type || "");
      return type === "timed_challenge_completed" || type === "timed_challenge_expired";
    })
    .sort((a, b) => {
      const ta = new Date(a?.created_at || 0).getTime();
      const tb = new Date(b?.created_at || 0).getTime();
      return tb - ta;
    })[0] || null;
}

function getManagerRecentChallengeSummaryLabel(row = null) {
  if (!row) return "No recent challenge activity.";

  const type = String(row?.type || "").toLowerCase();
  const payload = row?.payload || {};
  const label = getManagerChallengeLabel(payload);

  if (type === "timed_challenge") {
    return `${label} sent`;
  }

  if (type === "timed_challenge_completed") {
    return `${label} completed`;
  }

  if (type === "timed_challenge_expired") {
    return `${label} expired`;
  }

  return "No recent challenge activity.";
}

function renderTimedChallengeRecentSummary() {
  const lastSent = getRecentTimedChallengeSentRow();
  const lastResult = getRecentTimedChallengeResultRow();

  const latest = (() => {
    if (!lastSent) return lastResult;
    if (!lastResult) return lastSent;

    const sentAt = new Date(lastSent?.created_at || 0).getTime();
    const resultAt = new Date(lastResult?.created_at || 0).getTime();

    return sentAt >= resultAt ? lastSent : lastResult;
  })();

  const activityText = getManagerRecentChallengeSummaryLabel(latest);
  const timeText = latest ? formatRecentChallengeTime(latest?.created_at) : "";
  const actorText = latest ? getTimedChallengeActorLabel(latest) : "";
  const metaLine = [actorText, timeText].filter(Boolean).join(" • ");

  const html = latest
    ? `
      <div style="font-weight:600;">Recent Challenge Activity</div>
      <div class="small-text" style="margin-top:4px; opacity:.92;">
        ${escapeHtml(activityText)}
      </div>
      <div class="small-text" style="margin-top:4px; opacity:.75;">
        ${escapeHtml(metaLine)}
      </div>
    `
    : `
      <div style="font-weight:600;">Recent Challenge Activity</div>
      <div class="small-text" style="margin-top:4px; opacity:.75;">
        No recent challenge activity.
      </div>
    `;

  ["mbTimedChallengeRecentSummary", "mbLcTimedChallengeRecentSummary"].forEach((id) => {
    const root = document.getElementById(id);
    if (root) root.innerHTML = html;
  });
}

function renderManagerBoardRecentChallenges() {
  const root = document.getElementById("mbOverviewRecentChallenges");
  if (!root) return;

  const rows = getRecentTimedChallengeRows();

  const wrap = document.createElement("div");
  wrap.className = "card";
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "8px";
  wrap.style.padding = "12px";

  const title = document.createElement("div");
  title.style.fontWeight = "600";
  title.textContent = "Recent Challenge History";
  wrap.appendChild(title);

  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "small";
    empty.style.opacity = ".75";
    empty.textContent = "No recent timed challenge activity.";
    wrap.appendChild(empty);
    root.innerHTML = "";
    root.appendChild(wrap);
    return;
  }

  for (const row of rows) {
    const meta = getTimedChallengeMessageMeta(row);
    const payload = row?.payload || {};
    const label = meta?.label || "Timed Challenge";
    const titleText = meta?.title || getTimedChallengeLabel(payload?.challengeKey);
    const strongestSkill = meta?.strongestSkill || null;
    const actorLabel = getTimedChallengeActorLabel(row);
    const timeText = formatRecentChallengeTime(row?.created_at);

    const item = document.createElement("div");
    item.style.padding = "8px 0";
    item.style.borderTop = "1px solid rgba(255,255,255,0.06)";

    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
        <div style="min-width:0;">
          <div style="font-weight:600;">${escapeHtml(label)}</div>
          <div class="small" style="opacity:.85; margin-top:4px;">
            ${escapeHtml(titleText)} • ${escapeHtml(actorLabel)}
            ${strongestSkill ? ` • Strongest skill: ${escapeHtml(strongestSkill)}` : ""}
          </div>
          <div class="small" style="opacity:.7; margin-top:4px;">
            ${escapeHtml(row?.body || "")}
          </div>
        </div>
        <div class="small" style="opacity:.7; white-space:nowrap;">${escapeHtml(timeText)}</div>
      </div>
    `;

    wrap.appendChild(item);
  }

  root.innerHTML = "";
  root.appendChild(wrap);
}

function getTimedChallengeMessageMeta(row) {
  const type = String(row?.type || "");
  const payload = row?.payload || {};
  const challengeKey = payload?.challengeKey || null;
  const label = getTimedChallengeLabel(challengeKey);

  if (type === "timed_challenge") {
    return {
      kind: "assigned",
      label: "Challenge Sent",
      title: label,
      strongestSkill: null,
    };
  }

  if (type === "timed_challenge_completed") {
    return {
      kind: "completed",
      label: "Completed",
      title: label,
      strongestSkill: payload?.strongestSkill || null,
    };
  }

  if (type === "timed_challenge_expired") {
    return {
      kind: "expired",
      label: "Expired",
      title: label,
      strongestSkill: null,
    };
  }

  return null;
}

function applyTimedChallengeFromMessage(message) {
  try {
    const payload = message?.payload || {};
    const challengeKey = payload?.challengeKey || null;
    const targetUserId = payload?.targetUserId || null;
    const restaurantId = payload?.restaurantId || null;
    const durationSec = Number(payload?.durationSec || 0);

    const ctx = window.__BC_CTX__ || window.__BC_BUILD_CTX__?.("premium") || {};
    const currentUserId = ctx.userId || null;
    const currentRestaurantId = ctx.restaurantId || null;

    if (!challengeKey || !targetUserId || !restaurantId || !durationSec) {
      console.warn("[TIMED CHALLENGE] invalid payload", payload);
      return false;
    }

    if (String(targetUserId) !== String(currentUserId || "")) return false;
    if (String(restaurantId) !== String(currentRestaurantId || "")) return false;

    const current = window.__BC_ACTIVE_TIMED_CHALLENGE__ || null;
    if (current?.id && message?.id && String(current.id) === String(message.id)) {
      console.log("[TIMED CHALLENGE] skipped (already active)", { id: message.id });
      return true;
    }

    const lastResult = window.__BC_LAST_TIMED_CHALLENGE_RESULT__ || null;
    if (lastResult?.id && message?.id && String(lastResult.id) === String(message.id)) {
      console.log("[TIMED CHALLENGE] skipped (already resolved)", { id: message.id });
      return true;
    }

    const startedAt = Date.now();
    const challenge = {
      id: message?.id || crypto.randomUUID(),
      title: payload?.title || "Timed Challenge",
      challengeKey,
      targetUserId,
      restaurantId,
      startedAt,
      expiresAt: startedAt + durationSec * 1000,
      durationSec,
      status: "active",
      payload,
    };

    window.__BC_ACTIVE_TIMED_CHALLENGE__ = challenge;
    setActiveProgressionOwner({
      user_id: targetUserId,
      restaurant_id: restaurantId,
    });
    console.log("[TIMED CHALLENGE] applied ✅", challenge);
    renderHudTimedChallenge();
    renderManagerBoardOverviewTimedChallenge();
    window.showToast?.("Timed manager challenge started ✅");
    return true;
  } catch (e) {
    console.warn("applyTimedChallengeFromMessage failed", e);
    return false;
  }
}

function getAbilityEffectSummary(ability) {
  switch (String(ability?.id || "")) {
    case "closing_surge":
      return "Improves closing-related performance.";
    case "recovery_focus":
      return "Improves recovery-related performance.";
    case "calm_floor":
      return "Reduces encounter pressure growth.";
    case "premium_window":
      return "Improves premium opportunity conditions.";
    default:
      return ability?.description || "";
  }
}

function getAbilityFamilySummary(family) {
  const items = getAbilitiesByFamily(family).filter((x) => canUseAbilityOnSurface(x, "manager_board"));
  const activeCount = items.filter((x) => isAbilityActive(x.id)).length;
  const unlockedCount = items.filter((x) => !!x.unlocked).length;
  const readyCount = items.filter((x) => isAbilityAvailable(x, "gameplay_panel")).length;

  return {
    total: items.length,
    active: activeCount,
    unlocked: unlockedCount,
    ready: readyCount,
  };
}

function getAbilityUseContextLabel() {
  const useCtx = getCurrentAbilityUseContext();
  return `Role: ${useCtx.role || "-"} • Mode: ${useCtx.mode || "-"}`;
}

function renderManagerBoardAbilitiesTab(family, targetId) {
  const root = document.getElementById(targetId);
  if (!root) return;

  const items = getAbilitiesByFamily(family).filter((x) => canUseAbilityOnSurface(x, "manager_board"));
  const summary = getAbilityFamilySummary(family);
  root.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "card";
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "10px";
  wrap.style.padding = "12px";

  const title = document.createElement("div");
  title.style.fontWeight = "600";
  title.textContent = family === "attribute" ? "Attribute Abilities" : "Area Abilities";
  wrap.appendChild(title);

  const ctxLine = document.createElement("div");
  ctxLine.className = "small";
  ctxLine.style.opacity = ".7";
  ctxLine.textContent = getAbilityUseContextLabel();
  wrap.appendChild(ctxLine);

  const meta = document.createElement("div");
  meta.className = "small";
  meta.style.opacity = ".8";
  meta.textContent = `Unlocked: ${summary.unlocked}/${summary.total} • Active: ${summary.active} • Ready: ${summary.ready}`;
  wrap.appendChild(meta);

  wrap.appendChild(renderManagerBoardActiveEffectsSummary());

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "small";
    empty.style.opacity = ".7";
    empty.textContent = "No abilities found.";
    wrap.appendChild(empty);
    root.appendChild(wrap);
    return;
  }

  for (const ability of items) {
    const active = isAbilityActive(ability.id);
    const available = isAbilityAvailable(ability, "manager_board");
    const statusText = getAbilityStatusText(ability, "manager_board");
    const effectText = getAbilityEffectSummary(ability);
    const familyScopeText = `${String(ability.family || "-")} → ${String(ability.scope || "-")}`;

    const row = document.createElement("div");
    row.style.padding = "10px";
    row.style.border = "1px solid rgba(255,255,255,0.08)";
    row.style.borderRadius = "10px";
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "flex-start";
    row.style.gap = "12px";

    row.innerHTML = `
      <div style="min-width:0;">
        <div style="font-weight:600;">${escapeHtml(ability.title || "Ability")}</div>
        <div class="small" style="opacity:.85; margin-top:4px;">
          ${escapeHtml(ability.description || "")}
        </div>
        <div class="small" style="opacity:.78; margin-top:6px;">
          ${escapeHtml(effectText)}
        </div>
        <div class="small" style="opacity:.7; margin-top:6px;">
          ${escapeHtml(`Family: ${familyScopeText} • Surface: Gameplay + Board`)}
        </div>
        <div class="small" style="opacity:.7; margin-top:6px;">
          Uses left: ${Number(ability.usesRemaining || 0)} • Duration: ${Number(ability.durationSec || 0)}s
        </div>
      </div>
      <div class="small" style="white-space:nowrap; opacity:.85; font-weight:600;">
        ${escapeHtml(statusText)}
      </div>
    `;

    if (active || available) {
      row.style.borderColor = "rgba(255,255,255,0.18)";
      if (active) {
        row.style.boxShadow = "0 0 0 1px rgba(255,255,255,0.04) inset";
      }
    }

    wrap.appendChild(row);
  }

  root.appendChild(wrap);
}

function renderManagerBoardAbilityTabs() {
  renderManagerBoardOverviewLiveEffects();
  safeCall("renderManagerLiveControlPanels", () => renderManagerLiveControlPanels?.());
}

function renderManagerLiveEffectsPanels() {
  return renderManagerLiveControlPanels?.();
}

function tickManagerBoardAbilities() {
  if (window.__BC_MB_ABILITIES_TICK_WIRED__) return;
  window.__BC_MB_ABILITIES_TICK_WIRED__ = true;
  const tick = () => {
    if (document.hidden) return;
    const screen = document.getElementById("screenManagerBoard");
    if (!screen || screen.classList.contains("hidden")) return;

    const overview = document.getElementById("mbTab_overview");
    const messenger = document.getElementById("screenManagerMessenger");
    const gameplayAdjustments = document.getElementById("mbTab_gameplay_adjustments");
    const overviewVisible = overview && !overview.classList.contains("hidden");
    const messengerVisible = messenger && !messenger.classList.contains("hidden");
    const gameplayAdjustmentsVisible = gameplayAdjustments && !gameplayAdjustments.classList.contains("hidden");

    if (messengerVisible) {
      renderTimedChallengeRecentSummary();
      renderDisplayMethodChallengeRecentSummary();
      renderManagerBoardDrillSummary();
      renderManagerThreadDrillSummary();
    }
    if (gameplayAdjustmentsVisible) {
      renderManagerBoardAbilityTabs();
      renderManagerDrillActionPanel?.();
      renderManagerGameplayAdjustmentsPanel?.();
      renderTimedChallengeComposer?.();
      renderManagerDisplayMethodActionPanel?.();
    }
  };

  tick();
  window.__BC_MB_ABILITIES_TICK__ = window.setInterval(tick, 1500);
}

// --- Fetch allowed restaurants for current scope ---
async function fetchAllowedRestaurantsForScope(scopeId) {
  if (!scopeId) return [];
  const { data, error } = await supabase
    .from("bc_scope_restaurants")
    .select("restaurant_id, restaurants:restaurants(id,name,code,seat_limit,require_invite)")
    .eq("scope_id", scopeId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[MB] fetchAllowedRestaurantsForScope failed", error);
    return [];
  }

  return (data || [])
    .map(r => r.restaurants)
    .filter(Boolean);
}

// --- Ensure active restaurant is valid for this scope ---
async function ensureActiveRestaurantValid() {
  const S = window.appState;
  const scopeId = S?.profile?.scope_id || null;

  const scopeType = String(S?.profile?.scope_type || "").toLowerCase();
  if (scopeType !== "group" && scopeType !== "enterprise") {
    S.activeRestaurantId = S?.profile?.restaurant_id || null;
    return { ok: true, activeRestaurantId: S.activeRestaurantId, allowed: [] };
  }

  const allowed = await fetchAllowedRestaurantsForScope(scopeId);
  const allowedIds = new Set(allowed.map(r => r.id));

  const stored = getStoredActiveRestaurantId(scopeId);
  const candidate =
    stored ||
    S.activeRestaurantId ||
    S?.profile?.restaurant_id ||
    null;

  let next = candidate;
  if (!next || !allowedIds.has(next)) {
    next = allowed[0]?.id || null;
  }

  S.activeRestaurantId = next;
  if (next) setStoredActiveRestaurantId(scopeId, next);

  return { ok: !!next, activeRestaurantId: next, allowed };
}

// --- Call this after login/profile load, BEFORE board/game boot ---
async function initRestaurantContextAfterAuth() {
  const res = await ensureActiveRestaurantValid();
  console.log("[MB] active restaurant resolved", res);

  if (!res.ok) {
    return;
  }

  markActiveRestaurantReady();

  if (document.getElementById("screenManagerBoard") &&
      !document.getElementById("screenManagerBoard").classList.contains("hidden")) {
    await loadManagerBoardData();
  }
}

// ---- ctx builder uses the global appState ----
window.__BC_BUILD_CTX__ = function buildBcCtx(requestedMode = null) {
  const S = window.appState;
  const userId = S?.session?.user?.id ?? null;
  const membershipRole = normalizeMembershipRole(S?.profile || null) || null;
  const role = membershipRole || S?.profile?.role || null;
  const scopeId = S?.profile?.scope_id ?? null;
  const scopeType = S?.profile?.scope_type ?? null;
  const accessTier = S?.profile?.access_tier ?? "demo";
  const restaurantId = window.getActiveRestaurantId?.() ?? null;
  const mode = requestedMode ?? "premium";
  return {
    userId,
    restaurantId,
    scopeId,
    scopeType,
    accessTier,
    membershipRole,
    role,
    membership_role: membershipRole,
    gameplayRole: membershipRole,
    gameplay_role: membershipRole,
    mode
  };
};

// ====== Wine Setup (PARENT) ======
const WINE_LIMIT = 10;
const FRUIT_OPTS = ["Red fruit","Dark fruit","Citrus","Stone fruit","Tropical","Floral","Herbal/Green","Spicy","Earthy/Savory","Smoky"];
const TEXTURE_OPTS = ["Silky","Chalky tannins","Firm tannins","Racy acidity","Creamy","Full-bodied","Medium-bodied","Light-bodied","Fresh","Bold"];
const OAK_OPTS = ["None","Light","Subtle","Noticeable"];

function getRestaurantIdOrNull() {
  return (
    getManagerActiveRestaurantId?.() ||
    window.__BC_ACTIVE_MANAGER_RESTAURANT_ID__ ||
    appState?.activeRestaurantId ||
    appState?.profile?.restaurant_id ||
    appState?.restaurant?.id ||
    null
  );
}

function setupMultiSelectGrid(containerId, options, maxPick, getState, setState) {
  const box = document.getElementById(containerId);
  if (!box) return;
  box.innerHTML = "";

  options.forEach((label) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.textContent = label;

    const refresh = () => {
      const selected = getState();
      btn.classList.toggle("selected", selected.includes(label));
    };

    btn.addEventListener("click", () => {
      const selected = [...getState()];
      const idx = selected.indexOf(label);
      if (idx >= 0) {
        selected.splice(idx, 1);
      } else {
        if (selected.length >= maxPick) return;
        selected.push(label);
      }
      setState(selected);
      refresh();
    });

    refresh();
    box.appendChild(btn);
  });
}

function setupSingleSelectGrid(containerId, options, getState, setState) {
  const box = document.getElementById(containerId);
  if (!box) return;
  box.innerHTML = "";

  options.forEach((label) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.textContent = label;

    const refresh = () => {
      btn.classList.toggle("selected", getState() === label);
    };

    btn.addEventListener("click", () => {
      setState(label);
      [...box.querySelectorAll("button")].forEach((b) => b.classList.remove("selected"));
      refresh();
    });

    refresh();
    box.appendChild(btn);
  });
}

function renderWineCount(count) {
  const el = document.getElementById("wineCountPremium");
  if (el) el.textContent = `${count} / ${WINE_LIMIT}`;
}

function normalizeWineRow(row) {
  if (!row) return row;
  if (row.fruitTags || row.oakLevel) return row;
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    createdBy: row.created_by,
    name: row.name,
    varietal: row.varietal,
    fruitTags: Array.isArray(row.fruit_tags) ? row.fruit_tags : [],
    textureTags: Array.isArray(row.texture_tags) ? row.texture_tags : [],
    oakLevel: row.oak_level ?? "",
    process: row.process ?? "",
    region: row.region ?? "",
    story: row.story ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getWineDedupKey(row) {
  if (!row || typeof row !== "object") return "";
  const name = String(row.name || "").trim().toLowerCase();
  const varietal = String(row.varietal || "").trim().toLowerCase();
  const region = String(row.region || "").trim().toLowerCase();
  const story = String(row.story || "").trim().toLowerCase();
  if (name || varietal || region || story) {
    return `shape:${name}::${varietal}::${region}::${story}`;
  }
  const id = String(row.id || "").trim();
  return id ? `id:${id}` : "";
}

function dedupeWineRows(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  const seen = new Set();
  const out = [];
  for (const row of list) {
    const key = getWineDedupKey(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function renderWineTable(wines) {
  const safeWines = Array.isArray(wines) ? wines : [];
  const body = document.getElementById("premiumWineTableBody");
  const cards = document.getElementById("premiumWineCards");
  if (body) body.innerHTML = "";
  if (cards) cards.innerHTML = "";

  renderWineCount(safeWines.length);
  const runtimeRestaurantId = String(
    getRestaurantIdOrNull() ||
    appState?.restaurant?.id ||
    appState?.activeRestaurantId ||
    appState?.profile?.restaurant_id ||
    ""
  ).trim();
  const managerRestaurantId = String(getManagerActiveRestaurantId() || "").trim();
  const cacheIds = Array.from(new Set([runtimeRestaurantId, managerRestaurantId].filter(Boolean)));
  if (cacheIds.length) {
    cacheIds.forEach((rid) => setManagerWineOptionsCache(rid, safeWines.slice()));
  }

  safeWines.forEach((w, idx) => {
    const wine = w || {};
    if (body) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(wine.name || `Wine ${idx + 1}`)}</td>
        <td>${escapeHtml(wine.varietal || "")}</td>
      <td>${escapeHtml(Array.isArray(wine.fruitTags) ? wine.fruitTags.join(", ") : Array.isArray(wine.fruit_tags) ? wine.fruit_tags.join(", ") : "")}</td>
      <td>${escapeHtml(Array.isArray(wine.textureTags) ? wine.textureTags.join(", ") : Array.isArray(wine.texture_tags) ? wine.texture_tags.join(", ") : "")}</td>
      <td>${escapeHtml(wine.oakLevel || wine.oak_level || "")}</td>
      <td>${escapeHtml(wine.region || "")}</td>
      <td><button type="button" class="btn-danger" data-wine-del="${escapeHtml(String(wine.id || wine.wine_id || wine.created_at || idx))}">Delete</button></td>
      `;
      body.appendChild(tr);
    }

    if (cards) {
      const div = document.createElement("div");
      div.className = "wine-card";
      div.innerHTML = `
        <div class="wine-card-type">Wine Card</div>
        <div><strong>${escapeHtml(wine.name || `Wine ${idx + 1}`)}</strong> — ${escapeHtml(wine.varietal || "")}</div>
        <div>${escapeHtml((Array.isArray(wine.fruitTags) ? wine.fruitTags : wine.fruit_tags || []).join(", "))} · ${escapeHtml((Array.isArray(wine.textureTags) ? wine.textureTags : wine.texture_tags || []).join(", "))} · ${escapeHtml(wine.oakLevel || wine.oak_level || "")}</div>
        <div>${escapeHtml(wine.region || "")}</div>
        <button type="button" class="btn-danger" data-wine-del="${escapeHtml(String(wine.id || wine.wine_id || wine.created_at || idx))}">Delete</button>
      `;
      cards.appendChild(div);
    }
  });

}

function getAnyManagerWineOptionsForDisplay(restaurantId = null) {
  const rid = String(restaurantId || "").trim();
  const scoped = rid ? getSharedManagerWineOptions(rid) : [];
  if (scoped.length) return scoped;

  const global = getSharedManagerWineOptions();
  if (global.length) return global;

  const frameWines = Array.isArray(getPremiumFrameWindow?.()?.wines)
    ? getPremiumFrameWindow().wines
    : [];
  if (frameWines.length) return frameWines;

  return [];
}

function buildWineTraceSnapshot(restaurantId = null) {
  const rid = String(restaurantId || getManagerActiveRestaurantId() || getRestaurantIdOrNull() || "").trim();
  const scopedCache = rid ? getSharedManagerWineOptions(rid) : [];
  const globalCache = getSharedManagerWineOptions();
  const frameWines = Array.isArray(getPremiumFrameWindow?.()?.wines)
    ? getPremiumFrameWindow().wines
    : [];

  return {
    restaurantId: rid || "-",
    scopedCount: scopedCache.length,
    globalCount: globalCache.length,
    frameCount: frameWines.length,
    activeMgrRestaurantId: String(window.__BC_ACTIVE_MANAGER_RESTAURANT_ID__ || "-"),
    storedRestaurantId: String(getStoredActiveRestaurantId?.(appState?.profile?.scope_id || null) || "-"),
  };
}

function renderWineTrace(elId = "wineSetupTrace", restaurantId = null) {
  const el = document.getElementById(elId);
  if (!el) return;

  const trace = buildWineTraceSnapshot(restaurantId);
  el.textContent =
    `Wine trace • rid ${trace.restaurantId} • scoped ${trace.scopedCount} • global ${trace.globalCount} • frame ${trace.frameCount} • active ${trace.activeMgrRestaurantId} • stored ${trace.storedRestaurantId}`;
}

function renderWinePreviewList(elId, restaurantId = null, limit = 10) {
  const el = document.getElementById(elId);
  if (!el) return;

  const wines = Array.isArray(getAnyManagerWineOptionsForDisplay(restaurantId))
    ? getAnyManagerWineOptionsForDisplay(restaurantId).slice(0, limit)
    : [];
  if (!wines.length) {
    el.innerHTML = `<div style="opacity:.75;">No wines available.</div>`;
    return;
  }

  el.innerHTML = `
    <div style="font-weight:600; margin-bottom:6px;">Wine preview</div>
    ${wines.map((wine, idx) => {
      const name = wine?.name || `Wine ${idx + 1}`;
      const varietal = wine?.varietal ? ` (${wine.varietal})` : "";
      const region = wine?.region ? ` • ${wine.region}` : "";
      return `<div style="padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.08);">${escapeHtml(`${name}${varietal}${region}`)}</div>`;
    }).join("")}
  `;
}

function buildReactionChecksFromDrillPick(msg) {
  const g = String(msg.guestStateActual || "").toLowerCase();
  const mode = String(msg.modeSelected || "").toLowerCase();
  const hookType = String(msg.hookMeta?.hookType || "").toLowerCase();
  const hookText = String(msg.hookMeta?.text || "");

  const guestRead =
    (String(msg.guestReadSelected || "").toLowerCase() === g)
      ? "right"
      : "wrong";

  const modeStatus = "picked";
  const hookStatus = msg.hookMeta?.tier || "picked";
  const deliveryCorrect = true;

  const checks = {
    guestRead,
    modeStatus,
    hookStatus,
    deliveryCorrect,
    firstMode: mode,
    ...((g === "decider" || g === "dictator")
      ? {
          dictatorMode: mode,
          dictatorPromptType: hookType,
          dictatorPromptText: hookText,
        }
      : {})
  };

  return checks;
}

if (!window.__BC_PARENT_TRACE__) {
  window.__BC_PARENT_TRACE__ = true;
  window.addEventListener("message", (event) => {
    const msg = event?.data;
    if (msg?.source === "BC_MSG") {
      if ((msg.type === "wines_report" || msg.type === "wines_sync") && Array.isArray(msg.wines)) {
        const incomingRid = String(msg.restaurantId || "").trim();
        const currentRid = String(
          getManagerActiveRestaurantId() ||
          appState?.restaurant?.id ||
          appState?.activeRestaurantId ||
          ""
        ).trim();
        const rid = incomingRid || currentRid;
        const incomingWines = Array.isArray(msg.wines) ? msg.wines : [];
        if (rid && incomingWines.length) {
          if (incomingRid && !currentRid) {
            try { setManagerActiveRestaurantId(incomingRid); } catch {}
          }
          setManagerWineOptionsCache(rid, incomingWines);
          if (incomingRid && currentRid && incomingRid !== currentRid) {
            setManagerWineOptionsCache(incomingRid, incomingWines);
          }
          if (document.getElementById("mbTimedChallengeWine") || document.getElementById("mbLcTimedChallengeWine")) {
            loadTimedChallengeWineOptions().catch(console.warn);
          }
        } else if (rid && !incomingWines.length) {
          const cachedWines = getSharedManagerWineOptions(rid);
          if (!cachedWines.length) {
            console.warn(`[PARENT] ignoring empty ${msg.type} with no cached wines`, { rid, req: msg.reqId || null });
          } else {
            console.warn(`[PARENT] ignoring empty ${msg.type} to preserve existing cache`, { rid, req: msg.reqId || null, cachedCount: cachedWines.length });
          }
        }
      }
      console.log(
        "[PARENT] got",
        msg,
        "origin:",
        event.origin,
        "from iframe?",
        event.source === document.getElementById("premiumRootFrame")?.contentWindow
      );
    }
  });
  console.log("parent listener armed");
}

// ------------------------------------------------------------
// BC Bridge: iframe -> parent
// Handles:
// - bc_ctx_request (iframe asks for context)
// - event_log (iframe emits telemetry)
// ------------------------------------------------------------
async function assertRestaurantAllowedForCtx(profile, restaurantId) {
  const role = String(profile?.role || "").toLowerCase();
  const scopeType = String(profile?.scope_type || "").toLowerCase();
  const scopeId = profile?.scope_id || null;

  if (!restaurantId) return { ok: false, reason: "missing_restaurant" };
  if (!role) return { ok: false, reason: "missing_role" };

  // Managers + group/enterprise: must be in bc_scope_restaurants
  if (isManagerRole(role) && (scopeType === "group" || scopeType === "enterprise")) {
    if (!scopeId) return { ok: false, reason: "missing_scope_id" };

    const { data, error } = await supabase
      .from("bc_scope_restaurants")
      .select("restaurant_id")
      .eq("scope_id", scopeId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (error) return { ok: false, reason: "db_error:" + error.message };
    return { ok: !!data, reason: data ? "" : "not_in_scope" };
  }

  // ✅ Explicit “restaurant scope” expectation
  if (scopeType && scopeType !== "restaurant") {
    return { ok: false, reason: `invalid_scope_type_for_role:${scopeType}` };
  }

  // Restaurant scope (waiter or manager single-restaurant): lock to profile.restaurant_id
  const pid = profile?.restaurant_id || null;
  if (!pid) return { ok: false, reason: "profile_missing_restaurant_id" };
  return { ok: pid === restaurantId, reason: pid === restaurantId ? "" : "restaurant_mismatch" };
}

async function getFirstAllowedRestaurantForScope(scopeId) {
  const { data, error } = await supabase
    .from("bc_scope_restaurants")
    .select("restaurant_id, created_at")
    .eq("scope_id", scopeId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) throw error;
  return data?.[0]?.restaurant_id || null;
}

async function getLiveSessionOrNull() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
  } catch {
    return null;
  }
}

async function getLiveAuthOrNull() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;

    const session = data?.session ?? null;
    const userId = session?.user?.id ?? null;

    if (!session || !userId) return null;
    return { session, userId };
  } catch {
    return null;
  }
}

function getSenderCtxOrReject(event, senderCtx, replyType, extra = {}, opts = {}) {
  const userId = senderCtx?.userId ?? null;
  const restaurantId = senderCtx?.restaurantId ?? null;

  const requireRestaurant = opts.requireRestaurant ?? true;
  const allowedRoles = Array.isArray(opts.allowedRoles)
    ? opts.allowedRoles.map((r) => String(r).toLowerCase())
    : null;
  const role = normalizeMembershipRole({
    membership_role: senderCtx?.membership_role ?? senderCtx?.membershipRole ?? null,
    role: senderCtx?.role ?? null
  });

  const reply = (error, more = {}) => {
    try {
      event.source?.postMessage(
        { source: "BC_MSG", v: 1, type: replyType, ok: false, error, ...extra, ...more },
        event.origin
      );
    } catch {}
    return null;
  };

  if (!isUuid(userId)) return reply("invalid_ctx_user");

  if (requireRestaurant && !isUuid(restaurantId)) return reply("invalid_ctx_restaurant");

  if (allowedRoles && allowedRoles.length) {
    const roleMatches = roleAliasesForMatching(role).some((alias) => allowedRoles.includes(alias));
    if (!roleMatches) return reply("forbidden_role");
  }

  return {
    userId,
    profileUserId: senderCtx?.profileUserId ?? senderCtx?.profile_user_id ?? userId,
    progressionOwnerUserId:
      senderCtx?.progressionOwnerUserId ??
      senderCtx?.progression_owner_user_id ??
      null,
    progressionOwnerRestaurantId:
      senderCtx?.progressionOwnerRestaurantId ??
      senderCtx?.progression_owner_restaurant_id ??
      null,
    restaurantId,
    role,
    membershipRole: senderCtx?.membershipRole ?? senderCtx?.membership_role ?? role,
    membership_role: senderCtx?.membership_role ?? senderCtx?.membershipRole ?? role,
    gameplayRole: senderCtx?.gameplayRole ?? senderCtx?.gameplay_role ?? role,
    gameplay_role: senderCtx?.gameplay_role ?? senderCtx?.gameplayRole ?? role,
    scopeId: senderCtx?.scopeId ?? null,
    scopeType: senderCtx?.scopeType ?? senderCtx?.scope_type ?? null,
    accessTier: senderCtx?.accessTier ?? senderCtx?.access_tier ?? null,
    mode: senderCtx?.mode ?? null,
  };
}

function rejectIfEpochMismatch(event, msg, replyType, extra = {}) {
  const epochNow = Number(window.__BC_IFRAME_EPOCH__ || 0);
  const msgEpoch = Number(msg?.epoch || 0);
  if (!epochNow || msgEpoch !== epochNow) {
    try {
      event.source?.postMessage(
        { source: "BC_MSG", v: 1, type: replyType, ok: false, error: "epoch_mismatch", ...extra },
        event.origin
      );
    } catch {}
    return true;
  }
  return false;
}

function isDemoMsg(msg, senderCtx) {
  return (
    String(senderCtx?.mode || "").toLowerCase() === "demo" ||
    String(msg?.mode || "").toLowerCase() === "demo" ||
    String(msg?.payload?.mode || "").toLowerCase() === "demo" ||
    String(msg?.payload?.bcMode || "").toLowerCase() === "demo"
  );
}

const PRE_BIND_ALLOW = new Set([
  "bc_ctx_request",
  "logout",
  "bc_logout_request",
  "nav",
  "nav_back",
  "ctx_retry",
  BC_TYPES.PROGRESSION_SNAPSHOT_REQUEST,
  "debug_progress_payload",
  "debug_skill_tree",
]);

const DB_TYPES = new Set([
  BC_TYPES.WINES_REQUEST,
  BC_TYPES.WINES_MUTATE,
  BC_TYPES.RUNS_COUNT_REQUEST,
  BC_TYPES.RITUAL_STATUS_REQUEST,
  "event_log",
  BC_TYPES.PROGRESSION_SNAPSHOT_REQUEST,
  BC_TYPES.PROGRESS_REPORT_SUBMIT,
  BC_TYPES.MESSAGES_UNREAD_REQUEST,
  BC_TYPES.MESSAGE_MARK_READ,
  BC_TYPES.LEADERBOARD_REQUEST,
]);

function rejectIfEpochMismatchSimple(msg) {
  const epochNow = Number(window.__BC_IFRAME_EPOCH__ || 0);
  const msgEpoch = Number(msg?.epoch || 0);
  return !epochNow || msgEpoch !== epochNow;
}

async function buildBcCtxSafe(requestedMode = null) {
  // Absolute: never build ctx without a live session.
  const live = await getLiveSessionOrNull();
  if (!live) return null;

  // keep appState synced
  appState.session = live;

  const S = window.appState;
  const userId = S?.session?.user?.id ?? null;
  const profile = S?.profile ?? null;
  if (!userId || !profile?.role) return null;
  const membershipRole = normalizeMembershipRole(profile) || null;
  const gameplayRole = membershipRole;
  const scopeType = profile?.scope_type ?? null;
  const accessTier = profile?.access_tier ?? "demo";
  const progressionOwner = getActiveProgressionOwnerContext();

  const mode = String(requestedMode || "").toLowerCase();
  const isDemo = mode === "demo";

  // DEMO: never attach to a real restaurant boundary
  if (isDemo) {
    return {
      userId,
      profileUserId: profile?.user_id ?? userId,
      progressionOwnerUserId: progressionOwner.userId || profile?.user_id || userId,
      progressionOwnerRestaurantId: progressionOwner.restaurantId || null,
      restaurantId: null,
      scopeId: null,
      scopeType: null,
      accessTier,
      membershipRole,
      role: membershipRole || profile?.role || null,
      membership_role: membershipRole,
      gameplayRole,
      gameplay_role: gameplayRole,
      mode: "demo",
      drill: null,
    };
  }

  const restaurantId = window.getActiveRestaurantId?.() ?? profile?.restaurant_id ?? null;
  if (!restaurantId) return null;

  return {
    userId,
    profileUserId: profile?.user_id ?? userId,
    progressionOwnerUserId: progressionOwner.userId || profile?.user_id || userId,
    progressionOwnerRestaurantId: progressionOwner.restaurantId || restaurantId,
    restaurantId,
    scopeId: profile?.scope_id ?? null,
    scopeType,
    accessTier,
    membershipRole,
    role: membershipRole || profile?.role || null,
    membership_role: membershipRole,
    gameplayRole,
    gameplay_role: gameplayRole,
    mode: requestedMode ?? "premium",
    drill: window.__BC_DRILL_CONFIG__ || window.BC_DRILL_CONFIG || null,
  };
}

if (!window.__BC_PARENT_BRIDGE__) {
  window.__BC_PARENT_BRIDGE__ = {
    loadGroupRestaurantsForPicker,
    setActiveRestaurantForGroup,
    mountPremiumGameIframe,
  };

  window.__BC_BUILD_CTX_SAFE__ = buildBcCtxSafe;

  window.__BC_SOURCE_CTX_MAP__ = window.__BC_SOURCE_CTX_MAP__ || new WeakMap();
  function setSourceCtx(source, ctx) {
    if (!source || source === window || !ctx) return;
    try {
      if (!window.__BC_SOURCE_CTX_MAP__) window.__BC_SOURCE_CTX_MAP__ = new WeakMap();
      window.__BC_SOURCE_CTX_MAP__.set(source, {
        epoch: Number(window.__BC_IFRAME_EPOCH__ || 0),
        mode: String(ctx.mode || ""),
        userId: ctx.userId || null,
        profileUserId: ctx.profileUserId || ctx.profile_user_id || ctx.userId || null,
        progressionOwnerUserId:
          ctx.progressionOwnerUserId ||
          ctx.progression_owner_user_id ||
          null,
        progressionOwnerRestaurantId:
          ctx.progressionOwnerRestaurantId ||
          ctx.progression_owner_restaurant_id ||
          null,
        restaurantId: ctx.restaurantId || null,
        role: ctx.role || null,
        membershipRole: ctx.membershipRole || ctx.membership_role || null,
        membership_role: ctx.membership_role || null,
        gameplayRole: ctx.gameplayRole || ctx.gameplay_role || null,
        gameplay_role: ctx.gameplay_role || null,
        scopeId: ctx.scopeId || null,
        scopeType: ctx.scopeType || ctx.scope_type || null,
        accessTier: ctx.accessTier || ctx.access_tier || null,
        at: Date.now(),
      });
    } catch {}
  }
  function getSourceCtx(source) {
    try {
      const c = window.__BC_SOURCE_CTX_MAP__?.get(source) || null;
      if (!c) return null;

      const currentEpoch = Number(window.__BC_IFRAME_EPOCH__ || 0);
      if (currentEpoch && c.epoch && c.epoch !== currentEpoch) return null;

      if (Date.now() - (c.at || 0) > 60_000 * 30) return null;

      return c;
    } catch { return null; }
  }
  function tagSource(source) {
    try {
      if (!source) return "null";
      if (!source.__BC_SRC_ID__) source.__BC_SRC_ID__ = crypto.randomUUID().slice(0, 8);
      return source.__BC_SRC_ID__;
    } catch { return "no_tag"; }
  }

  if (!window.__BC_BRIDGE__) {
    async function getBcCtx({ requestedMode, msg, event }) {
      const prem =
        document.getElementById("bcPremiumFrame") ||
        document.getElementById("premiumRootFrame");
      const isFromPremiumFrame = !!(prem && event?.source === prem.contentWindow);
      if (!isFromPremiumFrame) return null;

      const snapshot = getParentCtxSnapshot(requestedMode ?? "premium");
      const epoch = Number(snapshot.epoch || 0);
      const msgEpoch = Number(msg?.epoch || 0);
      if (msgEpoch !== epoch) return null;

      if (String(requestedMode || "").toLowerCase() === "demo") {
        const demoCtx = await buildBcCtxSafe("demo");
        if (demoCtx) setSourceCtx(event.source, demoCtx);
        return demoCtx;
      }

      try {
        if (window.__BC_ACTIVE_REST_READY__) {
          await Promise.race([
            window.__BC_ACTIVE_REST_READY__,
            new Promise((r) => setTimeout(r, 600))
          ]);
        }
      } catch {}

      const needRestaurant = String(requestedMode || "").toLowerCase() !== "demo";
      const rid = snapshot.activeRestaurantId;
      const live = await getLiveSessionOrNull();
      if (live) window.appState.session = live;
      const ready =
        !!live &&
        isParentCtxReady(requestedMode ?? "premium") &&
        (needRestaurant ? !!rid : true);
      if (!ready) {
        try {
          event.source?.postMessage(
            {
              source: "BC_MSG",
              v: 1,
              type: "ctx_not_ready",
              ok: false,
              epoch: Number(window.__BC_IFRAME_EPOCH__ || 0),
              retryAfterMs: 250,
              why: "profile_or_restaurant_not_ready",
            },
            event.origin
          );
        } catch {}
        return null;
      }

      const bcCtx = await buildBcCtxSafe(requestedMode ?? null);
      if (bcCtx) {
        bcCtx.drill = window.__BC_DRILL_CONFIG__ || window.BC_DRILL_CONFIG || null;
        setSourceCtx(event.source, bcCtx);
      }
      if (!bcCtx?.userId || !bcCtx?.role || (!bcCtx?.restaurantId && needRestaurant)) return null;
      return bcCtx;
    }

    async function fetchWines({ mode, event }) {
      const prem =
        document.getElementById("bcPremiumFrame") ||
        document.getElementById("premiumRootFrame");
      const isFromPremiumFrame = !!(prem && event?.source === prem.contentWindow);
      if (!isFromPremiumFrame) return [];

      const senderCtx = getSourceCtx(event.source);
      const userId = senderCtx?.userId || null;
      const rid = senderCtx?.restaurantId || null;
      const live = await getLiveSessionOrNull();
      if (!live || !isUuid(userId) || !isUuid(rid)) return [];
      window.appState.session = live;
      if (live?.user?.id !== userId) return [];
      if (String(mode || "").toLowerCase() === "demo") return [];

      const { data, error } = await supabase
        .from("bc_wines")
        .select("*")
        .eq("restaurant_id", rid)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    }

    async function getRunsCountSafe(supabase, userId, restaurantId) {
      if (!supabase || !userId || !restaurantId) return 0;

      const { data, error } = await supabase
        .from("bc_run_counts_v1")
        .select("runs_count")
        .eq("user_id", userId)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (error) {
        console.warn("[BC] runs_count fallback -> 0", error);
        return 0;
      }

      const n = Number(data?.runs_count || 0);
      console.log("[BC] runs_count view ->", { userId, restaurantId, runsCount: n });
      return n;
    }

    async function fetchRunsCount({ supabase: supabaseArg, userId, restaurantId, msg }) {
      const sb = supabaseArg || supabase || window.__SB__ || window.sb || window.supabase;
      const ctx = window.__BC_CTX__ || {};
      const nextUserId =
        userId ||
        msg?.userId ||
        msg?.user_id ||
        ctx.userId ||
        ctx.user_id ||
        null;
      const nextRestaurantId =
        restaurantId ||
        msg?.restaurantId ||
        msg?.restaurant_id ||
        ctx.restaurantId ||
        ctx.restaurant_id ||
        window.__BC_ACTIVE_RESTAURANT_ID__ ||
        null;

      const count = await getRunsCountSafe(sb, nextUserId, nextRestaurantId);
      return { ok: true, count };
    }

    // Types in this set are owned by the generic bridge above.
    // Keep them out of the legacy fallback listener below.
    const handledTypes = new Set([
      BC_TYPES.LOGOUT_REQUEST,
      BC_TYPES.CTX_REQUEST,
      BC_TYPES.WINES_REQUEST,
      BC_TYPES.WINES_MUTATE,
      BC_TYPES.RUNS_COUNT_REQUEST,
      BC_TYPES.RITUAL_STATUS_REQUEST,
      BC_TYPES.MESSAGES_UNREAD_REQUEST,
      BC_TYPES.MESSAGE_MARK_READ,
      BC_TYPES.LEADERBOARD_REQUEST,
      BC_TYPES.PROGRESSION_SNAPSHOT_REQUEST,
      BC_TYPES.PROGRESS_REPORT_SUBMIT,
      BC_TYPES.HARD_RESET_PROGRESSION,
      "event_log",
      "drill_run_started",
      "timed_challenge_result",
      "drill_run_completed",
      "logout",
    ]);
    window.__BC_BRIDGE_HANDLED_TYPES__ = handledTypes;

    async function getBridgeAuthedCtx({
      msg,
      event,
      replyType,
      extra = {},
      allowedRoles = ["waiter", "single_manager", "group_manager", "enterpriser"],
      demoPayload = {},
      onCtxRejected = null,
    } = {}) {
      const senderCtx = getSourceCtx(event.source);

      const replyDirect = (payload = {}) => {
        try {
          event.source?.postMessage(
            { source: "BC_MSG", v: 1, type: replyType, ...payload },
            event.origin
          );
        } catch {}
      };

      if (isDemoMsg(msg, senderCtx)) {
        replyDirect({ ok: true, demo: true, ...extra, ...demoPayload });
        return { ok: false, demo: true, senderCtx };
      }

      if (rejectIfEpochMismatch(event, msg, replyType, extra)) {
        return { ok: false, senderCtx };
      }

      const ctx = getSenderCtxOrReject(
        event,
        senderCtx,
        replyType,
        extra,
        { requireRestaurant: true, allowedRoles }
      );
      if (!ctx) {
        try { onCtxRejected?.(); } catch {}
        return { ok: false, senderCtx };
      }

      const liveAuthNow = await getLiveAuthOrNull();
      const authed = liveAuthNow?.userId || null;
      if (!authed) {
        replyDirect({ ok: false, error: "no_session", ...extra });
        return { ok: false, senderCtx, ctx };
      }
      if (String(authed) !== String(ctx.userId)) {
        replyDirect({ ok: false, error: "forbidden_user", ...extra });
        return { ok: false, senderCtx, ctx, liveAuthNow };
      }

      return { ok: true, ctx, senderCtx, liveAuthNow, replyDirect };
    }

    function makeBridgeReply(event, replyType, basePayload = {}) {
      return (payload = {}) => {
        try {
          event.source?.postMessage(
            {
              source: "BC_MSG",
              v: 1,
              type: replyType,
              ...basePayload,
              ...payload,
            },
            event.origin
          );
        } catch {}
      };
    }

    async function loadAssignedMessage({
      id,
      expectedType,
      lookupErrorCode,
      notFoundErrorCode,
      missingSenderErrorCode,
      replyResult,
      logLabel,
    }) {
      const { data: assignedMsg, error: assignedErr } = await supabase
        .from("bc_messages_v1")
        .select("id, sender_user_id, receiver_user_id, restaurant_id, type, body, payload")
        .eq("id", id)
        .eq("type", expectedType)
        .maybeSingle();

      if (assignedErr) {
        console.warn(`${logLabel} assigned message lookup failed`, assignedErr);
        replyResult({ ok: false, error: lookupErrorCode });
        return null;
      }

      if (!assignedMsg?.id) {
        console.warn(`${logLabel} assigned message not found`, { id, expectedType });
        replyResult({ ok: false, error: notFoundErrorCode });
        return null;
      }

      const managerUserId = assignedMsg.sender_user_id || null;
      if (!managerUserId) {
        console.warn(`${logLabel} assigned message has no sender_user_id`, assignedMsg);
        replyResult({ ok: false, error: missingSenderErrorCode });
        return null;
      }

      return { assignedMsg, managerUserId };
    }

    async function hasDuplicateMessageResult({
      type,
      senderUserId,
      receiverUserId,
      restaurantId,
      limit = 10,
      keyName,
      keyValue,
      lookupErrorCode,
      replyResult,
    }) {
      const { data: rows, error } = await supabase
        .from("bc_messages_v1")
        .select("id, payload, created_at")
        .eq("type", type)
        .eq("sender_user_id", senderUserId)
        .eq("receiver_user_id", receiverUserId)
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        replyResult({ ok: false, error: lookupErrorCode });
        return { ok: false, duplicate: false };
      }

      const duplicate = (rows || []).some(
        (row) => String(row?.payload?.[keyName] || "") === String(keyValue || "")
      );
      return { ok: true, duplicate };
    }

    const bridge = createBcBridge({
      allowedOrigin: window.location.origin,
      debug: true,
      handlers: {
        [BC_TYPES.LOGOUT_REQUEST]: makeLogoutHandler({ doLogout }),
        logout: makeLogoutHandler({ doLogout }),
        [BC_TYPES.CTX_REQUEST]: makeCtxHandler({ getBcCtx }),
        [BC_TYPES.WINES_REQUEST]: makeWinesHandler({ fetchWines }),
        [BC_TYPES.WINES_MUTATE]: makeWinesMutateHandler({
          supabase,
          getSourceCtx,
          isDemoMsg,
          rejectIfEpochMismatch,
          getSenderCtxOrReject,
          getLiveAuthOrNull,
        }),
        [BC_TYPES.RUNS_COUNT_REQUEST]: makeRunsCountHandler({ fetchRunsCount }),
        [BC_TYPES.RITUAL_STATUS_REQUEST]: makeRitualStatusHandler({
          supabase,
          getSourceCtx,
          isDemoMsg,
          rejectIfEpochMismatch,
          getSenderCtxOrReject,
          getLiveAuthOrNull,
        }),
        [BC_TYPES.MESSAGES_UNREAD_REQUEST]: makeMessagesUnreadHandler({
          supabase,
          getSourceCtx,
          isDemoMsg,
          rejectIfEpochMismatch,
          getSenderCtxOrReject,
          getLiveAuthOrNull,
        }),
        [BC_TYPES.MESSAGE_MARK_READ]: makeMessageMarkReadHandler({
          supabase,
          getSourceCtx,
          isDemoMsg,
          rejectIfEpochMismatch,
          getSenderCtxOrReject,
          getLiveAuthOrNull,
        }),
        [BC_TYPES.LEADERBOARD_REQUEST]: makeLeaderboardHandler({
          supabase,
          getSourceCtx,
          isDemoMsg,
          rejectIfEpochMismatch,
          getSenderCtxOrReject,
          getLiveAuthOrNull,
        }),
        [BC_TYPES.PROGRESSION_SNAPSHOT_REQUEST]: makeProgressionSnapshotHandler({
          getSourceCtx,
          isDemoMsg,
          rejectIfEpochMismatch,
          getSenderCtxOrReject,
          getLiveAuthOrNull,
          buildProgressionResult,
          getActiveRestaurantId: () => window.getActiveRestaurantId?.(),
          getAppState: () => window.appState,
          getIframeEpoch: () => window.__BC_IFRAME_EPOCH__,
        }),
        [BC_TYPES.PROGRESS_REPORT_SUBMIT]: makeProgressReportSubmitHandler({
          supabase,
          getSourceCtx,
          isDemoMsg,
          rejectIfEpochMismatch,
          getSenderCtxOrReject,
          getLiveAuthOrNull,
        }),
        [BC_TYPES.HARD_RESET_PROGRESSION]: makeHardResetProgressionHandler({
          getSourceCtx,
          isDemoMsg,
          rejectIfEpochMismatch,
          getSenderCtxOrReject,
          getLiveAuthOrNull,
          hardResetProgressionStateOnly,
        }),
        ...makeTournamentHandlers({
          resolveEncounterById: (encounterId) => getAuthoredEncounterByIdLazy(String(encounterId || "")),
          getIframeEpoch: () => window.__BC_IFRAME_EPOCH__,
        }),
        event_log: async ({ msg, event }) => {
          const replyType = "event_log_ack";
          const eventType = msg?.eventType || null;
          const gate = await getBridgeAuthedCtx({
            msg,
            event,
            replyType,
            extra: { eventType },
            demoPayload: { eventType },
          });
          if (!gate.ok) return;

          await handleEventLog({
            msg,
            event,
            supabase,
            tagSource,
            ctx: gate.ctx,
            replyType,
          });
        },
        drill_run_started: async ({ msg, event }) => {
          const replyType = "drill_run_started_result";
          const assignedMessageId = msg?.assignedMessageId || null;
          const replyResult = makeBridgeReply(event, replyType, { assignedMessageId });

          const gate = await getBridgeAuthedCtx({
            msg,
            event,
            replyType,
            extra: { assignedMessageId },
            demoPayload: { assignedMessageId },
            onCtxRejected: () => console.warn("[DRILL START] ctx rejected"),
          });
          console.log("[PARENT] drill_run_started received ✅", { msg, senderCtx: gate.senderCtx });
          if (gate.demo) return;
          if (!gate.ok) return;
          const ctx = gate.ctx;

          const p = msg?.payload || {};

          if (!assignedMessageId) {
            console.warn("[DRILL START] missing assignedMessageId");
            replyResult({ ok: false, error: "missing_assigned_message_id" });
            return;
          }

          const assignment = await loadAssignedMessage({
            id: assignedMessageId,
            expectedType: "drill_override",
            lookupErrorCode: "assigned_message_lookup_failed",
            notFoundErrorCode: "assigned_message_not_found",
            missingSenderErrorCode: "assigned_message_missing_sender",
            replyResult,
            logLabel: "[DRILL START]",
          });
          if (!assignment) return;
          const { assignedMsg, managerUserId } = assignment;

          if (String(assignedMsg.receiver_user_id || "") !== String(ctx.userId || "")) {
            console.warn("[DRILL START] assigned drill receiver mismatch", {
              assignedReceiver: assignedMsg.receiver_user_id,
              ctxUserId: ctx.userId,
            });
            replyResult({ ok: false, error: "assigned_message_receiver_mismatch" });
            return;
          }

          if (String(assignedMsg.restaurant_id || "") !== String(ctx.restaurantId || "")) {
            console.warn("[DRILL START] assigned drill restaurant mismatch", {
              assignedRestaurantId: assignedMsg.restaurant_id,
              ctxRestaurantId: ctx.restaurantId,
            });
            replyResult({ ok: false, error: "assigned_message_restaurant_mismatch" });
            return;
          }

          const duplicateCheck = await hasDuplicateMessageResult({
            type: "drill_started",
            senderUserId: ctx.userId,
            receiverUserId: managerUserId,
            restaurantId: ctx.restaurantId,
            limit: 10,
            keyName: "assignedMessageId",
            keyValue: assignedMessageId,
            lookupErrorCode: "existing_started_lookup_failed",
            replyResult,
          });
          if (!duplicateCheck.ok) return;

          if (duplicateCheck.duplicate) {
            window.__BC_PARENT_LAST_DRILL_STARTED__ = {
              assignedMessageId,
              payload: p,
              senderCtx: gate.senderCtx || null,
              at: Date.now(),
            };
            refreshManagerRuntimeSurfaces?.({
              thread: true,
              board: false,
              economy: false,
              liveControls: false,
              challengeMeta: false,
            });

            replyResult({ ok: true, managerUserId, duplicate: true });
            return;
          }

          const body = `Drill started • ${p?.focus || "drill"} • ${p?.repTarget ?? 0} reps`;

          const startedRow = {
            scope_type: "restaurant",
            scope_id: ctx.scopeId || ctx.restaurantId,
            restaurant_id: ctx.restaurantId,
            sender_user_id: ctx.userId,
            receiver_user_id: managerUserId,
            sender_role: ctx.membershipRole || ctx.role || "waiter",
            type: "drill_started",
            body,
            payload: {
              focus: p?.focus ?? null,
              repTarget: p?.repTarget ?? null,
              durationSec: p?.durationSec ?? null,
              tier: p?.tier ?? null,
              startedAt: p?.startedAt || Date.now(),
              assignedMessageId,
            },
          };

          const { error: insertErr } = await supabase
            .from("bc_messages_v1")
            .insert(startedRow);

          if (insertErr) {
            console.warn("[DRILL START] insert failed", insertErr);
            replyResult({ ok: false, error: "started_insert_failed" });
            return;
          }

          window.__BC_PARENT_LAST_DRILL_STARTED__ = {
            assignedMessageId,
            payload: p,
            senderCtx: gate.senderCtx || null,
            at: Date.now(),
          };
          refreshManagerRuntimeSurfaces?.({
            thread: true,
            board: false,
            economy: false,
            liveControls: false,
            challengeMeta: false,
          });

          replyResult({ ok: true, managerUserId });
        },
        timed_challenge_result: async ({ msg, event }) => {
          const replyType = "timed_challenge_result_ack";
          const challengeId = msg?.challengeId || null;
          const replyResult = makeBridgeReply(event, replyType, { challengeId });

          const gate = await getBridgeAuthedCtx({
            msg,
            event,
            replyType,
            extra: { challengeId },
            demoPayload: { challengeId },
          });
          if (gate.demo) return;
          if (!gate.ok) return;
          const ctx = gate.ctx;

          const p = msg?.payload || {};
          const challengeKey = p?.challengeKey || null;
          const status = String(p?.status || "").toLowerCase();
          const title = String(p?.title || getTimedChallengeLabel(challengeKey) || "Timed Challenge");
          const targetUserId = p?.targetUserId || ctx.userId;
          const restaurantId = p?.restaurantId || ctx.restaurantId;
          const rewardPoints = Number(p?.rewardPoints || 0);
          const outcome = p?.outcome || null;

          if (!challengeId) {
            replyResult({ ok: false, error: "missing_challenge_id" });
            return;
          }

          const assignment = await loadAssignedMessage({
            id: challengeId,
            expectedType: "timed_challenge",
            lookupErrorCode: "challenge_lookup_failed",
            notFoundErrorCode: "challenge_not_found",
            missingSenderErrorCode: "challenge_missing_sender",
            replyResult,
            logLabel: "[TIMED CHALLENGE]",
          });
          if (!assignment) return;
          const { managerUserId } = assignment;

          const resultType =
            status === "completed"
              ? "timed_challenge_completed"
              : "timed_challenge_expired";

          const duplicateCheck = await hasDuplicateMessageResult({
            type: resultType,
            senderUserId: targetUserId,
            receiverUserId: managerUserId,
            restaurantId,
            limit: 20,
            keyName: "challengeId",
            keyValue: challengeId,
            lookupErrorCode: "existing_result_lookup_failed",
            replyResult,
          });
          if (!duplicateCheck.ok) return;

          if (duplicateCheck.duplicate) {
            replyResult({ ok: true, managerUserId, resultType, duplicate: true });
            return;
          }

          const body =
            status === "completed"
              ? `Completed ${title}`
              : "Challenge Expired";

          const resultRow = {
            scope_type: "restaurant",
            scope_id: restaurantId,
            restaurant_id: restaurantId,
            sender_user_id: targetUserId,
            receiver_user_id: managerUserId,
            sender_role: ctx.membershipRole || ctx.role || "waiter",
            type: resultType,
            body,
            payload: {
              challengeId,
              challengeKey,
              title,
              status,
              rewardPoints,
              strongestSkill: p?.strongestSkill || null,
              outcome,
              chainSignal: p?.chainSignal || null,
              chainScore: p?.chainScore ?? null,
              guestReadCorrect: p?.guestReadCorrect ?? null,
              deliveryScore: p?.deliveryScore ?? null,
              resetUsed: p?.resetUsed ?? null,
              premiumSuccess: p?.premiumSuccess ?? null,
              strongPillars: p?.strongPillars ?? null,
              completedAt: p?.completedAt || Date.now(),
            },
          };

          const { error: insertErr } = await supabase
            .from("bc_messages_v1")
            .insert(resultRow);

          if (insertErr) {
            replyResult({ ok: false, error: "result_insert_failed" });
            return;
          }

          replyResult({
            ok: true,
            managerUserId,
            resultType,
          });
        },
        display_method_challenge_result: async ({ msg, event }) => {
          const replyType = "display_method_challenge_result_ack";
          const challengeId = msg?.challengeId || null;
          const replyResult = makeBridgeReply(event, replyType, { challengeId });

          const gate = await getBridgeAuthedCtx({
            msg,
            event,
            replyType,
            extra: { challengeId },
            demoPayload: { challengeId },
          });
          if (gate.demo) return;
          if (!gate.ok) return;
          const ctx = gate.ctx;

          const p = msg?.payload || {};
          const challengeKey = p?.challengeKey || null;
          const methodKey = p?.methodKey || null;
          const status = String(p?.status || "").toLowerCase();
          const title = String(p?.title || getDisplayMethodChallengeLabel(methodKey || challengeKey) || "Display Method Challenge");
          const targetUserId = p?.targetUserId || ctx.userId;
          const restaurantId = p?.restaurantId || ctx.restaurantId;
          const rewardPoints = Number(p?.rewardPoints || 0);
          const outcome = p?.outcome || null;

          if (!challengeId) {
            replyResult({ ok: false, error: "missing_challenge_id" });
            return;
          }

          const assignment = await loadAssignedMessage({
            id: challengeId,
            expectedType: "display_method_challenge",
            lookupErrorCode: "challenge_lookup_failed",
            notFoundErrorCode: "challenge_not_found",
            missingSenderErrorCode: "challenge_missing_sender",
            replyResult,
            logLabel: "[DISPLAY METHOD CHALLENGE]",
          });
          if (!assignment) return;
          const { managerUserId } = assignment;

          const resultType =
            status === "completed"
              ? "display_method_challenge_completed"
              : "display_method_challenge_expired";

          const duplicateCheck = await hasDuplicateMessageResult({
            type: resultType,
            senderUserId: targetUserId,
            receiverUserId: managerUserId,
            restaurantId,
            limit: 20,
            keyName: "challengeId",
            keyValue: challengeId,
            lookupErrorCode: "existing_result_lookup_failed",
            replyResult,
          });
          if (!duplicateCheck.ok) return;

          if (duplicateCheck.duplicate) {
            replyResult({ ok: true, managerUserId, resultType, duplicate: true });
            return;
          }

          const body =
            status === "completed"
              ? `Completed ${title}`
              : "Challenge Expired";

          const resultRow = {
            scope_type: "restaurant",
            scope_id: restaurantId,
            restaurant_id: restaurantId,
            sender_user_id: targetUserId,
            receiver_user_id: managerUserId,
            sender_role: ctx.membershipRole || ctx.role || "waiter",
            type: resultType,
            body,
            payload: {
              challengeId,
              challengeKey,
              methodKey,
              title,
              status,
              rewardPoints,
              strictness: p?.strictness || null,
              outcome,
              chainSignal: p?.chainSignal || null,
              chainScore: p?.chainScore ?? null,
              guestReadCorrect: p?.guestReadCorrect ?? null,
              deliveryScore: p?.deliveryScore ?? null,
              resetUsed: p?.resetUsed ?? null,
              premiumSuccess: p?.premiumSuccess ?? null,
              modeStatus: p?.modeStatus ?? null,
              hookStatus: p?.hookStatus ?? null,
              performanceGrade: p?.performanceGrade ?? null,
              strongPillars: p?.strongPillars ?? null,
              completedAt: p?.completedAt || Date.now(),
            },
          };

          const { error: insertErr } = await supabase
            .from("bc_messages_v1")
            .insert(resultRow);

          if (insertErr) {
            replyResult({ ok: false, error: "result_insert_failed" });
            return;
          }

          replyResult({
            ok: true,
            managerUserId,
            resultType,
          });
        },
        drill_run_completed: async ({ msg, event }) => {
          const replyType = "drill_run_completed_result";
          const assignedMessageId = msg?.assignedMessageId || null;
          const replyResult = makeBridgeReply(event, replyType, { assignedMessageId });
          const gate = await getBridgeAuthedCtx({
            msg,
            event,
            replyType,
            extra: { assignedMessageId },
            demoPayload: { assignedMessageId },
            onCtxRejected: () => console.warn("[DRILL RUN] ctx rejected"),
          });
          console.log("[PARENT] drill_run_completed received ✅", { msg, senderCtx: gate.senderCtx });
          if (gate.demo) return;
          if (!gate.ok) return;
          const ctx = gate.ctx;

          const p = msg?.payload || {};

          if (!assignedMessageId) {
            console.warn("[DRILL RUN] missing assignedMessageId");
            replyResult({ ok: false, error: "missing_assigned_message_id" });
            return;
          }

          const assignment = await loadAssignedMessage({
            id: assignedMessageId,
            expectedType: "drill_override",
            lookupErrorCode: "assigned_message_lookup_failed",
            notFoundErrorCode: "assigned_message_not_found",
            missingSenderErrorCode: "assigned_message_missing_sender",
            replyResult,
            logLabel: "[DRILL RUN]",
          });
          if (!assignment) return;
          const { managerUserId } = assignment;

          const duplicateCheck = await hasDuplicateMessageResult({
            type: "drill_completed",
            senderUserId: ctx.userId,
            receiverUserId: managerUserId,
            restaurantId: ctx.restaurantId,
            limit: 10,
            keyName: "assignedMessageId",
            keyValue: assignedMessageId,
            lookupErrorCode: "existing_completed_lookup_failed",
            replyResult,
          });
          if (!duplicateCheck.ok) return;

          if (duplicateCheck.duplicate) {
            replyResult({ ok: true, managerUserId, duplicate: true });
            return;
          }

          const body = `Drill completed • ${p?.focus || "drill"} • ${p?.repsDone ?? 0}/${p?.repTarget ?? 0} reps`;

          const completionRow = {
            scope_type: "restaurant",
            scope_id: ctx.scopeId || ctx.restaurantId,
            restaurant_id: ctx.restaurantId,
            sender_user_id: ctx.userId,
            receiver_user_id: managerUserId,
            sender_role: ctx.membershipRole || ctx.role || "waiter",
            type: "drill_completed",
            body,
            payload: {
              focus: p?.focus ?? null,
              repsDone: p?.repsDone ?? null,
              repTarget: p?.repTarget ?? null,
              durationSec: p?.durationSec ?? null,
              assignedMessageId
            }
          };

          console.log("[DRILL RUN] inserting completion row ✅", completionRow);

          const { error: insertErr } = await supabase
            .from("bc_messages_v1")
            .insert(completionRow);

          if (insertErr) {
            console.warn("[DRILL RUN] completion message insert failed", insertErr);
            replyResult({ ok: false, error: "completion_insert_failed" });
            return;
          }

          console.log("[DRILL RUN] drill_completed message inserted ✅", {
            managerUserId,
            assignedMessageId
          });
          replyResult({ ok: true, managerUserId });
        },
      },
    });
    window.__BC_BRIDGE__ = bridge;
  }

  window.addEventListener("message", async (event) => {
    try {
      const msg = event?.data;
      if (!msg || msg.source !== "BC_MSG" || msg.v !== 1) return;
      // Same-origin only (your game is served from the same Vite origin)
      if (event.origin !== window.location.origin) return;
      const type = msg.type;
      if (window.__BC_BRIDGE__ && window.__BC_BRIDGE_HANDLED_TYPES__?.has(type)) return;
      const notifyLoggedOut = () => {
        try {
          if (event.source && typeof event.source.postMessage === "function") {
            event.source.postMessage(
              { source: "BC_MSG", v: 1, type: "auth_state", authed: false },
              event.origin
            );
            event.source.postMessage(
              { source: "BC_MSG", v: 1, type: "parent_logged_out" },
              event.origin
            );
          }
        } catch {}
      };

      if (isHardLoggedOut()) {
        console.warn("[PARENT] BC_MSG blocked: hard logged out", type);
        notifyLoggedOut();
        try { destroyPremiumIframe("hard_logged_out_msg_gate"); } catch {}
        try { destroyDemoIframe("hard_logged_out_msg_gate"); } catch {}
        return;
      }

      if (window.__BC_LOGOUT_LOCK__) {
        console.warn("[PARENT] BC_MSG blocked: logout lock active", type);
        notifyLoggedOut();
        try { destroyPremiumIframe("logout_lock"); } catch {}
        try { destroyDemoIframe("logout_lock"); } catch {}
        return;
      }

      // Source gate: accept messages from whichever mounted game iframe is active.
      const candidateFrames = [
        document.getElementById("bcPremiumFrame"),
        document.getElementById("premiumRootFrame"),
        document.getElementById("gameRootDemoFrame"),
      ].filter(Boolean);
      const matchedFrame = candidateFrames.find((frame) => event.source === frame.contentWindow);
      if (!matchedFrame) return;

      if (msg.type === "debug_progress_payload") {
        console.log("[PARENT][DEBUG_PROGRESS_PAYLOAD]", msg.payload);
        return;
      }

      if (msg.type === "debug_skill_tree") {
        console.log("[PARENT][DEBUG_SKILL_TREE]", msg.tree);
        return;
      }

      const senderCtx = getSourceCtx(event.source);
      if (!senderCtx && !PRE_BIND_ALLOW.has(msg.type)) {
        console.warn("[PARENT] blocked msg (no senderCtx yet)", msg.type);
        try {
          event.source?.postMessage(
            {
              source: "BC_MSG",
              v: 1,
              type: "ctx_required",
              ok: false,
              reason: "no_sender_ctx",
              epoch: Number(window.__BC_IFRAME_EPOCH__ || 0),
              retryAfterMs: 250,
              why: "no_sender_ctx",
            },
            event.origin
          );
        } catch {}
        return;
      }

      let liveAuth = null;
      const isDemo = isDemoMsg(msg, senderCtx);
      if (DB_TYPES.has(msg.type) && !isDemo) {
        liveAuth = await getLiveAuthOrNull();
        if (!liveAuth) {
          console.warn("[PARENT] blocked: no live session", msg.type);
          notifyLoggedOut();
          try { destroyPremiumIframe("parent_no_session_db_gate"); } catch {}
          try { destroyDemoIframe("parent_no_session_db_gate"); } catch {}
          return;
        }
        appState.session = liveAuth.session;

        if (!senderCtx?.userId) {
          event.source?.postMessage(
            {
              source: "BC_MSG",
              v: 1,
              type: "ctx_not_ready",
              ok: false,
              reason: "no_sender_ctx_db",
              epoch: Number(window.__BC_IFRAME_EPOCH__ || 0),
              retryAfterMs: 250,
              why: "no_sender_ctx",
            },
            event.origin
          );
          return;
        }

        if (String(liveAuth.userId) !== String(senderCtx.userId)) {
          event.source?.postMessage(
            {
              source: "BC_MSG",
              v: 1,
              type: "ctx_required",
              ok: false,
              reason: "forbidden_user",
              epoch: Number(window.__BC_IFRAME_EPOCH__ || 0),
            },
            event.origin
          );
          return;
        }
      }

      if (msg.type === "nav_back" || msg.type === "nav") {
        if (shouldIgnoreDuplicateNav(msg)) return;
        const roleNow = String(appState?.profile?.role || "").toLowerCase();
        if (msg.type === "nav_back") {
          const requested = String(msg.backTo || msg.to || "screenPremiumApp");
          const backTo = (roleNow === "waiter" && requested === "screenManagerBoard")
            ? "screenPremiumApp"
            : requested;
          console.log("[PARENT] NAV_BACK ->", backTo, msg);

          destroyPremiumIframe("nav_back");
          if (backTo === "screenGameDemo") {
            destroyDemoIframe("nav_back_demo_shell");
          }
          setPremiumOverlayActive(false);
          showScreen(backTo);
          return;
        }
        const dest = msg.to || msg.target || msg.backTo || "screenHome";
        console.log("[PARENT] NAV ->", dest, msg);

        if (msg.type === "nav" && msg.to === "screenManagerBoard") {
          if (!hasRestaurantBoundAccess()) {
            console.warn("[NAV] blocked -> managerboard (no restaurant-bound access)");
            showScreen("screenPremiumApp");
            return;
          }
          window.__BC_MB_DEFAULTTAB__ = msg.mbTab || "overview";
          showScreen("screenManagerBoard");
          await ensureActiveRestaurantReady?.();
          wireManagerBoardMenu?.();

          if (!window.__BC_MB_LOADTAB__) {
            await loadManagerBoardData();
            destroyPremiumIframe("exit drill -> managerboard");
            setPremiumOverlayActive(false);
            return;
          }

          if (msg.mbTab) {
            window.__BC_MB_SHOWTAB__?.(msg.mbTab);
            await window.__BC_MB_LOADTAB__?.(msg.mbTab);
          } else {
            await window.__BC_MB_LOADTAB__?.(window.__BC_MB_DEFAULTTAB__);
          }

          destroyPremiumIframe("exit drill -> managerboard");
          setPremiumOverlayActive(false);
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
            window.__BC_MB_DEFAULTTAB__ = msg.mbTab || "overview";
            await ensureActiveRestaurantReady?.();
            wireManagerBoardMenu?.();

            if (!window.__BC_MB_LOADTAB__) {
              await loadManagerBoardData();
              return;
            }

            if (msg.mbTab) {
              window.__BC_MB_SHOWTAB__?.(msg.mbTab);
              await window.__BC_MB_LOADTAB__?.(msg.mbTab);
            } else {
              await window.__BC_MB_LOADTAB__?.(window.__BC_MB_DEFAULTTAB__);
            }
          }
          return;
        }
      }

      if (msg.type === "drill_pick") {
        window.__BC_PARENT_LAST_ENCOUNTER__ = msg;
        console.log("[PARENT] drill_pick stored ✅", msg);
        return;
      }

      if (msg.type === "hud_send_progress_feedback") {
        const result = msg?.result || {};

        const statuses = [
          document.getElementById("waiterSendProgressStatus"),
          document.getElementById("progressReportStatus")
        ].filter(Boolean);

        const setAll = (text) => {
          statuses.forEach((el) => {
            el.textContent = text;
          });
        };

        if (result?.ok) {
          setAll("Progress sent ✅");
        } else if (result?.error === "encounter_not_resolved") {
          setAll("Finish the encounter first, then send progress.");
        } else {
          setAll(describeProgressSendError(result?.error));
        }

        return;
      }

    } catch (e) {
      console.error("[BC] parent bridge failed:", e);
      try {
        const errType = String(event?.data?.type || "");
        const replyType = errType === "event_log" ? "event_log_ack" : "error";
        event.source?.postMessage(
          { source: "BC_MSG", v: 1, type: replyType, ok: false, error: String(e?.message || e) },
          event.origin
        );
      } catch {}
    }
  });
}

// ------------------------------------------------------------
// Progression Snapshot Provider (PARENT) -> used by progressionRouter
// ------------------------------------------------------------
async function buildProgressionSnapshotFromRecentEncounterLogs({ userId, restaurantId }) {
  if (!userId || !restaurantId) return null;

  const live = logLiveProgressionContractCheck(userId, restaurantId);

  const [eventLogRes, readinessRes, totalsRes] = await Promise.all([
    supabase
      .from("bc_event_log")
      .select("occurred_at,payload", { count: "exact" })
      .eq("restaurant_id", restaurantId)
      .eq("user_id", userId)
      .eq("event_type", "encounter_resolved")
      .order("occurred_at", { ascending: false })
      .limit(500),
    supabase
      .from("bc_readiness_v1")
      .select("last10_count,last10_greens,last10_reds,session_any_red_t2plus")
      .eq("user_id", userId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle(),
    supabase
      .from("bc_totals_v1")
      .select("encounters_total,pivots_taken_total,pivots_success_total")
      .eq("user_id", userId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle(),
  ]);

  if (eventLogRes?.error) {
    console.warn("[BC] progression event-log snapshot query failed", eventLogRes.error);
  }
  if (readinessRes?.error) {
    console.warn("[BC] progression readiness snapshot query failed", readinessRes.error);
  }
  if (totalsRes?.error) {
    console.warn("[BC] progression totals snapshot query failed", totalsRes.error);
  }

  const rows = Array.isArray(eventLogRes?.data) ? eventLogRes.data : [];
  const recent = rows
    .map((row) => classifyEncounterResolutionForProgression(row))
    .filter(Boolean);

  if (recent.length) {
    const recent10 = recent.slice(0, 10);
    const readinessRow = readinessRes?.data || {};
    const totalsRow = totalsRes?.data || {};
    const snapshot = normalizeProgressionSnapshot({
      encountersTotal: Number(eventLogRes?.count ?? rows.length ?? 0) || Number(totalsRow?.encounters_total ?? 0) || 0,
      last10Count: recent10.length,
      last10Greens: recent10.filter((item) => item.isGreen).length,
      last10Reds: recent10.filter((item) => item.isRed).length,
      anyRedT2Plus:
        typeof readinessRow?.session_any_red_t2plus === "boolean"
          ? readinessRow.session_any_red_t2plus
          : recent.some((item) => item.tier >= 2 && item.isRed),
      pivotsTaken: recent.filter((item) => item.pivotTaken).length || Number(totalsRow?.pivots_taken_total ?? 0) || 0,
      pivotsSuccess: recent.filter((item) => item.pivotSuccess).length || Number(totalsRow?.pivots_success_total ?? 0) || 0,
    });

    if (
      snapshot &&
      (snapshot.encountersTotal > 0 ||
        snapshot.last10Count > 0 ||
        snapshot.pivotsTaken > 0 ||
        snapshot.pivotsSuccess > 0)
    ) {
      return snapshot;
    }
  }

  const readinessRow = readinessRes?.data || {};
  const totalsRow = totalsRes?.data || {};
  const fallbackSnapshot = normalizeProgressionSnapshot({
    encountersTotal: Number(totalsRow?.encounters_total ?? 0) || 0,
    last10Count: Number(readinessRow?.last10_count ?? 0) || 0,
    last10Greens: Number(readinessRow?.last10_greens ?? 0) || 0,
    last10Reds: Number(readinessRow?.last10_reds ?? 0) || 0,
    anyRedT2Plus: !!readinessRow?.session_any_red_t2plus,
    pivotsTaken: Number(totalsRow?.pivots_taken_total ?? 0) || 0,
    pivotsSuccess: Number(totalsRow?.pivots_success_total ?? 0) || 0,
  });

  if (
    fallbackSnapshot &&
    (fallbackSnapshot.encountersTotal > 0 ||
      fallbackSnapshot.last10Count > 0 ||
      fallbackSnapshot.pivotsTaken > 0 ||
      fallbackSnapshot.pivotsSuccess > 0)
  ) {
    return fallbackSnapshot;
  }

  return null;
}

async function buildProgressionResult({ userId, restaurantId, desiredTier = 3 }) {
  const snapshot = await buildProgressionSnapshotFromRecentEncounterLogs({ userId, restaurantId });
  if (snapshot) {
    return await decideAllowedTierLazy({
      desiredTier: desiredTier === 1 ? 1 : desiredTier === 2 ? 2 : 3,
      userId,
      restaurantId,
      snapshot,
    });
  }

  await hydrateProgressionSpineFromLatestSnapshot({ userId, restaurantId });
  const spine = initProgressionSpineFromState();
  const currentPoints = Number(spine?.selectors?.points?.() ?? NaN);
  return await decideAllowedTierLazy({
    desiredTier: desiredTier === 1 ? 1 : desiredTier === 2 ? 2 : 3,
    userId,
    restaurantId,
    pointsTotal: Number.isFinite(currentPoints) ? currentPoints : null,
  });
}

function makeBlankGuestRank() {
  return {
    seen: 0,
    attempts: 0,
    readCorrect: 0,
    modeOptimal: 0,
    modeNeutral: 0,
    modeDamaging: 0,
    hookOptimal: 0,
    hookNeutral: 0,
    hookDamaging: 0,
    deliveryCorrect: 0,
    clean: 0,
    ok: 0,
    shaky: 0,
    break: 0,
  };
}

function buildBlankCanonicalProgressionState() {
  const capturedAt = Date.now();
  return {
    version: 1,
    capturedAt,
    economy: {
      points: 0,
      tier: 1,
      encounterRange: [1, 5],
      allowedGuestTypes: ["dictator", "bargain_smart", "griever"],
      tones: ["guide", "charm", "authority"],
      modes: ["guide", "charm", "authority"],
    },
    session: {
      runId: 0,
      runEase: 1,
      runEaseRemaining: 0,
      pressureLevel: 0,
      finalDifficulty: 1,
      currentEncounterId: 1,
      mode: "guide",
      guestTypeSelected: "dictator",
    },
    authority: {
      tierToServe: 1,
      encounterRange: [1, 5],
      guestTypes: ["dictator", "bargain_smart", "griever"],
    },
    display: {
      difficultySeed: 1,
      effectiveDifficulty: 1,
      pressureBand: "low",
    },
    run: {
      runId: 0,
      scoredThisRun: {},
    },
    rewards: {
      encounters: {},
      drills: {},
      timedChallenges: {},
      premiumByEncounter: {},
      legacy: {},
    },
    rewardsSummary: {
      encounters: { count: 0, totalPoints: 0 },
      drills: { count: 0, totalPoints: 0 },
      timedChallenges: { count: 0, totalPoints: 0 },
      premium: { count: 0, totalPoints: 0 },
      legacy: { count: 0, totalPoints: 0 },
    },
    mirror: {
      capturedAt,
      meta: {
        pointsTotal: 0,
        encountersCleared: 0,
        lastUpdatedMs: capturedAt,
        tierUnlocked: 1,
        difficultySeed: 1,
      },
      axes: { control: 0, selectivity: 0, compression: 0 },
      counters: { dictatorGood: 0, browserGood: 0, analystGood: 0 },
      flags: { resetDebt: 0 },
      unlocks: {
        authorityMode: false,
        compressedQuestions: false,
        powerMovePivot: false,
        explorationSafeHooks: false,
        singleVariableHooks: false,
        fancy: false,
        celebrator: false,
        guestFancy: false,
        guestCelebrator: false,
      },
      drift: { vec: 0, ttl: 0 },
      recovery: { type: null, step: 0, ttl: 0 },
      guestRanks: {
        dictator: makeBlankGuestRank(),
        bargain_smart: makeBlankGuestRank(),
        griever: makeBlankGuestRank(),
        fancy: makeBlankGuestRank(),
        celebrator: makeBlankGuestRank(),
      },
    },
  };
}

async function resetCanonicalProgressionRow(sb, { userId, restaurantId, scopeId = null }) {
  const blankRow = {
    user_id: userId,
    restaurant_id: restaurantId,
    scope_id: scopeId || restaurantId,
    canonical_state: buildBlankCanonicalProgressionState(),
    source_type: "hard_reset_progression",
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb
    .from("bc_progression_state_v1")
    .upsert(blankRow, { onConflict: "user_id,restaurant_id" });

  if (error) throw error;
}

async function clearProgressionSnapshots(sb, { userId, restaurantId }) {
  const { error } = await sb
    .from("bc_skill_snapshots_v1")
    .delete()
    .eq("user_id", userId)
    .eq("restaurant_id", restaurantId);

  if (error) throw error;
}

async function rehydrateBlankProgressionState({ userId, restaurantId }) {
  try {
    setActiveProgressionOwner({
      user_id: userId,
      restaurant_id: restaurantId,
      source: { reason: "hard_reset_progression_option_a" },
    });
  } catch {}

  await hydrateProgressionSpineFromLatestSnapshot({ userId, restaurantId });

  try {
    await window.__BC_GET_PROGRESSION_SNAPSHOT__?.({
      forceRefresh: true,
      userId,
      restaurantId,
    });
  } catch (snapshotRefreshError) {
    console.warn("[BC hard reset] snapshot refresh failed", snapshotRefreshError);
  }

  const resetMarkerKey = getProgressionResetMarkerKey(userId, restaurantId);
  try { localStorage.removeItem(resetMarkerKey); } catch {}
}

async function hardResetProgressionStateOnly({
  userId,
  restaurantId,
  scopeId = null,
  refreshParentView = true,
} = {}) {
  if (!userId || !restaurantId) {
    throw new Error("missing_reset_target");
  }

  const sb = window.supabase || window.__BC_SUPABASE__ || supabase;
  if (!sb) throw new Error("missing_supabase_client");

  const localKeys = clearLocalProgressionKeysForReset({ userId, restaurantId });

  try {
    await resetCanonicalProgressionRow(sb, { userId, restaurantId, scopeId });
    await clearProgressionSnapshots(sb, { userId, restaurantId });
    await rehydrateBlankProgressionState({ userId, restaurantId });
    if (refreshParentView) {
      await refreshParentProgressionFromDb?.();
    }

    return {
      ok: true,
      userId,
      restaurantId,
      resetMode: "progression_only",
      resetMarkerKey: localKeys?.resetMarkerKey || null,
    };
  } catch (error) {
    try {
      if (localKeys?.resetMarkerKey) localStorage.removeItem(localKeys.resetMarkerKey);
    } catch {}
    throw error;
  }
}

function invalidateManagerBoardProgressionModels() {
  window.__BC_MB_PERFORMANCE_MODEL__ = null;
  window.__BC_MB_SELECTION_MODEL__ = null;
}

function isFreshManagerBoardModel(model, ttlMs, restaurantId) {
  return (
    model &&
    String(model.restaurantId || "") === String(restaurantId || "") &&
    Date.now() - Number(model.loadedAt || 0) < Number(ttlMs || 0)
  );
}

function getVisibleManagerBoardTab() {
  const visible = document.querySelector("#mbPanels .mbTab:not(.hidden)");
  const id = String(visible?.id || "");
  if (!id.startsWith("mbTab_")) return "overview";
  return normalizeManagerBoardTab(id.slice("mbTab_".length));
}

async function refreshManagerBoardAfterProgressionReset() {
  invalidateManagerBoardProgressionModels();

  const activeTab = getVisibleManagerBoardTab();
  if (activeTab === "performance") {
    await loadManagerInsights();
    await loadHistoryWaiters();
    const select = document.getElementById("mbHistoryUser");
    if (select?.value) {
      await loadPerformanceHistory(select.value);
    }
    return;
  }

  if (activeTab === "selection") {
    await loadManagerBoardData();
    return;
  }

  await loadManagerBoardMembers();
  renderManagerPeopleSummary?.();
  safeCall("renderManagerBoardOverviewRitualStatusCard", () => renderManagerBoardOverviewRitualStatusCard?.());
}

async function hardResetWaiterProgressionAsManager({ userId, restaurantId = null } = {}) {
  const snapshot = getParentCtxSnapshot("premium");
  const profile = snapshot.profile || null;
  const managerRole = normalizeMembershipRole(profile);
  if (!["single_manager", "group_manager", "enterpriser"].includes(managerRole)) {
    throw new Error("forbidden_role");
  }

  const activeRestaurantId =
    getManagerActiveRestaurantId?.() ||
    snapshot.activeRestaurantId ||
    profile?.restaurant_id ||
    null;
  const targetRestaurantId = restaurantId || activeRestaurantId || null;

  if (!userId || !targetRestaurantId) {
    throw new Error("missing_reset_target");
  }

  if (activeRestaurantId && String(targetRestaurantId) !== String(activeRestaurantId)) {
    throw new Error("forbidden_target_restaurant");
  }

  let targetProfile = (window.__BC_MB_STAFF_ROWS__ || []).find(
    (row) => String(row?.user_id || "") === String(userId)
  ) || null;

  if (!targetProfile) {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, restaurant_id, role")
      .eq("user_id", userId)
      .eq("restaurant_id", targetRestaurantId)
      .maybeSingle();

    if (error) throw error;
    targetProfile = data || null;
  }

  if (!targetProfile) {
    throw new Error("target_not_found");
  }

  if (normalizeMembershipRole(targetProfile) !== "waiter") {
    throw new Error("target_not_waiter");
  }

  const ownerCtx = getActiveProgressionOwnerContext();
  const ownerRestoreUserId =
    ownerCtx?.userId ||
    profile?.user_id ||
    snapshot.session?.user?.id ||
    null;
  const ownerRestoreRestaurantId =
    ownerCtx?.restaurantId ||
    activeRestaurantId ||
    targetRestaurantId;

  try {
    const result = await hardResetProgressionStateOnly({
      userId,
      restaurantId: targetRestaurantId,
      scopeId: profile?.scope_id || targetRestaurantId,
      refreshParentView: false,
    });

    return result;
  } finally {
    setActiveProgressionOwner({
      user_id: ownerRestoreUserId,
      restaurant_id: ownerRestoreRestaurantId,
      source: { reason: "manager_progression_reset_restore" },
    });
    await refreshManagerBoardAfterProgressionReset();
  }
}

window.__BC_GET_PROGRESSION_SNAPSHOT__ = async function (opts = {}) {
  const session = appState.session || null;
  const authProfile = appState.profile || null;
  const authUserId = session?.user?.id || null;
  const ownerCtx = getActiveProgressionOwnerContext();

  const progressionOwnerUserId = resolveProgressionOwnerUserId({
    targetUserId: opts?.targetUserId || ownerCtx.userId || null,
    waiterUserId: opts?.waiterUserId,
    receiver_user_id: opts?.receiver_user_id,
    activeProfile: opts?.activeProfile || null,
    profile: opts?.activeProfile || opts?.profile || authProfile || null,
    membership: opts?.membership || null,
    restaurantId:
      opts?.restaurantId ||
      opts?.activeProfile?.restaurant_id ||
      opts?.membership?.restaurant_id ||
      ownerCtx.restaurantId ||
      authProfile?.restaurant_id ||
      null,
  }, session);

  const progressionOwnerRestaurantId = resolveProgressionOwnerRestaurantId({
    restaurantId:
      opts?.restaurantId ||
      opts?.activeProfile?.restaurant_id ||
      opts?.membership?.restaurant_id ||
      ownerCtx.restaurantId ||
      authProfile?.restaurant_id ||
      null,
    activeProfile: opts?.activeProfile || null,
    profile: opts?.activeProfile || opts?.profile || authProfile || null,
    membership: opts?.membership || null,
  });

  console.log("[BC snapshot target]", {
    authUserId,
    authProfileUserId: authProfile?.user_id || null,
    progressionOwnerUserId,
    progressionOwnerRestaurantId,
    ownerCtx,
    opts,
  });

  if (!authUserId) {
    console.warn("[BC snapshot] blocked: no auth user");
    return null;
  }

  if (!progressionOwnerUserId || !progressionOwnerRestaurantId) {
    console.warn("[BC snapshot] blocked: missing progression owner identity", {
      authUserId,
      progressionOwnerUserId,
      progressionOwnerRestaurantId,
      ownerCtx,
    });
    return null;
  }

  setActiveProgressionOwner({
    user_id: progressionOwnerUserId,
    restaurant_id: progressionOwnerRestaurantId,
  });

  const { data, error } = await supabase
    .from("bc_progression_state_v1")
    .select("*")
    .eq("user_id", progressionOwnerUserId)
    .eq("restaurant_id", progressionOwnerRestaurantId)
    .maybeSingle();

  console.log("[BC snapshot result]", {
    authUserId,
    progressionOwnerUserId,
    progressionOwnerRestaurantId,
    found: !!data,
    error: error?.message || null,
  });

  if (error) {
    console.warn("[BC snapshot] fetch failed", error);
    return null;
  }

  return data || null;
};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function showScreen(id) {
  const screens = document.querySelectorAll(".screen");
  screens.forEach((s) => s.classList.add("hidden"));

  const el = document.getElementById(id);
  if (el) {
    el.classList.remove("hidden");
  } else {
    console.error("[NAV] showScreen missing:", id, "-> falling back to screenHome");
    document.getElementById("screenHome")?.classList.remove("hidden");
    id = "screenHome";
  }

  removeGlobalResetButtons();
  applyRoleTemplateGates();
  onScreenChanged(id);

  // Ensure current screen controls are always wired after any UI/template mutation.
  try { wireDemoButtons(); } catch {}
  try { applyAuthUi(); } catch {}
  try { syncAuthUi?.(); } catch {}

  if (id === "screenHome") {
    hideAllLogoutButtons?.();
    document.getElementById("btnHomeLogout")?.classList.add("hidden");
    document.getElementById("btnHomeExitPremium")?.classList.add("hidden");
  }

  try { renderAppChrome?.(); } catch {}
}

function renderAppChrome() {
  const statusEl = document.getElementById("appChromeStatus");
  const premiumBarEl = document.getElementById("appChromePremiumBar");
  const playCtaEl = document.getElementById("appChromePlayCta");
  if (!statusEl && !premiumBarEl && !playCtaEl) return;

  const visibleScreens = Array.from(document.querySelectorAll(".screen:not(.hidden)"));
  const hasProfileOverlay = !document.getElementById("screenProfile")?.classList.contains("hidden");
  const hasWaiterLeaderboardOverlay = !document.getElementById("screenWaiterLeaderboard")?.classList.contains("hidden");
  const currentScreenId = hasWaiterLeaderboardOverlay
    ? "screenWaiterLeaderboard"
    : hasProfileOverlay
    ? "screenProfile"
    : (visibleScreens[0]?.id || "screenHome");

  const surfaceMap = {
    screenHome: "Lobby",
    screenCreateRestaurant: "Restaurant Setup",
    screenPremiumApp: "Premium Floor",
    screenProfile: "Profile",
    screenWaiterLeaderboard: "Leaderboard",
    screenSetupPremium: "Wine Setup",
    screenManagerBoard: "Manager Board",
    screenGameDemo: "Demo Floor",
  };

  const profile = appState?.profile || {};
  const hasSession = !!appState?.session?.user;
  const isDemoCockpit = currentScreenId === "screenGameDemo" && appMode === "demo";
  const isDemoWelcomeOpen =
    isDemoCockpit &&
    window.__BC_DEMO_IFRAME_LAST_SCREEN__ === "screenWelcome";
  const statusLabel = isDemoCockpit
    ? "DEMO"
    : hasSession
    ? ((profile?.access_tier || profile?.accessTier || "premium").toString().toUpperCase())
    : "Public Access";
  const showPremiumBar = (currentScreenId === "screenPremiumApp" && hasSession) || isDemoCockpit;
  const showPlayCta =
    ((currentScreenId === "screenPremiumApp" && hasSession) || isDemoCockpit) &&
    !isDemoWelcomeOpen;

  if (statusEl) statusEl.textContent = statusLabel;
  premiumBarEl?.classList.toggle("hidden", !showPremiumBar);
  playCtaEl?.classList.toggle("hidden", !showPlayCta);

  const premiumSignupBtn = document.getElementById("btnPremiumSignupMenu");
  const messagesBtn = document.getElementById("btnOpenMessages");
  const leaderboardBtn = document.getElementById("btnWaiterPerformanceLeaderboard");
  const wineSetupBtn = document.getElementById("btnPremiumWineSetup");
  const tutorialBtn = document.getElementById("btnTutorial");
  const managerBoardBtn = document.getElementById("btnManagerBoard");
  const profileBtn = document.getElementById("btnOpenProfile");
  const logoutBtn = document.getElementById("btnLogoutPremium");

  if (isDemoCockpit) {
    premiumSignupBtn?.classList.remove("hidden");
    messagesBtn?.classList.add("hidden");
    leaderboardBtn?.classList.add("hidden");
    wineSetupBtn?.classList.add("hidden");
    tutorialBtn?.classList.add("hidden");
    managerBoardBtn?.classList.add("hidden");
    profileBtn?.classList.add("hidden");
    logoutBtn?.classList.toggle("hidden", !hasSession);
  } else {
    premiumSignupBtn?.classList.add("hidden");
  }
}

function removeGlobalResetButtons() {
  const ids = [
    "btnResetAll",
    "btnResetRuns",
    "btnResetProgress",
    "btnResetWines",
    "btnResetRunsPremium",
    "btnResetProgressPremium",
    "btnResetWinesPremium",
    "btnResetRunsDemo",
    "btnResetProgressDemo",
    "btnResetWinesDemo",
  ];

  ids.forEach((id) => document.getElementById(id)?.remove());

  document.querySelectorAll("button").forEach((b) => {
    const t = (b.textContent || "").trim().toLowerCase();
    if (t.includes("reset")) b.remove();
  });
}

function onScreenChanged(id) {
  console.log("[NAV] parent onScreenChanged ->", id);

  const isPremium = id === "screenPremiumApp" || id === "screenPlay";
  if (isPremium && !appState?.session) {
    console.warn("[NAV] blocked premium mount: no session");
    showScreen("screenHome");
    return;
  }
  setPremiumOverlayActive(isPremium);

  if (!isPremium) {
    document.getElementById("hudPanel")?.classList.add("hidden");
  }

  // Login/home screen should never show logout controls.
  if (id === "screenHome") {
    hideAllLogoutButtons();
  }

  removeGlobalResetButtons();
}

function shouldIgnoreDuplicateNav(msg) {
  if (!msg || (msg.type !== "nav" && msg.type !== "nav_back")) return false;

  // Do NOT ignore nav_back — it's an escape hatch.
  if (msg.type === "nav_back") return false;

  window.__BC_LAST_NAV_AT__ = window.__BC_LAST_NAV_AT__ || 0;
  const now = Date.now();
  if (now - window.__BC_LAST_NAV_AT__ < 250) return true;
  window.__BC_LAST_NAV_AT__ = now;
  return false;
}

const MEMBERSHIP_UI_GATES = {
  waiter: {
    nav: {
      home: true,
      play: true,
      progress: true,
      skills: true,
      messages: true,
      restaurant: false,
      restaurants: false,
      waiterInvites: false,
      managerBoard: false,
      groupBoard: false,
      enterpriseBoard: false,
      influenceMap: false,
      intuit: false,
      profile: true,
    },
    powers: {
      canJoinByCode: true,
      canInviteWaiters: false,
      canUninviteWaiters: false,
      canManageRestaurant: false,
      canManageMultipleRestaurants: false,
      canOpenRestaurants: false,
      canUseInfluenceMap: false,
      canUseIntuit: false,
    },
  },

  single_manager: {
    nav: {
      home: true,
      play: true,
      progress: true,
      skills: true,
      messages: true,
      restaurant: true,
      restaurants: false,
      waiterInvites: true,
      managerBoard: true,
      groupBoard: false,
      enterpriseBoard: false,
      influenceMap: false,
      intuit: false,
      profile: true,
    },
    powers: {
      canJoinByCode: false,
      canInviteWaiters: true,
      canUninviteWaiters: true,
      canManageRestaurant: true,
      canManageMultipleRestaurants: false,
      canOpenRestaurants: true,
      canUseInfluenceMap: false,
      canUseIntuit: false,
    },
  },

  group_manager: {
    nav: {
      home: true,
      play: true,
      progress: true,
      skills: true,
      messages: true,
      restaurant: true,
      restaurants: true,
      waiterInvites: true,
      managerBoard: true,
      groupBoard: true,
      enterpriseBoard: false,
      influenceMap: true,
      intuit: false,
      profile: true,
    },
    powers: {
      canJoinByCode: false,
      canInviteWaiters: true,
      canUninviteWaiters: true,
      canManageRestaurant: true,
      canManageMultipleRestaurants: true,
      canOpenRestaurants: true,
      canUseInfluenceMap: true,
      canUseIntuit: false,
    },
  },

  enterpriser: {
    nav: {
      home: true,
      play: true,
      progress: true,
      skills: true,
      messages: true,
      restaurant: true,
      restaurants: true,
      waiterInvites: true,
      managerBoard: true,
      groupBoard: true,
      enterpriseBoard: true,
      influenceMap: true,
      intuit: true,
      profile: true,
    },
    powers: {
      canJoinByCode: false,
      canInviteWaiters: true,
      canUninviteWaiters: true,
      canManageRestaurant: true,
      canManageMultipleRestaurants: true,
      canOpenRestaurants: true,
      canUseInfluenceMap: true,
      canUseIntuit: true,
    },
  },
};

function getUiGates(role) {
  return MEMBERSHIP_UI_GATES[role] || MEMBERSHIP_UI_GATES.waiter;
}

function setVisible(id, show) {
  const el = document.getElementById(id);
  if (!el) return;
  el.hidden = !show;
}

function applyNavVisibility(role) {
  const gates = getUiGates(role).nav;

  setVisible("navHome", gates.home);
  setVisible("navPlay", gates.play);
  setVisible("navProgress", gates.progress);
  setVisible("navSkills", gates.skills);
  setVisible("navMessages", gates.messages);
  setVisible("navRestaurant", gates.restaurant);
  setVisible("navRestaurants", gates.restaurants);
  setVisible("navWaiterInvites", gates.waiterInvites);
  setVisible("navManagerBoard", gates.managerBoard);
  setVisible("navGroupBoard", gates.groupBoard);
  setVisible("navEnterpriseBoard", gates.enterpriseBoard);
  setVisible("navInfluenceMap", gates.influenceMap);
  setVisible("navIntuit", gates.intuit);
  setVisible("navProfile", gates.profile);
}

function applyPowerVisibility(role) {
  const powers = getUiGates(role).powers;

  setVisible("btnInviteWaiter", powers.canInviteWaiters);
  setVisible("btnUninviteWaiter", powers.canUninviteWaiters);
  setVisible("btnOpenRestaurant", powers.canOpenRestaurants);
  setVisible("btnInfluenceMap", powers.canUseInfluenceMap);
  setVisible("btnIntuit", powers.canUseIntuit);
}

function requirePower(role, powerKey) {
  const powers = getUiGates(role).powers;
  return !!powers[powerKey];
}

function applyRoleTemplateGates() {
  if (isHardLoggedOut()) return;

  const role = normalizeMembershipRole(appState?.profile || null) || "waiter";
  const gates = getUiGates(role);

  applyNavVisibility(role);
  applyPowerVisibility(role);
  window.__BC_UI_GATES__ = gates;
  window.__BC_ROLE__ = role;
  window.requirePower = requirePower;

  const idsToHideForWaiter = [
    "btnPremiumWineSetup",
    "btnTutorial",
    "btnWineSetup",
    "btnGoSetup",
    "btnSetupWines",
    "btnOpenSetup",
    "btnGoSetupPremium",
    "btnContinuePremium",
    "btnBackHomeFromSetupPremium",
  ];

  idsToHideForWaiter.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = gates.powers.canManageRestaurant ? "" : "none";
  });

  document.querySelectorAll('[data-nav="screenSetupPremium"]').forEach((el) => {
    el.style.display = gates.powers.canManageRestaurant ? "" : "none";
    el.style.pointerEvents = gates.powers.canManageRestaurant ? "" : "none";
  });
}

function applyWaiterTemplateGates() {
  applyRoleTemplateGates();
}

// (removed duplicate getActiveRestaurantId; use window.getActiveRestaurantId)

function buildBcCtx(requestedMode = null) {
  const S = window.appState;
  const userId = S?.session?.user?.id ?? null;
  const role = S?.profile?.role ?? null;
  const scopeId = S?.profile?.scope_id ?? null;
  const restaurantId = window.getActiveRestaurantId();
  const mode = requestedMode ?? null;

  return { userId, restaurantId, scopeId, role, mode };
}

function setMsg(elId, msg, kind = "normal") {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg || "";
  el.classList.remove("successText", "errorText");
  if (kind === "success") el.classList.add("successText");
  if (kind === "error") el.classList.add("errorText");
}

function clearMsgs() {
  setMsg("authMsg", "");
  setMsg("createRestMsg", "");
  setMsg("inviteMsg", "");
  setMsg("hudMsg", "");
  setMsg("mbListingMsg", "");
  setMsg("demoJoinMsg", "");
}

function getParentProgressionView() {
  return appState.progressionView || {
    level: "Building recognition",
    focus: "Reading guest intent",
    next: "Keep playing encounters",
    note: null
  };
}

function refreshParentProgressionUI() {
  const v = getParentProgressionView();

  const levelEl = document.getElementById("bcProgLevelParent");
  const focusEl = document.getElementById("bcProgFocusParent");
  const nextEl = document.getElementById("bcProgNextParent");
  const noteEl = document.getElementById("bcProgNoteParent");

  if (!levelEl || !nextEl || !noteEl) return;

  levelEl.textContent = v.level || "";
  if (focusEl) focusEl.textContent = v.focus || "";
  nextEl.textContent = v.next || "";

  if (v.note) {
    noteEl.textContent = v.note;
    noteEl.style.display = "block";
  } else {
    noteEl.textContent = "";
    noteEl.style.display = "none";
  }
}

window.refreshParentProgressionUI = refreshParentProgressionUI;

function mapTierToPhase2View(tierAllowed) {
  const t = Number(tierAllowed || 1);

  if (t < 2) {
    return {
      level: "Building recognition",
      focus: "Reading guest intent",
      next: "Keep playing encounters",
      note: "Progress updates after a few sessions"
    };
  }

  return {
    level: "Developing confidence",
    focus: "Staying steady under pushback",
    next: "Stay consistent across a few sessions",
    note: null
  };
}

function bcSeenKeyT2(userId, restaurantId) {
  return `bc_seen_unlock_t2__${userId}__${restaurantId}`;
}
function hasSeenT2(userId, restaurantId) {
  try { return localStorage.getItem(bcSeenKeyT2(userId, restaurantId)) === "1"; } catch { return false; }
}
function markSeenT2(userId, restaurantId) {
  try { localStorage.setItem(bcSeenKeyT2(userId, restaurantId), "1"); } catch {}
}

function showT2NoticeOnce() {
  const el = document.getElementById("bcUnlockNotice");
  if (!el) return;

  el.innerText =
    "You’re ready to manage pressure, not just read it.\n\n" +
    "From here on, guests will push back.\n" +
    "Your job is to stay calm, adjust, and keep control.";

  el.style.display = "block";

  if (_unlockHideTimer) clearTimeout(_unlockHideTimer);
  _unlockHideTimer = setTimeout(() => {
    el.style.display = "none";
    el.innerText = "";
  }, 6500);
}

function hideUnlockNotice() {
  const el = document.getElementById("bcUnlockNotice");
  if (!el) return;
  el.style.display = "none";
  el.innerText = "";
}

let _progInflight = false;
async function refreshParentProgressionFromDb() {
  if (_progInflight) return;
  _progInflight = true;
  try {
    const snapshot = getParentCtxSnapshot("premium");
    const session = snapshot.session || null;
    const profile = snapshot.profile || null;
    const ownerCtx = getActiveProgressionOwnerContext();
    const userId = resolveProgressionOwnerUserId({
      targetUserId: ownerCtx.userId || null,
      restaurantId:
        ownerCtx.restaurantId ||
        snapshot.activeRestaurantId ||
        profile?.restaurant_id ||
        null,
      profile,
    }, session);
    const restaurantId = resolveProgressionOwnerRestaurantId({
      restaurantId:
        ownerCtx.restaurantId ||
        snapshot.activeRestaurantId ||
        profile?.restaurant_id ||
        null,
      profile,
    });

    if (!userId || !restaurantId) {
      appState.progressionView = {
        level: "Building recognition",
        focus: "Reading guest intent",
        next: "Keep playing encounters",
        note: "Progress updates after a few sessions"
      };
      refreshParentProgressionUI();
      return;
    }

    const desiredTier = 2;
    await hydrateProgressionSpineFromLatestSnapshot({ userId, restaurantId });
    const spine = initProgressionSpineFromState();
    const currentPoints = Number(spine?.selectors?.points?.() ?? NaN);
    const result = await decideAllowedTierLazy({
      desiredTier,
      userId,
      restaurantId,
      pointsTotal: Number.isFinite(currentPoints) ? currentPoints : null,
      role: profile?.role,
      mode: "premium"
    });

    const tier = result?.tierToServe ?? 1;
    appState.progressionView = mapTierToPhase2View(tier);

    // --- Phase 2 unlock messaging (one-time, calm) ---
    const prev = appState._lastAllowedTier || 1;
    appState._lastAllowedTier = tier;

    if (prev < 2 && tier >= 2 && !hasSeenT2(userId, restaurantId)) {
      showT2NoticeOnce();
      markSeenT2(userId, restaurantId);
    }
    if (tier < 2) hideUnlockNotice();

    refreshParentProgressionUI();
  } catch {
    appState.progressionView = {
      level: "Building recognition",
      focus: "Reading guest intent",
      next: "Keep playing encounters",
      note: "Progress updates after a few sessions"
    };
    refreshParentProgressionUI();
  } finally {
    _progInflight = false;
  }
}

function withTimeout(promise, ms, label = "operation") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function normEmail(v) {
  return (v || "").trim().toLowerCase();
}
function normCode(v) {
  return (v || "").trim().toUpperCase();
}

function getPremiumFrameWindow() {
  const frame = document.getElementById("premiumRootFrame");
  return frame?.contentWindow || null;
}

function getPremiumFrame() {
  const frame = document.getElementById("premiumRootFrame");
  if (!frame) return null;

  const currentEpoch = Number(window.__BC_IFRAME_EPOCH__ || 0);
  const frameEpoch = Number(frame.dataset?.bcEpoch || 0);
  if (currentEpoch && frameEpoch && frameEpoch !== currentEpoch) {
    console.warn("[PARENT] getPremiumFrame blocked (epoch mismatch)", { frameEpoch, currentEpoch });
    return null;
  }
  return frame;
}

function postToGame(typeOrMsg, payload = {}) {
  try {
    if (isHardLoggedOut?.()) return false;
    if (isLoggingOut?.()) return false;
    if (!window.appState?.session) return false;
  } catch {}

  const frame = getPremiumFrame();
  const win = frame?.contentWindow;
  if (!win) {
    setDebug?.({ step: "postToGame.no_frame", type: typeOrMsg, payload });
    return false;
  }

  const msg =
    typeof typeOrMsg === "string"
      ? { source: "BC_MSG", v: 1, type: typeOrMsg, ...payload }
      : { source: "BC_MSG", v: 1, ...(typeOrMsg || {}) };

  win.postMessage(msg, window.location.origin);

  return true;
}

function postToGameAfterLoad(msg) {
  const frame = getPremiumFrame();
  if (!frame) return false;

  const send = () => {
    try {
      frame.contentWindow?.postMessage(
        { source: "BC_MSG", v: 1, ...(msg || {}) },
        window.location.origin
      );
      return true;
    } catch (e) {
      console.warn("[PARENT] postToGameAfterLoad send failed", e);
      return false;
    }
  };

  // Always bind one load retry, then also try immediate best-effort send.
  frame.addEventListener(
    "load",
    () => send(),
    { once: true }
  );

  send();
  return true;
}

async function fetchAndSendWines(targetWindow = null) {
  const restaurantId =
    window.getActiveRestaurantId?.() ||
    appState.activeRestaurantId ||
    appState.profile?.restaurant_id ||
    null;

  if (!restaurantId) {
    return;
  }

  try {
    const res = await supabase
      .from("bc_wines")
      .select("id, restaurant_id, name, varietal, price, notes, fruit_tags, texture_tags, oak_level, process, region, story, created_at, updated_at")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: true });

    if (res.error) {
      console.warn("[PARENT] bc_wines fetch failed", res.error);
    }

    const wines = dedupeWineRows(res.data || []);
    const win = targetWindow || getPremiumFrame()?.contentWindow;
    win?.postMessage(
      { source: "BC_MSG", v: 1, type: "wines_report", mode: "premium", wines },
      window.location.origin
    );
    console.log("[PARENT] wines_report -> iframe ✅", { count: wines.length, restaurantId });
  } catch (e) {
    console.warn("[PARENT] fetchAndSendWines failed", e);
  }
}

async function fetchParentRestaurantWines(restaurantId) {
  const { data, error } = await supabase
    .from("bc_wines")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return dedupeWineRows(data || []);
}

async function insertParentRestaurantWine(restaurantId, payload) {
  const { data: userRes, error: uErr } = await supabase.auth.getUser();
  if (uErr) throw uErr;
  const userId = userRes?.user?.id;
  if (!userId) throw new Error("not_authenticated");

  const row = {
    restaurant_id: restaurantId,
    created_by: userId,
    name: payload.name,
    varietal: payload.varietal,
    fruit_tags: payload.fruit_tags,
    texture_tags: payload.texture_tags,
    oak_level: payload.oak_level,
    process: payload.process || "",
    region: payload.region || "",
    story: payload.story || "",
  };

  const { error } = await supabase.from("bc_wines").insert(row);
  if (error) throw error;
}

async function deleteParentRestaurantWine(wineId) {
  const { error } = await supabase.from("bc_wines").delete().eq("id", wineId);
  if (error) throw error;
}

async function openPremiumSetupScreen() {
  try {
    await ensureManagerRestaurantChoices?.();
    await ensureActiveRestaurantValid?.();
  } catch (error) {
    console.warn("[BC] setup restaurant context resolve failed", error);
  }

  showScreen("screenSetupPremium");

  const backBtn = document.getElementById("btnBackHomeFromSetupPremium");
  if (backBtn && !backBtn.__bcBound) {
    backBtn.__bcBound = true;
    backBtn.addEventListener("click", () => {
      showScreen("screenPremiumApp");
    });
  }

  const startBtn = document.getElementById("btnContinuePremium");
  if (startBtn && !startBtn.__bcBound) {
    startBtn.__bcBound = true;
    startBtn.addEventListener("click", () => {
      showScreen("screenPremiumApp");
    });
  }

  const restaurantId = getManagerActiveRestaurantId() || getRestaurantIdOrNull();
  if (!restaurantId) {
    try {
      const fallbackWines = await fetchAnyAccessibleParentWines();
      const normalizedFallback = (fallbackWines || []).map(normalizeWineRow);
      setManagerWineOptionsCache("", normalizedFallback);
      renderWineCount(normalizedFallback.length);
      renderWineTable(normalizedFallback.slice(0, WINE_LIMIT));
    } catch (error) {
      console.warn("[BC] fallback wine load failed", error);
      const cachedFallback = getAnyManagerWineOptionsForDisplay();
      renderWineCount(cachedFallback.length);
      renderWineTable(cachedFallback.slice(0, WINE_LIMIT));
    }
    return;
  }

  let fruitSel = [];
  let textureSel = [];
  let oakSel = "";
  const advancedPanel = document.getElementById("premiumWineAdvanced");
  if (advancedPanel) advancedPanel.open = window.innerWidth > 860;

  setupMultiSelectGrid("fruitOptionsPremium", FRUIT_OPTS, 2, () => fruitSel, (v) => (fruitSel = v));
  setupMultiSelectGrid("textureOptionsPremium", TEXTURE_OPTS, 2, () => textureSel, (v) => (textureSel = v));
  setupSingleSelectGrid("oakOptionsPremium", OAK_OPTS, () => oakSel, (v) => (oakSel = v));

  const cachedWines = getAnyManagerWineOptionsForDisplay(restaurantId).map(normalizeWineRow);
  if (cachedWines.length) {
    renderWineTable(cachedWines.slice(0, WINE_LIMIT));
  }

  let wines = cachedWines;
  try {
    const winesRaw = await fetchParentRestaurantWines(restaurantId);
    const fetchedWines = (winesRaw || []).map(normalizeWineRow);
    if (fetchedWines.length) {
      wines = fetchedWines;
    } else {
      const accessibleWines = (await fetchAnyAccessibleParentWines()).map(normalizeWineRow);
      if (accessibleWines.length) {
        wines = accessibleWines;
      }
    }
  } catch (error) {
    console.warn("[BC] fetch wines for setup failed; falling back to cache", error);
    try {
      const accessibleWines = (await fetchAnyAccessibleParentWines()).map(normalizeWineRow);
      if (accessibleWines.length) {
        wines = accessibleWines;
      }
    } catch (fallbackError) {
      console.warn("[BC] accessible wine fallback failed", fallbackError);
    }
  }

  if (wines.length || !cachedWines.length) {
    setManagerWineOptionsCache(restaurantId, wines);
  }
  renderWineTable(wines.slice(0, WINE_LIMIT));
  const setupCount = document.getElementById("wineCountPremium");
  if (setupCount) {
    setupCount.textContent = `${Array.isArray(wines) ? wines.length : 0} / 10`;
  }
  const addBtn = document.getElementById("addWineBtnPremium");
  if (addBtn && !addBtn.__bcBound) {
    addBtn.__bcBound = true;
    addBtn.addEventListener("click", async () => {
      const name = (document.getElementById("wineNameInputPremium")?.value || "").trim();
      const varietal = (document.getElementById("wineVarietalInputPremium")?.value || "").trim();
      const process = (document.getElementById("processInputPremium")?.value || "").trim();
      const region = (document.getElementById("regionInputPremium")?.value || "").trim();
      const story = (document.getElementById("storyInputPremium")?.value || "").trim();

      if (!name || !varietal || fruitSel.length === 0 || textureSel.length === 0 || !oakSel) {
        alert("Please complete required fields and select fruit, texture, and oak.");
        return;
      }

      try {
        await insertParentRestaurantWine(restaurantId, {
          name,
          varietal,
          fruit_tags: fruitSel,
          texture_tags: textureSel,
          oak_level: oakSel,
          process,
          region,
          story,
        });

        document.getElementById("wineNameInputPremium").value = "";
        document.getElementById("wineVarietalInputPremium").value = "";
        document.getElementById("processInputPremium").value = "";
        document.getElementById("regionInputPremium").value = "";
        document.getElementById("storyInputPremium").value = "";
        fruitSel = [];
        textureSel = [];
        oakSel = "";

        setupMultiSelectGrid("fruitOptionsPremium", FRUIT_OPTS, 2, () => fruitSel, (v) => (fruitSel = v));
        setupMultiSelectGrid("textureOptionsPremium", TEXTURE_OPTS, 2, () => textureSel, (v) => (textureSel = v));
        setupSingleSelectGrid("oakOptionsPremium", OAK_OPTS, () => oakSel, (v) => (oakSel = v));

        const refreshedRaw = await fetchParentRestaurantWines(restaurantId);
        const refreshed = (refreshedRaw || []).map(normalizeWineRow);
        setManagerWineOptionsCache(restaurantId, refreshed);
        renderWineTable(refreshed.slice(0, WINE_LIMIT));
      } catch (e) {
        console.error("[BC] add wine failed", e);
        alert("Failed to save wine.");
      }
    });
  }

  const body = document.getElementById("premiumWineTableBody");
  const cards = document.getElementById("premiumWineCards");
  const getWineDeleteLabel = (wineId) => {
    const wine = getAnyManagerWineOptionsForDisplay(restaurantId).find((row) => {
      const rowId = String(row?.id || row?.wine_id || row?.created_at || "");
      return rowId && rowId === String(wineId);
    });
    const name = String(wine?.name || "").trim();
    const varietal = String(wine?.varietal || "").trim();
    if (name && varietal) return `${name} (${varietal})`;
    return name || varietal || "this wine";
  };
  const bindDeleteDelegation = (root) => {
    if (!root || root.__bcBound) return;
    root.__bcBound = true;
    root.addEventListener("click", async (ev) => {
      const btn = ev.target?.closest?.("[data-wine-del]");
      const wineId = btn?.getAttribute?.("data-wine-del");
      if (!wineId) return;
      const wineLabel = getWineDeleteLabel(wineId);
      if (!confirm(`Delete ${wineLabel}?\n\nThis will remove the wine card from setup.`)) return;

      try {
        await deleteParentRestaurantWine(wineId);
        const refreshedRaw = await fetchParentRestaurantWines(restaurantId);
        const refreshed = (refreshedRaw || []).map(normalizeWineRow);
        setManagerWineOptionsCache(restaurantId, refreshed);
        renderWineTable(refreshed.slice(0, WINE_LIMIT));
      } catch (e) {
        console.error("[BC] delete wine failed", e);
        alert("Failed to delete wine.");
      }
    });
  };
  bindDeleteDelegation(body);
  bindDeleteDelegation(cards);

}

function sendPremiumNav(action) {
  const w = getPremiumFrameWindow();
  if (!w) {
    setDebug({ step: "premium.nav.failed", reason: "no_frame_window", action });
    return;
  }

  w.postMessage(
    { source: "BC_MSG", v: 1, type: "nav", action },
    window.location.origin
  );
}

function wireParentButtons() {
  const btnManagerBoard = document.getElementById("btnManagerBoard");
  const btnOpenProfile = document.getElementById("btnOpenProfile");
  const btnOpenMessages = document.getElementById("btnOpenMessages");
  const btnPremiumWineSetup = document.getElementById("btnPremiumWineSetup");
  const btnTutorial = document.getElementById("btnTutorial");
  const btnPremiumSignupMenu = document.getElementById("btnPremiumSignupMenu");

  if (btnManagerBoard && !btnManagerBoard.__bcBound) {
    btnManagerBoard.__bcBound = true;
    btnManagerBoard.addEventListener("click", () => {
      const caps = getPremiumRoleCapabilities(appState?.profile);
      if (!caps.canAccessManagerBoard) return;
      routeManagerBoard?.("nav_button");
    });
  }

  if (btnOpenProfile && !btnOpenProfile.__bcBound) {
    btnOpenProfile.__bcBound = true;
    btnOpenProfile.addEventListener("click", async () => {
      await loadAuthedState?.("openProfile");
      renderProfileScreen();
      openProfilePanel();
      void ensureManagerRestaurantChoices?.();
    });
  }

  // Waiter / premium messages panel
  if (btnOpenMessages && !btnOpenMessages.__bcBound) {
    btnOpenMessages.__bcBound = true;
    btnOpenMessages.addEventListener("click", async () => {
      const membershipRole = String(normalizeMembershipRole(appState?.profile) || "").toLowerCase();
      if (membershipRole === "waiter") {
        await openWaiterMessages();
        return;
      }
      await openManagerMessengerWindow("messages_button");
    });
  }

  if (btnPremiumWineSetup && !btnPremiumWineSetup.__bcBound) {
    btnPremiumWineSetup.__bcBound = true;
    btnPremiumWineSetup.addEventListener("click", async () => {
      await openPremiumSetupScreen();
    });
  }

  if (btnTutorial && !btnTutorial.__bcBound) {
    btnTutorial.__bcBound = true;
    btnTutorial.addEventListener("click", () => {
      openTutorialMenu();
    });
  }

  if (btnPremiumSignupMenu && !btnPremiumSignupMenu.__bcBound) {
    btnPremiumSignupMenu.__bcBound = true;
    btnPremiumSignupMenu.addEventListener("click", () => {
      closePremiumTopbarMenu();
      window.__BC_RETURN_TO_DEMO_ON_EXIT_PREMIUM__ = appMode === "demo";
      routeAuth();
      setMode("signup");
      setAuthIntent("premium");
      setMsg("authMsg", "Premium selected. Sign up or log in below.", "success");
    });
  }

}

function setHomeAuthUI(isAuthed) {
  const badge = document.getElementById("homeAuthBadge");
  const logoutBtn = document.getElementById("btnHomeLogout");
  if (isAuthed) {
    badge?.classList.remove("hidden");
    logoutBtn?.classList.remove("hidden");
  } else {
    badge?.classList.add("hidden");
    logoutBtn?.classList.add("hidden");
  }

  try { renderAppChrome?.(); } catch {}
}

function hideAllLogoutButtons() {
  const ids = [
    "btnHomeLogout",
    "btnLogoutCreate",
    "btnLogoutPremium",
    "btnLogoutManagerBoard",
    "btnLogout",
    "btnDemoExit",
    "btnDemoPremium",
  ];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });
}

function hideDemoButtonsOnLogin() {
  const authFields = document.getElementById("authFields");
  if (!authFields) return;
  document.getElementById("btnDemoExit")?.classList.add("hidden");
  document.getElementById("btnDemoPremium")?.classList.add("hidden");
}

function applyAuthUi() {
  const authed = !!appState?.session;
  const isDemoScreen = appMode === "demo" && !document.getElementById("screenGameDemo")?.classList.contains("hidden");

  setHomeAuthUI(authed);

  const authFields = document.getElementById("authFields");
  authFields?.classList.toggle("hidden", authed || isDemoScreen);

  const homeExit = document.getElementById("btnHomeExitPremium");
  if (!authed) homeExit?.classList.add("hidden");

  [
    "btnHomeLogout",
    "btnLogoutCreate",
    "btnLogoutPremium",
    "btnLogoutManagerBoard"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("hidden", !authed);
    if (!authed) {
      el.disabled = false;
      el.style.pointerEvents = "";
      el.style.opacity = "";
    }
  });

  if (!authed) {
    document.querySelectorAll("[data-role]").forEach((el) => el.classList.add("hidden"));
  }
}

async function syncAuthUi() {
  try {
    applyAuthUi();
    const authed = !!appState.session;
    console.log("[UI] syncAuthUi", { authed });
  } catch (e) {
    console.warn("[UI] syncAuthUi failed", e);
  }
}

function hardResetAuthUI() {
  try { applyAuthUi(); } catch {}

  document.querySelectorAll("button").forEach((b) => {
    const t = (b.textContent || "").toLowerCase();
    const id = (b.id || "").toLowerCase();
    if (t.includes("logout") || t.includes("sign out") || id.includes("logout")) {
      b.classList.add("hidden");
      b.disabled = false;
      b.onclick = null;
    }
  });

  document.getElementById("authFields")?.classList.remove("hidden");
  document.getElementById("homeAuthBadge")?.classList.add("hidden");
}

// Premium entitlement check (Option 2)
// NOTE: restaurant_id must override everything. We will not use access_tier to block restaurant users.
function canAccessPremium(profile) {
  const role = String(profile?.role || "").toLowerCase();
  const restaurantId = profile?.restaurant_id ?? null;

  const isFirst50 = !!profile?.is_first50;
  const passExpiresAt = profile?.premium_pass_expires_at ? new Date(profile.premium_pass_expires_at) : null;
  const passOk = passExpiresAt && !isNaN(passExpiresAt.getTime()) && passExpiresAt.getTime() > Date.now();

  if (role !== "waiter" && !isManagerRole(role)) return { ok: false, reason: "invalid_role" };

  // ✅ HARD OVERRIDE: restaurant membership is premium
  if (restaurantId) return { ok: true, reason: "entitled.restaurant" };
  if (isFirst50) return { ok: true, reason: "entitled.first50" };
  if (passOk) return { ok: true, reason: "entitled.pass30" };
  return { ok: false, reason: "no_entitlement" };
}

// Home screen intent toggle
function setAuthIntent(next) {
  authIntent = next === "premium" ? "premium" : "login";

  const title = document.querySelector("#screenHome .title");
  const sub = document.querySelector("#screenHome .subtle");
  const premiumBtn = document.getElementById("btnHomePremium");
  const exitBtn = document.getElementById("btnHomeExitPremium");

  if (authIntent === "premium") {
    if (title) title.textContent = "Premium Login";
    if (sub) sub.textContent = "Login, then enter your Premium code (or contact us to purchase).";
    if (premiumBtn) premiumBtn.textContent = "Premium ✓";
    if (exitBtn) exitBtn.classList.remove("hidden");
  } else {
    if (title) title.textContent = "Join Game";
    if (sub)
      sub.textContent =
        "Use the parent login first, then enter Premium to configure the restaurant or join with your issued access.";
    if (premiumBtn) premiumBtn.textContent = "Premium";
    if (exitBtn) exitBtn.classList.add("hidden");
  }

  updateAuthSignupUI();
}

// ------------------------------------------------------------
// HUD
// ------------------------------------------------------------
function openHud() {
  setHudOpen(true);
  wireGroupSetupRedeem?.();
  wireManagerBoardBillingAccess?.();
  const profile = appState?.profile || {};
  const caps = getPremiumRoleCapabilities(profile);
  if (caps.canManageMultipleRestaurants) {
    loadGroupRestaurantsForPicker?.();
  }
  wireActiveRestaurantPicker?.();
  renderHud();
}
function closeHud() {
  setHudOpen(false);
}

function closePremiumTopbarMenu() {
  const trigger = document.getElementById("btnPremiumTopbarMenu");
  const panel = document.getElementById("premiumTopbarMenuPanel");
  if (trigger) trigger.setAttribute("aria-expanded", "false");
  if (panel) {
    panel.classList.add("hidden");
    panel.style.top = "";
    panel.style.right = "";
    panel.style.left = "";
    panel.style.bottom = "";
  }
}

function positionPremiumTopbarMenu(trigger, panel) {
  if (!trigger || !panel) return;

  const isCockpitMenu = !!trigger.closest(".app-chrome-premium-bar");
  if (isCockpitMenu) {
    panel.style.position = "absolute";
    panel.style.top = "calc(100% + 12px)";
    panel.style.right = "0";
    panel.style.left = "auto";
    panel.style.bottom = "auto";
    return;
  }

  panel.style.position = "fixed";

  const rect = trigger.getBoundingClientRect();
  const gutter = 16;
  const panelWidth = Math.min(280, Math.max(220, panel.offsetWidth || 220));
  const left = Math.max(gutter, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - gutter));
  const top = Math.min(rect.bottom + 12, window.innerHeight - gutter);

  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.style.right = "auto";
  panel.style.bottom = "auto";
}

function openPremiumTopbarMenu() {
  const trigger = document.getElementById("btnPremiumTopbarMenu");
  const panel = document.getElementById("premiumTopbarMenuPanel");
  if (trigger) trigger.setAttribute("aria-expanded", "true");
  if (panel) {
    panel.classList.remove("hidden");
    positionPremiumTopbarMenu(trigger, panel);
  }
}

function togglePremiumTopbarMenu() {
  const panel = document.getElementById("premiumTopbarMenuPanel");
  if (!panel) return;
  if (panel.classList.contains("hidden")) {
    openPremiumTopbarMenu();
  } else {
    closePremiumTopbarMenu();
  }
}

function wirePremiumTopbarMenu() {
  const trigger = document.getElementById("btnPremiumTopbarMenu");
  const panel = document.getElementById("premiumTopbarMenuPanel");
  const wrap = document.getElementById("premiumTopbarMenuWrap");
  if (!trigger || !panel || !wrap) return;

  if (!trigger.__bcBound) {
    trigger.__bcBound = true;
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      togglePremiumTopbarMenu();
    });
  }

  if (!panel.__bcBound) {
    panel.__bcBound = true;
    panel.addEventListener("click", (event) => {
      const actionBtn = event.target?.closest?.("button");
      if (!actionBtn || actionBtn.id === "btnPremiumTopbarMenu") return;
      if (actionBtn.id === "btnLogoutPremium") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        closePremiumTopbarMenu();
        console.log("[LOGOUT] premium menu action");
        triggerLogoutIntent(actionBtn, "ui:btnLogoutPremium.panel");
        return;
      }
      closePremiumTopbarMenu();
    });
  }

  if (!document.body.__bcPremiumTopbarMenuBound) {
    document.body.__bcPremiumTopbarMenuBound = true;
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!target) return;
      if (wrap.contains(target)) return;
      closePremiumTopbarMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closePremiumTopbarMenu();
    });
    window.addEventListener("resize", () => {
      const trigger = document.getElementById("btnPremiumTopbarMenu");
      const panel = document.getElementById("premiumTopbarMenuPanel");
      if (!panel || panel.classList.contains("hidden")) return;
      positionPremiumTopbarMenu(trigger, panel);
    }, { passive: true });
    window.addEventListener("scroll", () => {
      const trigger = document.getElementById("btnPremiumTopbarMenu");
      const panel = document.getElementById("premiumTopbarMenuPanel");
      if (!panel || panel.classList.contains("hidden")) return;
      positionPremiumTopbarMenu(trigger, panel);
    }, { passive: true });
  }
}

function renderWaiterThreadItem(row, selfUserId, nameMap) {
  const mine = String(row?.sender_user_id || "") === String(selfUserId || "");
  const who = userLabel(row?.sender_user_id, nameMap);
  const kind = String(row?.type || "message");
  const body = escapeHtml(String(row?.body || ""));
  const when = escapeHtml(String(row?.created_at || ""));

  let badge = "MSG";
  if (kind === "progress_report") badge = "REPORT";
  if (kind === "instruction") badge = "INSTRUCTION";
  if (kind === "drill_override") badge = "DRILL";
  if (kind === "drill_completed") badge = "DONE";
  if (kind === "drill_effectiveness") badge = "IMPACT";

  let payloadHtml = "";
  const showBody = kind !== "drill_override";
  const isWaiterView = String(appState?.profile?.role || "").toLowerCase() === "waiter";

  if (kind === "drill_override" && row?.payload?.drill) {
    const d = row.payload.drill || {};
    const pool = Array.isArray(d.pool) ? d.pool.join(", ") : "-";
    const focus = escapeHtml(String(d.focus || "-"));
    const reps = escapeHtml(String(d.repTarget ?? "-"));
    const duration = escapeHtml(String(d.durationSec ?? "-"));
    const tier = escapeHtml(String(d.tier ?? "-"));
    const reason = escapeHtml(String(row?.payload?.reason || ""));

    const launchBtn = isWaiterView ? `
        <button
          type="button"
          class="btn-ghost waiterStartAssignedDrill"
          data-drill-message-id="${escapeHtml(String(row.id || ""))}"
          style="margin-top:10px;"
        >
          Start Assigned Drill
        </button>
    ` : "";

    payloadHtml = `
      <div style="
        margin-top:8px;
        padding:10px;
        border:1px solid rgba(255,255,255,0.10);
        border-radius:10px;
        background:rgba(255,255,255,0.04);
      ">
        <div><strong>Assigned drill</strong></div>
        <div class="small-text" style="margin-top:6px; opacity:.9;">Focus: ${focus}</div>
        <div class="small-text" style="opacity:.9;">Pool: ${escapeHtml(pool)}</div>
        <div class="small-text" style="opacity:.9;">Reps: ${reps}</div>
        <div class="small-text" style="opacity:.9;">Duration: ${duration}s</div>
        <div class="small-text" style="opacity:.9;">Tier: ${tier}</div>
        ${reason ? `<div class="small-text" style="margin-top:8px; opacity:.75;">${reason}</div>` : ""}
        ${launchBtn}
      </div>
    `;
  } else if (kind === "drill_completed") {
    const p = row.payload || {};
    const focus = escapeHtml(String(p.focus || "-"));
    const repsDone = escapeHtml(String(p.repsDone ?? "-"));
    const repTarget = escapeHtml(String(p.repTarget ?? "-"));
    const durationSec = Number(p.durationSec ?? 0);
    const mins = durationSec ? Math.floor(durationSec / 60) : 0;
    const secs = durationSec ? durationSec % 60 : 0;
    const durationText = durationSec ? `${mins}m ${secs}s` : "-";

    payloadHtml = `
      <div style="
        margin-top:8px;
        padding:10px;
        border:1px solid rgba(255,255,255,0.10);
        border-radius:10px;
        background:rgba(255,255,255,0.04);
      ">
        <div><strong>Drill completed</strong></div>
        <div class="small-text" style="margin-top:6px; opacity:.9;">Focus: ${focus}</div>
        <div class="small-text" style="opacity:.9;">Reps: ${repsDone} / ${repTarget}</div>
        <div class="small-text" style="opacity:.9;">Time: ${escapeHtml(durationText)}</div>
      </div>
    `;
  } else if (kind === "drill_effectiveness") {
    const p = row.payload || {};
    const focus = escapeHtml(String(p.focus || "-"));
    const delta = Number(p.delta ?? 0);
    const skillKey = escapeHtml(String(p.skillKey || "-"));
    const deltaText = delta > 0 ? `+${delta}%` : `${delta}%`;

    payloadHtml = `
      <div style="
        margin-top:8px;
        padding:10px;
        border:1px solid rgba(255,255,255,0.10);
        border-radius:10px;
        background:rgba(255,255,255,0.04);
      ">
        <div><strong>Drill effectiveness</strong></div>
        <div class="small-text" style="margin-top:6px; opacity:.9;">Focus: ${focus}</div>
        <div class="small-text" style="opacity:.9;">Skill: ${skillKey}</div>
        <div class="small-text" style="opacity:.9;">Change: ${escapeHtml(deltaText)}</div>
        <div class="small-text" style="margin-top:8px; opacity:.75;">${escapeHtml(String(row.body || ""))}</div>
      </div>
    `;
  } else if (kind === "progress_report") {
    const p = getProgressReportPayload(row) || {};
    if (Object.keys(p).length) {
    const skills = p.skills || {};

    payloadHtml = `
<div style="
  margin-top:8px;
  padding:10px;
  border:1px solid rgba(255,255,255,0.10);
  border-radius:10px;
  background:rgba(255,255,255,0.04);
">

<div><strong>Progress snapshot</strong></div>

<div class="small-text" style="margin-top:6px;">
Encounter: ${escapeHtml(String(p.encounterNumber ?? "-"))}
</div>

<div class="small-text">
Guest: ${escapeHtml(String(p.guestStateActual ?? "-"))}
</div>

<div class="small-text">
Difficulty: ${escapeHtml(String(p.difficulty ?? "-"))}
</div>

<div class="small-text">
Signal: ${escapeHtml(String(p.chainSignal ?? "-"))}
</div>

<div class="small-text">
Score: ${escapeHtml(String(p.chainScore ?? "-"))}
</div>

<hr style="opacity:.2; margin:8px 0;">

<div><strong>Skill Tree</strong></div>

<div class="small-text">Guest Reading: ${skills.read ?? 0}%</div>
<div class="small-text">Framing: ${skills.framing ?? 0}%</div>
<div class="small-text">Delivery: ${skills.delivery ?? 0}%</div>
<div class="small-text">Recovery: ${skills.recovery ?? 0}%</div>
<div class="small-text">Closing: ${skills.closing ?? 0}%</div>

<div class="small-text" style="margin-top:8px; opacity:.75;">
Strongest: ${escapeHtml(String(p.strongestSkill ?? "-"))}
</div>

<div class="small-text" style="opacity:.75;">
Needs Work: ${escapeHtml(String(p.weakestSkill ?? "-"))}
</div>

</div>
`;
    }
  }

  return `
    <div style="
      align-self:${mine ? "flex-end" : "flex-start"};
      max-width:88%;
      background:${mine ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.10)"};
      border:1px solid rgba(255,255,255,0.10);
      border-radius:12px;
      padding:10px;
    ">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="badge">${badge}</span>
          <b>${escapeHtml(who)}</b>
        </div>
        <div class="small-text" style="opacity:.6;">${when}</div>
      </div>
      ${showBody ? `<div style="margin-top:8px; white-space:pre-wrap;">${body}</div>` : ""}
      ${payloadHtml}
    </div>
  `;
}

function getWaiterThreadTemplateKey(row = {}) {
  const type = String(row?.type || "").toLowerCase();

  if (!type) return `row:${String(row?.id || "")}`;

  if (type === "progress_report") return "template:progress_report";
  if (type === "instruction") return "template:instruction";
  if (type === "drill_override") return "template:drill_override";
  if (type === "drill_completed") return "template:drill_completed";
  if (type === "drill_effectiveness") return "template:drill_effectiveness";

  return `row:${String(row?.id || "")}`;
}

function buildWaiterThreadTemplateRows(rows = []) {
  const ordered = Array.isArray(rows) ? rows : [];
  const latestByTemplate = new Map();

  for (const row of ordered) {
    const key = getWaiterThreadTemplateKey(row);
    const existing = latestByTemplate.get(key);
    if (!existing) {
      latestByTemplate.set(key, row);
      continue;
    }

    const rowAt = new Date(row?.created_at || 0).getTime();
    const existingAt = new Date(existing?.created_at || 0).getTime();
    if (rowAt >= existingAt) {
      latestByTemplate.set(key, row);
    }
  }

  return Array.from(latestByTemplate.values()).sort(
    (a, b) => new Date(a?.created_at || 0) - new Date(b?.created_at || 0)
  );
}

async function loadWaiterMessagesThread() {
  const threadEl = document.getElementById("waiterMessagesThread");
  if (!threadEl) return;

  const restaurantId =
    window.getActiveRestaurantId?.() ||
    appState?.profile?.restaurant_id ||
    null;

  const selfUserId =
    appState?.session?.user?.id ||
    appState?.session?.userId ||
    null;

  if (!restaurantId || !selfUserId) {
    threadEl.innerHTML = `<div class="small-text" style="opacity:.8;">Messages not ready.</div>`;
    return;
  }

  threadEl.innerHTML = `<div class="small-text" style="opacity:.8;">Loading…</div>`;

  const { data, error } = await supabase
    .from("bc_messages_v1")
    .select("id, created_at, scope_type, scope_id, restaurant_id, sender_user_id, receiver_user_id, sender_role, type, body, payload, read_at")
    .eq("restaurant_id", restaurantId)
    .or(`sender_user_id.eq.${selfUserId},receiver_user_id.eq.${selfUserId}`)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[WAITER MSG] load failed", error);
    threadEl.innerHTML = `<div class="small-text" style="opacity:.8;">Failed to load messages.</div>`;
    return;
  }

  const rows = data || [];

  if (!rows.length) {
    threadEl.innerHTML = `<div class="small-text" style="opacity:.8;">No messages yet.</div>`;
    return;
  }

  const userIds = Array.from(
    new Set(rows.flatMap((r) => [r.sender_user_id, r.receiver_user_id]).filter(Boolean))
  );
  const nameMap = await mapUserIdsToNames(userIds);
  const templateRows = buildWaiterThreadTemplateRows(rows);

  threadEl.innerHTML = templateRows
    .map((row) => renderWaiterThreadItem(row, selfUserId, nameMap))
    .join("");
  threadEl.scrollTop = 0;
  wireWaiterThreadButtons();
}

function wireWaiterThreadButtons() {
  document.querySelectorAll(".waiterStartAssignedDrill").forEach((btn) => {
    if (btn.__wired) return;
    btn.__wired = true;

    btn.addEventListener("click", async () => {
      try {
        const msgId = String(btn.getAttribute("data-drill-message-id") || "");
        if (!msgId) return;

        const restaurantId =
          window.getActiveRestaurantId?.() ||
          appState?.profile?.restaurant_id ||
          null;

        const selfUserId =
          appState?.session?.user?.id ||
          appState?.session?.userId ||
          null;

        if (!restaurantId || !selfUserId) return;

        const { data, error } = await supabase
          .from("bc_messages_v1")
          .select("id, payload, type")
          .eq("id", msgId)
          .eq("restaurant_id", restaurantId)
          .or(`sender_user_id.eq.${selfUserId},receiver_user_id.eq.${selfUserId}`)
          .limit(1)
          .maybeSingle();

        if (error || !data || String(data.type) !== "drill_override") {
          console.warn("[WAITER] failed to load drill message", error || "not_found");
          return;
        }

        const drill = data?.payload?.drill || null;
        if (!drill) return;

        const frame = document.getElementById("premiumRootFrame");
        if (!frame || !frame.contentWindow) return;

        frame.contentWindow.postMessage(
          {
            source: "BC_MSG",
            v: 1,
            type: "launch_assigned_drill_request",
            assignedMessageId: msgId,
            drill,
          },
          window.location.origin
        );

        const status = document.getElementById("waiterSendProgressStatus");
        if (status) status.textContent = "Starting assigned drill…";
      } catch (e) {
        console.warn("[WAITER] start assigned drill failed", e);
      }
    });
  });
}

async function openWaiterMessages() {
  const panel = document.getElementById("waiterMessagesPanel");
  if (panel && !panel.classList.contains("hidden")) {
    closeWaiterMessages();
    return;
  }
  if (appState?.profile) {
    setActiveProgressionOwner({
      user_id: appState.profile.user_id || null,
      restaurant_id: appState.profile.restaurant_id || null,
    });
  }
  document.getElementById("waiterMessagesBackdrop")?.classList.add("hidden");
  panel?.classList.remove("hidden");
  document.getElementById("btnOpenMessages")?.setAttribute("aria-expanded", "true");
  const status = document.getElementById("waiterSendProgressStatus");
  if (status) status.textContent = "";
  syncWaiterMessengerComposerVisibility();
  try {
    await loadWaiterMessagesThread();
  } catch (e) {
    console.error("[WAITER MSG] open failed", e);
  }
}

function closeWaiterMessages() {
  document.getElementById("waiterMessagesBackdrop")?.classList.add("hidden");
  document.getElementById("waiterMessagesPanel")?.classList.add("hidden");
  document.getElementById("btnOpenMessages")?.setAttribute("aria-expanded", "false");
  const status = document.getElementById("waiterSendProgressStatus");
  if (status) status.textContent = "";
}

function syncWaiterMessengerComposerVisibility() {
  const profile = appState?.profile || {};
  const membershipRole = normalizeMembershipRole(profile);
  const roleAliases = roleAliasesForMatching(profile);
  const isManagerLikeRole = roleAliases.some((role) =>
    ["manager", "single_manager", "group_manager", "enterprise_admin", "enterpriser"].includes(role)
  );
  const isWaiter = membershipRole === "waiter" && !isManagerLikeRole;
  const sendBtn = document.getElementById("btnWaiterSendProgress");
  const status = document.getElementById("waiterSendProgressStatus");
  const composerBlock = sendBtn?.parentElement || null;

  if (composerBlock) {
    composerBlock.classList.toggle("hidden", !isWaiter);
    composerBlock.style.display = isWaiter ? "" : "none";
  }

  if (!isWaiter && status) status.textContent = "";
}

function wireWaiterMessagesPanel() {
  const closeBtn = document.getElementById("btnCloseMessages");
  const backdrop = document.getElementById("waiterMessagesBackdrop");
  const sendBtn = document.getElementById("btnWaiterSendProgress");
  const openBtn = document.getElementById("btnOpenMessages");
  const panel = document.getElementById("waiterMessagesPanel");

  if (closeBtn && !closeBtn.__bcBound) {
    closeBtn.__bcBound = true;
    closeBtn.addEventListener("click", closeWaiterMessages);
  }

  if (backdrop && !backdrop.__bcBound) {
    backdrop.__bcBound = true;
    backdrop.addEventListener("click", closeWaiterMessages);
  }

  if (document.body && !document.body.__bcWaiterInboxBound) {
    document.body.__bcWaiterInboxBound = true;
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!target) return;
      const inbox = document.getElementById("waiterMessagesPanel");
      if (!inbox || inbox.classList.contains("hidden")) return;
      const trigger = document.getElementById("btnOpenMessages");
      if (inbox.contains(target) || trigger?.contains(target)) return;
      closeWaiterMessages();
    });
  }

  if (openBtn) openBtn.setAttribute("aria-expanded", panel?.classList.contains("hidden") ? "false" : "true");

  if (sendBtn && !sendBtn.__bcBound) {
    sendBtn.__bcBound = true;
    sendBtn.addEventListener("click", async () => {
      const frame = document.getElementById("premiumRootFrame");
      const status = document.getElementById("waiterSendProgressStatus");

      if (!frame || !frame.contentWindow) {
        if (status) status.textContent = "Game not ready.";
        return;
      }

      frame.contentWindow.postMessage(
        {
          source: "BC_MSG",
          v: 1,
          type: "waiter_messenger_send",
        },
        window.location.origin
      );

      if (status) status.textContent = "Sending progress…";
    });
  }
}

function describeProgressSendError(errorCode = "") {
  const code = String(errorCode || "").toLowerCase();
  if (code === "encounter_not_resolved") return "Finish the encounter first, then send progress.";
  if (code === "no_current_encounter") return "No active encounter to send yet.";
  if (code === "already_sent_for_encounter") return "Progress was already sent for this encounter.";
  if (code === "waiter_messenger_only") return "Use the waiter messenger to send progress.";
  if (code === "manager_auto_only") return "This progress send is manager-controlled.";
  if (!code) return "Could not send progress.";
  return `Could not send progress: ${code}`;
}

window.addEventListener("message", (event) => {
  const msg = event?.data;
  if (!msg || msg.source !== "BC_MSG" || msg.v !== 1) return;
  if (event.origin !== window.location.origin) return;

  // Intentionally handled in the async BC_MSG pipeline; no-op here to keep console quiet.
  if (msg.type === "drill_pick" || msg.type === "messages_unread_request") {
    return;
  }

  if (msg.type === "progress_report_submit_result") {
    const status = document.getElementById("waiterSendProgressStatus");
    const hudStatus = document.getElementById("hudSendProgressStatus");

    const text = msg.ok
      ? (msg.snapshotOk === false
          ? `Sent, but snapshot failed${msg.snapshotError ? `: ${msg.snapshotError}` : "."}`
          : `Progress updated${msg.inserted ? ` (${msg.inserted})` : ""} ✅`)
      : describeProgressSendError(msg.error || "unknown_error");

  if (status) status.textContent = text;
  if (hudStatus) hudStatus.textContent = text;
    renderProfileSkillDashboard();

    if (msg.ok) {
      loadHudSkillTimeline().catch(console.error);
      loadWaiterMessagesThread().catch(console.error);
      refreshParentProgressionFromDb().catch(console.error);
    }
  }

});

function wireHudSendProgressButton() {
  const btn = document.getElementById("btnHudSendProgress");
  if (btn) btn.remove();
}

function setHudOpen(isOpen) {
  const hud = document.getElementById("hudPanel");
  const back = document.getElementById("hudBackdrop");
  const frame = document.getElementById("premiumRootFrame");
  const root = document.getElementById("premiumRoot");

  if (hud) hud.classList.toggle("hidden", !isOpen);
  if (back) back.classList.toggle("hidden", !isOpen);

  if (frame) frame.style.pointerEvents = isOpen ? "none" : "auto";
  if (root) root.style.pointerEvents = isOpen ? "none" : "auto";
}

function setProfileOpen(isOpen) {
  const panel = document.getElementById("screenProfile");
  const frame = document.getElementById("premiumRootFrame");
  const root = document.getElementById("premiumRoot");

  if (panel) panel.classList.toggle("hidden", !isOpen);
  if (frame) frame.style.pointerEvents = isOpen ? "none" : "auto";
  if (root) root.style.pointerEvents = isOpen ? "none" : "auto";
}

function setWaiterLeaderboardOpen(isOpen) {
  const panel = document.getElementById("screenWaiterLeaderboard");
  const frame = document.getElementById("premiumRootFrame");
  const root = document.getElementById("premiumRoot");

  if (panel) panel.classList.toggle("hidden", !isOpen);
  if (frame) frame.style.pointerEvents = isOpen ? "none" : "auto";
  if (root) root.style.pointerEvents = isOpen ? "none" : "auto";
}

function openProfilePanel() {
  closeHud?.();
  clearQueuedDrillStart();
  setProfileOpen(true);
  renderAppChrome?.();
}

function closeProfilePanel() {
  setProfileOpen(false);
  renderAppChrome?.();
}

function closeWaiterLeaderboardWindow() {
  setWaiterLeaderboardOpen(false);
  renderAppChrome?.();
}

function renderWaiterPerformanceLeaderboardTable(users = []) {
  const tbody = document.getElementById("waiterLeaderboardRows");
  if (!tbody) return;

  tbody.innerHTML = users.map((user) => `
    <tr class="waiter-user-row" data-user-id="${escapeHtml(user.userId)}">
      <td data-label="Rank">${user.rank}</td>
      <td data-label="Team Member">
        <button
          type="button"
          class="waiter-user-expand-btn"
          data-user-id="${escapeHtml(user.userId)}"
          aria-expanded="false"
        >
          <span class="waiter-chevron">▶</span>
          <span class="waiter-leaderboard-avatar">${escapeHtml((user.displayName || "?").slice(0, 2).toUpperCase())}</span>
          <span style="display:flex; flex-direction:column; gap:4px; align-items:flex-start;">
            <span>${escapeHtml(user.displayName || "Unknown")}</span>
            <span class="waiter-leaderboard-role-pill">${escapeHtml(getDisplayRoleLabel(user.role || "waiter"))}</span>
          </span>
        </button>
      </td>
      <td data-label="Total Points">${formatMetricNumber(user.totalPoints, 1)}</td>
      <td data-label="Drill Pass %">${formatPercent(user.drillPassRate)}</td>
      <td data-label="Encounter Pass %">${formatPercent(user.encounterPassRate)}</td>
      <td data-label="Challenge Success %">${formatPercent(user.challengeSuccessRate)}</td>
      <td data-label="Premium Success %">${formatPercent(user.premiumSuccessRate)}</td>
      <td data-label="Mastery %">${formatPercent(user.masteryRate)}</td>
      <td data-label="Last Active">${formatRelativeTime(user.lastActiveAt)}</td>
    </tr>
    <tr class="waiter-user-detail-row hidden" data-user-detail-id="${escapeHtml(user.userId)}">
      ${renderWaiterPerformanceUserDetailMarkup(user)}
    </tr>
  `).join("");
}

function renderWaiterPerformanceUserDetailMarkup(user = {}) {
  return `
    <td colspan="9">
      <div class="waiter-user-detail-panel">
        <div class="waiter-user-detail-left">
          <div class="waiter-user-detail-chart-card">
            <div class="small-text" style="margin-bottom:8px;">Current Skill Shape</div>
            <canvas id="wlUserSkillPie_${escapeHtml(user.userId)}" class="mb-user-skill-pie" width="240" height="240"></canvas>
            <div id="wlUserSkillLegend_${escapeHtml(user.userId)}" style="margin-top:12px;"></div>
          </div>
        </div>
        <div class="waiter-user-detail-right">
          <div class="waiter-user-metric-grid">
            <div class="mb-user-metric-card"><div class="small-text">Total Points</div><strong>${formatMetricNumber(user.totalPoints, 1)}</strong></div>
            <div class="mb-user-metric-card"><div class="small-text">Eligibility Tier</div><strong>T${user.eligibilityTier || 1}</strong></div>
            <div class="mb-user-metric-card"><div class="small-text">Readiness</div><strong>${formatPercent(user.readiness)}</strong></div>
            <div class="mb-user-metric-card"><div class="small-text">Drill Pass</div><strong>${formatPercent(user.drillPassRate)}</strong></div>
            <div class="mb-user-metric-card"><div class="small-text">Encounter Pass</div><strong>${formatPercent(user.encounterPassRate)}</strong></div>
            <div class="mb-user-metric-card"><div class="small-text">Challenge Success</div><strong>${formatPercent(user.challengeSuccessRate)}</strong></div>
            <div class="mb-user-metric-card"><div class="small-text">Premium Success</div><strong>${formatPercent(user.premiumSuccessRate)}</strong></div>
            <div class="mb-user-metric-card"><div class="small-text">Mastery</div><strong>${formatPercent(user.masteryRate)}</strong></div>
            <div class="mb-user-metric-card"><div class="small-text">Last Active</div><strong>${escapeHtml(formatRelativeTime(user.lastActiveAt))}</strong></div>
          </div>
          <div class="waiter-user-badge-row" style="margin-top:12px;">
            <span class="mb-badge">Strongest: ${escapeHtml(user.strongestSkill || "—")}</span>
            <span class="mb-badge">Weakest: ${escapeHtml(user.weakestSkill || "—")}</span>
            <span class="mb-badge">${escapeHtml(Number(user.challengeReadiness || 0) >= 0.7 ? "Challenge Ready" : "Needs Build-Up")}</span>
            <span class="mb-badge">Readiness: ${escapeHtml(describeReadiness(user.readiness, user.readinessLabel))}</span>
          </div>
        </div>
      </div>
    </td>
  `;
}

async function buildLeaderboardUserDetail(userId, restaurantId, fallbackUser = {}) {
  const uid = String(userId || "").trim();
  const rid = String(restaurantId || "").trim();
  if (!uid) return { ...fallbackUser };

  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const progressionQuery = supabase
    .from("bc_progression_state_v1")
    .select("canonical_state, updated_at")
    .eq("user_id", uid)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const snapshotsQuery = supabase
    .from("bc_skill_snapshots_v1")
    .select("created_at, read_pct, framing_pct, delivery_pct, recovery_pct, closing_pct")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(20);
  const readinessQuery = supabase
    .from("bc_readiness_v1")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  const encountersQuery = supabase
    .from("bc_encounter_resolutions_v2")
    .select("occurred_at, performance_grade, chain_signal, is_green, tier")
    .eq("user_id", uid)
    .neq("mode", "demo")
    .gte("occurred_at", sinceIso)
    .order("occurred_at", { ascending: false })
    .limit(200);
  const messagesQuery = supabase
    .from("bc_messages_v1")
    .select("created_at, type, payload")
    .eq("sender_user_id", uid)
    .in("type", ["drill_completed", "timed_challenge_completed", "timed_challenge_expired"])
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (rid) {
    progressionQuery.eq("restaurant_id", rid);
    snapshotsQuery.eq("restaurant_id", rid);
    readinessQuery.eq("restaurant_id", rid);
    encountersQuery.eq("restaurant_id", rid);
    messagesQuery.eq("restaurant_id", rid);
  }
  const [progressionRes, snapshotsRes, readinessRes, encountersRes, messagesRes, profileRes] = await Promise.all([
    progressionQuery,
    snapshotsQuery,
    readinessQuery,
    encountersQuery,
    messagesQuery,
    supabase
      .from("profiles")
      .select("user_id, display_name, role")
      .eq("user_id", uid)
      .maybeSingle(),
  ]);

  const progressionRow = progressionRes?.data || {};
  const snapshotRows = Array.isArray(snapshotsRes?.data) ? snapshotsRes.data : [];
  const readinessRow = readinessRes?.data || {};
  const encounterRows = Array.isArray(encountersRes?.data) ? encountersRes.data : [];
  const messageRows = Array.isArray(messagesRes?.data) ? messagesRes.data : [];
  const profile = profileRes?.data || {};
  const normalizedRole = String(normalizeMembershipRole(profile) || fallbackUser?.role || "").toLowerCase();
  const isManagerLike =
    normalizedRole === "single_manager" ||
    normalizedRole === "group_manager" ||
    normalizedRole === "enterpriser";
  const fetchedSkillShape = averageSkillShape(snapshotRows);
  const fallbackSkillShape = (fallbackUser?.skillShape && typeof fallbackUser.skillShape === "object")
    ? fallbackUser.skillShape
    : {};
  const fetchedSkillTotal = MANAGER_PERFORMANCE_SKILLS.reduce(
    (sum, skill) => sum + Number(fetchedSkillShape?.[skill.key] || 0),
    0
  );
  const fallbackSkillTotal = MANAGER_PERFORMANCE_SKILLS.reduce(
    (sum, skill) => sum + Number(fallbackSkillShape?.[skill.key] || 0),
    0
  );
  const derivedSkillShape = deriveLeaderboardSkillShape(fallbackUser);
  const derivedSkillTotal = MANAGER_PERFORMANCE_SKILLS.reduce(
    (sum, skill) => sum + Number(derivedSkillShape?.[skill.key] || 0),
    0
  );
  let crossRestaurantSkillShape = {};
  let crossRestaurantSkillTotal = 0;

  if (isManagerLike && fetchedSkillTotal <= 0 && fallbackSkillTotal <= 0 && derivedSkillTotal <= 0) {
    try {
      const crossSnapshotsRes = await supabase
        .from("bc_skill_snapshots_v1")
        .select("created_at, read_pct, framing_pct, delivery_pct, recovery_pct, closing_pct")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(20);
      const crossSnapshotRows = Array.isArray(crossSnapshotsRes?.data) ? crossSnapshotsRes.data : [];
      crossRestaurantSkillShape = averageSkillShape(crossSnapshotRows);
      crossRestaurantSkillTotal = MANAGER_PERFORMANCE_SKILLS.reduce(
        (sum, skill) => sum + Number(crossRestaurantSkillShape?.[skill.key] || 0),
        0
      );
    } catch (error) {
      console.warn("[LEADERBOARD] cross-restaurant skill fallback failed", { userId: uid, error });
    }
  }

  const skillShape = fallbackSkillTotal > 0
    ? fallbackSkillShape
    : fetchedSkillTotal > 0
      ? fetchedSkillShape
      : crossRestaurantSkillTotal > 0
        ? crossRestaurantSkillShape
      : derivedSkillTotal > 0
        ? derivedSkillShape
        : fallbackSkillShape;
  const canonicalState = progressionRow?.canonical_state && typeof progressionRow.canonical_state === "object"
    ? progressionRow.canonical_state
    : {};
  const canonicalEconomy = canonicalState?.economy && typeof canonicalState.economy === "object"
    ? canonicalState.economy
    : {};
  const canonicalAuthority = canonicalState?.authority && typeof canonicalState.authority === "object"
    ? canonicalState.authority
    : {};
  const totalPoints = Math.max(0, Number(canonicalEconomy?.points || fallbackUser?.totalPoints || 0));
  const servedTier = Math.max(1, Math.min(3, Math.round(
    firstFinite(canonicalAuthority?.tierToServe, canonicalEconomy?.tier, fallbackUser?.servedTier, fallbackUser?.eligibilityTier, 1) || 1
  )));

  const drillRows = messageRows.filter((row) => String(row?.type || "") === "drill_completed");
  const drillPasses = drillRows.filter((row) => {
    const repsDone = Number(row?.payload?.repsDone || 0);
    const repTarget = Number(row?.payload?.repTarget || 0);
    return repTarget > 0 && repsDone >= repTarget;
  }).length;
  const challengeCompleted = messageRows.filter((row) => String(row?.type || "") === "timed_challenge_completed");
  const challengeExpired = messageRows.filter((row) => String(row?.type || "") === "timed_challenge_expired");
  const challengeRows = challengeCompleted.length + challengeExpired.length;
  const encounterPasses = encounterRows.filter((row) => {
    const grade = String(row?.performance_grade || "").toUpperCase();
    return grade === "A" || grade === "B" || String(row?.chain_signal || "").toLowerCase() === "green" || !!row?.is_green;
  }).length;
  const encounterMastery = encounterRows.filter((row) => String(row?.performance_grade || "").toUpperCase() === "A").length;
  const premiumSuccesses = challengeCompleted.filter((row) => !!row?.payload?.premiumSuccess).length;

  const drillPassRate = drillRows.length ? drillPasses / drillRows.length : Number(fallbackUser?.drillPassRate || 0);
  const encounterPassRate = encounterRows.length ? encounterPasses / encounterRows.length : Number(fallbackUser?.encounterPassRate || 0);
  const challengeSuccessRate = challengeRows ? challengeCompleted.length / challengeRows : Number(fallbackUser?.challengeSuccessRate || 0);
  const premiumSuccessRate = challengeCompleted.length ? premiumSuccesses / challengeCompleted.length : Number(fallbackUser?.premiumSuccessRate || 0);
  const masteryRate = encounterRows.length ? encounterMastery / encounterRows.length : Number(fallbackUser?.masteryRate || 0);
  const readinessBase = firstFinite(readinessRow?.readiness_score, readinessRow?.readiness_pct);
  const readiness = Math.max(0, Math.min(1, firstFinite(
    readinessBase != null ? (readinessBase > 1 ? readinessBase / 100 : readinessBase) : null,
    fallbackUser?.readiness,
    masteryRate,
    totalPoints >= 10 ? 0.8 : totalPoints >= 5 ? 0.62 : 0.4
  ) || 0));
  const readinessLabel = firstNonEmpty(readinessRow?.readiness, fallbackUser?.readinessLabel, readiness >= 0.8 ? "STABLE" : readiness >= 0.62 ? "GROWING" : "FRAGILE");
  const challengeReadiness = Math.max(
    0,
    Math.min(1, (readiness * 0.45) + (encounterPassRate * 0.35) + (challengeSuccessRate * 0.20))
  );
  const extremes = getSkillExtremes(skillShape);

  return {
    ...fallbackUser,
    userId: uid,
    displayName: String(profile?.display_name || fallbackUser?.displayName || uid).trim(),
    role: normalizeMembershipRole(profile) || fallbackUser?.role || "waiter",
    totalPoints,
    drillPassRate,
    encounterPassRate,
    challengeSuccessRate,
    premiumSuccessRate,
    masteryRate,
    lastActiveAt: latestTimestamp(progressionRow?.updated_at, encounterRows[0]?.occurred_at, messageRows[0]?.created_at, fallbackUser?.lastActiveAt),
    eligibilityTier: servedTier,
    readiness,
    readinessLabel,
    servedTier,
    challengeReadiness,
    strongestSkill:
      fallbackSkillTotal > fetchedSkillTotal
        ? (fallbackUser?.strongestSkill || extremes.strongestSkill)
        : derivedSkillTotal > fetchedSkillTotal && fetchedSkillTotal === 0
          ? extremes.strongestSkill
          : extremes.strongestSkill,
    weakestSkill:
      fallbackSkillTotal > fetchedSkillTotal
        ? (fallbackUser?.weakestSkill || extremes.weakestSkill)
        : derivedSkillTotal > fetchedSkillTotal && fetchedSkillTotal === 0
          ? extremes.weakestSkill
          : extremes.weakestSkill,
    skillShape,
  };
}

function wireWaiterPerformanceRowExpansion(usersById = {}) {
  document.querySelectorAll(".waiter-user-expand-btn").forEach((button) => {
    if (button.__wired) return;
    button.__wired = true;
    button.addEventListener("click", async () => {
      await toggleWaiterPerformanceUserDetail(button.dataset.userId, usersById);
    });
  });
}

async function toggleWaiterPerformanceUserDetail(userId, usersById = {}) {
  const button = document.querySelector(`.waiter-user-expand-btn[data-user-id="${CSS.escape(String(userId || ""))}"]`);
  const row = document.querySelector(`.waiter-user-detail-row[data-user-detail-id="${CSS.escape(String(userId || ""))}"]`);
  if (!button || !row) return;

  const isOpen = !row.classList.contains("hidden");
  if (isOpen) {
    row.classList.add("hidden");
    button.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
    return;
  }

  closeAllWaiterPerformanceUserDetails(userId);
  row.classList.remove("hidden");
  button.classList.add("is-open");
  button.setAttribute("aria-expanded", "true");

  const restaurantId =
    appState?.restaurant?.id ||
    getManagerActiveRestaurantId?.() ||
    appState?.activeRestaurantId ||
    appState?.profile?.restaurant_id ||
    null;
  const detailUser = await buildLeaderboardUserDetail(userId, restaurantId, usersById?.[userId] || {});
  usersById[userId] = detailUser;
  row.innerHTML = renderWaiterPerformanceUserDetailMarkup(detailUser);

  const canvas = document.getElementById(`wlUserSkillPie_${userId}`);
  const legend = document.getElementById(`wlUserSkillLegend_${userId}`);
  if (canvas && detailUser && !canvas.__drawn) {
    drawUserSkillPieChart(canvas, detailUser.skillShape, {
      centerTop: `T${detailUser.eligibilityTier || 1}`,
      centerBottom: `${Math.round(Number(detailUser.readiness || 0) * 100)}%`,
    });
    canvas.__drawn = true;
  }
  if (legend) {
    renderUserSkillShapeLegend(legend, detailUser.skillShape, {
      strongestSkill: detailUser.strongestSkill,
      weakestSkill: detailUser.weakestSkill,
    });
  }
  row.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function closeAllWaiterPerformanceUserDetails(exceptUserId = null) {
  document.querySelectorAll(".waiter-user-detail-row").forEach((row) => {
    if (exceptUserId && row.dataset.userDetailId === exceptUserId) return;
    row.classList.add("hidden");
  });
  document.querySelectorAll(".waiter-user-expand-btn").forEach((button) => {
    if (exceptUserId && button.dataset.userId === exceptUserId) return;
    button.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
  });
}

function deriveLeaderboardSkillShape(user = {}) {
  const drill = Math.round(Math.max(0, Math.min(100, Number(user?.drillPassRate || 0) * 100)));
  const encounter = Math.round(Math.max(0, Math.min(100, Number(user?.encounterPassRate || 0) * 100)));
  const challenge = Math.round(Math.max(0, Math.min(100, Number(user?.challengeSuccessRate || 0) * 100)));
  const premium = Math.round(Math.max(0, Math.min(100, Number(user?.premiumSuccessRate || 0) * 100)));
  const mastery = Math.round(Math.max(0, Math.min(100, Number(user?.masteryRate || 0) * 100)));
  const readiness = Math.round(Math.max(0, Math.min(100, Number(user?.readiness || 0) * 100)));
  const totalPoints = Math.max(0, Number(user?.totalPoints || 0));
  const metricsTotal = drill + encounter + challenge + premium + mastery + readiness;

  if (metricsTotal <= 0) {
    const baseline = Math.max(
      28,
      Math.min(
        86,
        Math.round(
          readiness ||
          (totalPoints >= 100 ? 82 :
            totalPoints >= 50 ? 68 :
            totalPoints >= 20 ? 56 :
            totalPoints > 0 ? 44 : 34)
        )
      )
    );
    return {
      read: baseline,
      framing: Math.max(24, baseline - 4),
      delivery: Math.min(92, baseline + 6),
      recovery: Math.max(24, baseline - 2),
      closing: Math.max(24, baseline - 1),
    };
  }

  return {
    read: Math.max(readiness, encounter),
    framing: Math.max(drill, Math.round((drill + readiness) / 2)),
    delivery: Math.max(encounter, mastery),
    recovery: Math.max(challenge, Math.round((challenge + readiness) / 2)),
    closing: Math.max(premium, mastery),
  };
}

function mergeWaiterLeaderboardUsers(baseUsers = [], associatedManagers = []) {
  const merged = new Map();
  const isFallbackName = (displayName, userId) => {
    const name = String(displayName || "").trim();
    const id = String(userId || "").trim();
    return !name || name === id || (!!id && name === id.slice(0, 8));
  };

  (baseUsers || []).forEach((user) => {
    const userId = String(user?.userId || "");
    if (!userId) return;
    merged.set(userId, { ...user });
  });

  (associatedManagers || []).forEach((manager) => {
    const userId = String(manager?.userId || "");
    if (!userId) return;

    const existing = merged.get(userId) || null;
    if (existing) {
      merged.set(userId, {
        ...existing,
        displayName:
          isFallbackName(existing.displayName, userId) && !isFallbackName(manager.displayName, userId)
            ? manager.displayName
            : existing.displayName,
        role: manager.role || existing.role || "group_manager",
      });
      return;
    }

    merged.set(userId, {
      userId,
      displayName: manager.displayName || userId.slice(0, 8),
      role: manager.role || "group_manager",
      totalPoints: 0,
      drillPassRate: 0,
      encounterPassRate: 0,
      challengeSuccessRate: 0,
      premiumSuccessRate: 0,
      masteryRate: 0,
      lastActiveAt: "",
      rank: 0,
    });
  });

  return Array.from(merged.values())
    .sort((a, b) => {
      const pointDiff = Number(b?.totalPoints || 0) - Number(a?.totalPoints || 0);
      if (pointDiff) return pointDiff;
      return String(a?.displayName || "").localeCompare(String(b?.displayName || ""));
    })
    .map((user, index) => ({
      ...user,
      rank: index + 1,
    }));
}

async function loadRestaurantEnvironmentProfiles(restaurantId = null) {
  const rid = String(restaurantId || "").trim();
  if (!rid) return [];

  const roster = new Map();
  const addRow = (row) => {
    const userId = String(row?.user_id || "").trim();
    if (!userId) return;
    roster.set(userId, {
      userId,
      displayName: String(row?.display_name || row?.full_name || row?.name || "").trim(),
      role: normalizeMembershipRole(row) || String(row?.role || "").toLowerCase() || "waiter",
    });
  };

  try {
    const rpcRes = await withTimeout(
      supabase.rpc("bc_get_restaurant_environment_profiles_v1", {
        p_restaurant_id: rid,
      }),
      12000,
      "rpc.restaurant_environment_profiles"
    );
    if (!rpcRes?.error && Array.isArray(rpcRes.data) && rpcRes.data.length) {
      rpcRes.data.forEach(addRow);
      return Array.from(roster.values());
    }
  } catch (error) {
    console.warn("[LEADERBOARD] restaurant environment rpc failed", error);
  }

  try {
    const directProfilesRes = await withTimeout(
      supabase
        .from("profiles")
        .select("user_id, display_name, role, scope_id")
        .eq("restaurant_id", rid)
        .order("display_name", { ascending: true }),
      12000,
      "profiles.restaurant_environment.direct"
    );
    if (!directProfilesRes?.error) {
      (directProfilesRes.data || []).forEach(addRow);
    }
  } catch (error) {
    console.warn("[LEADERBOARD] restaurant environment direct profiles failed", error);
  }

  try {
    const scopeRowsRes = await withTimeout(
      supabase
        .from("bc_scope_restaurants")
        .select("scope_id")
        .eq("restaurant_id", rid)
        .limit(20),
      12000,
      "scope_restaurants.restaurant_environment"
    );

    const scopeIds = Array.from(new Set((scopeRowsRes?.data || []).map((row) => String(row?.scope_id || "").trim()).filter(Boolean)));
    if (scopeIds.length) {
      const scopedProfilesRes = await withTimeout(
        supabase
          .from("profiles")
          .select("user_id, display_name, role, scope_id")
          .in("scope_id", scopeIds)
          .order("display_name", { ascending: true }),
        12000,
        "profiles.restaurant_environment.scope"
      );
      if (!scopedProfilesRes?.error) {
        (scopedProfilesRes.data || []).forEach(addRow);
      }
    }
  } catch (error) {
    console.warn("[LEADERBOARD] restaurant environment scope profiles failed", error);
  }

  return Array.from(roster.values());
}

async function hydrateLeaderboardDisplayNames(users = []) {
  const fallbackIds = Array.from(new Set(
    (users || [])
      .map((user) => String(user?.userId || "").trim())
      .filter(Boolean)
  ));
  const messageNameMap = new Map();
  const rosterNameMap = new Map();

  try {
    const restaurantId =
      appState?.restaurant?.id ||
      getManagerActiveRestaurantId?.() ||
      appState?.activeRestaurantId ||
      appState?.profile?.restaurant_id ||
      null;

    const rosterRows = await loadRestaurantEnvironmentProfiles(restaurantId);
    (rosterRows || []).forEach((row) => {
      const userId = String(row?.userId || "").trim();
      const displayName = String(row?.displayName || "").trim();
      if (userId && displayName) rosterNameMap.set(userId, displayName);
    });

    if (restaurantId && fallbackIds.length) {
      const { data, error } = await supabase
        .from("bc_messages_v1")
        .select("sender_user_id, receiver_user_id, payload")
        .eq("restaurant_id", restaurantId)
        .or(fallbackIds.map((id) => `sender_user_id.eq.${id},receiver_user_id.eq.${id}`).join(","))
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(200);

      if (!error) {
        (data || []).forEach((row) => {
          const payload = row?.payload || {};
          const senderId = String(row?.sender_user_id || "");
          const receiverId = String(row?.receiver_user_id || "");
          const senderName = String(
            payload?.senderDisplayName ||
            payload?.sender_display_name ||
            payload?.managerDisplayName ||
            payload?.manager_display_name ||
            ""
          ).trim();
          const receiverName = String(
            payload?.receiverDisplayName ||
            payload?.receiver_display_name ||
            payload?.targetDisplayName ||
            payload?.target_display_name ||
            ""
          ).trim();
          if (senderId && senderName && !messageNameMap.has(senderId)) messageNameMap.set(senderId, senderName);
          if (receiverId && receiverName && !messageNameMap.has(receiverId)) messageNameMap.set(receiverId, receiverName);
        });
      }
    }
  } catch (error) {
    console.warn("[LEADERBOARD] message display name hydrate failed", error);
  }

  const out = [];

  for (const user of users || []) {
    const userId = String(user?.userId || "").trim();
    const displayName = String(user?.displayName || "").trim();
    const looksLikeFallback =
      !displayName ||
      displayName === userId ||
      (userId && displayName === userId.slice(0, 8));

    if (!userId || !looksLikeFallback) {
      out.push(user);
      continue;
    }

    try {
      const profile = await loadProfile(userId);
      const profileName = String(profile?.display_name || "").trim();
      out.push({
        ...user,
        displayName: profileName || rosterNameMap.get(userId) || messageNameMap.get(userId) || user.displayName || "Unknown",
      });
    } catch (error) {
      console.warn("[LEADERBOARD] row display name hydrate failed", { userId, error });
      out.push({
        ...user,
        displayName: rosterNameMap.get(userId) || messageNameMap.get(userId) || user.displayName || "Unknown",
      });
    }
  }

  return out;
}

async function renderWaiterPerformanceLeaderboardWindow() {
  const labelEl = document.getElementById("waiterLeaderboardRestaurantLabel");
  const managerContextEl = document.getElementById("waiterLeaderboardManagerContext");
  const msgEl = document.getElementById("waiterLeaderboardMsg");
  const tbody = document.getElementById("waiterLeaderboardRows");
  if (!labelEl || !managerContextEl || !msgEl || !tbody) return;

  const restaurantName =
    appState?.restaurant?.name ||
    getManagerActiveRestaurantId?.() ||
    appState?.activeRestaurantId ||
    "this restaurant";

  labelEl.textContent = `Live performance snapshot for ${restaurantName}.`;
  managerContextEl.textContent = "";
  msgEl.textContent = "Loading leaderboard…";
  tbody.innerHTML = "";

  try {
    const model = await getManagerPerformanceModel({ force: true });
    const associatedManagers = await loadAssociatedManagersForRestaurant(
      appState?.restaurant?.id ||
      getManagerActiveRestaurantId?.() ||
      appState?.activeRestaurantId ||
      null,
      appState?.profile?.scope_id || null
    );
    const managerMap = new Map();
    (model?.users || []).forEach((user) => {
      if (!["single_manager", "group_manager", "enterpriser"].includes(String(user?.role || "").toLowerCase())) return;
      managerMap.set(String(user.userId || ""), {
        userId: user.userId,
        displayName: user.displayName,
        role: user.role || "waiter",
      });
    });
    (associatedManagers || []).forEach((manager) => {
      if (!manager?.userId) return;
      managerMap.set(String(manager.userId), manager);
    });
    const managerUsers = Array.from(managerMap.values());
    const visibleUsers = await hydrateLeaderboardDisplayNames(
      mergeWaiterLeaderboardUsers(model?.users || [], associatedManagers || [])
    );
    const usersById = Object.fromEntries(visibleUsers.map((user) => [user.userId, user]));
    managerContextEl.textContent = managerUsers.length
      ? `Managers linked here: ${managerUsers.map((user) => `${user.displayName} (${getDisplayRoleLabel(user.role || "waiter")})`).join(", ")}`
      : "Managers linked here are not currently ranked in this leaderboard view.";
    renderWaiterPerformanceLeaderboardTable(visibleUsers);
    wireWaiterPerformanceRowExpansion(usersById);
    msgEl.textContent = visibleUsers.length
      ? ""
      : "No leaderboard data yet for this restaurant.";
  } catch (error) {
    console.error("[LEADERBOARD] load failed", error);
    msgEl.textContent = error?.message || "Failed to load leaderboard.";
  }
}

async function openWaiterLeaderboardWindow() {
  closeHud?.();
  closeProfilePanel?.();
  clearQueuedDrillStart();
  setWaiterLeaderboardOpen(true);
  renderAppChrome?.();
  await renderWaiterPerformanceLeaderboardWindow();
}

async function openManagerMessengerWindow(reason = "messages_button") {
  clearMsgs();
  closeHud?.();
  closeProfilePanel?.();

  await loadAuthedState(`openManagerMessengerWindow:${reason}`);

  const caps = getPremiumRoleCapabilities(appState.profile);
  if (!caps.canAccessManagerBoard) {
    setMsg("authMsg", "Manager Board is manager-only.", "error");
    showScreen("screenPremiumApp");
    return;
  }

  const fallbackRestaurantId =
    window.__BC_ACTIVE_MANAGER_RESTAURANT_ID__ ||
    appState?.restaurant?.id ||
    appState?.profile?.restaurant_id ||
    appState?.profile?.restaurantId ||
    null;

  if (fallbackRestaurantId) {
    setManagerActiveRestaurantId(fallbackRestaurantId);
  }

  try {
    if (fallbackRestaurantId) {
      const restaurant = await loadRestaurant(fallbackRestaurantId);
      if (restaurant) appState.restaurant = restaurant;
    }
  } catch (error) {
    console.warn("[MESSAGES] loadRestaurant failed", error);
  }

  showScreen("screenManagerMessenger");
  wireManagerBoardMessenger?.();

  const rid = getManagerActiveRestaurantId() || fallbackRestaurantId || "";
  await loadManagerMessenger(rid, { force: true });
}

function closeManagerMessengerWindow() {
  showScreen("screenPremiumApp");
  renderHud?.();
}

window.__BC_HUD_TIMELINE_TARGET_USER_ID__ = window.__BC_HUD_TIMELINE_TARGET_USER_ID__ || null;

function getHudActorContext() {
  const sessionUserId =
    appState?.session?.user?.id ||
    appState?.session?.userId ||
    null;
  const activeRestaurantId =
    getManagerActiveRestaurantId?.() ||
    appState?.restaurant?.id ||
    appState?.activeRestaurantId ||
    appState?.profile?.restaurant_id ||
    appState?.profile?.restaurantId ||
    null;

  return {
    userId: sessionUserId || null,
    restaurantId: activeRestaurantId || null,
  };
}

function getHudTimelineTargetUserId() {
  const ctx = getHudActorContext();
  return window.__BC_HUD_TIMELINE_TARGET_USER_ID__ || ctx.userId || null;
}

function isPremiumPlayVisible() {
  const play = document.getElementById("screenPlay");
  const prem = document.getElementById("screenPremiumApp");
  const playVisible = play && !play.classList.contains("hidden");
  const premVisible = prem && !prem.classList.contains("hidden");
  return !!(playVisible || premVisible);
}

function unmountDemoGame(reason = "") {
  if (isPremiumPlayVisible()) {
    console.warn("[BC] unmount blocked (play active)", reason);
    return;
  }

  console.log("[BC] demo game unmounted ✅", reason);
  try { document.getElementById("gameRootDemoFrame")?.remove(); } catch {}
  const root = document.getElementById("gameRootDemo");
  if (root) root.innerHTML = "";
  try { currentIframeMode = null; } catch {}
}

function destroyDemoIframe(reason = "") {
  const reasonText = String(reason || "");
  if (
    isV2DemoPlayActive() &&
    (
      reasonText.includes("routeDemo") ||
      reasonText.includes("openPremiumBeginScreen")
    )
  ) {
    console.warn("[BC] destroyDemoIframe suppressed during active V2 demo play", reason);
    setDebug({
      step: "demo.destroy_suppressed",
      reason,
      time: new Date().toISOString(),
      lastScreen: window.__BC_DEMO_IFRAME_LAST_SCREEN__ || null,
    });
    return;
  }
  console.log("[BC] destroyDemoIframe", reason);
  try { document.getElementById("gameRootDemoFrame")?.remove(); } catch {}
  const root = document.getElementById("gameRootDemo");
  if (root) root.innerHTML = "";
  window.__BC_DEMO_IFRAME_LAST_SCREEN__ = null;
  try { currentIframeMode = null; } catch {}
}

function destroyPremiumIframe(reason = "") {
  console.log("[BC] destroyPremiumIframe", reason);
  const root = document.getElementById("premiumRoot");
  const frame = document.getElementById("premiumRootFrame");
  if (root) root.innerHTML = "";
  if (!root && frame) {
    try { frame.src = "about:blank"; } catch {}
  }
  window.__BC_PENDING_START_DRILL__ = null;
  window.BC_PENDING_START_DRILL = null;
  // invalidate any remaining messages from removed iframe window
  window.__BC_IFRAME_EPOCH__ = Date.now();
  window.__BC_SOURCE_CTX_MAP__ = new WeakMap();
}

function destroyAllIframes(reason = "destroyAllIframes") {
  try {
    document.querySelectorAll("iframe").forEach((f) => {
      try { f.src = "about:blank"; } catch {}
      try { f.remove(); } catch {}
    });
  } catch {}
  console.log("[BC] destroyAllIframes ✅", reason);
}

async function startPremiumDrillFromParent(repTarget = 3) {
  const iframe =
    document.querySelector('iframe[title="BottleCaller Game"]') ||
    document.querySelector('iframe[id$="Frame"]');

  const win = iframe?.contentWindow;

  if (!win) {
    console.warn("[PARENT] Drill blocked: iframe not ready");
    return;
  }

  const drill = window.__BC_DRILL_CONFIG__ || window.BC_DRILL_CONFIG || null;
  win.postMessage(
    {
      source: "BC_MSG",
      v: 1,
      type: "start_drill",
      repTarget: drill?.repTarget ?? repTarget,
      focus: drill?.focus ?? null,
      pool: drill?.pool ?? null,
      durationSec: drill?.durationSec ?? 300,
      tier: drill?.tier ?? 0,
      drill,
      starter: "manager"
    },
    window.location.origin
  );

  console.log("[PARENT] start_drill sent ✅", { repTarget: drill?.repTarget ?? repTarget });
}

function wireManagerBoardButton() {
  const btn = document.getElementById("btnManagerBoard");
  if (!btn) {
    console.warn("[BC] btnManagerBoard not found");
    return;
  }
  if (btn.__bcBound) return;
  btn.__bcBound = true;

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await routeManagerBoard("nav");
    } catch (err) {
      console.error("[BC] routeManagerBoard failed", err);
    }
  });

  console.log("[BC] btnManagerBoard wired ✅");
}

// ------------------------------------------------------------
// GAME LOADING (iframe) — no sticky stacking, no unwanted resets
// ------------------------------------------------------------
let currentIframeMode = null; // "demo" | "premium"
let currentIframeVersion = Date.now(); // stable per mode-session
// one ctx per iframe window; WeakMap prevents memory leaks
window.__BC_SOURCE_CTX_MAP__ = window.__BC_SOURCE_CTX_MAP__ || new WeakMap();
// current “active iframe generation”
window.__BC_IFRAME_EPOCH__ = window.__BC_IFRAME_EPOCH__ || 0;
window.__BC_LOGOUT_LOCK__ = window.__BC_LOGOUT_LOCK__ || 0;

function clearGameMounts() {
  const demoMount = document.getElementById("gameRootDemo");
  const premMount = document.getElementById("premiumRoot");
  const premFrame = document.getElementById("premiumRootFrame");
  if (demoMount) demoMount.innerHTML = "";
  if (premMount) premMount.innerHTML = "";
  if (!premMount && premFrame) {
    try { premFrame.src = "about:blank"; } catch {}
  }
}

function forceRemountForModeSwitch(nextMode) {
  // Ensure switching Demo↔Premium fully destroys/recreates iframe
  currentIframeMode = null;
  currentIframeVersion = Date.now();
  clearGameMounts();
  setDebug({ step: "game.iframe.forceRemount", nextMode, v: currentIframeVersion, time: new Date().toISOString() });
}

function isV2DemoPlayActive() {
  if (!document.getElementById("gameRootDemoFrame")) return false;
  return (
    window.__BC_DEMO_IFRAME_LAST_SCREEN__ === "screenPlay" ||
    Date.now() - Number(window.__BC_DEMO_PLAY_STARTED_AT__ || 0) < 30000
  );
}

function isDemoPlayStartRecent(ms = 60000) {
  return Date.now() - Number(window.__BC_DEMO_PLAY_STARTED_AT__ || 0) < ms;
}

function isMobileDemoSurfaceActive() {
  return (
    document.documentElement?.dataset?.bcMobileEnv === "true" &&
    (
      appMode === "demo" ||
      !document.getElementById("screenGameDemo")?.classList.contains("hidden") ||
      !!document.getElementById("gameRootDemoFrame")
    )
  );
}

function buildGameIframeUrl({
  mode = "premium",
  showBack = false,
  backTo = "screenPremiumApp",
  initialScreen = null,
  urlOverride = null,
  epoch = Date.now(),
  bustCache = false,
  v2Harness = false,
} = {}) {
  // If you pass a full override URL, use it as the base.
  // Otherwise build from same-origin /game/game.html
  const base = urlOverride
    ? new URL(urlOverride, window.location.href)
    : new URL("/game/game.html", window.location.origin);

  // prevent cross-origin overrides (bridge is same-origin)
  if (base.origin !== window.location.origin) {
    throw new Error("buildGameIframeUrl: urlOverride must be same-origin");
  }

  // Normalize + set params
  base.searchParams.set("mode", String(mode || "premium").toLowerCase());
  base.searchParams.set("showBack", showBack ? "1" : "0");
  base.searchParams.set("backTo", String(backTo || "screenPremiumApp"));
  if (initialScreen) base.searchParams.set("initialScreen", String(initialScreen));
  else base.searchParams.delete("initialScreen");
  if (v2Harness) base.searchParams.set("bcV2", "1");
  else base.searchParams.delete("bcV2");

  // Keep epoch off the URL so iframe assets can stay browser-cacheable.
  // The runtime already gets the active epoch from frameElement.dataset.bcEpoch,
  // parent state, and bc_ctx postMessage.
  void epoch;

  // cache-buster (only when desired)
  if (bustCache) base.searchParams.set("v", String(Date.now()));

  return base.toString();
}

function mountGameIframe(targetId, mode /* "demo" | "premium" */, options = {}) {
  if (isLoggingOut()) {
    console.warn("[BC] mountGameIframe blocked (logging out)", { targetId, mode });
    return;
  }

  // Invariant: no session => never mount premium.
  if (mode === "premium" && !appState?.session) {
    console.warn("[BC] mountGameIframe blocked: premium requested without session", { targetId, mode });
    return;
  }

  const mount = document.getElementById(targetId);
  if (!mount) return;

  // ✅ Prevent unwanted resets: if same mode already mounted in this target, do nothing
  const existing = mount.querySelector("iframe");
  if (existing && currentIframeMode === mode) return;

  currentIframeMode = mode;
  if (mode === "premium") {
    window.__BC_IFRAME_EPOCH__ = Date.now();
  }

  const useV2Harness = mode === "demo" || !!options?.v2Harness;
  const src = buildGameIframeUrl({
    mode,
    initialScreen: options?.initialScreen || "",
    showBack: options?.showBack ?? false,
    backTo: options?.backTo || "screenPremiumApp",
    epoch: mode === "premium" ? window.__BC_IFRAME_EPOCH__ : 0,
    bustCache: true,
    v2Harness: useV2Harness,
  });
  const isMobile = document.documentElement?.dataset?.bcMobileEnv === "true";
  const initialHeight =
    mode === "demo" && useV2Harness && isMobile
      ? Math.max(window.innerHeight || 0, 680)
      : mode === "demo" && options?.initialScreen === "screenWelcome"
        ? 300
        : 420;
  const initialOpacity = mode === "demo" && useV2Harness && options?.autoStartV2 ? 0 : 1;

  // ✅ Smaller default height to avoid giant empty space before setup
  mount.innerHTML = `
    <iframe
      id="${targetId}Frame"
      src="${src}"
      title="BottleCaller Game"
      style="
        width: 100%;
        height: ${initialHeight}px;
        border: 1px solid rgba(255,255,255,0.10);
        border-radius: 14px;
        background: rgba(0,0,0,0.35);
        box-shadow: 0 10px 28px rgba(0,0,0,0.55);
        opacity: ${initialOpacity};
        transition: opacity 160ms ease;
      "
      loading="eager"
    ></iframe>
  `;

  const mountedFrame = document.getElementById(`${targetId}Frame`);
  if (mode === "demo" && useV2Harness && options?.autoStartV2) {
    mountedFrame?.addEventListener("load", () => {
      burstStartV2Demo(`${options.autoStartReason || "iframe_load"}:load`);
    }, { once: true });
    window.setTimeout(() => burstStartV2Demo(options.autoStartReason || "iframe_mount"), 0);
  }

  // ctx is now delivered only via bc_ctx_request reply from the iframe

  setDebug({ step: "game.iframe.mounted", targetId, mode, src, time: new Date().toISOString() });
}

function remountDemoIframe({ resetProgress = false } = {}) {
  const mount = document.getElementById("gameRootDemo");
  if (!mount) return;

  currentIframeMode = null;
  const v = Date.now();
  const reset = resetProgress ? "&reset_progress=1" : "";
  mount.innerHTML = `
    <iframe
      id="gameRootDemoFrame"
      src="/game/game.html?mode=demo&v=${v}${reset}"
      title="BottleCaller Game"
      style="
        width: 100%;
        height: 420px;
        border: 1px solid rgba(255,255,255,0.10);
        border-radius: 14px;
        background: rgba(0,0,0,0.35);
        box-shadow: 0 10px 28px rgba(0,0,0,0.55);
      "
      loading="eager"
    ></iframe>
  `;
}

function callPremiumIframeNav(fnName) {
  const frame = document.getElementById("premiumRootFrame");
  const w = frame?.contentWindow;
  if (!w) return setDebug({ step: "nav.fail", reason: "no_premium_iframe" });

  const nav = w.__BC_NAV__;
  if (!nav || typeof nav[fnName] !== "function") {
    return setDebug({ step: "nav.fail", fnName, reason: "entry_point_missing" });
  }

  nav[fnName]();
}

function postToPremiumIframe(message) {
  const frame = document.getElementById("premiumRootFrame");
  const w = frame?.contentWindow;
  if (!w) {
    setDebug({ step: "iframe.post.fail", reason: "no_premium_iframe" });
    return;
  }
  w.postMessage(message, window.location.origin);
}

function postNavToPremiumIframe(screen) {
  const frame = document.getElementById("premiumRootFrame");
  if (!frame || !frame.contentWindow) {
    setDebug({ step: "nav.post.failed", reason: "no premium iframe", screen });
    return;
  }

  frame.contentWindow.postMessage(
    { source: "BC_MSG", v: 1, type: "nav", screen },
    window.location.origin
  );

  setDebug({ step: "nav.post.sent", screen, time: new Date().toISOString() });
}

function postStartV2DemoToIframe(reason = "mobile_enter") {
  const frame = document.getElementById("gameRootDemoFrame");
  if (!frame || !frame.contentWindow) {
    setDebug({ step: "demo.start_v2.failed", reason: "no_demo_iframe", source: reason });
    return false;
  }
  try {
    frame.contentWindow.postMessage(
      { source: "BC_MSG", v: 1, type: "start_v2_demo", reason },
      window.location.origin
    );
    window.__BC_DEMO_PLAY_STARTED_AT__ = Date.now();
    window.__BC_DEMO_IFRAME_LAST_SCREEN__ = "screenPlay";
    document.documentElement.dataset.bcV2Demo = "true";
    frame.dataset.bcDemoPlayStarted = "true";
    setDebug({ step: "demo.start_v2.sent", reason, time: new Date().toISOString() });
    return true;
  } catch (error) {
    setDebug({
      step: "demo.start_v2.failed",
      reason,
      error: error?.message || String(error),
      time: new Date().toISOString(),
    });
    return false;
  }
}

function burstStartV2Demo(reason = "mobile_enter") {
  let attempts = 0;
  const maxAttempts = 24;
  const tick = () => {
    postStartV2DemoToIframe(`${reason}:${attempts}`);
    attempts += 1;
    if (attempts >= maxAttempts) return;
    window.setTimeout(tick, 125);
  };
  tick();
}

function startMobileDemoDirectly(reason = "mobile_enter") {
  closeHud?.();
  appMode = "demo";
  persistV2DemoRequest();
  document.getElementById("authFields")?.classList.add("hidden");
  document.getElementById("screenHome")?.classList.add("hidden");
  document.getElementById("btnDemoPremium")?.classList.add("hidden");
  document.getElementById("btnDemoExit")?.classList.add("hidden");
  showScreen("screenGameDemo");
  setPremiumOverlayActive(false);
  document.documentElement.dataset.bcV2Demo = "true";
  destroyPremiumIframe(`${reason}:premium`);
  destroyDemoIframe(`${reason}:remount`);
  mountGameIframe("gameRootDemo", "demo", {
    initialScreen: "screenPlay",
    v2Harness: true,
    autoStartV2: true,
    autoStartReason: reason,
  });

  burstStartV2Demo(reason);
}

function openMobileDemoWelcome(reason = "mobile_demo_welcome") {
  closeHud?.();
  appMode = "demo";
  persistV2DemoRequest();
  document.getElementById("authFields")?.classList.add("hidden");
  document.getElementById("screenHome")?.classList.add("hidden");
  document.getElementById("btnDemoPremium")?.classList.add("hidden");
  document.getElementById("btnDemoExit")?.classList.add("hidden");
  showScreen("screenGameDemo");
  setPremiumOverlayActive(false);
  document.documentElement.dataset.bcV2Demo = "true";
  window.__BC_DEMO_PLAY_STARTED_AT__ = 0;
  window.__BC_DEMO_IFRAME_LAST_SCREEN__ = "screenWelcome";
  destroyPremiumIframe(`${reason}:premium`);
  destroyDemoIframe(`${reason}:remount`);
  mountGameIframe("gameRootDemo", "demo", {
    initialScreen: "screenWelcome",
    v2Harness: true,
  });
  try { renderAppChrome?.(); } catch {}
}

function openMobileDemoCockpit(reason = "mobile_demo_cockpit") {
  closeHud?.();
  appMode = "demo";
  persistV2DemoRequest();
  document.getElementById("authFields")?.classList.add("hidden");
  document.getElementById("screenHome")?.classList.add("hidden");
  document.getElementById("btnDemoPremium")?.classList.add("hidden");
  document.getElementById("btnDemoExit")?.classList.add("hidden");
  showScreen("screenGameDemo");
  setPremiumOverlayActive(false);
  document.documentElement.dataset.bcV2Demo = "true";
  window.__BC_DEMO_PLAY_STARTED_AT__ = 0;
  window.__BC_DEMO_IFRAME_LAST_SCREEN__ = null;
  destroyPremiumIframe(`${reason}:premium`);
  destroyDemoIframe(`${reason}:demo`);
  try { renderDemoJoinBlock?.(); } catch {}
  try { renderAppChrome?.(); } catch {}
}

function openPremiumBeginScreen() {
  if (appMode === "demo") {
    if (document.documentElement?.dataset?.bcMobileEnv === "true") {
      openMobileDemoWelcome("mobile_play_enter");
      return;
    }

    const useV2Harness = true;
    const demoPlayStartedRecently =
      window.__BC_DEMO_IFRAME_LAST_SCREEN__ === "screenPlay" ||
      (Date.now() - Number(window.__BC_DEMO_PLAY_STARTED_AT__ || 0) < 15000);
    if (useV2Harness && demoPlayStartedRecently) {
      showScreen("screenGameDemo");
      setPremiumOverlayActive(false);
      try { renderAppChrome?.(); } catch {}
      setDebug({
        step: "demo.openWelcome.suppressed",
        reason: "demo_play_started",
        time: new Date().toISOString(),
      });
      return;
    }
    const tryOpenDemoWelcome = () => {
      const frame = document.getElementById("gameRootDemoFrame");
      const nav = frame?.contentWindow?.__BC_NAV__;
      if (nav && typeof nav.openWelcome === "function") {
        nav.openWelcome();
        return true;
      }
      return false;
    };

    closeHud?.();
    showScreen("screenGameDemo");
    setPremiumOverlayActive(false);

    if (useV2Harness) {
      destroyDemoIframe("openPremiumBeginScreen:force_v2_remount");
    }

    if (!document.getElementById("gameRootDemoFrame")) {
      mountGameIframe("gameRootDemo", "demo", {
        initialScreen: "screenWelcome",
        v2Harness: useV2Harness,
      });
    }

    let attempts = 0;
    const maxAttempts = 12;
    const retryOpenDemoWelcome = () => {
      if (tryOpenDemoWelcome()) return;
      attempts += 1;
      if (attempts >= maxAttempts) return;
      window.setTimeout(retryOpenDemoWelcome, 180);
    };

    retryOpenDemoWelcome();
    return;
  }

  const tryOpenBegin = () => {
    const frame = document.getElementById("premiumRootFrame");
    const nav = frame?.contentWindow?.__BC_NAV__;
    if (nav && typeof nav.openWelcome === "function") {
      nav.openWelcome();
      return true;
    }
    return false;
  };

  closeHud?.();
  showScreen("screenPremiumApp");

  if (!document.getElementById("premiumRootFrame")) {
    const role = String(appState?.profile?.role || "").toLowerCase();
    const isWaiter = role === "waiter";
    mountPremiumGameIframe({
      mode: "premium",
      showBack: true,
      backTo: isWaiter ? "screenPremiumApp" : "screenManagerBoard",
      initialScreen: "screenWelcome",
    });
  }

  let attempts = 0;
  const maxAttempts = 12;
  const retryOpenBegin = () => {
    if (tryOpenBegin()) return;
    attempts += 1;
    if (attempts >= maxAttempts) return;
    window.setTimeout(retryOpenBegin, 180);
  };

  retryOpenBegin();
}

// ✅ Optional auto-resize (requires matching postMessage in game.html)
window.addEventListener("message", (event) => {
  const data = event?.data;
  if (
    data &&
    data.source === "BC_MSG" &&
    data.v === 1 &&
    data.type === "demo_play_started" &&
    event.origin === window.location.origin
  ) {
    const demoFrame = document.getElementById("gameRootDemoFrame");
    if (demoFrame && event.source === demoFrame.contentWindow) {
      window.__BC_DEMO_PLAY_STARTED_AT__ = Date.now();
      window.__BC_DEMO_IFRAME_LAST_SCREEN__ = "screenPlay";
      document.documentElement.dataset.bcV2Demo = "true";
      demoFrame.dataset.bcDemoPlayStarted = "true";
      demoFrame.style.opacity = "1";
      try { renderAppChrome?.(); } catch {}
    }
    return;
  }

  if (!data || data.type !== "BC_IFRAME_HEIGHT") return;

  const demoFrame = document.getElementById("gameRootDemoFrame");
  const premFrame = document.getElementById("premiumRootFrame");
  const frame = data.mode === "premium" ? premFrame : demoFrame;
  if (!frame) return;

  const h = Number(data.height);
  if (!Number.isFinite(h)) return;

  const isMobile = document.documentElement?.dataset?.bcMobileEnv === "true";
  const isV2Demo =
    String(data.mode || "").toLowerCase() === "demo" &&
    document.documentElement?.dataset?.bcV2Demo === "true";
  const isDemoWelcome =
    String(data.mode || "").toLowerCase() === "demo" &&
    String(data.screenId || "") === "screenWelcome";
  const isStaleDemoWelcomeAfterPlay =
    isV2Demo &&
    isDemoWelcome &&
    isDemoPlayStartRecent() &&
    window.__BC_DEMO_IFRAME_LAST_SCREEN__ === "screenPlay";
  if (isStaleDemoWelcomeAfterPlay) {
    setDebug({
      step: "demo.height_ignored_after_play",
      reason: data.reason || null,
      time: new Date().toISOString(),
    });
    return;
  }
  if (String(data.mode || "").toLowerCase() === "demo") {
    window.__BC_DEMO_IFRAME_LAST_SCREEN__ = String(data.screenId || "") || null;
    try { renderAppChrome?.(); } catch {}
  }
  const maxHeight = isMobile ? 6000 : 860;
  const minHeight = isDemoWelcome
    ? (isMobile ? 220 : 200)
    : (isMobile ? 320 : 360);
  const measuredHeight = Math.max(minHeight, Math.min(maxHeight, h + (isMobile ? 12 : 24)));
  const viewportHeight = Math.ceil(window.visualViewport?.height || window.innerHeight || 0);
  const clamped = isMobile && isV2Demo
    ? Math.max(viewportHeight, 420)
    : measuredHeight;
  frame.style.setProperty("height", clamped + "px", "important");
});

// ------------------------------------------------------------
// Data loaders
// ------------------------------------------------------------
async function loadProfile(userId) {
  const res = await withTimeout(
    supabase
      .from("profiles")
      .select(
        "user_id, role, restaurant_id, display_name, access_tier, scope_type, scope_id, premium_pass_expires_at, is_first50, premium_grant_source, premium_grant_ref"
      )
      .eq("user_id", userId)
      .maybeSingle(),
    12000,
    "profiles.select"
  );
  if (res.error) throw res.error;
  return res.data;
}

async function loadRestaurant(restaurantId) {
  const res = await withTimeout(
    supabase.from("restaurants").select("id,name,code,seat_limit,require_invite,created_by").eq("id", restaurantId).single(),
    12000,
    "restaurants.select"
  );
  if (res.error) throw res.error;
  return res.data;
}

async function loadInvites(restaurantId = null) {
  const rid = String(restaurantId || getManagerActiveRestaurantId() || "");
  if (!rid) return [];

  const res = await withTimeout(
    supabase
      .from("restaurant_invites")
      .select("id,email,status,created_at,accepted_user_id,revoked_at")
      .eq("restaurant_id", rid)
      .order("created_at", { ascending: false }),
    12000,
    "invites.select"
  );
  if (res.error) throw res.error;
  return res.data || [];
}

async function loadManagerBoardSeats() {
  const rid = getManagerActiveRestaurantId() || appState.restaurant?.id || appState.profile?.restaurant_id || null;
  const elStatus = document.getElementById("mbSeatStatus");
  const elDetail = document.getElementById("mbSeatDetail");

  if (!rid) {
    if (elStatus) elStatus.textContent = "Seats: —";
    if (elDetail) elDetail.textContent = "No restaurant_id on profile.";
    return;
  }

  const { data, error } = await supabase
    .from("bc_restaurant_seats_v1")
    .select("restaurant_id, seat_limit, seats_used, seats_remaining")
    .eq("restaurant_id", rid)
    .maybeSingle();

  if (error) {
    if (elStatus) elStatus.textContent = "Seats: error";
    if (elDetail) elDetail.textContent = "Failed to load seats: " + error.message;
    return;
  }

  if (!data) {
    if (elStatus) elStatus.textContent = "Seats: —";
    if (elDetail) elDetail.textContent = "No seats row found for this restaurant.";
    return;
  }

  if (elStatus) elStatus.textContent = `Seats: ${data.seats_used}/${data.seat_limit}`;
  if (elDetail) {
    elDetail.textContent =
      `Seat limit: ${data.seat_limit} • Used (premium waiters): ${data.seats_used} • Remaining: ${data.seats_remaining}`;
  }
}

async function adminSetSeats(newLimit) {
  if (!isManagerRole(appState.profile?.role)) {
    alert("Managers only.");
    return;
  }
  const rid = getManagerActiveRestaurantId() || appState.restaurant?.id || appState.profile?.restaurant_id || null;
  if (!rid) return alert("Missing restaurant_id on profile.");

  const { error } = await supabase.rpc("admin_set_seat_limit", {
    p_restaurant_id: rid,
    p_new_limit: newLimit
  });

  if (error) {
    alert("Seat update failed: " + error.message);
    return;
  }

  await loadManagerBoardSeats();
}

async function redeemEnterpriseManagerSetupCode(inputId = "mbEnterpriseCode", msgId = "mbEnterpriseMsg") {
  if (!isManagerRole(appState.profile?.role)) {
    alert("Managers only.");
    return;
  }
  const input = document.getElementById(inputId);
  const msg = document.getElementById(msgId);
  const code = (input?.value || "").trim().toUpperCase();

  if (!code) return;

  if (msg) msg.textContent = "Redeeming…";

  const { data, error } = await supabase.rpc("redeem_code", { p_code: code });

  if (error) {
    if (msg) msg.textContent = "Failed: " + error.message;
    return;
  }

  if (data?.ok === false) {
    if (msg) msg.textContent = "Failed: " + (data?.error || "unknown");
    return;
  }

  if (msg) msg.textContent = "✅ Redeemed. Reloading profile…";

  try {
    const session = appState.session;
    if (session?.user?.id) {
      appState.profile = await loadProfile(session.user.id);
    }
  } catch {}

  if (msg) msg.textContent = "✅ Enterprise upgrade applied (if code was enterprise).";
}

async function redeemGroupSetupCode(inputId = "mbGroupSetupCode", msgId = "mbGroupSetupMsg") {
  const input = document.getElementById(inputId);
  const msg = document.getElementById(msgId);
  const code = (input?.value || "").trim().toUpperCase();

  if (!code) return;

  if (msg) msg.textContent = "Redeeming…";

  const { data, error } = await supabase.rpc("redeem_code", { p_code: code });

  if (error) { if (msg) msg.textContent = "Failed: " + error.message; return; }
  if (data?.ok === false) { if (msg) msg.textContent = "Failed: " + (data?.error || "unknown"); return; }

  if (msg) msg.textContent = "✅ Redeemed. Reloading profile…";

  try {
    const session = window.appState?.session;
    if (session?.user?.id) {
      window.appState.profile = await loadProfile(session.user.id);
    }
  } catch {}

  try { await initRestaurantContextAfterAuth(); } catch {}
  try { applyManagerBoardVisibility(); } catch {}
  if (msg) msg.textContent = "✅ Group manager scope applied.";
}

function wireGroupSetupRedeem() {
  [
    { buttonId: "mbRedeemGroupSetup", inputId: "mbGroupSetupCode", msgId: "mbGroupSetupMsg" },
    { buttonId: "mbListingRedeemGroupSetup", inputId: "mbListingGroupSetupCode", msgId: "mbListingGroupSetupMsg" },
  ].forEach(({ buttonId, inputId, msgId }) => {
    const btn = document.getElementById(buttonId);
    if (!btn || btn.__wired) return;
    btn.__wired = true;
    btn.addEventListener("click", () => redeemGroupSetupCode(inputId, msgId));
  });
}

function wireManagerBoardBillingAccess() {
  const isMgr = isManagerRole(appState.profile?.role);
  const b15 = document.getElementById("mbSeat15");
  const b30 = document.getElementById("mbSeat30");
  const b60 = document.getElementById("mbSeat60");
  const bRef = document.getElementById("mbRefreshSeats");
  const redeemControls = [
    {
      button: document.getElementById("mbRedeemEnterprise"),
      input: document.getElementById("mbEnterpriseCode"),
      msg: document.getElementById("mbEnterpriseMsg"),
      inputId: "mbEnterpriseCode",
      msgId: "mbEnterpriseMsg",
    },
    {
      button: document.getElementById("mbListingRedeemEnterprise"),
      input: document.getElementById("mbListingEnterpriseCode"),
      msg: document.getElementById("mbListingEnterpriseMsg"),
      inputId: "mbListingEnterpriseCode",
      msgId: "mbListingEnterpriseMsg",
    },
  ];

  [b15, b30, b60].forEach((el) => {
    if (el) el.style.display = isMgr ? "" : "none";
  });
  redeemControls.forEach(({ button, input, msg, inputId, msgId }) => {
    if (button) button.style.display = isMgr ? "" : "none";
    if (input) input.style.display = isMgr ? "" : "none";
    if (msg && !isMgr) msg.textContent = "";
    if (button) button.onclick = () => redeemEnterpriseManagerSetupCode(inputId, msgId);
  });

  if (b15) b15.onclick = () => adminSetSeats(15);
  if (b30) b30.onclick = () => adminSetSeats(30);
  if (b60) b60.onclick = () => adminSetSeats(60);
  if (bRef) bRef.onclick = () => loadManagerBoardSeats();

  loadManagerBoardSeats();
}

function normalizeManagerBoardTab(tabLike) {
  const raw = String(tabLike || "overview").toLowerCase();
  const aliases = {
    staff: "overview",
    people: "overview",
    history: "performance",
    insights: "performance",
    gameplay: "gameplay_adjustments",
    adjustments: "gameplay_adjustments",
    gameplay_adjustments: "gameplay_adjustments",
    tournament: "overview",
    tournament_setup: "overview",
    selection: "overview",
    attribute_abilities: "gameplay_adjustments",
    area_abilities: "gameplay_adjustments",
    live_controls: "gameplay_adjustments",
  };
  return aliases[raw] || raw;
}

function wireManagerBoardMenu() {
  const menu = document.getElementById("mbMenu");
  if (!menu || menu.__bcBound) return;
  menu.__bcBound = true;
  window.__BC_MB_NORMALIZETAB__ = normalizeManagerBoardTab;

  function showTab(name) {
    const normalized = normalizeManagerBoardTab(name);
    menu.querySelectorAll("[data-mbtab]").forEach((btn) => {
      const isActive = normalizeManagerBoardTab(btn.getAttribute("data-mbtab")) === normalized;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    document.querySelectorAll("#mbPanels .mbTab").forEach((el) => el.classList.add("hidden"));
    document.getElementById(`mbTab_${normalized}`)?.classList.remove("hidden");
  }
  window.__BC_MB_SHOWTAB__ = showTab;
  window.__BC_MB_LOADTAB__ = async function(name) {
    const normalized = normalizeManagerBoardTab(name);
    if (!normalized) return;
    if (normalized === "overview") {
      await loadManagerBoardData();
      return;
    }
    if (normalized === "billing") return loadManagerBoardSeats?.();
    if (normalized === "performance") {
      await loadManagerPerformanceTab();
      return;
    }
    if (normalized === "messenger") {
      await openManagerMessengerWindow("board_tab");
      return;
    }
    if (normalized === "gameplay_adjustments") {
      safeCall("renderManagerBoardOverviewLiveEffects", () => renderManagerBoardOverviewLiveEffects?.());
      safeCall("renderManagerAbilityEconomyPanel", () => renderManagerAbilityEconomyPanel?.());
      safeCall("renderManagerLiveControlPanels", () => renderManagerLiveControlPanels?.());
      safeCall("renderManagerDrillActionPanel", () => renderManagerDrillActionPanel?.());
      renderManagerGameplayAdjustmentsPanel();
      renderTimedChallengeComposer();
      await loadTimedChallengeWineOptions().catch(console.warn);
      return;
    }
  };

  menu.addEventListener("click", async (e) => {
    const btn = e.target?.closest?.("[data-mbtab]");
    if (!btn) return;
    const tab = normalizeManagerBoardTab(btn.getAttribute("data-mbtab"));

    showTab(tab);

    if (tab === "overview") {
      await loadManagerBoardData();
    }
    if (tab === "billing") await loadManagerBoardSeats?.();
    if (tab === "performance") {
      await loadManagerPerformanceTab();
    }
    if (tab === "gameplay_adjustments") {
      safeCall("renderManagerBoardOverviewLiveEffects", () => renderManagerBoardOverviewLiveEffects?.());
      safeCall("renderManagerAbilityEconomyPanel", () => renderManagerAbilityEconomyPanel?.());
      safeCall("renderManagerLiveControlPanels", () => renderManagerLiveControlPanels?.());
      safeCall("renderManagerDrillActionPanel", () => renderManagerDrillActionPanel?.());
      renderManagerGameplayAdjustmentsPanel();
      renderTimedChallengeComposer();
      await loadTimedChallengeWineOptions().catch(console.warn);
    }
  });

  showTab(window.__BC_MB_DEFAULTTAB__ || "overview");
}

async function loadRestaurantsForHudPicker() {
  if (loadRestaurantsForHudPicker.__inflight) return;
  if (loadRestaurantsForHudPicker.__loadedOnce) return;
  loadRestaurantsForHudPicker.__inflight = true;
  const sel = document.getElementById("selActiveRestaurant");
  const btn = document.getElementById("btnSetActiveRestaurant");
  const hint = document.getElementById("activeRestaurantHint");
  const msg = document.getElementById("hudRestaurantPickerMsg");

  if (!sel || !btn) {
    loadRestaurantsForHudPicker.__inflight = false;
    return;
  }

  sel.innerHTML = "";
  if (hint) hint.textContent = "Loading…";
  if (msg) msg.textContent = "";

  const res = await supabase
    .from("restaurants")
    .select("id,name,code,seat_limit,require_invite")
    .order("name", { ascending: true });

  if (res.error) {
    if (hint) hint.textContent = "⚠️ Failed to load restaurants.";
    console.warn("[BC] restaurants load failed", res.error);
    loadRestaurantsForHudPicker.__inflight = false;
    return;
  }

  const rows = res.data || [];
  if (!rows.length) {
    if (hint) hint.textContent = "No restaurants found.";
    loadRestaurantsForHudPicker.__inflight = false;
    return;
  }

  for (const r of rows) {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = r.name || r.id.slice(0, 8) + "…";
    sel.appendChild(opt);
  }

  const stored = localStorage.getItem("BC_ACTIVE_RESTAURANT_ID");
  const current = appState.activeRestaurantId || stored || rows[0].id;
  sel.value = current;

  async function applyRestaurant(id) {
    appState.activeRestaurantId = id;
    localStorage.setItem("BC_ACTIVE_RESTAURANT_ID", id);

    const full = rows.find(x => x.id === id) || null;
    appState.restaurant = full;
    markActiveRestaurantReady();

    renderHud();

    try {
      await loadManagerBoardData?.();
      await loadManagerInsights?.();
    } catch (e) {
      console.warn("[BC] refresh after restaurant switch failed", e);
    }

    if (hint) hint.textContent = `✅ Active: ${full?.name || id}`;
  }

  await applyRestaurant(current);

  btn.onclick = () => applyRestaurant(sel.value);
  loadRestaurantsForHudPicker.__loadedOnce = true;
  loadRestaurantsForHudPicker.__inflight = false;
}

async function ensureManagerRestaurantChoices() {
  const profile = appState?.profile || {};
  const caps = getPremiumRoleCapabilities(profile);
  const cacheKey = JSON.stringify({
    role: normalizeMembershipRole(profile),
    scopeId: profile?.scope_id || profile?.scopeId || "",
    restaurantId: profile?.restaurant_id || profile?.restaurantId || "",
    activeRestaurantId: appState?.activeRestaurantId || "",
  });
  if (
    managerRestaurantChoicesCache.key === cacheKey &&
    Array.isArray(managerRestaurantChoicesCache.rows) &&
    Date.now() - Number(managerRestaurantChoicesCache.loadedAt || 0) < MANAGER_RESTAURANT_CHOICES_CACHE_MS
  ) {
    window.__BC_ALLOWED_RESTAURANT_ROWS__ = managerRestaurantChoicesCache.rows;
    window.__BC_ALLOWED_RESTAURANT_IDS__ = managerRestaurantChoicesCache.rows.map((x) => String(x.id));
    return managerRestaurantChoicesCache.rows;
  }

  if (managerRestaurantChoicesInflight?.key === cacheKey && managerRestaurantChoicesInflight?.promise) {
    return managerRestaurantChoicesInflight.promise;
  }

  if (!caps.canManageMultipleRestaurants) {
    const ownRestaurantId = String(
      profile?.restaurant_id ||
      profile?.restaurantId ||
      ""
    );
    const ownName =
      appState?.restaurant?.name ||
      "My Restaurant";

    const rows = ownRestaurantId
      ? [{ id: ownRestaurantId, name: ownName }]
      : [];

    window.__BC_ALLOWED_RESTAURANT_ROWS__ = rows;
    window.__BC_ALLOWED_RESTAURANT_IDS__ = rows.map((x) => String(x.id));
    managerRestaurantChoicesCache = { key: cacheKey, loadedAt: Date.now(), rows };
    return rows;
  }

  managerRestaurantChoicesInflight = {
    key: cacheKey,
    promise: (async () => {
      try {
        const scopeId = profile?.scope_id || profile?.scopeId || null;
        const rowsRaw = await fetchAllowedRestaurantsForScope(scopeId);
        const rows = Array.isArray(rowsRaw)
          ? rowsRaw.map((x) => ({
              id: String(x?.id || x?.restaurant_id || ""),
              name: x?.name || x?.restaurant_name || null,
            })).filter((x) => x.id)
          : [];
        if (rows.length) {
          window.__BC_ALLOWED_RESTAURANT_ROWS__ = rows;
          window.__BC_ALLOWED_RESTAURANT_IDS__ = rows.map((x) => String(x.id));
          const active = getManagerActiveRestaurantId();
          if (!active || !rows.some((row) => row.id === active)) {
            setManagerActiveRestaurantId(rows[0].id);
          }
          managerRestaurantChoicesCache = { key: cacheKey, loadedAt: Date.now(), rows };
          return rows;
        }
      } catch (e) {
        console.warn("[MB] scoped restaurant load failed", e);
      }

      const ownRestaurantId = String(
        profile?.restaurant_id ||
        profile?.restaurantId ||
        ""
      );
      const ownName =
        appState?.restaurant?.name ||
        "My Restaurant";

      const fallbackRows = ownRestaurantId
        ? [{ id: ownRestaurantId, name: ownName }]
        : [];

      window.__BC_ALLOWED_RESTAURANT_ROWS__ = fallbackRows;
      window.__BC_ALLOWED_RESTAURANT_IDS__ = fallbackRows.map((x) => String(x.id));
      managerRestaurantChoicesCache = { key: cacheKey, loadedAt: Date.now(), rows: fallbackRows };
      return fallbackRows;
    })(),
  };

  try {
    return await managerRestaurantChoicesInflight.promise;
  } finally {
    if (managerRestaurantChoicesInflight?.key === cacheKey) {
      managerRestaurantChoicesInflight = null;
    }
  }
}

function renderManagerRestaurantPicker() {
  const profile = appState?.profile || {};
  const caps = getPremiumRoleCapabilities(profile);
  const select = document.getElementById("mbRestaurantPicker");

  if (!select) return;

  if (!caps.canManageMultipleRestaurants) {
    select.classList.add("hidden");
    return;
  }

  const rows = getAllowedRestaurantRows();

  select.innerHTML = "";
  rows.forEach((row) => {
    const rid = String(row?.id || "");
    if (!rid) return;
    const opt = document.createElement("option");
    opt.value = rid;
    opt.textContent = row?.name || `Restaurant ${rid.slice(0, 8)}`;
    select.appendChild(opt);
  });

  const active = getManagerActiveRestaurantId();
  if (active) select.value = active;
  select.classList.remove("hidden");
}

function renderManagerRestaurantContextCard() {
  const root = document.getElementById("mbRestaurantContextCard");
  if (!root) return;

  const profile = appState?.profile || {};
  const caps = getPremiumRoleCapabilities(profile);
  const roleLabel = getDisplayRoleLabel(profile);
  const rid = getManagerActiveRestaurantId();
  const name = getAllowedRestaurantName(rid);

  root.innerHTML = `
    <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
      <div style="font-weight:600;">Restaurant Context</div>
      <div><b>Role:</b> ${escapeHtml(roleLabel)}</div>
      <div><b>Active restaurant:</b> ${escapeHtml(name)}</div>
      <div class="small" style="opacity:.75;">
        ${
          caps.canManageMultipleRestaurants
            ? "You can switch between restaurants in your allowed scope."
            : "You are currently scoped to one restaurant."
        }
      </div>
    </div>
  `;
}

function renderGroupOverviewCard() {
  const root = document.getElementById("mbGroupOverviewCard");
  if (!root) return;

  const profile = appState?.profile || {};
  const caps = getPremiumRoleCapabilities(profile);

  if (!caps.canManageMultipleRestaurants) {
    root.innerHTML = "";
    return;
  }

  const rows = getAllowedRestaurantRows();
  const activeRid = getManagerActiveRestaurantId();
  const activeName = getAllowedRestaurantName(activeRid);

  root.innerHTML = `
    <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
      <div style="font-weight:600;">Group Overview</div>
      <div><b>Accessible restaurants:</b> ${rows.length}</div>
      <div><b>Current control target:</b> ${escapeHtml(activeName)}</div>
      <div class="small" style="opacity:.75;">
        Group-level multi-restaurant summaries and comparisons will appear here.
      </div>
    </div>
  `;
}

function renderGroupMetricsCard() {
  const root = document.getElementById("mbGroupMetricsCard");
  if (!root) return;

  const profile = appState?.profile || {};
  const caps = getPremiumRoleCapabilities(profile);

  if (!caps.canManageMultipleRestaurants) {
    root.innerHTML = "";
    return;
  }

  const metrics = getGroupManagerMetrics();

  root.innerHTML = `
    <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
      <div style="font-weight:600;">Cross-Restaurant Metrics</div>
      <div><b>Accessible restaurants:</b> ${metrics.restaurantsCount}</div>
      <div><b>Pending invites:</b> ${metrics.pendingInvitesCount}</div>
      <div><b>Recent timed challenge activity:</b> ${metrics.recentTimedChallengesCount}</div>
      <div><b>Recent drill completions:</b> ${metrics.recentDrillCompletionsCount}</div>
      <div class="small" style="opacity:.75;">
        These metrics reflect the current allowed restaurant scope.
      </div>
    </div>
  `;
}

function renderGroupRestaurantComparisonCard() {
  const root = document.getElementById("mbGroupRestaurantComparisonCard");
  if (!root) return;

  const profile = appState?.profile || {};
  const caps = getPremiumRoleCapabilities(profile);

  if (!caps.canManageMultipleRestaurants) {
    root.innerHTML = "";
    return;
  }

  const rows = getGroupRestaurantComparisonRows();

  if (!rows.length) {
    root.innerHTML = `
      <div class="card" style="padding:12px;">
        <div style="font-weight:600;">Restaurant Comparison</div>
        <div class="small" style="opacity:.75; margin-top:8px;">
          No scoped restaurant data available.
        </div>
      </div>
    `;
    return;
  }

  const inner = rows.map((row) => {
    return `
      <div
        data-mb-restaurant-row="${escapeHtml(row.restaurantId)}"
        style="
          padding:10px;
          border:1px solid rgba(255,255,255,0.10);
          border-radius:10px;
          background:${row.isActive ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)"};
        "
      >
        <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
          <div style="font-weight:600;">${escapeHtml(row.name)}</div>
          <div class="small" style="opacity:.75;">${row.isActive ? "ACTIVE" : ""}</div>
        </div>

        <div class="small" style="opacity:.9; margin-top:6px;">
          Pending invites: ${row.pendingInvites}
        </div>
        <div class="small" style="opacity:.9;">
          Timed challenge activity: ${row.timedChallengeActivity}
        </div>
        <div class="small" style="opacity:.9;">
          Drill completions: ${row.drillCompletions}
        </div>

        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
          <button
            type="button"
            data-mb-switch-restaurant="${escapeHtml(row.restaurantId)}"
            class="btn-ghost"
          >
            Open restaurant
          </button>

          <button
            type="button"
            data-mb-open-challenge="${escapeHtml(row.restaurantId)}"
            class="btn"
          >
            Assign challenge
          </button>
        </div>
      </div>
    `;
  }).join("");

  root.innerHTML = `
    <div class="card" style="display:flex; flex-direction:column; gap:10px; padding:12px;">
      <div style="font-weight:600;">Restaurant Comparison</div>
      <div class="small" style="opacity:.75;">
        Click a restaurant to switch your active control target.
      </div>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${inner}
      </div>
    </div>
  `;
}

function focusTimedChallengeComposer() {
  const section = document.getElementById("mbTimedChallengeComposer");
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const firstInput =
    document.getElementById("mbTimedChallengeTitle") ||
    document.getElementById("mbTimedChallengeFocus");
  firstInput?.focus?.();
}

async function openManagerRestaurantChallengeContext(restaurantId) {
  const rid = String(restaurantId || "");
  if (!rid) return false;

  if (!setManagerActiveRestaurantId(rid)) return false;

  const picker = document.getElementById("mbRestaurantPicker");
  if (picker) picker.value = rid;

  resetManagerBoardScopedState();
  resetManagerMessengerState();

  try {
    const restaurant = await loadRestaurant(rid);
    if (restaurant) appState.restaurant = restaurant;
  } catch (e) {
    console.warn("[MB] loadRestaurant before challenge context failed", e);
  }

  await loadManagerBoardData?.(rid);
  await refreshManagerBoardScopedViews?.(rid);

  window.__BC_MB_DEFAULTTAB__ = "gameplay_adjustments";
  window.__BC_MB_SHOWTAB__?.("gameplay_adjustments");
  await window.__BC_MB_LOADTAB__?.("gameplay_adjustments");

  const status = document.getElementById("mbTimedChallengeStatus");
  if (status) {
    status.textContent = `Active restaurant set to ${getAllowedRestaurantName(rid)}. Select a waiter thread to assign a challenge.`;
  }

  focusTimedChallengeComposer();
  return true;
}

function wireGroupRestaurantComparisonCard() {
  const root = document.getElementById("mbGroupRestaurantComparisonCard");
  if (!root || root.__wired) return;

  root.__wired = true;
  root.addEventListener("click", async (event) => {
    const openChallengeBtn = event.target?.closest?.("[data-mb-open-challenge]");
    if (openChallengeBtn) {
      const rid = String(openChallengeBtn.getAttribute("data-mb-open-challenge") || "");
      if (!rid) return;
      await openManagerRestaurantChallengeContext(rid);
      return;
    }

    const switchBtn = event.target?.closest?.("[data-mb-switch-restaurant]");
    if (switchBtn) {
      const rid = String(switchBtn.getAttribute("data-mb-switch-restaurant") || "");
      if (!rid) return;

      if (!setManagerActiveRestaurantId(rid)) return;

      const picker = document.getElementById("mbRestaurantPicker");
      if (picker) picker.value = rid;

      resetManagerBoardScopedState();
      resetManagerMessengerState();

      try {
        const restaurant = await loadRestaurant(rid);
        if (restaurant) appState.restaurant = restaurant;
      } catch (e) {
        console.warn("[MB] loadRestaurant after comparison switch failed", e);
      }

      await loadManagerBoardData?.(rid);
      await refreshManagerBoardScopedViews?.(rid);
      return;
    }

    const rowEl = event.target?.closest?.("[data-mb-restaurant-row]");
    if (!rowEl) return;

    const rid = String(rowEl.getAttribute("data-mb-restaurant-row") || "");
    if (!rid) return;

    if (!setManagerActiveRestaurantId(rid)) return;

    const picker = document.getElementById("mbRestaurantPicker");
    if (picker) picker.value = rid;

    resetManagerBoardScopedState();
    resetManagerMessengerState();

    try {
      const restaurant = await loadRestaurant(rid);
      if (restaurant) appState.restaurant = restaurant;
    } catch (e) {
      console.warn("[MB] loadRestaurant after comparison row click failed", e);
    }

    await loadManagerBoardData?.(rid);
    await refreshManagerBoardScopedViews?.(rid);
  });
}

function wireManagerRestaurantPicker() {
  const select = document.getElementById("mbRestaurantPicker");
  if (!select || select.__wired) return;

  select.__wired = true;
  select.addEventListener("change", async () => {
    const rid = String(select.value || "");
    if (!rid) return;
    if (!setManagerActiveRestaurantId(rid)) return;

    resetManagerBoardScopedState();
    resetManagerMessengerState();

    try {
      const restaurant = await loadRestaurant(rid);
      if (restaurant) appState.restaurant = restaurant;
    } catch (e) {
      console.warn("[MB] loadRestaurant after switch failed", e);
    }

    await loadManagerBoardData?.(rid);
    await refreshManagerBoardScopedViews?.(rid);
  });
}

function applyManagerBoardVisibility() {
  const profile = appState.profile || {};
  const caps = getPremiumRoleCapabilities(profile);

  const overviewBtn = document.querySelector('#mbMenu [data-mbtab="overview"]');
  if (overviewBtn) overviewBtn.style.display = caps.canAccessManagerBoard ? "" : "none";
  const billingBtn = document.querySelector('#mbMenu [data-mbtab="billing"]');
  if (billingBtn) billingBtn.style.display = caps.canAccessManagerBoard ? "" : "none";
  const messengerBtn = document.querySelector('#mbMenu [data-mbtab="messenger"]');
  if (messengerBtn) messengerBtn.style.display = caps.canAccessManagerBoard ? "" : "none";
  const gameplayAdjustmentsBtn = document.querySelector('#mbMenu [data-mbtab="gameplay_adjustments"]');
  if (gameplayAdjustmentsBtn) gameplayAdjustmentsBtn.style.display = caps.canAccessManagerBoard ? "" : "none";
  const performanceBtn = document.querySelector('#mbMenu [data-mbtab="performance"]');
  if (performanceBtn) performanceBtn.style.display = caps.canAccessManagerBoard ? "" : "none";
  const enterpriseBtn = document.querySelector('#mbMenu [data-mbtab="enterprise"]');
  if (enterpriseBtn) {
    const showEnterprise = caps.canUseEnterpriseControls;
    enterpriseBtn.style.display = showEnterprise ? "" : "none";
    enterpriseBtn.classList.toggle("hidden", !showEnterprise);
  }
  const picker = document.getElementById("mbRestaurantPicker");
  if (picker) picker.classList.toggle("hidden", !caps.canAccessManagerBoard);
}

function wireActiveRestaurantPicker() {
  [
    { buttonId: "btnSetActiveRestaurant", selectId: "selActiveRestaurant" },
    { buttonId: "mbListingSetActiveRestaurant", selectId: "mbListingActiveRestaurant" },
  ].forEach(({ buttonId, selectId }) => {
    const btn = document.getElementById(buttonId);
    if (!btn || btn.__wired) return;
    btn.__wired = true;

    btn.addEventListener("click", async () => {
      const sel = document.getElementById(selectId);
      const rid = sel?.value || null;
      if (!rid) return;
      await setActiveRestaurantForGroup(rid);
    });
  });
}

async function mapUserIdsToNames(userIds) {
  const ids = Array.from(new Set((userIds || []).filter(Boolean)));
  const out = new Map();
  if (!ids.length) return out;

  const sb = window.supabase || window.__BC_SUPABASE__;
  if (!sb) return out;

  const { data, error } = await sb
    .from("profiles")
    .select("user_id, display_name, role")
    .in("user_id", ids)
    .limit(500);

  if (error) {
    console.warn("[MB] mapUserIdsToNames failed", error);
    ids.forEach((uid) => out.set(uid, String(uid).slice(0, 8)));
    return out;
  }

  ids.forEach((uid) => out.set(uid, String(uid).slice(0, 8)));
  for (const row of data || []) {
    const name = String(row?.display_name || "").trim();
    if (row?.user_id && name) out.set(row.user_id, name);
  }
  return out;
}

async function ensureProfileDisplayName() {
  try {
    const sb = window.supabase || window.__BC_SUPABASE__;
    const uid = appState?.session?.user?.id;
    if (!sb || !uid) return;

    const candidate =
      appState?.session?.user?.user_metadata?.display_name ||
      appState?.session?.user?.user_metadata?.full_name ||
      (appState?.session?.user?.email ? String(appState.session.user.email).split("@")[0] : "") ||
      "";

    const display_name = String(candidate || "").trim();
    if (!display_name) return;

    const cur = await sb
      .from("profiles")
      .select("display_name")
      .eq("user_id", uid)
      .maybeSingle();

    if (cur?.data?.display_name && String(cur.data.display_name).trim()) return;

    const { error } = await sb
      .from("profiles")
      .update({ display_name })
      .eq("user_id", uid);

    if (error) console.warn("[BC] ensureProfileDisplayName failed", error);
  } catch (e) {
    console.warn("[BC] ensureProfileDisplayName crashed", e);
  }
}

function userLabel(userId, nameMap) {
  const n = nameMap?.get?.(userId);
  return (n && String(n).trim()) ? n : String(userId || "-").slice(0, 8);
}

const MANAGER_PERFORMANCE_SKILLS = [
  { key: "read", label: "READ", color: "#60a5fa" },
  { key: "framing", label: "FRAME", color: "#34d399" },
  { key: "delivery", label: "DELIVER", color: "#f59e0b" },
  { key: "recovery", label: "RECOVER", color: "#f472b6" },
  { key: "closing", label: "CLOSE", color: "#a78bfa" },
];

function firstFinite(...values) {
  for (const value of values) {
    if (value == null || value === "") continue;
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value == null) continue;
    const str = String(value).trim();
    if (str) return str;
  }
  return "";
}

function latestTimestamp(...values) {
  let bestValue = "";
  let bestTs = -Infinity;
  for (const value of values) {
    if (value == null) continue;
    const str = String(value).trim();
    if (!str) continue;
    const ts = new Date(str).getTime();
    if (!Number.isFinite(ts)) continue;
    if (ts > bestTs) {
      bestTs = ts;
      bestValue = str;
    }
  }
  return bestValue;
}

function formatPercent(value, digits = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  const normalized = num <= 1 ? num * 100 : num;
  return `${normalized.toFixed(digits)}%`;
}

function formatMetricNumber(value, digits = 1) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(digits) : "—";
}

function formatRelativeTime(isoString) {
  if (!isoString) return "—";
  const ts = new Date(isoString).getTime();
  if (!Number.isFinite(ts)) return "—";

  const diff = Date.now() - ts;
  const abs = Math.abs(diff);
  const units = [
    { label: "d", ms: 24 * 60 * 60 * 1000 },
    { label: "h", ms: 60 * 60 * 1000 },
    { label: "m", ms: 60 * 1000 },
  ];

  for (const unit of units) {
    if (abs >= unit.ms) {
      const value = Math.round(abs / unit.ms);
      return diff >= 0 ? `${value}${unit.label} ago` : `in ${value}${unit.label}`;
    }
  }

  const secs = Math.max(1, Math.round(abs / 1000));
  return diff >= 0 ? `${secs}s ago` : `in ${secs}s`;
}

function formatDateTime(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleString();
}

function averageSkillShape(rows = []) {
  const source = Array.isArray(rows) ? rows.slice(0, 3) : [];
  const weights = [0.5, 0.3, 0.2];
  const totals = {
    read: 0,
    framing: 0,
    delivery: 0,
    recovery: 0,
    closing: 0,
  };

  if (!source.length) return totals;

  let appliedWeight = 0;
  source.forEach((row, index) => {
    const weight = weights[index] || 0;
    appliedWeight += weight;
    totals.read += Number(row?.read_pct || row?.read || 0) * weight;
    totals.framing += Number(row?.framing_pct || row?.framing || 0) * weight;
    totals.delivery += Number(row?.delivery_pct || row?.delivery || 0) * weight;
    totals.recovery += Number(row?.recovery_pct || row?.recovery || 0) * weight;
    totals.closing += Number(row?.closing_pct || row?.closing || 0) * weight;
  });

  Object.keys(totals).forEach((key) => {
    totals[key] = Math.round(totals[key] / Math.max(appliedWeight, 1));
  });

  return totals;
}

function describeReadiness(readinessScore, readinessLabel = "") {
  const score = Number(readinessScore || 0);
  const label = String(readinessLabel || "").toUpperCase();
  if (label === "STABLE" || score >= 0.8) return "Stable";
  if (label === "GROWING" || score >= 0.62) return "Growing";
  if (label === "FRAGILE" || score > 0) return "Fragile";
  return "Unknown";
}

function getSkillExtremes(skillShape = {}) {
  const pairs = MANAGER_PERFORMANCE_SKILLS.map(({ key, label }) => ({
    key,
    label,
    value: Number(skillShape?.[key] || 0),
  }));
  const sorted = pairs.slice().sort((a, b) => b.value - a.value);
  return {
    strongestSkill: sorted[0]?.label || "—",
    weakestSkill: sorted[sorted.length - 1]?.label || "—",
  };
}

function ensureInsightsShell() {
  const host = document.getElementById("mbInsightsPanel");
  if (!host) return null;

  if (!host.__bcInit) {
    host.__bcInit = true;
    host.innerHTML = `
      <div class="card">
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:center;">
          <div>
            <div class="small-text" style="opacity:.8;">What breaks under pressure — and what drill fixes it.</div>
          </div>
          <button id="mbInsightsRefresh" class="btn" type="button">Refresh</button>
        </div>

        <div id="mbInsightsMsg" class="small-text" style="margin-top:10px;"></div>
      </div>

      <div class="card" style="margin-top:12px;">
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          <select id="mbInsightsViewSelect" class="input" style="min-width:220px;">
            <option value="guest">Guest Type Breakdown</option>
            <option value="trend">Trend (14 days)</option>
          </select>
          <select id="mbInsightsUserSelect" class="input" style="min-width:220px;">
            <option value="all">All staff</option>
          </select>
        </div>
        <div id="mbInsightsLegend" class="small-text" style="margin-top:6px; opacity:.8;"></div>
        <div id="mbInsightsGuestTable" style="margin-top:10px;"></div>
        <div id="mbInsightsTrendTable" style="margin-top:10px;"></div>
      </div>
    `;

    const b = document.getElementById("mbInsightsRefresh");
    if (b && !b.__bcBound) {
      b.__bcBound = true;
      b.onclick = () => loadManagerInsights();
    }

    const viewSelect = document.getElementById("mbInsightsViewSelect");
    const userSelect = document.getElementById("mbInsightsUserSelect");
    if (viewSelect && !viewSelect.__bcBound) {
      viewSelect.__bcBound = true;
      viewSelect.addEventListener("change", () => refreshInsightsExplorer());
    }
    if (userSelect && !userSelect.__bcBound) {
      userSelect.__bcBound = true;
      userSelect.addEventListener("change", () => refreshInsightsExplorer());
    }
  }

  return host;
}

function rate(passed, total) {
  if (!total) return 0;
  return passed / total;
}

function buildRecommendedDrillPlan({ guestRows, weakRows }) {
  const n = weakRows.length || 0;

  let readOk = 0, delOk = 0, modeOk = 0, hookOk = 0;
  for (const r of weakRows) {
    if (r.read_correct) readOk++;
    if (r.delivery_correct) delOk++;
    if (r.mode_optimal) modeOk++;
    if (r.hook_optimal) hookOk++;
  }

  const scores = [
    { skill: "read", success: rate(readOk, n) },
    { skill: "delivery", success: rate(delOk, n) },
    { skill: "mode", success: rate(modeOk, n) },
    { skill: "hook", success: rate(hookOk, n) },
  ].sort((a, b) => a.success - b.success);

  const weakest = scores[0]?.skill || "read";

  const map = {
    read: {
      title: "Read under pressure",
      script: "For 5 minutes: pause 1 beat, name 2 cues (1 physical + 1 verbal), then choose the guest type out loud.",
      why: "Most losses start with misreading the guest. Fix the read, everything downstream improves."
    },
    mode: {
      title: "Mode discipline",
      script: "For 5 minutes: pick ONE mode (lead/charm/consult/etc) and refuse to switch. Say it before each attempt.",
      why: "Your mode collapses under pressure. This drill builds stability and stops spirals."
    },
    hook: {
      title: "Hook precision",
      script: "For 5 minutes: deliver a hook in one sentence: outcome + constraint + confidence (no extra info).",
      why: "Hooks are landing inconsistently. This tightens framing and stops rambling."
    },
    delivery: {
      title: "Delivery lock",
      script: "For 5 minutes: deliver 2 lines max (line1: recommendation, line2: reassurance). Then stop talking.",
      why: "Delivery is leaking. This drill forces clean, confident closure."
    }
  };

  const chosen = map[weakest] || map.read;

  return {
    weakest,
    title: chosen.title,
    script: chosen.script,
    why: chosen.why,
  };
}

function renderGuestInsightsTable(rows, nameMap = new Map(), selectedUserId = "all") {
  const normalizeGuest = (x) =>
    String(x || "unknown").trim().toLowerCase().replace(/[\s-]+/g, "_");

  const byUser = new Map();

  for (const r of rows || []) {
    const uid = r.user_id || "unknown";
    const display = nameMap.get(uid) || uid;
    const guest = normalizeGuest(r.actual_guest_type_norm);

    if (!byUser.has(uid)) byUser.set(uid, { uid, display, byGuest: new Map() });
    const u = byUser.get(uid);

    const s =
      u.byGuest.get(guest) ||
      { guest, n: 0, greens: 0, reds: 0, readOk: 0, modeOk: 0, hookOk: 0, sum: 0 };

    s.n++;
    s.sum += Number(r.chain_score || 0);
    if (r.is_green) s.greens++;
    if (r.is_red) s.reds++;
    if (r.read_correct) s.readOk++;
    if (r.mode_optimal) s.modeOk++;
    if (r.hook_optimal) s.hookOk++;

    u.byGuest.set(guest, s);
  }

  let users = Array.from(byUser.values()).sort((a, b) =>
    String(a.display).localeCompare(String(b.display))
  );

  if (selectedUserId && selectedUserId !== "all") {
    users = users.filter((u) => String(u.uid) === String(selectedUserId));
  }

  if (!users.length) return `<div class="small-text" style="opacity:.8;">No encounter data yet.</div>`;

  const guestOrder = ["dictator", "bargain_smart", "griever"];

  const header = `
    <div style="display:grid; grid-template-columns: 1.2fr .6fr .6fr .7fr .7fr .7fr .7fr; gap:8px; font-weight:700; opacity:.9;">
      <div>Guest</div><div>Attempts</div><div>Avg</div><div>Green%</div><div>Read%</div><div>Mode%</div><div>Hook%</div>
    </div>
  `;

  const blocks = users
    .map((u) => {
      const list = Array.from(u.byGuest.values())
        .map((x) => ({
          ...x,
          avg: x.n ? x.sum / x.n : 0,
          greenPct: x.n ? 100 * x.greens / x.n : 0,
          readPct: x.n ? 100 * x.readOk / x.n : 0,
          modePct: x.n ? 100 * x.modeOk / x.n : 0,
          hookPct: x.n ? 100 * x.hookOk / x.n : 0,
        }))
        .sort((a, b) => (guestOrder.indexOf(a.guest) - guestOrder.indexOf(b.guest)));

      const body = list
        .map(
          (x) => `
        <div style="display:grid; grid-template-columns: 1.2fr .6fr .6fr .7fr .7fr .7fr .7fr; gap:8px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
          <div>${x.guest}</div>
          <div>${x.n}</div>
          <div>${x.avg.toFixed(2)}</div>
          <div>${x.greenPct.toFixed(1)}</div>
          <div>${x.readPct.toFixed(1)}</div>
          <div>${x.modePct.toFixed(1)}</div>
          <div>${x.hookPct.toFixed(1)}</div>
        </div>
      `
        )
        .join("");

      return `
        <div class="card" style="margin-top:12px;">
          <strong>${u.display}</strong>
          <div style="margin-top:8px;">${header}${body}</div>
        </div>
      `;
    })
    .join("");

  return blocks;
}

function renderTrendTable(rows, nameMap = new Map(), selectedUserId = "all") {
  const byUserDay = new Map();

  for (const r of rows || []) {
    const uid = r.user_id || "unknown";
    const day = r.occurred_at ? String(r.occurred_at).slice(0, 10) : "unknown";

    if (!byUserDay.has(uid)) byUserDay.set(uid, new Map());
    const byDay = byUserDay.get(uid);

    const s = byDay.get(day) || { day, n: 0, sum: 0, greens: 0 };
    s.n++;
    s.sum += Number(r.chain_score || 0);
    if (r.is_green) s.greens++;
    byDay.set(day, s);
  }

  let users = Array.from(byUserDay.entries())
    .map(([uid, byDay]) => ({
      uid,
      display: nameMap.get(uid) || uid,
      days: Array.from(byDay.values())
        .map((x) => ({ ...x, avg: x.n ? x.sum / x.n : 0, greenPct: x.n ? 100 * x.greens / x.n : 0 }))
        .sort((a, b) => (a.day < b.day ? 1 : -1))
        .slice(0, 14),
    }))
    .sort((a, b) => String(a.display).localeCompare(String(b.display)));

  if (selectedUserId && selectedUserId !== "all") {
    users = users.filter((u) => String(u.uid) === String(selectedUserId));
  }

  if (!users.length) return `<div class="small-text" style="opacity:.8;">No trend data yet.</div>`;

  const header = `
    <div style="display:grid; grid-template-columns: 1fr .7fr .7fr .7fr; gap:8px; font-weight:700; opacity:.9;">
      <div>Day</div><div>Attempts</div><div>Avg</div><div>Green%</div>
    </div>
  `;

  return users
    .map((u) => {
      if (!u.days.length) return "";
      const body = u.days
        .map(
          (x) => `
        <div style="display:grid; grid-template-columns: 1fr .7fr .7fr .7fr; gap:8px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
          <div>${x.day}</div>
          <div>${x.n}</div>
          <div>${x.avg.toFixed(2)}</div>
          <div>${x.greenPct.toFixed(1)}</div>
        </div>
      `
        )
        .join("");

      return `
        <div class="card" style="margin-top:12px;">
          <strong>${u.display}</strong>
          <div style="margin-top:8px;">${header}${body}</div>
        </div>
      `;
    })
    .join("");
}

function startManagerDrill({ focus = "read", pool = ["dictator", "bargain_smart", "griever"], repTarget = 3, durationSec = 300, tier = 1 } = {}) {
  // ensure parent config exists
  window.setDefaultDrillConfig?.({ focus, pool, durationSec });

  // queue drill start payload for the iframe load handler
  setPendingStartDrill({
    repTarget,
    focus,
    pool,
    durationSec,
    starter: "manager",
    tier,
  });

  showScreen("screenPlay");
  mountPremiumGameIframe({ showBack: true, backTo: "screenManagerBoard" });
  pushPremiumDrill();
}

function wireInsightsCTAs(plan) {
  const bStart = document.getElementById("mbInsightsStartDrill");
  const bCopy = document.getElementById("mbInsightsCopyPlan");

  if (bStart && !bStart.__bcBound) {
    bStart.__bcBound = true;
    bStart.onclick = () => {
      const focus = plan?.weakest || "read";
      startManagerDrill({
        focus,
        pool: ["dictator", "bargain_smart", "griever"],
        repTarget: 3,
        durationSec: 300,
        tier: 1,
      });
      console.log("[INSIGHTS] start drill requested", { focus, plan });
    };
  }

  if (bCopy && !bCopy.__bcBound) {
    bCopy.__bcBound = true;
    bCopy.onclick = async () => {
      const text = `Recommended Drill: ${plan.title}\nWhy: ${plan.why}\nScript: ${plan.script}`;
      try {
        await navigator.clipboard.writeText(text);
        const msgEl = document.getElementById("mbInsightsMsg");
        if (msgEl) msgEl.textContent = "✅ Copied drill plan.";
      } catch {
        alert(text);
      }
    };
  }
}

function refreshInsightsExplorer() {
  const state = window.__BC_MB_INSIGHTS_STATE__ || null;
  const guestEl = document.getElementById("mbInsightsGuestTable");
  const trendEl = document.getElementById("mbInsightsTrendTable");
  const legendEl = document.getElementById("mbInsightsLegend");
  const viewSelect = document.getElementById("mbInsightsViewSelect");
  const userSelect = document.getElementById("mbInsightsUserSelect");
  if (!state || !guestEl || !trendEl || !legendEl || !viewSelect || !userSelect) return;

  const selectedView = String(viewSelect.value || "guest");
  const selectedUserId = String(userSelect.value || "all");

  if (selectedView === "trend") {
    legendEl.textContent = "Daily attempts, average chain score, and green rate over the last 14 days.";
    guestEl.classList.add("hidden");
    trendEl.classList.remove("hidden");
    trendEl.innerHTML = renderTrendTable(state.rows, state.nameMap, selectedUserId);
  } else {
    legendEl.textContent =
      "avg = average chain_score. green/red = outcome flags. read/delivery/mode/hook = % correct/optimal on that step.";
    trendEl.classList.add("hidden");
    guestEl.classList.remove("hidden");
    guestEl.innerHTML = renderGuestInsightsTable(state.rows, state.nameMap, selectedUserId);
  }
}

async function loadManagerInsights() {
  const root = document.getElementById("mbInsightsPanel");
  if (!root) return;

  root.innerHTML = `<div class="card"><div class="small-text">Loading performance…</div></div>`;

  try {
    const model = await getManagerPerformanceModel({ force: true });
    window.__BC_MB_PERFORMANCE_MODEL__ = model;
    window.__BC_MB_SELECTION_MODEL__ = {
      ...normalizeSelectionData(model),
      restaurantId: model.restaurantId,
      loadedAt: model.loadedAt || Date.now(),
    };

    root.innerHTML = `
      <div class="mb-performance-overview card">
        <div class="mb-section-header">
          <strong>Team Performance</strong>
          <div class="small-text">Live performance snapshot for the current restaurant.</div>
        </div>
        <div id="mbPerformanceCards" class="mb-performance-card-grid" style="margin-top:12px;"></div>
      </div>
      <div id="mbPerformanceResultsPanel" class="card">
        <div class="mb-section-header">
          <strong>Results Graph</strong>
          <div class="small-text">Team average drill, encounter, challenge, and premium rates shown as donut graphics.</div>
        </div>
        <div id="mbPerformanceResultsChart" class="mb-team-results-grid" style="margin-top:14px;"></div>
      </div>
    `;

    renderManagerPerformanceOverview(model.summary);
    drawTeamPerformanceResultsChart(model.summary || {});
  } catch (error) {
    console.error("[MB] loadManagerInsights failed", error);
    root.innerHTML = `
      <div class="card">
        <div class="small-text">Failed to load performance.</div>
        <div class="small-text" style="margin-top:6px; opacity:.75;">${escapeHtml(error?.message || String(error || "Unknown error"))}</div>
      </div>
    `;
  }
}

async function loadManagerPerformanceTab() {
  await loadManagerInsights();
  await loadHistoryWaiters();

  const select = document.getElementById("mbHistoryUser");
  if (select && !select.__wired) {
    select.__wired = true;
    select.addEventListener("change", () => {
      loadPerformanceHistory(select.value).catch(console.error);
    });
  }

  if (select?.value) {
    await loadPerformanceHistory(select.value);
  } else {
    renderPerformanceHistorySummaryStrip("");
    renderManagerEncounterSummaryList("", []);
  }
}

async function loadProfilePerformanceHistory() {
  const select = document.getElementById("mbHistoryUser");
  if (!select) return;

  await loadWeeklyTrainingReport();
  await loadHistoryWaiters();

  if (select && !select.__wired) {
    select.__wired = true;
    select.addEventListener("change", () => {
      loadPerformanceHistory(select.value).catch(console.error);
    });
  }

  const profile = appState?.profile || {};
  const currentUserId = String(
    profile?.user_id ||
    profile?.userId ||
    appState?.session?.user?.id ||
    ""
  ).trim();

  if (select?.value) {
    await loadPerformanceHistory(select.value);
    return;
  }

  if (currentUserId) {
    await loadPerformanceHistory(currentUserId);
    return;
  }

  renderPerformanceHistorySummaryStrip("");
  renderManagerEncounterSummaryList("", []);
}

function normalizeEncounterSummaryRow(row) {
  const reflection =
    row?.reflection && typeof row.reflection === "object"
      ? row.reflection
      : null;

  const chosenPath =
    Array.isArray(row?.chosen_path) ? row.chosen_path :
    Array.isArray(reflection?.chosenPath) ? reflection.chosenPath :
    [];

  const bestPath =
    Array.isArray(row?.best_path) ? row.best_path :
    Array.isArray(reflection?.bestPath) ? reflection.bestPath :
    ["observe", "mode", "problem_solve"];

  const stepSpine =
    Array.isArray(row?.step_spine) ? row.step_spine :
    Array.isArray(reflection?.stepSpine) ? reflection.stepSpine :
    [];

  const stepReactionTrail =
    Array.isArray(row?.step_reaction_trail) ? row.step_reaction_trail :
    Array.isArray(reflection?.stepReactionTrail) ? reflection.stepReactionTrail :
    Array.isArray(reflection?.reactionHistory) ? reflection.reactionHistory :
    [];

  const chosenGuestType = row?.chosen_guest_type || "";
  const chosenMode = row?.chosen_mode || "";
  const chosenHook = row?.chosen_hook || "";
  const actualGuestType = row?.actual_guest_type || "";
  const readCorrect = typeof row?.read_correct === "boolean" ? row.read_correct : null;
  const deliveryCorrect = typeof row?.delivery_correct === "boolean" ? row.delivery_correct : null;
  const modeStatus = row?.mode_status || "";
  const hookStatus = row?.hook_status || "";

  const fallbackChosenPathExposition = [
    `Read: chose ${chosenGuestType || "—"}${readCorrect == null ? "" : readCorrect ? " and it was correct" : " and it was wrong"}.`,
    `Mode: chose ${chosenMode || "—"}${modeStatus ? ` (${modeStatus})` : ""}.`,
    `Flash Learn: ${hookStatus ? `completed (${hookStatus})` : "—"}.`,
    `Deliver: ${deliveryCorrect == null ? "—" : deliveryCorrect ? "prompt landed correctly" : "prompt choice was off"}.`,
  ].filter(Boolean).join(" ");

  const fallbackBestPathExposition = [
    `Read: correct guest was ${actualGuestType || "—"}.`,
    modeStatus ? `Mode: target outcome was ${modeStatus === "optimal" ? "the optimal mode" : modeStatus}.` : "",
    hookStatus ? `Flash Learn: target outcome was ${hookStatus === "optimal" ? "complete flash learn" : hookStatus}.` : "",
    deliveryCorrect == null ? "" : `Deliver: ${deliveryCorrect ? "the prompt choice was correct" : "the prompt needed a stronger guest fit"}.`,
  ].filter(Boolean).join(" ");

  return {
    userId: row?.user_id || "",
    occurredAt: row?.occurred_at || null,
    performanceGrade: row?.performance_grade || "",
    chainSignal: row?.chain_signal || "",
    chainScore: row?.chain_score ?? null,
    tier: row?.tier ?? null,
    aiPerception:
      row?.ai_perception ||
      reflection?.aiPerception ||
      "",
    bottleServed:
      typeof row?.bottle_served === "boolean"
        ? row.bottle_served
        : !!reflection?.bottleServed,
    chosenGuestType,
    chosenMode,
    chosenHook,
    actualGuestType,
    readCorrect,
    deliveryCorrect,
    modeStatus,
    hookStatus,
    chosenPath,
    bestPath,
    chosenPathExposition:
      reflection?.chosenPathExposition ||
      fallbackChosenPathExposition ||
      "",
    bestPathExposition:
      reflection?.bestPathExposition ||
      fallbackBestPathExposition ||
      "",
    stepSpine,
    stepReactionTrail,
    reactionSummary:
      row?.reaction_summary && typeof row.reaction_summary === "object"
        ? row.reaction_summary
        : null,
    reflection,
  };
}

async function getManagerPerformanceModel({ force = false } = {}) {
  const { restaurantId } = getManagerBoardFilter();
  if (!restaurantId) {
    return {
      restaurantId: null,
      summary: {
        activeWaiters: 0,
        avgTotalPoints: 0,
        avgDrillPassRate: 0,
        avgEncounterPassRate: 0,
        avgChallengeSuccessRate: 0,
        avgPremiumSuccessRate: 0,
      },
      users: [],
      notes: ["No active restaurant selected."],
    };
  }

  const cached = window.__BC_MB_PERFORMANCE_MODEL__ || null;
  if (!force && isFreshManagerBoardModel(cached, MANAGER_BOARD_PERFORMANCE_CACHE_MS, restaurantId)) {
    return cached;
  }

  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [
    profilesRes,
    progressionStateRes,
    leaderboardRes,
    readinessRes,
    totalsRes,
    latestRes,
    snapshotsRes,
    encountersRes,
    messagesRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, display_name, role")
      .eq("restaurant_id", restaurantId)
      .order("display_name", { ascending: true }),
    supabase
      .from("bc_progression_state_v1")
      .select("user_id, canonical_state, updated_at")
      .eq("restaurant_id", restaurantId)
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase
      .from("bc_waiter_leaderboard_v1")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("total_points", { ascending: false })
      .order("last_activity_at", { ascending: false })
      .limit(200),
    supabase
      .from("bc_readiness_v1")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .limit(200),
    supabase
      .from("bc_totals_v1")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .limit(200),
    supabase
      .from("bc_user_latest_v1")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("latest_occurred_at", { ascending: false })
      .limit(200),
    supabase
      .from("bc_skill_snapshots_v1")
      .select("user_id, created_at, read_pct, framing_pct, delivery_pct, recovery_pct, closing_pct")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(2000),
    fetchEncounterResolutionSummaries({
      restaurantId,
      sinceIso,
      limit: 2000,
    }),
    supabase
      .from("bc_messages_v1")
      .select("sender_user_id, created_at, type, payload, body")
      .eq("restaurant_id", restaurantId)
      .in("type", ["drill_completed", "timed_challenge_completed", "timed_challenge_expired"])
      .gte("created_at", sinceIso)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

  [
    ["profiles", profilesRes],
    ["bc_progression_state_v1", progressionStateRes],
    ["bc_waiter_leaderboard_v1", leaderboardRes],
    ["bc_readiness_v1", readinessRes],
    ["bc_totals_v1", totalsRes],
    ["bc_user_latest_v1", latestRes],
    ["bc_skill_snapshots_v1", snapshotsRes],
    ["bc_encounter_resolutions_v2", encountersRes],
    ["bc_messages_v1", messagesRes],
  ].forEach(([label, res]) => {
    if (res?.error) console.warn(`[MB][PERFORMANCE] ${label} query failed`, res.error);
  });

  const profileRows = Array.isArray(profilesRes?.data) ? profilesRes.data : [];
  const progressionStateRows = Array.isArray(progressionStateRes?.data) ? progressionStateRes.data : [];
  const leaderboardRows = Array.isArray(leaderboardRes?.data) ? leaderboardRes.data : [];
  const readinessRows = Array.isArray(readinessRes?.data) ? readinessRes.data : [];
  const totalsRows = Array.isArray(totalsRes?.data) ? totalsRes.data : [];
  const latestRows = Array.isArray(latestRes?.data) ? latestRes.data : [];
  const snapshotRows = Array.isArray(snapshotsRes?.data) ? snapshotsRes.data : [];
  const encounterRows = Array.isArray(encountersRes?.data) ? encountersRes.data : [];
  const messageRows = Array.isArray(messagesRes?.data) ? messagesRes.data : [];
  let environmentProfileRows = [];

  try {
    environmentProfileRows = await loadRestaurantEnvironmentProfiles(restaurantId);
  } catch (error) {
    console.warn("[MB][PERFORMANCE] restaurant environment roster unavailable", error);
  }

  const userIds = new Set();
  const profileNameMap = new Map();
  const profileRoleMap = new Map();
  const rosterRows = [
    ...profileRows,
    ...environmentProfileRows.map((row) => ({
      user_id: row?.userId,
      display_name: row?.displayName,
      role: row?.role,
    })),
  ];

  rosterRows.forEach((row) => {
    const uid = String(row?.user_id || "");
    if (!uid || String(row?.role || "").toLowerCase() === "demo") return;
    userIds.add(uid);
    if (row?.display_name) profileNameMap.set(uid, row.display_name);
    profileRoleMap.set(uid, normalizeMembershipRole(row) || String(row?.role || "").toLowerCase() || "waiter");
  });

  [progressionStateRows, leaderboardRows, readinessRows, totalsRows, latestRows, snapshotRows, encounterRows].forEach((rows) => {
    rows.forEach((row) => {
      const uid = String(row?.user_id || "");
      if (uid) userIds.add(uid);
    });
  });
  messageRows.forEach((row) => {
    const uid = String(row?.sender_user_id || "");
    if (uid) userIds.add(uid);
  });

  const resolvedNames = await mapUserIdsToNames(Array.from(userIds));
  const nameMap = new Map();
  userIds.forEach((uid) => {
    nameMap.set(uid, firstNonEmpty(profileNameMap.get(uid), resolvedNames.get(uid), uid.slice(0, 8)));
  });

  const byUserFrom = (rows, key = "user_id") => {
    const map = new Map();
    rows.forEach((row) => {
      const uid = String(row?.[key] || "");
      if (!uid) return;
      const arr = map.get(uid) || [];
      arr.push(row);
      map.set(uid, arr);
    });
    return map;
  };

  const progressionStateByUser = byUserFrom(progressionStateRows);
  const readinessByUser = byUserFrom(readinessRows);
  const totalsByUser = byUserFrom(totalsRows);
  const latestByUser = byUserFrom(latestRows);
  const snapshotsByUser = byUserFrom(snapshotRows);
  const encountersByUser = byUserFrom(encounterRows);
  const messagesByUser = byUserFrom(messageRows, "sender_user_id");
  const leaderboardByUser = byUserFrom(leaderboardRows);
  const restaurantHasCanonicalProgression = progressionStateRows.length > 0;

  const users = Array.from(userIds).map((uid) => {
    const progressionStateRow = progressionStateByUser.get(uid)?.[0] || {};
    const leaderboardRow = leaderboardByUser.get(uid)?.[0] || {};
    const readinessRow = readinessByUser.get(uid)?.[0] || {};
    const totalsRow = totalsByUser.get(uid)?.[0] || {};
    const latestRow = latestByUser.get(uid)?.[0] || {};
    const userSnapshots = snapshotsByUser.get(uid) || [];
    const userEncounters = encountersByUser.get(uid) || [];
    const recentEncounterSummaries = userEncounters
      .slice(0, 20)
      .map((row) => normalizeEncounterSummaryRow(row));
    const userMessages = messagesByUser.get(uid) || [];
    const canonicalState =
      progressionStateRow?.canonical_state && typeof progressionStateRow.canonical_state === "object"
        ? progressionStateRow.canonical_state
        : null;
    const hasCanonicalProgression = !!canonicalState;
    const canonicalEconomy =
      canonicalState?.economy && typeof canonicalState.economy === "object"
        ? canonicalState.economy
        : {};
    const canonicalAuthority =
      canonicalState?.authority && typeof canonicalState.authority === "object"
        ? canonicalState.authority
        : {};
    const canonicalPointsRaw = Number(canonicalEconomy?.points);
    const canonicalTierRaw = firstFinite(
      canonicalAuthority?.tierToServe,
      canonicalEconomy?.tier
    );
    const canonicalPoints = Number.isFinite(canonicalPointsRaw)
      ? Math.max(0, canonicalPointsRaw)
      : null;
    const canonicalServedTier = Number.isFinite(canonicalTierRaw)
      ? Math.max(1, Math.min(3, Math.round(canonicalTierRaw)))
      : null;

    const baseSkillShape = averageSkillShape(userSnapshots);
    const baseSkillTotal = MANAGER_PERFORMANCE_SKILLS.reduce((sum, skill) => sum + Number(baseSkillShape?.[skill.key] || 0), 0);
    const baseSkillAvg = baseSkillTotal /
      MANAGER_PERFORMANCE_SKILLS.length;

    const drillRows = userMessages.filter((row) => String(row?.type || "") === "drill_completed");
    const challengeCompleted = userMessages.filter((row) => String(row?.type || "") === "timed_challenge_completed");
    const challengeExpired = userMessages.filter((row) => String(row?.type || "") === "timed_challenge_expired");
    const challengeRows = challengeCompleted.length + challengeExpired.length;

    const drillPasses = drillRows.filter((row) => {
      const repsDone = Number(row?.payload?.repsDone || 0);
      const repTarget = Number(row?.payload?.repTarget || 0);
      return repTarget > 0 && repsDone >= repTarget;
    }).length;

    const encounterPasses = userEncounters.filter((row) => {
      const grade = String(row?.performance_grade || row?.latest_grade || "").toUpperCase();
      return grade === "A" || grade === "B" || String(row?.chain_signal || "").toLowerCase() === "green" || !!row?.is_green;
    }).length;

    const encounterMastery = userEncounters.filter((row) => String(row?.performance_grade || "").toUpperCase() === "A").length;
    const premiumSuccesses = challengeCompleted.filter((row) => !!row?.payload?.premiumSuccess).length;

    const drillPassRate = drillRows.length ? drillPasses / drillRows.length : 0;
    const encounterPassRate = userEncounters.length ? encounterPasses / userEncounters.length : 0;
    const challengeSuccessRate = challengeRows ? challengeCompleted.length / challengeRows : 0;
    const premiumSuccessRate = challengeCompleted.length ? premiumSuccesses / challengeCompleted.length : 0;
    const masteryRate = userEncounters.length ? encounterMastery / userEncounters.length : baseSkillAvg / 100;

    const readinessBase = firstFinite(
      readinessRow?.readiness_score,
      readinessRow?.readiness_pct,
      latestRow?.readiness_score
    );
    const readinessFromWindow = (() => {
      const n = firstFinite(readinessRow?.last10_count, latestRow?.last10_count);
      const greens = firstFinite(readinessRow?.last10_greens, latestRow?.last10_greens);
      const yellows = firstFinite(readinessRow?.last10_yellows, latestRow?.last10_yellows);
      if (n && n > 0) {
        return Math.max(0, Math.min(1, ((greens || 0) + ((yellows || 0) * 0.5)) / n));
      }
      return null;
    })();
    const readinessLabel = firstNonEmpty(readinessRow?.readiness, latestRow?.readiness);
    const readiness = Math.max(0, Math.min(1, firstFinite(
      readinessBase != null ? (readinessBase > 1 ? readinessBase / 100 : readinessBase) : null,
      readinessFromWindow,
      readinessLabel === "STABLE" ? 0.84 : null,
      readinessLabel === "GROWING" ? 0.68 : null,
      readinessLabel === "FRAGILE" ? 0.42 : null,
      baseSkillAvg / 100
    ) || 0));

    const totalPoints = hasCanonicalProgression
      ? Math.max(0, canonicalPoints ?? 0)
      : (
          restaurantHasCanonicalProgression
            ? 0
            :
          firstFinite(
            leaderboardRow?.total_points,
            totalsRow?.total_points,
            totalsRow?.points_total,
            latestRow?.total_points,
            (baseSkillAvg / 10) + (challengeCompleted.length * 0.9) + (drillPasses * 0.4)
          ) || 0
        );

    const lastActiveAt = latestTimestamp(
      progressionStateRow?.updated_at,
      leaderboardRow?.last_activity_at,
      latestRow?.latest_occurred_at,
      userSnapshots[0]?.created_at,
      userEncounters[0]?.occurred_at,
      userMessages[0]?.created_at
    );

    const eligibilityTier = totalPoints >= 10 || readiness >= 0.8
      ? 3
      : totalPoints >= 5 || readiness >= 0.62
        ? 2
        : 1;

    const servedTier = hasCanonicalProgression
      ? Math.max(1, Math.min(3, Math.round(canonicalServedTier ?? eligibilityTier)))
      : Math.max(
          1,
          Math.min(
            3,
            Math.round(
              restaurantHasCanonicalProgression
                ? eligibilityTier
                : (firstFinite(
                    latestRow?.latest_tier,
                    leaderboardRow?.tier_to_serve,
                    leaderboardRow?.served_tier,
                    eligibilityTier
                  ) || eligibilityTier)
            )
          )
        );

    const challengeReadiness = Math.max(
      0,
      Math.min(1, (readiness * 0.45) + (encounterPassRate * 0.35) + (challengeSuccessRate * 0.20))
    );

    const skillShape = baseSkillTotal > 0
      ? baseSkillShape
      : deriveLeaderboardSkillShape({
          totalPoints,
          drillPassRate,
          encounterPassRate,
          challengeSuccessRate,
          premiumSuccessRate,
          masteryRate,
          readiness,
        });
    const extremes = getSkillExtremes(skillShape);

    return {
      userId: uid,
      displayName: nameMap.get(uid) || uid,
      role: profileRoleMap.get(uid) || "waiter",
      totalPoints,
      drillPassRate,
      drillCompletedCount: drillRows.length,
      drillPasses,
      encounterPassRate,
      encounterCount: userEncounters.length,
      challengeSuccessRate,
      challengeCompletedCount: challengeCompleted.length,
      challengeExpiredCount: challengeExpired.length,
      challengeCount: challengeRows,
      premiumSuccessRate,
      masteryRate,
      lastActiveAt,
      eligibilityTier,
      readiness,
      readinessLabel,
      servedTier,
      challengeReadiness,
      percentile: 0,
      strongestSkill: extremes.strongestSkill,
      weakestSkill: extremes.weakestSkill,
      skillShape,
      encounterSummaries: recentEncounterSummaries,
    };
  })
    .filter((user) => user.displayName)
    .sort((a, b) => (b.totalPoints - a.totalPoints) || ((new Date(b.lastActiveAt).getTime() || 0) - (new Date(a.lastActiveAt).getTime() || 0)))
    .map((user, index) => ({
      ...user,
      rank: index + 1,
      percentile: userIds.size
        ? Math.max(0, Math.min(1, (userIds.size - index) / userIds.size))
        : 0,
    }));

  return {
    restaurantId,
    loadedAt: Date.now(),
    summary: buildPerformanceSummary(users),
    users,
    notes: [],
  };
}

async function loadAssociatedManagersForRestaurant(restaurantId = null, scopeId = null) {
  const rid = String(restaurantId || "").trim();
  const sid = String(scopeId || "").trim();
  if (!rid && !sid) return [];

  const managers = new Map();
  const pendingManagerIds = new Set();
  const addManager = (row) => {
    const role = normalizeMembershipRole(row);
    if (!["single_manager", "group_manager", "enterpriser"].includes(String(role || "").toLowerCase())) return;
    const userId = String(row?.user_id || "");
    if (!userId) return;
    managers.set(userId, {
      userId,
      displayName: String(row?.display_name || "").trim() || userId.slice(0, 8),
      role,
    });
  };
  const addManagerId = (userId, role = "group_manager") => {
    const normalizedId = String(userId || "").trim();
    if (!normalizedId || managers.has(normalizedId)) return;
    pendingManagerIds.add(`${normalizedId}::${role}`);
  };

  try {
    if (rid) {
      const profileRes = await withTimeout(
        supabase
          .from("profiles")
          .select("user_id, display_name, role")
          .eq("restaurant_id", rid)
          .order("display_name", { ascending: true }),
        12000,
        "profiles.associated_managers.restaurant"
      );
      if (!profileRes?.error) {
        (profileRes.data || []).forEach(addManager);
      }
    }
  } catch (error) {
    console.warn("[LEADERBOARD] associated manager restaurant query failed", error);
  }

  try {
    if (sid) {
      const scopeRes = await withTimeout(
        supabase
          .from("profiles")
          .select("user_id, display_name, role, scope_id")
          .eq("scope_id", sid)
          .order("display_name", { ascending: true }),
        12000,
        "profiles.associated_managers.scope"
      );
      if (!scopeRes?.error) {
        (scopeRes.data || []).forEach(addManager);
      }
    }
  } catch (error) {
    console.warn("[LEADERBOARD] associated manager scope query failed", error);
  }

  const creatorUserId =
    String(appState?.restaurant?.id || "") === rid
      ? String(appState?.restaurant?.created_by || "").trim()
      : "";

  if (creatorUserId) {
    addManagerId(creatorUserId, "group_manager");
  }

  if (rid) {
    try {
      const messageRes = await withTimeout(
        supabase
          .from("bc_messages_v1")
          .select("sender_user_id, sender_role")
          .eq("restaurant_id", rid)
          .in("sender_role", ["single_manager", "group_manager", "enterpriser", "manager", "enterprise_admin"])
          .is("archived_at", null)
          .order("created_at", { ascending: false })
          .limit(200),
        12000,
        "messages.associated_managers"
      );
      if (!messageRes?.error) {
        (messageRes.data || []).forEach((row) => {
          addManagerId(row?.sender_user_id, normalizeMembershipRole(row?.sender_role || "group_manager"));
        });
      }
    } catch (error) {
      console.warn("[LEADERBOARD] associated manager message query failed", error);
    }
  }

  if (pendingManagerIds.size) {
    const ids = Array.from(pendingManagerIds).map((entry) => entry.split("::")[0]).filter(Boolean);
    const resolvedNames = await mapUserIdsToNames(ids);
    for (const userId of ids) {
      const currentName = String(resolvedNames.get(userId) || "").trim();
      if (currentName && currentName !== String(userId).slice(0, 8)) continue;
      try {
        const profile = await loadProfile(userId);
        const profileName = String(profile?.display_name || "").trim();
        if (profileName) {
          resolvedNames.set(userId, profileName);
        }
      } catch (error) {
        console.warn("[LEADERBOARD] direct manager profile lookup failed", { userId, error });
      }
    }
    Array.from(pendingManagerIds).forEach((entry) => {
      const [userId, role] = entry.split("::");
      if (!userId || managers.has(userId)) return;
      managers.set(userId, {
        userId,
        displayName: String(resolvedNames.get(userId) || "").trim() || "Manager",
        role: normalizeMembershipRole(role || "group_manager"),
      });
    });
  }

  return Array.from(managers.values()).sort((a, b) =>
    String(a.displayName || "").localeCompare(String(b.displayName || ""))
  );
}

function buildPerformanceSummary(users = []) {
  const avg = (getter) => users.length
    ? users.reduce((sum, user) => sum + Number(getter(user) || 0), 0) / users.length
    : 0;

  return {
    activeWaiters: users.filter((user) => !!user.lastActiveAt).length,
    avgTotalPoints: avg((user) => user.totalPoints),
    avgDrillPassRate: avg((user) => user.drillPassRate),
    avgEncounterPassRate: avg((user) => user.encounterPassRate),
    avgChallengeSuccessRate: avg((user) => user.challengeSuccessRate),
    avgPremiumSuccessRate: avg((user) => user.premiumSuccessRate),
  };
}

function renderManagerPerformanceOverview(summary = {}) {
  const el = document.getElementById("mbPerformanceCards");
  if (!el) return;

  const cards = [
    ["Active Waiters", summary.activeWaiters ?? 0],
    ["Avg Total Points", formatMetricNumber(summary.avgTotalPoints, 1)],
    ["Avg Drill Pass Rate", formatPercent(summary.avgDrillPassRate)],
    ["Avg Encounter Pass Rate", formatPercent(summary.avgEncounterPassRate)],
    ["Avg Challenge Success Rate", formatPercent(summary.avgChallengeSuccessRate)],
    ["Avg Premium Success Rate", formatPercent(summary.avgPremiumSuccessRate)],
  ];

  el.innerHTML = cards.map(([label, value]) => `
    <div class="mb-performance-card">
      <div class="small-text">${escapeHtml(label)}</div>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `).join("");
}

const TEAM_RESULTS_METRICS = [
  { key: "drillPassRate", label: "Drill", color: "#22c55e" },
  { key: "encounterPassRate", label: "Encounter", color: "#60a5fa" },
  { key: "challengeSuccessRate", label: "Challenge", color: "#34d399" },
  { key: "premiumSuccessRate", label: "Premium", color: "#f59e0b" },
];

function drawSingleMetricDonut(canvas, value = 0, color = "#60a5fa", options = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.32;
  const pct = Math.max(0, Math.min(1, Number(value || 0)));

  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = 22;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.arc(cx, cy, radius, -Math.PI / 2, (-Math.PI / 2) + (pct * Math.PI * 2));
  ctx.stroke();

  ctx.fillStyle = "rgba(4,7,12,0.9)";
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(String(options.centerTop || `${Math.round(pct * 100)}%`), cx, cy - 2);
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.74)";
  ctx.fillText(String(options.centerBottom || ""), cx, cy + 18);
}

function drawTeamPerformanceResultsChart(summary = {}) {
  const root = document.getElementById("mbPerformanceResultsChart");
  if (!root) return;

  const donutMetrics = [
    { ...TEAM_RESULTS_METRICS[0], value: Number(summary.avgDrillPassRate || 0), note: "Team average" },
    { ...TEAM_RESULTS_METRICS[1], value: Number(summary.avgEncounterPassRate || 0), note: "Team average" },
    { ...TEAM_RESULTS_METRICS[2], value: Number(summary.avgChallengeSuccessRate || 0), note: "Team average" },
    { ...TEAM_RESULTS_METRICS[3], value: Number(summary.avgPremiumSuccessRate || 0), note: "Team average" },
  ];

  if (!donutMetrics.some((metric) => metric.value > 0)) {
    root.innerHTML = `<div class="small-text">No team performance data yet.</div>`;
    return;
  }

  root.innerHTML = donutMetrics.map((metric, index) => `
    <div class="mb-team-results-donut-card">
      <canvas id="mbTeamResultsDonut_${index}" width="180" height="180" class="mb-team-results-donut"></canvas>
      <div class="mb-team-results-copy">
        <strong>${escapeHtml(metric.label)}</strong>
        <div class="small-text">${escapeHtml(metric.note)}</div>
      </div>
    </div>
  `).join("");

  donutMetrics.forEach((metric, index) => {
    const canvas = document.getElementById(`mbTeamResultsDonut_${index}`);
    if (!canvas) return;
    const pct = Math.max(0, Math.min(1, Number(metric.value || 0)));
    drawSingleMetricDonut(canvas, pct, metric.color, {
      centerTop: `${Math.round(pct * 100)}%`,
      centerBottom: metric.label,
    });
  });
}

function renderManagerPerformanceTable(users = []) {
  const tbody = document.getElementById("mbPerformanceRows");
  if (!tbody) return;

  tbody.innerHTML = users.map((user) => `
    <tr class="mb-user-row" data-user-id="${escapeHtml(user.userId)}">
      <td>${user.rank}</td>
      <td>
        <button
          type="button"
          class="mb-user-expand-btn"
          data-user-id="${escapeHtml(user.userId)}"
          aria-expanded="false"
        >
          <span class="mb-chevron">▶</span>
          <span class="mb-user-avatar">${escapeHtml((user.displayName || "?").slice(0, 2).toUpperCase())}</span>
          <span class="mb-user-name">${escapeHtml(user.displayName || "Unknown")}</span>
        </button>
      </td>
      <td>${formatMetricNumber(user.totalPoints, 1)}</td>
      <td>${formatPercent(user.drillPassRate)}</td>
      <td>${formatPercent(user.encounterPassRate)}</td>
      <td>${formatPercent(user.challengeSuccessRate)}</td>
      <td>${formatPercent(user.premiumSuccessRate)}</td>
      <td>${formatPercent(user.masteryRate)}</td>
      <td>${formatRelativeTime(user.lastActiveAt)}</td>
    </tr>
    <tr class="mb-user-detail-row hidden" data-user-detail-id="${escapeHtml(user.userId)}">
      <td colspan="9">
        <div class="mb-user-detail-panel">
          <div class="mb-user-detail-left">
            <div class="mb-user-detail-chart-card">
              <div class="small-text" style="margin-bottom:8px;">Current Skill Shape</div>
              <canvas id="mbUserSkillPie_${escapeHtml(user.userId)}" class="mb-user-skill-pie" width="240" height="240"></canvas>
              <div id="mbUserSkillLegend_${escapeHtml(user.userId)}" style="margin-top:12px;"></div>
            </div>
          </div>
          <div class="mb-user-detail-right">
            <div class="mb-user-metric-grid">
              <div class="mb-user-metric-card"><div class="small-text">Total Points</div><strong>${formatMetricNumber(user.totalPoints, 1)}</strong></div>
              <div class="mb-user-metric-card"><div class="small-text">Eligibility Tier</div><strong>T${user.eligibilityTier}</strong></div>
              <div class="mb-user-metric-card"><div class="small-text">Readiness</div><strong>${formatPercent(user.readiness)}</strong></div>
              <div class="mb-user-metric-card"><div class="small-text">Drill Pass</div><strong>${formatPercent(user.drillPassRate)}</strong></div>
              <div class="mb-user-metric-card"><div class="small-text">Encounter Pass</div><strong>${formatPercent(user.encounterPassRate)}</strong></div>
              <div class="mb-user-metric-card"><div class="small-text">Challenge Success</div><strong>${formatPercent(user.challengeSuccessRate)}</strong></div>
              <div class="mb-user-metric-card"><div class="small-text">Premium Success</div><strong>${formatPercent(user.premiumSuccessRate)}</strong></div>
              <div class="mb-user-metric-card"><div class="small-text">Mastery</div><strong>${formatPercent(user.masteryRate)}</strong></div>
              <div class="mb-user-metric-card"><div class="small-text">Last Active</div><strong>${escapeHtml(formatRelativeTime(user.lastActiveAt))}</strong></div>
            </div>
            <div class="mb-user-badge-row" style="margin-top:12px;">
              <span class="mb-badge">Strongest: ${escapeHtml(user.strongestSkill || "—")}</span>
              <span class="mb-badge">Weakest: ${escapeHtml(user.weakestSkill || "—")}</span>
              <span class="mb-badge">${escapeHtml(user.challengeReadiness >= 0.7 ? "Challenge Ready" : "Needs Build-Up")}</span>
              <span class="mb-badge">Readiness: ${escapeHtml(describeReadiness(user.readiness, user.readinessLabel))}</span>
            </div>
          </div>
        </div>
      </td>
    </tr>
  `).join("");
}

function wirePerformanceRowExpansion(usersById = {}) {
  document.querySelectorAll(".mb-user-expand-btn").forEach((button) => {
    if (button.__wired) return;
    button.__wired = true;
    button.addEventListener("click", async () => {
      await togglePerformanceUserDetail(button.dataset.userId, usersById);
    });
  });
}

async function togglePerformanceUserDetail(userId, usersById = {}) {
  const button = document.querySelector(`.mb-user-expand-btn[data-user-id="${CSS.escape(String(userId || ""))}"]`);
  const row = document.querySelector(`.mb-user-detail-row[data-user-detail-id="${CSS.escape(String(userId || ""))}"]`);
  if (!button || !row) return;

  const isOpen = !row.classList.contains("hidden");
  if (isOpen) {
    row.classList.add("hidden");
    button.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
    return;
  }

  closeAllPerformanceUserDetails(userId);
  row.classList.remove("hidden");
  button.classList.add("is-open");
  button.setAttribute("aria-expanded", "true");

  const user = usersById?.[userId];
  const canvas = document.getElementById(`mbUserSkillPie_${userId}`);
  const legend = document.getElementById(`mbUserSkillLegend_${userId}`);
  if (canvas && user && !canvas.__drawn) {
    drawUserSkillPieChart(canvas, user.skillShape, {
      centerTop: `T${user.eligibilityTier || 1}`,
      centerBottom: `${Math.round(Number(user.readiness || 0) * 100)}%`,
    });
    canvas.__drawn = true;
  }
  if (legend && user) {
    renderUserSkillShapeLegend(legend, user.skillShape, {
      strongestSkill: user.strongestSkill,
      weakestSkill: user.weakestSkill,
    });
  }
}

function closeAllPerformanceUserDetails(exceptUserId = null) {
  document.querySelectorAll(".mb-user-detail-row").forEach((row) => {
    if (exceptUserId && row.dataset.userDetailId === exceptUserId) return;
    row.classList.add("hidden");
  });
  document.querySelectorAll(".mb-user-expand-btn").forEach((button) => {
    if (exceptUserId && button.dataset.userId === exceptUserId) return;
    button.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
  });
}

function drawUserSkillPieChart(canvas, skillShape, options = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.28;

  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = 26;
  ctx.lineCap = "round";

  const slices = MANAGER_PERFORMANCE_SKILLS.map((skill) => ({
    ...skill,
    value: Math.max(0, Number(skillShape?.[skill.key] || 0)),
  }));
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (!total) {
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No skill data", cx, cy);
    return;
  }

  let angle = -Math.PI / 2;
  slices.forEach((slice) => {
    const nextAngle = angle + ((slice.value / total) * Math.PI * 2);
    ctx.beginPath();
    ctx.strokeStyle = slice.color;
    ctx.arc(cx, cy, radius, angle, nextAngle);
    ctx.stroke();
    angle = nextAngle;
  });

  ctx.fillStyle = "rgba(4,7,12,0.9)";
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(String(options.centerTop || ""), cx, cy - 4);
  ctx.font = "12px sans-serif";
  ctx.fillText(String(options.centerBottom || ""), cx, cy + 16);
}

function renderUserSkillShapeLegend(root, skillShape = {}, options = {}) {
  if (!root) return;

  const strongest = String(options?.strongestSkill || "").toUpperCase();
  const weakest = String(options?.weakestSkill || "").toUpperCase();

  root.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:8px;">
      ${MANAGER_PERFORMANCE_SKILLS.map((skill) => {
        const value = Math.max(0, Number(skillShape?.[skill.key] || 0));
        const isStrongest = strongest && strongest === String(skill.label || "").toUpperCase();
        const isWeakest = weakest && weakest === String(skill.label || "").toUpperCase();
        const note = isStrongest ? "Strongest" : isWeakest ? "Weakest" : "";

        return `
          <div style="display:grid; grid-template-columns:auto 1fr auto auto; gap:8px; align-items:center;">
            <span style="width:10px; height:10px; border-radius:999px; background:${escapeHtml(skill.color)};"></span>
            <span class="small-text" style="opacity:.92;">${escapeHtml(skill.label)}</span>
            <span class="small-text" style="opacity:.82;">${escapeHtml(String(value))}%</span>
            <span class="small-text" style="opacity:.7; min-width:56px; text-align:right;">${escapeHtml(note)}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderPerformanceHistorySummaryStrip(userId) {
  const strip = document.getElementById("mbHistorySummaryStrip");
  const model = window.__BC_MB_PERFORMANCE_MODEL__ || null;
  if (!strip) return;

  const user = model?.users?.find((entry) => String(entry.userId) === String(userId || ""));
  if (!user) {
    strip.innerHTML = "";
    return;
  }

  strip.innerHTML = `
    <div class="mb-history-summary-strip">
      <span class="mb-badge">${escapeHtml(user.displayName)}</span>
      <span class="mb-badge">Points: ${formatMetricNumber(user.totalPoints, 1)}</span>
      <span class="mb-badge">Readiness: ${formatPercent(user.readiness)}</span>
      <span class="mb-badge">Mastery: ${formatPercent(user.masteryRate)}</span>
      <span class="mb-badge">Last Active: ${escapeHtml(formatRelativeTime(user.lastActiveAt))}</span>
    </div>
  `;
}

function normalizeSelectionData(performanceModel) {
  const users = Array.isArray(performanceModel?.users) ? performanceModel.users : [];
  const rows = users.map((user) => {
    const selectionStatus =
      user.eligibilityTier >= 3 && user.challengeReadiness >= 0.74
        ? "Eligible"
        : user.eligibilityTier >= 2 && user.challengeReadiness >= 0.62
          ? "Reserve"
          : "Hold";

    return {
      userId: user.userId,
      displayName: user.displayName,
      eligibilityTier: user.eligibilityTier,
      readiness: user.readiness,
      servedTier: user.servedTier,
      challengeReadiness: user.challengeReadiness,
      pointsRank: user.rank,
      selectionStatus,
      selectionReason:
        selectionStatus === "Eligible"
          ? "High readiness with stable encounter quality and challenge execution."
          : selectionStatus === "Reserve"
            ? "Close to selection line but still needs cleaner consistency."
            : "Hold back until readiness and recency improve.",
      lastActiveAt: user.lastActiveAt,
    };
  });

  return {
    summary: {
      tier3EligibleCount: rows.filter((row) => row.eligibilityTier === 3).length,
      tier2EligibleCount: rows.filter((row) => row.eligibilityTier === 2).length,
      borderlineCount: rows.filter((row) => row.selectionStatus === "Reserve").length,
      notEligibleCount: rows.filter((row) => row.selectionStatus === "Hold").length,
    },
    rows,
    preview: {
      recommended: rows.filter((row) => row.selectionStatus === "Eligible").map((row) => row.userId),
      reserves: rows.filter((row) => row.selectionStatus === "Reserve").map((row) => row.userId),
      hold: rows.filter((row) => row.selectionStatus === "Hold").map((row) => row.userId),
    },
  };
}

async function loadSelectionTab() {
  const root = document.getElementById("mbSelectionPanel");
  if (!root) return;

  root.innerHTML = `<div class="card"><div class="small-text">Loading selection…</div></div>`;

  try {
    const { restaurantId } = getManagerBoardFilter();
    const cachedSelection = window.__BC_MB_SELECTION_MODEL__ || null;
    if (isFreshManagerBoardModel(cachedSelection, MANAGER_BOARD_SELECTION_CACHE_MS, restaurantId)) {
      const performanceModel = window.__BC_MB_PERFORMANCE_MODEL__ || await getManagerPerformanceModel({ force: false });
      renderSelectionTabUi(root, cachedSelection, performanceModel.users);
      return;
    }

    const performanceModel = await getManagerPerformanceModel({ force: false });
    window.__BC_MB_PERFORMANCE_MODEL__ = performanceModel;
    const model = {
      ...normalizeSelectionData(performanceModel),
      restaurantId: performanceModel.restaurantId,
      loadedAt: Date.now(),
    };
    window.__BC_MB_SELECTION_MODEL__ = model;
    renderSelectionTabUi(root, model, performanceModel.users);
  } catch (error) {
    console.error("[MB] loadSelectionTab failed", error);
    root.innerHTML = `
      <div class="card">
        <div class="small-text">Failed to load selection.</div>
        <div class="small-text" style="margin-top:6px; opacity:.75;">${escapeHtml(error?.message || String(error || "Unknown error"))}</div>
      </div>
    `;
  }
}

function renderSelectionOverview(summary = {}) {
  const root = document.getElementById("mbSelectionCards");
  if (!root) return;
  const cards = [
    ["Eligible Tier 3", summary.tier3EligibleCount ?? 0],
    ["Eligible Tier 2", summary.tier2EligibleCount ?? 0],
    ["Borderline", summary.borderlineCount ?? 0],
    ["Not Eligible", summary.notEligibleCount ?? 0],
  ];

  root.innerHTML = cards.map(([label, value]) => `
    <div class="mb-performance-card">
      <div class="small-text">${escapeHtml(label)}</div>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `).join("");
}

function renderSelectionTabUi(root, model, users) {
  if (!root) return;
  root.innerHTML = `
    <div class="mb-selection-overview card">
      <div class="mb-section-header">
        <strong>Tournament Setup & Selection</strong>
        <div class="small-text">Qualification, readiness, and selection guidance.</div>
      </div>
      <div id="mbSelectionCards" class="mb-performance-card-grid" style="margin-top:12px;"></div>
    </div>

    <div class="mb-selection-table-wrap card" style="margin-top:12px;">
      <div class="mb-section-header">
        <strong>Selection Table</strong>
        <div class="small-text">Use readiness and eligibility to identify tournament candidates.</div>
      </div>
      <div class="mb-performance-table-wrap" style="margin-top:12px;">
        <table class="mb-performance-table mb-selection-table">
          <thead>
            <tr>
              <th>Waiter</th>
              <th>Eligibility Tier</th>
              <th>Readiness</th>
              <th>Served Tier</th>
              <th>Challenge Readiness</th>
              <th>Points Rank</th>
              <th>Selection Status</th>
              <th>Selection Reason</th>
              <th>Last Active</th>
            </tr>
          </thead>
          <tbody id="mbSelectionRows"></tbody>
        </table>
      </div>
    </div>

    <div class="mb-selection-preview card" style="margin-top:12px;">
      <div class="mb-section-header">
        <strong>Auto-Select Preview</strong>
        <div class="small-text">Recommended cohort, reserves, and hold list.</div>
      </div>
      <div id="mbSelectionPreview" style="margin-top:12px;"></div>
    </div>
  `;

  renderSelectionOverview(model.summary);
  renderSelectionTable(model.rows);
  renderSelectionPreview(model.preview, users);
}

function renderSelectionTable(rows = []) {
  const tbody = document.getElementById("mbSelectionRows");
  if (!tbody) return;
  tbody.innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.displayName || "Unknown")}</td>
      <td>T${row.eligibilityTier || 1}</td>
      <td>${formatPercent(row.readiness)}</td>
      <td>T${row.servedTier || 1}</td>
      <td>${formatPercent(row.challengeReadiness)}</td>
      <td>#${row.pointsRank || "—"}</td>
      <td><span class="mb-badge">${escapeHtml(row.selectionStatus || "Hold")}</span></td>
      <td>${escapeHtml(row.selectionReason || "—")}</td>
      <td>${escapeHtml(formatRelativeTime(row.lastActiveAt))}</td>
    </tr>
  `).join("");
}

function renderSelectionPreview(preview = {}, users = []) {
  const root = document.getElementById("mbSelectionPreview");
  if (!root) return;

  const nameFor = (userId) => users.find((user) => String(user.userId) === String(userId))?.displayName || String(userId || "—");
  const groups = [
    ["Recommended Cohort", preview.recommended || []],
    ["Reserve List", preview.reserves || []],
    ["Held Back", preview.hold || []],
  ];

  root.innerHTML = `
    <div class="mb-selection-preview-grid">
      ${groups.map(([label, ids]) => `
        <div class="mb-selection-preview-card">
          <div style="font-weight:600;">${escapeHtml(label)}</div>
          <div class="small-text" style="margin-top:8px;">
            ${ids.length
              ? ids.map((id) => `<div style="padding:4px 0;">${escapeHtml(nameFor(id))}</div>`).join("")
              : `<div>No users</div>`}
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

async function loadGroupRestaurantsForPicker() {
  const pickers = [
    { selectId: "selActiveRestaurant", hintId: "activeRestaurantHint" },
    { selectId: "mbListingActiveRestaurant", hintId: "mbListingActiveRestaurantHint" },
  ]
    .map(({ selectId, hintId }) => ({
      sel: document.getElementById(selectId),
      hint: document.getElementById(hintId),
    }))
    .filter(({ sel }) => !!sel);
  if (!pickers.length) return;

  pickers.forEach(({ sel, hint }) => {
    sel.innerHTML = "";
    if (hint) hint.textContent = "Loading restaurants…";
  });

  const r = await supabase
    .from("restaurants")
    .select("id, name")
    .order("name", { ascending: true });

  if (r.error) {
    console.error("[BC] restaurants fetch failed", r.error);
    pickers.forEach(({ hint }) => {
      if (hint) hint.textContent = `⚠️ Failed to load restaurants: ${r.error.message}`;
    });
    return;
  }

  const rows = r.data || [];
  if (!rows.length) {
    pickers.forEach(({ hint }) => {
      if (hint) hint.textContent = "⚠️ No restaurants found.";
    });
    return;
  }

  pickers.forEach(({ sel }) => {
    for (const row of rows) {
      const opt = document.createElement("option");
      opt.value = row.id;
      opt.textContent = row.name || row.id.slice(0, 8) + "…";
      sel.appendChild(opt);
    }
  });

  // restore active
  const stored =
    (typeof getStoredActiveRestaurantId === "function"
      ? getStoredActiveRestaurantId(appState?.profile?.scope_id || null)
      : null) ||
    localStorage.getItem("BC_ACTIVE_RESTAURANT_ID") ||
    null;

  const active = appState.activeRestaurantId || stored || rows[0].id;
  pickers.forEach(({ sel }) => {
    sel.value = active;
  });
  appState.activeRestaurantId = active;
  window.__BC_ALLOWED_RESTAURANT_IDS__ = rows.map((x) => String(x.id || "")).filter(Boolean);
  setStoredActiveRestaurantId(appState?.profile?.scope_id || null, active);
  localStorage.setItem("BC_ACTIVE_RESTAURANT_ID", active);
  window.__BC_ACTIVE_MANAGER_RESTAURANT_ID__ = active;
  window.__BC_ACTIVE_RESTAURANT_ID__ = active;
  const activeRow = rows.find((x) => x.id === active) || null;
  if (activeRow && !appState.restaurant) appState.restaurant = activeRow;
  markActiveRestaurantReady();
  pickers.forEach(({ hint }) => {
    if (hint) hint.textContent = `✅ Active: ${activeRow?.name || String(active).slice(0, 8) + "…"}`;
  });

  console.log("[BC] picker hydrated (no scope)", { active });
  return rows;
}

async function assertRestaurantAllowedForScope(scopeId, restaurantId) {
  const sid = String(scopeId || "");
  const rid = String(restaurantId || "");
  if (!sid || !rid) return false;

  const { data, error } = await supabase
    .from("bc_scope_restaurants")
    .select("restaurant_id")
    .eq("scope_id", sid)
    .eq("restaurant_id", rid)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

async function resolveInitialRestaurantForScope(profile) {
  const role = String(profile?.role || "").toLowerCase();
  const scopeType = String(profile?.scope_type || "").toLowerCase();
  const scopeId = profile?.scope_id || null;

  // Restaurant scope (single-restaurant): authoritative is profile.restaurant_id
  if (scopeType !== "group" && scopeType !== "enterprise") {
    return profile?.restaurant_id || null;
  }

  // Group/enterprise: choose active per-scope (storage -> first allowed)
  if (!isManagerRole(role)) return null; // only managers switch restaurants
  if (!scopeId) return null;

  // 1) try stored
  let stored = null;
  try { stored = getStoredActiveRestaurantId(scopeId); } catch {}

  if (stored) {
    try {
      const ok = await assertRestaurantAllowedForScope(scopeId, stored);
      if (ok) return stored;

      // stored is invalid for this scope — clear it
      try { localStorage.removeItem(activeRestaurantStorageKey(scopeId)); } catch {}
      stored = null;
    } catch {
      // if DB check fails, don't wipe selection; still attempt to use stored
      return stored;
    }
  }

  // 2) fallback: first allowed from bc_scope_restaurants
  const { data, error } = await supabase
    .from("bc_scope_restaurants")
    .select("restaurant_id")
    .eq("scope_id", scopeId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    console.warn("[BC] resolveInitialRestaurantForScope failed", error);
    return null;
  }

  const first = data?.[0]?.restaurant_id || null;
  if (!first) return null;

  // persist per-scope so future loads are instant
  try { setStoredActiveRestaurantId(scopeId, first); } catch {}
  return first;
}

function pushCtxToPremiumIframe(source = "manual") {
  const iframe = document.querySelector("#premiumRoot iframe") || document.getElementById("premiumRootFrame");
  if (!iframe || !iframe.contentWindow) return;
  const snapshot = getParentCtxSnapshot("premium");
  const epoch = Number(snapshot.epoch || iframe.dataset?.bcEpoch || 0);
  const bcCtx = {
    source: "BC_MSG",
    v: 1,
    type: "bc_ctx",
    mode: "premium",
    userId: snapshot.userId,
    profileUserId: snapshot.profileUserId,
    progressionOwnerUserId: snapshot.progressionOwnerUserId,
    progressionOwnerRestaurantId: snapshot.progressionOwnerRestaurantId,
    restaurantId: snapshot.restaurantId,
    scopeId: snapshot.scopeId,
    scopeType: snapshot.scopeType,
    accessTier: snapshot.accessTier,
    membershipRole: snapshot.membershipRole,
    membership_role: snapshot.membership_role,
    role: snapshot.role,
    gameplayRole: snapshot.gameplayRole,
    gameplay_role: snapshot.gameplay_role,
    epoch,
    _from: source,
  };

  iframe.contentWindow.postMessage(
    bcCtx,
    window.location.origin
  );

  try {
    setSourceCtx(iframe.contentWindow, bcCtx);
    window.__BC_LAST_SOURCE_CTX__ = {
      ...bcCtx,
      at: Date.now(),
    };
  } catch {}
}

async function hydrateParentProgressionForPremiumIframe(source = "manual") {
  const snapshot = getParentCtxSnapshot("premium");
  const userId = snapshot.progressionOwnerUserId || snapshot.profileUserId || snapshot.userId || null;
  const restaurantId = snapshot.progressionOwnerRestaurantId || snapshot.restaurantId || null;

  if (!userId || !restaurantId) return false;

  try {
    await hydrateProgressionSpineFromLatestSnapshot({ userId, restaurantId });
    console.log("[BC] premium iframe progression hydrated", { source, userId, restaurantId });
    return true;
  } catch (error) {
    console.warn("[BC] premium iframe progression hydrate failed", {
      source,
      userId,
      restaurantId,
      error: error?.message || error,
    });
    return false;
  }
}

function schedulePremiumCtxPush(source = "manual", attempt = 0) {
  const iframe = document.getElementById("premiumRootFrame");
  if (!iframe?.contentWindow) return false;
  if (!appState?.session || isHardLoggedOut?.() || isLoggingOut?.()) return false;

  const ready = isPremiumIframeHealthy();

  if (ready) return true;

  if (!isParentCtxReady("premium")) return false;

  pushCtxToPremiumIframe(`${source}#${attempt}`);

  if (attempt >= 7) return false;

  window.setTimeout(() => {
    try { schedulePremiumCtxPush(source, attempt + 1); } catch {}
  }, 250 * (attempt + 1));

  return true;
}

function postToPremiumIframeSafe(type, payload = {}) {
  try {
    if (isHardLoggedOut?.()) return false;
    if (isLoggingOut?.()) return false;
    if (!getParentCtxSnapshot("premium").session) return false;

    const frame =
      document.getElementById("premiumRootFrame") ||
      document.getElementById("bcPremiumFrame");
    if (!frame || !frame.contentWindow) return false;
    const src = String(frame.getAttribute("src") || "");
    try {
      const u = new URL(src, window.location.origin);
      if (u.origin !== window.location.origin) {
        console.warn("[PARENT] post blocked (iframe not same-origin)", { type, src: u.origin });
        return false;
      }
    } catch {}

    const currentEpoch = Number(window.__BC_IFRAME_EPOCH__ || 0);
    const frameEpoch = Number(frame.dataset?.bcEpoch || 0);
    if (!currentEpoch || (frameEpoch && frameEpoch !== currentEpoch)) {
      console.warn("[PARENT] post blocked (epoch mismatch)", { type, frameEpoch, currentEpoch });
      return false;
    }

    frame.contentWindow.postMessage(
      { source: "BC_MSG", v: 1, type, ...payload, epoch: currentEpoch },
      window.location.origin
    );
    return true;
  } catch (e) {
    console.warn("[PARENT] postToPremiumIframeSafe failed", type, e);
    return false;
  }
}

function pushPremiumDrill() {
  const epoch = Number(window.__BC_IFRAME_EPOCH__ || 0);
  if (isHardLoggedOut?.() || isLoggingOut?.() || !window.appState?.session) return;
  if (!epoch) return;

  if (!window.__BC_DRILL_CONFIG__ && window.setDefaultDrillConfig) {
    window.setDefaultDrillConfig();
  }
  const drillCfg = window.__BC_DRILL_CONFIG__ || window.BC_DRILL_CONFIG || null;
  const ok1 = postToPremiumIframeSafe("drill_config", { drill: drillCfg, epoch });
  if (!ok1) return;

  const pending = window.__BC_PENDING_START_DRILL__ || window.BC_PENDING_START_DRILL;
  if (pending?.__epoch && pending.__epoch !== epoch) {
    console.warn("[DRILL] pending drill dropped (stale epoch)", pending);
    setPendingStartDrill(null);
    return;
  }

  if (pending) {
    const ok2 = postToPremiumIframeSafe("start_drill", { ...pending, epoch });
    if (ok2) setPendingStartDrill(null);
  }
}

function mountPremiumGameIframe({
  showBack = false,
  backTo = "screenManagerBoard",
  mode = "premium",
  initialScreen = null,
  url = null,
  forceRemount = false,
} = {}) {
  if (isHardLoggedOut()) {
    console.warn("[BC] premium mount blocked: hard logged out");
    return;
  }

  const root = document.getElementById("premiumRoot");
  let iframe = document.getElementById("premiumRootFrame");
  if (!root && !iframe) return;

  // ✅ Do NOT remount if already present
  const iframeSrcNow = String(iframe?.getAttribute("src") || "");
  const hasLiveGameSrc = iframeSrcNow.includes("/game/game.html");
  if (iframe && !forceRemount && hasLiveGameSrc) {
    if (isHardLoggedOut()) return;
    if (isParentCtxReady(mode || "premium")) {
      void hydrateParentProgressionForPremiumIframe("mount.existing").finally(() => {
        schedulePremiumCtxPush("mount.existing");
      });
    }
    pushPremiumDrill();
    return;
  }
  if (iframe && forceRemount && root) {
    try { iframe.remove(); } catch {}
  }

  if (root) {
    root.innerHTML = "";
    iframe = document.createElement("iframe");
    iframe.id = "premiumRootFrame";
  } else if (!iframe) {
    return;
  }
  const roleNow = String(appState?.profile?.role || "").toLowerCase();
  if (roleNow === "waiter" && appState?.profile) {
    setActiveProgressionOwner({
      user_id: appState.profile.user_id || null,
      restaurant_id: appState.profile.restaurant_id || null,
    });
  }
  const resolvedBackTo = roleNow === "waiter"
    ? "screenPremiumApp"
    : (backTo || "screenManagerBoard");

  // ✅ New iframe generation
  window.__BC_IFRAME_EPOCH__ = Date.now();
  const epoch = window.__BC_IFRAME_EPOCH__;
  const myEpoch = epoch; // capture for stale-load gating

  // ✅ Reset sender ctx map for new iframe lifetime
  window.__BC_SOURCE_CTX_MAP__ = new WeakMap();
  window.__BC_PENDING_CTX_REQ__ = null;

  iframe.dataset.bcEpoch = String(epoch); // optional but great for debugging

  iframe.src = buildGameIframeUrl({
    mode: mode || "premium",
    showBack: !!showBack,
    backTo: resolvedBackTo || "screenPremiumApp",
    initialScreen: initialScreen || null,
    urlOverride: url || null,
    epoch,
    bustCache: true,
  });
  iframe.style.width = "100%";
  iframe.style.height = "78vh";
  iframe.style.border = "0";
  iframe.style.position = "relative";
  iframe.style.zIndex = "1";
  iframe.style.pointerEvents = "auto";
  iframe.style.opacity = "0";
  iframe.style.transition = "opacity 140ms ease";

  iframe.addEventListener("load", () => {
    (async () => {
      try {
        // 🔒 ignore stale load events (hot reload / rapid remount)
        if (Number(window.__BC_IFRAME_EPOCH__ || 0) !== myEpoch) {
          console.warn("[PARENT] ignored iframe load (stale epoch)", { myEpoch, current: window.__BC_IFRAME_EPOCH__ });
          return;
        }

        if (isLoggingOut()) return;

        const live = await getLiveSessionOrNull();
        if (!live) return;
        appState.session = live;

        // demo never gets ctx
        const modeFromSrc = String(new URL(iframe.src, window.location.href).searchParams.get("mode") || "").toLowerCase();
        if (modeFromSrc === "demo") return;

        try {
          if (isParentCtxReady(modeFromSrc || "premium")) {
            await hydrateParentProgressionForPremiumIframe("iframe.load");
            schedulePremiumCtxPush("iframe.load");
          }
        } catch (e) {
          console.warn("[PARENT] bc_ctx push on iframe load failed", e);
        }

        pushPremiumDrill();
        console.log("[PARENT] premium iframe loaded ✅ (ctx/drill pushed)", { epoch: myEpoch });
      } finally {
        iframe.style.opacity = "1";
        iframe.style.pointerEvents = "auto";
      }
    })();
  });

  if (root) {
    root.style.pointerEvents = "auto";
    root.appendChild(iframe);
  }
  console.log("[BC] mounted premium iframe", { src: iframe.src, epoch });
}

async function setActiveRestaurantForGroup(restaurantId) {
  const p = appState.profile || {};
  const role = String(p.role || "").toLowerCase();
  const scopeType = String(p.scope_type || "").toLowerCase();
  const scopeId = p.scope_id || null;

  if (!isManagerRole(role)) throw new Error("Only managers can switch restaurants.");
  if (!scopeId) throw new Error("Missing scope_id on profile.");
  if (scopeType !== "group" && scopeType !== "enterprise") {
    throw new Error("Restaurant switching only allowed for group/enterprise scopes.");
  }
  if (!restaurantId) throw new Error("No restaurant selected.");

  armActiveRestaurantReadyPromise();

  // Prevent double-click / race conditions
  if (window.__BC_SWITCHING_RESTAURANT__) return;
  window.__BC_SWITCHING_RESTAURANT__ = true;

  const prev = {
    activeRestaurantId: appState.activeRestaurantId || null,
    restaurant: appState.restaurant || null,
    stored: null
  };

  // UI lock (optional but recommended)
  const btn = document.getElementById("btnSetActiveRestaurant");
  const sel = document.getElementById("selActiveRestaurant");
  try {
    if (btn) btn.disabled = true;
    if (sel) sel.disabled = true;
  } catch {}

  try {
    // 0) hard allow-check
    const ok = await assertRestaurantAllowedForScope(scopeId, restaurantId);
    if (!ok) throw new Error("Restaurant not allowed for this scope.");

    // 1) persist selection (LOCAL preference only)
    appState.activeRestaurantId = restaurantId;
    window.__BC_ACTIVE_MANAGER_RESTAURANT_ID__ = restaurantId;
    window.__BC_ACTIVE_RESTAURANT_ID__ = restaurantId;
    try {
      prev.stored = getStoredActiveRestaurantId(scopeId);
      setStoredActiveRestaurantId(scopeId, restaurantId);
    } catch {}

    const hint = document.getElementById("activeRestaurantHint");
    if (hint) hint.textContent = `Active: ${String(restaurantId).slice(0, 8)}…`;

    // 2) hydrate restaurant into parent state (authoritative for UI + ctx)
    const restaurant = await loadRestaurant(restaurantId);
    appState.restaurant = restaurant;
    markActiveRestaurantReady();
    hydrateStoredDifficultyForProfile();

    window.__BC_APP_STATE__ = window.__BC_APP_STATE__ || {};
    window.__BC_APP_STATE__.restaurant = restaurant;

    console.log("[BC] active restaurant set (group/enterprise)", {
      scopeId,
      restaurantId,
      restaurant: restaurant ? { id: restaurant.id, name: restaurant.name } : null
    });

    // 3) optional: only remount game if play screen visible
    try {
      const playVisible =
        !document.getElementById("screenPlay")?.classList.contains("hidden") ||
        !document.getElementById("screenPremiumApp")?.classList.contains("hidden");
      if (playVisible) mountPremiumGameIframe();
    } catch {}

  } catch (e) {
    // rollback (so you can't end up in a broken/bogus state)
    appState.activeRestaurantId = prev.activeRestaurantId;
    appState.restaurant = prev.restaurant;

    try {
      if (prev.activeRestaurantId) setStoredActiveRestaurantId(scopeId, prev.activeRestaurantId);
      else localStorage.removeItem(activeRestaurantStorageKey(appState?.profile?.scope_id || null));
    } catch {}

    const hint = document.getElementById("activeRestaurantHint");
    if (hint) hint.textContent = prev.activeRestaurantId
      ? `Active: ${String(prev.activeRestaurantId).slice(0, 8)}…`
      : "";

    console.error("[BC] setActiveRestaurantForGroup failed (rolled back)", e);
    throw e;
  } finally {
    window.__BC_SWITCHING_RESTAURANT__ = false;
    try {
      if (btn) btn.disabled = false;
      if (sel) sel.disabled = false;
    } catch {}
  }
}

async function ensureActiveRestaurantReady() {
  const p = appState.profile || {};
  const scopeType = String(p.scope_type || "").toLowerCase();

  // group/enterprise: must have active restaurant chosen & allowed
  if (scopeType === "group" || scopeType === "enterprise") {
    const rid = window.getActiveRestaurantId?.() || null;
    if (!rid) {
      throw new Error("Active restaurant not set.");
    }
  } else {
    // restaurant scope: must have profile.restaurant_id
    if (!p.restaurant_id) throw new Error("Profile missing restaurant_id.");
  }
}

function getManagerBoardFilter() {
  const snapshot = getParentCtxSnapshot("premium");
  const profile = snapshot.profile || {};
  const caps = getPremiumRoleCapabilities(profile);
  const restaurantId = getManagerActiveRestaurantId() || snapshot.activeRestaurantId || null;

  return {
    role: normalizeMembershipRole(profile),
    caps,
    isManager: !!caps.canAccessManagerBoard,
    restaurantId,
    canAct: !!restaurantId && canActOnRestaurant(profile, profile, restaurantId),
    parentSnapshot: snapshot,
  };
}

function requireManagerRestaurantId(restaurantId = null) {
  const rid = String(restaurantId || getManagerActiveRestaurantId() || "");
  if (!rid) throw new Error("Active restaurant not set.");
  return rid;
}

function resetManagerBoardScopedState() {
  window.__BC_MB_MESSAGES__ = [];
  window.__BC_MESSENGER_ROWS__ = [];
  window.__BC_MB_THREADS__ = [];
  window.__BC_MB_INVITES__ = [];
  window.__BC_MB_STAFF_ROWS__ = [];
  window.__BC_MB_TIMED_CHALLENGE_ROWS__ = [];
  window.__BC_MB_LAST_TIMED_CHALLENGE_RESULT__ = null;
  window.__BC_MB_LAST_DRILL_ASSIGNMENT__ = null;
  window.__BC_MB_LAST_DRILL_COMPLETION__ = null;
  window.__BC_GROUP_MANAGER_METRICS__ = null;
  window.__BC_GROUP_RESTAURANT_COMPARISON_ROWS__ = [];
}

function setManagerBoardInvites(rows) {
  window.__BC_MB_INVITES__ = Array.isArray(rows) ? rows : [];
}

function getManagerBoardInvites() {
  return Array.isArray(window.__BC_MB_INVITES__)
    ? window.__BC_MB_INVITES__
    : [];
}

function getAllowedRestaurantRows() {
  return Array.isArray(window.__BC_ALLOWED_RESTAURANT_ROWS__)
    ? window.__BC_ALLOWED_RESTAURANT_ROWS__
    : [];
}

function getAllowedRestaurantIds() {
  return Array.isArray(window.__BC_ALLOWED_RESTAURANT_IDS__)
    ? window.__BC_ALLOWED_RESTAURANT_IDS__
    : [];
}

function getAllowedRestaurantName(restaurantId) {
  const rid = String(restaurantId || "");
  if (!rid) return "-";

  const row = getAllowedRestaurantRows().find((x) => {
    const id = String(x?.id || x?.restaurant_id || "");
    return id === rid;
  });

  return row?.name || row?.restaurant_name || `Restaurant ${rid.slice(0, 8)}`;
}

function renderParentStateDebugCard() {
  let root = document.getElementById("mbParentStateCard");
  if (root) root.remove();
}
window.renderParentStateDebugCard = renderParentStateDebugCard;

function renderManagerGameplayAdjustmentsPanel() {
  const root = document.getElementById("mbGameplayAdjustmentsPanel");
  if (!root) return;

  const currentDifficulty = getCurrentDifficultyValue();
  const currentLabel = getCurrentDifficultyLabel();
  const restaurantName = appState?.restaurant?.name || appState?.restaurant?.id || "Current restaurant";
  const currentTier =
    Number(appState?.difficulty) || currentDifficulty;

  root.innerHTML = `
    <div class="card" style="padding:12px; display:flex; flex-direction:column; gap:12px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <strong>Gameplay Adjustments</strong>
        <span class="small-text" style="opacity:.8;">Manager board</span>
      </div>

      <div class="small-text" style="opacity:.82;">
        Adjust the current restaurant’s live encounter difficulty. This saves for the selected user and restaurant.
      </div>

      <div class="card" style="padding:12px; display:flex; flex-direction:column; gap:10px;">
        <div style="font-weight:600;">Difficulty</div>
        <div class="row" style="gap:8px; flex-wrap:wrap;">
          <button id="mbGameplayDifficultyEasy" class="btn-ghost" type="button">Easy</button>
          <button id="mbGameplayDifficultyMedium" class="btn-ghost" type="button">Medium</button>
          <button id="mbGameplayDifficultyHard" class="btn-ghost" type="button">Hard</button>
        </div>
        <div id="mbGameplayDifficultyStatus" class="small-text" style="opacity:.85;"></div>
      </div>

      <div class="card" style="padding:12px; display:flex; flex-direction:column; gap:8px;">
        <div style="font-weight:600;">Current gameplay rules</div>
        <div id="mbGameplayStateSummary" class="small-text" style="opacity:.86; display:grid; gap:6px;"></div>
      </div>
    </div>
  `;

  const stateSummary = document.getElementById("mbGameplayStateSummary");
  if (stateSummary) {
    stateSummary.innerHTML = [
      `<div><b>Restaurant:</b> ${escapeHtml(restaurantName)}</div>`,
      `<div><b>Current difficulty:</b> ${escapeHtml(currentLabel)}</div>`,
      `<div><b>Live tier authority:</b> T${escapeHtml(String(currentTier || 1))}</div>`,
      `<div><b>Tones:</b> guide, charm, authority</div>`,
      `<div><b>Hold:</b> unlocks at Tier 2</div>`,
      `<div><b>Pivot:</b> unlocks at Tier 3</div>`,
    ].join("");
  }

  const statusEl = document.getElementById("mbGameplayDifficultyStatus");
  if (statusEl) {
    statusEl.textContent = `Current selection: ${currentLabel}`;
  }

  const setActive = () => {
    const current = getCurrentDifficultyValue();
    document.getElementById("mbGameplayDifficultyEasy")?.classList.toggle("active", current === 1);
    document.getElementById("mbGameplayDifficultyMedium")?.classList.toggle("active", current === 2);
    document.getElementById("mbGameplayDifficultyHard")?.classList.toggle("active", current === 3);
    const status = document.getElementById("mbGameplayDifficultyStatus");
    if (status) status.textContent = `Current selection: ${getCurrentDifficultyLabel()}`;
  };

  setActive();
  wireManagerGameplayAdjustmentsPanel();
}
window.renderManagerGameplayAdjustmentsPanel = renderManagerGameplayAdjustmentsPanel;

function wireManagerGameplayAdjustmentsPanel() {
  const bind = (id, value) => {
    const btn = document.getElementById(id);
    if (!btn || btn.__bcBound) return;
    btn.__bcBound = true;
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setCurrentDifficultyValue(value);
    });
  };

  bind("mbGameplayDifficultyEasy", 1);
  bind("mbGameplayDifficultyMedium", 2);
  bind("mbGameplayDifficultyHard", 3);
}
window.wireManagerGameplayAdjustmentsPanel = wireManagerGameplayAdjustmentsPanel;

function getManagerRitualStatusStaffOptions() {
  const staffRows = Array.isArray(window.__BC_MB_STAFF_ROWS__) ? window.__BC_MB_STAFF_ROWS__ : [];
  const currentUserId = String(appState?.session?.user?.id || appState?.session?.userId || "");

  if (staffRows.length) {
    return staffRows
      .map((row) => {
        const role = String(row?.role || "").toLowerCase();
        const userId = String(row?.user_id || "").trim();
        if (!userId || role === "demo") return null;

        const displayName = String(row?.display_name || "").trim();
        const label = displayName || userId;
        return {
          userId,
          label: currentUserId && userId === currentUserId ? `${label} (you)` : label,
        };
      })
      .filter((x) => x?.userId)
      .sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));
  }

  return getManagerWaiterOptions();
}

async function loadManagerRitualStatusStaffOptionsFromDb(restaurantId) {
  const rid = String(restaurantId || "").trim();
  if (!rid) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, role, created_at")
    .eq("restaurant_id", rid)
    .order("created_at", { ascending: true });

  if (error || !Array.isArray(data) || !data.length) {
    return [];
  }

  window.__BC_MB_STAFF_ROWS__ = data;
  return getManagerRitualStatusStaffOptions();
}

function renderManagerRitualStatusSelectOptions(selectEl, options = {}) {
  if (!selectEl) return;

  const waiterOptions = getManagerRitualStatusStaffOptions();
  const placeholder = String(options.placeholder || "Select staff member");
  const preferredUserId = String(
    options.selectedUserId ||
    window.__BC_MB_RITUAL_STATUS_USER_ID__ ||
    window.__BC_MB_ACTIVE_THREAD_USER_ID__ ||
    ""
  );

  const rows = [
    `<option value="">${escapeHtml(placeholder)}</option>`,
    ...waiterOptions.map((opt) => {
      const selected = preferredUserId && String(opt.userId) === preferredUserId ? "selected" : "";
      return `<option value="${escapeHtml(opt.userId)}" ${selected}>${escapeHtml(opt.label)}</option>`;
    }),
  ];

  selectEl.innerHTML = rows.join("");
}

function getManagerRitualStatusWindowStartIso() {
  const now = new Date();
  const zaNow = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Johannesburg" }));
  const startZA = new Date(zaNow);
  startZA.setHours(0, 0, 0, 0);
  return startZA.toISOString();
}

async function fetchRitualStatusForStaffMember({ userId, restaurantId } = {}) {
  const uid = String(userId || "").trim();
  const rid = String(restaurantId || getManagerActiveRestaurantId() || "").trim();
  if (!uid || !rid) {
    return {
      ok: false,
      doneToday: false,
      error: "missing_target",
      latestOccurredAt: null,
      windowStartIso: null,
    };
  }

  const { data, error } = await supabase
    .from("bc_event_log")
    .select("occurred_at")
    .eq("event_type", "ritual_completed")
    .eq("user_id", uid)
    .eq("restaurant_id", rid)
    .gte("occurred_at", getManagerRitualStatusWindowStartIso())
    .order("occurred_at", { ascending: false })
    .limit(1);

  if (error) {
    return {
      ok: false,
      doneToday: false,
      error: error.message || String(error),
      latestOccurredAt: null,
      windowStartIso: getManagerRitualStatusWindowStartIso(),
    };
  }

  const latestOccurredAt = Array.isArray(data) && data.length ? data[0]?.occurred_at || null : null;
  return {
    ok: true,
    doneToday: !!latestOccurredAt,
    latestOccurredAt,
    windowStartIso: getManagerRitualStatusWindowStartIso(),
  };
}

async function renderManagerBoardOverviewRitualStatusCard(options = {}) {
  const root = document.getElementById("mbOverviewRitualStatus");
  if (!root) return;

  const rid = String(getManagerActiveRestaurantId() || appState?.activeRestaurantId || appState?.profile?.restaurant_id || "");
  let staffOptions = getManagerRitualStatusStaffOptions();
  if (!staffOptions.length && rid) {
    staffOptions = await loadManagerRitualStatusStaffOptionsFromDb(rid);
  }
  const fallbackSelected =
    String(window.__BC_MB_RITUAL_STATUS_USER_ID__ || window.__BC_MB_ACTIVE_THREAD_USER_ID__ || staffOptions[0]?.userId || "");
  const selectedUserId = String(options.selectedUserId || fallbackSelected || "");
  window.__BC_MB_RITUAL_STATUS_USER_ID__ = selectedUserId;

  if (!staffOptions.length) {
    root.innerHTML = `
      <div class="card" style="padding:12px; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <strong>Waiter Progress</strong>
          <span class="small-text" style="opacity:.8;">Overview</span>
        </div>
        <div class="small-text" style="opacity:.8;">No staff members available for progress checks.</div>
      </div>
    `;
    return;
  }

  const statusTone = {
    border: "rgba(255,255,255,0.10)",
    bg: "linear-gradient(180deg, rgba(16,18,24,0.96), rgba(13,15,20,0.96))",
    badgeBg: "rgba(255,255,255,0.10)",
    badgeText: "#e5e7eb",
  };

  root.innerHTML = `
    <div class="card" style="padding:12px; display:flex; flex-direction:column; gap:10px; border:1px solid ${statusTone.border}; background:${statusTone.bg};">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <strong>Waiter Progress</strong>
        <span class="small-text" style="opacity:.9; padding:3px 8px; border-radius:999px; background:${statusTone.badgeBg}; color:${statusTone.badgeText}; text-transform:uppercase; letter-spacing:.04em;">Overview</span>
      </div>
      <div class="small-text" style="opacity:.82;">
        Check whether a waiter has completed today’s ritual in the current restaurant.
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <select id="mbRitualStatusStaffSelect" class="input" style="min-width:240px;"></select>
        <button id="mbRitualStatusRefresh" class="btn-ghost" type="button">Refresh</button>
        <span id="mbRitualStatusBadge" class="small-text" style="padding:3px 8px; border-radius:999px; background:rgba(255,255,255,0.10);">Loading…</span>
      </div>
      <div id="mbRitualStatusDetails" class="small-text" style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px 12px;"></div>
    </div>
  `;

  const select = document.getElementById("mbRitualStatusStaffSelect");
  const refreshBtn = document.getElementById("mbRitualStatusRefresh");
  const badgeEl = document.getElementById("mbRitualStatusBadge");
  const detailsEl = document.getElementById("mbRitualStatusDetails");

  renderManagerRitualStatusSelectOptions(select, { selectedUserId });

  const paint = (result = {}) => {
    const doneToday = !!result?.doneToday;
    const latestOccurredAt = result?.latestOccurredAt || null;
    const windowStartIso = result?.windowStartIso || null;
    if (badgeEl) {
      badgeEl.textContent = doneToday ? "Completed today" : "Not completed";
      badgeEl.style.background = doneToday ? "rgba(62,184,122,0.18)" : "rgba(232,170,64,0.18)";
      badgeEl.style.color = doneToday ? "#b8f1cf" : "#ffe1a8";
    }
    if (detailsEl) {
      detailsEl.innerHTML = `
        <div><b>Staff member:</b> ${escapeHtml(select?.selectedOptions?.[0]?.textContent || selectedUserId || "-")}</div>
        <div><b>Restaurant:</b> ${escapeHtml(getAllowedRestaurantName(rid) || "-")}</div>
        <div><b>Checked from:</b> ${escapeHtml(windowStartIso ? new Date(windowStartIso).toLocaleString() : "—")}</div>
        <div><b>Last ritual:</b> ${escapeHtml(latestOccurredAt ? new Date(latestOccurredAt).toLocaleString() : "—")}</div>
      `;
    }
  };

  const load = async (userId = selectedUserId) => {
    if (badgeEl) {
      badgeEl.textContent = "Checking…";
      badgeEl.style.background = "rgba(255,255,255,0.10)";
      badgeEl.style.color = "#e5e7eb";
    }
    const result = await fetchRitualStatusForStaffMember({ userId, restaurantId: rid });
    window.__BC_MB_RITUAL_STATUS_LAST_RESULT__ = {
      userId,
      restaurantId: rid,
      ...result,
      loadedAt: Date.now(),
    };
    paint(result);
    return result;
  };

  if (select && !select.__bcRitualStatusBound) {
    select.__bcRitualStatusBound = true;
    select.addEventListener("change", async () => {
      const nextUserId = String(select.value || "").trim();
      window.__BC_MB_RITUAL_STATUS_USER_ID__ = nextUserId;
      await load(nextUserId);
    });
  }

  if (refreshBtn && !refreshBtn.__bcRitualStatusBound) {
    refreshBtn.__bcRitualStatusBound = true;
    refreshBtn.addEventListener("click", async () => {
      await load(String(select?.value || selectedUserId || ""));
    });
  }

  await load(selectedUserId);
}

function setGroupManagerMetrics(metrics) {
  window.__BC_GROUP_MANAGER_METRICS__ = metrics || {
    restaurantsCount: 0,
    pendingInvitesCount: 0,
    recentTimedChallengesCount: 0,
    recentDrillCompletionsCount: 0,
  };
}

function getGroupManagerMetrics() {
  return window.__BC_GROUP_MANAGER_METRICS__ || {
    restaurantsCount: 0,
    pendingInvitesCount: 0,
    recentTimedChallengesCount: 0,
    recentDrillCompletionsCount: 0,
  };
}

function setGroupRestaurantComparisonRows(rows) {
  window.__BC_GROUP_RESTAURANT_COMPARISON_ROWS__ = Array.isArray(rows) ? rows : [];
}

function getGroupRestaurantComparisonRows() {
  return Array.isArray(window.__BC_GROUP_RESTAURANT_COMPARISON_ROWS__)
    ? window.__BC_GROUP_RESTAURANT_COMPARISON_ROWS__
    : [];
}

async function loadGroupManagerMetrics() {
  const profile = appState?.profile || {};
  const caps = getPremiumRoleCapabilities(profile);

  if (!caps.canManageMultipleRestaurants) {
    return {
      restaurantsCount: 0,
      pendingInvitesCount: 0,
      recentTimedChallengesCount: 0,
      recentDrillCompletionsCount: 0,
    };
  }

  const restaurantIds = getAllowedRestaurantIds();
  if (!restaurantIds.length) {
    return {
      restaurantsCount: 0,
      pendingInvitesCount: 0,
      recentTimedChallengesCount: 0,
      recentDrillCompletionsCount: 0,
    };
  }

  const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [invitesRes, messagesRes] = await Promise.all([
    withTimeout(
      supabase
        .from("restaurant_invites")
        .select("restaurant_id,status")
        .in("restaurant_id", restaurantIds),
      12000,
      "groupMetrics.invites"
    ),
    withTimeout(
      supabase
        .from("bc_messages_v1")
        .select("restaurant_id,type,created_at")
        .in("restaurant_id", restaurantIds)
        .in("type", ["timed_challenge", "timed_challenge_completed", "timed_challenge_expired", "drill_completed"])
        .gte("created_at", sinceIso),
      12000,
      "groupMetrics.messages"
    ),
  ]);

  if (invitesRes.error) throw invitesRes.error;
  if (messagesRes.error) throw messagesRes.error;

  const inviteRows = invitesRes.data || [];
  const messageRows = messagesRes.data || [];

  return {
    restaurantsCount: restaurantIds.length,
    pendingInvitesCount: inviteRows.filter((x) => String(x?.status || "") === "pending").length,
    recentTimedChallengesCount: messageRows.filter((x) => {
      const t = String(x?.type || "");
      return t === "timed_challenge" || t === "timed_challenge_completed" || t === "timed_challenge_expired";
    }).length,
    recentDrillCompletionsCount: messageRows.filter((x) => String(x?.type || "") === "drill_completed").length,
  };
}

async function loadGroupManagerRestaurantComparisonRows() {
  const profile = appState?.profile || {};
  const caps = getPremiumRoleCapabilities(profile);

  if (!caps.canManageMultipleRestaurants) return [];

  const restaurantRows = getAllowedRestaurantRows();
  const restaurantIds = restaurantRows.map((x) => String(x?.id || "")).filter(Boolean);
  if (!restaurantIds.length) return [];

  const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [invitesRes, messagesRes] = await Promise.all([
    withTimeout(
      supabase
        .from("restaurant_invites")
        .select("restaurant_id,status")
        .in("restaurant_id", restaurantIds),
      12000,
      "groupComparison.invites"
    ),
    withTimeout(
      supabase
        .from("bc_messages_v1")
        .select("restaurant_id,type,created_at")
        .in("restaurant_id", restaurantIds)
        .in("type", ["timed_challenge", "timed_challenge_completed", "timed_challenge_expired", "drill_completed"])
        .gte("created_at", sinceIso),
      12000,
      "groupComparison.messages"
    ),
  ]);

  if (invitesRes.error) throw invitesRes.error;
  if (messagesRes.error) throw messagesRes.error;

  const inviteRows = invitesRes.data || [];
  const messageRows = messagesRes.data || [];

  return restaurantRows.map((row) => {
    const rid = String(row?.id || "");
    const name = row?.name || `Restaurant ${rid.slice(0, 8)}`;

    const pendingInvites = inviteRows.filter(
      (x) => String(x?.restaurant_id || "") === rid && String(x?.status || "") === "pending"
    ).length;

    const timedChallengeActivity = messageRows.filter((x) => {
      const t = String(x?.type || "");
      return (
        String(x?.restaurant_id || "") === rid &&
        (t === "timed_challenge" || t === "timed_challenge_completed" || t === "timed_challenge_expired")
      );
    }).length;

    const drillCompletions = messageRows.filter(
      (x) => String(x?.restaurant_id || "") === rid && String(x?.type || "") === "drill_completed"
    ).length;

    return {
      restaurantId: rid,
      name,
      pendingInvites,
      timedChallengeActivity,
      drillCompletions,
      isActive: String(getManagerActiveRestaurantId() || "") === rid,
    };
  });
}

function resetManagerMessengerState(opts = {}) {
  const keepStatus = !!opts.keepStatus;

  setActiveManagerThreadState({ userId: "", rows: [] });
  window.__BC_MB_ACTIVE_THREAD_EMAIL__ = null;
  window.__BC_MB_ACTIVE_THREAD_RESTAURANT_ID__ = null;
  window.__BC_MB_THREADS__ = [];
  window.__BC_MB_MESSAGES__ = [];
  window.__BC_MESSENGER_ROWS__ = [];

  const threadTitle = document.getElementById("mbThreadTitle");
  if (threadTitle) threadTitle.textContent = "Select a waiter";

  const threadMeta = document.getElementById("mbThreadMeta");
  if (threadMeta) threadMeta.textContent = "";

  const list = document.getElementById("mbThreadList");
  if (list) list.innerHTML = "";

  const feed = document.getElementById("mbThreadMessages");
  if (feed) {
    feed.innerHTML = `
      <div class="small-text" style="opacity:.75;">
        Select a waiter thread in this restaurant to assign a timed challenge.
      </div>
    `;
  }

  const timeline = document.getElementById("mbThreadTimelinePanel");
  if (timeline) {
    timeline.innerHTML = `
      <div style="font-weight:600;">Thread Snapshot</div>
      <div class="small-text" style="margin-top:6px; opacity:.75;">
        Select a waiter to view the latest objective and performance reflection.
      </div>
    `;
  }

  const emptyEl = document.getElementById("mbThreadEmpty");
  if (emptyEl) emptyEl.style.display = "none";

  if (!keepStatus) {
    const status = mbEl("mbInstrStatus");
    if (status) status.textContent = "";
  }
}

function managerThreadExistsForCurrentRestaurant(userId) {
  const uid = String(userId || "");
  if (!uid) return false;

  const threads = Array.isArray(window.__BC_MB_THREADS__)
    ? window.__BC_MB_THREADS__
    : [];

  return threads.some((t) => String(t?.userId || "") === uid);
}

function reconcileManagerMessengerSelection() {
  const activeUserId = String(window.__BC_MB_ACTIVE_THREAD_USER_ID__ || "");
  if (!activeUserId) return;

  if (!managerThreadExistsForCurrentRestaurant(activeUserId)) {
    resetManagerMessengerState({ keepStatus: true });
  }
}

function getScopeIdSafe() {
  return (
    window.appState?.profile?.scope_id ||
    window.appState?.profile?.group_id ||
    null
  );
}

const FREE_MANAGER_MESSAGES_PER_DAY = 2;

function getLocalDayIsoRange(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

async function getFreeMessageUsageToday({ senderUserId = null } = {}) {
  const userId = String(senderUserId || appState?.session?.user?.id || appState?.session?.userId || "").trim();
  if (!userId) {
    return {
      used: 0,
      remaining: FREE_MANAGER_MESSAGES_PER_DAY,
      limit: FREE_MANAGER_MESSAGES_PER_DAY,
    };
  }

  const { startIso, endIso } = getLocalDayIsoRange();
  const { count, error } = await supabase
    .from("bc_messages_v1")
    .select("id", { count: "exact", head: true })
    .eq("sender_user_id", userId)
    .eq("type", "instruction")
    .is("archived_at", null)
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  if (error) throw error;

  const used = Math.max(0, Number(count || 0));
  return {
    used,
    remaining: Math.max(0, FREE_MANAGER_MESSAGES_PER_DAY - used),
    limit: FREE_MANAGER_MESSAGES_PER_DAY,
  };
}

async function refreshManagerMessageQuotaUi() {
  const quotaEl = mbEl("mbInstrQuota");
  const sendBtn = mbEl("mbInstrSend");
  if (!quotaEl && !sendBtn) return null;

  try {
    const quota = await getFreeMessageUsageToday();
    window.__BC_MANAGER_MESSAGE_QUOTA__ = quota;

    if (quotaEl) {
      quotaEl.textContent = quota.remaining > 0
        ? `${quota.remaining} free messages left today`
        : "Daily free message limit reached";
    }

    if (sendBtn) {
      const blocked = quota.remaining <= 0;
      sendBtn.disabled = blocked;
      sendBtn.style.opacity = blocked ? ".6" : "1";
      sendBtn.style.cursor = blocked ? "not-allowed" : "";
      sendBtn.title = blocked ? "Daily free message limit reached" : "Send message";
    }

    return quota;
  } catch (error) {
    console.warn("[MESSENGER QUOTA] refresh failed", error);
    if (quotaEl) quotaEl.textContent = "Could not load message limit.";
    return null;
  }
}

function mbEl(id) {
  return document.getElementById(id);
}
window.__BC_MB_THREADS__ = [];
window.__BC_MB_THREADS_ALL__ = [];
window.__BC_MB_ACTIVE_THREAD_USER_ID__ = null;
window.__BC_MB_RITUAL_STATUS_USER_ID__ = "";
window.__BC_MB_RITUAL_STATUS_LAST_RESULT__ = null;
window.__BC_MB_ACTIVE_THREAD_ROWS__ = [];
window.__MB_LAST_MESSAGES__ = [];
window.__BC_MB_PEOPLE_SEARCH__ = "";
window.__BC_MB_MESSENGER_SEARCH__ = "";

function setActiveManagerThreadState({ userId = "", rows = [] } = {}) {
  window.__BC_MB_ACTIVE_THREAD_USER_ID__ = String(userId || "");
  window.__BC_MB_ACTIVE_THREAD_ROWS__ = Array.isArray(rows) ? rows : [];
  setActiveProgressionOwner({
    user_id: String(userId || "") || null,
    restaurant_id:
      window.getActiveRestaurantId?.() ||
      appState?.activeRestaurantId ||
      appState?.profile?.restaurant_id ||
      null,
  });
}

function normalizeManagerBoardSearchTerm(value = "") {
  return String(value || "").trim().toLowerCase();
}

function getManagerPeopleSearchTerm() {
  return normalizeManagerBoardSearchTerm(
    window.__BC_MB_PEOPLE_SEARCH__ || document.getElementById("mbPeopleSearch")?.value || ""
  );
}

function getManagerMessengerSearchTerm() {
  return normalizeManagerBoardSearchTerm(
    window.__BC_MB_MESSENGER_SEARCH__ || document.getElementById("mbMessengerSearch")?.value || ""
  );
}

function filterManagerStaffRows(rows = [], searchTerm = "") {
  const term = normalizeManagerBoardSearchTerm(searchTerm);
  if (!term) return Array.isArray(rows) ? rows : [];

  return (Array.isArray(rows) ? rows : []).filter((row) => {
    const haystack = [
      row?.display_name,
      row?.user_id,
      row?.role,
      getDisplayRoleLabel(row?.role),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });
}

function filterManagerThreads(threads = [], nameMap = {}, searchTerm = "") {
  const term = normalizeManagerBoardSearchTerm(searchTerm);
  if (!term) return Array.isArray(threads) ? threads : [];

  return (Array.isArray(threads) ? threads : []).filter((thread) => {
    const label = String(thread?.title || userLabel(thread?.userId, nameMap) || "");
    const preview = String(thread?.latestBody || "");
    const type = String(thread?.latestType || "");
    const userId = String(thread?.userId || "");
    const haystack = `${label} ${preview} ${type} ${userId}`.toLowerCase();
    return haystack.includes(term);
  });
}

function renderManagerThreadList(threads = [], nameMap = {}) {
  const listEl = mbEl("mbThreadList");
  const emptyEl = mbEl("mbThreadEmpty");
  if (!listEl || !emptyEl) return;

  const filtered = filterManagerThreads(threads, nameMap, getManagerMessengerSearchTerm());
  window.__BC_MB_THREADS__ = filtered;

  listEl.innerHTML = filtered.map((t) => renderManagerThreadListItem(t, nameMap)).join("");
  emptyEl.style.display = filtered.length ? "none" : "block";
  emptyEl.textContent = getManagerMessengerSearchTerm()
    ? "No threads match your search."
    : "No waiter threads yet.";

  if (!filtered.length) {
    setActiveManagerThreadState({ userId: "", rows: [] });
    safeCall("renderManagerActiveThread", () => renderManagerActiveThread(nameMap));
    return;
  }

  const activeUserId = String(window.__BC_MB_ACTIVE_THREAD_USER_ID__ || "");
  const stillVisible = filtered.some((thread) => String(thread?.userId || "") === activeUserId);
  if (!stillVisible) {
    setActiveManagerThreadState({
      userId: filtered[0]?.userId || "",
      rows: filtered[0]?.rows || [],
    });
  }
}

function wireManagerBoardSearches() {
  const peopleSearch = mbEl("mbPeopleSearch");
  const peopleClear = mbEl("mbPeopleSearchClear");
  if (peopleSearch && !peopleSearch.__wired) {
    peopleSearch.__wired = true;
    peopleSearch.addEventListener("input", () => {
      window.__BC_MB_PEOPLE_SEARCH__ = String(peopleSearch.value || "");
      loadManagerBoardMembers().catch(console.error);
    });
    peopleSearch.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!peopleSearch.value) return;
      event.preventDefault();
      peopleSearch.value = "";
      window.__BC_MB_PEOPLE_SEARCH__ = "";
      loadManagerBoardMembers().catch(console.error);
    });
  }
  if (peopleClear && !peopleClear.__wired) {
    peopleClear.__wired = true;
    peopleClear.addEventListener("click", () => {
      if (peopleSearch) peopleSearch.value = "";
      window.__BC_MB_PEOPLE_SEARCH__ = "";
      loadManagerBoardMembers().catch(console.error);
      peopleSearch?.focus();
    });
  }

  const messengerSearch = mbEl("mbMessengerSearch");
  const messengerClear = mbEl("mbMessengerSearchClear");
  if (messengerSearch && !messengerSearch.__wired) {
    messengerSearch.__wired = true;
    const runMessengerFilter = async () => {
      window.__BC_MB_MESSENGER_SEARCH__ = String(messengerSearch.value || "");
      const threads = Array.isArray(window.__BC_MB_THREADS_ALL__) ? window.__BC_MB_THREADS_ALL__ : [];
      const nameMap = await mapUserIdsToNames(threads.map((thread) => thread.userId));
      renderManagerThreadList(threads, nameMap);
      safeCall("renderManagerActiveThread", () => renderManagerActiveThread(nameMap));
      renderTimedChallengeComposer();
    };
    messengerSearch.addEventListener("input", () => {
      runMessengerFilter().catch(console.error);
    });
    messengerSearch.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!messengerSearch.value) return;
      event.preventDefault();
      messengerSearch.value = "";
      runMessengerFilter().catch(console.error);
    });
  }
  if (messengerClear && !messengerClear.__wired) {
    messengerClear.__wired = true;
    messengerClear.addEventListener("click", () => {
      if (messengerSearch) messengerSearch.value = "";
      window.__BC_MB_MESSENGER_SEARCH__ = "";
      const threads = Array.isArray(window.__BC_MB_THREADS_ALL__) ? window.__BC_MB_THREADS_ALL__ : [];
      mapUserIdsToNames(threads.map((thread) => thread.userId))
        .then((nameMap) => {
          renderManagerThreadList(threads, nameMap);
          safeCall("renderManagerActiveThread", () => renderManagerActiveThread(nameMap));
          renderTimedChallengeComposer();
          messengerSearch?.focus();
        })
        .catch(console.error);
    });
  }
}

function isRecentTransientTimestamp(ts, maxAgeMs = 1000 * 60 * 20) {
  const at = Number(ts || 0);
  if (!at) return false;
  const ageMs = Date.now() - at;
  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= maxAgeMs;
}

function cleanupManagerTransientState() {
  const started = window.__BC_PARENT_LAST_DRILL_STARTED__ || null;

  const tooOld = (ts, maxAgeMs = 1000 * 60 * 30) => {
    const n = Number(ts || 0);
    if (!n) return false;
    return (Date.now() - n) > maxAgeMs;
  };

  if (started && tooOld(started.at)) {
    window.__BC_PARENT_LAST_DRILL_STARTED__ = null;
  }
}

function validateManagerStateInvariants() {
  const activeRows = Array.isArray(window.__BC_MB_ACTIVE_THREAD_ROWS__)
    ? window.__BC_MB_ACTIVE_THREAD_ROWS__
    : [];
  const activeUserId = String(window.__BC_MB_ACTIVE_THREAD_USER_ID__ || "");

  if (!activeUserId && activeRows.length) {
    console.warn("[BC][INV] active thread rows exist without active user id");
  }

  const econ = getManagerAbilityEconomyState?.();
  if (Number(econ?.influence || 0) > Number(econ?.maxInfluence || 0)) {
    console.warn("[BC][INV] influence exceeds max", econ);
  }
}

function refreshManagerRuntimeSurfaces(opts = {}) {
  const {
    thread = true,
    board = true,
    economy = true,
    liveControls = true,
    challengeMeta = true,
  } = opts || {};

  cleanupManagerTransientState?.();

  if (thread) {
    safeCall?.("renderManagerThreadDrillSummary", () => renderManagerThreadDrillSummary?.());
    safeCall?.("renderTimedChallengeRecentSummary", () => renderTimedChallengeRecentSummary?.());
    safeCall?.("renderDisplayMethodChallengeRecentSummary", () => renderDisplayMethodChallengeRecentSummary?.());
  }

  if (board) {
  safeCall?.("renderManagerBoardDrillSummary", () => renderManagerBoardDrillSummary?.());
  safeCall?.("renderManagerBoardOverviewLiveEffects", () => renderManagerBoardOverviewLiveEffects?.());
}

  if (economy) {
    safeCall?.("renderManagerAbilityEconomyPanel", () => renderManagerAbilityEconomyPanel?.());
  }

  if (liveControls) {
    safeCall?.("renderManagerBoardOverviewLiveEffects", () => renderManagerBoardOverviewLiveEffects?.());
    safeCall?.("renderManagerAbilityEconomyPanel", () => renderManagerAbilityEconomyPanel?.());
    safeCall?.("renderManagerAttributeEffectsPanel", () => renderManagerAttributeEffectsPanel?.());
    safeCall?.("renderManagerAreaEffectsPanel", () => renderManagerAreaEffectsPanel?.());
    safeCall?.("renderManagerTimedChallengeActionPanel", () => renderManagerTimedChallengeActionPanel?.());
    safeCall?.("renderManagerDisplayMethodActionPanel", () => renderManagerDisplayMethodActionPanel?.());
    safeCall?.("loadTimedChallengeWineOptions", () => loadTimedChallengeWineOptions?.().catch(console.warn));
  }

  if (challengeMeta) {
    safeCall?.("renderManagerTimedChallengeActionMeta", () => renderManagerTimedChallengeActionMeta?.());
    safeCall?.("renderMessengerTimedChallengeMeta", () => renderMessengerTimedChallengeMeta?.());
    safeCall?.("renderManagerDisplayMethodActionMeta", () => renderManagerDisplayMethodActionMeta?.());
  }

  validateManagerStateInvariants?.();
}

window.__BC_MANAGER_DEBUG_STATE__ = function () {
  return {
    activeThreadUserId: window.__BC_MB_ACTIVE_THREAD_USER_ID__ || "",
    activeThreadRowsCount: Array.isArray(window.__BC_MB_ACTIVE_THREAD_ROWS__)
      ? window.__BC_MB_ACTIVE_THREAD_ROWS__.length
      : 0,
    parentLastDrillStarted: window.__BC_PARENT_LAST_DRILL_STARTED__ || null,
    managerLiveEffectsState: window.__BC_MANAGER_LIVE_EFFECTS_STATE__ || null,
    abilityEconomy: typeof getManagerAbilityEconomyState === "function"
      ? getManagerAbilityEconomyState()
      : null,
  };
};

function getCoachingSuggestionsFromReport(payload) {
  if (!payload || !payload.skills) return [];

  const s = payload.skills;

  const skillMap = [
    { key: "read", label: "Guest Reading", drillFocus: "read" },
    { key: "framing", label: "Framing", drillFocus: "frame" },
    { key: "delivery", label: "Delivery", drillFocus: "delivery" },
    { key: "recovery", label: "Recovery", drillFocus: "recovery" },
    { key: "closing", label: "Closing", drillFocus: "closing" }
  ];

  skillMap.sort((a, b) => (s[a.key] ?? 0) - (s[b.key] ?? 0));

  const weakest = skillMap[0];
  const second = skillMap[1];

  const suggestions = [];

  if (weakest) {
    suggestions.push({
      label: `Run ${weakest.label} Drill`,
      type: "drill",
      focus: weakest.drillFocus
    });
  }

  if (second) {
    suggestions.push({
      label: `Practice ${second.label}`,
      type: "message",
      text: `Focus on ${second.label.toLowerCase()} during your next tables.`
    });
  }

  suggestions.push({
    label: "Encourage confidence",
    type: "message",
    text: "Good work — keep your delivery confident and concise."
  });

  return suggestions;
}

function getProgressReportPayload(rowOrPayload) {
  const source =
    rowOrPayload && typeof rowOrPayload === "object" && "payload" in rowOrPayload
      ? rowOrPayload.payload
      : rowOrPayload;

  let payload = source;

  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = null;
    }
  }

  if (!payload || typeof payload !== "object") return null;

  const nested =
    payload.report ||
    payload.progressReport ||
    payload.progress_report ||
    payload.summary ||
    payload.payload ||
    null;

  if (nested && typeof nested === "object" && nested !== payload) {
    const mergedSkills = payload.skills || nested.skills || null;
    return {
      ...payload,
      ...nested,
      skills: mergedSkills,
    };
  }

  return payload;
}

function getLastAssignedDrill(threadRows) {
  const rows = Array.isArray(threadRows) ? threadRows : [];
  const last = rows
    .filter((r) => String(r?.type || "") === "drill_override")
    .sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0))[0];

  if (!last) return null;

  return {
    focus: String(last?.payload?.drill?.focus || "").toLowerCase(),
    createdAt: last?.created_at ? new Date(last.created_at) : null,
  };
}

function isInCooldown(lastDrill, focus, cooldownHours = 48) {
  if (!lastDrill?.createdAt || !lastDrill?.focus) return false;
  if (String(lastDrill.focus) !== String(focus || "").toLowerCase()) return false;

  const ageMs = Date.now() - lastDrill.createdAt.getTime();
  return ageMs < cooldownHours * 60 * 60 * 1000;
}

function getAutomaticDrillRecommendationForThread(thread) {
  const rows = Array.isArray(thread?.rows) ? thread.rows : [];
  const latest = [...rows].sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0))[0];

  const p = getProgressReportPayload(latest) || {};
  const skills = p?.skills || null;
  if (!skills) return null;

  const entries = [
    { key: "read", label: "Guest Reading", focus: "read" },
    { key: "framing", label: "Framing", focus: "frame" },
    { key: "delivery", label: "Delivery", focus: "delivery" },
    { key: "recovery", label: "Recovery", focus: "recovery" },
    { key: "closing", label: "Closing", focus: "closing" }
  ].sort((a, b) => (skills[a.key] ?? 0) - (skills[b.key] ?? 0));

  const lastDrill = getLastAssignedDrill(rows);

  for (const e of entries) {
    const pct = skills[e.key] ?? 0;
    if (pct >= 40) continue;

    if (!isInCooldown(lastDrill, e.focus, 48)) {
      return { label: e.label, focus: e.focus, pct, cooldown: false };
    }
  }

  const weakest = entries[0];
  return weakest
    ? { label: weakest.label, focus: weakest.focus, pct: skills[weakest.key] ?? 0, cooldown: true }
    : null;
}

function getManagerChallengeRecommendationCandidates(threadRows = []) {
  const rows = Array.isArray(threadRows) ? threadRows : [];

  const latestProgress = [...rows]
    .filter((row) => String(row?.type || "") === "progress_report" && getProgressReportPayload(row))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-1)[0] || null;

  const latestChallenge = [...rows]
    .filter((row) => String(row?.type || "").startsWith("timed_challenge"))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-1)[0] || null;
  const latestChallengeSent = [...rows]
    .filter((row) => String(row?.type || "") === "timed_challenge")
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-1)[0] || null;
  const latestChallengeCompleted = [...rows]
    .filter((row) => String(row?.type || "") === "timed_challenge_completed")
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-1)[0] || null;
  const latestChallengeExpired = [...rows]
    .filter((row) => String(row?.type || "") === "timed_challenge_expired")
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-1)[0] || null;
  const latestDrillOverride = [...rows]
    .filter((row) => String(row?.type || "") === "drill_override")
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-1)[0] || null;
  const latestDrillStarted = [...rows]
    .filter((row) => String(row?.type || "") === "drill_started")
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-1)[0] || null;
  const latestDrillCompleted = [...rows]
    .filter((row) => String(row?.type || "") === "drill_completed")
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-1)[0] || null;

  const p = latestProgress?.payload || {};
  const skills = p?.skills || {};

  const weakestSkill = String(p?.weakestSkill || "").toLowerCase();
  const strongestSkill = String(p?.strongestSkill || "").toLowerCase();
  const outcome = String(p?.outcome || "").toLowerCase();
  const chainSignal = String(p?.chainSignal || "").toLowerCase();
  const guest = String(p?.guestStateActual || "").toLowerCase();
  const resetUsed = !!p?.resetUsed;
  const deliveryScore = Number(p?.deliveryScore || 0) || 0;
  const guestReadCorrect = !!p?.guestReadCorrect;
  const chainScore = Number(p?.chainScore || 0) || 0;
  const strongPillars = Number(p?.strongPillars || 0) || 0;

  const recentChallengeKey = String(
    latestChallenge?.payload?.challengeKey ||
    latestChallenge?.payload?.challenge_key ||
    ""
  ).toLowerCase();
  const recentChallengeHistory = [...rows]
    .filter((row) => String(row?.type || "") === "timed_challenge")
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-5)
    .map((row) => String(
      row?.payload?.challengeKey ||
      row?.payload?.challenge_key ||
      ""
    ).toLowerCase())
    .filter(Boolean);

  const challengeSentAt = latestChallengeSent ? new Date(latestChallengeSent.created_at || 0).getTime() : 0;
  const challengeCompletedAt = latestChallengeCompleted ? new Date(latestChallengeCompleted.created_at || 0).getTime() : 0;
  const challengeExpiredAt = latestChallengeExpired ? new Date(latestChallengeExpired.created_at || 0).getTime() : 0;

  const drillAssignedAt = latestDrillOverride ? new Date(latestDrillOverride.created_at || 0).getTime() : 0;
  const drillStartedAt = latestDrillStarted
    ? (
      Number(latestDrillStarted?.payload?.startedAt || 0) ||
      new Date(latestDrillStarted.created_at || 0).getTime()
    )
    : 0;
  const drillCompletedAt = latestDrillCompleted ? new Date(latestDrillCompleted.created_at || 0).getTime() : 0;

  const challengeCurrentlyActive =
    !!challengeSentAt && challengeSentAt > Math.max(challengeCompletedAt, challengeExpiredAt);

  const drillCurrentlyActive =
    Math.max(drillAssignedAt, drillStartedAt) > drillCompletedAt;

  const activeChallengeFocus = challengeCurrentlyActive
    ? String(latestChallengeSent?.payload?.focus || "").toLowerCase()
    : "";
  const activeDrillFocus = drillCurrentlyActive
    ? String(
      latestDrillStarted?.payload?.focus ||
      latestDrillOverride?.payload?.drill?.focus ||
      ""
    ).toLowerCase()
    : "";

  return {
    latestProgress,
    weakestSkill,
    strongestSkill,
    outcome,
    chainSignal,
    guest,
    resetUsed,
    deliveryScore,
    guestReadCorrect,
    chainScore,
    strongPillars,
    recentChallengeKey,
    recentChallengeHistory,
    skills,
    challengeCurrentlyActive,
    drillCurrentlyActive,
    activeChallengeFocus,
    activeDrillFocus,
  };
}

function getManagerChallengeRecommendations(threadRows = []) {
  const c = getManagerChallengeRecommendationCandidates(threadRows);
  const state = getManagerAbilityEconomyState();
  const influence = Number(state?.influence || 0);
  const challengeFocusByKey = {
    read_first: "read",
    full_delivery: "delivery",
    recovery_window: "recovery",
    closing_push: "closing",
    clean_close: "closing",
    no_reset_run: "delivery",
    stable_signal: "recovery",
    solid_interaction: "recovery",
  };

  const defs = [
    { key: "read_first", label: "Read First" },
    { key: "full_delivery", label: "Full Delivery" },
    { key: "recovery_window", label: "Recovery Window" },
    { key: "closing_push", label: "Closing Push" },
    { key: "clean_close", label: "Clean Close" },
    { key: "no_reset_run", label: "No Reset Run" },
    { key: "stable_signal", label: "Stable Signal" },
    { key: "solid_interaction", label: "Solid Interaction" },
  ];

  const scored = defs.map((item) => {
    let score = 0;
    const reasons = [];
    const itemFocus = challengeFocusByKey[item.key] || "";
    const recentReuseCount = c.recentChallengeHistory.filter((key) => key === item.key).length;

    if (item.key === "read_first" && (c.weakestSkill === "read" || !c.guestReadCorrect)) {
      score += 5;
      reasons.push("Weak guest reading in latest report.");
    }

    if (item.key === "full_delivery" && (c.weakestSkill === "delivery" || c.deliveryScore < 2)) {
      score += 5;
      reasons.push("Latest interaction showed incomplete delivery.");
    }

    if (item.key === "recovery_window" && (c.weakestSkill === "recovery" || c.outcome === "recovery" || c.outcome === "pivot")) {
      score += 5;
      reasons.push("Recent outcome suggests recovery weakness.");
    }

    if (item.key === "closing_push" && (c.weakestSkill === "closing" || c.outcome === "soft_close")) {
      score += 5;
      reasons.push("Recent interaction suggests weak finishing pressure.");
    }

    if (item.key === "clean_close" && c.outcome && c.outcome !== "clean_close") {
      score += 4;
      reasons.push("Latest outcome did not reach a clean close.");
    }

    if (item.key === "no_reset_run" && c.resetUsed) {
      score += 4;
      reasons.push("Latest interaction relied on reset.");
    }

    if (item.key === "stable_signal" && c.chainSignal === "red") {
      score += 4;
      reasons.push("Latest interaction fell into a red signal state.");
    }

    if (item.key === "solid_interaction" && c.chainScore > 0 && c.chainScore < 6) {
      score += 3;
      reasons.push("Latest interaction lacked enough overall structure.");
    }

    if (itemFocus && itemFocus === c.strongestSkill && c.strongPillars >= 3) {
      score += 2;
      reasons.push("Builds on the waiter's current strongest area.");
    }

    if (item.key === "clean_close" && (c.guest === "decider" || c.guest === "dictator")) {
      score += 2;
      reasons.push("Dictator tables reward decisive finishes.");
    }

    if (item.key === "read_first" && c.guest === "griever") {
      score += 2;
      reasons.push("Griever tables punish poor emotional reads.");
    }

    if (item.key === "full_delivery" && c.guest === "fancy") {
      score += 2;
      reasons.push("Fancy tables reward complete delivery confidence.");
    }

    if (itemFocus && c.activeDrillFocus && itemFocus === c.activeDrillFocus) {
      score += 3;
      reasons.push("Matches the current drill focus.");
    }

    if (itemFocus && c.activeChallengeFocus && itemFocus === c.activeChallengeFocus) {
      score += 1;
      reasons.push("Aligns with the current live challenge theme.");
    }

    if (c.challengeCurrentlyActive) {
      score -= 2;
      reasons.push("A challenge is already active.");
    }

    if (c.drillCurrentlyActive && (item.key === "read_first" || item.key === "full_delivery")) {
      score -= 1;
      reasons.push("A drill is already in progress.");
    }

    if (item.key === c.recentChallengeKey) {
      score -= 3;
      reasons.push("This was the most recent challenge.");
    }

    if (recentReuseCount > 1) {
      score -= recentReuseCount;
      reasons.push("This challenge has been used repeatedly in recent history.");
    }

    const cost = Number(MANAGER_CHALLENGE_COSTS?.[item.key] || 0);
    const cooldown = getManagerCooldownRemaining(item.key);
    const affordable = influence >= cost;

    if (!affordable) score -= 4;
    if (cooldown > 0) score -= 5;

    const primaryReason =
      reasons[0] ||
      "Good fit for the current training state.";

    return {
      ...item,
      score,
      reason: primaryReason,
      cost,
      cooldown,
      affordable,
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function renderManagerChallengeRecommendations(threadRows = []) {
  const recs = getManagerChallengeRecommendations(threadRows);

  if (!recs.length) {
    return `
      <div class="small-text" style="opacity:.75;">
        No recommendation yet.
      </div>
    `;
  }

  const bestIndex = recs.findIndex((rec) => rec.cooldown <= 0 && rec.affordable);

  return `
    <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
      ${recs.map((rec, index) => `
        <button
          type="button"
          class="btn-ghost mbChallengeSuggestion"
          data-challenge-key="${escapeHtml(rec.key)}"
          title="${escapeHtml(rec.reason)}"
          style="
            text-align:left;
            opacity:${rec.cooldown > 0 || !rec.affordable ? "0.7" : "1"};
            border:1px solid rgba(255,255,255,0.08);
            background:rgba(255,255,255,0.03);
            border-radius:10px;
            padding:8px;
          "
        >
          <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
            <div style="font-weight:600;">
              ${escapeHtml(rec.label)}
              ${index === bestIndex ? `<span class="small-text" style="opacity:.75;"> • Recommended</span>` : ``}
            </div>
            <div class="small-text" style="opacity:.7;">
              ${escapeHtml(formatManagerActionCost(rec.cost))}
              ${rec.cooldown > 0 ? ` • ${escapeHtml(`${rec.cooldown}s cd`)}` : ``}
              ${!rec.affordable ? ` • blocked` : ``}
            </div>
          </div>
          <div class="small-text" style="opacity:.75; margin-top:2px;">
            ${escapeHtml(rec.reason)}
          </div>

          <div class="small-text" style="opacity:.6; margin-top:4px;">
            Score: ${escapeHtml(String(rec.score))}
          </div>
        </button>
      `).join("")}
    </div>
  `;
}

function getManagerEffectRecommendationCandidates(threadRows = []) {
  const rows = Array.isArray(threadRows) ? threadRows : [];

  const latestProgress = [...rows]
    .filter((row) => String(row?.type || "") === "progress_report" && getProgressReportPayload(row))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-1)[0] || null;

  const p = getProgressReportPayload(latestProgress) || {};

  const weakestSkill = String(p?.weakestSkill || "").toLowerCase();
  const strongestSkill = String(p?.strongestSkill || "").toLowerCase();
  const outcome = String(p?.outcome || "").toLowerCase();
  const chainSignal = String(p?.chainSignal || "").toLowerCase();
  const guest = String(p?.guestStateActual || "").toLowerCase();
  const resetUsed = !!p?.resetUsed;
  const deliveryScore = Number(p?.deliveryScore || 0) || 0;
  const guestReadCorrect = !!p?.guestReadCorrect;
  const chainScore = Number(p?.chainScore || 0) || 0;
  const strongPillars = Number(p?.strongPillars || 0) || 0;
  const premiumSuccess = !!p?.premiumSuccess;

  const activeEffectsState = getManagerLiveEffectsState?.() || {
    attributeEffects: [],
    areaEffects: [],
  };

  const activeEffectIds = [
    ...((activeEffectsState.attributeEffects || []).filter((x) => !!x?.active).map((x) => String(x?.id || "").toLowerCase())),
    ...((activeEffectsState.areaEffects || []).filter((x) => !!x?.active).map((x) => String(x?.id || "").toLowerCase())),
  ];

  return {
    latestProgress,
    weakestSkill,
    strongestSkill,
    outcome,
    chainSignal,
    guest,
    resetUsed,
    deliveryScore,
    guestReadCorrect,
    chainScore,
    strongPillars,
    premiumSuccess,
    activeEffectIds,
  };
}

function getManagerEffectRecommendations(threadRows = []) {
  const c = getManagerEffectRecommendationCandidates(threadRows);
  const state = getManagerAbilityEconomyState();
  const influence = Number(state?.influence || 0);

  const defs = [
    { key: "closing_surge", label: "Closing Surge", family: "attribute" },
    { key: "recovery_focus", label: "Recovery Focus", family: "attribute" },
    { key: "premium_window", label: "Premium Window", family: "area" },
    { key: "calm_floor", label: "Calm Floor", family: "area" },
  ];

  const scored = defs.map((item) => {
    let score = 0;
    const reasons = [];

    const isAlreadyActive = c.activeEffectIds.includes(item.key);

    if (item.key === "closing_surge" && (c.weakestSkill === "closing" || c.outcome === "soft_close")) {
      score += 5;
      reasons.push("Recent interaction suggests weak finishing pressure.");
    }

    if (item.key === "recovery_focus" && (c.weakestSkill === "recovery" || c.outcome === "recovery" || c.outcome === "pivot")) {
      score += 5;
      reasons.push("Recent encounter suggests recovery weakness.");
    }

    if (item.key === "premium_window" && (
      c.guest === "celebrator" ||
      c.guest === "fancy" ||
      (c.chainSignal === "green" && c.strongPillars >= 2 && !c.premiumSuccess)
    )) {
      score += 4;
      reasons.push("Current interaction shape supports an upgrade window.");
    }

    if (item.key === "calm_floor" && (
      c.chainSignal === "red" ||
      c.resetUsed ||
      c.guest === "griever"
    )) {
      score += 4;
      reasons.push("The table likely needs stabilization.");
    }

    if (item.key === "closing_surge" && (c.guest === "decider" || c.guest === "dictator")) {
      score += 2;
      reasons.push("Dictator tables reward clear finishes.");
    }

    if (item.key === "recovery_focus" && c.guest === "griever") {
      score += 2;
      reasons.push("Griever tables punish rough recovery.");
    }

    if (item.key === "premium_window" && c.guest === "celebrator") {
      score += 2;
      reasons.push("Celebrator tables are more open to premium moves.");
    }

    if (item.key === "calm_floor" && c.guest === "griever") {
      score += 2;
      reasons.push("Griever tables benefit from lower pressure.");
    }

    if (isAlreadyActive) {
      score -= 6;
      reasons.push("This effect is already active.");
    }

    const cost = Number(MANAGER_EFFECT_COSTS?.[item.key] || 0);
    const cooldown = getManagerCooldownRemaining(item.key);
    const affordable = influence >= cost;
    const blockedByCap = !canManagerActivateAnotherEffect() && !isAlreadyActive;

    if (!affordable) score -= 4;
    if (cooldown > 0) score -= 5;
    if (blockedByCap) score -= 5;

    const reason =
      reasons.find(Boolean) ||
      "Useful support effect for the current table.";

    return {
      ...item,
      score,
      reason,
      cost,
      cooldown,
      affordable,
      blockedByCap,
      isAlreadyActive,
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function renderManagerEffectRecommendations(threadRows = []) {
  const recs = getManagerEffectRecommendations(threadRows);

  if (!recs.length) {
    return `
      <div class="small-text" style="opacity:.75;">
        No effect recommendation yet.
      </div>
    `;
  }

  const bestIndex = recs.findIndex((rec) =>
    rec.cooldown <= 0 &&
    rec.affordable &&
    !rec.blockedByCap &&
    !rec.isAlreadyActive
  );

  return `
    <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
      ${recs.map((rec, index) => `
        <button
          type="button"
          class="btn-ghost mbEffectSuggestion"
          data-effect-key="${escapeHtml(rec.key)}"
          title="${escapeHtml(rec.reason)}"
          style="
            text-align:left;
            opacity:${rec.cooldown > 0 || !rec.affordable || rec.blockedByCap || rec.isAlreadyActive ? "0.7" : "1"};
            border:1px solid rgba(255,255,255,0.08);
            background:rgba(255,255,255,0.03);
            border-radius:10px;
            padding:8px;
          "
        >
          <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
            <div style="font-weight:600;">
              ${escapeHtml(rec.label)}
              ${index === bestIndex ? `<span class="small-text" style="opacity:.75;"> • Recommended</span>` : ``}
            </div>

            <div class="small-text" style="opacity:.7;">
              ${escapeHtml(formatManagerActionCost(rec.cost))}
              ${rec.cooldown > 0 ? ` • ${escapeHtml(`${rec.cooldown}s cd`)}` : ``}
              ${rec.isAlreadyActive ? ` • active` : ``}
              ${rec.blockedByCap ? ` • cap` : ``}
              ${!rec.affordable ? ` • blocked` : ``}
            </div>
          </div>

          <div class="small-text" style="opacity:.75; margin-top:2px;">
            ${escapeHtml(rec.reason)}
          </div>
        </button>
      `).join("")}
    </div>
  `;
}

function renderManagerThreadStatePanel() {
  const root = document.getElementById("mbThreadStatePanel");
  if (!root) return;

  const metaText = String(document.getElementById("mbThreadMeta")?.textContent || "").trim();
  const drillSummaryHtml = String(document.getElementById("mbThreadDrillSummary")?.innerHTML || "").trim();

  root.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:8px;">
      <div style="font-weight:600;">Current Coaching State</div>

      <div class="small-text" style="opacity:.9;">
        ${escapeHtml(metaText || "No current objective")}
      </div>

      <div class="small-text" style="opacity:.82;">
        ${drillSummaryHtml || `<span style="opacity:.75;">No drill lifecycle yet for this waiter.</span>`}
      </div>
    </div>
  `;
}

function renderManagerThreadRecommendationsPanel(thread) {
  const root = document.getElementById("mbThreadChallengeRecommendations");
  if (!root) return;

  const rows = Array.isArray(thread?.rows) ? thread.rows : [];

  root.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:12px;">
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="font-weight:600;">Suggested Challenges</div>
        ${renderManagerChallengeRecommendations(rows)}
      </div>

      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="font-weight:600;">Suggested Live Effects</div>
        ${renderManagerEffectRecommendations(rows)}
      </div>
    </div>
  `;

  wireManagerChallengeSuggestionButtons?.();
  wireManagerEffectSuggestionButtons?.();
}

function wireMbCoachSuggestionButtons() {
  document.querySelectorAll(".mbCoachSuggestion").forEach((btn) => {
    btn.onclick = () => {
      const index = Number(btn.dataset.index);
      const rowId = btn.closest("[data-msg-id]")?.dataset.msgId;

      const row = window.__MB_LAST_MESSAGES__?.find((r) => String(r.id) === String(rowId));
      if (!row) return;

      const suggestions = getCoachingSuggestionsFromReport(getProgressReportPayload(row) || {});
      const s = suggestions[index];
      if (!s) return;

      const bodyInput = mbEl("mbInstrBody");
      if (!bodyInput) return;

      if (s.type === "message") {
        bodyInput.value = s.text;
      }

      if (s.type === "drill") {
        bodyInput.value = `Run a focused ${s.focus} drill before your next shift.`;
      }

      bodyInput.focus();
    };
  });
}

function wireManagerChallengeSuggestionButtons() {
  const buttons = document.querySelectorAll(".mbChallengeSuggestion");

  buttons.forEach((btn) => {
    if (btn.__wired) return;
    btn.__wired = true;

    btn.addEventListener("click", () => {
      const key = String(btn.getAttribute("data-challenge-key") || "");
      const cost = Number(MANAGER_CHALLENGE_COSTS?.[key] || 0);
      const blockReason = getManagerActionBlockReason({
        key,
        cost,
        type: "challenge",
      });

      const messengerSelect = document.getElementById("mbTimedChallengeType");
      const liveControlsSelect = document.getElementById("mbLcTimedChallengeType");

      if (messengerSelect) messengerSelect.value = key;
      if (liveControlsSelect) liveControlsSelect.value = key;

      renderManagerTimedChallengeActionMeta?.();
      renderMessengerTimedChallengeMeta?.();

      const statusEl =
        document.getElementById("mbTimedChallengeStatus") ||
        document.getElementById("mbLcTimedChallengeStatus");

      if (statusEl) {
        statusEl.textContent = blockReason
          ? `Selected recommended challenge: ${key} • ${blockReason}`
          : `Selected recommended challenge: ${key}`;
      }
    });
  });
}

function wireManagerEffectSuggestionButtons() {
  const buttons = document.querySelectorAll(".mbEffectSuggestion");

  buttons.forEach((btn) => {
    if (btn.__wired) return;
    btn.__wired = true;

    btn.addEventListener("click", () => {
      const key = String(btn.getAttribute("data-effect-key") || "");
      const cost = Number(MANAGER_EFFECT_COSTS?.[key] || 0);
      const blockReason = getManagerActionBlockReason({
        key,
        cost,
        type: "effect",
      });

      const targetButtonIdMap = {
        closing_surge: "btnAddClosingSurge",
        recovery_focus: "btnAddRecoveryFocus",
        premium_window: "btnAddPremiumWindow",
        calm_floor: "btnAddCalmFloor",
      };

      const targetId = targetButtonIdMap[key] || "";
      const targetBtn = document.getElementById(targetId);

      if (targetBtn) {
        targetBtn.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      const statusEl =
        document.getElementById("mbLcTimedChallengeStatus") ||
        document.getElementById("mbTimedChallengeStatus");

      if (statusEl) {
        statusEl.textContent = blockReason
          ? `Recommended effect: ${key} • ${blockReason}`
          : `Recommended effect: ${key}`;
      }
    });
  });
}

function wireMbAutoDrillButtons() {
  document.querySelectorAll("[data-auto-drill-focus]").forEach((btn) => {
    if (btn.__wired) return;
    btn.__wired = true;

    btn.addEventListener("click", () => {
      const focus = String(btn.getAttribute("data-auto-drill-focus") || "").toLowerCase();
      if (!focus) return;

      mbSendDrillOverride({ focus }).catch((e) => {
        const status = mbEl("mbInstrStatus");
        if (status) status.textContent = e?.message || String(e);
      });
    });
  });
}

function drawSkillRadar(canvas, skills) {
  if (!canvas || !skills) return;

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  const labels = [
    { key: "read", label: "READ" },
    { key: "framing", label: "FRAME" },
    { key: "delivery", label: "DELIVER" },
    { key: "recovery", label: "RECOVER" },
    { key: "closing", label: "CLOSE" },
  ];

  const values = labels.map(({ key }) => Math.max(0, Math.min(100, Number(skills?.[key] || 0))) / 100);

  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.34;
  const angleStep = (Math.PI * 2) / labels.length;

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;

  for (let r = 0.2; r <= 1; r += 0.2) {
    ctx.beginPath();
    labels.forEach((_, i) => {
      const a = angleStep * i - Math.PI / 2;
      const x = cx + Math.cos(a) * radius * r;
      const y = cy + Math.sin(a) * radius * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
  }

  labels.forEach((_, i) => {
    const a = angleStep * i - Math.PI / 2;
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
  });

  ctx.beginPath();
  values.forEach((v, i) => {
    const a = angleStep * i - Math.PI / 2;

    const effective = v > 0 ? Math.max(v, 0.08) : 0;

    const x = cx + Math.cos(a) * radius * effective;
    const y = cy + Math.sin(a) * radius * effective;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();

  ctx.fillStyle = "rgba(90,180,255,0.22)";
  ctx.strokeStyle = "rgba(90,180,255,0.95)";
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = "11px sans-serif";

  labels.forEach(({ label }, i) => {
    const a = angleStep * i - Math.PI / 2;
    const x = cx + Math.cos(a) * (radius + 18);
    const y = cy + Math.sin(a) * (radius + 18);
    ctx.fillText(label, x - 18, y + 4);
  });
}

async function loadHistoryWaiters() {
  const { restaurantId } = getManagerBoardFilter();
  const select = document.getElementById("mbHistoryUser");

  if (!restaurantId || !select) return;

  const currentUserId =
    appState?.session?.user?.id ||
    appState?.session?.userId ||
    null;
  const currentProfile = appState?.profile || {};
  const currentRole = String(normalizeMembershipRole(currentProfile) || currentProfile?.role || "").toLowerCase();

  const [profilesRes, snapshotsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, display_name, role")
      .eq("restaurant_id", restaurantId)
      .order("display_name", { ascending: true }),
    supabase
      .from("bc_skill_snapshots_v1")
      .select("user_id, created_at")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (profilesRes.error) {
    console.warn("[PERF HISTORY SELECT]", profilesRes.error);
    select.innerHTML = "";
    return;
  }

  if (snapshotsRes.error) {
    console.warn("[PERF HISTORY SELECT][SNAPSHOTS]", snapshotsRes.error);
  }

  const optionMap = new Map();
  const profileRows = Array.isArray(profilesRes.data) ? profilesRes.data : [];
  const snapshotRows = Array.isArray(snapshotsRes.data) ? snapshotsRes.data : [];

  for (const row of profileRows) {
    const role = String(row?.role || "").toLowerCase();
    if (role === "demo") continue;
    const uid = String(row?.user_id || "");
    if (!uid) continue;
    optionMap.set(uid, {
      uid,
      label: row?.display_name || uid,
    });
  }

  for (const row of snapshotRows) {
    const uid = String(row?.user_id || "");
    if (!uid || optionMap.has(uid)) continue;
    optionMap.set(uid, { uid, label: uid });
  }

  if (currentUserId && currentRole !== "demo" && !optionMap.has(String(currentUserId))) {
    const fallbackCurrentLabel =
      currentProfile?.display_name ||
      appState?.session?.user?.user_metadata?.display_name ||
      appState?.session?.user?.user_metadata?.full_name ||
      (appState?.session?.user?.email ? String(appState.session.user.email).split("@")[0] : "") ||
      String(currentUserId);
    optionMap.set(String(currentUserId), {
      uid: String(currentUserId),
      label: fallbackCurrentLabel,
    });
  }

  const ids = Array.from(optionMap.keys());
  const nameMap = await mapUserIdsToNames(ids);
  const selectedUserId =
    currentUserId && currentRole !== "demo"
      ? String(currentUserId)
      : String(select.value || "");
  const options = ids
    .map((uid) => {
      const base = optionMap.get(uid);
      return {
        uid,
        label: nameMap.get(uid) || base?.label || uid,
      };
    })
    .sort((a, b) => String(a.label).localeCompare(String(b.label)));

  select.innerHTML = options.map((opt) => {
    const selected = String(opt.uid) === selectedUserId ? " selected" : "";
    return `<option value="${opt.uid}"${selected}>${escapeHtml(opt.label || opt.uid)}</option>`;
  }).join("");

  if (selectedUserId) {
    select.value = selectedUserId;
  }
}

async function loadPerformanceHistory(userId) {
  const { restaurantId } = getManagerBoardFilter();
  renderPerformanceHistorySummaryStrip(userId);

  const [snapshotsRes, encountersRes] = await Promise.all([
    supabase
      .from("bc_skill_snapshots_v1")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(50),

    fetchEncounterResolutionSummaries({
      restaurantId,
      userId,
      limit: 120,
    }),
  ]);

  if (snapshotsRes?.error) {
    console.warn("[MB][PERFORMANCE] bc_skill_snapshots_v1 query failed", snapshotsRes.error);
  }
  if (encountersRes?.error) {
    console.warn("[MB][PERFORMANCE] bc_encounter_resolutions_v2 query failed", encountersRes.error);
  }

  const snapshotData = Array.isArray(snapshotsRes?.data) ? snapshotsRes.data : [];
  const encounterData = Array.isArray(encountersRes?.data) ? encountersRes.data : [];
  const encounterUserIds = Array.from(new Set(
    encounterData
      .map((row) => String(row?.user_id || "").trim())
      .filter(Boolean)
  ));
  const encounterNameMap = await mapUserIdsToNames(encounterUserIds);

  drawPerformanceHistoryChart(snapshotData || []);
  renderManagerEncounterSummaryList(userId, encounterData || [], encounterNameMap);
}

function renderManagerEncounterSummaryList(userId, rows, nameMap = new Map()) {
  const host = document.getElementById("managerEncounterSummaryHost");
  if (!host) return;

  host.innerHTML = "";

  const title = document.createElement("h4");
  title.innerText = "Encounter summaries by waiter";
  host.appendChild(title);

  if (!Array.isArray(rows) || !rows.length) {
    const empty = document.createElement("div");
    empty.className = "small-text";
    empty.innerText = "No recent encounter summaries.";
    host.appendChild(empty);
    return;
  }

  const normalizedRows = rows
    .map((row) => normalizeEncounterSummaryRow(row))
    .filter((summary) => !userId || String(summary.userId || "") === String(userId));
  const hasAnyReactionTelemetry = normalizedRows.some((summary) =>
    !!summary.reflection ||
    !!summary.reactionSummary ||
    !!summary.aiPerception ||
    Array.isArray(summary.stepReactionTrail) && summary.stepReactionTrail.length > 0 ||
    Array.isArray(summary.stepSpine) && summary.stepSpine.length > 0 ||
    Array.isArray(summary.chosenPath) && summary.chosenPath.length > 0 ||
    Array.isArray(summary.bestPath) && summary.bestPath.length > 0
  );

  if (!hasAnyReactionTelemetry) {
    const note = document.createElement("div");
    note.className = "small-text";
    note.style.marginTop = "6px";
    note.style.opacity = ".82";
    note.innerText = "Recent encounters exist, but they were logged before reaction telemetry was included in the payload.";
    host.appendChild(note);
  }

  const listView = document.createElement("div");
  listView.className = "manager-encounter-summary-list";
  host.appendChild(listView);

  const detailWindow = document.createElement("div");
  detailWindow.className = "card manager-encounter-detail-window hidden";
  host.appendChild(detailWindow);

  const groupedRows = normalizedRows.reduce((acc, summary) => {
    const encounterUserId = String(summary.userId || "").trim() || "__unknown__";
    if (!acc.has(encounterUserId)) acc.set(encounterUserId, []);
    acc.get(encounterUserId).push(summary);
    return acc;
  }, new Map());

  const panels = Array.from(groupedRows.entries())
    .map(([encounterUserId, summaries]) => {
      const latestOccurredAt = Math.max(
        ...summaries.map((summary) => new Date(summary.occurredAt || 0).getTime() || 0),
        0
      );
      const displayName =
        nameMap.get(encounterUserId) ||
        (encounterUserId === "__unknown__" ? "Unknown waiter" : encounterUserId);
      return {
        userId: encounterUserId,
        displayName,
        summaries: summaries.slice().sort((a, b) =>
          new Date(b.occurredAt || 0).getTime() - new Date(a.occurredAt || 0).getTime()
        ),
        latestOccurredAt,
      };
    })
    .sort((a, b) => {
      if (String(a.userId) === String(userId || "")) return -1;
      if (String(b.userId) === String(userId || "")) return 1;
      if (b.latestOccurredAt !== a.latestOccurredAt) return b.latestOccurredAt - a.latestOccurredAt;
      return String(a.displayName).localeCompare(String(b.displayName));
    });

  function buildEncounterSummaryItem(summary) {
    const summaryCard = document.createElement("div");
    summaryCard.className = "manager-encounter-summary-item";

    const summaryBtn = document.createElement("button");
    summaryBtn.type = "button";
    summaryBtn.className = "small-btn";
    summaryBtn.innerText =
      `${new Date(summary.occurredAt || Date.now()).toLocaleString()} • ` +
      `Grade ${summary.performanceGrade || "—"}`;

    const details = document.createElement("div");
    details.className = "history-details is-collapsed";

    details.innerText =
      "AI perception: " + (summary.aiPerception || "—") + "\n" +
      "Bottle served: " + (summary.bottleServed ? "YES" : "NO") + "\n" +
      "Chosen path: " + (summary.chosenPathExposition || ((summary.chosenPath || []).join(" -> ") || "—")) + "\n" +
      "Best path: " + (summary.bestPathExposition || ((summary.bestPath || []).join(" -> ") || "—"));

    summaryCard.appendChild(summaryBtn);
    summaryCard.appendChild(details);

    summaryBtn.addEventListener("click", () => {
      const isHidden = details.classList.contains("is-collapsed");
      details.classList.toggle("is-collapsed", !isHidden);
      summaryBtn.innerText = isHidden
        ? `Hide • ${new Date(summary.occurredAt || Date.now()).toLocaleString()}`
        : `${new Date(summary.occurredAt || Date.now()).toLocaleString()} • Grade ${summary.performanceGrade || "—"}`;
    });

    return summaryCard;
  }

  function openWaiterWindow(panel) {
    listView.classList.add("hidden");
    detailWindow.classList.remove("hidden");

    detailWindow.innerHTML = `
      <div class="manager-encounter-detail-header">
        <div>
          <div class="manager-encounter-detail-title">${escapeHtml(panel.displayName)}</div>
          <div class="manager-encounter-detail-meta">
            ${panel.summaries.length} encounter${panel.summaries.length === 1 ? "" : "s"} •
            Latest ${escapeHtml(new Date(panel.latestOccurredAt || Date.now()).toLocaleString())}
          </div>
        </div>
        <button type="button" class="small-btn manager-encounter-detail-close">Back</button>
      </div>
      <div class="manager-encounter-detail-list"></div>
    `;

    const closeBtn = detailWindow.querySelector(".manager-encounter-detail-close");
    const detailList = detailWindow.querySelector(".manager-encounter-detail-list");

    panel.summaries.forEach((summary) => {
      detailList.appendChild(buildEncounterSummaryItem(summary));
    });

    closeBtn?.addEventListener("click", () => {
      detailWindow.classList.add("hidden");
      detailWindow.innerHTML = "";
      listView.classList.remove("hidden");
    });
  }

  panels.forEach((panel) => {
    const card = document.createElement("div");
    card.className = "card manager-encounter-summary-card";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "manager-encounter-user-btn";
    btn.innerHTML = `
      <span class="manager-encounter-user-title">${escapeHtml(panel.displayName)}</span>
      <span class="manager-encounter-user-meta">
        ${panel.summaries.length} encounter${panel.summaries.length === 1 ? "" : "s"} •
        Latest ${escapeHtml(new Date(panel.latestOccurredAt || Date.now()).toLocaleString())}
      </span>
    `;
    card.appendChild(btn);
    listView.appendChild(card);

    btn.addEventListener("click", () => {
      openWaiterWindow(panel);
    });
  });
}

function renderPerformanceLegend(items = []) {
  const root = document.getElementById("mbPerformanceLegend");
  if (!root) return;

  if (!Array.isArray(items) || !items.length) {
    root.innerHTML = "";
    return;
  }

  root.innerHTML = `
    <div class="card" style="padding:10px;">
      <div style="font-weight:600; margin-bottom:8px;">Legend</div>
      <div style="display:flex; flex-wrap:wrap; gap:12px;">
        ${items.map((item) => `
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="
              display:inline-block;
              width:12px;
              height:12px;
              border-radius:999px;
              background:${item.color};
            "></span>
            <span class="small">${escapeHtml(item.label || "-")}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function drawPerformanceHistoryChart(rows) {
  const canvas = document.getElementById("mbHistoryChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const skills = [
    { key: "read_pct", label: "READ", color: "#60a5fa" },
    { key: "framing_pct", label: "FRAME", color: "#34d399" },
    { key: "delivery_pct", label: "DELIVER", color: "#f59e0b" },
    { key: "recovery_pct", label: "RECOVER", color: "#f472b6" },
    { key: "closing_pct", label: "CLOSE", color: "#a78bfa" }
  ];

  ctx.clearRect(0, 0, w, h);
  renderPerformanceLegend(skills);

  if (!rows.length) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "14px sans-serif";
    ctx.fillText("No performance history yet.", 20, 30);
    return;
  }

  const padL = 40;
  const padR = 20;
  const padT = 20;
  const padB = 30;

  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  ctx.strokeStyle = "rgba(255,255,255,0.20)";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, h - padB);
  ctx.lineTo(w - padR, h - padB);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "11px sans-serif";
  [0, 25, 50, 75, 100].forEach((v) => {
    const y = padT + plotH - (v / 100) * plotH;
    ctx.fillText(String(v), 8, y + 4);

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();
  });

  const xStep = rows.length > 1 ? plotW / (rows.length - 1) : plotW / 2;

  skills.forEach((skill) => {
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = skill.color;

    rows.forEach((r, i) => {
      const pct = Math.max(0, Math.min(100, Number(r?.[skill.key] || 0)));
      const x = padL + i * xStep;
      const y = padT + plotH - (pct / 100) * plotH;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  });
}

function renderMbMessageItem(row, nameMap) {
  const who = userLabel(row?.sender_user_id, nameMap);
  const kind = String(row?.type || "message");
  const when = escapeHtml(
    String(formatManagerTimeShort(row?.created_at) || row?.created_at || "")
  );
  const meta = getManagerMessageKindMeta(row);
  const display = getManagerMessageDisplayBody(row);
  const badgeHtml = renderManagerMessageBadge(row);
  const titleHtml = escapeHtml(String(display?.title || row?.body || "Message"));
  const detailHtml = escapeHtml(String(display?.detail || ""));
  const noteHtml = escapeHtml(String(row?.body || ""));
  const toneStyles = {
    success: {
      border: "1px solid rgba(34,197,94,0.20)",
      bg: "rgba(34,197,94,0.06)",
    },
    warning: {
      border: "1px solid rgba(245,158,11,0.20)",
      bg: "rgba(245,158,11,0.06)",
    },
    info: {
      border: "1px solid rgba(96,165,250,0.20)",
      bg: "rgba(96,165,250,0.06)",
    },
    neutral: {
      border: "1px solid rgba(255,255,255,0.10)",
      bg: "rgba(255,255,255,0.04)",
    },
    default: {
      border: "1px solid rgba(255,255,255,0.10)",
      bg: "rgba(255,255,255,0.04)",
    },
  };
  const toneStyle = toneStyles[meta?.tone] || toneStyles.default;

  let payloadHtml = "";

  if (kind === "progress_report") {
    const p = getProgressReportPayload(row) || {};
    if (Object.keys(p).length) {
      const skills = p.skills || {};
      const metricRows = [
        ["Read", `${skills.read ?? 0}%`],
        ["Frame", `${skills.framing ?? 0}%`],
        ["Delivery", `${skills.delivery ?? 0}%`],
        ["Recovery", `${skills.recovery ?? 0}%`],
        ["Closing", `${skills.closing ?? 0}%`],
      ];

      payloadHtml = `
        <div class="mb-progress-report-card">
          <div class="mb-progress-report-topline">
            <div class="mb-progress-report-pill">Encounter ${escapeHtml(String(p.encounterNumber ?? "-"))}</div>
            <div class="mb-progress-report-pill">Signal ${escapeHtml(String(p.chainSignal || "-"))}</div>
            <div class="mb-progress-report-pill">Score ${escapeHtml(String(p.chainScore ?? "-"))}</div>
          </div>

          <div class="mb-progress-report-meta">
            Guest: <strong>${escapeHtml(String(p.guestStateActual || "-"))}</strong>
            ${p.difficulty != null ? ` • Difficulty: <strong>${escapeHtml(String(p.difficulty))}</strong>` : ""}
          </div>

          <div class="mb-progress-report-grid">
            ${metricRows.map(([label, value]) => `
              <div class="mb-progress-report-metric">
                <div class="mb-progress-report-label">${escapeHtml(label)}</div>
                <div class="mb-progress-report-value">${escapeHtml(value)}</div>
              </div>
            `).join("")}
          </div>

          <div class="mb-progress-report-summary">
            <div><span class="mb-progress-report-key">Strongest</span> ${escapeHtml(String(p.strongestSkill ?? "-"))}</div>
            <div><span class="mb-progress-report-key">Needs work</span> ${escapeHtml(String(p.weakestSkill ?? "-"))}</div>
          </div>
        </div>
      `;
    }
  }

  return `
    <div class="mb-message-card" data-msg-id="${escapeHtml(String(row?.id ?? ""))}" style="
      ${toneStyle.border};
      border-radius:12px;
      padding:10px;
      background:${toneStyle.bg};
      margin-bottom:8px;
    ">
      <div class="mb-message-head" style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div class="small-text" style="opacity:.75;">${escapeHtml(who)}</div>
        ${badgeHtml ? `<div>${badgeHtml}</div>` : ``}
      </div>
      <div class="mb-message-title-row" style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-top:6px;">
        <div class="mb-message-title" style="font-weight:600;">${titleHtml}</div>
        <div class="mb-message-date small-text" style="opacity:.6;">${when}</div>
      </div>
      ${detailHtml ? `
        <div class="small-text" style="margin-top:4px; opacity:.82;">
          ${detailHtml}
        </div>
      ` : ""}
      ${kind === "instruction" ? `
        <div class="small-text" style="margin-top:6px; opacity:.92; white-space:pre-wrap;">
          ${noteHtml}
        </div>
      ` : ""}
      ${payloadHtml}
    </div>
  `;
}

function getManagerThreadRowGroup(row = {}) {
  const type = String(row?.type || "").toLowerCase();

  if (
    type === "drill_override" ||
    type === "drill_started" ||
    type === "drill_completed" ||
    type === "timed_challenge" ||
    type === "timed_challenge_completed" ||
    type === "timed_challenge_expired"
  ) {
    return "objective_timeline";
  }

  if (type === "instruction") {
    return "coaching_notes";
  }

  if (type === "progress_report") {
    return "performance_reports";
  }

  return "other";
}

function getManagerThreadTemplateKey(row = {}) {
  const type = String(row?.type || "").toLowerCase();

  if (!type) return `row:${String(row?.id || "")}`;

  if (
    type === "drill_override" ||
    type === "drill_started" ||
    type === "drill_completed"
  ) {
    return "template:drill";
  }

  if (
    type === "timed_challenge" ||
    type === "timed_challenge_completed" ||
    type === "timed_challenge_expired"
  ) {
    return "template:timed_challenge";
  }

  if (
    type === "display_method_challenge" ||
    type === "display_method_challenge_completed" ||
    type === "display_method_challenge_expired"
  ) {
    return "template:display_method_challenge";
  }

  if (type === "progress_report") {
    return "template:progress_report";
  }

  if (type === "instruction") {
    return "template:instruction";
  }

  return `row:${String(row?.id || "")}`;
}

function buildManagerThreadTemplateRows(rows = []) {
  const ordered = Array.isArray(rows) ? rows : [];
  const latestByTemplate = new Map();

  for (const row of ordered) {
    const key = getManagerThreadTemplateKey(row);
    const existing = latestByTemplate.get(key);
    if (!existing) {
      latestByTemplate.set(key, row);
      continue;
    }

    const rowAt = new Date(row?.created_at || 0).getTime();
    const existingAt = new Date(existing?.created_at || 0).getTime();
    if (rowAt >= existingAt) {
      latestByTemplate.set(key, row);
    }
  }

  return Array.from(latestByTemplate.values()).sort(
    (a, b) => new Date(a?.created_at || 0) - new Date(b?.created_at || 0)
  );
}

function getManagerLatestTemplateRow(rows = []) {
  const templateRows = buildManagerThreadTemplateRows(rows);
  return templateRows[templateRows.length - 1] || null;
}

function renderManagerThreadGroupDivider(group = "") {
  const labelMap = {
    objective_timeline: "Objective Timeline",
    coaching_notes: "Coaching Notes",
    performance_reports: "Performance Reports",
    other: "Other Activity",
  };

  const label = labelMap[group] || "Thread Activity";

  return `
    <div style="
      display:flex;
      align-items:center;
      gap:8px;
      margin:12px 0 6px 0;
    ">
      <div class="small-text" style="
        opacity:.78;
        font-weight:700;
        letter-spacing:.02em;
        white-space:nowrap;
      ">
        ${escapeHtml(label)}
      </div>
      <div style="
        height:1px;
        flex:1;
        background:rgba(255,255,255,0.10);
      "></div>
    </div>
  `;
}

function renderManagerThreadMessagesGrouped(rows = [], nameMap = {}) {
  const ordered = buildManagerThreadTemplateRows(rows);
  let html = "";
  let lastGroup = "";

  for (const row of ordered) {
    const group = getManagerThreadRowGroup(row);

    if (group !== lastGroup) {
      html += renderManagerThreadGroupDivider(group);
      lastGroup = group;
    }

    html += renderMbMessageItem(row, nameMap);
  }

  return html;
}

function renderManagerThreadTimeline(rows = [], nameMap = {}) {
  const ordered = Array.isArray(rows)
    ? rows.filter((row) => getManagerThreadRowGroup(row) === "objective_timeline")
    : [];

  if (!ordered.length) {
    return `<div class="small-text" style="opacity:.75;">No objective timeline yet.</div>`;
  }

  return renderManagerThreadMessagesGrouped(ordered, nameMap);
}

function renderManagerThreadSnapshot(rows = []) {
  const ordered = Array.isArray(rows) ? rows : [];
  const latestReport = [...ordered]
    .filter((row) => String(row?.type || "") === "progress_report")
    .sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0))[0] || null;
  const latestObjective = [...ordered]
    .filter((row) => getManagerThreadRowGroup(row) === "objective_timeline")
    .sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0))[0] || null;

  const report = getProgressReportPayload(latestReport) || null;
  const objectiveDisplay = latestObjective ? getManagerMessageDisplayBody(latestObjective) : null;

  return `
    <div style="font-weight:600;">Thread Snapshot</div>
    <div class="small-text" style="margin-top:6px; opacity:.75;">
      Objectives and performance reports now appear together in the activity feed below.
    </div>
    <div style="margin-top:10px; display:grid; gap:8px;">
      <div class="card" style="padding:10px;">
        <div style="font-weight:600;">Latest Objective</div>
        <div class="small-text" style="margin-top:6px; opacity:.82;">
          ${escapeHtml(String(objectiveDisplay?.title || "No objective activity yet."))}
        </div>
        ${objectiveDisplay?.detail ? `
          <div class="small-text" style="margin-top:4px; opacity:.7;">
            ${escapeHtml(String(objectiveDisplay.detail))}
          </div>
        ` : ""}
      </div>
      <div class="card" style="padding:10px;">
        <div style="font-weight:600;">Latest Performance Reflection</div>
        ${report ? `
          <div class="small-text" style="margin-top:6px; opacity:.82;">
            Encounter ${escapeHtml(String(report.encounterNumber ?? "-"))} •
            Guest ${escapeHtml(String(report.guestStateActual || "-"))} •
            Signal ${escapeHtml(String(report.chainSignal || "-"))}
          </div>
          <div class="small-text" style="margin-top:6px; opacity:.9;">
            Strongest: ${escapeHtml(String(report.strongestSkill ?? "-"))} •
            Needs work: ${escapeHtml(String(report.weakestSkill ?? "-"))}
          </div>
        ` : `
          <div class="small-text" style="margin-top:6px; opacity:.75;">
            No performance report yet for this waiter.
          </div>
        `}
      </div>
    </div>
  `;
}

function renderManagerThreadBody(rows = [], nameMap = {}) {
  const ordered = buildManagerThreadTemplateRows(rows);

  if (!ordered.length) {
    return `<div class="small-text" style="opacity:.75;">No thread messages yet.</div>`;
  }

  return renderManagerThreadMessagesGrouped(ordered, nameMap);
}

function renderManagerThreadListItem(thread, nameMap) {
  const active = String(window.__BC_MB_ACTIVE_THREAD_USER_ID__ || "") === String(thread.userId || "");
  const name = escapeHtml(String(thread?.title || userLabel(thread.userId, nameMap)));
  const preview = escapeHtml(String(thread.latestBody || "").slice(0, 80));
  const when = escapeHtml(String(thread.latestAt || ""));
  const type = escapeHtml(String(getManagerThreadListTypeLabel(thread?.latestType || "message")));

  return `
    <button
      type="button"
      class="btn-ghost"
      data-thread-user-id="${thread.userId}"
      style="
        width:100%;
        text-align:left;
        border-radius:0;
        border:0;
        border-bottom:1px solid rgba(255,255,255,0.08);
        background:${active ? "rgba(255,255,255,0.08)" : "transparent"};
        padding:10px;
      ">
      <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
        <strong>${name}</strong>
        <span class="small-text" style="opacity:.6;">${when}</span>
      </div>
      <div class="small-text" style="margin-top:4px; opacity:.75;">${type}</div>
      <div class="small-text" style="margin-top:4px; opacity:.85;">${preview}</div>
    </button>
  `;
}

function buildManagerSuggestedPrompts(thread) {
  const host = mbEl("mbSuggestedPrompts");
  if (!host) return;

  const rows = [...(thread?.rows || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const latest = rows[rows.length - 1];
  const payload = getProgressReportPayload(latest) || {};
  const suggestions = [];
  const rec = getAutomaticDrillRecommendationForThread(thread);

  if (rec && !rec.cooldown) {
    suggestions.unshift(`Assign ${rec.label} drill (auto)`);
  }

  if (rec && rec.cooldown) {
    suggestions.unshift(`Cooldown active: ${rec.label} drill was assigned recently`);
  }

  const sig = String(payload?.chainSignal || "").toLowerCase();
  const guest = String(payload?.guestStateActual || "").toLowerCase();
  const promoSuggestions = [
    "Promo: lead with the featured wine first, then close the table with one clear next step.",
    "Promo: keep the pitch simple, name the bottle, and give the guest one strong reason to buy it now.",
  ];

  if (sig === "red" || sig === "soft_close") {
    suggestions.push("Keep it shorter and confirm guest intent first.");
    suggestions.push("Run a 5-minute Guest Reading drill before next shift.");
    suggestions.push("Offer two confident options instead of over-explaining.");
  } else {
    suggestions.push("Good progress. Keep your close crisp and confident.");
    suggestions.push("Stay concise and guide the guest to a decision.");
  }

  if (guest === "decider" || guest === "dictator") {
    suggestions.push("With Dictators: lead quickly with two strong options.");
  }

  const allSuggestions = [...promoSuggestions, ...suggestions];

  window.__BC_MB_SELECTED_SUGGESTION__ = allSuggestions[0] || "";

  host.innerHTML = allSuggestions
    .map((txt) => `<button type="button" class="btn-ghost" data-suggested-prompt="${escapeHtml(txt)}">${escapeHtml(txt)}</button>`)
    .join("");
}

function renderManagerThreadRecommendation(thread) {
  const rec = getAutomaticDrillRecommendationForThread(thread);
  if (!rec) return "";

  if (rec.cooldown) {
    return `
      <div style="
        margin-top:12px;
        padding:10px;
        border-radius:10px;
        background:rgba(255,180,0,0.10);
        border:1px solid rgba(255,180,0,0.30);
      ">
        <div style="font-weight:600;">Recommended Drill</div>
        <div class="small-text" style="margin-top:6px; opacity:.9;">
          ${escapeHtml(rec.label)} is below target at ${escapeHtml(String(rec.pct))}%,
          but this drill was assigned recently.
        </div>
        <div class="small-text" style="margin-top:6px; opacity:.7;">
          Cooldown active — try coaching first or wait before reassigning the same drill.
        </div>
      </div>
    `;
  }

  return `
    <div style="
      margin-top:12px;
      padding:10px;
      border-radius:10px;
      background:rgba(255,140,0,0.10);
      border:1px solid rgba(255,140,0,0.35);
    ">
      <div style="font-weight:600;">Recommended Drill</div>
      <div class="small-text" style="margin-top:6px; opacity:.9;">
        ${escapeHtml(rec.label)} is at ${escapeHtml(String(rec.pct))}% and needs focused work.
      </div>
      <button
        class="btn"
        type="button"
        data-auto-drill-focus="${escapeHtml(rec.focus)}"
        style="margin-top:8px;"
      >
        Assign ${escapeHtml(rec.label)} Drill
      </button>
    </div>
  `;
}

function getManagerMessageKindMeta(row = {}) {
  const type = String(row?.type || "").toLowerCase();

  const map = {
    drill_override: {
      badge: "ASSIGNED",
      tone: "neutral",
      title: "Assigned Drill",
    },
    drill_started: {
      badge: "STARTED",
      tone: "info",
      title: "Drill Started",
    },
    drill_completed: {
      badge: "COMPLETE",
      tone: "success",
      title: "Drill Completed",
    },
    timed_challenge: {
      badge: "CHALLENGE",
      tone: "neutral",
      title: "Timed Challenge Sent",
    },
    timed_challenge_completed: {
      badge: "WON",
      tone: "success",
      title: "Challenge Completed",
    },
    timed_challenge_expired: {
      badge: "EXPIRED",
      tone: "warning",
      title: "Challenge Expired",
    },
    instruction: {
      badge: "NOTE",
      tone: "neutral",
      title: "Instruction Sent",
    },
    progress_report: {
      badge: "REPORT",
      tone: "info",
      title: "Progress Report",
    },
  };

  return map[type] || {
    badge: "",
    tone: "default",
    title: "",
  };
}

function getManagerThreadListTypeLabel(type = "") {
  const key = String(type || "").toLowerCase();
  const map = {
    drill_override: "Drill Assigned",
    drill_started: "Drill Started",
    drill_completed: "Drill Done",
    timed_challenge: "Challenge Sent",
    timed_challenge_completed: "Challenge Won",
    timed_challenge_expired: "Challenge Expired",
    display_method_challenge: "Display Challenge",
    display_method_challenge_completed: "Display Won",
    display_method_challenge_expired: "Display Expired",
    instruction: "Instruction",
    progress_report: "Progress Update",
  };

  return map[key] || getManagerMessageKindMeta({ type: key })?.title || "Message";
}

function renderManagerMessageBadge(row = {}) {
  const meta = getManagerMessageKindMeta(row);
  if (!meta.badge) return "";

  const toneStyles = {
    success: "background:rgba(34,197,94,0.16); border:1px solid rgba(34,197,94,0.35);",
    warning: "background:rgba(245,158,11,0.16); border:1px solid rgba(245,158,11,0.35);",
    info: "background:rgba(96,165,250,0.16); border:1px solid rgba(96,165,250,0.35);",
    neutral: "background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12);",
    default: "background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.10);",
  };

  const style = toneStyles[meta.tone] || toneStyles.default;

  return `
    <span style="
      display:inline-flex;
      align-items:center;
      padding:3px 8px;
      border-radius:999px;
      font-size:11px;
      font-weight:700;
      letter-spacing:.03em;
      ${style}
    ">
      ${escapeHtml(meta.badge)}
    </span>
  `;
}

function getManagerMessageDisplayBody(row = {}) {
  const type = String(row?.type || "").toLowerCase();
  const payload = row?.payload || {};

  if (type === "drill_override") {
    const drill = payload?.drill || {};
    const focus = getManagerDrillFocusLabel(drill?.focus || "");
    const reps = Number(drill?.repTarget || drill?.rep_target || 0) || null;
    const durationSec = Number(drill?.durationSec || drill?.duration_sec || 0) || null;
    const mins = durationSec ? Math.floor(durationSec / 60) : null;
    return {
      title: `Assigned ${focus} drill`,
      detail: [
        reps ? `${reps} reps` : "",
        mins ? `${mins} min` : "",
      ].filter(Boolean).join(" • "),
    };
  }

  if (type === "drill_started") {
    const focus = getManagerDrillFocusLabel(payload?.focus || "");
    const reps = Number(payload?.repTarget || 0) || null;
    const time = formatManagerTimeShort(payload?.startedAt || row?.created_at);
    return {
      title: `Started ${focus} drill`,
      detail: [
        reps ? `${reps} reps` : "",
        time || "",
      ].filter(Boolean).join(" • "),
    };
  }

  if (type === "drill_completed") {
    const focus = getManagerDrillFocusLabel(payload?.focus || "");
    const repsDone = Number(payload?.repsDone || 0) || null;
    const repTarget = Number(payload?.repTarget || 0) || null;
    const completedTime = formatManagerTimeShort(payload?.completedAt || row?.created_at);
    return {
      title: `Completed ${focus} drill`,
      detail: [
        repsDone && repTarget ? `${repsDone}/${repTarget} reps` : "",
        completedTime || "",
      ].filter(Boolean).join(" • "),
    };
  }

  if (type === "timed_challenge") {
    const title = getManagerChallengeLabel(payload);
    const durationSec = Number(payload?.durationSec || 0) || null;
    const reward = Number(payload?.rewardPoints || 0) || null;
    const mins = durationSec ? Math.floor(durationSec / 60) : null;
    return {
      title: "Challenge Sent",
      detail: [
        title,
        mins ? `${mins} min` : "",
        reward ? `Reward ${reward}` : "",
      ].filter(Boolean).join(" • "),
    };
  }

  if (type === "timed_challenge_completed") {
    const title = getManagerChallengeLabel(payload);
    const reward = Number(payload?.rewardPoints || 0) || null;
    const outcome = getTimedChallengeLabel(payload?.outcome || "");
    return {
      title: `Completed ${title}`,
      detail: [
        payload?.outcome ? `Outcome: ${outcome}` : "",
        reward ? `Reward ${reward}` : "",
      ].filter(Boolean).join(" • "),
    };
  }

  if (type === "timed_challenge_expired") {
    const title = getManagerChallengeLabel(payload);
    return {
      title: "Challenge Expired",
      detail: [
        title,
        "Time ran out",
      ].filter(Boolean).join(" • "),
    };
  }

  if (type === "instruction") {
    return {
      title: "Instruction sent",
      detail: String(row?.body || ""),
    };
  }

  if (type === "progress_report") {
    const encounterNo = payload?.encounterNumber ?? "—";
    const guest = String(payload?.guestStateActual || "").trim();
    const signal = String(payload?.chainSignal || "").trim();
    const grade = String(payload?.performanceGrade || payload?.grade || "").trim();
    return {
      title: `Encounter ${encounterNo} report`,
      detail: [
        guest ? `Guest: ${guest}` : "",
        signal ? `Signal: ${signal}` : "",
        grade ? `Grade: ${grade}` : "",
      ].filter(Boolean).join(" • "),
    };
  }

  return {
    title: String(row?.body || "Message"),
    detail: "",
  };
}

function getManagerChallengeLabel(payload = {}) {
  const title = String(payload?.title || "").trim();
  if (title) return title;

  const key = String(payload?.challengeKey || "").trim().toLowerCase();
  return getTimedChallengeLabel(key || "challenge");
}

function getManagerThreadMetaSummary(threadRows = []) {
  const rows = Array.isArray(threadRows) ? threadRows : [];
  const latestChallenge = [...rows]
    .filter((row) => String(row?.type || "") === "timed_challenge")
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-1)[0] || null;
  const latestChallengeCompleted = [...rows]
    .filter((row) => String(row?.type || "") === "timed_challenge_completed")
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-1)[0] || null;
  const latestChallengeExpired = [...rows]
    .filter((row) => String(row?.type || "") === "timed_challenge_expired")
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-1)[0] || null;
  const latestDrillOverride = [...rows]
    .filter((row) => String(row?.type || "") === "drill_override")
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-1)[0] || null;
  const latestDrillStarted = [...rows]
    .filter((row) => String(row?.type || "") === "drill_started")
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-1)[0] || null;
  const latestDrillCompleted = [...rows]
    .filter((row) => String(row?.type || "") === "drill_completed")
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-1)[0] || null;

  const drillCompletedAt = latestDrillCompleted ? new Date(latestDrillCompleted.created_at || 0).getTime() : 0;
  const drillStartedAt = latestDrillStarted
    ? (
        Number(latestDrillStarted?.payload?.startedAt || 0) ||
        new Date(latestDrillStarted.created_at || 0).getTime()
      )
    : 0;
  const drillOverrideAt = latestDrillOverride ? new Date(latestDrillOverride.created_at || 0).getTime() : 0;

  const challengeCompletedAt = latestChallengeCompleted ? new Date(latestChallengeCompleted.created_at || 0).getTime() : 0;
  const challengeExpiredAt = latestChallengeExpired ? new Date(latestChallengeExpired.created_at || 0).getTime() : 0;
  const challengeAssignedAt = latestChallenge ? new Date(latestChallenge.created_at || 0).getTime() : 0;

  const parts = [];

  if (drillCompletedAt && drillCompletedAt >= Math.max(drillStartedAt, drillOverrideAt)) {
    const payload = latestDrillCompleted?.payload || {};
    const focusLabel = getManagerDrillFocusLabel(payload?.focus || "");
    parts.push(`${focusLabel} drill completed`);
  } else if (drillStartedAt && drillStartedAt >= drillOverrideAt) {
    const payload = latestDrillStarted?.payload || {};
    const focusLabel = getManagerDrillFocusLabel(payload?.focus || "");
    parts.push(`${focusLabel} drill in progress`);
  } else if (drillOverrideAt) {
    const payload = latestDrillOverride?.payload || {};
    const drill = payload?.drill || {};
    const focusLabel = getManagerDrillFocusLabel(drill?.focus || "");
    parts.push(`${focusLabel} drill ready`);
  }

  if (challengeCompletedAt && challengeCompletedAt >= Math.max(challengeAssignedAt, challengeExpiredAt)) {
    const payload = latestChallengeCompleted?.payload || {};
    const label = getManagerChallengeLabel(payload);
    parts.push(`${label} completed`);
  } else if (challengeExpiredAt && challengeExpiredAt >= challengeAssignedAt) {
    const payload = latestChallengeExpired?.payload || {};
    const label = getManagerChallengeLabel(payload);
    parts.push(`${label} expired`);
  } else if (challengeAssignedAt) {
    const payload = latestChallenge?.payload || {};
    const label = getManagerChallengeLabel(payload);
    parts.push(`${label} active`);
  }

  return parts.join(" • ") || "No current objective";
}

function getManagerDrillFocusLabel(focus = "") {
  const key = String(focus || "").toLowerCase();

  const map = {
    read: "Read",
    frame: "Frame",
    delivery: "Delivery",
    recovery: "Recovery",
    closing: "Closing",
  };

  return map[key] || (focus ? String(focus) : "Drill");
}

function formatManagerTimeShort(ts) {
  if (!ts) return "";

  let ms = Number(ts);
  if (!Number.isFinite(ms) || ms <= 0) {
    ms = new Date(ts).getTime();
  }
  if (!Number.isFinite(ms) || ms <= 0) return "";

  try {
    return new Date(ms).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function getTransientStartedDrillSummaryForActiveThread() {
  const started = window.__BC_PARENT_LAST_DRILL_STARTED__ || null;
  if (!started) return null;

  const activeUserId = String(window.__BC_MB_ACTIVE_THREAD_USER_ID__ || "");
  if (!activeUserId) return null;

  const assignedMessageId = String(started?.assignedMessageId || "");
  if (!assignedMessageId) return null;

  const threadRows = Array.isArray(window.__BC_MB_ACTIVE_THREAD_ROWS__)
    ? window.__BC_MB_ACTIVE_THREAD_ROWS__
    : [];

  const matchingRow = threadRows.find(
    (row) =>
      String(row?.id || "") === assignedMessageId &&
      String(row?.type || "") === "drill_override"
  );

  if (!matchingRow) return null;

  const rowReceiverId = String(matchingRow?.receiver_user_id || "");
  if (rowReceiverId && activeUserId && rowReceiverId !== activeUserId) {
    return null;
  }

  const at = Number(started?.at || 0);
  if (!isRecentTransientTimestamp(at, 1000 * 60 * 20)) {
    return null;
  }

  return {
    assignedMessageId,
    focus: String(started?.payload?.focus || ""),
    repTarget: Number(started?.payload?.repTarget || 0) || null,
    at,
  };
}

function renderManagerThreadDrillSummary() {
  const root = document.getElementById("mbThreadDrillSummary");
  if (!root) return;

  const activeUserId = String(window.__BC_MB_ACTIVE_THREAD_USER_ID__ || "");
  if (!activeUserId) {
    root.textContent = "";
    return;
  }

  const threadRows = Array.isArray(window.__BC_MB_ACTIVE_THREAD_ROWS__)
    ? window.__BC_MB_ACTIVE_THREAD_ROWS__
    : [];

  const latestDrillOverride = [...threadRows]
    .filter((row) => String(row?.type || "") === "drill_override")
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-1)[0] || null;

  const latestDrillCompleted = [...threadRows]
    .filter((row) => String(row?.type || "") === "drill_completed")
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-1)[0] || null;

  const latestDrillStarted = [...threadRows]
    .filter((row) => String(row?.type || "") === "drill_started")
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-1)[0] || null;

  const transientStarted = getTransientStartedDrillSummaryForActiveThread();

  const completedAt = latestDrillCompleted ? new Date(latestDrillCompleted.created_at || 0).getTime() : 0;
  const startedAt = latestDrillStarted
    ? (
        Number(latestDrillStarted?.payload?.startedAt || 0) ||
        new Date(latestDrillStarted.created_at || 0).getTime()
      )
    : 0;

  if (latestDrillCompleted && completedAt >= startedAt) {
    const payload = latestDrillCompleted?.payload || {};
    const focusLabel = getManagerDrillFocusLabel(payload?.focus || "");
    const repsDone = Number(payload?.repsDone || 0) || null;
    const repTarget = Number(payload?.repTarget || 0) || null;

    root.innerHTML = `
      <span style="opacity:.95;">Last drill completed</span>
      ${focusLabel ? `<span style="opacity:.75;"> • ${escapeHtml(focusLabel)}</span>` : ``}
      ${(repsDone && repTarget) ? `<span style="opacity:.7;"> • ${escapeHtml(`${repsDone}/${repTarget} reps`)}</span>` : ``}
    `;
    return;
  }

  if (latestDrillStarted) {
    const payload = latestDrillStarted?.payload || {};
    const focusLabel = getManagerDrillFocusLabel(payload?.focus || "");
    const timeLabel = formatManagerTimeShort(payload?.startedAt || latestDrillStarted?.created_at);

    root.innerHTML = `
      <span style="opacity:.95;">Waiter started assigned drill</span>
      ${focusLabel ? `<span style="opacity:.75;"> • ${escapeHtml(focusLabel)}</span>` : ``}
      ${timeLabel ? `<span style="opacity:.7;"> • ${escapeHtml(timeLabel)}</span>` : ``}
    `;
    return;
  }

  if (transientStarted) {
    const focusLabel = getManagerDrillFocusLabel(transientStarted.focus);
    const timeLabel = formatManagerTimeShort(transientStarted.at);

    root.innerHTML = `
      <span style="opacity:.95;">Waiter started assigned drill</span>
      <span style="opacity:.75;"> • ${escapeHtml(focusLabel)}</span>
      ${timeLabel ? `<span style="opacity:.7;"> • ${escapeHtml(timeLabel)}</span>` : ``}
    `;
    return;
  }

  if (latestDrillOverride) {
    const payload = latestDrillOverride?.payload || {};
    const drill = payload?.drill || {};
    const focusLabel = getManagerDrillFocusLabel(drill?.focus || "");
    const repTarget = Number(drill?.repTarget || drill?.rep_target || 0) || null;

    root.innerHTML = `
      <span style="opacity:.95;">Assigned drill ready</span>
      ${focusLabel ? `<span style="opacity:.75;"> • ${escapeHtml(focusLabel)}</span>` : ``}
      ${repTarget ? `<span style="opacity:.7;"> • ${escapeHtml(`${repTarget} reps`)}</span>` : ``}
    `;
    return;
  }

  root.innerHTML = `
    <span style="opacity:.75;">No drill lifecycle yet for this waiter.</span>
  `;
}

function renderManagerBoardDrillSummary() {
  const lastAssigned = getRecentDrillAssignedRow();
  const lastCompleted = getRecentDrillCompletedRow();

  const assignedText = lastAssigned
    ? (() => {
        const p = lastAssigned?.payload?.drill || {};
        const focus = String(p?.focus || "-");
        const reps = Number(p?.repTarget || 0) || "-";
        const duration = Number(p?.durationSec || 0) || 0;
        const waiter = getTimedChallengeActorLabel?.(lastAssigned) || resolveManagerBoardUserLabel(lastAssigned?.receiver_user_id) || "Waiter";
        return `${focus} • ${reps} reps • ${duration}s • ${waiter}`;
      })()
    : "None";

  const completedText = lastCompleted
    ? (() => {
        const p = lastCompleted?.payload || {};
        const focus = String(p?.focus || "-");
        const repsDone = Number(p?.repsDone || 0);
        const repTarget = Number(p?.repTarget || 0);
        const durationSec = Number(p?.durationSec || 0);
        const mins = durationSec ? Math.floor(durationSec / 60) : 0;
        const secs = durationSec ? durationSec % 60 : 0;
        const waiter = getTimedChallengeActorLabel?.(lastCompleted) || resolveManagerBoardUserLabel(lastCompleted?.sender_user_id) || "Waiter";
        return `${focus} • ${repsDone}/${repTarget} reps • ${mins}m ${secs}s • ${waiter}`;
      })()
    : "None";

  const summaryHtml = `
    <div><b>Last assigned:</b> ${escapeHtml(assignedText)}</div>
    <div style="margin-top:4px;"><b>Last completed:</b> ${escapeHtml(completedText)}</div>
  `;

  const overviewRoot = mbEl("mbDrillSummary");
  if (overviewRoot) {
    overviewRoot.innerHTML = `
      <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
        <div style="font-weight:600;">Restaurant Drill Summary</div>
        ${summaryHtml}
      </div>
    `;
  }
}

function renderManagerDrillSummary() {
  return renderManagerBoardDrillSummary?.();
}

function renderManagerPeopleSummary() {
  const root = document.getElementById("mbPeopleSummary");
  if (!root) return;

  const rows = Array.isArray(window.__BC_MB_STAFF_ROWS__) ? window.__BC_MB_STAFF_ROWS__ : [];
  const waiters = rows.filter((row) => normalizeMembershipRole(row) === "waiter").length;
  const managers = rows.length - waiters;
  const invites = getManagerBoardInvites();
  const pendingInvites = invites.filter((row) => String(row?.status || "") === "pending").length;

  root.innerHTML = `
    <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
      <div style="font-weight:600;">People</div>
      <div><b>Members:</b> ${rows.length}</div>
      <div><b>Waiters:</b> ${waiters}</div>
      <div><b>Managers:</b> ${managers}</div>
      <div><b>Pending invites:</b> ${pendingInvites}</div>
    </div>
  `;
}

function getManagerLiveEffectsState() {
  if (!window.__BC_MANAGER_LIVE_EFFECTS_STATE__) {
    window.__BC_MANAGER_LIVE_EFFECTS_STATE__ = {
      attributeEffects: [],
      areaEffects: [],
      updatedAt: Date.now(),
    };
  }
  return window.__BC_MANAGER_LIVE_EFFECTS_STATE__;
}

function pushLiveEffectsToGame() {
  try {
    const frame =
      document.getElementById("bcPremiumFrame") ||
      document.getElementById("premiumRootFrame");

    const win = frame?.contentWindow || null;
    if (!win) return false;

    const state = getManagerLiveEffectsState();

    win.postMessage(
      {
        source: "BC_MSG",
        v: 1,
        type: "live_effects_sync",
        attributeEffects: state.attributeEffects,
        areaEffects: state.areaEffects,
        epoch: Number(window.__BC_IFRAME_EPOCH__ || 0),
      },
      window.location.origin
    );

    return true;
  } catch (e) {
    console.warn("[LIVE EFFECTS] push to game failed", e);
    return false;
  }
}

function setManagerLiveEffectsState(nextState = {}) {
  const prev = getManagerLiveEffectsState();

  window.__BC_MANAGER_LIVE_EFFECTS_STATE__ = {
    attributeEffects: Array.isArray(nextState.attributeEffects)
      ? nextState.attributeEffects
      : Array.isArray(prev.attributeEffects)
        ? prev.attributeEffects
        : [],
    areaEffects: Array.isArray(nextState.areaEffects)
      ? nextState.areaEffects
      : Array.isArray(prev.areaEffects)
        ? prev.areaEffects
        : [],
    updatedAt: Date.now(),
  };

  safeCall("renderManagerLiveEffectsPanels", () => renderManagerLiveEffectsPanels?.());
  refreshManagerRuntimeSurfaces?.({
    thread: false,
    board: true,
    economy: true,
    liveControls: true,
    challengeMeta: true,
  });
  safeCall("pushLiveEffectsToGame", () => pushLiveEffectsToGame?.());

  return window.__BC_MANAGER_LIVE_EFFECTS_STATE__;
}

function updateManagerLiveEffectsState(patch = {}) {
  const prev = getManagerLiveEffectsState();
  return setManagerLiveEffectsState({
    attributeEffects: patch.attributeEffects ?? prev.attributeEffects,
    areaEffects: patch.areaEffects ?? prev.areaEffects,
  });
}

function getManagerAbilityEconomyState() {
  if (!window.__BC_MANAGER_ABILITY_ECONOMY__) {
    window.__BC_MANAGER_ABILITY_ECONOMY__ = {
      influence: 5,
      maxInfluence: 5,
      cooldowns: {},
      updatedAt: Date.now(),
      lastRegenAt: Date.now(),
    };
  }
  return window.__BC_MANAGER_ABILITY_ECONOMY__;
}

function setManagerAbilityEconomyState(nextState = {}) {
  const prev = getManagerAbilityEconomyState();

  window.__BC_MANAGER_ABILITY_ECONOMY__ = {
    influence: Number.isFinite(nextState.influence) ? Number(nextState.influence) : prev.influence,
    maxInfluence: Number.isFinite(nextState.maxInfluence) ? Number(nextState.maxInfluence) : prev.maxInfluence,
    cooldowns: nextState.cooldowns && typeof nextState.cooldowns === "object"
      ? { ...nextState.cooldowns }
      : { ...prev.cooldowns },
    updatedAt: Date.now(),
    lastRegenAt: Number.isFinite(nextState.lastRegenAt) ? Number(nextState.lastRegenAt) : Number(prev.lastRegenAt || Date.now()),
  };

  return window.__BC_MANAGER_ABILITY_ECONOMY__;
}

const MANAGER_INFLUENCE_REGEN_SEC = 20;
const MANAGER_MAX_CONCURRENT_EFFECTS = 2;

const MANAGER_EFFECT_COSTS = Object.freeze({
  closing_surge: 2,
  recovery_focus: 2,
  premium_window: 3,
  calm_floor: 2,
});

const MANAGER_CHALLENGE_COSTS = Object.freeze({
  closing_push: 1,
  recovery_window: 1,
  clean_close: 2,
  read_first: 1,
  full_delivery: 1,
  no_reset_run: 1,
  stable_signal: 1,
  solid_interaction: 1,
});

const MANAGER_EFFECT_COOLDOWNS_SEC = Object.freeze({
  closing_surge: 30,
  recovery_focus: 30,
  premium_window: 45,
  calm_floor: 30,
});

const MANAGER_CHALLENGE_COOLDOWNS_SEC = Object.freeze({
  closing_push: 20,
  recovery_window: 20,
  clean_close: 30,
  read_first: 15,
  full_delivery: 15,
  no_reset_run: 15,
  stable_signal: 15,
  solid_interaction: 15,
});

function getManagerCooldownRemaining(key = "") {
  const state = getManagerAbilityEconomyState();
  const expiresAt = Number(state?.cooldowns?.[key] || 0);
  if (!expiresAt) return 0;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
}

function isManagerActionOnCooldown(key = "") {
  return getManagerCooldownRemaining(key) > 0;
}

function canManagerSpendInfluence(cost = 0) {
  const state = getManagerAbilityEconomyState();
  return Number(state?.influence || 0) >= Number(cost || 0);
}

function spendManagerInfluence(cost = 0) {
  const state = getManagerAbilityEconomyState();
  const nextInfluence = Math.max(0, Number(state.influence || 0) - Number(cost || 0));
  setManagerAbilityEconomyState({
    ...state,
    influence: nextInfluence,
  });
}

function startManagerCooldown(key = "", durationSec = 0) {
  if (!key || !durationSec) return;
  const state = getManagerAbilityEconomyState();
  const cooldowns = { ...(state.cooldowns || {}) };
  cooldowns[key] = Date.now() + (Number(durationSec) * 1000);
  setManagerAbilityEconomyState({
    ...state,
    cooldowns,
  });
}

function tickManagerInfluenceRegen() {
  const state = getManagerAbilityEconomyState();
  const now = Date.now();

  const lastTickAt = Number(state?.lastRegenAt || state?.updatedAt || now);
  const influence = Number(state?.influence || 0);
  const maxInfluence = Number(state?.maxInfluence || 5);

  if (influence >= maxInfluence) {
    if (!state.lastRegenAt) {
      setManagerAbilityEconomyState({
        ...state,
        lastRegenAt: now,
      });
    }
    return;
  }

  const elapsedSec = Math.floor((now - lastTickAt) / 1000);
  if (elapsedSec < MANAGER_INFLUENCE_REGEN_SEC) return;

  const regenSteps = Math.floor(elapsedSec / MANAGER_INFLUENCE_REGEN_SEC);
  const nextInfluence = Math.min(maxInfluence, influence + regenSteps);
  const consumedMs = regenSteps * MANAGER_INFLUENCE_REGEN_SEC * 1000;

  setManagerAbilityEconomyState({
    ...state,
    influence: nextInfluence,
    lastRegenAt: lastTickAt + consumedMs,
  });
}

function ensureManagerInfluenceRegenTicker() {
  if (window.__BC_MANAGER_INFLUENCE_TICKER__) return;

  window.__BC_MANAGER_INFLUENCE_TICKER__ = setInterval(() => {
    try {
      const before = Number(getManagerAbilityEconomyState()?.influence || 0);
      tickManagerInfluenceRegen();
      const after = Number(getManagerAbilityEconomyState()?.influence || 0);

      if (after !== before) {
        safeCall("renderManagerActiveThread", () => renderManagerActiveThread(new Map()));
        refreshManagerRuntimeSurfaces?.();
      }
    } catch (e) {
      console.warn("[ECONOMY] regen tick failed", e);
    }
  }, 1000);
}

function formatManagerActionCost(cost = 0) {
  return `${Number(cost || 0)} inf`;
}

function formatManagerCooldownLabel(key = "") {
  const remaining = getManagerCooldownRemaining(key);
  return remaining > 0 ? `${remaining}s cd` : "";
}

function getManagerActionMetaLabel(key = "", cost = 0) {
  const cooldown = formatManagerCooldownLabel(key);
  const costLabel = formatManagerActionCost(cost);

  return cooldown
    ? `${costLabel} • ${cooldown}`
    : costLabel;
}

function getManagerActionBlockReason({ key = "", cost = 0, type = "challenge" } = {}) {
  if (isManagerActionOnCooldown(key)) {
    return `Cooldown ${getManagerCooldownRemaining(key)}s`;
  }

  if (!canManagerSpendInfluence(cost)) {
    return "Not enough influence";
  }

  if (type === "effect" && !canManagerActivateAnotherEffect()) {
    return "Live effect cap reached";
  }

  return "";
}

function isManagerActionAvailable({ key = "", cost = 0, type = "challenge" } = {}) {
  return !getManagerActionBlockReason({ key, cost, type });
}

function getManagerActiveEffectCount() {
  const state = getManagerLiveEffectsState();
  const attributeCount = Array.isArray(state?.attributeEffects)
    ? state.attributeEffects.filter((x) => !!x?.active).length
    : 0;
  const areaCount = Array.isArray(state?.areaEffects)
    ? state.areaEffects.filter((x) => !!x?.active).length
    : 0;

  return attributeCount + areaCount;
}

function canManagerActivateAnotherEffect() {
  return getManagerActiveEffectCount() < MANAGER_MAX_CONCURRENT_EFFECTS;
}

function getManagerActiveEffectCountLabel() {
  return `${getManagerActiveEffectCount()} / ${MANAGER_MAX_CONCURRENT_EFFECTS}`;
}

function refillManagerInfluenceForTesting() {
  const state = getManagerAbilityEconomyState();
  setManagerAbilityEconomyState({
    ...state,
    influence: state.maxInfluence,
  });
  renderManagerAbilityEconomyPanel?.();
}

function wireManagerAbilityEconomyPanel() {
  const btn = document.getElementById("mbRefillInfluence");
  if (!btn || btn.__wired) return;
  btn.__wired = true;
  btn.addEventListener("click", () => {
    refillManagerInfluenceForTesting();
  });
}

function renderManagerAbilityEconomyPanel() {
  const root = document.getElementById("mbOverviewAbilityEconomy");
  if (!root) return;

  tickManagerInfluenceRegen?.();
  ensureManagerInfluenceRegenTicker?.();

  const state = getManagerAbilityEconomyState();
  const nextRegenIn = Math.max(
    0,
    MANAGER_INFLUENCE_REGEN_SEC - Math.floor((Date.now() - Number(state?.lastRegenAt || Date.now())) / 1000)
  );

  root.innerHTML = `
    <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div style="font-weight:600;">Manager Influence</div>
        <button id="mbRefillInfluence" class="btn-ghost" type="button">Refill</button>
      </div>

      <div class="small-text" style="opacity:.8;">
        Spend influence on live effects and timed challenges.
      </div>

      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <div style="
          padding:8px 10px;
          border:1px solid rgba(255,255,255,0.10);
          border-radius:999px;
        " class="small-text">
          Influence: ${escapeHtml(String(state.influence))} / ${escapeHtml(String(state.maxInfluence))}
        </div>
        <div style="
          padding:8px 10px;
          border:1px solid rgba(255,255,255,0.10);
          border-radius:999px;
        " class="small-text">
          Next regen: ${escapeHtml(String(nextRegenIn))}s
        </div>
        <div style="
          padding:8px 10px;
          border:1px solid rgba(255,255,255,0.10);
          border-radius:999px;
        " class="small-text">
          Live Effects: ${escapeHtml(getManagerActiveEffectCountLabel())}
        </div>
      </div>
    </div>
  `;

  wireManagerAbilityEconomyPanel?.();
}

function tryActivateManagerEffect(effect) {
  const effectId = String(effect?.id || "");
  const cost = Number(MANAGER_EFFECT_COSTS?.[effectId] || 0);
  const cooldownSec = Number(MANAGER_EFFECT_COOLDOWNS_SEC?.[effectId] || 0);

  if (isManagerActionOnCooldown(effectId)) {
    const remaining = getManagerCooldownRemaining(effectId);
    window.showToast?.(`${effect?.name || effectId} is on cooldown (${remaining}s)`);
    return false;
  }

  if (!canManagerActivateAnotherEffect()) {
    window.showToast?.(`Max live effects active (${MANAGER_MAX_CONCURRENT_EFFECTS}). Remove one first.`);
    return false;
  }

  if (!canManagerSpendInfluence(cost)) {
    window.showToast?.(`Not enough influence for ${effect?.name || effectId}`);
    return false;
  }

  spendManagerInfluence(cost);
  startManagerCooldown(effectId, cooldownSec);
  refreshManagerRuntimeSurfaces?.({
    thread: false,
    board: true,
    economy: true,
    liveControls: true,
    challengeMeta: false,
  });
  return true;
}

function makeLiveEffect(def = {}) {
  return {
    id: String(def.id || `effect_${Math.random().toString(16).slice(2)}`),
    name: String(def.name || "Effect"),
    description: String(def.description || ""),
    active: def.active !== false,
    scope: String(def.scope || "attribute"),
    kind: String(def.kind || "manual"),
    createdAt: Date.now(),
  };
}

function addManagerAttributeEffect(effectDef) {
  const state = getManagerLiveEffectsState();
  const next = [...(state.attributeEffects || []), makeLiveEffect({ ...effectDef, scope: "attribute" })];
  updateManagerLiveEffectsState({ attributeEffects: next });
}

function addManagerAreaEffect(effectDef) {
  const state = getManagerLiveEffectsState();
  const next = [...(state.areaEffects || []), makeLiveEffect({ ...effectDef, scope: "area" })];
  updateManagerLiveEffectsState({ areaEffects: next });
}

function renderManagerEffectRow(effect) {
  const id = String(effect?.id || "");
  const name = String(effect?.name || id || "Effect");
  const desc = String(effect?.description || "");
  const active = !!effect?.active;
  const kind = String(effect?.kind || "");

  return `
    <div
      style="
        padding:10px;
        border:1px solid rgba(255,255,255,0.10);
        border-radius:10px;
        background:${active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)"};
      "
    >
      <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
        <div>
          <div style="font-weight:600;">${escapeHtml(name)}</div>
          <div class="small" style="opacity:.8; margin-top:4px;">
            ${escapeHtml(desc || "No description.")}
          </div>
        </div>
        <div class="small" style="opacity:.75;">${escapeHtml(kind)}</div>
      </div>

      <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
        <button type="button" class="btn-ghost" data-effect-toggle="${escapeHtml(id)}">
          ${active ? "Disable" : "Enable"}
        </button>
        <button type="button" class="btn-ghost" data-effect-remove="${escapeHtml(id)}">
          Remove
        </button>
      </div>
    </div>
  `;
}

function wireManagerEffectRowActions() {
  document.querySelectorAll("[data-effect-toggle]").forEach((btn) => {
    if (btn.__wired) return;
    btn.__wired = true;

    btn.addEventListener("click", () => {
      const id = String(btn.getAttribute("data-effect-toggle") || "");
      if (!id) return;

      const state = getManagerLiveEffectsState();

      const nextAttribute = (state.attributeEffects || []).map((effect) =>
        String(effect?.id || "") === id
          ? { ...effect, active: !effect?.active }
          : effect
      );

      const nextArea = (state.areaEffects || []).map((effect) =>
        String(effect?.id || "") === id
          ? { ...effect, active: !effect?.active }
          : effect
      );

      updateManagerLiveEffectsState({
        attributeEffects: nextAttribute,
        areaEffects: nextArea,
      });
    });
  });

  document.querySelectorAll("[data-effect-remove]").forEach((btn) => {
    if (btn.__wired) return;
    btn.__wired = true;

    btn.addEventListener("click", () => {
      const id = String(btn.getAttribute("data-effect-remove") || "");
      if (!id) return;

      const state = getManagerLiveEffectsState();

      updateManagerLiveEffectsState({
        attributeEffects: (state.attributeEffects || []).filter((effect) => String(effect?.id || "") !== id),
        areaEffects: (state.areaEffects || []).filter((effect) => String(effect?.id || "") !== id),
      });
    });
  });
}

function wireManagerAttributeEffectsPanel() {
  const addClosingSurge = document.getElementById("btnAddClosingSurge");
  if (addClosingSurge && !addClosingSurge.__wired) {
    addClosingSurge.__wired = true;
    addClosingSurge.addEventListener("click", () => {
      const effect = {
        id: "closing_surge",
        name: "Closing Surge",
        kind: "attribute",
        description: "Improves closing pressure conversion for the current encounter window.",
        active: true,
      };
      if (!tryActivateManagerEffect(effect)) return;
      addManagerAttributeEffect(effect);
    });
  }

  const addRecoveryFocus = document.getElementById("btnAddRecoveryFocus");
  if (addRecoveryFocus && !addRecoveryFocus.__wired) {
    addRecoveryFocus.__wired = true;
    addRecoveryFocus.addEventListener("click", () => {
      const effect = {
        id: "recovery_focus",
        name: "Recovery Focus",
        kind: "attribute",
        description: "Improves recovery-related response shaping during tense guest states.",
        active: true,
      };
      if (!tryActivateManagerEffect(effect)) return;
      addManagerAttributeEffect(effect);
    });
  }

  wireManagerEffectRowActions?.();
}

function wireManagerAreaEffectsPanel() {
  const addPremiumWindow = document.getElementById("btnAddPremiumWindow");
  if (addPremiumWindow && !addPremiumWindow.__wired) {
    addPremiumWindow.__wired = true;
    addPremiumWindow.addEventListener("click", () => {
      const effect = {
        id: "premium_window",
        name: "Premium Window",
        kind: "area",
        description: "Improves premium-upgrade opportunity during the active encounter phase.",
        active: true,
      };
      if (!tryActivateManagerEffect(effect)) return;
      addManagerAreaEffect(effect);
    });
  }

  const addCalmFloor = document.getElementById("btnAddCalmFloor");
  if (addCalmFloor && !addCalmFloor.__wired) {
    addCalmFloor.__wired = true;
    addCalmFloor.addEventListener("click", () => {
      const effect = {
        id: "calm_floor",
        name: "Calm Floor",
        kind: "area",
        description: "Reduces pressure escalation and stabilizes the encounter atmosphere.",
        active: true,
      };
      if (!tryActivateManagerEffect(effect)) return;
      addManagerAreaEffect(effect);
    });
  }

  wireManagerEffectRowActions?.();
}

function renderManagerAttributeEffectsPanel() {
  const root = document.getElementById("mbAttributeAbilitiesPanel");
  if (!root) return;

  const state = getManagerLiveEffectsState();
  const effects = Array.isArray(state.attributeEffects) ? state.attributeEffects : [];
  const closingKey = "closing_surge";
  const recoveryKey = "recovery_focus";

  const closingCost = Number(MANAGER_EFFECT_COSTS?.[closingKey] || 0);
  const recoveryCost = Number(MANAGER_EFFECT_COSTS?.[recoveryKey] || 0);

  const closingMeta = getManagerActionMetaLabel(closingKey, closingCost);
  const recoveryMeta = getManagerActionMetaLabel(recoveryKey, recoveryCost);

  const closingBlocked = getManagerActionBlockReason({
    key: closingKey,
    cost: closingCost,
    type: "effect",
  });

  const recoveryBlocked = getManagerActionBlockReason({
    key: recoveryKey,
    cost: recoveryCost,
    type: "effect",
  });

  root.innerHTML = `
    <div class="card">
      <div style="font-weight:600; margin-bottom:8px;">Attribute Effects</div>
      <div class="small" style="opacity:.75; margin-bottom:8px;">
        Tactical, targeted effects that influence player-facing encounter attributes.
      </div>

      <div style="display:flex; flex-direction:column; gap:8px;">
        ${effects.length ? effects.map(renderManagerEffectRow).join("") : `
          <div class="small" style="opacity:.75;">No attribute effects loaded.</div>
        `}
      </div>

      <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
        <button
          type="button"
          class="btn-ghost"
          id="btnAddClosingSurge"
          ${closingBlocked ? "disabled" : ""}
          style="${closingBlocked ? "opacity:.6; cursor:not-allowed;" : ""}"
          title="${escapeHtml(closingBlocked || "Ready")}"
        >
          Closing Surge
          <span class="small-text" style="opacity:.7;"> • ${escapeHtml(closingMeta)}</span>
        </button>

        <button
          type="button"
          class="btn-ghost"
          id="btnAddRecoveryFocus"
          ${recoveryBlocked ? "disabled" : ""}
          style="${recoveryBlocked ? "opacity:.6; cursor:not-allowed;" : ""}"
          title="${escapeHtml(recoveryBlocked || "Ready")}"
        >
          Recovery Focus
          <span class="small-text" style="opacity:.7;"> • ${escapeHtml(recoveryMeta)}</span>
        </button>
      </div>

      <div class="small-text" style="opacity:.72; margin-top:8px;">
        ${escapeHtml(closingBlocked || recoveryBlocked || "Ready to activate an attribute effect.")}
      </div>
    </div>
  `;

  wireManagerAttributeEffectsPanel?.();
}

function renderManagerAreaEffectsPanel() {
  const root = document.getElementById("mbAreaAbilitiesPanel");
  if (!root) return;

  const state = getManagerLiveEffectsState();
  const effects = Array.isArray(state.areaEffects) ? state.areaEffects : [];
  const premiumKey = "premium_window";
  const calmKey = "calm_floor";

  const premiumCost = Number(MANAGER_EFFECT_COSTS?.[premiumKey] || 0);
  const calmCost = Number(MANAGER_EFFECT_COSTS?.[calmKey] || 0);

  const premiumMeta = getManagerActionMetaLabel(premiumKey, premiumCost);
  const calmMeta = getManagerActionMetaLabel(calmKey, calmCost);

  const premiumBlocked = getManagerActionBlockReason({
    key: premiumKey,
    cost: premiumCost,
    type: "effect",
  });

  const calmBlocked = getManagerActionBlockReason({
    key: calmKey,
    cost: calmCost,
    type: "effect",
  });

  root.innerHTML = `
    <div class="card">
      <div style="font-weight:600; margin-bottom:8px;">Area Effects</div>
      <div class="small" style="opacity:.75; margin-bottom:8px;">
        Broader environmental effects that shape the encounter atmosphere.
      </div>

      <div style="display:flex; flex-direction:column; gap:8px;">
        ${effects.length ? effects.map(renderManagerEffectRow).join("") : `
          <div class="small" style="opacity:.75;">No area effects loaded.</div>
        `}
      </div>

      <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
        <button
          type="button"
          class="btn-ghost"
          id="btnAddPremiumWindow"
          ${premiumBlocked ? "disabled" : ""}
          style="${premiumBlocked ? "opacity:.6; cursor:not-allowed;" : ""}"
          title="${escapeHtml(premiumBlocked || "Ready")}"
        >
          Premium Window
          <span class="small-text" style="opacity:.7;"> • ${escapeHtml(premiumMeta)}</span>
        </button>

        <button
          type="button"
          class="btn-ghost"
          id="btnAddCalmFloor"
          ${calmBlocked ? "disabled" : ""}
          style="${calmBlocked ? "opacity:.6; cursor:not-allowed;" : ""}"
          title="${escapeHtml(calmBlocked || "Ready")}"
        >
          Calm Floor
          <span class="small-text" style="opacity:.7;"> • ${escapeHtml(calmMeta)}</span>
        </button>
      </div>

      <div class="small-text" style="opacity:.72; margin-top:8px;">
        ${escapeHtml(premiumBlocked || calmBlocked || "Ready to activate an area effect.")}
      </div>
    </div>
  `;

  wireManagerAreaEffectsPanel?.();
}

function renderManagerLiveControlPanels() {
  safeCall("renderManagerBoardOverviewLiveEffects", () => renderManagerBoardOverviewLiveEffects?.());
  safeCall("renderManagerAbilityEconomyPanel", () => renderManagerAbilityEconomyPanel?.());
  safeCall("renderManagerAttributeEffectsPanel", () => renderManagerAttributeEffectsPanel?.());
  safeCall("renderManagerAreaEffectsPanel", () => renderManagerAreaEffectsPanel?.());
  safeCall("renderManagerTimedChallengeActionPanel", () => renderManagerTimedChallengeActionPanel?.());
  safeCall("renderManagerDisplayMethodActionPanel", () => renderManagerDisplayMethodActionPanel?.());
}

function renderProfileScreen() {
  const profile = appState?.profile || {};
  const restaurant = appState?.restaurant || {};
  const roleLabel = getDisplayRoleLabel(profile);

  const displayNameEl = document.getElementById("profileDisplayName");
  const roleEl = document.getElementById("profileRole");
  const restaurantEl = document.getElementById("profileRestaurant");
  const scopeTypeEl = document.getElementById("profileScopeType");
  const scopeIdEl = document.getElementById("profileScopeId");
  const accessTierEl = document.getElementById("profileAccessTier");
  const standingCard = document.getElementById("profileStandingCard");
  const badgeShelf = document.getElementById("profileBadgeShelf");
  const insightCard = document.getElementById("profileInsightCard");
  const tutorialCard = document.getElementById("profileTutorialCard");

  if (displayNameEl) {
    displayNameEl.textContent =
      profile?.display_name ||
      profile?.displayName ||
      appState?.session?.user?.email ||
      "-";
  }

  if (roleEl) roleEl.textContent = roleLabel || "-";
  if (restaurantEl) restaurantEl.textContent = restaurant?.name || restaurant?.id || "-";
  if (scopeTypeEl) scopeTypeEl.textContent = profile?.scope_type || profile?.scopeType || "-";
  if (scopeIdEl) scopeIdEl.textContent = profile?.scope_id || profile?.scopeId || "-";
  if (accessTierEl) accessTierEl.textContent = profile?.access_tier || profile?.accessTier || "-";

  if (standingCard) {
    standingCard.innerHTML = `
      <div class="card">
        <div style="font-weight:600; margin-bottom:8px;">My Standing</div>
        <div class="small" style="opacity:.75;">Loading rank and badge status…</div>
      </div>
    `;
  }
  if (badgeShelf) {
    badgeShelf.innerHTML = "";
  }
  if (insightCard) {
    insightCard.innerHTML = "";
  }
  if (tutorialCard) {
    const normalizedRole = String(normalizeMembershipRole(profile) || profile?.role || "waiter").toLowerCase();
    const caps = getPremiumRoleCapabilities(profile);
    const shouldShowTutorials =
      normalizedRole === "waiter" ||
      !caps.canAccessManagerBoard ||
      (!profile?.role && !profile?.membership_role && !profile?.membershipRole);
    if (shouldShowTutorials) {
      tutorialCard.classList.remove("hidden");
      tutorialCard.style.display = "";
      const copyEl = document.getElementById("profileTutorialCopy");
      if (copyEl) {
        copyEl.textContent = "Launch guided tutorials directly from your profile.";
      }
      const tutorialBtn = document.getElementById("btnProfileEncounterTutorial");
      if (tutorialBtn) {
        tutorialBtn.textContent = "Start Encounter Tutorial";
        tutorialBtn.onclick = () => {
        clearQueuedDrillStart({ resetConfig: true });
        closeProfilePanel?.();
        startTutorial("encounter_setup_manager");
        };
      }
    } else {
      tutorialCard.classList.add("hidden");
      tutorialCard.style.display = "none";
    }
  }

  void renderProfileSkillDashboard();
  const multiCard = document.getElementById("profileMultiRestaurantCard");
  if (multiCard) {
    const caps = getPremiumRoleCapabilities(profile);

    if (!caps.canManageMultipleRestaurants) {
      multiCard.innerHTML = "";
    } else {
      const rows = getAllowedRestaurantRows?.() || [];
      multiCard.innerHTML = `
        <div class="card">
          <div style="font-weight:600; margin-bottom:8px;">Managed Restaurants</div>
          ${
            rows.length
              ? rows.map((row) => `<div class="small">${escapeHtml(row?.name || row?.id || "-")}</div>`).join("")
              : `<div class="small" style="opacity:.75;">No restaurant scope loaded.</div>`
          }
        </div>
      `;
    }
  }

  void renderProfilePerformanceCards();
}

function formatOrdinalRank(n) {
  const num = Number(n || 0);
  if (!Number.isFinite(num) || num <= 0) return "—";
  const mod100 = num % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${num}th`;
  const mod10 = num % 10;
  if (mod10 === 1) return `${num}st`;
  if (mod10 === 2) return `${num}nd`;
  if (mod10 === 3) return `${num}rd`;
  return `${num}th`;
}

function getProfileBadgeDefinitions(user = {}, totalUsers = 0) {
  const rank = Number(user?.rank || 0);
  const percentile = Number(user?.percentile || 0);
  const readiness = Number(user?.readiness || 0);
  const challengeReadiness = Number(user?.challengeReadiness || 0);
  const totalPoints = Number(user?.totalPoints || 0);
  const drillPassRate = Number(user?.drillPassRate || 0);
  const challengeSuccessRate = Number(user?.challengeSuccessRate || 0);
  const premiumSuccessRate = Number(user?.premiumSuccessRate || 0);
  const encounterPassRate = Number(user?.encounterPassRate || 0);
  const drillCompletedCount = Number(user?.drillCompletedCount || 0);
  const challengeCompletedCount = Number(user?.challengeCompletedCount || 0);
  const encounterCount = Number(user?.encounterCount || 0);
  const badges = [
    {
      title: "Leaderboard Leader",
      earned: !!rank && rank === 1 && totalUsers > 1,
      tone: "gold",
      detail: totalUsers > 1 ? `Currently #1 in this restaurant.` : "No cohort available yet.",
    },
    {
      title: "Top Three",
      earned: !!rank && rank <= 3 && totalUsers >= 3,
      tone: "emerald",
      detail: rank ? `Holding ${formatOrdinalRank(rank)} place.` : "No rank yet.",
    },
    {
      title: "Hundred Point Club",
      earned: totalPoints >= 100,
      tone: "blue",
      detail: `${formatMetricNumber(totalPoints, 1)} pts earned.`,
    },
    {
      title: "Challenge Ready",
      earned: challengeReadiness >= 0.7,
      tone: "violet",
      detail: `Challenge readiness ${formatPercent(challengeReadiness)}.`,
    },
    {
      title: "Stable Window",
      earned: readiness >= 0.8,
      tone: "emerald",
      detail: `Readiness ${formatPercent(readiness)} with a stable profile.`,
    },
    {
      title: "Perfect Drill Day",
      earned: drillCompletedCount > 0 && drillPassRate >= 1,
      tone: "amber",
      detail: `${drillCompletedCount} drill${drillCompletedCount === 1 ? "" : "s"} completed at ${formatPercent(drillPassRate)}.`,
    },
    {
      title: "Challenge Closer",
      earned: challengeCompletedCount >= 1 && challengeSuccessRate >= 0.5,
      tone: "rose",
      detail: `${challengeCompletedCount} completed challenge${challengeCompletedCount === 1 ? "" : "s"}.`,
    },
    {
      title: "Premium Moment",
      earned: premiumSuccessRate > 0,
      tone: "gold",
      detail: `Premium success rate ${formatPercent(premiumSuccessRate)}.`,
    },
    {
      title: "Live Floor Builder",
      earned: encounterCount >= 10 && encounterPassRate >= 0.5,
      tone: "blue",
      detail: `${encounterCount} encounters with ${formatPercent(encounterPassRate)} pass rate.`,
    },
    {
      title: "Top Quartile",
      earned: percentile >= 0.75 && totalUsers >= 4,
      tone: "violet",
      detail: `Top ${Math.max(1, Math.round((1 - percentile) * 100))}% of the restaurant cohort.`,
    },
  ];

  return badges;
}

function renderProfileStandingCard(user = null, model = null) {
  const root = document.getElementById("profileStandingCard");
  if (!root) return;

  if (!user) {
    root.innerHTML = `
      <div class="card">
        <div style="font-weight:600; margin-bottom:8px;">My Standing</div>
        <div class="small" style="opacity:.75;">Restaurant ranking is not available for this role yet.</div>
      </div>
    `;
    return;
  }

  const totalUsers = Array.isArray(model?.users) ? model.users.length : 0;
  const percentileLabel = totalUsers
    ? `Top ${Math.max(1, Math.round((1 - Number(user.percentile || 0)) * 100))}%`
    : "Solo profile";

  root.innerHTML = `
    <div class="card" style="display:flex; flex-direction:column; gap:10px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div style="font-weight:600;">My Standing</div>
        <span class="badge">Rank ${formatOrdinalRank(user.rank)}</span>
      </div>
      <div style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px;">
        <div class="card" style="padding:10px;">
          <div class="small-text">Restaurant Rank</div>
          <strong>#${escapeHtml(String(user.rank || "—"))}</strong>
          <div class="small-text" style="opacity:.72; margin-top:4px;">of ${escapeHtml(String(totalUsers || 1))}</div>
        </div>
        <div class="card" style="padding:10px;">
          <div class="small-text">Percentile</div>
          <strong>${escapeHtml(percentileLabel)}</strong>
          <div class="small-text" style="opacity:.72; margin-top:4px;">based on current restaurant peers</div>
        </div>
        <div class="card" style="padding:10px;">
          <div class="small-text">Points</div>
          <strong>${escapeHtml(formatMetricNumber(user.totalPoints, 1))}</strong>
          <div class="small-text" style="opacity:.72; margin-top:4px;">Tier ${escapeHtml(String(user.servedTier || user.eligibilityTier || 1))}</div>
        </div>
        <div class="card" style="padding:10px;">
          <div class="small-text">Readiness</div>
          <strong>${escapeHtml(formatPercent(user.readiness))}</strong>
          <div class="small-text" style="opacity:.72; margin-top:4px;">${escapeHtml(describeReadiness(user.readiness, user.readinessLabel))}</div>
        </div>
      </div>
    </div>
  `;
}

async function renderProfileSkillDashboard() {
  const root = document.getElementById("profileSkillsCard");
  if (!root) return;

  root.innerHTML = `
    <div class="card" style="display:flex; flex-direction:column; gap:10px;">
      <div style="font-weight:600;">Your Personal Skills</div>

      <div class="small-text" id="profileSkillSummary" style="margin-bottom:8px; opacity:.85;">
        Loading skill summary…
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px 12px; margin-bottom:10px;">
        <div class="small-text">Reading: <span id="profileSkillRead">0%</span></div>
        <div class="small-text">Framing: <span id="profileSkillFraming">0%</span></div>
        <div class="small-text">Delivery: <span id="profileSkillDelivery">0%</span></div>
        <div class="small-text">Recovery: <span id="profileSkillRecovery">0%</span></div>
        <div class="small-text">Closing: <span id="profileSkillClosing">0%</span></div>
      </div>

      <canvas id="profileSkillRadar" width="240" height="240" style="display:block; margin:0 auto;"></canvas>

      <div id="profileSkillTimeline" style="margin-top:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:6px;">
          <div id="profileTimelineTitle" style="font-weight:600;">Recent Progress</div>
          <select id="profileTimelineUserSelect" class="hidden" style="max-width:180px;"></select>
        </div>

        <div id="profileTimelineList" class="small-text" style="display:flex; flex-direction:column; gap:6px;">
          <div style="opacity:.7;">No history yet.</div>
        </div>
      </div>
    </div>
  `;

  try {
    const snap = await loadHudSkillSnapshot();

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = `${value}%`;
    };

    setText("profileSkillRead", snap.read ?? 0);
    setText("profileSkillFraming", snap.framing ?? 0);
    setText("profileSkillDelivery", snap.delivery ?? 0);
    setText("profileSkillRecovery", snap.recovery ?? 0);
    setText("profileSkillClosing", snap.closing ?? 0);

    const entries = [
      { key: "read", label: "Reading", val: snap.read ?? 0 },
      { key: "framing", label: "Framing", val: snap.framing ?? 0 },
      { key: "delivery", label: "Delivery", val: snap.delivery ?? 0 },
      { key: "recovery", label: "Recovery", val: snap.recovery ?? 0 },
      { key: "closing", label: "Closing", val: snap.closing ?? 0 },
    ].sort((a, b) => b.val - a.val);

    const strongest = entries[0];
    const weakest = entries[entries.length - 1];

    const summary = document.getElementById("profileSkillSummary");
    if (summary) {
      summary.textContent = `Strongest: ${strongest.label} (${strongest.val}%) • Needs work: ${weakest.label} (${weakest.val}%)`;
    }

    const canvas = document.getElementById("profileSkillRadar");
    if (canvas && typeof drawSkillRadar === "function") {
      drawSkillRadar(canvas, snap);
    }

    const titleEl = document.getElementById("profileTimelineTitle");
    if (titleEl) titleEl.textContent = "Recent Progress";

    const timelineList = document.getElementById("profileTimelineList");
    if (timelineList) {
      timelineList.innerHTML = `<div class="small-text" style="opacity:.75;">Open Profile to review recent skill history.</div>`;
    }
  } catch (error) {
    console.warn("[PROFILE] skill dashboard render failed", error);
    root.innerHTML = `
      <div class="card">
        <div style="font-weight:600; margin-bottom:8px;">Your Personal Skills</div>
        <div class="small" style="opacity:.75;">Could not load skill summary right now.</div>
      </div>
    `;
  }
}

function renderProfileBadgeShelf(user = null, model = null) {
  const root = document.getElementById("profileBadgeShelf");
  if (!root) return;

  if (!user) {
    root.innerHTML = "";
    return;
  }

  const totalUsers = Array.isArray(model?.users) ? model.users.length : 0;
  const badges = getProfileBadgeDefinitions(user, totalUsers);
  const earned = badges.filter((badge) => badge.earned);
  const inProgress = badges.filter((badge) => !badge.earned).slice(0, 3);
  const toneMap = {
    gold: "rgba(214,166,56,0.16)",
    emerald: "rgba(54,170,116,0.16)",
    blue: "rgba(66,124,221,0.16)",
    violet: "rgba(122,93,214,0.16)",
    rose: "rgba(209,92,124,0.16)",
    amber: "rgba(214,140,56,0.16)",
  };

  const renderBadge = (badge, locked = false) => `
    <div class="card" style="padding:10px; border:1px solid rgba(255,255,255,0.08); background:${locked ? "rgba(255,255,255,0.03)" : (toneMap[badge.tone] || "rgba(255,255,255,0.05)")};">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <strong>${escapeHtml(badge.title)}</strong>
        <span class="badge">${locked ? "In Progress" : "Earned"}</span>
      </div>
      <div class="small-text" style="margin-top:6px; opacity:.78;">${escapeHtml(badge.detail)}</div>
    </div>
  `;

  root.innerHTML = `
    <div class="card" style="display:flex; flex-direction:column; gap:10px;">
      <div style="font-weight:600;">Badges & Milestones</div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px;">
        ${(earned.length ? earned : badges.slice(0, 2)).map((badge) => renderBadge(badge, !badge.earned)).join("")}
      </div>
      ${inProgress.length ? `
        <div>
          <div class="small-text" style="margin-bottom:8px; opacity:.78;">Next up</div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px;">
            ${inProgress.map((badge) => renderBadge(badge, true)).join("")}
          </div>
        </div>
      ` : ``}
    </div>
  `;
}

function renderProfileInsightCard(user = null) {
  const root = document.getElementById("profileInsightCard");
  if (!root) return;

  if (!user) {
    root.innerHTML = "";
    return;
  }

  root.innerHTML = `
    <div class="card" style="display:flex; flex-direction:column; gap:10px;">
      <div style="font-weight:600;">How You’re Known</div>
      <div style="display:flex; flex-wrap:wrap; gap:8px;">
        <span class="mb-badge">Strongest: ${escapeHtml(user.strongestSkill || "—")}</span>
        <span class="mb-badge">Weakest: ${escapeHtml(user.weakestSkill || "—")}</span>
        <span class="mb-badge">Challenge Readiness: ${escapeHtml(formatPercent(user.challengeReadiness))}</span>
        <span class="mb-badge">Mastery: ${escapeHtml(formatPercent(user.masteryRate))}</span>
        <span class="mb-badge">Last Active: ${escapeHtml(formatRelativeTime(user.lastActiveAt))}</span>
      </div>
    </div>
  `;
}

async function buildSelfProfilePerformanceUser() {
  const profile = appState?.profile || {};
  const userId = String(profile?.user_id || profile?.userId || appState?.session?.user?.id || "");
  const restaurantId = String(profile?.restaurant_id || appState?.activeRestaurantId || appState?.restaurant?.id || "").trim();
  if (!userId || !restaurantId) return null;

  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [progressionRow, skillShape, readinessRes, encountersRes, messagesRes] = await Promise.all([
    window.__BC_GET_PROGRESSION_SNAPSHOT__?.({ targetUserId: userId, restaurantId }),
    loadHudSkillSnapshot(),
    supabase
      .from("bc_readiness_v1")
      .select("*")
      .eq("user_id", userId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle(),
    supabase
      .from("bc_encounter_resolutions_v2")
      .select("occurred_at, performance_grade, chain_signal, chain_score, is_green, is_red, tier")
      .eq("user_id", userId)
      .eq("restaurant_id", restaurantId)
      .neq("mode", "demo")
      .gte("occurred_at", sinceIso)
      .order("occurred_at", { ascending: false })
      .limit(200),
    supabase
      .from("bc_messages_v1")
      .select("created_at, type, payload")
      .eq("sender_user_id", userId)
      .eq("restaurant_id", restaurantId)
      .in("type", ["drill_completed", "timed_challenge_completed", "timed_challenge_expired"])
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const readinessRow = readinessRes?.data || {};
  const encounterRows = Array.isArray(encountersRes?.data) ? encountersRes.data : [];
  const messageRows = Array.isArray(messagesRes?.data) ? messagesRes.data : [];
  const canonicalState = progressionRow?.canonical_state && typeof progressionRow.canonical_state === "object"
    ? progressionRow.canonical_state
    : {};
  const canonicalEconomy = canonicalState?.economy && typeof canonicalState.economy === "object"
    ? canonicalState.economy
    : {};
  const canonicalAuthority = canonicalState?.authority && typeof canonicalState.authority === "object"
    ? canonicalState.authority
    : {};
  const totalPoints = Math.max(0, Number(canonicalEconomy?.points || 0));
  const servedTier = Math.max(1, Math.min(3, Math.round(
    firstFinite(canonicalAuthority?.tierToServe, canonicalEconomy?.tier, 1) || 1
  )));

  const drillRows = messageRows.filter((row) => String(row?.type || "") === "drill_completed");
  const drillPasses = drillRows.filter((row) => {
    const repsDone = Number(row?.payload?.repsDone || 0);
    const repTarget = Number(row?.payload?.repTarget || 0);
    return repTarget > 0 && repsDone >= repTarget;
  }).length;
  const challengeCompleted = messageRows.filter((row) => String(row?.type || "") === "timed_challenge_completed");
  const challengeExpired = messageRows.filter((row) => String(row?.type || "") === "timed_challenge_expired");
  const challengeRows = challengeCompleted.length + challengeExpired.length;
  const encounterPasses = encounterRows.filter((row) => {
    const grade = String(row?.performance_grade || "").toUpperCase();
    return grade === "A" || grade === "B" || String(row?.chain_signal || "").toLowerCase() === "green" || !!row?.is_green;
  }).length;
  const encounterMastery = encounterRows.filter((row) => String(row?.performance_grade || "").toUpperCase() === "A").length;
  const premiumSuccesses = challengeCompleted.filter((row) => !!row?.payload?.premiumSuccess).length;

  const drillPassRate = drillRows.length ? drillPasses / drillRows.length : 0;
  const encounterPassRate = encounterRows.length ? encounterPasses / encounterRows.length : 0;
  const challengeSuccessRate = challengeRows ? challengeCompleted.length / challengeRows : 0;
  const premiumSuccessRate = challengeCompleted.length ? premiumSuccesses / challengeCompleted.length : 0;
  const masteryRate = encounterRows.length ? encounterMastery / encounterRows.length : 0;

  const readinessBase = firstFinite(readinessRow?.readiness_score, readinessRow?.readiness_pct);
  const readiness = Math.max(0, Math.min(1, firstFinite(
    readinessBase != null ? (readinessBase > 1 ? readinessBase / 100 : readinessBase) : null,
    masteryRate,
    totalPoints >= 10 ? 0.8 : totalPoints >= 5 ? 0.62 : 0.4
  ) || 0));
  const readinessLabel = firstNonEmpty(readinessRow?.readiness, readiness >= 0.8 ? "STABLE" : readiness >= 0.62 ? "GROWING" : "FRAGILE");
  const challengeReadiness = Math.max(
    0,
    Math.min(1, (readiness * 0.45) + (encounterPassRate * 0.35) + (challengeSuccessRate * 0.20))
  );
  const extremes = getSkillExtremes(skillShape);

  return {
    userId,
    displayName: String(profile?.display_name || profile?.displayName || appState?.session?.user?.email || "You"),
    totalPoints,
    drillPassRate,
    drillCompletedCount: drillRows.length,
    drillPasses,
    encounterPassRate,
    encounterCount: encounterRows.length,
    challengeSuccessRate,
    challengeCompletedCount: challengeCompleted.length,
    challengeExpiredCount: challengeExpired.length,
    challengeCount: challengeRows,
    premiumSuccessRate,
    masteryRate,
    lastActiveAt: latestTimestamp(progressionRow?.updated_at, encounterRows[0]?.occurred_at, messageRows[0]?.created_at),
    eligibilityTier: servedTier,
    readiness,
    readinessLabel,
    servedTier,
    challengeReadiness,
    percentile: 0,
    rank: null,
    strongestSkill: extremes.strongestSkill,
    weakestSkill: extremes.weakestSkill,
    skillShape,
  };
}

async function renderProfilePerformanceCards() {
  const rootStanding = document.getElementById("profileStandingCard");
  const rootBadges = document.getElementById("profileBadgeShelf");
  if (!rootStanding && !rootBadges) return;

  try {
    const profile = appState?.profile || {};
    const userId = String(profile?.user_id || profile?.userId || appState?.session?.user?.id || "");
    let model = null;
    let user = null;

    try {
      model = await getManagerPerformanceModel();
      user = (model?.users || []).find((entry) => String(entry?.userId || "") === userId) || null;
    } catch (modelError) {
      console.warn("[PROFILE] manager performance model unavailable, using self fallback", modelError);
    }

    if (!user) {
      user = await buildSelfProfilePerformanceUser();
    }

    renderProfileStandingCard(user, model);
    renderProfileBadgeShelf(user, model);
  } catch (error) {
    console.warn("[PROFILE] performance card render failed", error);
    if (rootStanding) {
      rootStanding.innerHTML = `
        <div class="card">
          <div style="font-weight:600; margin-bottom:8px;">My Standing</div>
          <div class="small" style="opacity:.75;">Could not load ranking right now.</div>
        </div>
      `;
    }
    if (rootBadges) rootBadges.innerHTML = "";
  }
}

function renderManagerActiveThread(nameMap) {
  const msgEl = mbEl("mbThreadMessages");
  const timelineEl = mbEl("mbThreadTimelinePanel");
  const titleEl = mbEl("mbThreadTitle");
  const metaEl = mbEl("mbThreadMeta");
  const statePanelEl = mbEl("mbThreadStatePanel");
  const recPanelEl = mbEl("mbThreadChallengeRecommendations");

  const activeUserId = window.__BC_MB_ACTIVE_THREAD_USER_ID__;
  const threads = window.__BC_MB_THREADS__ || [];
  const thread = threads.find((t) => String(t.userId) === String(activeUserId));

  if (!thread) {
    if (titleEl) titleEl.textContent = "Select a waiter";
    if (metaEl) metaEl.textContent = "";
    if (timelineEl) {
      timelineEl.innerHTML = `
        <div style="font-weight:600;">Thread Snapshot</div>
        <div class="small-text" style="margin-top:6px; opacity:.75;">
          Select a waiter to view the latest objective and performance reflection.
        </div>
      `;
    }
    if (msgEl) msgEl.innerHTML = `<div class="small-text" style="opacity:.8;">Select a waiter thread in this restaurant to assign a timed challenge.</div>`;
    if (statePanelEl) {
      statePanelEl.innerHTML = `
        <div style="font-weight:600;">Current Coaching State</div>
        <div class="small-text" style="margin-top:6px; opacity:.75;">
          Select a waiter to view current objective state.
        </div>
      `;
    }
    if (recPanelEl) {
      recPanelEl.innerHTML = `
        <div class="small-text" style="opacity:.75;">
          Select a waiter to view recommendations.
        </div>
      `;
    }
    setActiveManagerThreadState({ userId: "", rows: [] });
    safeCall("renderManagerThreadDrillSummary", () => renderManagerThreadDrillSummary?.());
    return;
  }

  const ordered = [...thread.rows].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  setActiveManagerThreadState({ userId: thread.userId, rows: ordered });
  if (titleEl) titleEl.textContent = String(thread?.title || userLabel(thread.userId, nameMap));
  if (metaEl) metaEl.textContent = getManagerThreadMetaSummary(ordered);
  if (timelineEl) {
    timelineEl.innerHTML = safeCall(
      "renderManagerThreadSnapshot",
      () => renderManagerThreadSnapshot(ordered)
    ) || `
      <div style="font-weight:600;">Thread Snapshot</div>
      <div class="small-text" style="margin-top:6px; opacity:.75;">
        Unable to build thread snapshot.
      </div>
    `;
  }

  if (msgEl) {
    const groupedHtml = safeCall(
      "renderManagerThreadBody",
      () => renderManagerThreadBody(ordered, nameMap)
    ) || "";

    msgEl.innerHTML = groupedHtml;
    msgEl.scrollTop = 0;
    safeCall("wireMbCoachSuggestionButtons", () => wireMbCoachSuggestionButtons());
    safeCall("wireMbAutoDrillButtons", () => wireMbAutoDrillButtons());
    safeCall("wireManagerChallengeSuggestionButtons", () => wireManagerChallengeSuggestionButtons());
    setTimeout(() => {
      const canvases = msgEl.querySelectorAll(".mbSkillRadar");
      const skillRows = ordered.filter((row) => !!getProgressReportPayload(row)?.skills);
      canvases.forEach((canvas, i) => {
        const row = skillRows[i];
        const payload = getProgressReportPayload(row);
        if (!payload?.skills) return;
        drawSkillRadar(canvas, payload.skills);
      });
    }, 0);
  }

  safeCall("buildManagerSuggestedPrompts", () => buildManagerSuggestedPrompts(thread));
  safeCall("renderManagerThreadDrillSummary", () => renderManagerThreadDrillSummary?.());
  safeCall("renderManagerThreadStatePanel", () => renderManagerThreadStatePanel?.());
  safeCall("renderManagerThreadRecommendationsPanel", () => renderManagerThreadRecommendationsPanel?.(thread));
}

function applyManagerMessengerRows(rid, rows) {
  const listEl = mbEl("mbThreadList");
  const emptyEl = mbEl("mbThreadEmpty");
  const msgEl = mbEl("mbThreadMessages");
  const titleEl = mbEl("mbThreadTitle");
  const metaEl = mbEl("mbThreadMeta");

  window.__MB_LAST_MESSAGES__ = rows;
  window.__BC_MB_MESSAGES__ = rows;
  window.__BC_MESSENGER_ROWS__ = rows;
  window.__BC_MB_TIMED_CHALLENGE_ROWS__ = getRecentTimedChallengeRows();
  window.__BC_MB_LAST_TIMED_CHALLENGE_RESULT__ = getRecentTimedChallengeResultRow();
  window.__BC_MB_LAST_DRILL_ASSIGNMENT__ = getRecentDrillAssignedRow();
  window.__BC_MB_LAST_DRILL_COMPLETION__ = getRecentDrillCompletedRow();
  renderTimedChallengeTargetOptions();
  wireTimedChallengeComposer();
  refreshManagerMessageQuotaUi?.();

  if (!rows.length) {
    resetManagerMessengerState({ keepStatus: true });
    if (emptyEl) emptyEl.style.display = "block";
    return [];
  }

  const managerId =
    appState?.session?.user?.id ||
    appState?.session?.userId ||
    null;

  const grouped = new Map();

  for (const row of rows) {
    const sender = row.sender_user_id;
    const receiver = row.receiver_user_id;

    let threadUserId =
      String(sender) === String(managerId) ? receiver : sender;
    let threadTitle = "";
    let isSelfThread = false;

    if (!threadUserId && String(row?.type || "").toLowerCase() === "progress_report") {
      threadUserId = managerId;
      threadTitle = "Your Play";
      isSelfThread = true;
    }

    if (!threadUserId) continue;

    const entry = grouped.get(threadUserId) || {
      userId: threadUserId,
      title: threadTitle,
      isSelfThread,
      latestAt: row.created_at,
      latestBody: "",
      latestType: row.type || "message",
      rows: [],
    };

    entry.rows.push(row);
    if (!entry.title && threadTitle) entry.title = threadTitle;
    if (isSelfThread) entry.isSelfThread = true;

    grouped.set(threadUserId, entry);
  }

  const threads = Array.from(grouped.values())
    .map((entry) => {
      const latestTemplateRow = getManagerLatestTemplateRow(entry.rows);
      const latestDisplay = latestTemplateRow ? getManagerMessageDisplayBody(latestTemplateRow) : null;
      return {
        ...entry,
        latestAt: latestTemplateRow?.created_at || entry.latestAt,
        latestType: latestTemplateRow?.type || entry.latestType || "message",
        latestBody: String(latestDisplay?.title || latestTemplateRow?.body || entry.latestBody || ""),
      };
    })
    .sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt));

  window.__BC_MB_THREADS_ALL__ = Array.isArray(threads) ? threads : [];
  window.__BC_MB_THREADS__ = Array.isArray(threads) ? threads : [];
  window.__BC_MB_MESSAGES__ = Array.isArray(rows) ? rows : [];
  window.__BC_MESSENGER_ROWS__ = Array.isArray(rows) ? rows : [];
  window.__BC_MB_ACTIVE_THREAD_RESTAURANT_ID__ = rid;

  if (!window.__BC_MB_THREADS__.length) {
    resetManagerMessengerState({ keepStatus: true });
    return window.__BC_MB_THREADS__;
  }

  return window.__BC_MB_THREADS__;
}

async function loadManagerMessenger(restaurantId = null, options = {}) {
  const rid = String(restaurantId || getManagerActiveRestaurantId() || "");
  const profile = appState?.profile || {};
  const caps = getPremiumRoleCapabilities(profile);
  const force = !!options?.force;

  if (!rid) {
    resetManagerMessengerState({ keepStatus: true });
    return [];
  }

  if (!caps.canAccessManagerBoard) {
    resetManagerMessengerState({ keepStatus: true });
    return [];
  }

  if (isFreshCacheEntry(managerBoardMessengerCache, MANAGER_BOARD_MESSENGER_CACHE_MS, rid) && !force) {
    const cachedRows = Array.isArray(managerBoardMessengerCache.rows) ? managerBoardMessengerCache.rows : [];
    const cachedThreads = applyManagerMessengerRows(rid, cachedRows);
    const userIds = (cachedThreads || []).map((t) => t.userId);
    const nameMap = await mapUserIdsToNames(userIds);
    renderManagerThreadList(window.__BC_MB_THREADS_ALL__ || cachedThreads, nameMap);
    if (!window.__BC_MB_ACTIVE_THREAD_USER_ID__ && window.__BC_MB_THREADS?.[0]) {
      setActiveManagerThreadState({
        userId: window.__BC_MB_THREADS[0].userId,
        rows: window.__BC_MB_THREADS[0].rows || [],
      });
    }
    reconcileManagerMessengerSelection();
    safeCall("renderManagerActiveThread", () => renderManagerActiveThread(nameMap));
    renderTimedChallengeComposer();
    wireMbCoachSuggestionButtons();
    refreshManagerRuntimeSurfaces?.({
      thread: true,
      board: true,
      economy: false,
      liveControls: false,
      challengeMeta: true,
    });
    return window.__BC_MB_THREADS__;
  }

  if (!canActOnRestaurant(profile, profile, rid)) {
    resetManagerMessengerState({ keepStatus: true });
    return [];
  }

  const listEl = mbEl("mbThreadList");
  const emptyEl = mbEl("mbThreadEmpty");
  const msgEl = mbEl("mbThreadMessages");
  const titleEl = mbEl("mbThreadTitle");
  const metaEl = mbEl("mbThreadMeta");

  if (listEl) listEl.innerHTML = `<div class="small-text" style="padding:10px; opacity:.85;">Loading…</div>`;
  if (emptyEl) emptyEl.style.display = "none";
  if (msgEl) msgEl.innerHTML = `<div class="small-text" style="opacity:.8;">Select a waiter thread in this restaurant to assign a timed challenge.</div>`;
  if (titleEl) titleEl.textContent = "Select a waiter";
  if (metaEl) metaEl.textContent = "";

  const { data, error } = await supabase
    .from("bc_messages_v1")
    .select("id, created_at, scope_type, scope_id, restaurant_id, sender_user_id, receiver_user_id, sender_role, type, body, payload, read_at")
    .eq("restaurant_id", rid)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const rows = data || [];
  managerBoardMessengerCache = { rid, loadedAt: Date.now(), rows };
  const threads = applyManagerMessengerRows(rid, rows);
  if (!threads.length) return threads;

  const userIds = threads.map((t) => t.userId);
  const nameMap = await mapUserIdsToNames(userIds);

  renderManagerThreadList(window.__BC_MB_THREADS_ALL__ || threads, nameMap);

  if (!window.__BC_MB_ACTIVE_THREAD_USER_ID__ && window.__BC_MB_THREADS__[0]) {
    setActiveManagerThreadState({
      userId: window.__BC_MB_THREADS__[0].userId,
      rows: window.__BC_MB_THREADS__[0].rows || [],
    });
  }

  reconcileManagerMessengerSelection();
  safeCall("renderManagerActiveThread", () => renderManagerActiveThread(nameMap));
  renderTimedChallengeComposer();
  wireMbCoachSuggestionButtons();
  refreshManagerRuntimeSurfaces?.({
    thread: true,
    board: true,
    economy: false,
    liveControls: false,
    challengeMeta: true,
  });
  return window.__BC_MB_THREADS__;
}

function getManagerWaiterOptions() {
  const currentUserId = String(
    appState?.session?.user?.id ||
    appState?.session?.userId ||
    ""
  );
  const staffRows = Array.isArray(window.__BC_MB_STAFF_ROWS__) ? window.__BC_MB_STAFF_ROWS__ : [];

  if (staffRows.length) {
    return staffRows
      .map((row) => {
        const role = String(row?.role || "").toLowerCase();
        const userId = String(row?.user_id || "").trim();
        if (!userId || role === "demo" || userId === currentUserId) return null;

        const displayName = String(row?.display_name || "").trim();
        return {
          userId,
          label: displayName || userId,
        };
      })
      .filter((x) => x?.userId);
  }

  const threads = Array.isArray(window.__BC_MB_THREADS__) ? window.__BC_MB_THREADS__ : [];

  return threads
    .map((t) => {
      const userId = String(t?.userId || t?.receiver_user_id || t?.sender_user_id || "").trim();
      if (!userId || userId === currentUserId) return null;

      const name =
        t?.title ||
        t?.name ||
        t?.userName ||
        t?.displayName ||
        t?.waiterName ||
        "";

      return {
        userId,
        label: String(name).trim() || userId,
      };
    })
    .filter((x) => x?.userId);
}

function getManagerBoardWaiterOptions() {
  return getManagerWaiterOptions();
}

function renderManagerWaiterSelectOptions(selectEl, options = {}) {
  if (!selectEl) return;

  const waiterOptions = getManagerWaiterOptions();
  const placeholder = String(options.placeholder || "Select staff");
  const preferredUserId = String(
    options.selectedUserId ||
    window.__BC_MB_ACTIVE_THREAD_USER_ID__ ||
    ""
  );

  const rows = [
    `<option value="">${escapeHtml(placeholder)}</option>`,
    ...waiterOptions.map((opt) => {
      const selected = preferredUserId && String(opt.userId) === preferredUserId ? "selected" : "";
      return `<option value="${escapeHtml(opt.userId)}" ${selected}>${escapeHtml(opt.label)}</option>`;
    })
  ];

  selectEl.innerHTML = rows.join("");
}

function renderTimedChallengeTargetOptions() {
  const selectIds = [
    "mbTimedChallengeTarget",
    "mbLcTimedChallengeTarget",
    "mbLcDisplayMethodTarget",
    "mbLcDrillTarget",
  ];

  selectIds.forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;

    renderManagerWaiterSelectOptions(select, {
      selectedUserId: window.__BC_MB_ACTIVE_THREAD_USER_ID__ || "",
    });
  });
}

function getTimedChallengeWineSelectIds() {
  return ["mbTimedChallengeWine", "mbLcTimedChallengeWine"];
}

function getTimedChallengeWineLabel(wine = {}) {
  const name = String(wine?.name || "Wine").trim();
  const region = String(wine?.region || "").trim();
  const varietal = String(wine?.varietal || "").trim();
  const suffix = [region, varietal].filter(Boolean).join(" • ");
  return suffix ? `${name} - ${suffix}` : name;
}

function getTimedChallengeWineOptionValue(wine = {}, index = 0) {
  const candidates = [
    wine?.id,
    wine?.wine_id,
    wine?.wineId,
    wine?._id,
    wine?.created_at,
    wine?.updated_at,
  ];

  for (const candidate of candidates) {
    const value = String(candidate || "").trim();
    if (value) return value;
  }

  const label = getTimedChallengeWineLabel(wine);
  if (label) {
    return `${label}::${index}`;
  }

  return `wine::${index}`;
}

function setManagerWineOptionsCache(restaurantId, wines = []) {
  const rid = String(restaurantId || "").trim();
  const normalized = Array.isArray(wines) ? wines.slice() : [];
  window.__BC_SHARED_MANAGER_WINES__ = normalized;
  window.__BC_SHARED_MANAGER_WINES_RID__ = rid;
  window.__BC_RESTAURANT_WINES__ = normalized;
  window.__BC_RESTAURANT_WINES_RID__ = rid;
  window.__BC_MANAGER_WINE_OPTIONS__ = normalized;
  window.__BC_MANAGER_WINE_OPTIONS_RID__ = rid;
  window.__BC_TIMED_CHALLENGE_WINE_OPTIONS__ = normalized;
  window.__BC_TIMED_CHALLENGE_WINE_OPTIONS_RID__ = rid;
  try {
    renderTimedChallengeWineSelectOptionsFromCache?.(rid);
  } catch (error) {
    console.warn("[WINE] timed challenge cache render failed", error);
  }
  return normalized;
}

function readSharedWineRowsFromLocalStorage(restaurantId = null) {
  const rid = String(restaurantId || "").trim();
  const keys = [];
  if (rid) keys.push(`bc_wines_restaurant_${rid}`);
  keys.push("bc_wines", "BC_WINES", "bc_wines_premium");

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed;
      }
    } catch {}
  }

  return [];
}

function readAnySharedWineRowsFromLocalStorage() {
  const rows = [];
  const seen = new Set();
  const pushRows = (list = []) => {
    for (const row of Array.isArray(list) ? list : []) {
      const key = getWineDedupKey(row);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
    }
  };

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = String(localStorage.key(i) || "");
      if (!key) continue;
      if (key !== "bc_wines" && key !== "BC_WINES" && key !== "bc_wines_premium" && !key.startsWith("bc_wines_restaurant_")) {
        continue;
      }
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      pushRows(parsed);
    }
  } catch {}

  return rows;
}

function getSharedManagerWineOptions(restaurantId = null) {
  const rid = String(restaurantId || "").trim();
  const directStoreWines = readSharedWineRowsFromLocalStorage(rid);
  if (directStoreWines.length) {
    return directStoreWines;
  }

  const anyStoreWines = readAnySharedWineRowsFromLocalStorage();
  if (anyStoreWines.length) {
    return anyStoreWines;
  }

  const cacheSources = [
    {
      rid: String(window.__BC_SHARED_MANAGER_WINES_RID__ || ""),
      rows: Array.isArray(window.__BC_SHARED_MANAGER_WINES__) ? window.__BC_SHARED_MANAGER_WINES__ : [],
    },
    {
      rid: String(window.__BC_RESTAURANT_WINES_RID__ || ""),
      rows: Array.isArray(window.__BC_RESTAURANT_WINES__) ? window.__BC_RESTAURANT_WINES__ : [],
    },
    {
      rid: String(window.__BC_MANAGER_WINE_OPTIONS_RID__ || ""),
      rows: Array.isArray(window.__BC_MANAGER_WINE_OPTIONS__) ? window.__BC_MANAGER_WINE_OPTIONS__ : [],
    },
    {
      rid: String(window.__BC_TIMED_CHALLENGE_WINE_OPTIONS_RID__ || ""),
      rows: Array.isArray(window.__BC_TIMED_CHALLENGE_WINE_OPTIONS__) ? window.__BC_TIMED_CHALLENGE_WINE_OPTIONS__ : [],
    },
  ];

  for (const source of cacheSources) {
    if (rid && source.rid && source.rid !== rid) continue;
    if (Array.isArray(source.rows) && source.rows.length) {
      return source.rows;
    }
  }

  const frameWines = Array.isArray(getPremiumFrameWindow?.()?.wines)
    ? getPremiumFrameWindow().wines
    : [];
  if (frameWines.length) {
    return frameWines;
  }
  return [];
}

function getAllowedRestaurantIdsForWineFallback() {
  const ids = Array.isArray(window.__BC_ALLOWED_RESTAURANT_IDS__)
    ? window.__BC_ALLOWED_RESTAURANT_IDS__
    : [];

  const normalized = ids
    .map((id) => String(id || "").trim())
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

async function fetchParentWinesForRestaurantIds(restaurantIds = []) {
  const ids = Array.isArray(restaurantIds)
    ? restaurantIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("bc_wines")
    .select("*")
    .in("restaurant_id", ids)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return dedupeWineRows(data || []);
}

async function fetchAnyAccessibleParentWines() {
  const cached = readSharedWineRowsFromLocalStorage();
  if (cached.length) return dedupeWineRows(cached);

  const { data, error } = await supabase
    .from("bc_wines")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return dedupeWineRows(data || []);
}

function applyTimedChallengeWineSelectOptions(selects = [], wines = [], activeWineId = "") {
  const normalizedWines = Array.isArray(wines) ? wines : [];
  const placeholderLabel = normalizedWines.length ? "Select wine" : "No wines available";
  const options = [
    { id: "", label: placeholderLabel },
    ...normalizedWines
      .map((wine, index) => ({
        id: getTimedChallengeWineOptionValue(wine, index),
        label: getTimedChallengeWineLabel(wine),
      }))
      .filter((opt) => opt.id),
  ];

  selects.forEach((select) => {
    const currentValue = String(select.value || "").trim();
    select.innerHTML = options
      .map((opt) => {
        const selected = currentValue
          ? String(opt.id) === currentValue
          : (activeWineId && String(opt.id) === activeWineId);
        return `<option value="${escapeHtml(opt.id)}"${selected ? " selected" : ""}>${escapeHtml(opt.label)}</option>`;
      })
      .join("");

    if (!select.value && activeWineId) {
      select.value = activeWineId;
    }
  });

  return normalizedWines;
}

function buildTimedChallengeWineOptionsHtml(wines = [], activeWineId = "") {
  const normalizedWines = Array.isArray(wines) ? wines : [];
  const placeholderLabel = normalizedWines.length ? "Select wine" : "No wines available";
  const options = [
    { id: "", label: placeholderLabel },
    ...normalizedWines
      .map((wine, index) => ({
        id: getTimedChallengeWineOptionValue(wine, index),
        label: getTimedChallengeWineLabel(wine),
      }))
      .filter((opt) => opt.id),
  ];

  return options
    .map((opt) => {
      const selected = activeWineId && String(opt.id) === String(activeWineId);
      return `<option value="${escapeHtml(opt.id)}"${selected ? " selected" : ""}>${escapeHtml(opt.label)}</option>`;
    })
    .join("");
}

function renderTimedChallengeWineSelectOptionsFromCache(restaurantId = null) {
  const selectIds = getTimedChallengeWineSelectIds();
  const selects = selectIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  if (!selects.length) return [];

  const rid = String(
    restaurantId ||
    getManagerActiveRestaurantId() ||
    window.__BC_MB_ACTIVE_THREAD_RESTAURANT_ID__ ||
    appState?.restaurant?.id ||
    appState?.activeRestaurantId ||
    appState?.profile?.restaurant_id ||
    ""
  ).trim();

  const wines = getAnyManagerWineOptionsForDisplay(rid);
  const fallbackWines = wines.length ? wines : getSharedManagerWineOptions();
  const activeWine = window.getActiveWineForPremium?.() || null;
  const activeWineId = String(activeWine?.id || "").trim();
  return applyTimedChallengeWineSelectOptions(selects, fallbackWines, activeWineId);
}

async function refreshManagerWineOptions(restaurantId = null, { force = false } = {}) {
  const rid = String(
    restaurantId ||
    getManagerActiveRestaurantId() ||
    window.__BC_MB_ACTIVE_THREAD_RESTAURANT_ID__ ||
    appState?.restaurant?.id ||
    appState?.activeRestaurantId ||
    appState?.profile?.restaurant_id ||
    ""
  ).trim();

  if (!rid) {
    try {
      const anyWines = await fetchAnyAccessibleParentWines();
      if (anyWines.length) {
        return setManagerWineOptionsCache("", anyWines);
      }
    } catch (error) {
      console.warn("[TIMED CHALLENGE] global wine fallback for missing restaurant failed", error);
    }
    setManagerWineOptionsCache("", []);
    return [];
  }

  const sharedWines = getSharedManagerWineOptions(rid);
  const cachedRid = String(window.__BC_MANAGER_WINE_OPTIONS_RID__ || window.__BC_TIMED_CHALLENGE_WINE_OPTIONS_RID__ || window.__BC_RESTAURANT_WINES_RID__ || "");
  if (!force && cachedRid === rid && sharedWines.length) {
    return setManagerWineOptionsCache(rid, sharedWines);
  }

  const premiumWin = getPremiumFrameWindow?.();
  if (premiumWin) {
    const frameWines = Array.isArray(premiumWin.wines) ? premiumWin.wines : [];
    if (frameWines.length && (!cachedRid || cachedRid === rid)) {
      return setManagerWineOptionsCache(rid, frameWines);
    }

    try {
      if (premiumWin.WineBridge?.fetchRestaurantWines) {
        const sid = getParentCtxSnapshot("premium")?.scopeId || appState?.profile?.scope_id || null;
        const bridged = await premiumWin.WineBridge.fetchRestaurantWines(sid, rid);
        const bridgedRows = Array.isArray(bridged) ? bridged : [];
        if (bridgedRows.length) {
          return setManagerWineOptionsCache(rid, bridgedRows);
        }
      }
    } catch (error) {
      console.warn("[TIMED CHALLENGE] premium-frame wine bridge failed", error);
    }
  }

  try {
    const wines = await fetchParentRestaurantWines(rid);
    const dbWines = Array.isArray(wines) ? wines.slice() : [];
    if (dbWines.length) {
      return setManagerWineOptionsCache(rid, dbWines);
    }
    const fallbackRestaurantIds = getAllowedRestaurantIdsForWineFallback().filter((id) => id !== rid);
    if (fallbackRestaurantIds.length) {
      try {
        const scopedFallbackWines = await fetchParentWinesForRestaurantIds(fallbackRestaurantIds);
        if (scopedFallbackWines.length) {
          return setManagerWineOptionsCache(rid || fallbackRestaurantIds[0] || "", scopedFallbackWines);
        }
      } catch (fallbackError) {
        console.warn("[TIMED CHALLENGE] scope wine fallback failed", fallbackError);
      }
    }
    if (sharedWines.length) {
      return setManagerWineOptionsCache(rid, sharedWines);
    }
    try {
      const anyWines = await fetchAnyAccessibleParentWines();
      if (anyWines.length) {
        return setManagerWineOptionsCache(rid, anyWines);
      }
    } catch (globalError) {
      console.warn("[TIMED CHALLENGE] global wine fallback failed", globalError);
    }
    return setManagerWineOptionsCache(rid, []);
  } catch (error) {
    console.warn("[TIMED CHALLENGE] wine refresh failed", error);
    const fallbackRestaurantIds = getAllowedRestaurantIdsForWineFallback().filter((id) => id !== rid);
    if (fallbackRestaurantIds.length) {
      try {
        const scopedFallbackWines = await fetchParentWinesForRestaurantIds(fallbackRestaurantIds);
        if (scopedFallbackWines.length) {
          return setManagerWineOptionsCache(rid || fallbackRestaurantIds[0] || "", scopedFallbackWines);
        }
      } catch (fallbackError) {
        console.warn("[TIMED CHALLENGE] scope wine fallback after error failed", fallbackError);
      }
    }
    if (sharedWines.length) return setManagerWineOptionsCache(rid, sharedWines);
    try {
      const anyWines = await fetchAnyAccessibleParentWines();
      if (anyWines.length) {
        return setManagerWineOptionsCache(rid, anyWines);
      }
    } catch (globalError) {
      console.warn("[TIMED CHALLENGE] global wine fallback after error failed", globalError);
    }
    return setManagerWineOptionsCache(rid, []);
  }
}

async function loadManagerRestaurantWineOptions(restaurantId = null, { force = false } = {}) {
  return refreshManagerWineOptions(restaurantId, { force });
}

async function loadTimedChallengeWineOptions() {
  const restaurantId = String(
    getManagerActiveRestaurantId() ||
    window.__BC_MB_ACTIVE_THREAD_RESTAURANT_ID__ ||
    appState?.restaurant?.id ||
    appState?.activeRestaurantId ||
    appState?.profile?.restaurant_id ||
    ""
  ).trim();
  const selectIds = getTimedChallengeWineSelectIds();
  const getCurrentSelects = () => selectIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const initialSelects = getCurrentSelects();
  if (!initialSelects.length) return [];

  if (!restaurantId) {
    const fallbackWines = getAnyManagerWineOptionsForDisplay();
    if (fallbackWines.length) {
      return applyTimedChallengeWineSelectOptions(initialSelects, fallbackWines, String(window.getActiveWineForPremium?.()?.id || "").trim());
    }
    initialSelects.forEach((select) => {
      if (select.options.length <= 1) {
        select.innerHTML = `<option value="">No wines available</option>`;
      }
      select.value = select.value || "";
    });
    return [];
  }

  const cachedWineRows = getAnyManagerWineOptionsForDisplay(restaurantId);
  if (Array.isArray(cachedWineRows) && cachedWineRows.length) {
    renderTimedChallengeWineSelectOptionsFromCache(restaurantId);
  }

  let wines = [];
  try {
    wines = await refreshManagerWineOptions(restaurantId, { force: false });
  } catch (error) {
    console.warn("[TIMED CHALLENGE] wine options load failed", error);
    wines = [];
  }

  const fallbackWines = wines.length ? wines : getAnyManagerWineOptionsForDisplay(restaurantId);
  const activeWine = window.getActiveWineForPremium?.() || null;
  const activeWineId = String(activeWine?.id || "");

  const selects = getCurrentSelects();
  if (!selects.length) return wines;
  return applyTimedChallengeWineSelectOptions(selects, fallbackWines, activeWineId);
}

const TIMED_CHALLENGE_COMPOSER_IDS = Object.freeze({
  messenger: Object.freeze({
    target: "mbTimedChallengeTarget",
    type: "mbTimedChallengeType",
    duration: "mbTimedChallengeDuration",
    reward: "mbTimedChallengeReward",
    placement: "mbTimedChallengePlacement",
    status: "mbTimedChallengeStatus",
    send: "btnSendTimedChallenge",
    meta: null,
    recent: "mbTimedChallengeRecentSummary",
  }),
  live_controls: Object.freeze({
    target: "mbLcTimedChallengeTarget",
    type: "mbLcTimedChallengeType",
    duration: "mbLcTimedChallengeDuration",
    reward: "mbLcTimedChallengeReward",
    placement: "mbLcTimedChallengePlacement",
    status: "mbLcTimedChallengeStatus",
    send: "mbLcTimedChallengeSend",
    meta: "mbLcTimedChallengeMeta",
    recent: "mbLcTimedChallengeRecentSummary",
  }),
});

function getTimedChallengeComposerIds(source = "messenger") {
  return TIMED_CHALLENGE_COMPOSER_IDS[source] || TIMED_CHALLENGE_COMPOSER_IDS.messenger;
}

function getTimedChallengeComposerValues(source = "messenger") {
  const ids = getTimedChallengeComposerIds(source);

  const targetEl = document.getElementById(ids.target);
  const typeEl = document.getElementById(ids.type);
  const wineEl = document.getElementById(source === "live_controls" ? "mbLcTimedChallengeWine" : "mbTimedChallengeWine");
  const durationEl = document.getElementById(ids.duration);
  const rewardEl = document.getElementById(ids.reward);

  return {
    targetUserId: String(targetEl?.value || "").trim() || null,
    challengeKey: String(typeEl?.value || "closing_push"),
    activeWineId: String(wineEl?.value || "").trim() || null,
    durationSec: Math.max(60, Math.min(10800, Number(durationEl?.value || 10800))),
    rewardPoints: Math.max(1, Math.min(5, Number(rewardEl?.value || 5))),
    placement: String(document.getElementById(ids.placement)?.value || "before_start"),
  };
}

function buildTimedChallengePayloadFromValues(values = {}) {
  const targetUserId = values.targetUserId || null;
  const challengeKey = values.challengeKey || "closing_push";
  const durationSec = Math.max(60, Math.min(10800, Number(values.durationSec || 10800)));
  const rewardPoints = Number(values.rewardPoints || 50);
  const placement = String(values.placement || "before_start");
  const activeWineId = String(values.activeWineId || "").trim() || null;
  const restaurantId = getManagerActiveRestaurantId();

  if (!targetUserId) return null;
  if (!restaurantId) return null;

  const challengeDefs = {
    closing_push: {
      title: "Closing Push",
      focus: "closing",
      successRule: {
        type: "strongest_skill_equals",
        value: "closing",
      },
    },
    recovery_window: {
      title: "Recovery Window",
      focus: "recovery",
      successRule: {
        type: "strongest_skill_equals",
        value: "recovery",
      },
    },
    clean_close: {
      title: "Clean Close",
      focus: "closing",
      successRule: {
        type: "outcome_equals",
        value: "clean_close",
      },
    },
    soft_close: {
      title: "Soft Close",
      focus: "closing",
      successRule: {
        type: "outcome_equals",
        value: "soft_close",
      },
    },
    successful_pivot: {
      title: "Successful Pivot",
      focus: "recovery",
      successRule: {
        type: "outcome_equals",
        value: "pivot",
      },
    },
    read_first: {
      title: "Read First",
      focus: "read",
      successRule: {
        type: "guest_read_correct",
        value: true,
      },
    },
    full_delivery: {
      title: "Full Delivery",
      focus: "delivery",
      successRule: {
        type: "delivery_score_gte",
        value: 2,
      },
    },
    no_reset_run: {
      title: "No Reset Run",
      focus: "delivery",
      successRule: {
        type: "no_reset_used",
        value: true,
      },
    },
    stable_signal: {
      title: "Stable Signal",
      focus: "recovery",
      successRule: {
        type: "reaction_signal_equals",
        value: "green",
      },
    },
    controlled_table: {
      title: "Controlled Table",
      focus: "delivery",
      successRule: {
        type: "strong_pillars_gte",
        value: 3,
      },
    },
    solid_interaction: {
      title: "Solid Interaction",
      focus: "recovery",
      successRule: {
        type: "chain_score_gte",
        value: 6,
      },
    },
    premium_moment: {
      title: "Premium Moment",
      focus: "closing",
      successRule: {
        type: "premium_roll_success",
        value: true,
      },
    },
    commanding_presence: {
      title: "Commanding Presence",
      focus: "delivery",
      successRule: {
        type: "strong_pillars_gte",
        value: 4,
      },
    },
  };

  const def = challengeDefs[challengeKey] || challengeDefs.closing_push;

  return {
    challengeKey,
    title: def.title,
    targetUserId,
    restaurantId,
    durationSec,
    assignmentWindowSec: durationSec,
    encounterTimerSec: 300,
    injectionMode: "extra_encounter",
    placement,
    focus: def.focus,
    rewardPoints,
    successRule: def.successRule,
    activeWineId,
    activeWine: null,
  };
}

function buildTimedChallengePayload() {
  return buildTimedChallengePayloadFromValues(getTimedChallengeComposerValues("messenger"));
}

function formatTimedChallengeDuration(durationSec = 0) {
  const secs = Math.max(0, Number(durationSec || 0));
  if (!secs) return "0 min";
  const hours = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${Math.round(secs / 60)} min`;
}

function formatTimedChallengeSuccessText(values = {}) {
  const placementLabel =
    String(values.placement || "before_start") === "after_first_encounter"
      ? "After encounter 1"
      : "Before encounter 1";
  return `Challenge Sent • ${values.challengeKey ? getTimedChallengeLabel(values.challengeKey) : "Timed Challenge"} • ${formatTimedChallengeDuration(values.durationSec)} • ${placementLabel} • Reward ${Number(values.rewardPoints || 0)}`;
}

function setManagerStatus(elOrId, type = "idle", text = "") {
  const el = typeof elOrId === "string" ? document.getElementById(elOrId) : elOrId;
  if (!el) return;

  el.textContent = String(text || "");
  el.dataset.state = String(type || "idle");

  const opacity =
    type === "error" ? "0.95" :
    type === "success" ? "0.95" :
    type === "working" ? "0.9" :
    "0.85";

  el.style.opacity = opacity;
}

async function sendTimedChallengeFromManagerWithValues(values = {}) {
  const payload = buildTimedChallengePayloadFromValues(values);
  const profile = appState?.profile || {};
  const caps = getPremiumRoleCapabilities(profile);
  const messengerStatusEl = document.getElementById("mbTimedChallengeStatus");
  const liveStatusEl = document.getElementById("mbLcTimedChallengeStatus");
  const setStatus = (text) => {
    if (messengerStatusEl) messengerStatusEl.textContent = text;
    if (liveStatusEl) liveStatusEl.textContent = text;
  };

  if (!caps.canAssignTimedChallenges) {
    setStatus("Role cannot assign timed challenges.");
    return false;
  }

  if (!payload) {
    setStatus("Missing target or restaurant.");
    return false;
  }

  if (!canActOnRestaurant(profile, profile, payload.restaurantId)) {
    setStatus("Role cannot act on this restaurant.");
    return false;
  }

  const challengeKey = String(payload?.challengeKey || "");
  const cost = Number(MANAGER_CHALLENGE_COSTS?.[challengeKey] || 0);
  const cooldownSec = Number(MANAGER_CHALLENGE_COOLDOWNS_SEC?.[challengeKey] || 0);
  try {
    await loadManagerRestaurantWineOptions(payload.restaurantId, { force: false });
  } catch {}
  const selectedWineId = String(payload?.activeWineId || "").trim();
  const selectedWine = selectedWineId
    ? (Array.isArray(window.__BC_TIMED_CHALLENGE_WINE_OPTIONS__)
      ? window.__BC_TIMED_CHALLENGE_WINE_OPTIONS__.find((wine) => String(wine?.id || "") === selectedWineId) || null
      : null)
    : null;
  if (selectedWine) {
    payload.activeWine = selectedWine;
  }

  if (isManagerActionOnCooldown(challengeKey)) {
    const remaining = getManagerCooldownRemaining(challengeKey);
    setStatus(`Challenge on cooldown (${remaining}s)`);
    return false;
  }

  if (!canManagerSpendInfluence(cost)) {
    setStatus("Not enough influence.");
    return false;
  }

  try {
    const liveAuth = await getLiveAuthOrNull();
    const userId = liveAuth?.userId || null;
    if (!userId) {
      setStatus("No active session.");
      return false;
    }

    const senderRole = normalizeMembershipRole(profile) || "single_manager";
    const activeScopeId =
      profile?.scope_id ||
      profile?.scopeId ||
      payload.restaurantId;

    const row = {
      scope_type: "restaurant",
      scope_id: activeScopeId,
      restaurant_id: payload.restaurantId,
      sender_user_id: userId,
      receiver_user_id: payload.targetUserId,
      sender_role: senderRole,
      type: "timed_challenge",
      body: `${payload.title} • ${formatTimedChallengeDuration(payload.durationSec)}`,
      payload,
    };

    const { error } = await supabase
      .from("bc_messages_v1")
      .insert(row);

    if (error) throw error;

    spendManagerInfluence(cost);
    startManagerCooldown(challengeKey, cooldownSec);
    refreshManagerRuntimeSurfaces?.({
      thread: true,
      board: true,
      economy: true,
      liveControls: false,
      challengeMeta: true,
    });

    setStatus(`${payload.title} sent ✅`);

    renderTimedChallengeRecentSummary();
    invalidateManagerBoardCaches(payload.restaurantId);
    await loadManagerMessenger(payload.restaurantId, { force: true });
    refreshManagerRuntimeSurfaces?.({
      thread: true,
      board: true,
      economy: true,
      liveControls: false,
      challengeMeta: true,
    });
    return true;
  } catch (e) {
    console.warn("[TIMED CHALLENGE] send failed", e);
    setStatus("Could not send challenge.");
    return false;
  }
}

async function sendTimedChallengeFromManager() {
  const statusEl = document.getElementById("mbTimedChallengeStatus");
  if (statusEl) statusEl.textContent = "";

  const values = getTimedChallengeComposerValues("messenger");
  const ok = await sendTimedChallengeFromManagerWithValues(values);

  if (ok) {
    if (statusEl) {
      statusEl.textContent = formatTimedChallengeSuccessText(values);
    }
    return true;
  }

  if (statusEl && !statusEl.textContent) {
    statusEl.textContent = "Could not send challenge.";
  }
  return false;
}

function renderMessengerTimedChallengeMeta() {
  renderTimedChallengeComposerMeta("messenger");
}

function renderTimedChallengeComposerMeta(source = "messenger") {
  const ids = getTimedChallengeComposerIds(source);
  const selectEl = document.getElementById(ids.type);
  const statusEl = document.getElementById(ids.status);
  const sendBtn = document.getElementById(ids.send);
  const metaEl = ids.meta ? document.getElementById(ids.meta) : null;
  if (!selectEl) return;

  const key = String(selectEl.value || "");
  const cost = Number(MANAGER_CHALLENGE_COSTS?.[key] || 0);
  const blockReason = getManagerActionBlockReason({
    key,
    cost,
    type: "challenge",
  });

  const readyText = blockReason
    ? `${formatManagerActionCost(cost)} • ${blockReason}`
    : `${formatManagerActionCost(cost)} • Ready`;

  if (sendBtn) {
    sendBtn.disabled = !!blockReason;
    sendBtn.style.opacity = blockReason ? ".6" : "1";
    sendBtn.style.cursor = blockReason ? "not-allowed" : "";
    sendBtn.title = blockReason || "Send challenge";
  }

  if (statusEl && (!statusEl.dataset.state || statusEl.dataset.state === "idle")) {
    statusEl.textContent = readyText;
  }
  if (metaEl) {
    metaEl.textContent = readyText;
  }
}

function wireTimedChallengeComposer() {
  wireTimedChallengeComposerSource("messenger");
}

function wireManagerTimedChallengeActionPanel() {
  wireTimedChallengeComposerSource("live_controls");
}

function renderManagerTimedChallengeActionMeta() {
  renderTimedChallengeComposerMeta("live_controls");
}

function wireTimedChallengeComposerSource(source = "messenger") {
  const ids = getTimedChallengeComposerIds(source);
  const btn = document.getElementById(ids.send);
  const watchIds = [ids.type, ids.target, ids.duration, ids.reward, ids.placement].filter(Boolean);
  const wineId = source === "live_controls" ? "mbLcTimedChallengeWine" : "mbTimedChallengeWine";
  if (wineId) watchIds.push(wineId);

  watchIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el || el.__bcTimedChallengeMetaBound) return;
    el.__bcTimedChallengeMetaBound = true;
    el.addEventListener("change", () => {
      renderTimedChallengeComposerMeta(source);
    });
  });

  if (!btn || btn.__bcTimedChallengeBound) {
    renderTimedChallengeComposerMeta(source);
    return;
  }

  btn.__bcTimedChallengeBound = true;
  btn.addEventListener("click", async () => {
    const statusEl = document.getElementById(ids.status);
    if (source === "live_controls") {
      setManagerStatus(statusEl, "working", "Sending challenge…");
    } else if (statusEl) {
      statusEl.textContent = "Sending challenge…";
    }

    try {
      const values = getTimedChallengeComposerValues(source);
      const ok = await sendTimedChallengeFromManagerWithValues(values);
      if (ok) {
        if (source === "live_controls") {
          setManagerStatus(statusEl, "success", formatTimedChallengeSuccessText(values));
        } else if (statusEl) {
          statusEl.textContent = formatTimedChallengeSuccessText(values);
        }

        const src = document.getElementById(TIMED_CHALLENGE_COMPOSER_IDS.messenger.recent);
        const dst = document.getElementById(ids.recent);
        if (src && dst && src !== dst) dst.textContent = src.textContent || "";
      } else if (source === "live_controls" && statusEl && !statusEl.textContent) {
        setManagerStatus(statusEl, "error", "Could not send challenge.");
      } else if (statusEl && !statusEl.textContent) {
        statusEl.textContent = "Could not send challenge.";
      }
    } catch (e) {
      if (source === "live_controls") {
        setManagerStatus(statusEl, "error", e?.message || String(e));
      } else if (statusEl) {
        statusEl.textContent = e?.message || String(e);
      }
    }

    renderTimedChallengeComposerMeta(source);
  });

  renderTimedChallengeComposerMeta(source);
}

function canManageTimedChallenges() {
  const caps = getPremiumRoleCapabilities(appState?.profile);
  return !!caps.canAssignTimedChallenges;
}

function renderTimedChallengeComposer() {
  const composer = document.getElementById("mbTimedChallengeComposer");
  if (composer) {
    composer.classList.toggle("hidden", !canManageTimedChallenges());
  }

  if (!canManageTimedChallenges()) return;

  renderTimedChallengeTargetOptions();
  loadTimedChallengeWineOptions().catch(console.warn);
  wireTimedChallengeComposer();
  renderTimedChallengeRecentSummary();
}

function renderManagerTimedChallengeActionPanel() {
  const root = document.getElementById("mbTimedChallengeQuickActionsPanel");
  if (!root) return;
  const canSend = canManageTimedChallenges();

  const challengeOptions = [
    ["closing_push", "Closing Push"],
    ["recovery_window", "Recovery Window"],
    ["clean_close", "Clean Close"],
    ["read_first", "Read First"],
    ["full_delivery", "Full Delivery"],
    ["no_reset_run", "No Reset Run"],
  ];

  const optionsHtml = challengeOptions.map(([key, label]) => {
    const meta = getManagerActionMetaLabel(
      key,
      MANAGER_CHALLENGE_COSTS?.[key] || 0
    );
    return `<option value="${escapeHtml(key)}">${escapeHtml(label)} (${escapeHtml(meta)})</option>`;
  }).join("");

  const activeRestaurantId =
    getManagerActiveRestaurantId() ||
    appState?.restaurant?.id ||
    appState?.activeRestaurantId ||
    appState?.profile?.restaurant_id ||
    "";
  const activeWine = window.getActiveWineForPremium?.() || null;
  const wineOptionsHtml = buildTimedChallengeWineOptionsHtml(
    getAnyManagerWineOptionsForDisplay(activeRestaurantId),
    activeWine?.id || ""
  );

  root.innerHTML = `
    <div class="card" style="display:flex; flex-direction:column; gap:10px; padding:12px;">
      <div style="font-weight:600;">Timed Challenge</div>
      <div class="small-text" style="opacity:.8;">
        Send a live objective to a staff member in the active restaurant.
      </div>

      <div class="row" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <select id="mbLcTimedChallengeTarget" style="min-width:180px;"></select>

        <select id="mbLcTimedChallengeType">
          ${optionsHtml}
        </select>

        <select id="mbLcTimedChallengeWine" style="min-width:220px;">
          ${wineOptionsHtml}
        </select>

        <select id="mbLcTimedChallengeDuration">
          <option value="3600">1 hr</option>
          <option value="7200">2 hrs</option>
          <option value="10800" selected>3 hrs</option>
        </select>
        <select id="mbLcTimedChallengePlacement">
          <option value="before_start" selected>Before encounter 1</option>
          <option value="after_first_encounter">After encounter 1</option>
        </select>
        <input
          id="mbLcTimedChallengeReward"
          type="number"
          min="1"
          max="5"
          step="1"
          value="5"
          style="width:110px;"
          placeholder="Points"
        />
      </div>

      <div class="small-text" id="mbLcTimedChallengeMeta" style="opacity:.78;">
        Select a challenge to view cost and cooldown state.
      </div>
      <div class="row" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button id="mbLcTimedChallengeSend" class="btn" type="button" ${canSend ? "" : "disabled"}>Send Challenge</button>
        <div id="mbLcTimedChallengeStatus" class="small-text" style="opacity:.85;"></div>
      </div>
      <div id="mbLcTimedChallengeRecentSummary" class="small-text" style="opacity:.8;"></div>
    </div>
  `;

  root.dataset.restaurantId = String(activeRestaurantId || "");
  const wineStatusId = "mbLcTimedChallengeWineStatus";
  const existingStatus = document.getElementById(wineStatusId);
  if (!existingStatus) {
    const status = document.createElement("div");
    status.id = wineStatusId;
    status.className = "small-text";
    status.style.opacity = ".72";
    status.style.marginTop = "4px";
    status.textContent = "Wines loaded: 0";
    root.appendChild(status);
  }

  const wineStatus = document.getElementById(wineStatusId);
  const immediateWineCount = Array.isArray(window.__BC_TIMED_CHALLENGE_WINE_OPTIONS__)
    ? window.__BC_TIMED_CHALLENGE_WINE_OPTIONS__.length
    : 0;
  if (wineStatus) {
    wineStatus.textContent = `Wines loaded: ${immediateWineCount}`;
  }
  if (!canSend) {
    const note = document.createElement("div");
    note.className = "small-text";
    note.style.opacity = ".8";
    note.style.marginTop = "6px";
    note.textContent = "Your role cannot send timed challenges in this restaurant context.";
    root.appendChild(note);
  }

  renderManagerWaiterSelectOptions(
    document.getElementById("mbLcTimedChallengeTarget"),
    { selectedUserId: window.__BC_MB_ACTIVE_THREAD_USER_ID__ || "" }
  );
  renderTimedChallengeTargetOptions();
  try {
    const wineSelect = document.getElementById("mbLcTimedChallengeWine");
    if (wineSelect) {
      const activeWineId = String(activeWine?.id || "").trim();
      const cacheWines = getAnyManagerWineOptionsForDisplay(activeRestaurantId);
      const fallbackWines = cacheWines.length ? cacheWines : getAnyManagerWineOptionsForDisplay();
      wineSelect.innerHTML = buildTimedChallengeWineOptionsHtml(fallbackWines, activeWineId);
    }
    renderTimedChallengeWineSelectOptionsFromCache?.(activeRestaurantId);
  } catch (error) {
    console.warn("[TIMED CHALLENGE] cache render failed", error);
  }
  void (async () => {
    try {
      await loadTimedChallengeWineOptions();
    } catch (error) {
      console.warn("[TIMED CHALLENGE] wine refresh failed in action panel", error);
    }

    const wineCount = Array.isArray(window.__BC_TIMED_CHALLENGE_WINE_OPTIONS__)
      ? window.__BC_TIMED_CHALLENGE_WINE_OPTIONS__.length
      : 0;
    const wineSelect = document.getElementById("mbLcTimedChallengeWine");
    const updatedStatus = document.getElementById(wineStatusId);
    if (updatedStatus) {
      updatedStatus.textContent = `Wines loaded: ${wineCount}` + (
        wineSelect && wineSelect.options && wineSelect.options.length > 1
          ? ""
          : " (no selectable wines)"
      );
    }
  })();
  wireManagerTimedChallengeActionPanel?.();
  renderManagerTimedChallengeActionMeta?.();

  const recent = document.getElementById("mbTimedChallengeRecentSummary");
  const liveRecent = document.getElementById("mbLcTimedChallengeRecentSummary");
  if (recent && liveRecent) {
    liveRecent.textContent = recent.textContent || "";
  }
}

function getManagerDisplayMethodActionValues() {
  const targetEl = document.getElementById("mbLcDisplayMethodTarget");
  const typeEl = document.getElementById("mbLcDisplayMethodType");
  const durationEl = document.getElementById("mbLcDisplayMethodDuration");
  const rewardEl = document.getElementById("mbLcDisplayMethodReward");
  const strictnessEl = document.getElementById("mbLcDisplayMethodStrictness");
  const placementEl = document.getElementById("mbLcDisplayMethodPlacement");

  return {
    targetUserId: String(targetEl?.value || "").trim() || null,
    methodKey: String(typeEl?.value || "comparison"),
    challengeKey: String(typeEl?.value || "comparison"),
    durationSec: Math.max(60, Math.min(10800, Number(durationEl?.value || 10800))),
    rewardPoints: Math.max(1, Math.min(5, Number(rewardEl?.value || 5))),
    strictness: String(strictnessEl?.value || "normal"),
    placement: String(placementEl?.value || "before_start"),
  };
}

function buildDisplayMethodChallengePayloadFromValues(values = {}) {
  const targetUserId = values.targetUserId || null;
  const methodKey = values.methodKey || values.challengeKey || "comparison";
  const challengeKey = methodKey;
  const durationSec = Math.max(60, Math.min(10800, Number(values.durationSec || 10800)));
  const rewardPoints = Number(values.rewardPoints || 5);
  const strictness = String(values.strictness || "normal");
  const placement = String(values.placement || "before_start");
  const restaurantId = getManagerActiveRestaurantId();

  if (!targetUserId || !restaurantId) return null;

  const challengeDefs = {
    comparison: {
      title: "Display Method: Comparison",
      focus: "comparison",
      successRule: { type: "display_method_match", value: "comparison" },
    },
    pairing: {
      title: "Display Method: Pairing",
      focus: "pairing",
      successRule: { type: "display_method_match", value: "pairing" },
    },
    value_justification: {
      title: "Display Method: Value Justification",
      focus: "value_justification",
      successRule: { type: "display_method_match", value: "value_justification" },
    },
  };

  const def = challengeDefs[methodKey] || challengeDefs.comparison;

  return {
    challengeKey,
    methodKey,
    title: def.title,
    targetUserId,
    restaurantId,
    durationSec,
    assignmentWindowSec: durationSec,
    encounterTimerSec: 300,
    injectionMode: "extra_encounter",
    placement,
    focus: def.focus,
    rewardPoints,
    strictness,
    successRule: def.successRule,
  };
}

function formatDisplayMethodChallengeSuccessText(values = {}) {
  const placementLabel =
    String(values.placement || "before_start") === "after_first_encounter"
      ? "After encounter 1"
      : "Before encounter 1";
  return `Challenge Sent • ${getDisplayMethodChallengeLabel(values.methodKey || values.challengeKey)} • ${formatTimedChallengeDuration(values.durationSec)} • ${placementLabel} • Reward ${Number(values.rewardPoints || 0)}`;
}

async function sendDisplayMethodChallengeFromManagerWithValues(values = {}) {
  const payload = buildDisplayMethodChallengePayloadFromValues(values);
  const profile = appState?.profile || {};
  const caps = getPremiumRoleCapabilities(profile);
  const statusEl = document.getElementById("mbLcDisplayMethodStatus");

  if (!caps.canAssignTimedChallenges) {
    setManagerStatus(statusEl, "error", "Role cannot assign display method challenges.");
    return false;
  }

  if (!payload) {
    setManagerStatus(statusEl, "error", "Missing target or restaurant.");
    return false;
  }

  if (!canActOnRestaurant(profile, profile, payload.restaurantId)) {
    setManagerStatus(statusEl, "error", "Role cannot act on this restaurant.");
    return false;
  }

  try {
    const liveAuth = await getLiveAuthOrNull();
    const userId = liveAuth?.userId || null;
    if (!userId) {
      setManagerStatus(statusEl, "error", "No active session.");
      return false;
    }

    const senderRole = normalizeMembershipRole(profile) || "single_manager";
    const activeScopeId =
      profile?.scope_id ||
      profile?.scopeId ||
      payload.restaurantId;

    const row = {
      scope_type: "restaurant",
      scope_id: activeScopeId,
      restaurant_id: payload.restaurantId,
      sender_user_id: userId,
      receiver_user_id: payload.targetUserId,
      sender_role: senderRole,
      type: "display_method_challenge",
      body: `${payload.title} • ${formatTimedChallengeDuration(payload.durationSec)}`,
      payload,
    };

    const { error } = await supabase
      .from("bc_messages_v1")
      .insert(row);

    if (error) throw error;

    refreshManagerRuntimeSurfaces?.({
      thread: true,
      board: true,
      economy: false,
      liveControls: false,
      challengeMeta: true,
    });
    setManagerStatus(statusEl, "success", `${payload.title} sent ✅`);
    renderDisplayMethodChallengeRecentSummary?.();
    invalidateManagerBoardCaches(payload.restaurantId);
    await loadManagerMessenger(payload.restaurantId, { force: true });
    refreshManagerRuntimeSurfaces?.({
      thread: true,
      board: true,
      economy: false,
      liveControls: false,
      challengeMeta: true,
    });
    return true;
  } catch (e) {
    console.warn("[DISPLAY METHOD CHALLENGE] send failed", e);
    setManagerStatus(statusEl, "error", "Could not send challenge.");
    return false;
  }
}

function renderManagerDisplayMethodActionMeta() {
  const selectEl = document.getElementById("mbLcDisplayMethodType");
  const metaEl = document.getElementById("mbLcDisplayMethodMeta");
  if (!selectEl || !metaEl) return;

  const methodKey = String(selectEl.value || "comparison");
  const strictness = String(document.getElementById("mbLcDisplayMethodStrictness")?.value || "normal");
  const copy = {
    comparison: "Require a clear compare-and-guide recommendation, not a flat product drop.",
    pairing: "Reward food-context pairing logic and a recommendation that feels matched to the table.",
    value_justification: "Reward a recommendation that explains why the choice is worth it for this guest.",
  };
  metaEl.textContent = `${copy[methodKey] || copy.comparison} Strictness: ${strictness}.`;
}

function wireManagerDisplayMethodActionPanel() {
  const btn = document.getElementById("mbLcDisplayMethodSend");
  const watchIds = [
    "mbLcDisplayMethodTarget",
    "mbLcDisplayMethodType",
    "mbLcDisplayMethodDuration",
    "mbLcDisplayMethodPlacement",
    "mbLcDisplayMethodReward",
    "mbLcDisplayMethodStrictness",
  ];

  watchIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el || el.__bcDisplayMethodMetaBound) return;
    el.__bcDisplayMethodMetaBound = true;
    el.addEventListener("change", () => renderManagerDisplayMethodActionMeta());
  });

  if (!btn || btn.__bcDisplayMethodBound) {
    renderManagerDisplayMethodActionMeta();
    return;
  }

  btn.__bcDisplayMethodBound = true;
  btn.addEventListener("click", async () => {
    const statusEl = document.getElementById("mbLcDisplayMethodStatus");
    setManagerStatus(statusEl, "working", "Sending challenge…");
    try {
      const values = getManagerDisplayMethodActionValues();
      const ok = await sendDisplayMethodChallengeFromManagerWithValues(values);
      if (ok) {
        setManagerStatus(statusEl, "success", formatDisplayMethodChallengeSuccessText(values));
      } else if (statusEl && !statusEl.textContent) {
        setManagerStatus(statusEl, "error", "Could not send challenge.");
      }
    } catch (e) {
      setManagerStatus(statusEl, "error", e?.message || String(e));
    }
    renderManagerDisplayMethodActionMeta();
  });

  renderManagerDisplayMethodActionMeta();
}

function renderManagerDisplayMethodActionPanel() {
  const root = document.getElementById("mbDisplayMethodQuickActionsPanel");
  if (!root) return;
  if (!canManageTimedChallenges()) {
    root.innerHTML = `
      <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
        <div style="font-weight:600;">Display Method Challenge</div>
        <div class="small-text" style="opacity:.8;">
          Your role cannot send display method challenges in this restaurant context.
        </div>
      </div>
    `;
    return;
  }

  const optionsHtml = [
    ["comparison", "Comparison"],
    ["pairing", "Pairing"],
    ["value_justification", "Value Justification"],
  ].map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`).join("");

  root.innerHTML = `
    <div class="card" style="display:flex; flex-direction:column; gap:10px; padding:12px;">
      <div style="font-weight:600;">Display Method Challenge</div>
      <div class="small-text" style="opacity:.8;">
        Send a live display-method challenge to a staff member in the active restaurant.
      </div>

      <div class="row" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <select id="mbLcDisplayMethodTarget" style="min-width:180px;"></select>
        <select id="mbLcDisplayMethodType">${optionsHtml}</select>
        <select id="mbLcDisplayMethodDuration">
          <option value="3600">1 hr</option>
          <option value="7200">2 hrs</option>
          <option value="10800" selected>3 hrs</option>
        </select>
        <select id="mbLcDisplayMethodPlacement">
          <option value="before_start" selected>Before encounter 1</option>
          <option value="after_first_encounter">After encounter 1</option>
        </select>
        <input
          id="mbLcDisplayMethodReward"
          type="number"
          min="1"
          max="5"
          step="1"
          value="5"
          style="width:110px;"
          placeholder="Points"
        />
        <select id="mbLcDisplayMethodStrictness">
          <option value="normal" selected>Normal</option>
          <option value="hard">Hard</option>
          <option value="strict">Strict</option>
        </select>
      </div>

      <div class="small-text" id="mbLcDisplayMethodMeta" style="opacity:.78;">
        Select a method to view challenge guidance.
      </div>

      <div class="row" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button id="mbLcDisplayMethodSend" class="btn" type="button">Send Challenge</button>
        <div id="mbLcDisplayMethodStatus" class="small-text" style="opacity:.85;"></div>
      </div>
      <div id="mbLcDisplayMethodRecentSummary" class="small-text" style="opacity:.8;"></div>
    </div>
  `;

  renderManagerWaiterSelectOptions(
    document.getElementById("mbLcDisplayMethodTarget"),
    { selectedUserId: window.__BC_MB_ACTIVE_THREAD_USER_ID__ || "" }
  );
  renderTimedChallengeTargetOptions();
  wireManagerDisplayMethodActionPanel?.();
  renderManagerDisplayMethodActionMeta?.();
  renderDisplayMethodChallengeRecentSummary?.();
}

async function mbSendInstruction() {
  const { restaurantId, isManager } = getManagerBoardFilter();
  if (!isManager) throw new Error("Manager only");
  if (!restaurantId) throw new Error("Active restaurant not set");

  const scopeId = getScopeIdSafe();
  if (!scopeId) throw new Error("Scope not set");

  const to = String(window.__BC_MB_ACTIVE_THREAD_USER_ID__ || "");
  const body = String(mbEl("mbInstrBody")?.value || "").trim();
  const status = mbEl("mbInstrStatus");

  if (!to) throw new Error("Select a waiter thread");
  if (!body) throw new Error("Write a short instruction");

  if (status) status.textContent = "Sending…";

  const senderId = appState?.session?.user?.id || appState?.session?.userId || null;
  const senderRole = String(appState?.profile?.role || "");
  if (!senderId) throw new Error("No session");

  const quota = await getFreeMessageUsageToday({ senderUserId: senderId });
  if (quota.remaining <= 0) {
    await refreshManagerMessageQuotaUi();
    throw new Error("Daily free message limit reached");
  }

  const row = {
    scope_type: "restaurant",
    scope_id: restaurantId,
    restaurant_id: restaurantId,
    sender_user_id: senderId,
    receiver_user_id: to,
    sender_role: senderRole,
    type: "instruction",
    body,
    payload: null,
  };

  const { error } = await supabase.from("bc_messages_v1").insert(row);
  if (error) throw error;

  if (status) status.textContent = "Sent ✅";
  try { mbEl("mbInstrBody").value = ""; } catch {}
  await refreshManagerMessageQuotaUi();
  invalidateManagerBoardCaches(restaurantId);
  await loadManagerMessenger(restaurantId, { force: true });
  refreshManagerRuntimeSurfaces?.({
    thread: true,
    board: true,
    economy: false,
    liveControls: false,
    challengeMeta: true,
  });
}

function getManagerDrillActionValues(source = "live_controls") {
  const idMap = source === "live_controls"
    ? {
        target: "mbLcDrillTarget",
        focus: "mbLcDrillFocus",
        reps: "mbLcDrillReps",
        duration: "mbLcDrillDuration",
        tier: "mbLcDrillTier",
      }
    : {
        target: "mbTimedChallengeTarget",
        focus: null,
        reps: null,
        duration: null,
        tier: null,
      };

  return {
    targetUserId: String(document.getElementById(idMap.target)?.value || "").trim() || null,
    focus: String(document.getElementById(idMap.focus)?.value || "").trim() || "read",
    repTarget: Number(document.getElementById(idMap.reps)?.value || 3),
    durationSec: Number(document.getElementById(idMap.duration)?.value || 300),
    tier: Number(document.getElementById(idMap.tier)?.value || 1),
  };
}

function getManagerThreadLatestSignal(targetUserId) {
  const threads = Array.isArray(window.__BC_MB_THREADS__) ? window.__BC_MB_THREADS__ : [];
  const thread = threads.find((t) => String(t?.userId || "") === String(targetUserId || ""));
  const latest = [...(thread?.rows || [])]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-1)[0] || null;

  const payload = getProgressReportPayload(latest) || {};
  return {
    latest,
    payload,
    guest: String(payload?.guestStateActual || "").toLowerCase(),
    signal: String(payload?.chainSignal || payload?.outcome || "").toLowerCase(),
  };
}

function renderManagerDrillHint(targetUserId) {
  const root = document.getElementById("mbLcDrillHint");
  if (!root) return;
  if (!targetUserId) {
    root.textContent = "Pick a waiter to see a suggested drill direction.";
    return;
  }

  const { guest, signal } = getManagerThreadLatestSignal(targetUserId);

  let text = "Suggested: Read drill as a safe default.";
  if (signal === "red" || signal === "soft_close") {
    text = "Suggested: Read drill based on the latest weak result.";
  } else if (guest === "griever") {
    text = "Suggested: Recovery drill due to softer, resistant guest energy.";
  } else if (guest === "decider" || guest === "dictator") {
    text = "Suggested: Closing or read drill for decisive-table handling.";
  } else if (guest === "fancy") {
    text = "Suggested: Frame or delivery drill for precision and confidence.";
  }

  root.textContent = text;
}

async function mbSendDrillOverride(opts = {}) {
  const { restaurantId, canAct, caps } = getManagerBoardFilter();
  if (!restaurantId) throw new Error("Active restaurant not set");
  if (!caps.canAssignDrills) throw new Error("Role cannot assign drills.");
  if (!canAct) throw new Error("Role cannot act on this restaurant.");

  const to = String(opts.targetUserId || window.__BC_MB_ACTIVE_THREAD_USER_ID__ || "");
  const status = mbEl("mbInstrStatus");

  if (!to) throw new Error("Select a waiter thread");

  if (status && !opts.silentStatus) status.textContent = "Sending drill…";

  const senderId = appState?.session?.user?.id || appState?.session?.userId || null;
  const senderRole = normalizeMembershipRole(appState?.profile) || "single_manager";
  const activeScopeId =
    appState?.profile?.scope_id ||
    appState?.profile?.scopeId ||
    restaurantId;
  if (!senderId) throw new Error("No session");

  const baseDrill = window.__BC_DRILL_CONFIG__ || window.BC_DRILL_CONFIG || null;
  const threads = Array.isArray(window.__BC_MB_THREADS__) ? window.__BC_MB_THREADS__ : [];
  const thread = threads.find((t) => String(t?.userId || "") === String(to));
  const latest = [...(thread?.rows || [])]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-1)[0];

  const latestPayload = getProgressReportPayload(latest) || {};
  const guest = String(latestPayload?.guestStateActual || "").toLowerCase();
  const sig = String(latestPayload?.chainSignal || "").toLowerCase();

  let focus = String(opts.focus || "").toLowerCase() || "read";
  let pool = ["dictator", "bargain_smart", "griever"];
  let tier = 1;
  let durationSec = 300;
  let repTarget = 3;

  if (focus === "read") {
    if (guest === "decider" || guest === "dictator") pool = ["dictator"];
    else pool = ["dictator", "bargain_smart", "griever"];
  } else if (focus === "frame") {
    pool = ["dictator", "fancy"];
  } else if (focus === "delivery") {
    pool = ["dictator", "fancy", "griever"];
  } else if (focus === "recovery") {
    pool = ["griever", "dictator"];
    repTarget = 4;
  } else if (focus === "closing") {
    pool = ["dictator", "fancy"];
  }

  if (!opts.focus && (sig === "soft_close" || sig === "red")) {
    focus = "read";
    repTarget = 4;
  }

  if (Array.isArray(opts.pool) && opts.pool.length) pool = opts.pool;
  if (opts.tier != null) tier = Number(opts.tier);
  if (opts.durationSec != null) durationSec = Number(opts.durationSec);
  if (opts.repTarget != null) repTarget = Number(opts.repTarget);

  const drill = {
    ...(baseDrill || {}),
    focus,
    pool,
    repTarget,
    durationSec,
    tier,
  };

  const row = {
    scope_type: "restaurant",
    scope_id: activeScopeId,
    restaurant_id: restaurantId,
    sender_user_id: senderId,
    receiver_user_id: to,
    sender_role: senderRole,
    type: "drill_override",
    body: `Assigned a ${focus} drill to this waiter.`,
    payload: {
      drill,
      reason: "Manager assigned a focused drill based on recent progress."
    },
  };

  const { error } = await supabase.from("bc_messages_v1").insert(row);
  if (error) throw error;

  if (status && !opts.silentStatus) status.textContent = "Drill sent ✅";
  invalidateManagerBoardCaches(restaurantId);
  await loadManagerMessenger(restaurantId, { force: true });
  refreshManagerRuntimeSurfaces?.({
    thread: true,
    board: true,
    economy: false,
    liveControls: false,
    challengeMeta: true,
  });
  return true;
}

function renderManagerDrillActionPanel() {
  const root = document.getElementById("mbDrillQuickActionsPanel");
  if (!root) return;
  const caps = getPremiumRoleCapabilities(appState?.profile);
  const canSend = !!caps.canAssignDrills;

  root.innerHTML = `
    <div class="card" style="display:flex; flex-direction:column; gap:10px; padding:12px;">
      <div style="font-weight:600;">Assign Drill</div>
      <div class="small-text" style="opacity:.8;">
        Send a focused practice block to a waiter.
      </div>
      <div class="row" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <select id="mbLcDrillTarget" style="min-width:180px;"></select>
        <select id="mbLcDrillFocus">
          <option value="read">Read</option>
          <option value="frame">Frame</option>
          <option value="delivery">Delivery</option>
          <option value="recovery">Recovery</option>
          <option value="closing">Closing</option>
        </select>
        <input id="mbLcDrillReps" type="number" min="1" step="1" value="3" style="width:90px;" placeholder="Reps" />
        <select id="mbLcDrillDuration">
          <option value="180">3 min</option>
          <option value="300" selected>5 min</option>
          <option value="600">10 min</option>
        </select>
        <select id="mbLcDrillTier">
          <option value="1">Tier 1</option>
          <option value="2">Tier 2</option>
          <option value="3">Tier 3</option>
        </select>
      </div>
      <div class="row" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button id="mbLcDrillSend" class="btn" type="button" ${canSend ? "" : "disabled"}>Assign Drill</button>
        <div id="mbLcDrillStatus" class="small-text" style="opacity:.85;"></div>
      </div>
      <div id="mbLcDrillHint" class="small-text" style="opacity:.8;"></div>
    </div>
  `;

  renderManagerWaiterSelectOptions(
    document.getElementById("mbLcDrillTarget"),
    { selectedUserId: window.__BC_MB_ACTIVE_THREAD_USER_ID__ || "" }
  );

  renderManagerDrillHint(window.__BC_MB_ACTIVE_THREAD_USER_ID__ || "");
  if (!canSend) {
    const hint = document.getElementById("mbLcDrillHint");
    if (hint) hint.textContent = "Your role cannot assign drills in this restaurant context.";
  }
  renderTimedChallengeTargetOptions();
  wireManagerDrillActionPanel?.();
}

async function sendManagerDrillOverrideFromValues(values = {}) {
  if (!values?.targetUserId) return false;

  return mbSendDrillOverride({
    targetUserId: values.targetUserId,
    focus: values.focus,
    repTarget: values.repTarget,
    durationSec: values.durationSec,
    tier: values.tier,
    silentStatus: true,
  });
}

async function sendManagerDrillOverride({ focus, repTarget = 3, durationSec = 300, pool, tier } = {}) {
  return mbSendDrillOverride({ focus, repTarget, durationSec, pool, tier });
}

function wireManagerDrillActionPanel() {
  const btn = document.getElementById("mbLcDrillSend");
  const targetEl = document.getElementById("mbLcDrillTarget");
  if (targetEl && !targetEl.__bcBound) {
    targetEl.__bcBound = true;
    targetEl.addEventListener("change", () => {
      renderManagerDrillHint(targetEl.value || "");
    });
  }

  if (!btn || btn.__bcBound) return;

  btn.__bcBound = true;
  btn.addEventListener("click", async () => {
    const statusEl = document.getElementById("mbLcDrillStatus");
    setManagerStatus(statusEl, "working", "Sending drill…");

    try {
      const values = getManagerDrillActionValues("live_controls");
      const ok = await sendManagerDrillOverrideFromValues(values);

      if (ok) {
        setManagerStatus(statusEl, "success", "Drill sent ✅");
      } else if (!statusEl.textContent) {
        setManagerStatus(statusEl, "error", "Could not send drill.");
      }
    } catch (e) {
      setManagerStatus(statusEl, "error", e?.message || String(e));
    }
  });
}

function wireManagerBoardMessenger() {
  syncManagerMessengerViewportLayout();
  const setMessengerOpen = (isOpen) => {
    window.__BC_MB_MESSENGER_OPEN__ = !!isOpen;
    const deck = mbEl("mbMessengerDeck");
    const toggle = mbEl("mbToggleMessengerPanel");
    if (deck) deck.classList.toggle("hidden", !isOpen);
    if (toggle) toggle.textContent = isOpen ? "Close Inbox" : "Open Inbox";
  };

  const isMobileEnv = document.documentElement.dataset.bcMobileEnv === "true";
  if (isMobileEnv) {
    window.__BC_MB_MESSENGER_OPEN__ = true;
  }
  setMessengerOpen(isMobileEnv ? true : window.__BC_MB_MESSENGER_OPEN__ !== false);

  const toggle = mbEl("mbToggleMessengerPanel");
  if (toggle && !toggle.__wired) {
    toggle.__wired = true;
    toggle.addEventListener("click", () => {
      if (document.documentElement.dataset.bcMobileEnv === "true") {
        setMessengerOpen(true);
        return;
      }
      setMessengerOpen(!(window.__BC_MB_MESSENGER_OPEN__ !== false));
    });
  }

  wireManagerBoardSearches();
  const btn = mbEl("mbMsgRefresh");
  if (btn && !btn.__wired) {
    btn.__wired = true;
    btn.addEventListener("click", () => loadManagerMessenger(null, { force: true }).catch(console.error));
  }

  const send = mbEl("mbInstrSend");
  if (send && !send.__wired) {
    send.__wired = true;
    send.addEventListener("click", () => {
      mbSendInstruction().catch((e) => {
        const status = mbEl("mbInstrStatus");
        if (status) status.textContent = e?.message || String(e);
      });
    });
  }

  const runDrill = mbEl("mbInstrRunDrill");
  if (runDrill && !runDrill.__wired) {
    runDrill.__wired = true;
    runDrill.textContent = "Assign Drill to This Waiter";
    runDrill.addEventListener("click", () => {
      mbSendDrillOverride().catch((e) => {
        const status = mbEl("mbInstrStatus");
        setManagerStatus(status, "error", e?.message || String(e));
      });
    });
  }

  const useSuggestion = mbEl("mbInstrUseSuggestion");
  if (useSuggestion && !useSuggestion.__wired) {
    useSuggestion.__wired = true;
    useSuggestion.addEventListener("click", () => {
      const picked = window.__BC_MB_SELECTED_SUGGESTION__ || "";
      const body = mbEl("mbInstrBody");
      if (!body) return;
      if (picked) {
        body.value = picked;
      }
    });
  }

  const prompts = mbEl("mbSuggestedPrompts");
  if (prompts && !prompts.__wired) {
    prompts.__wired = true;
    prompts.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-suggested-prompt]");
      if (!btn) return;
      const txt = btn.getAttribute("data-suggested-prompt") || "";
      window.__BC_MB_SELECTED_SUGGESTION__ = txt;
      const body = mbEl("mbInstrBody");
      if (body) body.value = txt;
    });
  }

  const list = mbEl("mbThreadList");
  if (list && !list.__wired) {
    list.__wired = true;
    list.addEventListener("click", async (e) => {
      const btn = e.target?.closest?.("[data-thread-user-id]");
      if (!btn) return;

      const threads = window.__BC_MB_THREADS__ || [];
      const nextUserId = btn.getAttribute("data-thread-user-id") || "";
      const nextThread = threads.find(
        (t) => String(t?.userId || "") === String(nextUserId)
      );
      setActiveManagerThreadState({
        userId: nextUserId,
        rows: nextThread?.rows || [],
      });
      const ids = threads.map((t) => t.userId);
      const nameMap = await mapUserIdsToNames(ids);

      renderManagerThreadList(window.__BC_MB_THREADS_ALL__ || threads, nameMap);

      safeCall("renderManagerActiveThread", () => renderManagerActiveThread(nameMap));
      safeCall("renderManagerThreadDrillSummary", () => renderManagerThreadDrillSummary?.());
      const target = document.getElementById("mbTimedChallengeTarget");
      if (target) target.value = String(window.__BC_MB_ACTIVE_THREAD_USER_ID__ || "");
      renderTimedChallengeComposer();
    });
  }
}

function renderManagerBoardMembersFromRows(rid, staffRows, snapshot) {
  const box = document.getElementById("mbMembersList");
  const msg = document.getElementById("mbMembersMsg");
  const searchInput = document.getElementById("mbPeopleSearch");
  if (!box || !msg) return;

  wireManagerBoardSearches();
  if (searchInput && searchInput.value !== String(window.__BC_MB_PEOPLE_SEARCH__ || "")) {
    searchInput.value = String(window.__BC_MB_PEOPLE_SEARCH__ || "");
  }

  const filteredStaffRows = filterManagerStaffRows(staffRows, getManagerPeopleSearchTerm());
  window.__BC_MB_STAFF_ROWS__ = staffRows;
  window.__BC_MB_WAITERS__ = staffRows.filter(
    (p) => String(p?.role || "").toLowerCase() === "waiter"
  );
  const canResetWaiterProgression = ["single_manager", "group_manager", "enterpriser"].includes(
    normalizeMembershipRole(snapshot.profile || null)
  );

  const rows = filteredStaffRows.map((p) => {
    const name = String(p?.display_name || "").trim() || "(no name)";
    const badge = getDisplayRoleLabel(p?.role);
    const isWaiter = normalizeMembershipRole(p) === "waiter";
    const actionHtml = (canResetWaiterProgression && isWaiter)
      ? `
          <button
            type="button"
            class="btn-ghost mb-reset-waiter-progression"
            data-user-id="${escapeHtml(String(p?.user_id || ""))}"
            data-restaurant-id="${escapeHtml(String(rid || ""))}"
            data-display-name="${escapeHtml(name)}"
          >
            Reset progression
          </button>
        `
      : "";

    return `
      <div class="card" style="padding:10px; border-radius:12px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="min-width:0;">
            <div style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${escapeHtml(name)}
            </div>
            <div class="small-text" style="margin-top:2px;">${escapeHtml(p?.user_id || "")}</div>
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
            <div class="small-text" style="white-space:nowrap; opacity:0.9;">${escapeHtml(badge)}</div>
            ${actionHtml}
          </div>
        </div>
      </div>
    `;
  });

  box.innerHTML = rows.join("") || `<div class="small-text">No members found.</div>`;
  box.querySelectorAll(".mb-reset-waiter-progression").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const targetUserId = btn.getAttribute("data-user-id") || "";
      const targetRestaurantId = btn.getAttribute("data-restaurant-id") || "";
      const targetName = btn.getAttribute("data-display-name") || "this waiter";

      if (!targetUserId || !targetRestaurantId) return;
      const confirmed = window.confirm(`Reset progression for ${targetName}?`);
      if (!confirmed) return;

      const previousText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Resetting…";
      msg.textContent = `Resetting progression for ${targetName}…`;

      try {
        await hardResetWaiterProgressionAsManager({
          userId: targetUserId,
          restaurantId: targetRestaurantId,
        });
        invalidateManagerBoardCaches(targetRestaurantId);
        msg.textContent = `Progression reset for ${targetName}.`;
      } catch (error) {
        msg.textContent = `Failed to reset ${targetName}: ${error?.message || String(error)}`;
      } finally {
        btn.disabled = false;
        btn.textContent = previousText;
      }
    });
  });
  msg.textContent = getManagerPeopleSearchTerm()
    ? `${filteredStaffRows.length} of ${staffRows.length} member(s) shown.`
    : `${staffRows.length} member(s) loaded.`;
  renderManagerPeopleSummary();
  renderTimedChallengeTargetOptions();
  renderTimedChallengeWineSelectOptionsFromCache?.(rid);
  safeCall("renderManagerBoardOverviewRitualStatusCard", () => renderManagerBoardOverviewRitualStatusCard?.());
}

async function loadManagerBoardMembers(options = {}) {
  const snapshot = getParentCtxSnapshot("premium");
  const rid = getManagerActiveRestaurantId() || snapshot.activeRestaurantId || snapshot.profile?.restaurant_id || null;
  const box = document.getElementById("mbMembersList");
  const msg = document.getElementById("mbMembersMsg");
  const searchInput = document.getElementById("mbPeopleSearch");
  const force = !!options?.force;
  if (!box || !msg) return;

  wireManagerBoardSearches();
  if (searchInput && searchInput.value !== String(window.__BC_MB_PEOPLE_SEARCH__ || "")) {
    searchInput.value = String(window.__BC_MB_PEOPLE_SEARCH__ || "");
  }

  box.innerHTML = "";
  msg.textContent = "";

  if (!rid) {
    msg.textContent = "No active restaurant selected.";
    return;
  }

  if (isFreshCacheEntry(managerBoardMembersCache, MANAGER_BOARD_MEMBERS_CACHE_MS, rid) && !force) {
    renderManagerBoardMembersFromRows(rid, managerBoardMembersCache.rows || [], snapshot);
    return;
  }

  msg.textContent = "Loading members…";

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, role, created_at")
    .eq("restaurant_id", rid)
    .order("created_at", { ascending: true });

  if (error) {
    msg.textContent = "Failed to load members: " + (error.message || "unknown");
    return;
  }

  const staffRows = data || [];
  managerBoardMembersCache = { rid: String(rid), loadedAt: Date.now(), rows: staffRows };
  renderManagerBoardMembersFromRows(rid, staffRows, snapshot);
}

function wireManagerBoardMembers() {
  const btn = document.getElementById("mbRefreshMembers");
  if (!btn || btn.__wired) return;
  btn.__wired = true;
  btn.addEventListener("click", () => loadManagerBoardMembers({ force: true }));
}

function renderLeaderboard(list) {
  const el = document.getElementById("mbLeaderboard");
  if (!el) return;

  if (!list.length) {
    el.innerHTML = `<div class="small-text">No performance data yet.</div>`;
    return;
  }

  el.innerHTML = list.map((w, i) => `

    <div style="
      display:flex;
      justify-content:space-between;
      padding:6px 0;
      border-bottom:1px solid rgba(255,255,255,0.08);
    ">

      <div>
        <b>#${i + 1}</b> ${escapeHtml(w.name)}
      </div>

      <div style="opacity:.8;">
        ${w.avg}%
      </div>

    </div>

  `).join("");
}

async function loadLeaderboard() {
  const { restaurantId } = getManagerBoardFilter();
  if (!restaurantId) return;

  const { data, error } = await supabase
    .from("bc_skill_snapshots_v1")
    .select(`
      user_id,
      read_pct,
      framing_pct,
      delivery_pct,
      recovery_pct,
      closing_pct
    `)
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.warn("[LEADERBOARD]", error);
    return;
  }

  const map = {};
  const nameMap = await mapUserIdsToNames((data || []).map((row) => row?.user_id).filter(Boolean));

  (data || []).forEach((row) => {
    const id = row.user_id;

    if (!map[id]) {
      map[id] = {
        name: nameMap.get(id) || id,
        total: 0,
        count: 0
      };
    }

    const score =
      (row.read_pct +
       row.framing_pct +
       row.delivery_pct +
       row.recovery_pct +
       row.closing_pct) / 5;

    map[id].total += score;
    map[id].count += 1;
  });

  const list = Object.values(map)
    .map((w) => ({
      name: w.name,
      avg: Math.round(w.total / w.count)
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10);

  renderLeaderboard(list);
}

function renderWeeklyTrainingReport(rows) {
  const el = document.getElementById("mbWeeklyReport");
  if (!el) return;

  if (!rows.length) {
    el.innerHTML = `<div class="small-text">No training data this week.</div>`;
    return;
  }

  const waiterMap = {};
  const skillGrowth = {
    read: 0,
    framing: 0,
    delivery: 0,
    recovery: 0,
    closing: 0
  };

  rows.forEach((r) => {
    const id = r.user_id;

    if (!waiterMap[id]) {
      waiterMap[id] = {
        name: r.__displayName || id,
        total: 0,
        count: 0
      };
    }

    const score =
      (r.read_pct +
       r.framing_pct +
       r.delivery_pct +
       r.recovery_pct +
       r.closing_pct) / 5;

    waiterMap[id].total += score;
    waiterMap[id].count += 1;

    skillGrowth.read += r.read_pct;
    skillGrowth.framing += r.framing_pct;
    skillGrowth.delivery += r.delivery_pct;
    skillGrowth.recovery += r.recovery_pct;
    skillGrowth.closing += r.closing_pct;
  });

  const waiters = Object.values(waiterMap)
    .map((w) => ({
      name: w.name,
      avg: w.total / w.count
    }))
    .sort((a, b) => b.avg - a.avg);

  const topWaiter = waiters[0]?.name || "—";

  const skillAvg = Object.entries(skillGrowth)
    .map(([k, v]) => ({
      skill: k,
      avg: v / rows.length
    }))
    .sort((a, b) => a.avg - b.avg);

  const recommendedFocus = skillAvg[0]?.skill || "—";

  el.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:6px;">

      <div>
        🏆 <b>Top waiter:</b> ${escapeHtml(topWaiter)}
      </div>

      <div>
        📉 <b>Team focus area:</b> ${escapeHtml(recommendedFocus)}
      </div>

      <div>
        📊 <b>Total reports analyzed:</b> ${rows.length}
      </div>

      <div class="small-text" style="opacity:.7;">
        Recommendation: run focused drills on ${escapeHtml(recommendedFocus)} this week.
      </div>

    </div>
  `;
}

async function loadWeeklyTrainingReport() {
  const { restaurantId } = getManagerBoardFilter();
  if (!restaurantId) {
    renderWeeklyTrainingReport([]);
    return [];
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from("bc_skill_snapshots_v1")
    .select(`
      user_id,
      read_pct,
      framing_pct,
      delivery_pct,
      recovery_pct,
      closing_pct,
      created_at
    `)
    .eq("restaurant_id", restaurantId)
    .gte("created_at", sevenDaysAgo.toISOString());

  if (error) {
    console.warn("[WEEKLY REPORT]", error);
    return [];
  }

  const rows = data || [];
  const nameMap = await mapUserIdsToNames(rows.map((row) => row?.user_id).filter(Boolean));
  const namedRows = rows.map((row) => ({
    ...row,
    __displayName: nameMap.get(row?.user_id) || row?.user_id || null,
  }));
  renderWeeklyTrainingReport(namedRows);
  return namedRows;
}

function getWeekStartIso(d = new Date()) {
  const x = new Date(d);
  const day = (x.getUTCDay() + 6) % 7; // Monday=0
  x.setUTCDate(x.getUTCDate() - day);
  x.setUTCHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

function prettySkillLabel(key) {
  const k = String(key || "").toLowerCase();
  if (k === "read") return "Reading";
  if (k === "framing") return "Framing";
  if (k === "delivery") return "Delivery";
  if (k === "recovery") return "Recovery";
  if (k === "closing") return "Closing";
  return key || "—";
}

async function maybeSendWeeklyManagerSummary(rows) {
  try {
    const { restaurantId, isManager } = getManagerBoardFilter();
    if (!isManager || !restaurantId) return;
    if (!Array.isArray(rows) || !rows.length) return;

    const managerId = appState?.session?.user?.id || appState?.session?.userId || null;
    const senderRole = normalizeMembershipRole(appState?.profile) || "single_manager";
    if (!managerId) return;

    const weekStart = getWeekStartIso();
    const sentKey = `bc_weekly_summary_sent_v1_${restaurantId}_${managerId}_${weekStart}`;
    if (localStorage.getItem(sentKey) === "1") return;

    const waiterMap = {};
    const skillGrowth = { read: 0, framing: 0, delivery: 0, recovery: 0, closing: 0 };

    rows.forEach((r) => {
      const id = r.user_id;
      if (!waiterMap[id]) {
        waiterMap[id] = { name: r.__displayName || id, total: 0, count: 0 };
      }
      const score =
        (r.read_pct + r.framing_pct + r.delivery_pct + r.recovery_pct + r.closing_pct) / 5;
      waiterMap[id].total += score;
      waiterMap[id].count += 1;
      skillGrowth.read += r.read_pct;
      skillGrowth.framing += r.framing_pct;
      skillGrowth.delivery += r.delivery_pct;
      skillGrowth.recovery += r.recovery_pct;
      skillGrowth.closing += r.closing_pct;
    });

    const waiters = Object.values(waiterMap)
      .map((w) => ({ name: w.name, avg: w.total / w.count }))
      .sort((a, b) => b.avg - a.avg);
    const topWaiter = waiters[0]?.name || "—";

    const skillAvg = Object.entries(skillGrowth)
      .map(([k, v]) => ({ skill: k, avg: v / rows.length }))
      .sort((a, b) => a.avg - b.avg);
    const recommendedFocus = skillAvg[0]?.skill || "—";

    const byTime = [...rows]
      .filter((r) => r?.created_at)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const n = Math.max(1, Math.min(5, Math.floor(byTime.length / 2) || 1));
    const first = byTime.slice(0, n);
    const last = byTime.slice(-n);
    const keys = ["read_pct", "framing_pct", "delivery_pct", "recovery_pct", "closing_pct"];

    const mean = (arr, k) => {
      if (!arr.length) return 0;
      const total = arr.reduce((acc, r) => acc + Number(r?.[k] ?? 0), 0);
      return total / arr.length;
    };

    let bestDelta = -Infinity;
    let mostImproved = "read";
    keys.forEach((k) => {
      const delta = mean(last, k) - mean(first, k);
      if (delta > bestDelta) {
        bestDelta = delta;
        mostImproved = k.replace("_pct", "");
      }
    });

    const body = [
      "Weekly Training Summary",
      "",
      `Top performer: ${topWaiter}`,
      `Most improved skill: ${prettySkillLabel(mostImproved)}`,
      `Recommended focus: ${prettySkillLabel(recommendedFocus)}`
    ].join("\n");

    const row = {
      scope_type: "restaurant",
      scope_id: getScopeIdSafe() || restaurantId,
      restaurant_id: restaurantId,
      sender_user_id: managerId,
      receiver_user_id: managerId,
      sender_role: senderRole,
      type: "weekly_summary",
      body,
      payload: {
        kind: "weekly_summary",
        weekStart,
        topPerformer: topWaiter,
        mostImprovedSkill: prettySkillLabel(mostImproved),
        recommendedFocus: prettySkillLabel(recommendedFocus),
        reportsAnalyzed: rows.length
      },
    };

    const { data: existingRow, error: existingError } = await supabase
      .from("bc_messages_v1")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("receiver_user_id", managerId)
      .eq("type", "weekly_summary")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.warn("[WEEKLY SUMMARY] lookup failed", existingError);
      return;
    }

    if (existingRow?.id) {
      const { error: updateError } = await supabase
        .from("bc_messages_v1")
        .update(row)
        .eq("id", existingRow.id);

      if (updateError) {
        console.warn("[WEEKLY SUMMARY] update failed", updateError);
        return;
      }
    } else {
      const { error } = await supabase.from("bc_messages_v1").insert(row);
      if (error) {
        console.warn("[WEEKLY SUMMARY] insert failed", error);
        return;
      }
    }

    localStorage.setItem(sentKey, "1");
  } catch (e) {
    console.warn("[WEEKLY SUMMARY] failed", e);
  }
}

async function loadManagerBoardData(restaurantId = null, options = {}) {
  try {
    const rid = requireManagerRestaurantId(restaurantId);
    const force = !!options?.force;
    const snapshot = getParentCtxSnapshot("premium");
    const profile = snapshot.profile || {};
    const caps = getPremiumRoleCapabilities(profile);
    if (!caps.canAccessManagerBoard) throw new Error("Role cannot access manager board.");
    if (!canActOnRestaurant(profile, profile, rid)) throw new Error("Role cannot act on this restaurant.");

    setManagerActiveRestaurantId(rid);

    if (!appState.restaurant || appState.restaurant.id !== rid) {
      try { appState.restaurant = await loadRestaurant(rid); } catch {}
    }

    try {
      await refreshManagerWineOptions(rid, { force });
    } catch (error) {
      console.warn("[MB] wine cache refresh failed", error);
    }
    try {
      await loadTimedChallengeWineOptions();
    } catch (error) {
      console.warn("[MB] timed challenge wine refresh failed", error);
    }

    document.getElementById("mbMsg").textContent = "";
    safeCall("renderManagerBoardOverviewRitualStatusCard", () => renderManagerBoardOverviewRitualStatusCard?.());
    wireManagerBoardMembers();
    if (isFreshCacheEntry(managerBoardOverviewCache, MANAGER_BOARD_OVERVIEW_CACHE_MS, rid) && !force) {
      await loadManagerBoardMembers();
      safeCall("renderManagerBoardOverviewRitualStatusCard", () => renderManagerBoardOverviewRitualStatusCard?.());
      renderManagerBoardAbilityTabs();
      return;
    }
    const [weeklyRows] = await Promise.all([
      loadWeeklyTrainingReport(),
      loadManagerBoardMembers(),
      loadLeaderboard(),
    ]);
    await maybeSendWeeklyManagerSummary(weeklyRows);
    renderManagerBoardAbilityTabs();

    // Views you actually have
    const RUNS_TABLE = "bc_sessions_v1";                  // sessions summary
    const DRILLS_TABLE = "bc_messages_v1";               // drill completion messages
    const STREAK_TABLE = "bc_encounter_resolutions_v2";  // green/red source

    // -----------------------------
    // Totals
    // -----------------------------
    const [runsRes, drillsRes] = await Promise.all([
      supabase
        .from(RUNS_TABLE)
        .select("session_id", { count: "exact", head: true })
        .eq("restaurant_id", rid),
      supabase
        .from(DRILLS_TABLE)
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", rid)
        .eq("type", "drill_completed")
        .is("archived_at", null),
    ]);

    if (runsRes.error) throw runsRes.error;
    if (drillsRes.error) throw drillsRes.error;

    // -----------------------------
    // Recent activity feed
    // -----------------------------
    const [recentRuns, recentDrills] = await Promise.all([
      supabase
        .from(RUNS_TABLE)
        .select("session_start, user_id, encounters_resolved, avg_chain_score, greens, yellows, reds")
        .eq("restaurant_id", rid)
        .order("session_start", { ascending: false })
        .limit(5),
      supabase
        .from(DRILLS_TABLE)
        .select("created_at, sender_user_id, payload")
        .eq("restaurant_id", rid)
        .eq("type", "drill_completed")
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (recentRuns.error) throw recentRuns.error;
    if (recentDrills.error) throw recentDrills.error;

    const userIds = [
      ...(recentRuns.data || []).map(x => x.user_id).filter(Boolean),
      ...(recentDrills.data || []).map(x => x.sender_user_id).filter(Boolean),
    ];
    const nameMap = await mapUserIdsToNames(userIds);
    console.log("[MB] nameMap", { requested: userIds.length, resolved: nameMap.size });

    const items = [
      ...(recentRuns.data || []).map((x) => ({
        t: x.session_start,
        line: `Session • ${userLabel(x.user_id, nameMap)} • ${x.encounters_resolved ?? 0} resolved • avg chain score ${(Number(x.avg_chain_score ?? 0)).toFixed(2)} • G/Y/R ratio: ${x.greens ?? 0}/${x.yellows ?? 0}/${x.reds ?? 0}`,
      })),
      ...(recentDrills.data || []).map((x) => ({
        t: x.created_at,
        line: `Drill • ${userLabel(x.sender_user_id, nameMap)} • reps ${x.payload?.repsDone ?? "-"} / ${x.payload?.repTarget ?? "-"}`,
      })),
    ]
      .filter((i) => i.t)
      .sort((a, b) => new Date(b.t) - new Date(a.t))
      .slice(0, 8);

    // -----------------------------
    // Best streaks (computed from encounter resolutions)
    // Definition:
    // - "current streak" = consecutive greens from the most recent backwards
    // - "best streak" = max consecutive greens anywhere in recent history
    // Note: we compute from recent rows to keep it light.
    // -----------------------------
    const STREAK_LIMIT = 800; // adjust later; 800 is fine for small restaurants
    const streakRes = await supabase
      .from(STREAK_TABLE)
      .select("user_id, occurred_at, is_green")
      .eq("restaurant_id", rid)
      .order("occurred_at", { ascending: false })
      .limit(STREAK_LIMIT);

    if (streakRes.error) throw streakRes.error;

    const byUser = new Map();
    for (const row of streakRes.data || []) {
      if (!row?.user_id) continue;
      const arr = byUser.get(row.user_id) || [];
      arr.push(row);
      byUser.set(row.user_id, arr);
    }

    function computeStreaks(rowsDesc) {
      // rowsDesc: most recent first
      const sigs = rowsDesc.map((r) => !!r.is_green);

      // current: count greens from start until first non-green
      let current = 0;
      for (const s of sigs) {
        if (s) current++;
        else break;
      }

      // best: max consecutive greens anywhere
      let best = 0, run = 0;
      for (const s of sigs) {
        if (s) {
          run++;
          if (run > best) best = run;
        } else {
          run = 0;
        }
      }

      return { current, best, sampleN: sigs.length };
    }

    const streakRows = [];
    for (const [userId, rows] of byUser.entries()) {
      const { current, best, sampleN } = computeStreaks(rows);
      streakRows.push({ userId, current, best, sampleN });
    }

    streakRows.sort((a, b) => (b.best - a.best) || (b.current - a.current));
    const topStreaks = streakRows.slice(0, 5);

    const streakNameMap = await mapUserIdsToNames(topStreaks.map((x) => x.userId));

    const streakEl = document.getElementById("mbBestStreaks");
    if (streakEl) {
      streakEl.innerHTML = topStreaks.length
        ? topStreaks
            .map((x) => {
              const u = userLabel(x.userId, streakNameMap);
              return `<div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
                        <div><b>${u}</b> • best <b>${x.best}</b> • current <b>${x.current}</b></div>
                        <div style="opacity:.6; font-size:12px;">sampled last ${x.sampleN} resolves</div>
                      </div>`;
            })
            .join("")
        : `<div style="opacity:.8;">No streak data yet.</div>`;
    }

    setDebug({
      step: "managerBoard.loaded",
      restaurant_id: rid,
      runs: runsRes.count,
      drills: drillsRes.count,
      streakUsers: topStreaks.length,
    });
    managerBoardOverviewCache = { rid: String(rid), loadedAt: Date.now() };
  } catch (e) {
    console.error(e);
    document.getElementById("mbMsg").textContent = e?.message || "Failed to load manager board";
    setDebug({ step: "managerBoard.error", error: e?.message || String(e) });
  }
}

async function loadAuthedState(reason = "manual") {
  if (authedStateInflight) {
    return authedStateInflight;
  }
  if (
    !shouldBypassAuthedStateCache(reason) &&
    appState?.session?.user &&
    appState?.profile &&
    Date.now() - Number(authedStateLoadedAt || 0) < AUTHED_STATE_CACHE_MS
  ) {
    setHomeAuthUI(true);
    wireManagerBoardButton();
    wireHudSendProgressButton();
    wireWaiterMessagesPanel();
    applyRoleTemplateGates();
    renderAppChrome?.();
    return;
  }

  authedStateInflight = (async () => {
  console.log(
    "[AUTH] loadAuthedState using supabase",
    supabase.__BC_ID__,
    "storageKey",
    window.__BC_SUPABASE_STORAGE_KEY__
  );
  const { session, error: sErr } = await withTimeout(parentGetSession(), 8000, "getSession");
  if (sErr) {
    console.warn("[AUTH] getSession error", sErr);
    throw sErr;
  }

  appState.session = session || null;
  if (window.__LAST_USER_ID__ && window.__LAST_USER_ID__ !== appState.session?.user?.id) {
    destroyPremiumIframe("user_changed");
  }
  window.__LAST_USER_ID__ = appState.session?.user?.id;

  appState.profile = null;
  appState.restaurant = null;
  appState.invites = [];

  setHomeAuthUI(!!session?.user);

  if (!session?.user) {
    setDebug({ step: "authedState.none", time: new Date().toISOString(), reason });
    return;
  }

  const profile = await loadProfile(session.user.id);
  appState.profile = profile;
  await ensureProfileDisplayName();

  // ✅ Determine correct active restaurant for this scope
  try {
    const rid = await resolveInitialRestaurantForScope(profile);

    // group/enterprise uses activeRestaurantId; restaurant scope locks to profile.restaurant_id
    const scopeType = String(profile?.scope_type || "").toLowerCase();
    if (scopeType === "group" || scopeType === "enterprise") {
      appState.activeRestaurantId = rid;
    }

    if (rid) {
      appState.restaurant = await loadRestaurant(rid);
    } else {
      appState.restaurant = null;
    }
    markActiveRestaurantReady();
    hydrateStoredDifficultyForProfile();
  } catch (e) {
    console.warn("[BC] loadAuthedState: resolve/load restaurant failed", e);
    appState.restaurant = null;
  }

  if (appMode === "premium") refreshParentProgressionFromDb();
  initProgressionSpineFromState();

  setDebug({
    step: "authedState.loaded",
    time: new Date().toISOString(),
    reason,
    user: { id: session.user.id, email: session.user.email },
    profile,
    activeRestaurantId: appState.activeRestaurantId || null,
    restaurant: appState.restaurant ? { id: appState.restaurant.id, name: appState.restaurant.name, code: appState.restaurant.code } : null,
  });

  console.log("[BC] active restaurant resolved", {
    scope_type: appState.profile?.scope_type,
    scope_id: appState.profile?.scope_id,
    activeRestaurantId: appState.activeRestaurantId,
    restaurant: appState.restaurant?.id
  });

  wireManagerBoardButton();
  wireHudSendProgressButton();
  wireWaiterMessagesPanel();
  applyRoleTemplateGates();
  renderAppChrome?.();

  // (ctx push removed here; only iframe onload + bc_ctx_request reply are allowed)
  authedStateLoadedAt = Date.now();
  })();

  try {
    await authedStateInflight;
  } finally {
    authedStateInflight = null;
  }
}

// ------------------------------------------------------------
// Tabs
// ------------------------------------------------------------
function setRole(role) {
  // UI uses a simplified waiter/manager choice.
  // Runtime premium role for manager signup maps to single_manager.
  uiState.role = String(role || "").trim().toLowerCase() === "manager" ? "manager" : "waiter";
  const roleTabs = document.getElementById("roleTabs");
  const w = document.getElementById("tabRoleWaiter");
  const m = document.getElementById("tabRoleManager");
  if (roleTabs) {
    roleTabs.dataset.selected = uiState.role;
    roleTabs.style.setProperty("--selector-x", uiState.role === "manager" ? "calc(100% + 8px)" : "0px");
  }
  if (uiState.role === "waiter") {
    w.classList.add("active");
    m.classList.remove("active");
  } else {
    m.classList.add("active");
    w.classList.remove("active");
  }
  if (uiState.role === "manager" && !uiState.managerPackage) {
    uiState.managerPackage = "single_manager";
  }
  updateAuthSignupUI();
}

function setMode(mode) {
  uiState.mode = mode === "signup" ? "signup" : "login";
  const modeTabs = document.getElementById("modeTabs");
  const roleTabsWrap = document.getElementById("roleTabsWrap");
  const l = document.getElementById("tabModeLogin");
  const s = document.getElementById("tabModeSignup");
  if (modeTabs) {
    modeTabs.dataset.selected = uiState.mode;
    modeTabs.style.setProperty("--selector-x", uiState.mode === "signup" ? "calc(100% + 8px)" : "0px");
  }
  if (uiState.mode === "login") {
    l.classList.add("active");
    s.classList.remove("active");
  } else {
    s.classList.add("active");
    l.classList.remove("active");
  }

  const wrap = document.getElementById("displayNameWrap");
  if (uiState.mode === "signup") {
    if (roleTabsWrap) roleTabsWrap.classList.remove("hidden");
    setRole("waiter");
    wrap.classList.remove("hidden");
  } else {
    if (roleTabsWrap) roleTabsWrap.classList.add("hidden");
    setRole("waiter");
    wrap.classList.add("hidden");
  }
  updateAuthSignupUI();
}

function setManagerPackage(pkg) {
  const next = ["single_manager", "group_manager", "enterpriser"].includes(String(pkg || "").trim().toLowerCase())
    ? String(pkg).trim().toLowerCase()
    : "single_manager";
  uiState.managerPackage = next;
  const tabs = document.getElementById("managerPackageTabs");
  const single = document.getElementById("tabManagerSingle");
  const group = document.getElementById("tabManagerGroup");
  const enterprise = document.getElementById("tabManagerEnterprise");
  if (tabs) tabs.dataset.selected = next;
  single?.classList.toggle("active", next === "single_manager");
  group?.classList.toggle("active", next === "group_manager");
  enterprise?.classList.toggle("active", next === "enterpriser");
  updateAuthSignupUI();
}

function setSeatPlan(plan) {
  const next = ["15", "30", "60"].includes(String(plan || "")) ? String(plan) : "15";
  uiState.seatPlan = next;
  const tabs = document.getElementById("seatPlanTabs");
  const s15 = document.getElementById("tabSeat15");
  const s30 = document.getElementById("tabSeat30");
  const s60 = document.getElementById("tabSeat60");
  if (tabs) tabs.dataset.selected = next;
  s15?.classList.toggle("active", next === "15");
  s30?.classList.toggle("active", next === "30");
  s60?.classList.toggle("active", next === "60");
}

function setRestaurantCount(count) {
  const next = ["3", "5", "7", "10"].includes(String(count || "")) ? String(count) : "3";
  uiState.restaurantCount = next;
  const tabs = document.getElementById("restaurantCountTabs");
  const r3 = document.getElementById("tabRestaurant3");
  const r5 = document.getElementById("tabRestaurant5");
  const r7 = document.getElementById("tabRestaurant7");
  const r10 = document.getElementById("tabRestaurant10");
  if (tabs) tabs.dataset.selected = next;
  r3?.classList.toggle("active", next === "3");
  r5?.classList.toggle("active", next === "5");
  r7?.classList.toggle("active", next === "7");
  r10?.classList.toggle("active", next === "10");
}

function updateAuthSignupUI() {
  const isSignup = uiState.mode === "signup";
  const isManagerSignup = isSignup && uiState.role === "manager";
  const premiumIntentBlock = document.getElementById("premiumIntentBlock");
  const signupContactBlock = document.getElementById("signupContactBlock");
  const managerSignupConfig = document.getElementById("managerSignupConfig");
  const premiumRestaurantNameWrap = document.getElementById("premiumRestaurantNameWrap");
  const restaurantCountWrap = document.getElementById("restaurantCountWrap");
  const showRestaurantCount =
    isManagerSignup &&
    (uiState.managerPackage === "group_manager" || uiState.managerPackage === "enterpriser");

  if (premiumIntentBlock) premiumIntentBlock.classList.toggle("hidden", authIntent !== "premium");
  if (signupContactBlock) signupContactBlock.classList.toggle("hidden", !isSignup);
  if (managerSignupConfig) managerSignupConfig.classList.toggle("hidden", !isManagerSignup);
  if (premiumRestaurantNameWrap) {
    premiumRestaurantNameWrap.classList.toggle("hidden", !(isManagerSignup && uiState.managerPackage === "single_manager"));
  }
  if (restaurantCountWrap) {
    restaurantCountWrap.classList.toggle("hidden", !showRestaurantCount);
  }
}

// ------------------------------------------------------------
// Demo join block
// ------------------------------------------------------------
function renderDemoJoinBlock() {
  const badge = document.getElementById("demoAuthedBadge");
  const joinBlock = document.getElementById("demoJoinBlock");

  const isAuthed = !!appState.session?.user;
  if (badge) (isAuthed ? badge.classList.remove("hidden") : badge.classList.add("hidden"));
  if (joinBlock) joinBlock.classList.add("hidden");
}

function getDemoJoinState() {
  const isAuthed = !!appState.session?.user;
  const role = String(appState.profile?.role || "").toLowerCase();
  const hasRestaurant = !!appState.profile?.restaurant_id;
  return {
    isAuthed,
    role,
    hasRestaurant,
    canJoin: isAuthed && role === "waiter" && !hasRestaurant,
  };
}

async function submitDemoJoinRestaurantCode(rawCode) {
  const code = normCode(rawCode);
  if (!code) throw new Error("Enter a join code.");

  await loadAuthedState("demo.join.precheck");
  if (!appState.session?.user) throw new Error("Login as a waiter first.");
  if (String(appState.profile?.role || "").toLowerCase() !== "waiter") {
    throw new Error("Join-by-code is for waiter accounts.");
  }
  if (appState.profile?.restaurant_id) throw new Error("You are already assigned to a restaurant.");

  setDebug({ step: "demo.join.start", time: new Date().toISOString(), code });

  const sb = window.supabase || supabase;
  const rpc = await withTimeout(
    sb.rpc("join_restaurant_by_code", { p_code: code }),
    15000,
    "rpc.join_restaurant_by_code"
  );

  if (rpc.error) throw rpc.error;

  if (!rpc.data?.ok) {
    const err = rpc.data?.error || "unknown";
    if (err === "invalid_code") throw new Error("Invalid join code.");
    if (err === "seat_limit_reached") throw new Error("Seat limit reached for this restaurant.");
    if (err === "invite_required") throw new Error("Invite required. Ask your manager to add your email.");
    if (err === "already_in_restaurant") throw new Error("You are already assigned to a restaurant.");
    throw new Error("Join failed.");
  }

  setDebug({ step: "demo.join.ok", time: new Date().toISOString(), restaurant_id: rpc.data.restaurant_id });

  await loadAuthedState("demo.join.refresh");
  await ensureProfileDisplayName();
  renderDemoJoinBlock();

  if (appState.profile?.restaurant_id) {
    await decideRoute("demo.join.auto");
  }

  return {
    ok: true,
    restaurantId: rpc.data.restaurant_id || null,
    message: "Success ✅ Premium unlocked.",
  };
}

async function demoJoinRestaurantByCode(rawCode) {
  try {
    clearMsgs();
    setMsg("demoJoinMsg", "Submitting...");
    const inputCode = typeof rawCode === "string" ? rawCode : document.getElementById("demoJoinCode")?.value;
    const result = await submitDemoJoinRestaurantCode(inputCode);
    setMsg("demoJoinMsg", result.message || "Success ✅ Premium unlocked.", "success");
  } catch (e) {
    console.error(e);
    setMsg("demoJoinMsg", e?.message || "Join failed", "error");
    setDebug({ step: "demo.join.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
}

window.__BC_DEMO_JOIN_API__ = {
  getState: getDemoJoinState,
  submit: submitDemoJoinRestaurantCode,
};

// ------------------------------------------------------------
// Routing rules (restaurant-first)
// ------------------------------------------------------------
let authRouteTimer = null;
let __BC_LAST_ROUTE_KEY__ = "";
let __BC_ROUTE_INFLIGHT__ = false;
window.__BC_LOGOUT_INFLIGHT__ = false;
window.__BC_LOGOUT_LAST_AT__ = 0;
window.__BC_LOGGING_OUT__ = false;

function isLoggingOut() {
  return window.__BC_LOGGING_OUT__ === true;
}

function isHardLoggedOut() {
  return !!window.__BC_LOGGING_OUT__ || !appState?.session;
}

function hardResetUI(reason = "") {
  console.log("[LOGOUT] hardResetUI", reason);

  window.__BC_PENDING_START_DRILL__ = null;
  window.BC_PENDING_START_DRILL = null;

  try {
    const prem = document.getElementById("premiumRoot");
    if (prem) prem.innerHTML = "";
  } catch {}

  try {
    const demo = document.getElementById("gameRootDemo");
    if (demo) demo.innerHTML = "";
  } catch {}

  try { document.getElementById("premiumRootFrame")?.remove(); } catch {}
  try { document.getElementById("gameRootDemoFrame")?.remove(); } catch {}

  try { appState.session = null; } catch {}
  try { appState.profile = null; } catch {}
  try { appMode = "public"; } catch {}

  try { showScreen("screenHome"); } catch {}

  try {
    const u = new URL(window.location.href);
    u.searchParams.delete("mode");
    u.searchParams.delete("demo");
    replaceUrlKeepingV2Demo(u);
  } catch {}

  try {
    const btn = document.getElementById("btnLogout");
    if (btn) btn.style.display = "none";
  } catch {}
}

async function routeDemo(reason = "manual") {
  clearMsgs();
  closeHud(); // ✅ prevent overlay stealing clicks

  const was = appMode;
  appMode = "demo";
  const useV2Harness = true;
  document.documentElement.dataset.bcV2Demo = "true";
  persistV2DemoRequest();

  try {
    await loadAuthedState(`routeDemo:${reason}`);
  } catch {}

  const p = appState?.profile;
  const isPremium = String(p?.access_tier || "").toLowerCase().startsWith("premium");
  if (isPremium && !useV2Harness) {
    console.log("[BC] premium user -> skipping demo mount ✅");
    return;
  }

  if (isV2DemoPlayActive()) {
    showScreen("screenGameDemo");
    renderDemoJoinBlock();
    document.getElementById("btnDemoPremium")?.classList.add("hidden");
    document.getElementById("btnDemoExit")?.classList.add("hidden");
    destroyPremiumIframe("routeDemo:v2_play_active");
    setDebug({
      step: "route.demo.remount_suppressed",
      reason,
      time: new Date().toISOString(),
      lastScreen: window.__BC_DEMO_IFRAME_LAST_SCREEN__ || null,
    });
    return;
  }

  if (was !== "demo") forceRemountForModeSwitch("demo");

  setDebug({ step: "route.demo", time: new Date().toISOString(), reason, authed: !!appState.session?.user });
  showScreen("screenGameDemo");
  renderDemoJoinBlock();
  document.getElementById("btnDemoPremium")?.classList.add("hidden");
  document.getElementById("btnDemoExit")?.classList.add("hidden");
  destroyPremiumIframe("routeDemo");
  destroyDemoIframe("routeDemo:remount");
  const isMobileDemo = document.documentElement?.dataset?.bcMobileEnv === "true";
  if (isMobileDemo) {
    openMobileDemoCockpit("route_demo_mobile");
    return;
  }
  mountGameIframe("gameRootDemo", "demo", {
    initialScreen: "screenWelcome",
    v2Harness: useV2Harness,
  });
}

async function routePremium(reason = "manual") {
  if (isHardLoggedOut()) {
    console.warn("[BC] routePremium blocked: hard logged out");
    return;
  }
  const now = Date.now();
  if (routingLock) return;
  if (now - lastRouteAt < 250) return;
  lastRouteAt = now;
  routingLock = true;

  const was = appMode;

  try {
    if (isHardLoggedOut()) return;
    clearMsgs();
    void preloadEncounterCatalog();
    await loadAuthedState(`routePremium:${reason}`);
    if (isHardLoggedOut()) return;
    await initRestaurantContextAfterAuth();
    if (isHardLoggedOut()) return;

    if (!appState.session?.user) {
      closeHud();
      showScreen("screenHome");
      setMsg("authMsg", "Login first, then press Premium.", "error");
      return;
    }

    const profile = appState.profile;

    // ✅ HARD RULE: restaurant membership routes to premium always (do not block on access_tier)
    if (profile?.restaurant_id) {
      if (isManagerRole(profile?.role) && appState.restaurant?.id) {
        try {
          appState.invites = await loadInvites(getManagerActiveRestaurantId());
          setManagerBoardInvites(appState.invites);
        } catch {
          appState.invites = [];
          setManagerBoardInvites([]);
        }
      } else {
        appState.invites = [];
      }

      renderHud();
      appMode = "premium";

      if (was !== "premium") forceRemountForModeSwitch("premium");

      unmountDemoGame("decideRoute:restaurant-member->premium");
      showScreen("screenPremiumApp");
      const p = appState?.profile;
      const isPremium = String(p?.access_tier || "").toLowerCase().startsWith("premium");
      const scopeType = String(p?.scope_type || "").toLowerCase();
      const isGroupOrEnterprise = scopeType === "group" || scopeType === "enterprise";
      const needsPicker = isGroupOrEnterprise && !appState.activeRestaurantId;

      if (isPremium && needsPicker) {
        console.log("[BC] scope manager needs active restaurant -> Manager Board");
        showScreen("screenManagerBoard");
        return;
      }
      wireParentButtons();
      refreshParentProgressionUI();
      return;
    }

    // No restaurant: entitlement rules (first50/pass etc.) may still allow premium
    const entitlement = canAccessPremium(profile);

    if (!entitlement.ok) {
      await routeDemo(`premium.block.${entitlement.reason}`);
      setMsg(
        "demoJoinMsg",
        "Premium is locked. Join a restaurant to unlock Premium. You can keep playing Demo.",
        "error"
      );
      return;
    }

    // Manager without restaurant -> create it
    if (isManagerRole(profile?.role) && !profile?.restaurant_id) {
      appMode = "premium";
      closeHud();
      showScreen("screenCreateRestaurant");
      return;
    }

    renderHud();
    appMode = "premium";

    if (was !== "premium") forceRemountForModeSwitch("premium");

    unmountDemoGame("decideRoute:premium-entitled");
    showScreen("screenPremiumApp");
    wireParentButtons();
    const p = appState?.profile;
    const isPremium = String(p?.access_tier || "").toLowerCase().startsWith("premium");
    const scopeType = String(p?.scope_type || "").toLowerCase();
    const isGroupOrEnterprise = scopeType === "group" || scopeType === "enterprise";
    const needsPicker = isGroupOrEnterprise && !appState.activeRestaurantId;

    if (isPremium && needsPicker) {
      console.log("[BC] scope manager needs active restaurant -> Manager Board");
      showScreen("screenManagerBoard");
      return;
    }
    refreshParentProgressionUI();
  } catch (e) {
    console.error(e);
    setDebug({ step: "premium.route.crash", time: new Date().toISOString(), error: e.message || String(e) });
    closeHud();
    showScreen("screenHome");
    setMsg("authMsg", "Premium routing failed — check debug panel.", "error");
  } finally {
    routingLock = false;
  }
}

async function routeManagerBoard(reason = "manual") {
  clearMsgs();
  closeHud();

  await loadAuthedState(`routeManagerBoard:${reason}`);

  const caps = getPremiumRoleCapabilities(appState.profile);
  if (!caps.canAccessManagerBoard) {
    setDebug({
      step: "managerBoard.blocked",
      reason,
      role: normalizeMembershipRole(appState.profile) || null
    });
    setMsg("authMsg", "Manager Board is manager-only.", "error");
    showScreen("screenPremiumApp");
    return;
  }

  const fallbackRestaurantId =
    window.__BC_ACTIVE_MANAGER_RESTAURANT_ID__ ||
    appState?.restaurant?.id ||
    appState?.profile?.restaurant_id ||
    appState?.profile?.restaurantId ||
    null;

  if (fallbackRestaurantId) {
    setManagerActiveRestaurantId(fallbackRestaurantId);
  }

  await ensureManagerRestaurantChoices?.();
  renderManagerRestaurantPicker?.();
  wireManagerRestaurantPicker?.();

  unmountDemoGame("routeManagerBoard");

  // ✅ respect nav-passed tab (from iframe) if set
  window.__BC_MB_DEFAULTTAB__ = window.__BC_MB_DEFAULTTAB__ || "overview";

  showScreen("screenManagerBoard");
  applyManagerBoardVisibility();
  wireManagerBoardMenu();
  wireGroupSetupRedeem();

  await ensureActiveRestaurantReady();

  resetManagerBoardScopedState();
  resetManagerMessengerState({ keepStatus: true });
  const rid = requireManagerRestaurantId();

  // ✅ load the selected tab without requiring a click
  window.__BC_MB_SHOWTAB__?.(window.__BC_MB_DEFAULTTAB__);
  await (window.__BC_MB_LOADTAB__?.(window.__BC_MB_DEFAULTTAB__) || loadManagerBoardData(rid));
  await refreshManagerBoardScopedViews?.(rid);

  wireManagerBoardMessenger();
  wireManagerBoardBillingAccess();
}

async function routeProfilePerformanceLeaderboard(reason = "profile_leaderboard") {
  clearMsgs();
  closeHud();

  await loadAuthedState(`routeProfilePerformanceLeaderboard:${reason}`);

  const profile = appState?.profile || {};
  const membershipRole = String(normalizeMembershipRole(profile) || "").toLowerCase();
  const restaurantId =
    getManagerActiveRestaurantId() ||
    appState?.activeRestaurantId ||
    appState?.restaurant?.id ||
    profile?.restaurant_id ||
    profile?.restaurantId ||
    null;

  if (!restaurantId) {
    setMsg("authMsg", "No restaurant is attached to this profile yet.", "error");
    return;
  }

  setManagerActiveRestaurantId(restaurantId);

  try {
    const restaurant = await loadRestaurant(restaurantId);
    if (restaurant) appState.restaurant = restaurant;
  } catch (error) {
    console.warn("[PROFILE] loadRestaurant for leaderboard failed", error);
  }

  window.__BC_MB_DEFAULTTAB__ = "performance";

  if (membershipRole === "waiter") {
    await openWaiterLeaderboardWindow();
    return;
  }

  await routeManagerBoard(reason);
}

function isAuthed() {
  return !!window.appState?.session;
}

function routeDemoShellNoAuth() {
  console.log("[ROUTE] demo (no auth)");
  appMode = "demo";
  const useV2Harness = true;
  document.documentElement.dataset.bcV2Demo = "true";
  persistV2DemoRequest();
  showScreen("screenGameDemo");
  setPremiumOverlayActive(false);
  destroyPremiumIframe("routeDemoShellNoAuth");
  window.__BC_DRILL_CONFIG__ = null;
  window.BC_DRILL_CONFIG = null;
  setPendingStartDrill(null);
  destroyDemoIframe("routeDemoShellNoAuth:pre");
  document.getElementById("btnDemoPremium")?.classList.add("hidden");
  document.getElementById("btnDemoExit")?.classList.add("hidden");
  const isMobileDemo = document.documentElement?.dataset?.bcMobileEnv === "true";
  if (isMobileDemo) {
    openMobileDemoCockpit("route_demo_shell_mobile");
    return;
  }
  mountGameIframe("gameRootDemo", "demo", {
    initialScreen: "screenWelcome",
    v2Harness: useV2Harness,
  });
}

function routeAuth() {
  console.log("[ROUTE] auth (no user)");
  destroyPremiumIframe("routeAuth");
  destroyDemoIframe("routeAuth");
  setPremiumOverlayActive(false);

  window.__BC_DRILL_CONFIG__ = null;
  window.BC_DRILL_CONFIG = null;
  setPendingStartDrill(null);

  closeHud();
  clearMsgs();
  setHomeAuthUI(false);
  setMode("login");
  setAuthIntent("login");
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("demo");
    url.searchParams.delete("mode");
    replaceUrlKeepingV2Demo(url);
  } catch {}
  showScreen("screenHome");
  hardResetAuthUI();
}

function routeHomeShell(reason = "home_shell", message = "") {
  console.log("[ROUTE] home shell", { reason, authed: !!appState?.session?.user });
  destroyPremiumIframe(`routeHomeShell:${reason}`);
  destroyDemoIframe(`routeHomeShell:${reason}`);
  setPremiumOverlayActive(false);

  window.__BC_DRILL_CONFIG__ = null;
  window.BC_DRILL_CONFIG = null;
  setPendingStartDrill(null);

  closeHud();
  clearMsgs();
  setMode("login");
  setAuthIntent("login");
  showScreen("screenHome");
  hardResetAuthUI();

  if (message) setMsg("authMsg", message, "normal");
}

async function decideRoute(reason = "decideRoute") {
  if (isLoggingOut()) {
    console.warn("[BC] decideRoute blocked (logging out)", reason);
    return;
  }

  clearMsgs();

  try {
    await loadAuthedState(reason);
    if (isHardLoggedOut()) return;
    await initRestaurantContextAfterAuth();
    if (isHardLoggedOut()) return;

    // 1) Logged out => Demo shell by default
    if (!isAuthed()) {
      appMode = "demo";
      if (window.__BC_FORCE_AUTH__) {
        window.__BC_FORCE_AUTH__ = false;
        routeAuth();
        setDebug({ step: "decideRoute.logged_out.force_auth", time: new Date().toISOString(), reason });
        return;
      }
      routeDemoShellNoAuth();
      setDebug({ step: "decideRoute.logged_out.demo_shell", time: new Date().toISOString(), reason });
      return;
    }

    // Mobile demo must stay in the V2 demo harness after sign-in.
    if (isV2DemoRequested() || isMobileDemoSurfaceActive()) {
      await routeDemo(`decideRoute.v2_demo_requested:${reason}`);
      return;
    }

    // 2) HARD RULE: restaurant membership => Premium always
    if (appState.profile?.restaurant_id) {
      setAuthIntent("premium");
      await routePremium(`decideRoute.restaurant:${reason}`);
      return;
    }

    // 3) No restaurant:
    // - standard demo users should go straight into Demo
    // - premium-capable users can stay on the parent shell for setup
    const entitlement = canAccessPremium(appState.profile || {});
    if (!entitlement.ok) {
      await routeDemo(`decideRoute.no_restaurant.demo:${reason}`);
      return;
    }

    routeHomeShell(
      `decideRoute.no_restaurant:${reason}`,
      "Finish login or Premium setup on the parent screen before entering the game."
    );
  } catch (e) {
    console.error(e);
    closeHud();
    showScreen("screenHome");
    setDebug({
      step: "decideRoute.error",
      time: new Date().toISOString(),
      reason,
      error: e?.message || String(e),
    });
  }
}

function getRouteKey() {
  const s = window.appState || {};
  const userId = s.session?.user?.id || "";
  const role = s.profile?.role || "";
  const rest = window.getActiveRestaurantId?.() || s.profile?.restaurant_id || "";
  return [userId, role, rest].join("|");
}

async function decideRouteGuarded(reason = "") {
  if (__BC_ROUTE_INFLIGHT__) return;
  const key = getRouteKey();

  if (key && key === __BC_LAST_ROUTE_KEY__) return;

  __BC_LAST_ROUTE_KEY__ = key;
  __BC_ROUTE_INFLIGHT__ = true;
  try {
    await decideRoute(reason);
  } finally {
    __BC_ROUTE_INFLIGHT__ = false;
  }
}

// ------------------------------------------------------------
// HUD
// ------------------------------------------------------------
function renderInvitesList() {
  const invites = getManagerBoardInvites();
  ["invitesList", "mbInvitesList"].forEach((targetId) => {
    const el = document.getElementById(targetId);
    if (!el) return;

    if (!invites.length) {
      el.innerHTML = `<div style="opacity:.8;">No waiters added yet.</div>`;
      return;
    }

    el.innerHTML = invites
      .map((i) => {
        const status = i.status;
        const email = i.email;
        const meta = status === "accepted" ? "accepted" : status === "revoked" ? "revoked" : "pending";

        const btn =
          status === "revoked"
            ? `<button data-action="reinvite" data-email="${email}" style="font-size:12px;">Re-add</button>`
            : `<button data-action="revoke" data-email="${email}" style="font-size:12px;">Remove</button>`;

        return `
          <div style="display:flex; justify-content:space-between; gap:10px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
            <div style="min-width:0;">
              <div style="font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${email}</div>
              <div style="font-size:12px; opacity:.75;">${meta}</div>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
              ${btn}
            </div>
          </div>
        `;
      })
      .join("");

    el.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const action = btn.getAttribute("data-action");
        const email = btn.getAttribute("data-email");
        if (!email) return;
        if (action === "revoke") await adminRevokeInvite(email);
        if (action === "reinvite") await adminAddInvite(email);
      });
    });
  });
}

function renderManagerBoardInviteSummary() {
  const root = document.getElementById("mbInviteSummary");
  if (!root) return;

  const rows = getManagerBoardInvites();
  const pending = rows.filter((x) => String(x?.status || "") === "pending").length;
  const accepted = rows.filter((x) => String(x?.status || "") === "accepted").length;

  root.innerHTML = `
    <div class="card" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
      <div style="font-weight:600;">Invites</div>
      <div><b>Pending invites:</b> ${pending}</div>
      <div style="margin-top:4px;"><b>Accepted invites:</b> ${accepted}</div>
    </div>
  `;
}

async function refreshManagerBoardScopedViews(restaurantId = null) {
  const rid = requireManagerRestaurantId(restaurantId);

  const invites = await loadInvites(rid);
  setManagerBoardInvites(invites);
  appState.invites = invites;

  await loadManagerMessenger(rid);
  refreshManagerRuntimeSurfaces?.({
    thread: true,
    board: true,
    economy: false,
    liveControls: false,
    challengeMeta: true,
  });

  const profile = appState?.profile || {};
  const caps = getPremiumRoleCapabilities(profile);

  if (caps.canManageMultipleRestaurants) {
    try {
      const metrics = await loadGroupManagerMetrics();
      setGroupManagerMetrics(metrics);
    } catch (e) {
      console.warn("[MB] loadGroupManagerMetrics failed", e);
      setGroupManagerMetrics(null);
    }

    try {
      const comparisonRows = await loadGroupManagerRestaurantComparisonRows();
      setGroupRestaurantComparisonRows(comparisonRows);
    } catch (e) {
      console.warn("[MB] loadGroupManagerRestaurantComparisonRows failed", e);
      setGroupRestaurantComparisonRows([]);
    }
  } else {
    setGroupManagerMetrics(null);
    setGroupRestaurantComparisonRows([]);
  }

  renderManagerRestaurantPicker?.();
  renderManagerRestaurantContextCard?.();
  safeCall("renderGroupOverviewCard", () => renderGroupOverviewCard?.());
  safeCall("renderGroupRestaurantComparisonCard", () => renderGroupRestaurantComparisonCard?.());
  safeCall("wireGroupRestaurantComparisonCard", () => wireGroupRestaurantComparisonCard?.());
  safeCall("renderManagerPeopleSummary", () => renderManagerPeopleSummary?.());
  safeCall("renderInvitesList", () => renderInvitesList?.());
  safeCall("renderManagerBoardInviteSummary", () => renderManagerBoardInviteSummary?.());
  safeCall("renderManagerBoardOverviewLiveEffects", () => renderManagerBoardOverviewLiveEffects?.());
  safeCall("renderManagerLiveEffectsPanels", () => renderManagerLiveEffectsPanels?.());
  safeCall("pushLiveEffectsToGame", () => pushLiveEffectsToGame?.());
  safeCall("renderTimedChallengeRecentSummary", () => renderTimedChallengeRecentSummary?.());
  renderManagerLiveControlPanels?.();
  renderProfileScreen?.();
  renderHud?.();
}

async function loadHudSkillSnapshot() {
  const ctx = getHudActorContext();
  if (!ctx.userId || !ctx.restaurantId) {
    return {
      read: 0,
      framing: 0,
      delivery: 0,
      recovery: 0,
      closing: 0,
    };
  }

  const { data, error } = await supabase
    .from("bc_skill_snapshots_v1")
    .select(`
      read_pct,
      framing_pct,
      delivery_pct,
      recovery_pct,
      closing_pct,
      created_at
    `)
    .eq("user_id", ctx.userId)
    .eq("restaurant_id", ctx.restaurantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      read: 0,
      framing: 0,
      delivery: 0,
      recovery: 0,
      closing: 0,
    };
  }

  return {
    read: Number(data.read_pct || 0),
    framing: Number(data.framing_pct || 0),
    delivery: Number(data.delivery_pct || 0),
    recovery: Number(data.recovery_pct || 0),
    closing: Number(data.closing_pct || 0),
  };
}

async function loadProfileSkillShape() {
  const ctx = getHudActorContext();
  if (!ctx.userId || !ctx.restaurantId) {
    return {
      read: 0,
      framing: 0,
      delivery: 0,
      recovery: 0,
      closing: 0,
    };
  }

  const { data, error } = await supabase
    .from("bc_skill_snapshots_v1")
    .select(`
      read_pct,
      framing_pct,
      delivery_pct,
      recovery_pct,
      closing_pct,
      created_at
    `)
    .eq("user_id", ctx.userId)
    .eq("restaurant_id", ctx.restaurantId)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error || !Array.isArray(data) || !data.length) {
    return {
      read: 0,
      framing: 0,
      delivery: 0,
      recovery: 0,
      closing: 0,
    };
  }

  return averageSkillShape(data);
}

async function renderHudSkillDashboard() {
    const snap = await loadProfileSkillShape();

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = `${value}%`;
  };

  setText("hudSkillRead", snap.read ?? 0);
  setText("hudSkillFraming", snap.framing ?? 0);
  setText("hudSkillDelivery", snap.delivery ?? 0);
  setText("hudSkillRecovery", snap.recovery ?? 0);
  setText("hudSkillClosing", snap.closing ?? 0);

  const entries = [
    { key: "read", label: "Reading", val: snap.read ?? 0 },
    { key: "framing", label: "Framing", val: snap.framing ?? 0 },
    { key: "delivery", label: "Delivery", val: snap.delivery ?? 0 },
    { key: "recovery", label: "Recovery", val: snap.recovery ?? 0 },
    { key: "closing", label: "Closing", val: snap.closing ?? 0 },
  ].sort((a, b) => b.val - a.val);

  const strongest = entries[0];
  const weakest = entries[entries.length - 1];

  const summary = document.getElementById("hudSkillSummary");
  if (summary) {
    summary.textContent = `Strongest: ${strongest.label} (${strongest.val}%) • Needs work: ${weakest.label} (${weakest.val}%)`;
  }

  const canvas = document.getElementById("hudSkillRadar");
  if (canvas && typeof drawSkillRadar === "function") {
    drawSkillRadar(canvas, snap);
  }

  loadHudSkillTimeline();
}

function getCurrentDifficultyLabel() {
  const raw =
    appState?.difficulty ??
    null;

  if (raw == null) return "Medium";

  const n = Number(raw);
  if (n <= 1) return "Easy";
  if (n >= 3) return "Hard";
  return "Medium";
}

function getCurrentDifficultyValue() {
  const raw =
    appState?.difficulty ??
    null;

  if (raw == null) return 2;

  const n = Number(raw);
  if (n <= 1) return 1;
  if (n >= 3) return 3;
  return 2;
}

function setCurrentDifficultyValue(nextValue) {
  const n = Number(nextValue);
  const difficulty = n <= 1 ? 1 : n >= 3 ? 3 : 2;

  appState.difficulty = difficulty;
  try {
    setStoredDifficultyValue(
      appState?.profile?.user_id || appState?.session?.user?.id || null,
      getManagerActiveRestaurantId?.() || appState?.activeRestaurantId || appState?.restaurant?.id || appState?.profile?.restaurant_id || null,
      difficulty
    );
  } catch {}

  try {
    postToGame?.("difficulty_set", { difficulty });
  } catch (e) {
    console.warn("[HUD] difficulty post failed", e);
  }

  renderHudDifficultyControls?.();
  renderManagerGameplayAdjustmentsPanel?.();
}

function renderHudDifficultyControls() {
  const easyBtn = document.getElementById("btnDifficultyEasy");
  const mediumBtn = document.getElementById("btnDifficultyMedium");
  const hardBtn = document.getElementById("btnDifficultyHard");
  const status = document.getElementById("hudDifficultyStatus");

  const current = getCurrentDifficultyValue();

  if (easyBtn) easyBtn.classList.toggle("active", current === 1);
  if (mediumBtn) mediumBtn.classList.toggle("active", current === 2);
  if (hardBtn) hardBtn.classList.toggle("active", current === 3);

  if (status) {
    status.textContent = `Current: ${getCurrentDifficultyLabel()}`;
  }
}

function wireHudDifficultyControls() {
  const easyBtn = document.getElementById("btnDifficultyEasy");
  if (easyBtn && !easyBtn.__wired) {
    easyBtn.__wired = true;
    easyBtn.addEventListener("click", () => setCurrentDifficultyValue(1));
  }

  const mediumBtn = document.getElementById("btnDifficultyMedium");
  if (mediumBtn && !mediumBtn.__wired) {
    mediumBtn.__wired = true;
    mediumBtn.addEventListener("click", () => setCurrentDifficultyValue(2));
  }

  const hardBtn = document.getElementById("btnDifficultyHard");
  if (hardBtn && !hardBtn.__wired) {
    hardBtn.__wired = true;
    hardBtn.addEventListener("click", () => setCurrentDifficultyValue(3));
  }
}

async function loadHudSkillTimeline() {
  const ctx = getHudActorContext();
  const targetUserId = getHudTimelineTargetUserId();
  const restaurantId = ctx.restaurantId || null;

  if (!targetUserId || !restaurantId) return;

  const { data, error } = await supabase
    .from("bc_skill_snapshots_v1")
    .select(`
      created_at,
      read_pct,
      framing_pct,
      delivery_pct,
      recovery_pct,
      closing_pct
    `)
    .eq("user_id", targetUserId)
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.warn("[HUD TIMELINE]", error);
    return;
  }

  renderHudTimeline(data || []);
}

async function renderHudTimelineUserSelect() {
  const select = document.getElementById("hudTimelineUserSelect");
  const title = document.getElementById("hudTimelineTitle");
  if (!select) return;

  const profile = appState.profile || {};
  const normalizedRole = String(normalizeMembershipRole(profile) || "").toLowerCase();
  const isManagerLike =
    normalizedRole === "single_manager" ||
    normalizedRole === "group_manager" ||
    normalizedRole === "enterpriser";

  if (!isManagerLike) {
    select.classList.add("hidden");
    select.style.display = "none";
    if (title) title.textContent = "Recent Progress";
    return;
  }

  const activeRestaurantId = getManagerActiveRestaurantId?.() || appState?.restaurant?.id || null;
  if (!activeRestaurantId) {
    select.classList.add("hidden");
    select.style.display = "none";
    if (title) title.textContent = "Recent Progress";
    return;
  }

  const currentUserId = getHudActorContext().userId || null;
  const currentProfile = appState.profile || {};

  const [profilesRes, snapshotsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, display_name, role")
      .eq("restaurant_id", activeRestaurantId)
      .order("display_name", { ascending: true }),
    supabase
      .from("bc_skill_snapshots_v1")
      .select("user_id, created_at")
      .eq("restaurant_id", activeRestaurantId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (profilesRes.error) {
    console.warn("[HUD TIMELINE SELECT]", profilesRes.error);
    select.classList.add("hidden");
    select.style.display = "none";
    if (title) title.textContent = "Recent Progress";
    return;
  }

  if (snapshotsRes.error) {
    console.warn("[HUD TIMELINE SELECT][SNAPSHOTS]", snapshotsRes.error);
  }

  const profileRows = Array.isArray(profilesRes.data) ? profilesRes.data : [];
  const snapshotRows = Array.isArray(snapshotsRes.data) ? snapshotsRes.data : [];
  const optionMap = new Map();

  for (const row of profileRows) {
    const role = String(row?.role || "").toLowerCase();
    if (role === "demo") continue;
    const uid = String(row?.user_id || "");
    if (!uid) continue;
    optionMap.set(uid, {
      uid,
      label: row?.display_name || uid,
    });
  }

  for (const row of snapshotRows) {
    const uid = String(row?.user_id || "");
    if (!uid || optionMap.has(uid)) continue;
    optionMap.set(uid, { uid, label: uid });
  }

  const currentRole = String(normalizeMembershipRole(currentProfile) || currentProfile?.role || "").toLowerCase();
  if (currentUserId && currentRole !== "demo" && !optionMap.has(String(currentUserId))) {
    const fallbackCurrentLabel =
      currentProfile?.display_name ||
      appState?.session?.user?.user_metadata?.display_name ||
      appState?.session?.user?.user_metadata?.full_name ||
      (appState?.session?.user?.email ? String(appState.session.user.email).split("@")[0] : "") ||
      String(currentUserId);
    optionMap.set(String(currentUserId), {
      uid: String(currentUserId),
      label: fallbackCurrentLabel,
    });
  }

  const optionIdsNeedingNames = Array.from(optionMap.keys());
  const nameMap = await mapUserIdsToNames(optionIdsNeedingNames);
  const options = optionIdsNeedingNames
    .map((uid) => {
      const base = optionMap.get(uid);
      return {
        uid,
        label: nameMap.get(uid) || base?.label || uid || "Unknown",
      };
    })
    .sort((a, b) => String(a.label).localeCompare(String(b.label)));

  if (!options.length) {
    select.classList.add("hidden");
    select.style.display = "none";
    if (title) title.textContent = "Recent Progress";
    return;
  }

  select.innerHTML = options.map((opt) => {
    const selected =
      String(window.__BC_HUD_TIMELINE_TARGET_USER_ID__ || currentUserId || "") === String(opt.uid)
        ? " selected"
        : "";
    return `<option value="${opt.uid}"${selected}>${escapeHtml(opt.label)}</option>`;
  }).join("");

  select.classList.remove("hidden");
  select.style.display = "inline-block";
  if (title) title.textContent = "Performance History";

  select.onchange = () => {
    window.__BC_HUD_TIMELINE_TARGET_USER_ID__ = select.value || currentUserId || null;
    loadHudSkillTimeline();
  };
}

function renderHudTimeline(rows) {
  const el = document.getElementById("hudTimelineList");
  if (!el) return;

  if (!rows.length) {
    el.innerHTML = `<div style="opacity:.7;">No progress reports yet.</div>`;
    return;
  }

  const compare = (curr, prev) => {
    if (!prev) return "→";
    if (curr > prev) return "↑";
    if (curr < prev) return "↓";
    return "→";
  };

  el.innerHTML = rows.map((r, i) => {
    const prev = rows[i + 1];

    const readTrend = compare(r.read_pct, prev?.read_pct);
    const recTrend = compare(r.recovery_pct, prev?.recovery_pct);

    const time = new Date(r.created_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

    return `
      <div style="
        padding:6px 8px;
        border:1px solid rgba(255,255,255,0.08);
        border-radius:8px;
        background:rgba(255,255,255,0.03);
      ">

        <div style="display:flex; justify-content:space-between;">
          <div>${time}</div>
          <div style="opacity:.7;">Encounter Progress</div>
        </div>

        <div style="margin-top:4px;">
          Reading ${r.read_pct}% ${readTrend}
          &nbsp;&nbsp;|&nbsp;&nbsp;
          Recovery ${r.recovery_pct}% ${recTrend}
        </div>

      </div>
    `;
  }).join("");
}

function renderHud() {
  const profile = appState.profile || {};
  const normalizedRole = normalizeMembershipRole(profile) || "-";
  const caps = getPremiumRoleCapabilities(profile);
  const activeRestaurantId = getManagerActiveRestaurantId();
  const r = appState.restaurant;
  const displayRole = getDisplayRoleLabel(profile);
  const restaurantLabel = r?.name || activeRestaurantId || "-";
  const joinCode = r?.code || "-";
  const seatLimit = r?.seat_limit ?? "-";
  const requireInviteLabel = r ? (r.require_invite ? "Yes" : "No") : "-";

  if (activeRestaurantId && appState?.restaurant?.id && String(appState.restaurant.id) !== String(activeRestaurantId)) {
    appState.restaurant.id = activeRestaurantId;
  }

  document.getElementById("hudRole").textContent = displayRole;
  document.getElementById("hudRestName").textContent = restaurantLabel;
  document.getElementById("hudJoinCode").textContent = joinCode;
  document.getElementById("hudSeatLimit").textContent = seatLimit;
  document.getElementById("hudRequireInvite").textContent = requireInviteLabel;
  const mbListingRole = document.getElementById("mbListingRole");
  if (mbListingRole) mbListingRole.textContent = displayRole;
  const mbListingRestName = document.getElementById("mbListingRestName");
  if (mbListingRestName) mbListingRestName.textContent = restaurantLabel;
  const mbListingJoinCode = document.getElementById("mbListingJoinCode");
  if (mbListingJoinCode) mbListingJoinCode.textContent = joinCode;
  const mbListingSeatLimit = document.getElementById("mbListingSeatLimit");
  if (mbListingSeatLimit) mbListingSeatLimit.textContent = seatLimit;
  const mbListingRequireInvite = document.getElementById("mbListingRequireInvite");
  if (mbListingRequireInvite) mbListingRequireInvite.textContent = requireInviteLabel;

  const mgrBtn = document.getElementById("btnManagerBoard");
  if (mgrBtn) mgrBtn.classList.toggle("hidden", !caps.canAccessManagerBoard);
  const msgBtn = document.getElementById("btnOpenMessages");
  if (msgBtn) msgBtn.classList.remove("hidden");
  const leaderboardBtn = document.getElementById("btnWaiterPerformanceLeaderboard");
  if (leaderboardBtn) {
    leaderboardBtn.classList.toggle(
      "hidden",
      !(caps.canAccessManagerBoard || String(normalizedRole).toLowerCase() === "waiter")
    );
  }

  const badge = document.getElementById("premiumBadge");
  if (badge) badge.textContent = `PREMIUM • ${String(normalizedRole).toUpperCase()}`;

  const skillsTitle = document.querySelector("#hudSkillsCard > div");
  const timelineTitle = document.getElementById("hudTimelineTitle");
  const normalizedRoleLower = String(normalizedRole || "").toLowerCase();
  const isManagerLikeRole =
    normalizedRoleLower === "single_manager" ||
    normalizedRoleLower === "group_manager" ||
    normalizedRoleLower === "enterpriser";

  if (skillsTitle) {
    skillsTitle.textContent = isManagerLikeRole ? "Your Personal Skills" : "Your Skills";
  }

  if (timelineTitle && !isManagerLikeRole) {
    timelineTitle.textContent = "Recent Progress";
  }

  const managerBlock = document.getElementById("managerOnlyBlock");
  const joinRow = document.getElementById("hudJoinRow");
  const listingManagerBlock = document.getElementById("mbListingManagerOnlyBlock");
  const listingJoinRow = document.getElementById("mbListingJoinRow");
  const showManagerRestaurantControls =
    caps.canInviteWaiters || caps.canReadInvites || caps.canAccessManagerBoard;
  managerBlock?.classList.toggle("hidden", !showManagerRestaurantControls);
  joinRow?.classList.toggle("hidden", !caps.canReadInvites);
  listingManagerBlock?.classList.toggle("hidden", !showManagerRestaurantControls);
  listingJoinRow?.classList.toggle("hidden", !caps.canReadInvites);

  const toggle = document.getElementById("toggleRequireInvite");
  if (toggle && r) toggle.checked = !!r.require_invite;

  const seatInput = document.getElementById("seatLimitInput");
  if (seatInput && r) seatInput.value = String(r.seat_limit ?? "");

  renderManagerUpgradeAccess();
  renderInvitesList();
  renderHudTimelineUserSelect?.();
  renderProfileSkillDashboard();
  void loadProfilePerformanceHistory();
  renderHudAbilities();
  renderHudDifficultyControls?.();
  wireHudDifficultyControls?.();
}

function renderManagerUpgradeAccess() {
  const normalizedRole = normalizeMembershipRole(appState?.profile || null) || "waiter";
  const showGroup = normalizedRole === "single_manager";
  const showEnterprise = normalizedRole === "single_manager" || normalizedRole === "group_manager";
  const showSection = showGroup || showEnterprise;

  [
    {
      section: document.getElementById("managerSetupSection"),
      groupCard: document.getElementById("mbGroupSetupCard"),
      enterpriseCard: document.getElementById("mbProvisionAccess"),
    },
    {
      section: document.getElementById("mbListingManagerSetupSection"),
      groupCard: document.getElementById("mbListingGroupSetupCard"),
      enterpriseCard: document.getElementById("mbListingProvisionAccess"),
    },
  ].forEach(({ section, groupCard, enterpriseCard }) => {
    section?.classList.toggle("hidden", !showSection);
    groupCard?.classList.toggle("hidden", !showGroup);
    enterpriseCard?.classList.toggle("hidden", !showEnterprise);
  });
}

// ------------------------------------------------------------
// Manager actions (HUD)
// ------------------------------------------------------------
async function adminAddInvite(emailRaw) {
  try {
    setMsg("hudMsg", "");
    setMsg("mbListingMsg", "");
    const email = normEmail(emailRaw);
    if (!email) throw new Error("Enter a valid email.");

    const r = appState.restaurant;
    const activeRestaurantId = getManagerActiveRestaurantId();
    const sess = appState.session;
    const profile = appState.profile || {};
    const caps = getPremiumRoleCapabilities(profile);
    if (!activeRestaurantId) throw new Error("Restaurant not loaded.");
    if (!sess?.user) throw new Error("Not logged in.");
    if (!caps.canInviteWaiters) throw new Error("Role cannot invite waiters.");
    if (!canActOnRestaurant(profile, profile, activeRestaurantId)) {
      throw new Error("Role cannot act on this restaurant.");
    }

    const res = await withTimeout(
      supabase.rpc("create_restaurant_invite", {
        p_restaurant_id: activeRestaurantId,
        p_email: email,
      }),
      12000,
      "create_restaurant_invite"
    );

    if (res.error) throw res.error;

    const payload = res.data || null;
    if (!payload?.ok) {
      throw new Error(payload?.error || "Invite failed");
    }

    appState.invites = await loadInvites(activeRestaurantId);
    setManagerBoardInvites(appState.invites);
    renderInvitesList();
    renderManagerBoardInviteSummary();
    setMsg("hudMsg", `Added: ${email}`, "success");
    setMsg("mbListingMsg", `Added: ${email}`, "success");
  } catch (e) {
    console.error(e);
    setMsg("hudMsg", e?.message || "Add failed", "error");
    setMsg("mbListingMsg", e?.message || "Add failed", "error");
  }
}

async function adminRevokeInvite(emailRaw) {
  try {
    setMsg("hudMsg", "");
    setMsg("mbListingMsg", "");
    const email = normEmail(emailRaw);
    if (!email) throw new Error("Invalid email.");

    const r = appState.restaurant;
    const sess = appState.session;
    const caps = getPremiumRoleCapabilities(appState.profile);
    if (!r?.id) throw new Error("Restaurant not loaded.");
    if (!sess?.user) throw new Error("Not logged in.");
    if (!caps.canInviteWaiters) throw new Error("Role cannot invite waiters.");
    if (!canActOnRestaurant(appState?.profile, appState?.profile, r.id)) {
      throw new Error("Role cannot act on this restaurant.");
    }

    const upd = await withTimeout(
      supabase
        .from("restaurant_invites")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
          revoked_by: sess.user.id,
        })
        .eq("restaurant_id", r.id)
        .eq("email", email),
      12000,
      "invites.update(revoke)"
    );
    if (upd.error) throw upd.error;

    appState.invites = await loadInvites(r.id);
    setManagerBoardInvites(appState.invites);
    renderInvitesList();
    renderManagerBoardInviteSummary();
    setMsg("hudMsg", `Removed: ${email}`, "success");
    setMsg("mbListingMsg", `Removed: ${email}`, "success");
  } catch (e) {
    console.error(e);
    setMsg("hudMsg", e?.message || "Remove failed", "error");
    setMsg("mbListingMsg", e?.message || "Remove failed", "error");
  }
}

async function adminSaveRequireInvite() {
  try {
    setMsg("hudMsg", "");
    const r = appState.restaurant;
    const caps = getPremiumRoleCapabilities(appState.profile);
    if (!r?.id) throw new Error("Restaurant not loaded.");
    if (!caps.canReadInvites) throw new Error("Role cannot manage invite settings.");
    if (!canActOnRestaurant(appState?.profile, appState?.profile, r.id)) {
      throw new Error("Role cannot act on this restaurant.");
    }

    const desired = !!document.getElementById("toggleRequireInvite")?.checked;

    const upd = await withTimeout(
      supabase.from("restaurants").update({ require_invite: desired }).eq("id", r.id).select().single(),
      12000,
      "restaurants.update(require_invite)"
    );
    if (upd.error) throw upd.error;

    appState.restaurant = upd.data;
    renderHud();
    setMsg("hudMsg", "Saved.", "success");
  } catch (e) {
    console.error(e);
    setMsg("hudMsg", e?.message || "Save failed (RLS may block updates)", "error");
  }
}

async function adminSaveSeatLimit() {
  try {
    setMsg("hudMsg", "");
    const r = appState.restaurant;
    const caps = getPremiumRoleCapabilities(appState.profile);
    if (!r?.id) throw new Error("Restaurant not loaded.");
    if (!caps.canUseManagerAbilities) throw new Error("Role cannot manage restaurant settings.");
    if (!canActOnRestaurant(appState?.profile, appState?.profile, r.id)) {
      throw new Error("Role cannot act on this restaurant.");
    }

    const raw = document.getElementById("seatLimitInput")?.value;
    const seatLimit = raw ? parseInt(raw, 10) : NaN;
    if (!Number.isFinite(seatLimit) || seatLimit < 1) throw new Error("Seat limit must be >= 1.");

    const upd = await withTimeout(
      supabase.from("restaurants").update({ seat_limit: seatLimit }).eq("id", r.id).select().single(),
      12000,
      "restaurants.update(seat_limit)"
    );
    if (upd.error) throw upd.error;

    appState.restaurant = upd.data;
    renderHud();
    setMsg("hudMsg", "Saved.", "success");
  } catch (e) {
    console.error(e);
    setMsg("hudMsg", e?.message || "Save failed (RLS may block updates)", "error");
  }
}

// ------------------------------------------------------------
// Create restaurant (Premium manager) — DB RPC
// ------------------------------------------------------------
async function createPremiumRestaurant() {
  try {
    clearMsgs();
    const name = (document.getElementById("restName").value || "").trim();
    if (!name) throw new Error("Restaurant name is required.");

    setMsg("createRestMsg", "Creating...");
    const rpc = await withTimeout(
      supabase.rpc("create_restaurant", { p_name: name }),
      15000,
      "rpc.create_restaurant"
    );

    if (rpc.error) throw rpc.error;
    if (!rpc.data?.ok) throw new Error(rpc.data?.error || "Create failed");

    const r = rpc.data.restaurant;
    document.getElementById("invitePanel").classList.remove("hidden");
    document.getElementById("inviteCodeText").textContent = r.code;
    setMsg("createRestMsg", "Created ✅", "success");

    await decideRoute("restaurant.create.ok");
  } catch (e) {
    console.error(e);
    setMsg("createRestMsg", e?.message || "Create failed", "error");
  }
}

// ------------------------------------------------------------
// Premium code redemption (assumes an RPC exists)
// ------------------------------------------------------------
async function redeemPremiumCodeIfProvided() {
  // Only attempt if premium intent is selected
  if (authIntent !== "premium") return { attempted: false, ok: false };

  const raw = document.getElementById("premiumLicenseCode")?.value;
  const code = normCode(raw);
  if (!code) return { attempted: false, ok: false };

  const restaurantName = (document.getElementById("premiumRestaurantName")?.value || "").trim();
  const args = {
    p_code: code,
    p_restaurant_name: restaurantName || null
  };

  // IMPORTANT:
  // This RPC name/param must match YOUR database function.
  // If yours is named differently, change the next line only.
  const rpc = await withTimeout(
    supabase.rpc("claim_license_code", args),
    15000,
    "rpc.claim_license_code"
  );

  if (rpc.error) throw rpc.error;
  if (rpc.data?.ok !== true) {
    const err = rpc.data?.error || "Code failed";
    if (err === "need_restaurant_name") throw new Error("Enter your restaurant name to finish setup.");
    throw new Error(err);
  }

  return { attempted: true, ok: true, data: rpc.data };
}

// ------------------------------------------------------------
// Auth submit
// ------------------------------------------------------------
async function submitAuth() {
  try {
    clearMsgs();

    const email = normEmail(document.getElementById("authEmail").value);
    const password = document.getElementById("authPassword").value || "";
    const displayName = (document.getElementById("authDisplayName").value || "").trim();

    if (!email) throw new Error("Enter email.");
    if (!password) throw new Error("Enter password.");

    const roleForSignup = uiState.role === "waiter" ? "waiter" : uiState.managerPackage;

    if (uiState.mode === "login") {
      setMsg("authMsg", "Logging in...");
      const res = await withTimeout(parentSignIn(email, password), 15000, "auth.signIn");
      if (res.error) throw res.error;

      await loadAuthedState("login.ok");

      // ✅ If Premium intent + code entered, redeem it BEFORE routing
      if (authIntent === "premium") {
        const codeEntered = normCode(document.getElementById("premiumLicenseCode")?.value);
        if (codeEntered) {
          setMsg("authMsg", "Applying Premium code...");
          await redeemPremiumCodeIfProvided();
          await loadAuthedState("login.claim.refresh");
          setMsg("authMsg", "Premium code applied ✅", "success");
        }
      }

      // ✅ Force UI role to match real profile role (prevents confusion)
      const pr = String(appState.profile?.role || "").toLowerCase();
      if (pr === "waiter") setRole("waiter");
      else setRole("manager");

      if (document.documentElement?.dataset?.bcMobileEnv === "true" && (isV2DemoRequested() || appMode === "demo")) {
        persistV2DemoRequest();
        openMobileDemoCockpit("login_mobile_demo");
        setMsg("authMsg", "", "normal");
        return;
      }

      await decideRoute("login.ok.decideRoute");
      return;
    }

    // signup
    setMsg("authMsg", "Creating account...");
    const { error } = await withTimeout(
      parentSignUp(email, password, {
        role: roleForSignup,
        display_name: displayName || null,
        desired_package_tier: uiState.role === "manager" ? uiState.managerPackage : null,
        desired_seat_plan: uiState.role === "manager" ? uiState.seatPlan : null,
        desired_restaurant_count:
          uiState.role === "manager" &&
          ["group_manager", "enterpriser"].includes(uiState.managerPackage)
            ? Number(uiState.restaurantCount || 3)
            : null,
        access_intent: authIntent,
      }),
      15000,
      "auth.signUp"
    );
    if (error) throw error;

    const { session } = await parentGetSession();
    if (session?.user && authIntent === "premium") {
      const codeEntered = normCode(document.getElementById("premiumLicenseCode")?.value);
      if (codeEntered) {
        setMsg("authMsg", "Account created. Applying Premium code...");
        await loadAuthedState("signup.ok");
        await redeemPremiumCodeIfProvided();
        await loadAuthedState("signup.claim.refresh");
        setMsg("authMsg", "Account created and Premium code applied ✅", "success");
        await decideRoute("signup.ok.decideRoute");
        return;
      }
    }

    setMsg("authMsg", "Account created. If email confirmation is ON, confirm then Login.", "success");
    setMode("login");
  } catch (e) {
    console.error(e);
    setMsg("authMsg", e?.message || "Auth failed", "error");
  }
}

// ------------------------------------------------------------
// Logout
// ------------------------------------------------------------
async function signOutHard() {
  console.log("[AUTH] signOutHard: start");

  // 1) call signOut
  var res = await supabase.auth.signOut();
  if (res && res.error) console.warn("[AUTH] signOut error:", res.error);

  // 2) verify session
  var ses1 = await supabase.auth.getSession();
  console.log("[AUTH] session after signOut =", ses1 && ses1.data ? ses1.data.session : null);

  // 3) if still present, force-clear Supabase token storage keys
  if (ses1 && ses1.data && ses1.data.session) {
    console.warn("[AUTH] session still present -> forcing token clear");
    try {
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var k = localStorage.key(i);
        if (k && k.indexOf("sb-") === 0 && k.indexOf("-auth-token") === (k.length - 11)) {
          localStorage.removeItem(k);
        }
      }
    } catch (e) {}

    var ses2 = await supabase.auth.getSession();
    console.log("[AUTH] session after forced clear =", ses2 && ses2.data ? ses2.data.session : null);
  }

  const sesFinal = await supabase.auth.getSession();
  const stillAuthed = !!(sesFinal?.data?.session);
  console.log("[AUTH] signOutHard: done", { stillAuthed, user: sesFinal?.data?.session?.user?.id || null });
  return { stillAuthed, session: sesFinal?.data?.session || null };
}

async function doLogout(reason = "user") {
  if (window.__BC_LOGGING_OUT__) return;
  window.__BC_LOGGING_OUT__ = true;
  let logoutRedirectIssued = false;

  console.warn("[LOGOUT] start", reason);

  try {
    try { localStorage.setItem("__BC_LOGOUT_LOCK__", String(Date.now())); } catch {}
    window.__BC_LOGOUT_LOCK__ = Date.now();

    // Clear local auth/profile state first so the UI cannot stay in Premium
    // even if network sign-out stalls or fails.
    try {
      appState.session = null;
      appState.profile = null;
      appState.restaurant = null;
      appState.activeRestaurantId = null;
      appMode = "public";
    } catch {}

    // Notify active iframe(s) before teardown so UI can collapse immediately.
    try {
      const origin = window.location.origin;
      const notify = (frameId) => {
        const win = document.getElementById(frameId)?.contentWindow;
        if (!win) return;
        win.postMessage({ source: "BC_MSG", v: 1, type: "auth_state", authed: false }, origin);
        win.postMessage({ source: "BC_MSG", v: 1, type: "parent_logged_out" }, origin);
      };
      notify("premiumRootFrame");
      notify("gameRootDemoFrame");
    } catch {}

    // 1) detach UI immediately
    try { hardResetUI("logout.start"); } catch (e) { console.warn("hardResetUI failed", e); }
    try { destroyPremiumIframe("logout"); } catch (e) { console.warn("destroyPremiumIframe failed", e); }
    try { routeAuth(); } catch (e) { console.warn("routeAuth failed", e); }
    try { applyAuthUi(); } catch {}

    // 2) sign out (best effort)
    try {
      await parentSignOutGlobal();
      console.warn("[LOGOUT] supabase signOut ok");
    } catch (e) {
      console.warn("[LOGOUT] supabase signOut failed (continuing anyway)", e);
    }

    // 3) purge ALL known keys (yours + supabase default/legacy)
    try { purgeAuthStorage(); } catch {}
    try {
      localStorage.removeItem("bc_supabase_auth_v1");
      sessionStorage.removeItem("bc_supabase_auth_v1");

      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("sb-") && k.includes("auth-token")) localStorage.removeItem(k);
      }
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith("sb-") && k.includes("auth-token")) sessionStorage.removeItem(k);
      }
    } catch {}

    try {
      try { localStorage.setItem("__BC_LOGOUT_LATCH__", String(Date.now())); } catch {}
      window.location.replace("/?loggedOut=1&ts=" + Date.now());
      logoutRedirectIssued = true;
      return;
    } catch (e) {
      console.warn("[LOGOUT] redirect failed, falling back to auth route", e);
    }
  } finally {
    try {
      appState.session = null;
      appState.profile = null;
    } catch {}
    if (!logoutRedirectIssued) {
      try { localStorage.removeItem("__BC_LOGOUT_LOCK__"); } catch {}
      window.__BC_LOGOUT_LOCK__ = null;
      window.__BC_LOGGING_OUT__ = false;
      try { routeAuth(); } catch {}
    }
  }
}
window.doLogout = doLogout;
console.log("doLogout is", window.doLogout);

// Backward-compatible alias for existing callsites.
async function logoutAll(reason = "logout") {
  return doLogout(reason);
}

function triggerLogoutIntent(btn, reason = "ui") {
  if (window.__BC_LOGGING_OUT__) return;
  try { btn.disabled = true; } catch {}
  void (window.doLogout || doLogout)(reason);
}

function wireLogoutButtons() {
  const ids = [
    "btnHomeLogout",
    "btnLogoutCreate",
    "btnLogoutPremium",
    "btnLogoutManagerBoard",
  ];

  ids.forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (btn.__bcLogoutBound) return;
    btn.__bcLogoutBound = true;
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      console.log("[LOGOUT] direct", id);
      triggerLogoutIntent(btn, "ui:" + id);
    });
  });
}

function wireLogout() {
  if (window.__BC_LOGOUT_WIRED__) return;
  window.__BC_LOGOUT_WIRED__ = true;

  const LOGOUT_IDS = new Set([
    "btnHomeLogout",
    "btnLogoutCreate",
    "btnLogoutPremium",
    "btnLogoutManagerBoard",
  ]);

  // capture phase so we catch it even if something stops propagation
  window.addEventListener(
    "click",
    (e) => {
      const btn = e.target?.closest?.("button");
      if (!btn || !LOGOUT_IDS.has(btn.id)) return;

      console.log("[LOGOUT] captured", btn.id);

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      triggerLogoutIntent(btn, "ui:" + btn.id);
    },
    true
  );

  console.log("[LOGOUT] delegation armed ✅");
}

function wireGlobalDemoExit() {
  if (window.__BC_DEMO_EXIT_WIRED__) return;
  window.__BC_DEMO_EXIT_WIRED__ = true;

  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target?.closest?.("button");
      if (!btn || btn.id !== "btnDemoExit") return;

      console.log("[UI] Demo exit captured ✅");
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      routeAuth();
    },
    true
  );
}

function forceWireHomeLogout() {
  const btn = document.getElementById("btnHomeLogout");
  if (!btn) {
    console.warn("[LOGOUT] btnHomeLogout not found");
    return;
  }

  // Remove any previous listeners
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  newBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("[HOME] Logout clicked");
    await doLogout("home_logout");
  });

  console.log("[HOME] Logout wired ✅");
}

function wireDemoButtons() {
  const btnPremium = document.getElementById("btnDemoPremium");
  const btnExit = document.getElementById("btnDemoExit");

  if (btnExit) {
    btnExit.classList.remove("hidden");
    if (btnExit.textContent !== "Logout") {
      btnExit.textContent = "Logout";
    }
    btnExit.onclick = null;
    if (!btnExit.__bcBound) {
      btnExit.__bcBound = true;
      btnExit.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("[DEMO] Logout clicked ✅");
        await doLogout("demo_logout");
      });
    }
  } else {
    console.warn("[DEMO] btnDemoExit not found (yet)");
  }

  if (btnPremium) {
    btnPremium.onclick = null;
    if (!btnPremium.__bcBound) {
      btnPremium.__bcBound = true;
      btnPremium.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("[DEMO] Premium clicked");
        setAuthIntent("premium");
        await routePremium("demo.premium");
      });
    }
  }
}

// ------------------------------------------------------------
// Wire events
// ------------------------------------------------------------

// ✅ Premium button toggles intent when logged out; routes when logged in
document.getElementById("btnHomePremium").addEventListener("click", async () => {
  // Logged out: toggle intent only
  if (!appState.session?.user) {
    if (authIntent === "premium") {
      setAuthIntent("login");
      setMsg("authMsg", "", "normal");
    } else {
      setAuthIntent("premium");
      setMsg("authMsg", "Premium selected. Login below and enter your Premium code.", "success");
    }
    return;
  }

  // Logged in: go Premium
  await routePremium("home.premium");
});

// ✅ Exit Premium (logged out intent)
document.getElementById("btnHomeExitPremium").addEventListener("click", () => {
  setAuthIntent("login");
  setMsg("authMsg", "", "normal");
  if (window.__BC_RETURN_TO_DEMO_ON_EXIT_PREMIUM__) {
    window.__BC_RETURN_TO_DEMO_ON_EXIT_PREMIUM__ = false;
    if (appState.session?.user) {
      void routeDemo("exit_premium");
    } else {
      routeDemoShellNoAuth();
    }
  }
});

document.getElementById("btnAuthSubmit").addEventListener("click", submitAuth);

document.getElementById("tabRoleWaiter").addEventListener("click", () => setRole("waiter"));
document.getElementById("tabRoleManager").addEventListener("click", () => setRole("manager"));
document.getElementById("tabModeLogin").addEventListener("click", () => setMode("login"));
document.getElementById("tabModeSignup").addEventListener("click", () => setMode("signup"));
document.getElementById("tabManagerSingle")?.addEventListener("click", () => setManagerPackage("single_manager"));
document.getElementById("tabManagerGroup")?.addEventListener("click", () => setManagerPackage("group_manager"));
document.getElementById("tabManagerEnterprise")?.addEventListener("click", () => setManagerPackage("enterpriser"));
document.getElementById("tabSeat15")?.addEventListener("click", () => setSeatPlan("15"));
document.getElementById("tabSeat30")?.addEventListener("click", () => setSeatPlan("30"));
document.getElementById("tabSeat60")?.addEventListener("click", () => setSeatPlan("60"));
document.getElementById("tabRestaurant3")?.addEventListener("click", () => setRestaurantCount("3"));
document.getElementById("tabRestaurant5")?.addEventListener("click", () => setRestaurantCount("5"));
document.getElementById("tabRestaurant7")?.addEventListener("click", () => setRestaurantCount("7"));
document.getElementById("tabRestaurant10")?.addEventListener("click", () => setRestaurantCount("10"));

document.getElementById("btnDemoJoin").addEventListener("click", () => demoJoinRestaurantByCode());

document.getElementById("btnCreateRestaurant").addEventListener("click", createPremiumRestaurant);

document.getElementById("btnCopyCode").addEventListener("click", async () => {
  try {
    const code = (document.getElementById("inviteCodeText").textContent || "").trim();
    if (!code) throw new Error("No code yet.");
    await navigator.clipboard.writeText(code);
    setMsg("inviteMsg", "Copied ✅", "success");
  } catch (e) {
    setMsg("inviteMsg", e?.message || "Copy failed", "error");
  }
});
document.getElementById("btnEnterPremium").addEventListener("click", () => decideRoute("enterPremium"));
document.getElementById("btnAppChromeEnter")?.addEventListener("click", () => openPremiumBeginScreen());

wireParentButtons();
wirePremiumTopbarMenu();
wireManagerBoardButton();
wireHudSendProgressButton();
wireWaiterMessagesPanel();
wireHudAbilities();
tickHudActiveAbilities();
tickManagerBoardAbilities();

document.getElementById("btnOpenHud")?.addEventListener("click", () => {
  closeWaiterMessages?.();
  openHud();
  renderHud();
});
document.getElementById("btnWaiterPerformanceLeaderboard")?.addEventListener("click", async () => {
  await openWaiterLeaderboardWindow();
});
document.getElementById("btnCloseManagerMessenger")?.addEventListener("click", () => {
  closeManagerMessengerWindow();
});
document.getElementById("btnCloseWaiterLeaderboard")?.addEventListener("click", closeWaiterLeaderboardWindow);

document.getElementById("btnCloseHud")?.addEventListener("click", () => {
  closeHud();
  showScreen("screenPremiumApp");
});
document.getElementById("hudBackdrop")?.addEventListener("click", closeHud);
document.getElementById("btnBackToPremium")?.addEventListener("click", () => {
  showScreen("screenPremiumApp");
});
document.getElementById("btnBackFromProfile")?.addEventListener("click", closeProfilePanel);
document.getElementById("screenProfile")?.addEventListener("click", (e) => {
  if (e.target?.id === "screenProfile") closeProfilePanel();
});
document.getElementById("screenWaiterLeaderboard")?.addEventListener("click", (e) => {
  if (e.target?.id === "screenWaiterLeaderboard") closeWaiterLeaderboardWindow();
});
document.getElementById("screenManagerMessenger")?.addEventListener("click", (e) => {
  if (e.target?.id === "screenManagerMessenger") closeManagerMessengerWindow();
});
document.getElementById("btnLogoutProfile")?.addEventListener("click", async () => {
  await doLogout("profile_logout");
});

document.getElementById("btnCopyHudCode").addEventListener("click", async () => {
  try {
    const code = appState.restaurant?.code;
    if (!code) throw new Error("No code loaded.");
    await navigator.clipboard.writeText(code);
    setMsg("hudMsg", "Copied ✅", "success");
    setMsg("mbListingMsg", "Copied ✅", "success");
  } catch (e) {
    setMsg("hudMsg", e?.message || "Copy failed", "error");
    setMsg("mbListingMsg", e?.message || "Copy failed", "error");
  }
});

document.getElementById("btnMbListingCopyCode")?.addEventListener("click", async () => {
  try {
    const code = appState.restaurant?.code;
    if (!code) throw new Error("No code loaded.");
    await navigator.clipboard.writeText(code);
    setMsg("hudMsg", "Copied ✅", "success");
    setMsg("mbListingMsg", "Copied ✅", "success");
  } catch (e) {
    setMsg("hudMsg", e?.message || "Copy failed", "error");
    setMsg("mbListingMsg", e?.message || "Copy failed", "error");
  }
});

document.getElementById("btnAddInvite").addEventListener("click", async () => {
  const v = document.getElementById("inviteEmailInput").value;
  await adminAddInvite(v);
  document.getElementById("inviteEmailInput").value = "";
});
document.getElementById("mbListingAddInvite")?.addEventListener("click", async () => {
  const input = document.getElementById("mbListingInviteEmailInput");
  const v = input?.value || "";
  await adminAddInvite(v);
  if (input) input.value = "";
});
document.getElementById("btnSaveRequireInvite").addEventListener("click", adminSaveRequireInvite);
document.getElementById("btnSaveSeatLimit")?.addEventListener("click", adminSaveSeatLimit);

// Debug + cross-module access (safe to ship)
window.__BC_MB__ = window.__BC_MB__ || {};
window.__BC_MB__.wireManagerBoardMenu = wireManagerBoardMenu;
window.__BC_MB__.applyManagerBoardVisibility = applyManagerBoardVisibility;
window.__BC_MB__.loadManagerInsights = loadManagerInsights;
window.__BC_MB__.loadManagerBoardData = loadManagerBoardData;
window.__BC_MB__.loadManagerMessenger = loadManagerMessenger;
window.__BC_MB__.wireManagerBoardMessenger = wireManagerBoardMessenger;
window.__BC_MB__.openManagerMessengerWindow = openManagerMessengerWindow;

// Optional convenience aliases (only if you want old calls to work)
window.wireManagerBoardMenu = wireManagerBoardMenu;
window.applyManagerBoardVisibility = applyManagerBoardVisibility;
window.loadManagerInsights = loadManagerInsights;
window.loadManagerBoardData = loadManagerBoardData;
window.loadManagerMessenger = loadManagerMessenger;
window.openManagerMessengerWindow = openManagerMessengerWindow;
window.closeManagerMessengerWindow = closeManagerMessengerWindow;

// ------------------------------------------------------------
// Boot + auth change
// ------------------------------------------------------------
(function bcBootSingleton() {
  if (window.__BC_BOOTED__) {
    console.warn("[BOOT] blocked duplicate boot");
    return;
  }
  window.__BC_BOOTED__ = true;
  console.log("[BOOT] first boot ✅");
})();

const __BC_BOOT_LOGGED_OUT__ = new URLSearchParams(location.search).get("loggedOut") === "1";
window.__BC_SKIP_DECIDE_ROUTE__ = false;

try {
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete("mode");
  cleanUrl.searchParams.delete("demo");
  cleanUrl.searchParams.delete("logout");
  replaceUrlKeepingV2Demo(cleanUrl);
} catch {}

(function watchGhostPremium() {
  const root = document.getElementById("premiumRoot");
  if (!root) return;

  const obs = new MutationObserver(() => {
    if (!appState?.session) {
      const hasFrame = !!document.getElementById("premiumRootFrame");
      const hasHtml = root.innerHTML.trim().length > 0;
      if (hasFrame || hasHtml) {
        console.error("[GHOST] premiumRoot changed while logged out. Something is remounting it.");
        root.innerHTML = "";
        try { document.getElementById("premiumRootFrame")?.remove(); } catch {}
      }
    }
  });

  obs.observe(root, { childList: true, subtree: true });
})();

let __BC_BOOT_ROUTE_BLOCKED__ = false;
if (__BC_BOOT_LOGGED_OUT__) {
  console.warn("[BOOT] loggedOut latch: forcing auth screen, skipping routing");
  try { appState.session = null; appState.profile = null; } catch {}
  try { destroyPremiumIframe("boot.loggedOut"); } catch {}
  try { destroyDemoIframe("boot.loggedOut"); } catch {}
  try {
    const u = new URL(location.href);
    u.searchParams.delete("loggedOut");
    u.searchParams.delete("mode");
    u.searchParams.delete("demo");
    replaceUrlKeepingV2Demo(u);
  } catch {}
  try { routeAuth(); } catch {}
  window.__BC_SKIP_DECIDE_ROUTE__ = true;
  __BC_BOOT_ROUTE_BLOCKED__ = true;
}

try {
  const latch = localStorage.getItem("__BC_LOGOUT_LATCH__");
  if (latch) {
    console.warn("[BOOT] logout latch active -> forcing logged-out UI");
    localStorage.removeItem("__BC_LOGOUT_LATCH__");

    try { appState.session = null; } catch {}
    try { appState.profile = null; } catch {}
    try { document.getElementById("premiumRoot") && (document.getElementById("premiumRoot").innerHTML = ""); } catch {}
    try { document.getElementById("premiumRootFrame")?.remove(); } catch {}
    try { document.getElementById("btnLogout") && (document.getElementById("btnLogout").style.display = "none"); } catch {}
    try { showScreen("screenHome"); } catch {}

    __BC_BOOT_ROUTE_BLOCKED__ = true;
    setTimeout(() => {
      __BC_BOOT_ROUTE_BLOCKED__ = false;
    }, 1000);
  }
} catch {}

// ==== STACK TRACE TRAPS ====
if (!window.__BC_TRACE_TRAPS__) {
  window.__BC_TRACE_TRAPS__ = true;
  function trace(tag, data = {}) {
    console.log(tag, data);
    console.log(new Error("[TRACE]").stack);
  }

  window.mountPremiumGameIframe = mountPremiumGameIframe;
  window.routePremium = routePremium;
  window.showScreen = showScreen;
  window.setHomeAuthUI = setHomeAuthUI;
  window.routeDemoShellNoAuth = routeDemoShellNoAuth;

  if (typeof window.mountPremiumGameIframe === "function") {
    const _mountPremiumGameIframe = window.mountPremiumGameIframe;
    window.mountPremiumGameIframe = function (...args) {
      trace("[TRAP] mountPremiumGameIframe()", { hasSession: !!appState?.session, args });
      return _mountPremiumGameIframe.apply(this, args);
    };
  }

  if (typeof window.routePremium === "function") {
    const _routePremium = window.routePremium;
    window.routePremium = async function (...args) {
      trace("[TRAP] routePremium()", { hasSession: !!appState?.session, args });
      return _routePremium.apply(this, args);
    };
  }

  if (typeof window.showScreen === "function") {
    const _showScreen = window.showScreen;
    window.showScreen = function (...args) {
      trace("[TRAP] showScreen()", { args });
      return _showScreen.apply(this, args);
    };
  }

  if (typeof window.setHomeAuthUI === "function") {
    const _setHomeAuthUI = window.setHomeAuthUI;
    window.setHomeAuthUI = function (isLoggedIn, ...rest) {
      trace("[TRAP] setHomeAuthUI()", { isLoggedIn, hasSession: !!appState?.session });
      return _setHomeAuthUI.call(this, isLoggedIn, ...rest);
    };
  }

  if (typeof window.routeDemoShellNoAuth === "function") {
    const _r = window.routeDemoShellNoAuth;
    window.routeDemoShellNoAuth = function (...args) {
      trace("[TRAP] routeDemoShellNoAuth()", { args, url: location.href });
      return _r.apply(this, args);
    };
  }
}

showScreen("screenHome");
setManagerPackage("single_manager");
setSeatPlan("15");
setRole("waiter");
setMode("login");
setAuthIntent("login");
wireLogout();
wireLogoutButtons();
wireGlobalDemoExit();
wireDemoButtons();
applyAuthUi();
void syncAuthUi();

setDebug({ step: "boot.ready", time: new Date().toISOString(), supabaseUrl: import.meta.env.VITE_SUPABASE_URL });

// Boot proof: confirms current singleton/session state every load.
(async function bootSessionProof() {
  const { data } = await supabase.auth.getSession();
  console.log("[BOOT PROOF] supabase", supabase.__BC_ID__, "session?", !!data?.session);
})();

async function enforceAuthRoute() {
  const { data } = await supabase.auth.getSession();
  const session = data?.session || null;

  if (!session) {
    console.log("[ROUTE] no session -> forcing demo shell");

    appMode = "demo";
    window.__BC_FORCE_AUTH__ = false;
    routeDemoShellNoAuth();
    return;
  }

  console.log("[ROUTE] session present -> allow premium flow");
}

// ✅ Auth changes should route via decideRoute.
// ✅ TOKEN_REFRESHED must NOT remount iframes / reset gameplay.
supabase.auth.onAuthStateChange((event, session) => {
  setDebug({ step: "auth.change", event, time: new Date().toISOString() });
  console.log("[AUTH EVENT]", event);
  console.log("[AUTH] state change:", event, !!session);
  if (__BC_BOOT_ROUTE_BLOCKED__) {
    console.warn("[AUTH] blocked by boot logout latch", event);
    return;
  }
  if (isLoggingOut()) {
    console.warn("[AUTH] listener blocked (logging out)", event);
    return;
  }

  if (authRouteTimer) clearTimeout(authRouteTimer);

  authRouteTimer = setTimeout(async () => {
    try {
      appState.session = session || null;

      if (!session) {
        console.log("[AUTH] session gone -> forcing demo shell");
        appState.profile = null;
        appState.restaurant = null;
        appState.activeRestaurantId = null;
        appMode = "demo";

        // Destroy all premium/demo shells
        try { document.querySelectorAll("iframe").forEach((f) => f.remove()); } catch {}

        routeDemoShellNoAuth();
        hideAllLogoutButtons();
        hideDemoButtonsOnLogin();
        document
          .querySelectorAll("#btnHomeLogout, #btnLogoutCreate, #btnLogoutPremium, #btnLogoutManagerBoard")
          .forEach((btn) => {
            btn.classList.add("hidden");
            btn.disabled = false;
          });
        applyAuthUi();
        return;
      }

      await decideRouteGuarded("auth_subscriber");
      await syncAuthUi();
    } catch {
      closeHud();
      routeDemoShellNoAuth();
    }
  }, 150);
});

// Resume state on refresh
(async function bootResume() {
  try {
    if (__BC_BOOT_ROUTE_BLOCKED__ || window.__BC_SKIP_DECIDE_ROUTE__) return;
    await decideRoute("boot.resume");
    wireManagerBoardButton();
    await enforceAuthRoute();
  } catch {}
})();

if (!__BC_BOOT_ROUTE_BLOCKED__) {
  void enforceAuthRoute();
}

window.addEventListener("message", (event) => {
  if (event?.data?.source === "BC_MSG") {
    console.log("[PARENT] got BC_MSG:", event.data, "origin:", event.origin);
  }
});
