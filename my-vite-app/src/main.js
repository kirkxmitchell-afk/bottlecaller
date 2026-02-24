// src/main.js
import "./style.css";
import { supabase, signIn, signUp, signOut, getSession } from "./lib/supabaseClient.js";
import { decideAllowedTier } from "./game/progressionBridge";
import { createProgressionStore } from "./progressionStore.js";

if (window.__BOTTLECALLER_BOOTED__) {
  throw new Error("BottleCaller boot attempted twice.");
}
window.__BOTTLECALLER_BOOTED__ = true;

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
        <div id="premiumIntentBlock" class="hidden" style="margin-top:10px;">
          <input id="premiumLicenseCode" type="text" placeholder="Enter Premium code" />
          <div class="small" style="margin-top:8px;">
            Contact us for purchase:
            <a href="mailto:hello@bottlecaller.com">hello@bottlecaller.com</a>
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
      <div id="premiumRoot" style="margin-top:10px;"></div>
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

      <div id="groupRestaurantPicker" class="card" style="display:none; margin-top:10px;">
        <strong>Active Restaurant</strong>
        <div class="small-text" style="margin-top:6px;">
          Group managers switch which restaurant they’re managing right now.
        </div>

        <div style="display:flex; gap:8px; margin-top:10px; align-items:center;">
          <select id="selActiveRestaurant" class="input" style="flex:1;"></select>
          <button id="btnSetActiveRestaurant" class="btn" type="button">Set</button>
        </div>

        <div id="activeRestaurantHint" class="small-text" style="margin-top:8px;"></div>
      </div>

      <div id="mbMenu" class="card" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <button class="btn" type="button" data-mbtab="overview">Overview</button>
        <button class="btn" type="button" data-mbtab="staff">Staff</button>
        <button class="btn" type="button" data-mbtab="insights">Insights</button>
        <button class="btn" type="button" data-mbtab="billing">Billing</button>
        <button class="btn" type="button" data-mbtab="provision">Provision</button>
      </div>

      <div id="mbPanels">
        <div id="mbTab_overview" class="mbTab">
          <div class="card">
            <div class="score-row">Restaurant: <span id="mbRestName">-</span></div>
            <div class="score-row">Total runs: <span id="mbRunsTotal">-</span></div>
            <div class="score-row">Total drills: <span id="mbDrillsTotal">-</span></div>
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
        </div>

        <div id="mbTab_staff" class="mbTab" style="display:none;"></div>
        <div id="mbTab_insights" class="mbTab" style="display:none;"></div>

        <div id="mbTab_billing" class="mbTab" style="display:none;">
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

            <hr style="opacity:.2; margin:12px 0;" />

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
        </div>

        <div id="mbTab_provision" class="mbTab" style="display:none;">
          <div class="card" style="margin-top:12px;">
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
    </div>
  </section>

  <!-- HUD BACKDROP -->
  <div id="hudBackdrop" class="hidden"
    style="position:fixed; inset:0; background: rgba(0,0,0,0.55); z-index: 99998;"></div>

  <!-- HUD PANEL -->
  <div id="hudPanel" class="hidden"
    style="
      position:fixed; right: 12px; top: 12px;
      width: min(520px, 92vw);
      z-index: 99999;
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

let authIntent = "demo"; // demo | premium

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
// --- storage key should be per-scope (group/enterprise) ---
function activeRestaurantStorageKey(scopeId) {
  return `bc_active_restaurant_id::${scopeId || "noscope"}`;
}

function getStoredActiveRestaurantId() {
  const scopeId = appState?.profile?.scope_id || null;
  try { return localStorage.getItem(activeRestaurantStorageKey(scopeId)) || null; }
  catch { return null; }
}

function setStoredActiveRestaurantId(rid) {
  const scopeId = appState?.profile?.scope_id || null;
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
      S?.profile?.restaurant_id ||
      null
    );
  };

// --- Fetch allowed restaurants for current scope ---
async function fetchAllowedRestaurantsForScope(scopeId) {
  if (!scopeId) return [];
  const { data, error } = await supabase
    .from("bc_scope_restaurants")
    .select("restaurant_id, restaurants:restaurants(id,name,code,seat_limit,require_invite)")
    .eq("scope_id", scopeId);

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

  const stored = getStoredActiveRestaurantId();
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
  if (next) setStoredActiveRestaurantId(next);

  return { ok: !!next, activeRestaurantId: next, allowed };
}

