// src/main.js
import "./style.css";
import { parentSignIn, parentSignOutGlobal, parentSignUp, parentGetSession } from "./lib/authParent.js";
import { getSupabaseParent, purgeAuthStorage } from "./lib/supabaseParent.js";
import { createBcBridge } from "./lib/bcBridge.js";
import { BC_TYPES } from "./lib/bcMessages.js";
import { makeLogoutHandler } from "./lib/bcHandlers/logout.js";
import { makeCtxHandler } from "./lib/bcHandlers/ctx.js";
import { makeWinesHandler } from "./lib/bcHandlers/wines.js";
import { makeRunsCountHandler } from "./lib/bcHandlers/runsCount.js";
import { handleEventLog } from "./lib/handlers/handleEventLog.js";
import { decideAllowedTier } from "./parent/progressionRouter";
import { createProgressionStore } from "./progressionStore.js";

const supabase = getSupabaseParent();

// ==== SUPABASE FINGERPRINT ====
if (!supabase.__BC_ID__) supabase.__BC_ID__ = "sb_" + Math.random().toString(16).slice(2);
if (!supabase.__BC_FINGERPRINT_PATCHED__) {
  const _getSession = supabase.auth.getSession.bind(supabase.auth);
  supabase.auth.getSession = async (...args) => {
    const r = await _getSession(...args);
    console.log("[SB]", supabase.__BC_ID__, "getSession ->", !!r?.data?.session);
    return r;
  };

  const _signOut = supabase.auth.signOut.bind(supabase.auth);
  supabase.auth.signOut = async (...args) => {
    console.log("[SB]", supabase.__BC_ID__, "signOut CALLED", args);
    const r = await _signOut(...args);
    console.log("[SB]", supabase.__BC_ID__, "signOut DONE", r?.error || "ok");
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

if (window.__BOTTLECALLER_BOOTED__) {
  throw new Error("BottleCaller boot attempted twice.");
}
window.__BOTTLECALLER_BOOTED__ = true;

window.addEventListener("storage", (e) => {
  if (e.key === "__BC_LOGOUT_LOCK__" && e.newValue) {
    console.warn("[CROSS-TAB] logout lock detected -> forcing logout UI");
    try { window.__BC_FORCE_LOGGED_OUT__ = true; } catch {}
    try { window.location.replace("/?loggedOut=1&ts=" + Date.now()); } catch {}
  }
});

// ===== CANONICAL MODES =====
const MODE = {
  SCOUT: "scout",
  GUIDE: "guide",
  CHARM: "charm",
  AUTH: "authority",
};

function canonicalModeFromUi(label) {
  const s = String(label || "").trim().toLowerCase();
  if (s === "scout") return MODE.SCOUT;
  if (s === "guide") return MODE.GUIDE;
  if (s === "charm") return MODE.CHARM;
  if (s === "authority") return MODE.AUTH;
  if (s === "hold") return MODE.SCOUT;
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
    if (k === MODE.SCOUT) return "Scout";
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

window.setDefaultDrillConfig =
  window.setDefaultDrillConfig ||
  function setDefaultDrillConfig(overrides = {}) {
    const base = {
      focus: "read",
      pool: ["decider", "bargain_smart", "griever"],
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

        <!-- ✅ Premium intent extras (only visible when Premium is selected) -->
        <div id="premiumIntentBlock" class="hidden" style="margin-top:10px;color:#fff;">
          <input id="premiumLicenseCode" type="text" placeholder="Enter Premium code" />
          <div class="small" style="margin-top:8px;">
            Contact us for purchase:
            <a href="mailto:hello@bottlecaller.com" style="color:#fff;">hello@bottlecaller.com</a>
          </div>
        </div>

        <!-- Tabs UNDER fields -->
        <div class="tabs" id="roleTabs" style="margin-top:10px;">
          <button id="tabRoleWaiter" class="tab active" type="button">Waiter</button>
          <button id="tabRoleManager" class="tab" type="button">Manager</button>
        </div>

        <div class="tabs">
          <button id="tabModeLogin" class="tab active" type="button">Login</button>
          <button id="tabModeSignup" class="tab" type="button">Sign up</button>
        </div>

        <div id="displayNameWrap" class="hidden">
          <input id="authDisplayName" type="text" placeholder="Display name (optional)" />
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

      <p class="small">Default 15 seats • Invite required ON (editable in menu)</p>

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
      <div class="topbar">
        <div class="brand">
          <h2>BottleCaller</h2>
          <span id="premiumBadge" class="badge">PREMIUM</span>
        </div>
        <div class="row">
          <button id="btnOpenHud" class="btn-ghost" type="button">Menu</button>
          <button id="btnOpenMessages" class="btn-ghost" type="button">Messages</button>

          <button id="btnManagerBoard" class="btn-ghost" type="button">Manager Board</button>
          <button id="btnGoSetupPremium" class="btn-ghost" type="button">Setup</button>
          <button id="btnFiveMinRep" class="btn-ghost" type="button">5-Min Rep</button>

          <button id="btnLogoutPremium" class="btn-danger" type="button">Logout</button>
        </div>
      </div>

      <div id="bcProgressionCard" class="bc-prog-card">
        <div class="bc-prog-title">Progression Status</div>

        <div class="bc-prog-line">
          <div class="bc-prog-k">Level</div>
          <div id="bcProgLevelParent" class="bc-prog-v">Building recognition</div>
        </div>
        <div class="bc-prog-line">
          <div class="bc-prog-k">Focus</div>
          <div id="bcProgFocusParent" class="bc-prog-v">Reading guest intent</div>
        </div>
        <div class="bc-prog-line">
          <div class="bc-prog-k">Next</div>
          <div id="bcProgNextParent" class="bc-prog-v">Keep playing encounters</div>
        </div>

        <div id="bcProgNoteParent" class="bc-prog-note" style="display:none;"></div>
      </div>

      <div id="bcUnlockNotice" class="bc-unlock" style="display:none;"></div>

      <!-- Game lives here (isolated) -->
      <div id="premiumRoot"></div>
    </div>
  </section>

  <!-- PREMIUM SETUP (PARENT-OWNED) -->
  <section id="screenSetupPremium" class="screen hidden">
    <div class="panel">
      <h2>Setup</h2>
      <div class="score-row">Wines added: <span id="wineCountPremium">0 / 10</span></div>

      <div id="wineAdminPanel">
      <div class="manager-row">
        <input type="text" id="wineNameInputPremium" placeholder="Wine Name (required)" />
        <input type="text" id="wineVarietalInputPremium" placeholder="Varietal (required)" />
      </div>

      <div class="manager-row">
        <strong>Fruit Profile (choose up to 2):</strong>
        <div class="option-grid" id="fruitOptionsPremium"></div>
      </div>

      <div class="manager-row">
        <strong>Structure/Texture (choose up to 2):</strong>
        <div class="option-grid" id="textureOptionsPremium"></div>
      </div>

      <div class="manager-row">
        <strong>Oak Level (choose 1):</strong>
        <div class="option-grid" id="oakOptionsPremium"></div>
      </div>

      <div class="manager-row">
        <strong>Process (optional):</strong>
        <select id="processInputPremium">
          <option value="">Select process</option>
          <option value="Stainless steel">Stainless steel</option>
          <option value="Wild ferment">Wild ferment</option>
          <option value="Maceration">Maceration</option>
          <option value="Destemming">Destemming</option>
          <option value="Whole bunch pressed">Whole bunch pressed</option>
          <option value="Hand harvested">Hand harvested</option>
          <option value="Time on lees">Time on lees</option>
        </select>
        <input type="text" id="regionInputPremium" placeholder="Region (optional)" />
      </div>

      <div class="manager-row">
        <textarea id="storyInputPremium" placeholder="Story (optional, 1 sentence)"></textarea>
        <button id="addWineBtnPremium" type="button">Add Wine</button>
      </div>

      <div class="manager-panel">
        <h3>Wine List</h3>
        <table class="wine-table">
          <thead>
            <tr>
              <th>Name</th><th>Varietal</th><th>Fruit</th><th>Texture</th><th>Oak</th><th>Process</th><th>Region</th><th>Story</th><th>Action</th>
            </tr>
          </thead>
          <tbody id="premiumWineTableBody"></tbody>
        </table>
        <div id="premiumWineCards" class="wine-cards"></div>
      </div>
      </div>

      <div class="button-row">
        <button id="btnContinuePremium" type="button">Start</button>
        <button id="btnBackHomeFromSetupPremium" type="button">Back</button>
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
          <button id="btnLogoutManagerBoard" class="btn-danger" type="button">Logout</button>
        </div>
      </div>

      <div id="mbMenu" class="card" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <button class="btn" type="button" data-mbtab="overview">Overview</button>
        <button class="btn" type="button" data-mbtab="staff">Staff</button>
        <button class="btn" type="button" data-mbtab="insights">Insights</button>
        <button class="btn" type="button" data-mbtab="messenger">Messenger</button>
        <button class="btn" type="button" data-mbtab="billing">Listing</button>
        <button class="btn" type="button" data-mbtab="history">Performance</button>
      </div>

      <div id="mbPanels">
        <div id="mbTab_overview" class="mbTab">
          <div class="card">
            <div class="score-row">Restaurant: <span id="mbRestName">-</span></div>
            <div class="score-row">Total runs: <span id="mbRunsTotal">-</span></div>
            <div class="score-row">Total drills: <span id="mbDrillsTotal">-</span></div>
          </div>

          <div class="card" style="margin-top:12px;">
            <strong>This Week (Auto Summary)</strong>
            <div id="mbWeeklySummaryTop" class="small-text" style="margin-top:8px; opacity:.9;">
              Loading…
            </div>
          </div>

          <div style="margin-top:12px;">
            <div style="font-weight:600; margin-bottom:6px;">Best streaks</div>
            <div id="mbBestStreaks" style="opacity:.9;">-</div>
          </div>

          <div style="margin-top:12px;">
            <div style="font-weight:600; margin-bottom:6px;">Needs coaching</div>
            <div id="mbNeedsCoaching" style="opacity:.9;">-</div>
          </div>

          <div class="card">
            <h3 style="margin:0 0 8px 0;">Recent activity</h3>
            <div id="mbRecent" class="small" style="opacity:.9;">Loading…</div>
          </div>

          <div class="card" style="margin-top:12px;">
            <strong>Top Performers</strong>

            <div class="small-text" style="margin-top:6px; opacity:.85;">
              Average skill score based on recent encounters.
            </div>

            <div id="mbLeaderboard" style="margin-top:10px;"></div>
          </div>

          <div class="card" style="margin-top:12px;">
            <strong>Weekly Training Report</strong>

            <div class="small-text" style="margin-top:6px; opacity:.85;">
              Summary of team progress over the last 7 days.
            </div>

            <div id="mbWeeklyReport" style="margin-top:10px;">
              <div class="small-text" style="opacity:.7;">Loading report…</div>
            </div>
          </div>

          <div class="card" id="mbMembersCard" style="margin-top:12px;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
              <strong>Members</strong>
              <button id="mbRefreshMembers" class="btn" type="button">Refresh</button>
            </div>
            <div id="mbMembersMsg" class="small-text" style="margin-top:6px;"></div>
            <div id="mbMembersList" style="margin-top:10px; display:flex; flex-direction:column; gap:8px;"></div>
          </div>
        </div>

        <div id="mbTab_staff" class="mbTab hidden"></div>
        <div id="mbTab_insights" class="mbTab hidden"></div>
        <div id="mbTab_messenger" class="mbTab hidden">
          <div class="card" style="margin-top:12px;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
              <strong>Messenger</strong>
              <div style="display:flex; gap:8px; align-items:center;">
                <button id="mbMsgRefresh" class="btn-ghost" type="button">Refresh</button>
              </div>
            </div>

            <div class="small-text" style="margin-top:6px; opacity:.85;">
              Progress reports from staff + coaching replies. (Per active restaurant.)
            </div>

            <div style="display:grid; grid-template-columns: 280px 1fr; gap:12px; margin-top:12px;">
              <div style="border:1px solid rgba(255,255,255,0.10); border-radius:12px; overflow:hidden;">
                <div style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.10); font-weight:600;">
                  Staff Threads
                </div>

                <div id="mbThreadList" style="display:flex; flex-direction:column; gap:0;"></div>

                <div id="mbThreadEmpty" class="small-text" style="padding:10px; display:none; opacity:.8;">
                  No waiter threads yet.
                </div>
              </div>

              <div style="border:1px solid rgba(255,255,255,0.10); border-radius:12px; overflow:hidden; display:flex; flex-direction:column; min-height:520px;">
                <div style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.10);">
                  <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                    <strong id="mbThreadTitle">Select a waiter</strong>
                    <span id="mbThreadMeta" class="small-text" style="opacity:.75;"></span>
                  </div>
                </div>

                <div id="mbThreadMessages"
                  style="flex:1; padding:10px; display:flex; flex-direction:column; gap:8px; overflow-y:auto; min-height:280px;">
                  <div class="small-text" style="opacity:.8;">Select a waiter thread to view messages.</div>
                </div>

                <div style="padding:10px; border-top:1px solid rgba(255,255,255,0.10); display:flex; flex-direction:column; gap:10px;">
                  <div>
                    <strong>Suggested prompts</strong>
                    <div id="mbSuggestedPrompts" style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;"></div>
                  </div>

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

                  <div class="small-text" id="mbInstrStatus" style="opacity:.85;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="mbTab_billing" class="mbTab hidden">
          <div id="mbBillingAccess" class="card" style="margin-top:12px;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
              <strong>Billing & Access</strong>
              <span id="mbSeatStatus" class="badge">Seats: —</span>
            </div>

            <div class="small-text" id="mbSeatDetail" style="margin-top:6px;">
              Loading seat usage…
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
              <button id="mbSeat15" class="btn-ghost" type="button">Set seats: 15</button>
              <button id="mbSeat30" class="btn-ghost" type="button">Set seats: 30</button>
              <button id="mbSeat60" class="btn-ghost" type="button">Set seats: 60</button>
              <button id="mbRefreshSeats" class="btn-ghost" type="button">Refresh</button>
            </div>
          </div>
        </div>

        <div id="mbTab_history" class="mbTab hidden">
          <div class="card">
            <strong>Performance History</strong>
            <div class="small-text" style="margin-top:6px; opacity:.85;">
              Skill growth over time.
            </div>
            <select id="mbHistoryUser" class="input" style="margin-top:10px;"></select>
            <canvas id="mbHistoryChart"
              width="600"
              height="280"
              style="margin-top:12px;">
            </canvas>
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
      <div id="gameRootDemo" style="margin-top:10px;"></div>
      <div class="small" style="margin-top:8px;">
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

    <div id="waiterMessagesThread" style="margin-top:12px; display:flex; flex-direction:column; gap:8px;">
      <div class="small-text" style="opacity:.8;">No messages yet.</div>
    </div>

    <div style="margin-top:14px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.10);">
      <button id="btnWaiterSendProgress" class="btn-ghost" type="button">Send Progress</button>
      <div id="waiterSendProgressStatus" class="small-text" style="margin-top:6px; opacity:.85;"></div>
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
      <div id="hudJoinRow" class="hidden"><b>Join code:</b> <span id="hudJoinCode">-</span></div>

      <div><b>Seat limit:</b> <span id="hudSeatLimit">-</span></div>
      <div><b>Invite required:</b> <span id="hudRequireInvite">-</span></div>
    </div>
    <div id="hudSkillsCard" style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.10);">
      <div style="font-weight:600; margin-bottom:8px;">Your Skills</div>

      <div class="small-text" id="hudSkillSummary" style="margin-bottom:8px; opacity:.85;">
        Loading skill summary…
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px 12px; margin-bottom:10px;">
        <div class="small-text">Reading: <span id="hudSkillRead">0%</span></div>
        <div class="small-text">Framing: <span id="hudSkillFraming">0%</span></div>
        <div class="small-text">Delivery: <span id="hudSkillDelivery">0%</span></div>
        <div class="small-text">Recovery: <span id="hudSkillRecovery">0%</span></div>
        <div class="small-text">Closing: <span id="hudSkillClosing">0%</span></div>
      </div>

      <canvas id="hudSkillRadar" width="240" height="240" style="display:block; margin:0 auto;"></canvas>

      <div id="hudSkillTimeline" style="margin-top:12px;">

        <div style="font-weight:600; margin-bottom:6px;">Recent Progress</div>

        <div id="hudTimelineList" class="small-text" style="display:flex; flex-direction:column; gap:6px;">
          <div style="opacity:.7;">No history yet.</div>
        </div>

      </div>
    </div>
    <div style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.10);">
      <div style="font-weight:600; margin-bottom:8px;">Coach</div>
      <button id="btnHudSendProgress" class="btn-ghost" type="button">Send progress to manager</button>
      <div id="hudSendProgressStatus" class="small-text" style="margin-top:6px; opacity:.85;"></div>
    </div>

    <!-- Copy join code MANAGER ONLY -->
    <div id="hudCopyRow" class="row hidden" style="margin-top:10px;">
      <button id="btnCopyHudCode" type="button">Copy join code</button>
    </div>

    <div id="managerOnlyBlock" class="hidden">
      <hr style="opacity:.25; margin:12px 0;" />

      <h3 style="margin:0;">Manager controls</h3>

      <div style="margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <label style="font-size:12px; opacity:.9;">
          <input id="toggleRequireInvite" type="checkbox" />
          Require invite to join
        </label>
        <button id="btnSaveRequireInvite" class="btn-primary" type="button">Save</button>
      </div>

      <div style="margin-top:10px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <input id="seatLimitInput" type="number" placeholder="Seat limit" style="max-width:160px;" />
        <button id="btnSaveSeatLimit" class="btn-primary" type="button">Save seat limit</button>
        <span style="font-size:12px; opacity:.75;">(RLS may block updates — debug will show)</span>
      </div>

      <hr style="opacity:.25; margin:12px 0;" />
      <h3 style="margin:0;">Manager setup codes</h3>
      <div class="small-text" style="margin-top:6px; opacity:.9;">
        Redeem Group / Enterprise manager_setup codes.
      </div>
      <div class="card" style="margin-top:10px;">
        <strong>Group Manager Signup</strong>
        <div class="small-text" style="margin-top:6px;">
          Paste a GROUP manager_setup code to create/upgrade a manager scope for multi-restaurant control.
        </div>

        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
          <input id="mbGroupSetupCode" type="text" placeholder="GROUP_XXXXX" style="flex:1; min-width:220px;" />
          <button id="mbRedeemGroupSetup" class="btn-primary" type="button">Redeem</button>
        </div>

        <div id="mbGroupSetupMsg" class="small-text" style="margin-top:8px;"></div>
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

  <!-- MANAGER BOARD MODAL -->
  <!-- DEBUG PANEL -->
  <pre id="debugPanel"
    style="
      position: fixed; right: 12px; bottom: 12px;
      width: min(560px, 92vw);
      max-height: 42vh;
      overflow: auto;
      z-index: 99997;
      white-space: pre-wrap;
      background: rgba(0,0,0,0.92);
      color: #00ff66;
      padding: 10px;
      border-radius: 12px;
      font-size: 12px;
    "></pre>
`;

// ------------------------------------------------------------
// Debug + global crash catcher
// ------------------------------------------------------------
const debugEl = document.getElementById("debugPanel");
function setDebug(obj) {
  debugEl.textContent = JSON.stringify(obj, null, 2);
}
debugEl.textContent = "Debug panel live ✅";

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
};

const appState = {
  session: null,
  profile: null,
  restaurant: null,
  invites: [],
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

  setInterval(() => {
    const hasSession = !!window.appState?.session;
    if (!hasSession) {
      const premRoot = document.getElementById("premiumRoot");
      const hasFrame = !!document.getElementById("premiumRootFrame");
      const hasHtml = premRoot ? premRoot.innerHTML.trim().length > 0 : false;
      if (hasFrame || hasHtml) {
        killPremium("interval.detected_premium_without_session");
      }
    }
  }, 200);
})();

function isManagerRole(role) {
  return ["manager", "group_manager", "enterprise_admin"]
    .includes(String(role || "").toLowerCase());
}
function isUuid(s) {
  return typeof s === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}
function hasRestaurantBoundAccess() {
  const role = String(appState?.profile?.role || "").toLowerCase();
  const rid =
    window.getActiveRestaurantId?.() ||
    appState.activeRestaurantId ||
    appState.profile?.restaurant_id ||
    null;
  return isManagerRole(role) && isUuid(rid);
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

// ---- expose restaurantId getter globally (for debug + bridge) ----
window.getActiveRestaurantId =
  window.getActiveRestaurantId ||
  function getActiveRestaurantId() {
    const S = window.appState;
    return (
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
  const role = S?.profile?.role ?? null;
  const scopeId = S?.profile?.scope_id ?? null;
  const restaurantId = window.getActiveRestaurantId?.() ?? null;
  const mode = requestedMode ?? null;
  return { userId, restaurantId, scopeId, role, mode };
};

// ====== Wine Setup (PARENT) ======
const WINE_LIMIT = 10;
const FRUIT_OPTS = ["Red fruit","Dark fruit","Citrus","Stone fruit","Tropical","Floral","Herbal/Green","Spicy","Earthy/Savory","Smoky"];
const TEXTURE_OPTS = ["Silky","Chalky tannins","Firm tannins","Racy acidity","Creamy","Full-bodied","Medium-bodied","Light-bodied","Fresh","Bold"];
const OAK_OPTS = ["None","Light","Subtle","Noticeable"];

function getRestaurantIdOrNull() {
  return appState?.profile?.restaurant_id || null;
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

function renderWineTable(wines) {
  const body = document.getElementById("premiumWineTableBody");
  const cards = document.getElementById("premiumWineCards");
  if (body) body.innerHTML = "";
  if (cards) cards.innerHTML = "";

  renderWineCount(wines.length);

  wines.forEach((w) => {
    if (body) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(w.name)}</td>
        <td>${escapeHtml(w.varietal)}</td>
        <td>${escapeHtml((w.fruitTags || []).join(", "))}</td>
        <td>${escapeHtml((w.textureTags || []).join(", "))}</td>
        <td>${escapeHtml(w.oakLevel || "")}</td>
        <td>${escapeHtml(w.process || "")}</td>
        <td>${escapeHtml(w.region || "")}</td>
        <td>${escapeHtml(w.story || "")}</td>
        <td><button type="button" class="btn-danger" data-wine-del="${w.id}">Delete</button></td>
      `;
      body.appendChild(tr);
    }

    if (cards) {
      const div = document.createElement("div");
      div.className = "wine-card";
      div.innerHTML = `
        <div><strong>${escapeHtml(w.name)}</strong> — ${escapeHtml(w.varietal)}</div>
        <div>${escapeHtml((w.fruitTags || []).join(", "))} · ${escapeHtml((w.textureTags || []).join(", "))} · ${escapeHtml(w.oakLevel || "")}</div>
        <div>${escapeHtml(w.region || "")} ${w.process ? "· " + escapeHtml(w.process) : ""}</div>
        <div>${escapeHtml(w.story || "")}</div>
        <button type="button" class="btn-danger" data-wine-del="${w.id}">Delete</button>
      `;
      cards.appendChild(div);
    }
  });
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
    ...(g === "decider"
      ? {
          deciderMode: mode,
          deciderHookType: hookType,
          deciderHookText: hookText,
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
  const role = String(senderCtx?.role || "").toLowerCase();

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
    if (!allowedRoles.includes(role)) return reply("forbidden_role");
  }

  return { userId, restaurantId };
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
  "progression_snapshot_request",
  "debug_progress_payload",
  "debug_skill_tree",
]);

