// src/main.js
import "./style.css";
import { supabase, signIn, signUp, signOut, getSession } from "./lib/supabaseClient.js";

console.log("supabase client present:", !!supabase);

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

        <!-- Tabs UNDER fields -->
        <div class="tabs" id="roleTabs" style="margin-top:2px;">
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
          <button id="btnLogoutPremium" class="btn-danger" type="button">Logout</button>
        </div>
      </div>

      <!-- Game lives here (isolated) -->
      <div id="premiumRoot" style="margin-top:10px;"></div>
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

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  document.getElementById(id)?.classList.remove("hidden");
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
    if (sub) sub.textContent = "Sign in to access Premium. (Restaurant members route into Premium automatically.)";
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

// ------------------------------------------------------------
// GAME LOADING (iframe) — no sticky stacking, no unwanted resets
// ------------------------------------------------------------
let currentIframeMode = null;      // "demo" | "premium"
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
  if (existing && currentIframeMode === mode) {
    return;
  }

  currentIframeMode = mode;

  // Cache-busting param required — but stable within this mode session
  const src = `/game/game.html?mode=${encodeURIComponent(mode)}&v=${currentIframeVersion}`;

  mount.innerHTML = `
    <iframe
      id="${targetId}Frame"
      src="${src}"
      title="BottleCaller Game"
      style="
        width: 100%;
        height: min(78vh, 860px);
        border: 1px solid rgba(255,255,255,0.10);
        border-radius: 14px;
        background: rgba(0,0,0,0.35);
        box-shadow: 0 10px 28px rgba(0,0,0,0.55);
      "
      loading="eager"
    ></iframe>
  `;

  setDebug({ step: "game.iframe.mounted", targetId, mode, src, time: new Date().toISOString() });
}

// ------------------------------------------------------------
// Data loaders
// ------------------------------------------------------------
async function loadProfile(userId) {
  const res = await withTimeout(
    supabase
      .from("profiles")
      .select("role, restaurant_id, display_name, access_tier, is_first50, premium_pass_expires_at")
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

  if (profile?.restaurant_id) {
    try {
      appState.restaurant = await loadRestaurant(profile.restaurant_id);
    } catch {}
  }

  setDebug({
    step: "authedState.loaded",
    time: new Date().toISOString(),
    reason,
    user: { id: session.user.id, email: session.user.email },
    profile,
    restaurant: appState.restaurant ? { id: appState.restaurant.id, name: appState.restaurant.name, code: appState.restaurant.code } : null,
  });
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

  // Only force remount if switching modes
  if (was !== "demo") forceRemountForModeSwitch("demo");

  setDebug({ step: "route.demo", time: new Date().toISOString(), reason, authed: !!appState.session?.user });
  showScreen("screenGameDemo");
  renderDemoJoinBlock();
  mountGameIframe("gameRootDemo", "demo");
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

    if (!appState.session?.user) {
      closeHud();
      showScreen("screenHome");
      setMsg("authMsg", "Login first, then press Premium.", "error");
      return;
    }

    const profile = appState.profile;

    // ✅ HARD RULE: restaurant membership routes to premium always (do not block on access_tier)
    if (profile?.restaurant_id) {
      // Load invites for manager
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

      // Only force remount if switching modes
      if (was !== "premium") forceRemountForModeSwitch("premium");

      showScreen("screenPremiumApp");
      mountGameIframe("premiumRoot", "premium");
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

    // Fallback (entitled but no restaurant; e.g. solo in future)
    renderHud();
    appMode = "premium";

    if (was !== "premium") forceRemountForModeSwitch("premium");

    showScreen("screenPremiumApp");
    mountGameIframe("premiumRoot", "premium");
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

async function decideRoute(reason = "decideRoute") {
  clearMsgs();

  try {
    await loadAuthedState(reason);

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
      setAuthIntent("premium"); // UI label only
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

// ✅ Optional: Premium button toggles intent when logged out
document.getElementById("btnHomePremium").addEventListener("click", async () => {
  // Logged out: toggle intent
  if (!appState.session?.user) {
    if (authIntent === "premium") {
      setAuthIntent("demo");
      setMsg("authMsg", "", "normal");
    } else {
      setAuthIntent("premium");
      setMsg("authMsg", "Premium selected. Login or Sign up below.", "success");
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
document.getElementById("btnOpenHud").addEventListener("click", () => {
  renderHud();
  openHud();
});

document.getElementById("btnCloseHud").addEventListener("click", closeHud);
document.getElementById("hudBackdrop").addEventListener("click", closeHud);

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
        // do not call decideRoute here (prevents iframe reset)
        return;
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
  } catch {}
})();