// --- Call this after login/profile load, BEFORE board/game boot ---
async function initRestaurantContextAfterAuth() {
  const res = await ensureActiveRestaurantValid();
  console.log("[MB] active restaurant resolved", res);

  if (!res.ok) {
    return;
  }

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

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
  if (role === "manager" && (scopeType === "group" || scopeType === "enterprise")) {
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

async function buildBcCtxSafe(requestedMode = null) {
  const S = window.appState;
  const userId = S?.session?.user?.id ?? null;
  const profile = S?.profile ?? null;

  if (!userId || !profile?.role) return null;

  let restaurantId = window.getActiveRestaurantId?.() ?? null;
  if (!restaurantId) return null;

  const allowed = await assertRestaurantAllowedForCtx(profile, restaurantId);

  if (!allowed.ok) {
    console.warn("[CTX] restaurant not allowed", { restaurantId, allowed });

    const role = String(profile?.role || "").toLowerCase();
    const st = String(profile?.scope_type || "").toLowerCase();
    const scopeId = profile?.scope_id || null;

    if (role === "manager" && (st === "group" || st === "enterprise") && scopeId) {
      try {
        const fallback = await getFirstAllowedRestaurantForScope(scopeId);
        if (fallback && fallback !== restaurantId) {
          console.warn("[CTX] auto-heal -> switching active restaurant", fallback);
          await setActiveRestaurantForGroup(fallback);
          restaurantId = fallback;

          const allowed2 = await assertRestaurantAllowedForCtx(profile, restaurantId);
          if (!allowed2.ok) return null;
        } else {
          return null;
        }
      } catch (e) {
        console.warn("[CTX] auto-heal failed", e);
        return null;
      }
    } else {
      return null;
    }
  }

  const scopeId = profile?.scope_id ?? null;
  const role = profile?.role ?? null;

  return {
    userId,
    restaurantId,
    scopeId,
    role,
    mode: requestedMode ?? null,
  };
}

if (!window.__BC_PARENT_BRIDGE__) {
  window.__BC_PARENT_BRIDGE__ = {
    loadGroupRestaurantsForPicker,
    setActiveRestaurantForGroup,
    mountPremiumGameIframe,
  };

  window.__BC_BUILD_CTX_SAFE__ = buildBcCtxSafe;

  window.__BC_PENDING_CTX_REQ__ = window.__BC_PENDING_CTX_REQ__ || null;

  async function flushPendingCtx() {
    const p = window.__BC_PENDING_CTX_REQ__;
    if (!p) return;

    // ✅ same-origin only
    if (p.origin !== window.location.origin) {
      console.warn("[PARENT] flushPendingCtx blocked: origin mismatch", { origin: p.origin });
      window.__BC_PENDING_CTX_REQ__ = null;
      return;
    }

    const ready =
      !!window.appState?.session?.user?.id &&
      !!window.appState?.profile?.role &&
      !!window.getActiveRestaurantId?.();
    if (!ready) return;

    const bcCtx = await buildBcCtxSafe(p.mode ?? null);
    if (!bcCtx?.userId || !bcCtx?.restaurantId || !bcCtx?.role) {
      console.warn("[PARENT] flushPendingCtx: refusing null/partial bc_ctx", bcCtx);
      return;
    }

    try {
      p.source?.postMessage({ source: "BC_MSG", v: 1, type: "bc_ctx", ...bcCtx }, p.origin);
      console.log("[PARENT] flushPendingCtx -> sent ✅", bcCtx);
      window.__BC_PENDING_CTX_REQ__ = null;
    } catch (e) {
      console.warn("[PARENT] flushPendingCtx failed", e);
    }
  }

  if (!window.__BC_RESTAURANT_WATCH__) {
    window.__BC_RESTAURANT_WATCH__ = setInterval(() => {
      if (!window.__BC_PENDING_CTX_REQ__) return;
      if (!window.appState?.session?.user?.id || !window.appState?.profile?.role) return;
      if (!window.getActiveRestaurantId?.()) return;
      flushPendingCtx();
    }, 250);
  }

  window.addEventListener("message", async (event) => {
    try {
      const msg = event?.data;
      if (!msg || msg.source !== "BC_MSG" || msg.v !== 1) return;

      // Same-origin only (your game is served from the same Vite origin)
      if (event.origin !== window.location.origin) return;

      // ✅ 1) ctx request MUST be handled before any event_log filtering
      if (msg.type === "bc_ctx_request") {
        const ready =
          !!window.appState?.session?.user?.id &&
          !!window.appState?.profile?.role &&
          !!window.getActiveRestaurantId?.();

        if (!ready) {
          console.warn("[PARENT] ctx not ready — queued bc_ctx_request");
          window.__BC_PENDING_CTX_REQ__ = {
            source: event.source,
            origin: event.origin,
            mode: msg?.mode ?? null,
            at: Date.now(),
          };
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

        console.log("[PARENT] bc_ctx_request -> reply", {
          requested: msg?.mode ?? null,
          bcCtx,
        });

        if (!bcCtx?.userId || !bcCtx?.restaurantId || !bcCtx?.role) {
          console.warn("[PARENT] refusing to send null/partial bc_ctx", bcCtx);
          return;
        }

        // ✅ OK: send ctx
        event.source?.postMessage(
          { source: "BC_MSG", v: 1, type: "bc_ctx", ...bcCtx },
          event.origin
        );

        return;
      }

      if (msg.type === "wines_request") {
        await fetchAndSendWines(event.source);
        return;
      }

      if (msg.type === "drill_pick") {
        window.__BC_PARENT_LAST_ENCOUNTER__ = msg;
        console.log("[PARENT] drill_pick stored ✅", msg);
        return;
      }

      // ✅ 2) event_log (telemetry)
      if (msg.type !== "event_log") return;

      const { eventType, payload } = msg;
      if (!eventType) return;

      const userId = appState.session?.user?.id || null;
      const restaurantId = appState.profile?.restaurant_id || null;

      // If not authed, ignore
      if (!userId) return;

      // If your DB requires restaurant_id, do NOT insert without it
      if (!restaurantId) {
        console.warn("[BC] event_log skipped (no restaurant_id)", { eventType });
        // optional nack
        event.source?.postMessage(
          { source: "BC_MSG", v: 1, type: "event_log_ack", ok: false, error: "no_restaurant_id" },
          event.origin
        );
        return;
      }

      const row = {
        event_id: payload?.eventId || crypto.randomUUID(),
        user_id: userId,
        restaurant_id: restaurantId,
        event_type: String(eventType),
        payload: payload || {},
        occurred_at: new Date().toISOString(),
      };

      if (eventType === "encounter_resolved") {
        const p = payload || {};
        console.log("[BC] about to upsert encounter_resolved payload fields", {
          v: p?.v,
          encounterId: p?.encounterId,
          sessionId: p?.sessionId,
          hasChecksKey: Object.prototype.hasOwnProperty.call(p, "checks"),
          keys: Object.keys(p || {}),
        });
      }

      console.log("[BC] upsert row", row);

      // ✅ upsert prevents double logs
      const ins = await supabase
        .from("bc_event_log")
        .upsert(row, { onConflict: "event_id" });

      if (ins.error) throw ins.error;

      // reply ack (optional)
      event.source?.postMessage(
        { source: "BC_MSG", v: 1, type: "event_log_ack", ok: true, eventType },
        event.origin
      );
    } catch (e) {
      console.error("[BC] parent bridge failed:", e);
      try {
        event.source?.postMessage(
          { source: "BC_MSG", v: 1, type: "event_log_ack", ok: false, error: String(e?.message || e) },
          event.origin
        );
      } catch {}
    }
  });
}

// ------------------------------------------------------------
// Progression Snapshot Provider (PARENT) -> used by progressionRouter
// ------------------------------------------------------------
window.__BC_GET_PROGRESSION_SNAPSHOT__ = async ({ userId, restaurantId }) => {
  // Basic sanity
  if (!userId || !restaurantId) return null;

  // IMPORTANT: do NOT trust caller userId; force current authed user
  const authedUserId = appState.session?.user?.id || null;
  const authedRestaurantId = appState.profile?.restaurant_id || null;

  if (!authedUserId) return null;
  if (authedUserId !== userId) return null;                 // prevent spoofing
  if (authedRestaurantId !== restaurantId) return null;     // prevent spoofing

  // Pull from your existing views
  // bc_readiness_v1 already contains last10_count/greens/reds/any_red_t2plus
  // bc_sessions_v1 contains pivots_success / pivots_taken AND encounters_resolved totals per session
  const [{ data: ready, error: e1 }, { data: sessions, error: e2 }] = await Promise.all([
    supabase
      .from("bc_readiness_v1")
      .select("last10_count,last10_greens,last10_reds,any_red_t2plus")
      .eq("user_id", userId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle(),

    supabase
      .from("bc_sessions_v1")
      .select("encounters_resolved,pivots_taken,pivots_success")
      .eq("user_id", userId)
      .eq("restaurant_id", restaurantId),
  ]);

  if (e1) console.warn("[BC] snapshot readiness error", e1);
  if (e2) console.warn("[BC] snapshot sessions error", e2);

  const totalEncounters = Array.isArray(sessions)
    ? sessions.reduce((sum, r) => sum + Number(r.encounters_resolved || 0), 0)
    : 0;

  const pivotsTaken = Array.isArray(sessions)
    ? sessions.reduce((sum, r) => sum + Number(r.pivots_taken || 0), 0)
    : 0;

  const pivotsSuccess = Array.isArray(sessions)
    ? sessions.reduce((sum, r) => sum + Number(r.pivots_success || 0), 0)
    : 0;

  return {
    encountersTotal: totalEncounters,

    last10Count: Number(ready?.last10_count || 0),
    last10Greens: Number(ready?.last10_greens || 0),
    last10Reds: Number(ready?.last10_reds || 0),

    anyRedT2Plus: !!ready?.any_red_t2plus,

    pivotsTaken,
    pivotsSuccess,
  };
};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  document.getElementById(id)?.classList.remove("hidden");
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

  if (!levelEl || !focusEl || !nextEl || !noteEl) return;

  levelEl.textContent = v.level || "";
  focusEl.textContent = v.focus || "";
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
  return document.getElementById("premiumRootFrame") || document.querySelector("#premiumRoot iframe");
}

function postToGame(type, payload = {}) {
  const frame = getPremiumFrame();
  const win = frame?.contentWindow;
  if (!win) {
    setDebug({ step: "postToGame.no_frame", type, payload });
    return false;
  }

  win.postMessage(
    { source: "BC_MSG", v: 1, type, ...payload },
    window.location.origin
  );

  return true;
}

async function fetchAndSendWines(targetWindow = null) {
  const restaurantId = window.getActiveRestaurantId();
  const scopeId = appState.profile?.scope_id || null;
  if (!restaurantId || !scopeId) {
    console.warn("[PARENT] wines_request blocked: missing scope/restaurant", { scopeId, restaurantId });
    return;
  }

  try {
    const { data, error } = await supabase
      .from("bc_wines")
      .select("*")
      .eq("scope_id", scopeId)
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const wines = Array.isArray(data) ? data : [];
    const win = targetWindow || getPremiumFrame()?.contentWindow;
    win?.postMessage(
      { source: "BC_MSG", v: 1, type: "wines_set", wines },
      window.location.origin
    );
    console.log("[PARENT] wines_set -> iframe ✅", { count: wines.length, restaurantId });
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

  if (btnSetup && !btnSetup.__bcBound) {
    btnSetup.__bcBound = true;
    btnSetup.addEventListener("click", () => {
      showScreen("screenPremiumApp");
      postToGame("nav", { target: "setup_premium" });
    });
  }

  if (btnManagerBoard && !btnManagerBoard.__bcBound) {
    btnManagerBoard.__bcBound = true;
    btnManagerBoard.addEventListener("click", () => {
      postToGame("nav", { target: "manager_board" });
    });
  }

  if (btnFiveMinRep && !btnFiveMinRep.__bcBound) {
    btnFiveMinRep.__bcBound = true;
    btnFiveMinRep.addEventListener("click", () => {
      const tier = 0;
      postToGame("start_drill", { repTarget: 3, focus: null, starter: "manager", tier });
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
}

// Premium entitlement check (Option 2)
// NOTE: restaurant_id must override everything. We will not use access_tier to block restaurant users.
function canAccessPremium(profile) {
  const role = String(profile?.role || "").toLowerCase();
  const restaurantId = profile?.restaurant_id ?? null;

  const isFirst50 = !!profile?.is_first50;
  const passExpiresAt = profile?.premium_pass_expires_at ? new Date(profile.premium_pass_expires_at) : null;
  const passOk = passExpiresAt && !isNaN(passExpiresAt.getTime()) && passExpiresAt.getTime() > Date.now();

  if (role !== "waiter" && role !== "manager") return { ok: false, reason: "invalid_role" };

  // ✅ HARD OVERRIDE: restaurant membership is premium
  if (restaurantId) return { ok: true, reason: "entitled.restaurant" };
  if (isFirst50) return { ok: true, reason: "entitled.first50" };
  if (passOk) return { ok: true, reason: "entitled.pass30" };
  return { ok: false, reason: "no_entitlement" };
}

// Home screen intent toggle
function setAuthIntent(next) {
  authIntent = next === "premium" ? "premium" : "demo";

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
  document.getElementById("hudBackdrop").classList.remove("hidden");
  document.getElementById("hudPanel").classList.remove("hidden");
}
function closeHud() {
  document.getElementById("hudBackdrop").classList.add("hidden");
  document.getElementById("hudPanel").classList.add("hidden");
}

function unmountDemoGame() {
  const demoRoot = document.getElementById("gameRootDemo");
  if (!demoRoot) return;
  demoRoot.innerHTML = "";
  console.log("[BC] demo game unmounted ✅");
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

  win.postMessage(
    {
      source: "BC_MSG",
      v: 1,
      type: "start_drill",
      repTarget
    },
    window.location.origin
  );

  console.log("[PARENT] start_drill sent ✅", { repTarget });
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

function clearGameMounts() {
  const demoMount = document.getElementById("gameRootDemo");
  const premMount = document.getElementById("premiumRoot");
  if (demoMount) demoMount.innerHTML = "";
  if (premMount) premMount.innerHTML = "";
}

function forceRemountForModeSwitch(nextMode) {
  // Ensure switching Demo↔Premium fully destroys/recreates iframe
  currentIframeMode = null;
  currentIframeVersion = Date.now();
  clearGameMounts();
  setDebug({ step: "game.iframe.forceRemount", nextMode, v: currentIframeVersion, time: new Date().toISOString() });
}

function mountGameIframe(targetId, mode /* "demo" | "premium" */) {
  const mount = document.getElementById(targetId);
  if (!mount) return;

  // ✅ Prevent unwanted resets: if same mode already mounted in this target, do nothing
  const existing = mount.querySelector("iframe");
  if (existing && currentIframeMode === mode) return;

  currentIframeMode = mode;

  // Cache-busting param required — but stable within this mode session
  const src = `/game/game.html?mode=${encodeURIComponent(mode)}&v=${currentIframeVersion}`;

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
  if (appState.profile?.role !== "manager") {
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
  if (appState.profile?.role !== "manager") {
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
  const isMgr = appState.profile?.role === "manager";
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

function mbShowTab(tab) {
  document.querySelectorAll("#mbPanels .mbTab").forEach((el) => {
    el.style.display = "none";
  });
  const el = document.getElementById(`mbTab_${tab}`);
  if (el) el.style.display = "block";
}

function wireManagerBoardMenu() {
  const menu = document.getElementById("mbMenu");
  if (!menu || menu.__wired) return;
  menu.__wired = true;

  menu.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("[data-mbtab]");
    if (!btn) return;
    mbShowTab(btn.getAttribute("data-mbtab"));
  });

  mbShowTab("overview");
}

function applyManagerBoardVisibility() {
  const p = appState.profile || {};
  const role = String(p.role || "").toLowerCase();
  const scopeType = String(p.scope_type || "").toLowerCase();

  const picker = document.getElementById("groupRestaurantPicker");
  if (picker) {
    const show = role === "manager" && (scopeType === "group" || scopeType === "enterprise") && !!p.scope_id;
    picker.style.display = show ? "block" : "none";
  }

  const provisionBtn = document.querySelector('#mbMenu [data-mbtab="provision"]');
  if (provisionBtn) {
    provisionBtn.style.display = (scopeType === "group" || scopeType === "enterprise") ? "" : "none";
  }

  const billingBtn = document.querySelector('#mbMenu [data-mbtab="billing"]');
  if (billingBtn) billingBtn.style.display = "";
}

async function loadGroupRestaurantsForPicker() {
  const sel = document.getElementById("selActiveRestaurant");
  if (!sel) return;

  sel.innerHTML = "";

  const scopeType = String(appState.profile?.scope_type || "");
  const scopeId = appState.profile?.scope_id;

  // Only show picker for group / enterprise
  if (!scopeId || (scopeType !== "group" && scopeType !== "enterprise")) {
    return;
  }

  // IMPORTANT: this must read from bc_scope_restaurants, not profiles.restaurant_id
  const { data, error } = await supabase
    .from("bc_scope_restaurants")
    .select("restaurant_id, restaurants!inner(name)")
    .eq("scope_id", scopeId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[BC] loadGroupRestaurantsForPicker error", error);
    return;
  }

  const rows = Array.isArray(data) ? data : [];
  rows.forEach((row) => {
    const opt = document.createElement("option");
    opt.value = row.restaurant_id;
    opt.textContent = row.restaurants?.name || row.restaurant_id;
    sel.appendChild(opt);
  });

  // Optional: preselect active restaurant if already set
  const current = appState.activeRestaurantId || appState.profile?.restaurant_id || null;
  if (current) sel.value = current;

  console.log("[BC] group picker hydrated", { scopeId, count: rows.length, rows });

  // Validate stored activeRestaurantId
  const stored = appState.activeRestaurantId;
  if (stored) {
    try {
      const ok = await assertRestaurantAllowedForScope(scopeId, stored);
      if (!ok) {
        appState.activeRestaurantId = null;
        try { localStorage.removeItem(activeRestaurantStorageKey()); } catch {}
        console.warn("[BC] cleared invalid stored activeRestaurantId", stored);
      }
    } catch (e) {
      console.warn("[BC] active restaurant validation failed", e);
    }
  }
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

function pushCtxToPremiumIframe(source = "manual") {
  const iframe = document.querySelector("#premiumRoot iframe");
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

function mountPremiumGameIframe() {
  const root = document.getElementById("premiumRoot");
  if (!root) return;

  root.innerHTML = "";

  const iframe = document.createElement("iframe");
  iframe.src = `/game/game.html?mode=premium&v=${Date.now()}`;
  iframe.style.width = "100%";
  iframe.style.height = "78vh";
  iframe.style.border = "0";
  root.appendChild(iframe);

  console.log("[BC] mounted premium iframe", iframe.src);
}

async function setActiveRestaurantForGroup(restaurantId) {
  const p = appState.profile || {};
  const role = String(p.role || "").toLowerCase();
  const scopeType = String(p.scope_type || "").toLowerCase();
  const scopeId = p.scope_id || null;

  if (role !== "manager") throw new Error("Only managers can switch restaurants.");
  if (!scopeId) throw new Error("Missing scope_id on profile.");
  if (scopeType !== "group" && scopeType !== "enterprise") {
    throw new Error("Restaurant switching only allowed for group/enterprise scopes.");
  }
  if (!restaurantId) throw new Error("No restaurant selected.");

  // 0) hard allow-check
  const ok = await assertRestaurantAllowedForScope(scopeId, restaurantId);
  if (!ok) throw new Error("Restaurant not allowed for this scope.");

  // 1) persist selection (LOCAL preference only)
  appState.activeRestaurantId = restaurantId;
  try { setStoredActiveRestaurantId(restaurantId); } catch {}

  const hint = document.getElementById("activeRestaurantHint");
  if (hint) hint.textContent = `Active: ${String(restaurantId).slice(0, 8)}…`;

  // 2) hydrate restaurant into parent state
  try {
    const restaurant = await loadRestaurant(restaurantId);
    appState.restaurant = restaurant;
    window.__BC_APP_STATE__ = window.__BC_APP_STATE__ || {};
    window.__BC_APP_STATE__.restaurant = restaurant;
  } catch (e) {
    console.warn("[BC] loadRestaurant failed after switch", e);
  }

  // 3) DO NOT mutate profiles.restaurant_id for group/enterprise
  // profile.restaurant_id is not authoritative in multi-restaurant scopes.
  // Keep the profile stable (scope_id + scope_type define membership).

  console.log("[BC] active restaurant set (group/enterprise)", {
    scopeId,
    restaurantId,
    restaurant: appState.restaurant ? { id: appState.restaurant.id, name: appState.restaurant.name } : null
  });

  // 4) optional: only remount game if it's currently mounted/visible
  // (prevents random iframe reloads if you switch while staying in Manager Board)
  try {
    const playScreenVisible = !document.getElementById("screenPlay")?.classList.contains("hidden");
    if (playScreenVisible) mountPremiumGameIframe();
  } catch {}
}

async function loadManagerBoardData() {
  try {
    const r = appState.restaurant;
    const activeRestaurantId = window.getActiveRestaurantId?.() || null;
    if (!activeRestaurantId) throw new Error("Active restaurant not set.");

    document.getElementById("mbRestName").textContent = r?.name || "-";
    document.getElementById("mbMsg").textContent = "";

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
      .eq("restaurant_id", activeRestaurantId);

    const drillsRes = await supabase
      .from(DRILLS_TABLE)
      .select("event_id", { count: "exact", head: true })
      .eq("restaurant_id", activeRestaurantId)
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
      .eq("restaurant_id", activeRestaurantId)
      .order("session_start", { ascending: false })
      .limit(5);

    const recentDrills = await supabase
      .from(DRILLS_TABLE)
      .select("occurred_at, user_id, payload")
      .eq("restaurant_id", activeRestaurantId)
      .eq("event_type", "drill_completed")
      .order("occurred_at", { ascending: false })
      .limit(5);

    if (recentRuns.error) throw recentRuns.error;
    if (recentDrills.error) throw recentDrills.error;

    const items = [
      ...(recentRuns.data || []).map((x) => ({
        t: x.session_start,
        line: `Session • ${String(x.user_id || "-").slice(0, 8)} • ${x.encounters_resolved ?? 0} res • avg ${(Number(x.avg_chain_score ?? 0)).toFixed(2)} • G/Y/R ${x.greens ?? 0}/${x.yellows ?? 0}/${x.reds ?? 0}`,
      })),
      ...(recentDrills.data || []).map((x) => ({
        t: x.occurred_at,
        line: `Drill • ${x.user_id?.slice(0, 8) || "-"} • reps ${x.payload?.repDone ?? "-"} / ${x.payload?.repTarget ?? "-"}`,
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
      .eq("restaurant_id", activeRestaurantId)
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

    const streakEl = document.getElementById("mbBestStreaks");
    if (streakEl) {
      streakEl.innerHTML = topStreaks.length
        ? topStreaks
            .map((x) => {
              const u = String(x.userId).slice(0, 8);
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
    const latestRes = await supabase
      .from("bc_user_latest_v1")
      .select("user_id, last10_count, last10_greens, last10_yellows, last10_reds, last10_avg_chain_score, latest_chain_signal, latest_tier, latest_grade, latest_occurred_at")
      .eq("restaurant_id", activeRestaurantId)
      .order("latest_occurred_at", { ascending: false })
      .limit(200);

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

    const coachEl = document.getElementById("mbNeedsCoaching");
    if (coachEl) {
      coachEl.innerHTML = coaching.length
        ? coaching
            .map((x) => {
              const u = String(x.user_id).slice(0, 8);
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
      restaurant_id: activeRestaurantId,
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
  const { session, error: sErr } = await withTimeout(getSession(), 8000, "getSession");
  if (sErr) throw sErr;

  appState.session = session || null;
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

  // Decide authoritative restaurant context
  const scopeType = String(profile?.scope_type || "").toLowerCase();
  const isMulti =
    scopeType === "group" || scopeType === "enterprise";

  // For group/enterprise: prefer stored activeRestaurantId (scoped)
  // For single: use profile.restaurant_id
  let activeRestaurantId = null;

  if (isMulti) {
    activeRestaurantId = getStoredActiveRestaurantId();

    // If none stored yet, pick the first allowed restaurant from bc_scope_restaurants
    if (!activeRestaurantId && profile?.scope_id) {
      const { data, error } = await supabase
        .from("bc_scope_restaurants")
        .select("restaurant_id, created_at")
        .eq("scope_id", profile.scope_id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (error) {
        console.warn("[BC] bc_scope_restaurants lookup failed", error);
      } else {
        activeRestaurantId = data?.[0]?.restaurant_id || null;
        if (activeRestaurantId) {
          appState.activeRestaurantId = activeRestaurantId;
          try { setStoredActiveRestaurantId(activeRestaurantId); } catch {}
        }
      }
    }

    // set runtime active id (even if null)
    appState.activeRestaurantId = activeRestaurantId || null;

  } else {
    // Single restaurant accounts: profile.restaurant_id is authoritative
    activeRestaurantId = profile?.restaurant_id || null;
    appState.activeRestaurantId = null; // not used
  }

  // Hydrate restaurant object from the authoritative id
  appState.restaurant = null;
  if (activeRestaurantId) {
    try {
      appState.restaurant = await loadRestaurant(activeRestaurantId);
    } catch (e) {
      console.warn("[BC] loadRestaurant failed", e);
    }
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

  wireManagerBoardButton();

  // (ctx push removed here; only iframe onload + bc_ctx_request reply are allowed)
}

// ------------------------------------------------------------
// Tabs
// ------------------------------------------------------------
function setRole(role) {
  uiState.role = role === "manager" ? "manager" : "waiter";
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

    const rpc = await withTimeout(
      supabase.rpc("join_restaurant_by_code", { p_code: code }),
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

async function routeDemo(reason = "manual") {
  clearMsgs();
  closeHud(); // ✅ prevent overlay stealing clicks

  const was = appMode;
  appMode = "demo";

  try {
    await loadAuthedState(`routeDemo:${reason}`);
  } catch {}

  if (was !== "demo") forceRemountForModeSwitch("demo");

  const p = window.__BC_APP_STATE__?.profile;
  const isPremium = String(p?.access_tier || "").toLowerCase().startsWith("premium");
  if (isPremium) {
    console.log("[BC] premium user -> skipping demo mount ✅");
    return;
  }

  setDebug({ step: "route.demo", time: new Date().toISOString(), reason, authed: !!appState.session?.user });
  showScreen("screenGameDemo");
  renderDemoJoinBlock();
  mountGameIframe("gameRootDemo", "demo");
  setTimeout(() => {
    const frame = document.getElementById("gameRootDemoFrame");
    const w = frame?.contentWindow;
    if (!w) return;

    w.postMessage(
      {
        source: "BC_MSG",
        v: 1,
        type: "bc_ctx",
        userId: appState.session?.user?.id || null,
        restaurantId: appState.profile?.restaurant_id || null,
        scopeId: appState.profile?.scope_id || null,
        role: appState.profile?.role || null,
        mode: "demo",
      },
      window.location.origin
    );
  }, 50);
}

async function routePremium(reason = "manual") {
  const now = Date.now();
  if (routingLock) return;
  if (now - lastRouteAt < 250) return;
  lastRouteAt = now;
  routingLock = true;

  const was = appMode;

  try {
    clearMsgs();
    await loadAuthedState(`routePremium:${reason}`);
    await initRestaurantContextAfterAuth();

    if (!appState.session?.user) {
      closeHud();
      showScreen("screenHome");
      setMsg("authMsg", "Login first, then press Premium.", "error");
      return;
    }

    const profile = appState.profile;

    // ✅ HARD RULE: restaurant membership routes to premium always (do not block on access_tier)
    if (profile?.restaurant_id) {
      if (String(profile?.role).toLowerCase() === "manager" && appState.restaurant?.id) {
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

      unmountDemoGame();
      showScreen("screenPremiumApp");
      const p = window.__BC_APP_STATE__?.profile;
      const isPremium = String(p?.access_tier || "").toLowerCase().startsWith("premium");
      const isGroup = String(p?.scope_type || "").toLowerCase() === "group";

      if (isPremium && isGroup && !p?.restaurant_id) {
        console.log("[BC] group manager needs active restaurant -> Manager Board");
        showScreen("screenManagerBoard");
        return;
      }
      mountGameIframe("premiumRoot", "premium");
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
    if (String(profile?.role).toLowerCase() === "manager" && !profile?.restaurant_id) {
      appMode = "premium";
      closeHud();
      showScreen("screenCreateRestaurant");
      return;
    }

    renderHud();
    appMode = "premium";

    if (was !== "premium") forceRemountForModeSwitch("premium");

    unmountDemoGame();
    showScreen("screenPremiumApp");
    wireParentButtons();
    const p = window.__BC_APP_STATE__?.profile;
    const isPremium = String(p?.access_tier || "").toLowerCase().startsWith("premium");
    const isGroup = String(p?.scope_type || "").toLowerCase() === "group";

    if (isPremium && isGroup && !p?.restaurant_id) {
      console.log("[BC] group manager needs active restaurant -> Manager Board");
      showScreen("screenManagerBoard");
      return;
    }
    mountGameIframe("premiumRoot", "premium");
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
  await initRestaurantContextAfterAuth();

  const role = String(appState.profile?.role || "").toLowerCase();
  if (role !== "manager") {
    setDebug({ step: "managerBoard.blocked", reason, role });
    setMsg("authMsg", "Manager Board is manager-only.", "error");
    showScreen("screenPremiumApp");
    return;
  }

  unmountDemoGame();
  showScreen("screenManagerBoard");
  applyManagerBoardVisibility();
  wireManagerBoardMenu();
  wireGroupSetupRedeem();
  await loadManagerBoardData();
  wireManagerBoardBillingAccess();
  await loadGroupRestaurantsForPicker();

  const btn = document.getElementById("btnSetActiveRestaurant");
  const sel = document.getElementById("selActiveRestaurant");
  if (btn && sel && !btn.__bcBound) {
    btn.__bcBound = true;
    btn.addEventListener("click", async () => {
      const rid = sel.value;
      try {
        await setActiveRestaurantForGroup(rid);
        await loadManagerBoardData(); // refresh board for new restaurant
      } catch (e) {
        console.error("[BC] set active restaurant failed", e);
        const hint = document.getElementById("activeRestaurantHint");
        if (hint) hint.textContent = `⚠️ ${e?.message || "Failed to set restaurant"}`;
      }
    });
  }
}

async function decideRoute(reason = "decideRoute") {
  clearMsgs();

  try {
    await loadAuthedState(reason);
    await initRestaurantContextAfterAuth();

    // 1) Logged out => Home
    if (!appState.session?.user) {
      closeHud();
      setAuthIntent("demo");
      appMode = "public";
      showScreen("screenHome");
      setDebug({ step: "decideRoute.logged_out", time: new Date().toISOString(), reason });
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

function renderHud() {
  const role = String(appState.profile?.role || "-").toLowerCase();
  const r = appState.restaurant;

  document.getElementById("hudRole").textContent = role;
  document.getElementById("hudRestName").textContent = r?.name || "-";
  document.getElementById("hudJoinCode").textContent = r?.code || "-";
  document.getElementById("hudSeatLimit").textContent = r?.seat_limit ?? "-";
  document.getElementById("hudRequireInvite").textContent = r ? (r.require_invite ? "Yes" : "No") : "-";

  const mgrBtn = document.getElementById("btnManagerBoard");
  if (mgrBtn) {
    if (role === "manager") mgrBtn.classList.remove("hidden");
    else mgrBtn.classList.add("hidden");
  }

  const badge = document.getElementById("premiumBadge");
  if (badge) badge.textContent = `PREMIUM • ${String(role).toUpperCase()}`;

  const managerBlock = document.getElementById("managerOnlyBlock");
  const joinRow = document.getElementById("hudJoinRow");
  const copyRow = document.getElementById("hudCopyRow");

  if (role === "manager") {
    managerBlock.classList.remove("hidden");
    joinRow.classList.remove("hidden");
    copyRow.classList.remove("hidden");
  } else {
    managerBlock.classList.add("hidden");
    joinRow.classList.add("hidden");
    copyRow.classList.add("hidden");
  }

  const toggle = document.getElementById("toggleRequireInvite");
  if (toggle && r) toggle.checked = !!r.require_invite;

  const seatInput = document.getElementById("seatLimitInput");
  if (seatInput && r) seatInput.value = String(r.seat_limit ?? "");

  renderInvitesList();
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
    if (String(appState.profile?.role || "").toLowerCase() !== "manager") throw new Error("Manager only.");

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
    if (String(appState.profile?.role || "").toLowerCase() !== "manager") throw new Error("Manager only.");

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
    if (String(appState.profile?.role || "").toLowerCase() !== "manager") throw new Error("Manager only.");

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
    if (String(appState.profile?.role || "").toLowerCase() !== "manager") throw new Error("Manager only.");

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

  // IMPORTANT:
  // This RPC name/param must match YOUR database function.
  // If yours is named differently, change the next line only.
  const rpc = await withTimeout(
    supabase.rpc("claim_license_code", { p_code: code }),
    15000,
    "rpc.claim_license_code"
  );

  if (rpc.error) throw rpc.error;
  if (!rpc.data?.ok) throw new Error(rpc.data?.error || "Code failed");

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
      const res = await withTimeout(signIn(email, password), 15000, "auth.signIn");
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
      if (pr === "manager") setRole("manager");
      if (pr === "waiter") setRole("waiter");

      await decideRoute("login.ok.decideRoute");
      return;
    }

    // signup
    setMsg("authMsg", "Creating account...");
    const { error } = await withTimeout(
      signUp(email, password, { role: roleForSignup, display_name: displayName || null }),
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
async function logoutAll(reason = "logout") {
  try {
    await signOut();
  } finally {
    appMode = "public";
    appState.session = null;
    appState.profile = null;
    appState.restaurant = null;
    appState.invites = [];
    closeHud();
    setHomeAuthUI(false);

    setAuthIntent("demo");
    currentIframeMode = null;
    clearGameMounts();

    showScreen("screenHome");
    setDebug({ step: "logout", time: new Date().toISOString(), reason });
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
      setAuthIntent("demo");
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
  setAuthIntent("demo");
  setMsg("authMsg", "", "normal");
});

document.getElementById("btnHomeLogout").addEventListener("click", () => logoutAll("home.logout"));
document.getElementById("btnAuthSubmit").addEventListener("click", submitAuth);

document.getElementById("tabRoleWaiter").addEventListener("click", () => setRole("waiter"));
document.getElementById("tabRoleManager").addEventListener("click", () => setRole("manager"));
document.getElementById("tabModeLogin").addEventListener("click", () => setMode("login"));
document.getElementById("tabModeSignup").addEventListener("click", () => setMode("signup"));

document.getElementById("btnDemoJoin").addEventListener("click", demoJoinRestaurantByCode);

document.getElementById("btnDemoPremium").addEventListener("click", async () => {
  setAuthIntent("premium");
  await routePremium("demo.premium");
});

document.getElementById("btnDemoExit").addEventListener("click", () => {
  setAuthIntent("demo");
  closeHud();
  showScreen("screenHome");
});

document.getElementById("btnCreateRestaurant").addEventListener("click", createPremiumRestaurant);
document.getElementById("btnLogoutCreate").addEventListener("click", () => logoutAll("create.logout"));

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

document.getElementById("btnLogoutPremium").addEventListener("click", () => logoutAll("premium.logout"));
wireManagerBoardButton();
document.getElementById("btnOpenHud").addEventListener("click", () => {
  renderHud();
  openHud();
});

document.getElementById("btnCloseHud").addEventListener("click", closeHud);
document.getElementById("hudBackdrop").addEventListener("click", closeHud);
document.getElementById("btnBackToPremium")?.addEventListener("click", () => {
  showScreen("screenPremiumApp");
});
document.getElementById("btnLogoutManagerBoard")?.addEventListener("click", () => logoutAll("managerBoard.logout"));

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

// ------------------------------------------------------------
// Boot + auth change
// ------------------------------------------------------------
showScreen("screenHome");
setRole("waiter");
setMode("login");
setAuthIntent("demo");

setDebug({ step: "boot.ready", time: new Date().toISOString(), supabaseUrl: import.meta.env.VITE_SUPABASE_URL });

// ✅ Auth changes should route via decideRoute.
// ✅ TOKEN_REFRESHED must NOT remount iframes / reset gameplay.
supabase.auth.onAuthStateChange((event) => {
  setDebug({ step: "auth.change", event, time: new Date().toISOString() });

  if (authRouteTimer) clearTimeout(authRouteTimer);

  authRouteTimer = setTimeout(async () => {
    try {
      if (event === "TOKEN_REFRESHED") {
        await loadAuthedState(`auth.refresh:${event}`);
        return; // do not call decideRoute here (prevents iframe reset)
      }
      await decideRoute(`auth.change:${event}`);
    } catch {
      closeHud();
      showScreen("screenHome");
    }
  }, 150);
});

// Resume state on refresh
(async function bootResume() {
  try {
    await decideRoute("boot.resume");
    wireManagerBoardButton();
  } catch {}
})();

window.addEventListener("message", (event) => {
  if (event?.data?.source === "BC_MSG") {
    console.log("[PARENT] got BC_MSG:", event.data, "origin:", event.origin);
  }
});