const DB_TYPES = new Set([
  "wines_request",
  "wines_mutate",
  "runs_count_request",
  "ritual_status_request",
  "event_log",
  "progression_snapshot_request",
  "progress_report_submit",
  "messages_unread_request",
  "message_mark_read",
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

  const mode = String(requestedMode || "").toLowerCase();
  const isDemo = mode === "demo";

  // DEMO: never attach to a real restaurant boundary
  if (isDemo) {
    return {
      userId,
      restaurantId: null,
      scopeId: null,
      role: profile?.role ?? null,
      mode: "demo",
      drill: null,
    };
  }

  const restaurantId = window.getActiveRestaurantId?.() ?? profile?.restaurant_id ?? null;
  if (!restaurantId) return null;

  return {
    userId,
    restaurantId,
    scopeId: profile?.scope_id ?? null,
    role: profile?.role ?? null,
    mode: requestedMode ?? null,
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
        restaurantId: ctx.restaurantId || null,
        role: ctx.role || null,
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

      const epoch = Number(window.__BC_IFRAME_EPOCH__ || 0);
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
      const rid = window.getActiveRestaurantId?.();
      const live = await getLiveSessionOrNull();
      if (live) window.appState.session = live;
      const ready =
        !!live &&
        !!window.appState?.profile?.role &&
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

    async function fetchRunsCount({ mode, msg, event }) {
      // 0) Source gate: only accept from current premium iframe
      const prem =
        document.getElementById("bcPremiumFrame") ||
        document.getElementById("premiumRootFrame");
      const isFromPremiumFrame = !!(prem && event?.source === prem.contentWindow);
      if (!isFromPremiumFrame) return 0;

      const senderCtx = getSourceCtx(event.source);
      // 1) Demo short-circuit
      if (isDemoMsg(msg, senderCtx)) return 0;

      // 2) Epoch guard (prevents ghosts / old iframe spam)
      if (rejectIfEpochMismatchSimple(msg)) return 0;

      // 3) Sender ctx validation (only trust senderCtx)
      const userId = senderCtx?.userId || null;
      const restaurantId = senderCtx?.restaurantId || null;
      if (!isUuid(userId) || !isUuid(restaurantId)) return 0;

      // 4) Live auth must exist AND match ctx.userId
      const live = await getLiveSessionOrNull();
      const authedUserId = live?.user?.id || null;
      if (!authedUserId || authedUserId !== userId) return 0;

      // keep parent appState synced (optional, but consistent)
      window.appState.session = live;

      // 5) DB query
      const { count, error } = await supabase
        .from("bc_encounter_resolutions_v2")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("restaurant_id", restaurantId);
      if (error) throw error;
      return Number(count || 0);
    }

    const handledTypes = new Set([
      BC_TYPES.LOGOUT_REQUEST,
      BC_TYPES.CTX_REQUEST,
      BC_TYPES.WINES_REQUEST,
      BC_TYPES.RUNS_COUNT_REQUEST,
      "logout",
    ]);
    window.__BC_BRIDGE_HANDLED_TYPES__ = handledTypes;

    const bridge = createBcBridge({
      allowedOrigin: window.location.origin,
      debug: true,
      handlers: {
        [BC_TYPES.LOGOUT_REQUEST]: makeLogoutHandler({ doLogout }),
        logout: makeLogoutHandler({ doLogout }),
        [BC_TYPES.CTX_REQUEST]: makeCtxHandler({ getBcCtx }),
        [BC_TYPES.WINES_REQUEST]: makeWinesHandler({ fetchWines }),
        [BC_TYPES.RUNS_COUNT_REQUEST]: makeRunsCountHandler({ fetchRunsCount }),
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

      if (msg.type === "logout" || msg.type === "bc_logout_request") {
        await doLogout("bc_msg_logout");
        return;
      }

      // Source gate: only accept messages from mounted premium iframe window.
      const frame =
        document.getElementById("bcPremiumFrame") ||
        document.getElementById("premiumRootFrame");
      if (!frame || event.source !== frame.contentWindow) return;

      if (msg.type === "debug_progress_payload") {
        console.log("[PARENT][DEBUG_PROGRESS_PAYLOAD]", msg.payload);
        return;
      }

      if (msg.type === "debug_skill_tree") {
        console.log("[PARENT][DEBUG_SKILL_TREE]", msg.tree);
        return;
      }

      // ✅ 1) ctx request MUST be handled before any other typed routing
      if (msg.type === "bc_ctx_request") {
        if (event.origin !== window.location.origin) {
          console.warn("[PARENT] denied bc_ctx_request: origin mismatch", event.origin);
          return;
        }
        const prem = document.getElementById("premiumRootFrame");
        const isFromPremiumFrame = !!(prem && event.source === prem.contentWindow);
        if (!isFromPremiumFrame) {
          console.warn("[PARENT] denied bc_ctx_request: not from current premium frame");
          return;
        }

        // Epoch gate: only respond to iframes created after last mount.
        const epoch = Number(window.__BC_IFRAME_EPOCH__ || 0);
        const msgEpoch = Number(msg?.epoch || 0);
        if (msgEpoch !== epoch) {
          console.warn("[PARENT] denied bc_ctx_request: epoch mismatch", { msgEpoch, epoch });
          return;
        }

        const requestedMode =
          String(msg?.mode || msg?.requestedMode || "").toLowerCase();
        const isFromIframe = !!event.source && event.source !== window;
        if (!isFromIframe) return;

        if (requestedMode === "demo") {
          window.__BC_LAST_CTX_MODE__ = "demo";
          const demoCtx = await buildBcCtxSafe("demo");
          if (!demoCtx?.userId || !demoCtx?.role) return;
          try {
            event.source?.postMessage(
              {
                source: "BC_MSG",
                v: 1,
                type: "bc_ctx",
                ...demoCtx,
                drill: null,
              },
              event.origin
            );
            setSourceCtx(event.source, demoCtx);
          } catch (e) {
            console.warn("[PARENT] failed to send bc_ctx demo", e);
          }
          return;
        }

        try {
          if (window.__BC_ACTIVE_REST_READY__) {
            await Promise.race([
              window.__BC_ACTIVE_REST_READY__,
              new Promise((r) => setTimeout(r, 600))
            ]);
          }
        } catch {}

        const needRestaurant = requestedMode !== "demo";
        const effectiveRid =
          window.getActiveRestaurantId?.() ??
          window.appState?.profile?.restaurant_id ??
          null;
        const live = await getLiveSessionOrNull();
        if (live) window.appState.session = live;
        const ready =
          !!live &&
          !!window.appState?.profile?.role &&
          (needRestaurant ? !!effectiveRid : true);

        if (!ready) {
          console.warn("[PARENT] ctx not ready — ask iframe to retry");
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
          return;
        }
        const bcCtx = await buildBcCtxSafe(msg?.mode ?? null);
        if (!bcCtx) {
          console.warn("[PARENT] buildBcCtxSafe returned null — ask iframe to retry");
          try {
            event.source?.postMessage(
              {
                source: "BC_MSG",
                v: 1,
                type: "ctx_not_ready",
                ok: false,
                epoch: Number(window.__BC_IFRAME_EPOCH__ || 0),
                retryAfterMs: 250,
                why: "ctx_build_null",
              },
              event.origin
            );
          } catch {}
          return;
        }
        window.__BC_LAST_CTX_MODE__ = requestedMode || "premium";
        bcCtx.drill = window.__BC_DRILL_CONFIG__ || window.BC_DRILL_CONFIG || null;

        console.log("[PARENT] bc_ctx_request -> reply", {
          requested: msg?.mode ?? null,
          bcCtx,
        });

        if (!bcCtx?.userId || !bcCtx?.role || (!bcCtx?.restaurantId && requestedMode !== "demo")) {
          console.warn("[PARENT] refusing to send null/partial bc_ctx", bcCtx);
          return;
        }

        console.log("[PARENT] sending bc_ctx (request path)", {
          hasDrill: !!bcCtx?.drill,
          drill: bcCtx?.drill,
          to: event.origin
        });

        try {
          event.source?.postMessage(
            { source: "BC_MSG", v: 1, type: "bc_ctx", ...bcCtx },
            event.origin
          );
          setSourceCtx(event.source, bcCtx);
        } catch (e) {
          console.warn("[PARENT] failed to send bc_ctx premium", e);
        }

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

      // RUNS COUNT: iframe asks parent -> parent queries supabase -> reply
      if (msg.type === "runs_count_request") {
        const replyType = "runs_count_response";
        const reqId = msg?.reqId || null;
        try {
          // 0) Demo short-circuit
          if (isDemoMsg(msg, senderCtx)) {
            event.source?.postMessage(
              { source: "BC_MSG", v: 1, type: replyType, reqId, ok: true, count: 0, demo: true },
              event.origin
            );
            return;
          }

          // 1) Epoch guard (prevents ghosts / old iframes)
          if (rejectIfEpochMismatch(event, msg, replyType, { reqId, count: 0 })) return;

          // 2) Validate sender-bound ctx (restaurant required)
          const ctx = getSenderCtxOrReject(event, senderCtx, replyType, { reqId, count: 0 }, {
            requireRestaurant: true,
            allowedRoles: ["waiter", "manager", "group_manager", "admin"],
          });
          if (!ctx) return;

          // 3) Live auth must exist AND match ctx.userId
          const authed = liveAuth?.userId || null;
          if (!authed) throw new Error("no_session");
          if (String(authed) !== String(ctx.userId)) {
            event.source?.postMessage(
              { source: "BC_MSG", v: 1, type: replyType, reqId, ok: false, count: 0, error: "forbidden_user" },
              event.origin
            );
            return;
          }

          // 4) DB query
          const { count, error } = await supabase
            .from("bc_encounter_resolutions_v2")
            .select("*", { count: "exact", head: true })
            .eq("user_id", ctx.userId)
            .eq("restaurant_id", ctx.restaurantId);

          if (error) throw error;

          // 5) Reply
          event.source?.postMessage(
            { source: "BC_MSG", v: 1, type: replyType, reqId, ok: true, count: Number(count || 0) },
            event.origin
          );
          return;
        } catch (e) {
          event.source?.postMessage(
            { source: "BC_MSG", v: 1, type: replyType, reqId, ok: false, count: 0, error: e?.message || String(e) },
            event.origin
          );
          return;
        }
      }

      if (msg.type === "ritual_status_request") {
        const replyType = "ritual_status_response";
        const reqId = msg.reqId || null;
        try {
          // 0) Demo short-circuit
          if (isDemoMsg(msg, senderCtx)) {
            event.source?.postMessage(
              { source: "BC_MSG", v: 1, type: replyType, reqId, ok: true, doneToday: false, demo: true },
              event.origin
            );
            return;
          }

          // 1) Epoch guard (prevents ghosts / old iframes)
          if (rejectIfEpochMismatch(event, msg, replyType, { reqId, doneToday: false })) return;

          // 2) Validate sender-bound ctx (restaurant required)
          const ctx = getSenderCtxOrReject(event, senderCtx, replyType, { reqId, doneToday: false }, {
            requireRestaurant: true,
            allowedRoles: ["waiter", "manager", "group_manager", "admin"],
          });
          if (!ctx) return;

          // 3) Live auth must exist AND match ctx.userId
          const authed = liveAuth?.userId || null;
          if (!authed) throw new Error("no_session");
          if (String(authed) !== String(ctx.userId)) throw new Error("forbidden_user");

          // 4) Compute "today" start in ZA timezone (midnight ZA)
          const now = new Date();
          const zaNow = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Johannesburg" }));
          const startZA = new Date(zaNow);
          startZA.setHours(0, 0, 0, 0);
          const startIso = startZA.toISOString();

          // 5) Query (exists check)
          const { data, error } = await supabase
            .from("bc_event_log")
            .select("id")
            .eq("event_type", "ritual_completed")
            .eq("user_id", ctx.userId)
            .eq("restaurant_id", ctx.restaurantId)
            .gte("occurred_at", startIso)
            .limit(1);

          if (error) throw error;
          const doneToday = Array.isArray(data) && data.length > 0;

          // 6) Reply
          event.source?.postMessage(
            { source: "BC_MSG", v: 1, type: replyType, reqId, ok: true, doneToday },
            event.origin
          );
          return;
        } catch (e) {
          event.source?.postMessage(
            {
              source: "BC_MSG",
              v: 1,
              type: replyType,
              reqId,
              ok: false,
              doneToday: false,
              error: e?.message || String(e),
            },
            event.origin
          );
          return;
        }
      }

      if (msg.type === "wines_request") {
        const replyType = "wines_report";
        const reqId = msg.reqId || null;

        // 0) Demo short-circuit
        if (isDemoMsg(msg, senderCtx)) {
          event.source?.postMessage(
            { source: "BC_MSG", v: 1, type: replyType, reqId, ok: true, demo: true, wines: [] },
            event.origin
          );
          return;
        }

        try {
          // 1) Epoch guard (prevents ghosts / old iframes)
          if (rejectIfEpochMismatch(event, msg, replyType, { reqId, wines: [] })) return;

          // 2) Validate sender-bound ctx (restaurant required)
          const ctx = getSenderCtxOrReject(
            event,
            senderCtx,
            replyType,
            { reqId, wines: [] },
            { requireRestaurant: true, allowedRoles: ["waiter", "manager", "group_manager", "admin"] }
          );
          if (!ctx) return;

          // 3) Live auth must exist AND match ctx.userId
          const authed = liveAuth?.userId || null;
          if (!authed) throw new Error("no_session");
          if (String(authed) !== String(ctx.userId)) throw new Error("forbidden_user");

          // 4) Query
          const { data, error } = await supabase
            .from("bc_wines")
            .select("*")
            .eq("restaurant_id", ctx.restaurantId)
            .order("created_at", { ascending: true });
          if (error) throw error;

          // 5) Reply
          event.source?.postMessage(
            {
              source: "BC_MSG",
              v: 1,
              type: replyType,
              reqId,
              ok: true,
              wines: data || [],
            },
            event.origin
          );
        } catch (e) {
          event.source?.postMessage(
            {
              source: "BC_MSG",
              v: 1,
              type: replyType,
              reqId,
              ok: false,
              error: e?.message || String(e),
              wines: [],
            },
            event.origin
          );
        }
        return;
      }

      if (msg.type === "wines_mutate") {
        const replyType = "wines_mutate_result";
        const reqId = msg.reqId || null;
        const action = String(msg.action || "");
        const payload = msg.payload || {};
        // 0) Demo short-circuit
        if (isDemoMsg(msg, senderCtx)) {
          event.source?.postMessage(
            { source: "BC_MSG", v: 1, type: replyType, reqId, ok: true, demo: true },
            event.origin
          );
          return;
        }

        // 1) Epoch guard
        if (rejectIfEpochMismatch(event, msg, replyType, { reqId })) return;

        try {
          // 1.5) Action guard (nice error)
          if (!action) throw new Error("missing_action");

          // 2) Validate sender ctx + role gate
          const ctx = getSenderCtxOrReject(
            event,
            senderCtx,
            replyType,
            { reqId },
            { requireRestaurant: true, allowedRoles: ["manager", "group_manager", "admin"] }
          );
          if (!ctx) return;

          // 3) Live auth (should already exist from DB gate)
          const rid = ctx.restaurantId;
          const userId = liveAuth?.userId || null;
          if (!userId) {
            event.source?.postMessage(
              { source: "BC_MSG", v: 1, type: replyType, reqId, ok: false, error: "no_session" },
              event.origin
            );
            return;
          }
          if (String(userId) !== String(ctx.userId)) {
            event.source?.postMessage(
              { source: "BC_MSG", v: 1, type: replyType, reqId, ok: false, error: "forbidden_user" },
              event.origin
            );
            return;
          }

          // 4) Mutations
          if (action === "add") {
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
            const wineId = payload?.id;
            if (!wineId) throw new Error("missing_wine_id");
            const { error } = await supabase
              .from("bc_wines")
              .update({
                name: payload?.name || "",
                varietal: payload?.varietal || "",
                fruit_tags: payload?.fruit_tags || [],
                texture_tags: payload?.texture_tags || [],
                oak_level: payload?.oak_level || "",
                process: payload?.process || "",
                region: payload?.region || "",
                story: payload?.story || "",
              })
              .eq("id", wineId)
              .eq("restaurant_id", rid);
            if (error) throw error;
          } else if (action === "delete") {
            const wineId = payload?.wineId || payload?.id;
            if (!wineId) throw new Error("missing_wine_id");
            const { error } = await supabase
              .from("bc_wines")
              .delete()
              .eq("id", wineId)
              .eq("restaurant_id", rid);
            if (error) throw error;
          } else if (action === "delete_all") {
            const { error } = await supabase.from("bc_wines").delete().eq("restaurant_id", rid);
            if (error) throw error;
          } else {
            throw new Error("unsupported_action");
          }

          // 5) Reply
          event.source?.postMessage(
            { source: "BC_MSG", v: 1, type: replyType, reqId, ok: true },
            event.origin
          );
          return;
        } catch (e) {
          event.source?.postMessage(
            {
              source: "BC_MSG",
              v: 1,
              type: replyType,
              reqId,
              ok: false,
              error: e?.message || String(e),
            },
            event.origin
          );
          return;
        }
      }

      if (msg.type === "messages_unread_request") {
        const replyType = "messages_unread_response";
        const reqId = msg?.reqId || null;
        try {
          // 0) Demo short-circuit
          if (isDemoMsg(msg, senderCtx)) {
            event.source?.postMessage(
              { source: "BC_MSG", v: 1, type: replyType, reqId, ok: true, rows: [], demo: true },
              event.origin
            );
            return;
          }

          // 1) Epoch guard
          if (rejectIfEpochMismatch(event, msg, replyType, { reqId, rows: [] })) return;

          // 2) Validate sender ctx
          const ctx = getSenderCtxOrReject(
            event,
            senderCtx,
            replyType,
            { reqId, rows: [] },
            { requireRestaurant: true, allowedRoles: ["waiter", "manager", "group_manager", "enterprise_admin", "admin"] }
          );
          if (!ctx) return;

          // 3) Live auth must match ctx.userId
          const authed = liveAuth?.userId || null;
          if (!authed) throw new Error("no_session");
          if (String(authed) !== String(ctx.userId)) throw new Error("forbidden_user");

          // 4) Query unread manager->staff messages for active restaurant
          const { data, error } = await supabase
            .from("bc_messages_v1")
            .select("id, type, body, payload, sender_user_id, sender_role, receiver_user_id, created_at, restaurant_id, scope_id, scope_type")
            .eq("receiver_user_id", ctx.userId)
            .eq("restaurant_id", ctx.restaurantId)
            .is("archived_at", null)
            .is("read_at", null)
            .order("created_at", { ascending: true })
            .limit(25);
          if (error) throw error;

          event.source?.postMessage(
            { source: "BC_MSG", v: 1, type: replyType, reqId, ok: true, rows: data || [] },
            event.origin
          );
          return;
        } catch (e) {
          event.source?.postMessage(
            { source: "BC_MSG", v: 1, type: replyType, reqId, ok: false, rows: [], error: e?.message || String(e) },
            event.origin
          );
          return;
        }
      }

      if (msg.type === "message_mark_read") {
        const replyType = "message_mark_read_result";
        const reqId = msg?.reqId || null;
        const id = msg?.id || null;
        try {
          // 0) Demo short-circuit
          if (isDemoMsg(msg, senderCtx)) {
            event.source?.postMessage(
              { source: "BC_MSG", v: 1, type: replyType, reqId, ok: true, demo: true, id },
              event.origin
            );
            return;
          }

          // 1) Epoch guard
          if (rejectIfEpochMismatch(event, msg, replyType, { reqId, id })) return;

          // 2) Validate sender ctx
          const ctx = getSenderCtxOrReject(
            event,
            senderCtx,
            replyType,
            { reqId, id },
            { requireRestaurant: true, allowedRoles: ["waiter", "manager", "group_manager", "enterprise_admin", "admin"] }
          );
          if (!ctx) return;

          // 3) Live auth must match ctx.userId
          const authed = liveAuth?.userId || null;
          if (!authed) throw new Error("no_session");
          if (String(authed) !== String(ctx.userId)) throw new Error("forbidden_user");
          if (!id) throw new Error("missing_id");

          // 4) Mark read (receiver only, same restaurant only)
          const { error } = await supabase
            .from("bc_messages_v1")
            .update({ read_at: new Date().toISOString() })
            .eq("id", id)
            .eq("receiver_user_id", ctx.userId);
          if (error) throw error;

          event.source?.postMessage(
            { source: "BC_MSG", v: 1, type: replyType, reqId, ok: true, id },
            event.origin
          );
          return;
        } catch (e) {
          event.source?.postMessage(
            { source: "BC_MSG", v: 1, type: replyType, reqId, ok: false, id, error: e?.message || String(e) },
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

      if (msg.type === "event_log") {
        const replyType = "event_log_ack";
        const eventType = msg?.eventType || null;
        if (isDemoMsg(msg, senderCtx)) {
          event.source?.postMessage(
            { source: "BC_MSG", v: 1, type: replyType, ok: true, demo: true, eventType },
            event.origin
          );
          return;
        }
        if (rejectIfEpochMismatch(event, msg, replyType, { eventType })) return;

        const ctx = getSenderCtxOrReject(
          event,
          senderCtx,
          replyType,
          { eventType },
          { requireRestaurant: true, allowedRoles: ["waiter", "manager", "group_manager", "admin"] }
        );
        if (!ctx) return;

        const authed = liveAuth?.userId || null;
        if (!authed) {
          event.source?.postMessage(
            { source: "BC_MSG", v: 1, type: replyType, ok: false, error: "no_session", eventType },
            event.origin
          );
          return;
        }
        if (String(authed) !== String(ctx.userId)) {
          event.source?.postMessage(
            { source: "BC_MSG", v: 1, type: replyType, ok: false, error: "forbidden_user", eventType },
            event.origin
          );
          return;
        }

        try {
          await handleEventLog({
            msg,
            event,
            supabase,
            tagSource,
            ctx,
            replyType,
          });
        } catch (e) {
          event.source?.postMessage(
            { source: "BC_MSG", v: 1, type: replyType, ok: false, error: e?.message || String(e), eventType },
            event.origin
          );
        }
        return;
      }

      if (msg.type === "progress_report_submit") {
        const replyType = "progress_report_submit_result";
        const reqId = msg?.reqId || null;

        try {
          // 0) Demo short-circuit
          if (isDemoMsg(msg, senderCtx)) {
            event.source?.postMessage(
              { source: "BC_MSG", v: 1, type: replyType, reqId, ok: true, demo: true, inserted: 0 },
              event.origin
            );
            return;
          }

          // 1) Epoch guard
          if (rejectIfEpochMismatch(event, msg, replyType, { reqId, inserted: 0 })) return;

          // 2) Validate sender-bound ctx (restaurant required)
          const ctx = getSenderCtxOrReject(
            event,
            senderCtx,
            replyType,
            { reqId, inserted: 0 },
            { requireRestaurant: true, allowedRoles: ["waiter", "manager", "group_manager", "admin"] }
          );
          if (!ctx) return;

          // 3) Live auth must exist AND match ctx.userId
          const authed = liveAuth?.userId || null;
          if (!authed) throw new Error("no_session");
          if (String(authed) !== String(ctx.userId)) throw new Error("forbidden_user");

          // 4) Resolve scope defaults
          const scopeType =
            String(msg?.scope_type || ctx.scopeType || "restaurant").toLowerCase();

          const scopeId =
            msg?.scope_id ||
            ctx.scopeId ||
            ctx.restaurantId;

          const body = String(msg?.body || "Progress report").slice(0, 2000);
          const payload = msg?.payload ?? null;

          // 5) Call RPC that inserts one message per manager target
          const { data, error } = await supabase.rpc("bc_send_progress_report_v1", {
            p_scope_type: scopeType,
            p_scope_id: scopeId,
            p_restaurant_id: ctx.restaurantId,
            p_body: body,
            p_payload: payload,
          });

          if (error) throw error;

          const inserted = Number(data || 0);

          try {
            const p = msg?.payload || {};
            const skills = p?.skills || {};

            const snapCtx = getSenderCtxOrReject(
              event,
              senderCtx,
              "progress_report_submit_result",
              { reqId: msg?.reqId || null },
              { requireRestaurant: true, allowedRoles: ["waiter", "manager", "group_manager", "admin"] }
            );
            if (snapCtx) {
              const { error: snapError } = await supabase.from("bc_skill_snapshots_v1").insert({
                user_id: snapCtx.userId,
                restaurant_id: snapCtx.restaurantId,
                scope_id: snapCtx.scopeId || null,

                encounter_number: p?.encounterNumber ?? null,
                guest_state: p?.guestStateActual ?? null,
                difficulty: p?.difficulty ?? null,
                chain_signal: p?.chainSignal ?? null,
                chain_score: p?.chainScore ?? null,

                read_pct: skills.read ?? 0,
                framing_pct: skills.framing ?? 0,
                delivery_pct: skills.delivery ?? 0,
                recovery_pct: skills.recovery ?? 0,
                closing_pct: skills.closing ?? 0,

                strongest_skill: p?.strongestSkill ?? null,
                weakest_skill: p?.weakestSkill ?? null,

                payload: p
              });

              if (snapError) {
                console.warn("[SNAPSHOT] parent insert failed", snapError);
              } else {
                console.log("[SNAPSHOT] parent insert success ✅", {
                  userId: snapCtx.userId,
                  restaurantId: snapCtx.restaurantId,
                  encounterNumber: p?.encounterNumber
                });

                try {
                  const { data: recentDrill, error: recentDrillError } = await supabase
                    .from("bc_drill_runs_v1")
                    .select("id, focus, completed_at, effectiveness_delta")
                    .eq("user_id", snapCtx.userId)
                    .eq("restaurant_id", snapCtx.restaurantId)
                    .eq("completed", true)
                    .is("effectiveness_delta", null)
                    .order("completed_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                  if (!recentDrillError && recentDrill?.id && recentDrill?.focus) {
                    const focusMap = {
                      read: "read",
                      frame: "framing",
                      framing: "framing",
                      delivery: "delivery",
                      recovery: "recovery",
                      closing: "closing"
                    };

                    const skillKey = focusMap[String(recentDrill.focus || "").toLowerCase()] || null;
                    const currentSkillValue = skillKey ? Number(skills?.[skillKey] || 0) : null;

                    if (skillKey && currentSkillValue !== null) {
                      const { data: beforeSnap, error: beforeSnapError } = await supabase
                        .from("bc_skill_snapshots_v1")
                        .select("read_pct, framing_pct, delivery_pct, recovery_pct, closing_pct, created_at")
                        .eq("user_id", snapCtx.userId)
                        .eq("restaurant_id", snapCtx.restaurantId)
                        .lt("created_at", recentDrill.completed_at)
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .maybeSingle();

                      if (!beforeSnapError && beforeSnap) {
                        const beforeMap = {
                          read: Number(beforeSnap.read_pct || 0),
                          framing: Number(beforeSnap.framing_pct || 0),
                          delivery: Number(beforeSnap.delivery_pct || 0),
                          recovery: Number(beforeSnap.recovery_pct || 0),
                          closing: Number(beforeSnap.closing_pct || 0)
                        };

                        const beforeValue = Number(beforeMap[skillKey] || 0);
                        const delta = currentSkillValue - beforeValue;

                        const note =
                          delta > 0
                            ? `${skillKey} improved +${delta}% after ${recentDrill.focus} drill`
                            : delta < 0
                              ? `${skillKey} changed ${delta}% after ${recentDrill.focus} drill`
                              : `${skillKey} stayed flat after ${recentDrill.focus} drill`;

                        const { error: effError } = await supabase
                          .from("bc_drill_runs_v1")
                          .update({
                            effectiveness_delta: delta,
                            effectiveness_note: note
                          })
                          .eq("id", recentDrill.id);

                        if (effError) {
                          console.warn("[DRILL EFFECT] update failed", effError);
                        } else {
                          console.log("[DRILL EFFECT] updated ✅", {
                            drillRunId: recentDrill.id,
                            delta,
                            note
                          });

                          const { error: insightMsgError } = await supabase.from("bc_messages_v1").insert({
                            scope_type: "restaurant",
                            scope_id: snapCtx.restaurantId,
                            restaurant_id: snapCtx.restaurantId,
                            sender_user_id: snapCtx.userId,
                            receiver_user_id: snapCtx.userId,
                            sender_role: "system",
                            type: "drill_effectiveness",
                            body: note,
                            payload: {
                              drillRunId: recentDrill.id,
                              focus: recentDrill.focus,
                              delta,
                              skillKey
                            }
                          });

                          if (insightMsgError) {
                            console.warn("[DRILL EFFECT] insight message insert failed", insightMsgError);
                          }
                        }
                      }
                    }
                  }
                } catch (e) {
                  console.warn("[DRILL EFFECT] exception", e);
                }
              }
            }
          } catch (e) {
            console.warn("[SNAPSHOT] parent insert exception", e);
          }

          // 6) Reply
          event.source?.postMessage(
            { source: "BC_MSG", v: 1, type: replyType, reqId, ok: true, inserted },
            event.origin
          );

          return;
        } catch (e) {
          event.source?.postMessage(
            { source: "BC_MSG", v: 1, type: replyType, reqId, ok: false, inserted: 0, error: e?.message || String(e) },
            event.origin
          );
          return;
        }
      }

      if (msg.type === "drill_run_started") {
        console.log("[PARENT] drill_run_started received ✅", { msg });
        return;
      }

      if (msg.type === "drill_run_completed") {
        console.log("[PARENT] drill_run_completed received ✅", { msg, senderCtx });

        const ctx = getSenderCtxOrReject(
          event,
          senderCtx,
          "drill_run_completed_result",
          {},
          { requireRestaurant: true, allowedRoles: ["waiter", "manager", "group_manager", "admin"] }
        );
        if (!ctx) {
          console.warn("[DRILL RUN] ctx rejected");
          return;
        }

        const p = msg?.payload || {};
        const assignedMessageId = msg?.assignedMessageId || null;

        if (!assignedMessageId) {
          console.warn("[DRILL RUN] missing assignedMessageId");
          return;
        }

        // 1) Look up the original drill assignment row
        const { data: assignedMsg, error: assignedErr } = await supabase
          .from("bc_messages_v1")
          .select("id, sender_user_id, receiver_user_id, restaurant_id, type, body, payload")
          .eq("id", assignedMessageId)
          .eq("type", "drill_override")
          .maybeSingle();

        if (assignedErr) {
          console.warn("[DRILL RUN] assigned message lookup failed", assignedErr);
          return;
        }

        if (!assignedMsg?.id) {
          console.warn("[DRILL RUN] assigned drill message not found", { assignedMessageId });
          return;
        }

        // sender_user_id on the drill_override row is the manager who assigned it
        const managerUserId = assignedMsg.sender_user_id || null;
        if (!managerUserId) {
          console.warn("[DRILL RUN] assigned drill message has no sender_user_id", assignedMsg);
          return;
        }

        const body = `Drill completed • ${p?.focus || "drill"} • ${p?.repsDone ?? 0}/${p?.repTarget ?? 0} reps`;

        const completionRow = {
          scope_type: "restaurant",
          scope_id: ctx.restaurantId,
          restaurant_id: ctx.restaurantId,
          sender_user_id: ctx.userId,
          receiver_user_id: managerUserId,
          sender_role: "waiter",
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
          return;
        }

        console.log("[DRILL RUN] drill_completed message inserted ✅", {
          managerUserId,
          assignedMessageId
        });

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
          setAll("Could not send progress.");
        }

        return;
      }

      if (msg.type === "progression_snapshot_request") {
        const replyType = "progression_snapshot";
        const reqId = msg?.reqId || null;

        if (!senderCtx) {
          event.source?.postMessage(
            {
              source: "BC_MSG",
              v: 1,
              type: "ctx_not_ready",
              ok: false,
              reason: "no_sender_ctx",
              epoch: Number(window.__BC_IFRAME_EPOCH__ || 0),
              retryAfterMs: 250,
              why: "no_sender_ctx",
            },
            event.origin
          );
          return;
        }

        if (isDemoMsg(msg, senderCtx)) {
          event.source?.postMessage(
            {
              source: "BC_MSG",
              v: 1,
              type: replyType,
              reqId,
              ok: true,
              demo: true,
              tierToServe: 1,
              reasons: [],
              reasonsHuman: [],
              snapshot: {
                encountersTotal: 0,
                last10Count: 0,
                last10Greens: 0,
                last10Reds: 0,
                anyRedT2Plus: false,
                pivotsTaken: 0,
                pivotsSuccess: 0,
              },
            },
            event.origin
          );
          return;
        }

        if (rejectIfEpochMismatch(event, msg, replyType, { reqId })) return;

        const ctx = getSenderCtxOrReject(
          event,
          senderCtx,
          replyType,
          { reqId },
          { requireRestaurant: true, allowedRoles: ["waiter", "manager", "group_manager", "admin"] }
        );
        if (!ctx) return;

        try {
          const rid = window.getActiveRestaurantId?.();
          const ready =
            !!window.appState?.session &&
            !!window.appState?.profile?.role &&
            !!rid;
          if (!ready) {
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
            return;
          }

          const authed = liveAuth?.userId || null;
          if (!authed) throw new Error("no_session");
          if (String(authed) !== String(ctx.userId)) throw new Error("forbidden_user");
          const desiredTier = Number(msg?.desiredTier || 3);
          const result = await buildProgressionResult({
            userId: ctx.userId,
            restaurantId: ctx.restaurantId,
            desiredTier: desiredTier === 1 ? 1 : desiredTier === 2 ? 2 : 3,
          });

          event.source?.postMessage(
            {
              source: "BC_MSG",
              v: 1,
              type: replyType,
              reqId,
              ok: true,
              tierToServe: result?.tierToServe ?? 1,
              reasons: result?.reasons || [],
              reasonsHuman: result?.reasonsHuman || [],
              snapshot: result?.snapshot || null,
            },
            event.origin
          );
        } catch (e) {
          event.source?.postMessage(
            {
              source: "BC_MSG",
              v: 1,
              type: replyType,
              reqId,
              ok: false,
              error: e?.message || String(e),
            },
            event.origin
          );
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
async function buildProgressionResult({ userId, restaurantId, desiredTier = 3 }) {
  return await decideAllowedTier({
    desiredTier: desiredTier === 1 ? 1 : desiredTier === 2 ? 2 : 3,
    userId,
    restaurantId,
  });
}

window.__BC_GET_PROGRESSION_SNAPSHOT__ = async ({ userId, restaurantId }) => {
  // Basic sanity
  if (!userId || !restaurantId) return null;

  // IMPORTANT: do NOT trust caller userId; force current authed user
  const authedUserId = appState.session?.user?.id || null;
  const authedRestaurantId = appState.profile?.restaurant_id || null;

  if (!authedUserId) return null;
  if (authedUserId !== userId) return null;                 // prevent spoofing
  if (authedRestaurantId !== restaurantId) return null;     // prevent spoofing

  const result = await buildProgressionResult({ userId, restaurantId, desiredTier: 3 });
  return result?.snapshot || null;
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
  const role = String(appState?.profile?.role || "").toLowerCase();
  const isWaiter = role === "waiter";

  const isPremium = id === "screenPremiumApp" || id === "screenPlay";
  if (isPremium && !appState?.session) {
    console.warn("[NAV] blocked premium mount: no session");
    showScreen("screenHome");
    return;
  }
  setPremiumOverlayActive(isPremium);

  if (isPremium) {
    if (!document.getElementById("premiumRootFrame")) {
      mountPremiumGameIframe({
        showBack: true,
        backTo: isWaiter ? "screenPremiumApp" : "screenManagerBoard"
      });
    }
  }

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

function applyRoleTemplateGates() {
  if (isHardLoggedOut()) return;

  const role = String(appState?.profile?.role || "").toLowerCase();
  const isWaiter = role === "waiter";

  const idsToHideForWaiter = [
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
    if (el) el.style.display = isWaiter ? "none" : "";
  });

  document.querySelectorAll('[data-nav="screenSetupPremium"]').forEach((el) => {
    el.style.display = isWaiter ? "none" : "";
    el.style.pointerEvents = isWaiter ? "none" : "";
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
    const userId = appState.session?.user?.id || null;
    const restaurantId = appState.profile?.restaurant_id || null;

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
    const result = await decideAllowedTier({
      desiredTier,
      userId,
      restaurantId,
      role: appState.profile?.role,
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

    const wines = Array.isArray(res.data) ? res.data : [];
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
  return data || [];
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
  showScreen("screenSetupPremium");

  const restaurantId = getRestaurantIdOrNull();
  if (!restaurantId) {
    renderWineCount(0);
    renderWineTable([]);
    return;
  }

  let fruitSel = [];
  let textureSel = [];
  let oakSel = "";

  setupMultiSelectGrid("fruitOptionsPremium", FRUIT_OPTS, 2, () => fruitSel, (v) => (fruitSel = v));
  setupMultiSelectGrid("textureOptionsPremium", TEXTURE_OPTS, 2, () => textureSel, (v) => (textureSel = v));
  setupSingleSelectGrid("oakOptionsPremium", OAK_OPTS, () => oakSel, (v) => (oakSel = v));

  const winesRaw = await fetchParentRestaurantWines(restaurantId);
  const wines = (winesRaw || []).map(normalizeWineRow);
  renderWineTable(wines.slice(0, WINE_LIMIT));

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
        renderWineTable(refreshed.slice(0, WINE_LIMIT));
      } catch (e) {
        console.error("[BC] add wine failed", e);
        alert("Failed to save wine.");
      }
    });
  }

  const body = document.getElementById("premiumWineTableBody");
  const cards = document.getElementById("premiumWineCards");
  const bindDeleteDelegation = (root) => {
    if (!root || root.__bcBound) return;
    root.__bcBound = true;
    root.addEventListener("click", async (ev) => {
      const btn = ev.target?.closest?.("[data-wine-del]");
      const wineId = btn?.getAttribute?.("data-wine-del");
      if (!wineId) return;
      if (!confirm("Delete this wine?")) return;

      try {
        await deleteParentRestaurantWine(wineId);
        const refreshedRaw = await fetchParentRestaurantWines(restaurantId);
        const refreshed = (refreshedRaw || []).map(normalizeWineRow);
        renderWineTable(refreshed.slice(0, WINE_LIMIT));
      } catch (e) {
        console.error("[BC] delete wine failed", e);
        alert("Failed to delete wine.");
      }
    });
  };
  bindDeleteDelegation(body);
  bindDeleteDelegation(cards);

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
  const btnSetup = document.getElementById("btnGoSetupPremium");
  const btnManagerBoard = document.getElementById("btnManagerBoard");
  const btnFiveMinRep = document.getElementById("btnFiveMinRep");
  const btnOpenMessages = document.getElementById("btnOpenMessages");

  if (btnSetup && !btnSetup.__bcBound) {
    btnSetup.__bcBound = true;
    btnSetup.addEventListener("click", () => {
      const roleNow = String(appState?.profile?.role || "").toLowerCase();
      if (roleNow === "waiter") return;
      showScreen("screenPremiumApp");
      postToGame("nav", { target: "setup_premium" });
    });
  }

  if (btnManagerBoard && !btnManagerBoard.__bcBound) {
    btnManagerBoard.__bcBound = true;
    btnManagerBoard.addEventListener("click", () => {
      const roleNow = String(appState?.profile?.role || "").toLowerCase();
      if (roleNow === "waiter") return;
      showScreen("screenManagerBoard");
      wireManagerBoardMenu?.();
      loadManagerBoardData?.();
    });
  }

  if (btnFiveMinRep && !btnFiveMinRep.__bcBound) {
    btnFiveMinRep.__bcBound = true;
    btnFiveMinRep.addEventListener("click", async () => {
      const roleNow = String(appState?.profile?.role || "").toLowerCase();
      const isWaiter = roleNow === "waiter";
      const drill = window.__BC_DRILL_CONFIG__ || window.BC_DRILL_CONFIG || null;

      showScreen("screenPremiumApp");

      const backTo = isWaiter ? "screenPremiumApp" : "screenManagerBoard";
      mountPremiumGameIframe({ showBack: true, backTo });

      postToGameAfterLoad({
        type: "drill_config",
        drill: drill || null
      });

      postToGameAfterLoad({
        type: "start_drill",
        repTarget: drill?.repTarget ?? 3,
        focus: drill?.focus ?? "read",
        pool: drill?.pool ?? ["decider", "bargain_smart", "griever"],
        durationSec: drill?.durationSec ?? 300,
        tier: drill?.tier ?? 1,
        mode: "premium"
      });
    });
  }

  // Waiter / premium messages panel
  if (btnOpenMessages && !btnOpenMessages.__bcBound) {
    btnOpenMessages.__bcBound = true;
    btnOpenMessages.addEventListener("click", () => {
      closeHud?.();
      openWaiterMessages();
    });
  }

}

function setHomeAuthUI(isAuthed) {
  console.log("[HOME_UI] setHomeAuthUI", {
    isLoggedIn: isAuthed,
    session: !!appState?.session,
    stack: new Error().stack
  });
  const badge = document.getElementById("homeAuthBadge");
  const logoutBtn = document.getElementById("btnHomeLogout");
  if (isAuthed) {
    badge?.classList.remove("hidden");
    logoutBtn?.classList.remove("hidden");
  } else {
    badge?.classList.add("hidden");
    logoutBtn?.classList.add("hidden");
  }
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

  setHomeAuthUI(authed);

  const authFields = document.getElementById("authFields");
  authFields?.classList.toggle("hidden", authed);

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
        "Waiters play Demo immediately and can join by code. Managers enter Premium to configure the restaurant.";
    if (premiumBtn) premiumBtn.textContent = "Premium";
    if (exitBtn) exitBtn.classList.add("hidden");
  }

  // ✅ show/hide premium code + contact block
  const premiumIntentBlock = document.getElementById("premiumIntentBlock");
  if (premiumIntentBlock) {
    if (authIntent === "premium") premiumIntentBlock.classList.remove("hidden");
    else premiumIntentBlock.classList.add("hidden");
  }
}

// ------------------------------------------------------------
// HUD
// ------------------------------------------------------------
function openHud() {
  setHudOpen(true);
  wireGroupSetupRedeem?.();
  wireManagerBoardBillingAccess?.();
  loadGroupRestaurantsForPicker?.();
  wireActiveRestaurantPicker?.();
  renderHud();
}
function closeHud() {
  setHudOpen(false);
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
  } else if (kind === "progress_report" && row?.payload && typeof row.payload === "object" && Object.keys(row.payload).length) {
    const p = row.payload || {};
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
    .order("created_at", { ascending: true })
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

  threadEl.innerHTML = rows
    .map((row) => renderWaiterThreadItem(row, selfUserId, nameMap))
    .join("");
  threadEl.scrollTop = threadEl.scrollHeight;
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
  document.getElementById("waiterMessagesBackdrop")?.classList.remove("hidden");
  document.getElementById("waiterMessagesPanel")?.classList.remove("hidden");
  const status = document.getElementById("waiterSendProgressStatus");
  if (status) status.textContent = "";
  try {
    await loadWaiterMessagesThread();
  } catch (e) {
    console.error("[WAITER MSG] open failed", e);
  }
}

function closeWaiterMessages() {
  document.getElementById("waiterMessagesBackdrop")?.classList.add("hidden");
  document.getElementById("waiterMessagesPanel")?.classList.add("hidden");
  const status = document.getElementById("waiterSendProgressStatus");
  if (status) status.textContent = "";
}

function wireWaiterMessagesPanel() {
  const closeBtn = document.getElementById("btnCloseMessages");
  const backdrop = document.getElementById("waiterMessagesBackdrop");
  const sendBtn = document.getElementById("btnWaiterSendProgress");

  if (closeBtn && !closeBtn.__bcBound) {
    closeBtn.__bcBound = true;
    closeBtn.addEventListener("click", closeWaiterMessages);
  }

  if (backdrop && !backdrop.__bcBound) {
    backdrop.__bcBound = true;
    backdrop.addEventListener("click", closeWaiterMessages);
  }

  if (sendBtn && !sendBtn.__bcBound) {
    sendBtn.__bcBound = true;
    sendBtn.addEventListener("click", () => {
      console.log("[WAITER PANEL] Send Progress clicked ✅");
      const status = document.getElementById("waiterSendProgressStatus");
      try {
        const reqId = "hud_pr_" + Math.random().toString(16).slice(2);
        const frame = document.getElementById("premiumRootFrame");
        console.log("[WAITER PANEL] premiumRootFrame", frame);
        if (!frame || !frame.contentWindow) {
          if (status) status.textContent = "Game not ready.";
          console.warn("[WAITER PANEL] no iframe/contentWindow");
          return;
        }

        frame.contentWindow.postMessage(
          {
            source: "BC_MSG",
            v: 1,
            type: "hud_send_progress_request",
            reqId,
          },
          window.location.origin
        );
        console.log("[WAITER PANEL] hud_send_progress_request posted ✅", { reqId });

        if (status) status.textContent = "Sending…";
      } catch (e) {
        console.warn("waiter send progress failed", e);
        if (status) status.textContent = "Could not send progress.";
      }
    });
  }
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
      ? `Sent to manager${msg.inserted ? ` (${msg.inserted})` : ""} ✅`
      : `Send failed: ${msg.error || "unknown error"}`;

    if (status) status.textContent = text;
    if (hudStatus) hudStatus.textContent = text;
    renderHudSkillDashboard();

    if (msg.ok) {
      loadHudSkillTimeline().catch(console.error);
      loadWaiterMessagesThread().catch(console.error);
    }
  }

});

function wireHudSendProgressButton() {
  const btn = document.getElementById("btnHudSendProgress");
  const status = document.getElementById("hudSendProgressStatus");
  if (!btn || btn.__wired) return;
  btn.__wired = true;

  btn.addEventListener("click", () => {
    try {
      const frame = document.getElementById("premiumRootFrame");
      if (!frame || !frame.contentWindow) {
        if (status) status.textContent = "Game not ready.";
        return;
      }

      const reqId = "hud_pr_" + Math.random().toString(16).slice(2);
      frame.contentWindow.postMessage(
        {
          source: "BC_MSG",
          v: 1,
          type: "hud_send_progress_request",
          reqId,
        },
        window.location.origin
      );

      if (status) status.textContent = "Sending progress...";
    } catch (e) {
      console.warn("wireHudSendProgressButton failed", e);
      if (status) status.textContent = "Could not send progress.";
    }
  });
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
  console.log("[BC] destroyDemoIframe", reason);
  try { document.getElementById("gameRootDemoFrame")?.remove(); } catch {}
  const root = document.getElementById("gameRootDemo");
  if (root) root.innerHTML = "";
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

function buildGameIframeUrl({
  mode = "premium",
  showBack = false,
  backTo = "screenPremiumApp",
  urlOverride = null,
  epoch = Date.now(),
  bustCache = true,
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

  // epoch gate param
  base.searchParams.set("epoch", String(epoch));

  // cache-buster (only when desired)
  if (bustCache) base.searchParams.set("v", String(Date.now()));

  return base.toString();
}

function mountGameIframe(targetId, mode /* "demo" | "premium" */) {
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

  // Cache-busting param required — but stable within this mode session
  const demoFlag = mode === "demo" ? "&demo=1" : "";
  const epochFlag = mode === "premium" ? `&epoch=${window.__BC_IFRAME_EPOCH__}` : "";
  const src = `/game/game.html?mode=${encodeURIComponent(mode)}${demoFlag}${epochFlag}&v=${currentIframeVersion}`;

  // ✅ Smaller default height to avoid giant empty space before setup
  mount.innerHTML = `
    <iframe
      id="${targetId}Frame"
      src="${src}"
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

// ✅ Optional auto-resize (requires matching postMessage in game.html)
window.addEventListener("message", (event) => {
  const data = event?.data;
  if (!data || data.type !== "BC_IFRAME_HEIGHT") return;

  const demoFrame = document.getElementById("gameRootDemoFrame");
  const premFrame = document.getElementById("premiumRootFrame");
  const frame = data.mode === "premium" ? premFrame : demoFrame;
  if (!frame) return;

  const h = Number(data.height);
  if (!Number.isFinite(h)) return;

  const clamped = Math.max(360, Math.min(860, h + 24));
  frame.style.height = clamped + "px";
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
    supabase.from("restaurants").select("id,name,code,seat_limit,require_invite").eq("id", restaurantId).single(),
    12000,
    "restaurants.select"
  );
  if (res.error) throw res.error;
  return res.data;
}

async function loadInvites(restaurantId) {
  const res = await withTimeout(
    supabase
      .from("restaurant_invites")
      .select("id,email,status,created_at,accepted_user_id,revoked_at")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false }),
    12000,
    "invites.select"
  );
  if (res.error) throw res.error;
  return res.data || [];
}

async function loadManagerBoardSeats() {
  const rid = appState.profile?.restaurant_id || null;
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
  const rid = appState.profile?.restaurant_id || null;
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

async function redeemEnterpriseManagerSetupCode() {
  if (!isManagerRole(appState.profile?.role)) {
    alert("Managers only.");
    return;
  }
  const input = document.getElementById("mbEnterpriseCode");
  const msg = document.getElementById("mbEnterpriseMsg");
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

async function redeemGroupSetupCode() {
  const input = document.getElementById("mbGroupSetupCode");
  const msg = document.getElementById("mbGroupSetupMsg");
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
  const btn = document.getElementById("mbRedeemGroupSetup");
  if (!btn || btn.__wired) return;
  btn.__wired = true;
  btn.addEventListener("click", redeemGroupSetupCode);
}

function wireManagerBoardBillingAccess() {
  const isMgr = isManagerRole(appState.profile?.role);
  const b15 = document.getElementById("mbSeat15");
  const b30 = document.getElementById("mbSeat30");
  const b60 = document.getElementById("mbSeat60");
  const bRef = document.getElementById("mbRefreshSeats");
  const bRedeem = document.getElementById("mbRedeemEnterprise");
  const codeInput = document.getElementById("mbEnterpriseCode");
  const msg = document.getElementById("mbEnterpriseMsg");

  [b15, b30, b60].forEach((el) => {
    if (el) el.style.display = isMgr ? "" : "none";
  });
  if (bRedeem) bRedeem.style.display = isMgr ? "" : "none";
  if (codeInput) codeInput.style.display = isMgr ? "" : "none";
  if (msg && !isMgr) msg.textContent = "";

  if (b15) b15.onclick = () => adminSetSeats(15);
  if (b30) b30.onclick = () => adminSetSeats(30);
  if (b60) b60.onclick = () => adminSetSeats(60);
  if (bRef) bRef.onclick = () => loadManagerBoardSeats();
  if (bRedeem) bRedeem.onclick = () => redeemEnterpriseManagerSetupCode();

  loadManagerBoardSeats();
}

function wireManagerBoardMenu() {
  const menu = document.getElementById("mbMenu");
  if (!menu || menu.__bcBound) return;
  menu.__bcBound = true;

  function showTab(name) {
    document.querySelectorAll("#mbPanels .mbTab").forEach((el) => el.classList.add("hidden"));
    document.getElementById(`mbTab_${name}`)?.classList.remove("hidden");
  }
  window.__BC_MB_SHOWTAB__ = showTab;
  window.__BC_MB_LOADTAB__ = async function(name) {
    if (!name) return;
    if (name === "overview") {
      await loadManagerBoardData();
      await loadWeeklySummaryTop();
      return;
    }
    if (name === "billing") return loadManagerBoardSeats?.();
    if (name === "insights") return loadManagerInsights();
    if (name === "history") {
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
      }
      return;
    }
    if (name === "messenger") {
      wireManagerBoardMessenger();
      return loadManagerMessenger();
    }
  };

  menu.addEventListener("click", async (e) => {
    const btn = e.target?.closest?.("[data-mbtab]");
    if (!btn) return;
    const tab = btn.getAttribute("data-mbtab");

    showTab(tab);

    if (tab === "overview") {
      await loadManagerBoardData();
      await loadWeeklySummaryTop();
    }
    if (tab === "billing") await loadManagerBoardSeats?.();
    if (tab === "insights") await loadManagerInsights();
    if (tab === "history") {
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
      }
    }
    if (tab === "messenger") {
      wireManagerBoardMessenger();
      await loadManagerMessenger();
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

function applyManagerBoardVisibility() {
  const p = appState.profile || {};
  
  const listingBtn = document.querySelector('#mbMenu [data-mbtab="listing"]');
  if (listingBtn) listingBtn.style.display = "";
  const billingBtn = document.querySelector('#mbMenu [data-mbtab="billing"]');
  if (billingBtn) billingBtn.style.display = "";
  const provisionBtn = document.querySelector('#mbMenu [data-mbtab="provision"]');
  if (provisionBtn) provisionBtn.style.display = "none";
}

function wireActiveRestaurantPicker() {
  const btn = document.getElementById("btnSetActiveRestaurant");
  if (!btn || btn.__wired) return;
  btn.__wired = true;

  btn.addEventListener("click", async () => {
    const sel = document.getElementById("selActiveRestaurant");
    const rid = sel?.value || null;
    if (!rid) return;
    await setActiveRestaurantForGroup(rid);
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

function ensureInsightsShell() {
  const host = document.getElementById("mbTab_insights");
  if (!host) return null;

  if (!host.__bcInit) {
    host.__bcInit = true;
    host.innerHTML = `
      <div class="card">
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:center;">
          <div>
            <div style="font-weight:700;">Insights</div>
            <div class="small-text" style="opacity:.8;">What breaks under pressure — and what drill fixes it.</div>
          </div>
          <button id="mbInsightsRefresh" class="btn" type="button">Refresh</button>
        </div>

        <div id="mbInsightsMsg" class="small-text" style="margin-top:10px;"></div>
      </div>

      <div class="card" style="margin-top:12px;">
        <div style="font-weight:700;">Guest Type Breakdown</div>
        <div id="mbInsightsLegend" class="small-text" style="margin-top:6px; opacity:.8;"></div>
        <div id="mbInsightsGuestTable" style="margin-top:10px;"></div>
      </div>

      <div class="card" style="margin-top:12px;">
        <div style="font-weight:700;">Trend (14 days)</div>
        <div id="mbInsightsTrendTable" style="margin-top:10px;"></div>
      </div>
    `;

    const b = document.getElementById("mbInsightsRefresh");
    if (b && !b.__bcBound) {
      b.__bcBound = true;
      b.onclick = () => loadManagerInsights();
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

function renderGuestInsightsTable(rows, nameMap = new Map()) {
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

  const users = Array.from(byUser.values()).sort((a, b) =>
    String(a.display).localeCompare(String(b.display))
  );

  if (!users.length) return `<div class="small-text" style="opacity:.8;">No encounter data yet.</div>`;

  const guestOrder = ["decider", "bargain_smart", "griever"];

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

function renderTrendTable(rows, nameMap = new Map()) {
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

  const users = Array.from(byUserDay.entries())
    .map(([uid, byDay]) => ({
      uid,
      display: nameMap.get(uid) || uid,
      days: Array.from(byDay.values())
        .map((x) => ({ ...x, avg: x.n ? x.sum / x.n : 0, greenPct: x.n ? 100 * x.greens / x.n : 0 }))
        .sort((a, b) => (a.day < b.day ? 1 : -1))
        .slice(0, 14),
    }))
    .sort((a, b) => String(a.display).localeCompare(String(b.display)));

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

function startManagerDrill({ focus = "read", pool = ["decider", "bargain_smart", "griever"], repTarget = 3, durationSec = 300, tier = 1 } = {}) {
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
        pool: ["decider", "bargain_smart", "griever"],
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

async function loadManagerInsights() {
  ensureInsightsShell();

  const msgEl = document.getElementById("mbInsightsMsg");
  const guestEl = document.getElementById("mbInsightsGuestTable");
  const trendEl = document.getElementById("mbInsightsTrendTable");
  const legendEl = document.getElementById("mbInsightsLegend");

  const restaurantId =
    window.getActiveRestaurantId?.() ||
    appState.activeRestaurantId ||
    appState.profile?.restaurant_id;
  if (!isUuid(restaurantId)) {
    if (msgEl) msgEl.textContent = "Insights unavailable (no active restaurant).";
    return;
  }

  if (msgEl) msgEl.textContent = "Loading insights…";
  if (legendEl) {
    legendEl.textContent =
      "avg = average chain_score. green/red = outcome flags. read/delivery/mode/hook = % correct/optimal on that step.";
  }

  const DRILL_POOL_T1 = ["decider", "bargain_smart", "griever"];
  const sinceIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const baseRes = await supabase
    .from("bc_encounter_resolutions_v2")
    .select([
      "user_id",
      "occurred_at",
      "actual_guest_type_norm",
      "chain_score",
      "is_green",
      "is_red",
      "read_correct",
      "delivery_correct",
      "mode_optimal",
      "hook_optimal",
      "mode_status",
      "hook_status",
      "chain_signal",
      "performance_grade",
      "tier",
      "encounter_number",
      "session_id",
    ].join(","))
    .eq("restaurant_id", restaurantId)
    .neq("mode", "demo")
    .gte("occurred_at", sinceIso)
    .order("occurred_at", { ascending: false })
    .limit(2000);

  if (baseRes.error) {
    if (msgEl) msgEl.textContent = "Failed: " + baseRes.error.message;
    return;
  }

  const rows = baseRes.data || [];
  const resolves = rows.length;
  const users = new Set(rows.map((r) => r?.user_id).filter(Boolean)).size;
  console.log("[MB] insights query stats", {
    restaurantId,
    resolves,
    users,
  });

  const byUser = new Map();
  for (const r of rows) {
    const uid = r?.user_id || null;
    if (!uid) continue;
    const arr = byUser.get(uid) || [];
    arr.push(r);
    byUser.set(uid, arr);
  }

  const userIds = [...byUser.keys()];
  const nameMap = await mapUserIdsToNames(userIds);

  const plans = [];
  for (const [uid, urows] of byUser.entries()) {
    const plan = buildRecommendedDrillPlan({ guestRows: urows, weakRows: urows });
    plans.push({
      user_id: uid,
      name: nameMap.get(uid) || String(uid).slice(0, 8),
      guestRows: urows,
      weakRows: urows,
      trendRows: urows,
      plan,
    });
  }

  plans.sort((a, b) => (b.guestRows.length - a.guestRows.length));

  if (guestEl) {
    guestEl.innerHTML = renderGuestInsightsTable(rows, nameMap);
  }

  if (trendEl) {
    trendEl.innerHTML = renderTrendTable(rows, nameMap);
  }

  if (guestEl && !guestEl.__bcBound) {
    guestEl.__bcBound = true;
    guestEl.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-insights-drill-user]");
      if (!btn) return;

      const uid = btn.getAttribute("data-insights-drill-user");
      const entry = plans.find((x) => String(x.user_id) === String(uid));
      if (!entry) return;

      window.setDefaultDrillConfig?.({
        focus: entry.plan?.weakest || "read",
        pool: DRILL_POOL_T1,
        durationSec: 300,
      });

      showScreen("screenPlay");
      mountPremiumGameIframe({ showBack: true, backTo: "screenManagerBoard" });

      const drillMsg = {
        type: "start_drill",
        repTarget: 3,
        focus: entry.plan?.weakest || "read",
        pool: DRILL_POOL_T1,
        durationSec: 300,
        starter: "manager",
        tier: 1,
      };

      postToGameAfterLoad({ type: "drill_config", drill: window.__BC_DRILL_CONFIG__ || window.BC_DRILL_CONFIG || null });
      postToGameAfterLoad(drillMsg);
    });
  }

  if (msgEl) msgEl.textContent = `✅ Loaded • ${resolves} resolves • ${users} user(s)`;
}

async function loadGroupRestaurantsForPicker() {
  const sel = document.getElementById("selActiveRestaurant");
  const hint = document.getElementById("activeRestaurantHint");
  if (!sel) return;

  sel.innerHTML = "";
  if (hint) hint.textContent = "Loading restaurants…";

  const r = await supabase
    .from("restaurants")
    .select("id, name")
    .order("name", { ascending: true });

  if (r.error) {
    console.error("[BC] restaurants fetch failed", r.error);
    if (hint) hint.textContent = `⚠️ Failed to load restaurants: ${r.error.message}`;
    return;
  }

  const rows = r.data || [];
  if (!rows.length) {
    if (hint) hint.textContent = "⚠️ No restaurants found.";
    return;
  }

  for (const row of rows) {
    const opt = document.createElement("option");
    opt.value = row.id;
    opt.textContent = row.name || row.id.slice(0, 8) + "…";
    sel.appendChild(opt);
  }

  // restore active
  const stored =
    (typeof getStoredActiveRestaurantId === "function"
      ? getStoredActiveRestaurantId(appState?.profile?.scope_id || null)
      : null) ||
    localStorage.getItem("BC_ACTIVE_RESTAURANT_ID") ||
    null;

  const active = appState.activeRestaurantId || stored || rows[0].id;
  sel.value = active;
  appState.activeRestaurantId = active;
  setStoredActiveRestaurantId(appState?.profile?.scope_id || null, active);
  localStorage.setItem("BC_ACTIVE_RESTAURANT_ID", active);
  const activeRow = rows.find((x) => x.id === active) || null;
  if (activeRow && !appState.restaurant) appState.restaurant = activeRow;
  markActiveRestaurantReady();
  if (hint) hint.textContent = `✅ Active: ${activeRow?.name || String(active).slice(0, 8) + "…"}`;

  console.log("[BC] picker hydrated (no scope)", { active });
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

  const uid = appState.session?.user?.id || null;

  iframe.contentWindow.postMessage(
    {
      source: "BC_MSG",
      v: 1,
      type: "bc_ctx",
      mode: "premium",
      userId: uid,
      role: appState.profile?.role || null,
      scopeType: appState.profile?.scope_type || null,
      scopeId: appState.profile?.scope_id || null,
      restaurantId: appState.profile?.restaurant_id || null,
      accessTier: appState.profile?.access_tier || null,
      _from: source,
    },
    "*"
  );
}

function postToPremiumIframeSafe(type, payload = {}) {
  try {
    if (isHardLoggedOut?.()) return false;
    if (isLoggingOut?.()) return false;
    if (!window.appState?.session) return false;

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

  iframe.addEventListener("load", () => {
    (async () => {
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

      pushPremiumDrill();
      console.log("[PARENT] premium iframe loaded ✅ (ctx/drill pushed)", { epoch: myEpoch });
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
  const p = window.appState?.profile || {};
  const role = String(p.role || "").toLowerCase();
  const scopeType = String(p.scope_type || "").toLowerCase();
  const restaurantId = window.getActiveRestaurantId?.() || null;

  const isManager = isManagerRole(role);
  const isGroupish = isManager && (scopeType === "group" || scopeType === "enterprise");

  return { restaurantId, isManager, isGroupish };
}

function getScopeIdSafe() {
  return (
    window.appState?.profile?.scope_id ||
    window.appState?.profile?.group_id ||
    null
  );
}

function mbEl(id) {
  return document.getElementById(id);
}
window.__BC_MB_THREADS__ = [];
window.__BC_MB_ACTIVE_THREAD_USER_ID__ = null;
window.__MB_LAST_MESSAGES__ = [];

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

  const p = latest?.payload || {};
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

function wireMbCoachSuggestionButtons() {
  document.querySelectorAll(".mbCoachSuggestion").forEach((btn) => {
    btn.onclick = () => {
      const index = Number(btn.dataset.index);
      const rowId = btn.closest("[data-msg-id]")?.dataset.msgId;

      const row = window.__MB_LAST_MESSAGES__?.find((r) => String(r.id) === String(rowId));
      if (!row) return;

      const suggestions = getCoachingSuggestionsFromReport(row.payload || {});
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

  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .eq("restaurant_id", restaurantId)
    .eq("role", "waiter");

  const rows = Array.isArray(data) ? data : [];
  select.innerHTML = rows.map((w) =>
    `<option value="${w.user_id}">${escapeHtml(w.display_name || w.user_id)}</option>`
  ).join("");
}

async function loadPerformanceHistory(userId) {
  const { restaurantId } = getManagerBoardFilter();

  const { data } = await supabase
    .from("bc_skill_snapshots_v1")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(50);

  drawPerformanceHistoryChart(data || []);
}

function drawPerformanceHistoryChart(rows) {
  const canvas = document.getElementById("mbHistoryChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

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

  const skills = [
    { key: "read_pct", label: "READ" },
    { key: "framing_pct", label: "FRAME" },
    { key: "delivery_pct", label: "DELIVER" },
    { key: "recovery_pct", label: "RECOVER" },
    { key: "closing_pct", label: "CLOSE" }
  ];

  const xStep = rows.length > 1 ? plotW / (rows.length - 1) : plotW / 2;

  skills.forEach((skill, skillIndex) => {
    ctx.beginPath();
    ctx.lineWidth = 2;
    const alpha = 0.95 - skillIndex * 0.12;
    ctx.strokeStyle = `rgba(255,255,255,${Math.max(alpha, 0.28)})`;

    rows.forEach((r, i) => {
      const pct = Math.max(0, Math.min(100, Number(r?.[skill.key] || 0)));
      const x = padL + i * xStep;
      const y = padT + plotH - (pct / 100) * plotH;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  });

  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "11px sans-serif";
  skills.forEach((s, i) => {
    ctx.fillText(s.label, padL + i * 70, 12);
  });
}

function renderMbMessageItem(row, nameMap) {
  const who = userLabel(row?.sender_user_id, nameMap);
  const kind = String(row?.type || "message");
  const body = escapeHtml(String(row?.body || ""));
  const when = escapeHtml(String(row?.created_at || ""));

  let badge = "MSG";
  if (kind === "progress_report") badge = "REPORT";
  if (kind === "instruction") badge = "INSTRUCTION";
  if (kind === "drill_override") badge = "DRILL";

  let payloadHtml = "";

  if (kind === "drill_override" && row?.payload?.drill) {
    const d = row.payload.drill || {};
    const pool = Array.isArray(d.pool) ? d.pool.join(", ") : "-";
    const focus = escapeHtml(String(d.focus || "-"));
    const reps = escapeHtml(String(d.repTarget ?? "-"));
    const duration = escapeHtml(String(d.durationSec ?? "-"));
    const tier = escapeHtml(String(d.tier ?? "-"));
    const reason = escapeHtml(String(row?.payload?.reason || ""));
    const targetName = escapeHtml(
      userLabel(row?.receiver_user_id, nameMap) || "waiter"
    );

    payloadHtml = `
      <div style="
        margin-top:8px;
        padding:10px;
        border:1px solid rgba(255,255,255,0.10);
        border-radius:10px;
        background:rgba(255,255,255,0.04);
      ">
        <div><strong>Assigned drill</strong></div>
        <div class="small-text" style="margin-top:6px; opacity:.9;">
          Assigned to: ${targetName}
        </div>
        <div class="small-text" style="opacity:.9;">Focus: ${focus}</div>
        <div class="small-text" style="opacity:.9;">Pool: ${escapeHtml(pool)}</div>
        <div class="small-text" style="opacity:.9;">Reps: ${reps}</div>
        <div class="small-text" style="opacity:.9;">Duration: ${duration}s</div>
        <div class="small-text" style="opacity:.9;">Tier: ${tier}</div>
        ${reason ? `<div class="small-text" style="margin-top:8px; opacity:.75;">${reason}</div>` : ""}
      </div>
    `;
  } else if (kind === "progress_report" && row?.payload && typeof row.payload === "object" && Object.keys(row.payload).length) {
    const p = row.payload || {};
    const skills = p.skills || {};
    const suggestions = getCoachingSuggestionsFromReport(p);

    const suggestionsHtml = suggestions.map((s, i) => `
<button
  class="btn-ghost mbCoachSuggestion"
  data-index="${i}"
  style="margin-top:6px;"
>
${escapeHtml(s.label)}
</button>
`).join("");

    payloadHtml = `
      <div style="
        margin-top:8px;
        padding:10px;
        border:1px solid rgba(255,255,255,0.10);
        border-radius:10px;
        background:rgba(255,255,255,0.04);
      ">
        <div><strong>Progress snapshot</strong></div>
        <div class="small-text" style="margin-top:6px; opacity:.9;">Encounter: ${escapeHtml(String(p.encounterNumber ?? "-"))}</div>
        <div class="small-text" style="opacity:.9;">Guest: ${escapeHtml(String(p.guestStateActual || "-"))}</div>
        <div class="small-text" style="opacity:.9;">Difficulty: ${escapeHtml(String(p.difficulty ?? "-"))}</div>
        <div class="small-text" style="opacity:.9;">Signal: ${escapeHtml(String(p.chainSignal || "-"))}</div>
        <div class="small-text" style="opacity:.9;">Score: ${escapeHtml(String(p.chainScore ?? "-"))}</div>

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

        <div style="margin-top:12px;">
          <strong>Performance Radar</strong>
          <canvas class="mbSkillRadar" width="220" height="220" style="margin-top:8px;"></canvas>
        </div>

        <div style="margin-top:10px;">
          <strong>Coach Suggestions</strong>
          <div style="display:flex; flex-direction:column; gap:4px; margin-top:6px;">
            ${suggestionsHtml}
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div data-msg-id="${escapeHtml(String(row?.id ?? ""))}" style="
      border:1px solid rgba(255,255,255,0.10);
      border-radius:12px;
      padding:10px;
      background:rgba(255,255,255,0.04);
    ">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="badge">${badge}</span>
          <b>${escapeHtml(who)}</b>
        </div>
        <div class="small-text" style="opacity:.6;">${when}</div>
      </div>
      <div style="margin-top:8px; white-space:pre-wrap;">${body}</div>
      ${payloadHtml}
    </div>
  `;
}

function renderManagerThreadListItem(thread, nameMap) {
  const active = String(window.__BC_MB_ACTIVE_THREAD_USER_ID__ || "") === String(thread.userId || "");
  const name = escapeHtml(userLabel(thread.userId, nameMap));
  const preview = escapeHtml(String(thread.latestBody || "").slice(0, 80));
  const when = escapeHtml(String(thread.latestAt || ""));
  const type = String(thread.latestType || "message").toUpperCase();

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
  const payload = latest?.payload || {};
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

  if (sig === "red" || sig === "soft_close") {
    suggestions.push("Keep it shorter and confirm guest intent first.");
    suggestions.push("Run a 5-minute Guest Reading drill before next shift.");
    suggestions.push("Offer two confident options instead of over-explaining.");
  } else {
    suggestions.push("Good progress. Keep your close crisp and confident.");
    suggestions.push("Stay concise and guide the guest to a decision.");
  }

  if (guest === "decider") {
    suggestions.push("With Deciders: lead quickly with two strong options.");
  }

  window.__BC_MB_SELECTED_SUGGESTION__ = suggestions[0] || "";

  host.innerHTML = suggestions
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

function renderManagerActiveThread(nameMap) {
  const msgEl = mbEl("mbThreadMessages");
  const titleEl = mbEl("mbThreadTitle");
  const metaEl = mbEl("mbThreadMeta");

  const activeUserId = window.__BC_MB_ACTIVE_THREAD_USER_ID__;
  const threads = window.__BC_MB_THREADS__ || [];
  const thread = threads.find((t) => String(t.userId) === String(activeUserId));

  if (!thread) {
    if (titleEl) titleEl.textContent = "Select a waiter";
    if (metaEl) metaEl.textContent = "";
    if (msgEl) msgEl.innerHTML = `<div class="small-text" style="opacity:.8;">Select a waiter thread to view messages.</div>`;
    return;
  }

  if (titleEl) titleEl.textContent = userLabel(thread.userId, nameMap);
  if (metaEl) metaEl.textContent = `${thread.rows.length} message(s)`;

  const ordered = [...thread.rows].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const recommendationHtml = renderManagerThreadRecommendation(thread);

  if (msgEl) {
    msgEl.innerHTML = `${ordered.map((m) => renderMbMessageItem(m, nameMap)).join("")}${recommendationHtml}`;
    msgEl.scrollTop = msgEl.scrollHeight;
    wireMbCoachSuggestionButtons();
    wireMbAutoDrillButtons();
    setTimeout(() => {
      const canvases = msgEl.querySelectorAll(".mbSkillRadar");
      const skillRows = ordered.filter((row) => row?.payload?.skills);
      canvases.forEach((canvas, i) => {
        const row = skillRows[i];
        if (!row?.payload?.skills) return;
        drawSkillRadar(canvas, row.payload.skills);
      });
    }, 0);
  }

  buildManagerSuggestedPrompts(thread);
}

async function loadManagerMessenger() {
  const { restaurantId, isManager } = getManagerBoardFilter();
  if (!isManager) throw new Error("Manager only");
  if (!restaurantId) throw new Error("Active restaurant not set");

  const listEl = mbEl("mbThreadList");
  const emptyEl = mbEl("mbThreadEmpty");
  const msgEl = mbEl("mbThreadMessages");
  const titleEl = mbEl("mbThreadTitle");
  const metaEl = mbEl("mbThreadMeta");

  if (listEl) listEl.innerHTML = `<div class="small-text" style="padding:10px; opacity:.85;">Loading…</div>`;
  if (emptyEl) emptyEl.style.display = "none";
  if (msgEl) msgEl.innerHTML = `<div class="small-text" style="opacity:.8;">Select a waiter thread to view messages.</div>`;
  if (titleEl) titleEl.textContent = "Select a waiter";
  if (metaEl) metaEl.textContent = "";

  const { data, error } = await supabase
    .from("bc_messages_v1")
    .select("id, created_at, scope_type, scope_id, restaurant_id, sender_user_id, receiver_user_id, sender_role, type, body, payload, read_at")
    .eq("restaurant_id", restaurantId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const rows = data || [];
  window.__MB_LAST_MESSAGES__ = rows;
  if (!rows.length) {
    if (listEl) listEl.innerHTML = "";
    if (emptyEl) emptyEl.style.display = "block";
    window.__BC_MB_THREADS__ = [];
    window.__BC_MB_ACTIVE_THREAD_USER_ID__ = null;
    return;
  }

  const managerId =
    appState?.session?.user?.id ||
    appState?.session?.userId ||
    null;

  const grouped = new Map();

  for (const row of rows) {
    const sender = row.sender_user_id;
    const receiver = row.receiver_user_id;

    const otherUserId =
      String(sender) === String(managerId) ? receiver : sender;

    if (!otherUserId) continue;

    const entry = grouped.get(otherUserId) || {
      userId: otherUserId,
      latestAt: row.created_at,
      latestBody: row.body || "",
      latestType: row.type || "message",
      rows: [],
    };

    entry.rows.push(row);

    if (new Date(row.created_at) > new Date(entry.latestAt)) {
      entry.latestAt = row.created_at;
      entry.latestBody = row.body || "";
      entry.latestType = row.type || "message";
    }

    grouped.set(otherUserId, entry);
  }

  const threads = Array.from(grouped.values())
    .sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt));

  window.__BC_MB_THREADS__ = threads;

  const userIds = threads.map((t) => t.userId);
  const nameMap = await mapUserIdsToNames(userIds);

  if (listEl) {
    listEl.innerHTML = threads.map((t) => renderManagerThreadListItem(t, nameMap)).join("");
  }

  if (!window.__BC_MB_ACTIVE_THREAD_USER_ID__ && threads[0]) {
    window.__BC_MB_ACTIVE_THREAD_USER_ID__ = threads[0].userId;
  }

  renderManagerActiveThread(nameMap);
  wireMbCoachSuggestionButtons();
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
  await loadManagerMessenger();
}

async function mbSendDrillOverride(opts = {}) {
  const { restaurantId, isManager } = getManagerBoardFilter();
  if (!isManager) throw new Error("Manager only");
  if (!restaurantId) throw new Error("Active restaurant not set");

  const to = String(window.__BC_MB_ACTIVE_THREAD_USER_ID__ || "");
  const status = mbEl("mbInstrStatus");

  if (!to) throw new Error("Select a waiter thread");

  if (status) status.textContent = "Sending drill…";

  const senderId = appState?.session?.user?.id || appState?.session?.userId || null;
  const senderRole = String(appState?.profile?.role || "");
  if (!senderId) throw new Error("No session");

  const baseDrill = window.__BC_DRILL_CONFIG__ || window.BC_DRILL_CONFIG || null;

  const thread = (window.__BC_MB_THREADS__ || []).find(
    (t) => String(t.userId) === String(to)
  );
  const latest = [...(thread?.rows || [])]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-1)[0];

  const latestPayload = latest?.payload || {};
  const guest = String(latestPayload?.guestStateActual || "").toLowerCase();
  const sig = String(latestPayload?.chainSignal || "").toLowerCase();

  let focus = String(opts.focus || "").toLowerCase() || "read";
  let pool = ["decider", "bargain_smart", "griever"];
  let tier = 1;
  let durationSec = 300;
  let repTarget = 3;

  if (focus === "read") {
    if (guest === "decider") pool = ["decider"];
    else pool = ["decider", "bargain_smart", "griever"];
  } else if (focus === "frame") {
    pool = ["decider", "fancy"];
  } else if (focus === "delivery") {
    pool = ["decider", "fancy", "griever"];
  } else if (focus === "recovery") {
    pool = ["griever", "decider"];
    repTarget = 4;
  } else if (focus === "closing") {
    pool = ["decider", "fancy"];
  }

  if (!opts.focus && (sig === "soft_close" || sig === "red")) {
    focus = "read";
    repTarget = 4;
  }

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
    scope_id: restaurantId,
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

  if (status) status.textContent = "Drill sent ✅";
  await loadManagerMessenger();
}

async function sendManagerDrillOverride({ focus, repTarget = 3, durationSec = 300 } = {}) {
  const { restaurantId, isManager } = getManagerBoardFilter();
  if (!isManager) throw new Error("Manager only");
  if (!restaurantId) throw new Error("Active restaurant not set");

  const to = String(window.__BC_MB_ACTIVE_THREAD_USER_ID__ || "");
  if (!to) throw new Error("Select a waiter thread");

  const status = mbEl("mbInstrStatus");
  if (status) status.textContent = "Assigning drill…";

  const senderId = appState?.session?.user?.id || appState?.session?.userId || null;
  const senderRole = String(appState?.profile?.role || "");
  if (!senderId) throw new Error("No session");

  const baseDrill = window.__BC_DRILL_CONFIG__ || window.BC_DRILL_CONFIG || {};
  const f = String(focus || "read").toLowerCase();

  let pool = ["decider", "bargain_smart", "griever"];
  if (f === "read") pool = ["decider"];

  const drill = {
    ...baseDrill,
    focus: f,
    pool,
    repTarget,
    durationSec,
    tier: Number(baseDrill?.tier ?? 1)
  };

  const row = {
    scope_type: "restaurant",
    scope_id: restaurantId,
    restaurant_id: restaurantId,
    sender_user_id: senderId,
    receiver_user_id: to,
    sender_role: senderRole,
    type: "drill_override",
    body: "Run this drill now.",
    payload: {
      drill,
      reason: "Manager assigned a focused drill based on skill recommendation."
    },
  };

  const { error } = await supabase.from("bc_messages_v1").insert(row);
  if (error) throw error;

  if (status) status.textContent = "Drill assigned ✅";
  await loadManagerMessenger();
}

function wireManagerBoardMessenger() {
  const btn = mbEl("mbMsgRefresh");
  if (btn && !btn.__wired) {
    btn.__wired = true;
    btn.addEventListener("click", () => loadManagerMessenger().catch(console.error));
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
    runDrill.addEventListener("click", () => {
      mbSendDrillOverride().catch((e) => {
        const status = mbEl("mbInstrStatus");
        if (status) status.textContent = e?.message || String(e);
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

      window.__BC_MB_ACTIVE_THREAD_USER_ID__ = btn.getAttribute("data-thread-user-id");

      const threads = window.__BC_MB_THREADS__ || [];
      const ids = threads.map((t) => t.userId);
      const nameMap = await mapUserIdsToNames(ids);

      const listEl = mbEl("mbThreadList");
      if (listEl) {
        listEl.innerHTML = threads.map((t) => renderManagerThreadListItem(t, nameMap)).join("");
      }

      renderManagerActiveThread(nameMap);
    });
  }
}

async function loadManagerBoardMembers() {
  const rid = window.appState?.activeRestaurantId || window.appState?.profile?.restaurant_id || null;
  const box = document.getElementById("mbMembersList");
  const msg = document.getElementById("mbMembersMsg");
  if (!box || !msg) return;

  box.innerHTML = "";
  msg.textContent = "";

  if (!rid) {
    msg.textContent = "No active restaurant selected.";
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

  const rows = (data || []).map((p) => {
    const name = String(p?.display_name || "").trim() || "(no name)";
    const role = String(p?.role || "").toLowerCase();
    const badge =
      role === "waiter" ? "Waiter" :
      role === "manager" ? "Manager" :
      role === "group_manager" ? "Group Manager" :
      role === "enterprise_admin" ? "Enterprise Admin" :
      role;

    return `
      <div class="card" style="padding:10px; border-radius:12px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="min-width:0;">
            <div style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${escapeHtml(name)}
            </div>
            <div class="small-text" style="margin-top:2px;">${escapeHtml(p?.user_id || "")}</div>
          </div>
          <div class="small-text" style="white-space:nowrap; opacity:0.9;">${escapeHtml(badge)}</div>
        </div>
      </div>
    `;
  });

  box.innerHTML = rows.join("") || `<div class="small-text">No members found.</div>`;
  msg.textContent = `${(data || []).length} member(s) loaded.`;
}

function wireManagerBoardMembers() {
  const btn = document.getElementById("mbRefreshMembers");
  if (!btn || btn.__wired) return;
  btn.__wired = true;
  btn.addEventListener("click", () => loadManagerBoardMembers());
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
      closing_pct,
      profiles(display_name)
    `)
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.warn("[LEADERBOARD]", error);
    return;
  }

  const map = {};

  (data || []).forEach((row) => {
    const id = row.user_id;

    if (!map[id]) {
      const profileObj = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      map[id] = {
        name: profileObj?.display_name || id,
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
    const profileObj = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;

    if (!waiterMap[id]) {
      waiterMap[id] = {
        name: profileObj?.display_name || id,
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
  if (!restaurantId) return [];

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
      created_at,
      profiles(display_name)
    `)
    .eq("restaurant_id", restaurantId)
    .gte("created_at", sevenDaysAgo.toISOString());

  if (error) {
    console.warn("[WEEKLY REPORT]", error);
    return [];
  }

  const rows = data || [];
  renderWeeklyTrainingReport(rows);
  return rows;
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
    const senderRole = String(appState?.profile?.role || "manager");
    if (!managerId) return;

    const weekStart = getWeekStartIso();
    const sentKey = `bc_weekly_summary_sent_v1_${restaurantId}_${managerId}_${weekStart}`;
    if (localStorage.getItem(sentKey) === "1") return;

    const waiterMap = {};
    const skillGrowth = { read: 0, framing: 0, delivery: 0, recovery: 0, closing: 0 };

    rows.forEach((r) => {
      const id = r.user_id;
      const profileObj = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      if (!waiterMap[id]) {
        waiterMap[id] = { name: profileObj?.display_name || id, total: 0, count: 0 };
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

    const { error } = await supabase.from("bc_messages_v1").insert(row);
    if (error) {
      console.warn("[WEEKLY SUMMARY] insert failed", error);
      return;
    }

    localStorage.setItem(sentKey, "1");
  } catch (e) {
    console.warn("[WEEKLY SUMMARY] failed", e);
  }
}

async function loadWeeklySummaryTop() {
  const { restaurantId, isManager } = getManagerBoardFilter();
  if (!isManager) return;
  if (!restaurantId) return;

  const host = document.getElementById("mbWeeklySummaryTop");
  if (host) host.textContent = "Loading…";

  const managerId =
    appState?.session?.user?.id ||
    appState?.session?.userId ||
    null;

  if (!managerId) {
    if (host) host.textContent = "No session.";
    return;
  }

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  const { data, error } = await supabase
    .from("bc_messages_v1")
    .select("id, created_at, body, payload")
    .eq("restaurant_id", restaurantId)
    .eq("receiver_user_id", managerId)
    .eq("type", "weekly_summary")
    .gte("created_at", weekStart.toISOString())
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.warn("[WEEKLY TOP] load failed", error);
    if (host) host.textContent = "Could not load weekly summary.";
    return;
  }

  const row = (data && data[0]) ? data[0] : null;
  if (!row) {
    if (host) host.textContent = "No weekly summary yet.";
    return;
  }

  const p = row.payload || {};
  const created = row.created_at ? new Date(row.created_at).toLocaleString() : "";

  if (host) {
    host.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:6px;">
        <div style="opacity:.75;">Generated: ${escapeHtml(created)}</div>
        <div>🏆 <b>Top performer:</b> ${escapeHtml(String(p.topPerformer || "—"))}</div>
        <div>📈 <b>Most improved skill:</b> ${escapeHtml(String(p.mostImprovedSkill || "—"))}</div>
        <div>🎯 <b>Recommended focus:</b> ${escapeHtml(String(p.recommendedFocus || "—"))}</div>
        <div style="opacity:.75;"><b>Reports analyzed:</b> ${escapeHtml(String(p.reportsAnalyzed ?? 0))}</div>
      </div>
    `;
  }
}

async function loadManagerBoardData() {
  try {
    const { restaurantId, isManager, isGroupish } = getManagerBoardFilter();
    if (!isManager) throw new Error("Manager only");
    if (!restaurantId) throw new Error("Active restaurant not set");

    if (!appState.restaurant || appState.restaurant.id !== restaurantId) {
      try { appState.restaurant = await loadRestaurant(restaurantId); } catch {}
    }

    document.getElementById("mbRestName").textContent =
      appState.restaurant?.name || (String(restaurantId).slice(0, 8) + "…");
    document.getElementById("mbMsg").textContent = "";
    wireManagerBoardMembers();
    await loadManagerBoardMembers();
    await loadLeaderboard();
    const weeklyRows = await loadWeeklyTrainingReport();
    await maybeSendWeeklyManagerSummary(weeklyRows);
    await loadWeeklySummaryTop();

    // Views you actually have
    const RUNS_TABLE = "bc_sessions_v1";                 // sessions summary
    const DRILLS_TABLE = "bc_event_log";                 // drill events
    const STREAK_TABLE = "bc_encounter_resolutions_v1";  // chain signal source

    // -----------------------------
    // Totals
    // -----------------------------
    const runsRes = await supabase
      .from(RUNS_TABLE)
      .select("session_id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId);

    const drillsRes = await supabase
      .from(DRILLS_TABLE)
      .select("event_id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .eq("event_type", "drill_completed");

    if (runsRes.error) throw runsRes.error;
    if (drillsRes.error) throw drillsRes.error;

    document.getElementById("mbRunsTotal").textContent = String(runsRes.count ?? 0);
    document.getElementById("mbDrillsTotal").textContent = String(drillsRes.count ?? 0);

    // -----------------------------
    // Recent activity feed
    // -----------------------------
    const recentRuns = await supabase
      .from(RUNS_TABLE)
      .select("session_start, user_id, encounters_resolved, avg_chain_score, greens, yellows, reds")
      .eq("restaurant_id", restaurantId)
      .order("session_start", { ascending: false })
      .limit(5);

    const recentDrills = await supabase
      .from(DRILLS_TABLE)
      .select("occurred_at, user_id, payload")
      .eq("restaurant_id", restaurantId)
      .eq("event_type", "drill_completed")
      .order("occurred_at", { ascending: false })
      .limit(5);

    if (recentRuns.error) throw recentRuns.error;
    if (recentDrills.error) throw recentDrills.error;

    const userIds = [
      ...(recentRuns.data || []).map(x => x.user_id).filter(Boolean),
      ...(recentDrills.data || []).map(x => x.user_id).filter(Boolean),
    ];
    const nameMap = await mapUserIdsToNames(userIds);
    console.log("[MB] nameMap", { requested: userIds.length, resolved: nameMap.size });

    const items = [
      ...(recentRuns.data || []).map((x) => ({
        t: x.session_start,
        line: `Session • ${userLabel(x.user_id, nameMap)} • ${x.encounters_resolved ?? 0} resolved • avg chain score ${(Number(x.avg_chain_score ?? 0)).toFixed(2)} • G/Y/R ratio: ${x.greens ?? 0}/${x.yellows ?? 0}/${x.reds ?? 0}`,
      })),
      ...(recentDrills.data || []).map((x) => ({
        t: x.occurred_at,
        line: `Drill • ${userLabel(x.user_id, nameMap)} • reps ${x.payload?.repDone ?? "-"} / ${x.payload?.repTarget ?? "-"}`,
      })),
    ]
      .filter((i) => i.t)
      .sort((a, b) => new Date(b.t) - new Date(a.t))
      .slice(0, 8);

    document.getElementById("mbRecent").innerHTML =
      items.length
        ? items
            .map(
              (i) =>
                `<div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
                  ${i.line}
                  <div style="opacity:.6; font-size:12px;">${i.t}</div>
                </div>`
            )
            .join("")
        : `<div style="opacity:.8;">No activity yet.</div>`;

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
      .select("user_id, occurred_at, chain_signal")
      .eq("restaurant_id", restaurantId)
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
      const sigs = rowsDesc.map((r) => String(r.chain_signal || "").toLowerCase());

      // current: count greens from start until first non-green
      let current = 0;
      for (const s of sigs) {
        if (s === "green") current++;
        else break;
      }

      // best: max consecutive greens anywhere
      let best = 0, run = 0;
      for (const s of sigs) {
        if (s === "green") {
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

    // -----------------------------
    // Needs coaching (ranked, not binary)
    // Uses bc_user_latest_v1 so it works even when sessions are sparse
    // -----------------------------
    let latestQ = supabase
      .from("bc_user_latest_v1")
      .select("user_id, last10_count, last10_greens, last10_yellows, last10_reds, last10_avg_chain_score, latest_chain_signal, latest_tier, latest_grade, latest_occurred_at")
      .eq("restaurant_id", restaurantId)
      .order("latest_occurred_at", { ascending: false })
      .limit(200);

    const latestRes = await latestQ;

    if (latestRes.error) throw latestRes.error;

    const coaching = (latestRes.data || [])
      .map((u) => {
        const n = Number(u.last10_count ?? 0);
        const reds = Number(u.last10_reds ?? 0);
        const avg = Number(u.last10_avg_chain_score ?? 0);

        // score higher = more attention needed
        // (reds are heavy, low avg also heavy, low sample dampened)
        const attention =
          (reds * 3) +
          (avg < 2.2 ? 2 : 0) +
          (avg < 1.8 ? 2 : 0) +
          (n >= 8 ? 1 : 0);

        return {
          user_id: u.user_id,
          attention,
          n,
          reds,
          avg,
          latest_signal: u.latest_chain_signal,
          latest_tier: u.latest_tier,
          latest_grade: u.latest_grade,
          latest_occurred_at: u.latest_occurred_at,
        };
      })
      .sort((a, b) => (b.attention - a.attention) || (b.reds - a.reds) || (a.avg - b.avg))
      .slice(0, 5);

    const coachingNameMap = await mapUserIdsToNames(coaching.map(x => x.user_id));

    const coachEl = document.getElementById("mbNeedsCoaching");
    if (coachEl) {
      coachEl.innerHTML = coaching.length
        ? coaching
            .map((x) => {
              const u = userLabel(x.user_id, coachingNameMap);
              const reasons = [
                x.reds > 0 ? `${x.reds} red(s) in last10` : null,
                Number.isFinite(x.avg) ? `avg ${x.avg.toFixed(2)}` : null,
                x.latest_signal ? `latest ${x.latest_signal}` : null,
                x.latest_tier ? `tier ${x.latest_tier}` : null,
              ].filter(Boolean);

              return `<div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
                        <div><b>${u}</b> • ${reasons.join(" • ")}</div>
                        <div style="opacity:.6; font-size:12px;">${x.latest_occurred_at || ""}</div>
                      </div>`;
            })
            .join("")
        : `<div style="opacity:.8;">No coaching signals yet.</div>`;
    }

    setDebug({
      step: "managerBoard.loaded",
      restaurant_id: restaurantId,
      runs: runsRes.count,
      drills: drillsRes.count,
      streakUsers: topStreaks.length,
      coachingUsers: coaching.length,
    });
  } catch (e) {
    console.error(e);
    document.getElementById("mbMsg").textContent = e?.message || "Failed to load manager board";
    setDebug({ step: "managerBoard.error", error: e?.message || String(e) });
  }
}

async function loadAuthedState(reason = "manual") {
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

  // (ctx push removed here; only iframe onload + bc_ctx_request reply are allowed)
}

// ------------------------------------------------------------
// Tabs
// ------------------------------------------------------------
function setRole(role) {
  uiState.role = isManagerRole(role) ? "manager" : "waiter";
  const w = document.getElementById("tabRoleWaiter");
  const m = document.getElementById("tabRoleManager");
  if (uiState.role === "waiter") {
    w.classList.add("active");
    m.classList.remove("active");
  } else {
    m.classList.add("active");
    w.classList.remove("active");
  }
}

function setMode(mode) {
  uiState.mode = mode === "signup" ? "signup" : "login";
  const l = document.getElementById("tabModeLogin");
  const s = document.getElementById("tabModeSignup");
  if (uiState.mode === "login") {
    l.classList.add("active");
    s.classList.remove("active");
  } else {
    s.classList.add("active");
    l.classList.remove("active");
  }

  const wrap = document.getElementById("displayNameWrap");
  if (uiState.mode === "signup") wrap.classList.remove("hidden");
  else wrap.classList.add("hidden");

  // ✅ Role tabs only matter for signup; hide them during login
  const roleTabs = document.getElementById("roleTabs");
  if (roleTabs) {
    if (uiState.mode === "login") roleTabs.classList.add("hidden");
    else roleTabs.classList.remove("hidden");
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

  const role = String(appState.profile?.role || "").toLowerCase();
  const hasRestaurant = !!appState.profile?.restaurant_id;

  const showJoin = isAuthed && role === "waiter" && !hasRestaurant;
  if (joinBlock) (showJoin ? joinBlock.classList.remove("hidden") : joinBlock.classList.add("hidden"));
}

async function demoJoinRestaurantByCode() {
  try {
    clearMsgs();

    const code = normCode(document.getElementById("demoJoinCode")?.value);
    if (!code) throw new Error("Enter a join code.");

    await loadAuthedState("demo.join.precheck");
    if (!appState.session?.user) throw new Error("Login as a waiter first.");
    if (String(appState.profile?.role || "").toLowerCase() !== "waiter") throw new Error("Join-by-code is for waiter accounts.");
    if (appState.profile?.restaurant_id) throw new Error("You are already assigned to a restaurant.");

    setMsg("demoJoinMsg", "Submitting...");
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

    setMsg("demoJoinMsg", "Success ✅ Premium unlocked.", "success");
    setDebug({ step: "demo.join.ok", time: new Date().toISOString(), restaurant_id: rpc.data.restaurant_id });

    await loadAuthedState("demo.join.refresh");
    await ensureProfileDisplayName();
    renderDemoJoinBlock();

    if (appState.profile?.restaurant_id) {
      await decideRoute("demo.join.auto");
    }
  } catch (e) {
    console.error(e);
    setMsg("demoJoinMsg", e?.message || "Join failed", "error");
    setDebug({ step: "demo.join.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
}

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
    history.replaceState({}, "", u.pathname);
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

  try {
    await loadAuthedState(`routeDemo:${reason}`);
  } catch {}

  if (was !== "demo") forceRemountForModeSwitch("demo");

  const p = appState?.profile;
  const isPremium = String(p?.access_tier || "").toLowerCase().startsWith("premium");
  if (isPremium) {
    console.log("[BC] premium user -> skipping demo mount ✅");
    return;
  }

  setDebug({ step: "route.demo", time: new Date().toISOString(), reason, authed: !!appState.session?.user });
  showScreen("screenGameDemo");
  renderDemoJoinBlock();
  mountGameIframe("gameRootDemo", "demo");
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
          appState.invites = await loadInvites(appState.restaurant.id);
        } catch {
          appState.invites = [];
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
      mountPremiumGameIframe({ mode: "premium" });
      try {
        postToGame("bc_ctx", {
          userId: appState.session?.user?.id || null,
          restaurantId: appState.activeRestaurantId || appState.profile?.restaurant_id || null,
          scopeId: appState.profile?.scope_id || null,
          role: appState.profile?.role || null,
          mode: "premium"
        });
      } catch {}
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
    mountPremiumGameIframe({ mode: "premium" });
    try {
      postToGame("bc_ctx", {
        userId: appState.session?.user?.id || null,
        restaurantId: appState.activeRestaurantId || appState.profile?.restaurant_id || null,
        scopeId: appState.profile?.scope_id || null,
        role: appState.profile?.role || null,
        mode: "premium"
      });
    } catch {}
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

  const role = String(appState.profile?.role || "").toLowerCase();
  if (!isManagerRole(role)) {
    setDebug({ step: "managerBoard.blocked", reason, role });
    setMsg("authMsg", "Manager Board is manager-only.", "error");
    showScreen("screenPremiumApp");
    return;
  }

  unmountDemoGame("routeManagerBoard");

  // ✅ respect nav-passed tab (from iframe) if set
  window.__BC_MB_DEFAULTTAB__ = window.__BC_MB_DEFAULTTAB__ || "overview";

  showScreen("screenManagerBoard");
  applyManagerBoardVisibility();
  wireManagerBoardMenu();
  wireGroupSetupRedeem();

  await ensureActiveRestaurantReady();

  // ✅ load the selected tab without requiring a click
  window.__BC_MB_SHOWTAB__?.(window.__BC_MB_DEFAULTTAB__);
  await (window.__BC_MB_LOADTAB__?.(window.__BC_MB_DEFAULTTAB__) || loadManagerBoardData());

  wireManagerBoardMessenger();
  wireManagerBoardBillingAccess();
}

function isAuthed() {
  return !!window.appState?.session;
}

function routeDemoShellNoAuth() {
  console.log("[ROUTE] demo (no auth)");
  showScreen("screenGameDemo");
  setPremiumOverlayActive(false);
  destroyPremiumIframe("routeDemoShellNoAuth");
  window.__BC_DRILL_CONFIG__ = null;
  window.BC_DRILL_CONFIG = null;
  setPendingStartDrill(null);
  destroyDemoIframe("routeDemoShellNoAuth:pre");
  mountGameIframe("gameRootDemo", "demo");
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
    window.history.replaceState({}, "", url.pathname);
  } catch {}
  showScreen("screenHome");
  hardResetAuthUI();
}

async function decideRoute(reason = "decideRoute") {
  if (isHardLoggedOut()) {
    console.warn("[BC] decideRoute blocked (hard logged out)", reason);
    return;
  }

  clearMsgs();

  try {
    await loadAuthedState(reason);
    if (isHardLoggedOut()) return;
    await initRestaurantContextAfterAuth();
    if (isHardLoggedOut()) return;

    // 1) Logged out => Auth by default (Demo only if explicitly requested)
    if (!isAuthed()) {
      appMode = "public";
      if (window.__BC_FORCE_AUTH__) {
        window.__BC_FORCE_AUTH__ = false;
        routeAuth();
        setDebug({ step: "decideRoute.logged_out.force_auth", time: new Date().toISOString(), reason });
        return;
      }
      routeAuth();
      setDebug({ step: "decideRoute.logged_out.auth", time: new Date().toISOString(), reason });
      return;
    }

    // 2) HARD RULE: restaurant membership => Premium always
    if (appState.profile?.restaurant_id) {
      setAuthIntent("premium");
      await routePremium(`decideRoute.restaurant:${reason}`);
      return;
    }

    // 3) No restaurant => Demo
    setAuthIntent("demo");
    await routeDemo(`decideRoute.no_restaurant:${reason}`);
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
  const el = document.getElementById("invitesList");
  if (!el) return;

  const invites = appState.invites || [];
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
}

function renderHudSkillDashboard() {
  const localSkillSnapshot = () => {
    try {
      const uid = appState?.session?.user?.id || appState?.session?.userId || null;
      const rid = window.getActiveRestaurantId?.() || appState?.profile?.restaurant_id || null;
      if (!uid || !rid) {
        return { read: 0, framing: 0, delivery: 0, recovery: 0, closing: 0 };
      }
      const key = `bc_skills_v1_${uid}_${rid}`;
      const raw = localStorage.getItem(key);
      if (!raw) return { read: 0, framing: 0, delivery: 0, recovery: 0, closing: 0 };
      const t = JSON.parse(raw);
      const pct = (node) => {
        const p = Number(node?.points || 0);
        const a = Number(node?.attempts || 0);
        if (!a) return 0;
        return Math.max(0, Math.min(100, Math.round((p / a) * 100)));
      };
      return {
        read: pct(t.read),
        framing: pct(t.framing),
        delivery: pct(t.delivery),
        recovery: pct(t.recovery),
        closing: pct(t.closing),
      };
    } catch {
      return { read: 0, framing: 0, delivery: 0, recovery: 0, closing: 0 };
    }
  };

  const snap = (typeof getSkillSnapshot === "function")
    ? getSkillSnapshot()
    : localSkillSnapshot();

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

async function loadHudSkillTimeline() {
  const ctx = window.__BC_CTX__ || {};
  if (!ctx.userId || !ctx.restaurantId) return;

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
    .eq("user_id", ctx.userId)
    .eq("restaurant_id", ctx.restaurantId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.warn("[HUD TIMELINE]", error);
    return;
  }

  renderHudTimeline(data || []);
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
          <div style="opacity:.7;">Report</div>
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
  const role = String(appState.profile?.role || "-").toLowerCase();
  const r = appState.restaurant;
  const isMgr = isManagerRole(role);

  document.getElementById("hudRole").textContent = role;
  document.getElementById("hudRestName").textContent = r?.name || "-";
  document.getElementById("hudJoinCode").textContent = r?.code || "-";
  document.getElementById("hudSeatLimit").textContent = r?.seat_limit ?? "-";
  document.getElementById("hudRequireInvite").textContent = r ? (r.require_invite ? "Yes" : "No") : "-";

  const mgrBtn = document.getElementById("btnManagerBoard");
  if (mgrBtn) mgrBtn.classList.toggle("hidden", !isMgr);
  const msgBtn = document.getElementById("btnOpenMessages");
  if (msgBtn) msgBtn.classList.remove("hidden");

  const badge = document.getElementById("premiumBadge");
  if (badge) badge.textContent = `PREMIUM • ${String(role).toUpperCase()}`;

  const managerBlock = document.getElementById("managerOnlyBlock");
  const joinRow = document.getElementById("hudJoinRow");
  const copyRow = document.getElementById("hudCopyRow");
  managerBlock?.classList.toggle("hidden", !isMgr);
  joinRow?.classList.toggle("hidden", !isMgr);
  copyRow?.classList.toggle("hidden", !isMgr);

  const toggle = document.getElementById("toggleRequireInvite");
  if (toggle && r) toggle.checked = !!r.require_invite;

  const seatInput = document.getElementById("seatLimitInput");
  if (seatInput && r) seatInput.value = String(r.seat_limit ?? "");

  renderInvitesList();
  renderHudSkillDashboard();
}

// ------------------------------------------------------------
// Manager actions (HUD)
// ------------------------------------------------------------
async function adminAddInvite(emailRaw) {
  try {
    setMsg("hudMsg", "");
    const email = normEmail(emailRaw);
    if (!email) throw new Error("Enter a valid email.");

    const r = appState.restaurant;
    const sess = appState.session;
    if (!r?.id) throw new Error("Restaurant not loaded.");
    if (!sess?.user) throw new Error("Not logged in.");
    if (!isManagerRole(appState.profile?.role)) throw new Error("Manager only.");

    const ins = await withTimeout(
      supabase.from("restaurant_invites").insert({
        restaurant_id: r.id,
        email,
        status: "pending",
        created_by: sess.user.id,
      }),
      12000,
      "invites.insert"
    );

    if (ins.error) {
      const upd = await withTimeout(
        supabase
          .from("restaurant_invites")
          .update({ status: "pending", revoked_at: null, revoked_by: null })
          .eq("restaurant_id", r.id)
          .eq("email", email),
        12000,
        "invites.update(reinvite)"
      );
      if (upd.error) throw upd.error;
    }

    appState.invites = await loadInvites(r.id);
    renderInvitesList();
    setMsg("hudMsg", `Added: ${email}`, "success");
  } catch (e) {
    console.error(e);
    setMsg("hudMsg", e?.message || "Add failed", "error");
  }
}

async function adminRevokeInvite(emailRaw) {
  try {
    setMsg("hudMsg", "");
    const email = normEmail(emailRaw);
    if (!email) throw new Error("Invalid email.");

    const r = appState.restaurant;
    const sess = appState.session;
    if (!r?.id) throw new Error("Restaurant not loaded.");
    if (!sess?.user) throw new Error("Not logged in.");
    if (!isManagerRole(appState.profile?.role)) throw new Error("Manager only.");

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
    renderInvitesList();
    setMsg("hudMsg", `Removed: ${email}`, "success");
  } catch (e) {
    console.error(e);
    setMsg("hudMsg", e?.message || "Remove failed", "error");
  }
}

async function adminSaveRequireInvite() {
  try {
    setMsg("hudMsg", "");
    const r = appState.restaurant;
    if (!r?.id) throw new Error("Restaurant not loaded.");
    if (!isManagerRole(appState.profile?.role)) throw new Error("Manager only.");

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
    if (!r?.id) throw new Error("Restaurant not loaded.");
    if (!isManagerRole(appState.profile?.role)) throw new Error("Manager only.");

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

    const roleForSignup = uiState.role === "waiter" ? "waiter" : "manager";

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

      await decideRoute("login.ok.decideRoute");
      return;
    }

    // signup
    setMsg("authMsg", "Creating account...");
    const { error } = await withTimeout(
      parentSignUp(email, password, { role: roleForSignup, display_name: displayName || null }),
      15000,
      "auth.signUp"
    );
    if (error) throw error;

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

  console.warn("[LOGOUT] start", reason);

  try { localStorage.setItem("__BC_LOGOUT_LOCK__", String(Date.now())); } catch {}
  window.__BC_LOGOUT_LOCK__ = Date.now();

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
  try { destroyPremiumIframe("logout"); } catch (e) { console.warn("destroyPremiumIframe failed", e); }
  try { routeAuth(); } catch (e) { console.warn("routeAuth failed", e); }

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

  // 4) hard redirect with latch
  window.location.replace("/?loggedOut=1&ts=" + Date.now());
}
window.doLogout = doLogout;
console.log("doLogout is", window.doLogout);

// Backward-compatible alias for existing callsites.
async function logoutAll(reason = "logout") {
  return doLogout(reason);
}

function wireLogoutButtons() {
  const ids = [
    "btnLogoutCreate",
    "btnLogoutPremium",
    "btnLogoutManagerBoard",
  ];

  ids.forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.onclick = null;
    btn.__bcBound = false;
    bindInput(btn, async () => {
      await doLogout(id);
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
      // Don’t block other UI generally — but for logout, we want control.
      e.stopPropagation();
      e.stopImmediatePropagation?.();

      // Optional UX: disable button immediately to prevent double taps.
      try { btn.disabled = true; } catch {}

      (window.doLogout || doLogout)("ui:" + btn.id);
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
});

document.getElementById("btnAuthSubmit").addEventListener("click", submitAuth);

document.getElementById("tabRoleWaiter").addEventListener("click", () => setRole("waiter"));
document.getElementById("tabRoleManager").addEventListener("click", () => setRole("manager"));
document.getElementById("tabModeLogin").addEventListener("click", () => setMode("login"));
document.getElementById("tabModeSignup").addEventListener("click", () => setMode("signup"));

document.getElementById("btnDemoJoin").addEventListener("click", demoJoinRestaurantByCode);

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

wireParentButtons();
wireManagerBoardButton();
wireHudSendProgressButton();
wireWaiterMessagesPanel();

document.getElementById("btnOpenHud")?.addEventListener("click", () => {
  closeWaiterMessages?.();
  openHud();
  renderHud();
});

document.getElementById("btnCloseHud")?.addEventListener("click", () => {
  document.getElementById("hudPanel")?.classList.add("hidden");
  showScreen("screenPremiumApp");
});
document.getElementById("hudBackdrop")?.addEventListener("click", closeHud);
document.getElementById("btnBackToPremium")?.addEventListener("click", () => {
  showScreen("screenPremiumApp");
});

document.getElementById("btnCopyHudCode").addEventListener("click", async () => {
  try {
    const code = appState.restaurant?.code;
    if (!code) throw new Error("No code loaded.");
    await navigator.clipboard.writeText(code);
    setMsg("hudMsg", "Copied ✅", "success");
  } catch (e) {
    setMsg("hudMsg", e?.message || "Copy failed", "error");
  }
});

document.getElementById("btnAddInvite").addEventListener("click", async () => {
  const v = document.getElementById("inviteEmailInput").value;
  await adminAddInvite(v);
  document.getElementById("inviteEmailInput").value = "";
});
document.getElementById("btnSaveRequireInvite").addEventListener("click", adminSaveRequireInvite);
document.getElementById("btnSaveSeatLimit").addEventListener("click", adminSaveSeatLimit);

// Debug + cross-module access (safe to ship)
window.__BC_MB__ = window.__BC_MB__ || {};
window.__BC_MB__.wireManagerBoardMenu = wireManagerBoardMenu;
window.__BC_MB__.applyManagerBoardVisibility = applyManagerBoardVisibility;
window.__BC_MB__.loadManagerInsights = loadManagerInsights;
window.__BC_MB__.loadManagerBoardData = loadManagerBoardData;
window.__BC_MB__.loadManagerMessenger = loadManagerMessenger;
window.__BC_MB__.wireManagerBoardMessenger = wireManagerBoardMessenger;

// Optional convenience aliases (only if you want old calls to work)
window.wireManagerBoardMenu = wireManagerBoardMenu;
window.applyManagerBoardVisibility = applyManagerBoardVisibility;
window.loadManagerInsights = loadManagerInsights;
window.loadManagerBoardData = loadManagerBoardData;
window.loadManagerMessenger = loadManagerMessenger;

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
  history.replaceState({}, "", cleanUrl.pathname);
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
    history.replaceState({}, "", u.pathname);
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
setRole("waiter");
setMode("login");
setAuthIntent("login");
wireLogout();
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
    console.log("[ROUTE] no session -> forcing public mode");

    appMode = "public";
    window.__BC_FORCE_AUTH__ = false;

    try { setMode("login"); } catch {}
    try { setAuthIntent("login"); } catch {}

    showScreen("screenHome");
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
        console.log("[AUTH] session gone -> forcing login screen");
        appState.profile = null;
        appState.restaurant = null;
        appState.activeRestaurantId = null;
        appMode = "public";

        // Destroy all premium/demo shells
        try { document.querySelectorAll("iframe").forEach((f) => f.remove()); } catch {}

        showScreen("screenHome");
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
      showScreen("screenHome");
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
