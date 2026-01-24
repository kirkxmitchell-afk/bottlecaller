// src/main.js
import "./style.css";
import { supabase, signIn, signUp, signOut, getSession } from "./lib/supabaseClient.js";

console.log("supabase client present:", !!supabase);

// ------------------------------------------------------------
// UI
// ------------------------------------------------------------
document.querySelector("#app").innerHTML = `
  <!-- DEMO ENTRY (SEPARATE WINDOW) -->
  <section id="screenDemoEntry" class="screen">
    <div class="panel stack">
      <h2 style="margin:0;">BottleCaller</h2>
      <p style="margin-top:6px; opacity:.9;">
        Demo is open. Premium is invite-only + manager approval.
      </p>
      <div class="row" style="margin-top:10px;">
        <button id="btnStartDemo" type="button">Start Demo</button>
        <button id="btnGoPremiumEntry" type="button">Premium</button>
      </div>
      <div style="margin-top:10px; font-size:12px; opacity:.75;">
        Demo is separate from Premium.
      </div>
    </div>
  </section>

  <!-- PREMIUM ENTRY (SEPARATE WINDOW) -->
  <section id="screenPremiumEntry" class="screen hidden">
    <div class="panel stack">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <h2 style="margin:0;">Premium</h2>
        <button id="btnBackToDemoEntry" type="button" style="font-size:12px;">Back</button>
      </div>

      <div style="display:flex; gap:8px; margin-top:10px;">
        <button id="tabManager" type="button">I’m a Manager</button>
        <button id="tabWaiter" type="button" style="opacity:.85;">I’m a Waiter</button>
      </div>

      <!-- MANAGER PANEL -->
      <div id="managerPanel" class="stack" style="margin-top:12px;">
        <p style="margin:0; opacity:.9;">
          Managers create the restaurant and share the join code. Then approve waiters in the menu.
        </p>

        <input id="mgrEmail" type="email" placeholder="Manager email" />
        <input id="mgrPassword" type="password" placeholder="Password" />

        <div class="row">
          <button id="btnMgrLogin" type="button">Login</button>
          <button id="btnMgrSignup" type="button">Sign up</button>
        </div>

        <div id="mgrMsg"></div>
      </div>

      <!-- WAITER PANEL -->
      <div id="waiterPanel" class="stack hidden" style="margin-top:12px;">
        <p style="margin:0; opacity:.9;">
          Waiters sign up/login, enter the join code, then wait for manager approval.
        </p>

        <input id="wtrEmail" type="email" placeholder="Waiter email" />
        <input id="wtrPassword" type="password" placeholder="Password" />

        <div class="row">
          <button id="btnWtrLogin" type="button">Login</button>
          <button id="btnWtrSignup" type="button">Sign up</button>
        </div>

        <hr style="width:100%; opacity:.25; margin:14px 0;" />

        <input id="wtrJoinCode" type="text" placeholder="Join code from manager" />
        <button id="btnRequestAccess" type="button">Request Access</button>

        <div id="wtrMsg"></div>
      </div>
    </div>
  </section>

  <!-- PREMIUM: Create Restaurant (Manager) -->
  <section id="screenCreateRestaurant" class="screen hidden">
    <div class="panel stack">
      <h2>Create Restaurant</h2>
      <input id="restName" type="text" placeholder="Restaurant name" />
      <button id="btnCreateRestaurant" type="button">Create (15 seats)</button>

      <div id="createRestMsg"></div>

      <div id="codeBox" class="hidden" style="margin-top:10px; padding:10px; border:1px solid rgba(0,0,0,.15); border-radius:10px;">
        <div style="font-size:12px; opacity:.8;">Share this join code with your waiters:</div>
        <div style="font-size:18px; font-weight:700; margin-top:6px;" id="createdJoinCode">-</div>
        <div class="row" style="margin-top:10px;">
          <button id="btnCopyCreatedCode" type="button">Copy</button>
          <button id="btnEnterPremium" type="button">Enter Premium</button>
        </div>
        <div id="codeMsg" style="font-size:12px; opacity:.9; margin-top:6px;"></div>
      </div>

      <button id="btnLogoutCreate" type="button">Logout</button>
    </div>
  </section>

  <!-- WAITING FOR APPROVAL -->
  <section id="screenWaiterPending" class="screen hidden">
    <div class="panel stack">
      <h2>Waiting for approval</h2>
      <p style="opacity:.9;">Your manager must approve your request from their Premium menu.</p>
      <div id="pendingMsg"></div>

      <div class="row">
        <button id="btnPendingRefresh" type="button">Refresh</button>
        <button id="btnPendingCancel" type="button">Cancel request</button>
      </div>

      <button id="btnLogoutPending" type="button">Logout</button>
    </div>
  </section>

  <!-- PREMIUM APP -->
  <section id="screenPremiumApp" class="screen hidden">
    <div class="panel stack">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div style="display:flex; gap:10px; align-items:center;">
          <h2 style="margin:0;">BottleCaller</h2>
          <span id="premiumBadge"
            style="font-size:12px; padding:4px 8px; border:1px solid rgba(0,0,0,.15); border-radius:999px;">
            PREMIUM
          </span>
        </div>
        <div style="display:flex; gap:8px;">
          <button id="btnOpenHud" type="button">Menu</button>
          <button id="btnLogoutPremium" type="button">Logout</button>
        </div>
      </div>

      <div id="premiumRoot" style="margin-top:10px;">GAME LOADS HERE</div>
    </div>
  </section>

  <!-- DEMO APP -->
  <section id="screenGameDemo" class="screen hidden">
    <div class="panel stack">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div style="display:flex; gap:10px; align-items:center;">
          <h2 style="margin:0;">BottleCaller</h2>
          <span style="font-size:12px; padding:4px 8px; border:1px solid rgba(0,0,0,.15); border-radius:999px;">
            DEMO
          </span>
        </div>
        <div style="display:flex; gap:8px;">
          <button id="btnExitDemo" type="button">Exit Demo</button>
        </div>
      </div>

      <div id="gameRootDemo" style="margin-top:10px;">GAME LOADS HERE</div>
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
      background: #111; color: #fff;
      border-radius: 14px;
      padding: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    ">
    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
      <b>Premium Menu</b>
      <button id="btnCloseHud" type="button" style="font-size:12px;">Close</button>
    </div>

    <div style="margin-top:10px; font-size:13px; opacity:.95;">
      <div><b>Role:</b> <span id="hudRole">-</span></div>
      <div><b>Restaurant:</b> <span id="hudRestName">-</span></div>
      <div><b>Join code:</b> <span id="hudJoinCode">-</span></div>
      <div><b>Seat limit:</b> <span id="hudSeatLimit">-</span></div>
    </div>

    <div class="row" style="margin-top:10px;">
      <button id="btnCopyHudCode" type="button">Copy join code</button>
    </div>

    <div id="adminOnlyBlock" class="hidden">
      <hr style="opacity:.25; margin:12px 0;" />
      <h3 style="margin:0;">Join requests</h3>
      <p style="margin:6px 0 0; font-size:12px; opacity:.8;">
        Approve once-off here. After approval, the waiter can’t re-request unless you remove them later.
      </p>
      <div id="joinRequestsList" style="margin-top:10px; font-size:12px; opacity:.95;"></div>
    </div>

    <div id="hudMsg" style="margin-top:10px; font-size:12px; opacity:.9;"></div>
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
      border: 1px solid rgba(0,255,102,0.25);
    "></pre>
`;

const debugEl = document.getElementById("debugPanel");
debugEl.textContent = "Debug panel live ✅";

// ------------------------------------------------------------
// State
// ------------------------------------------------------------
let routingLock = false;
let lastRouteAt = 0;
let pendingPollTimer = null;

const appState = {
  session: null,
  profile: null,     // { role, restaurant_id, display_name }
  restaurant: null,  // { id,name,code,seat_limit }
  joinRequests: [],
};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  document.getElementById(id)?.classList.remove("hidden");
}
function setMsg(elId, msg) {
  const el = document.getElementById(elId);
  if (el) el.textContent = msg || "";
}
function setDebug(obj) {
  debugEl.textContent = JSON.stringify(obj, null, 2);
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
function stopPendingPoll() {
  if (pendingPollTimer) clearInterval(pendingPollTimer);
  pendingPollTimer = null;
}

// ------------------------------------------------------------
// Loaders
// ------------------------------------------------------------
async function loadProfile(userId) {
  const res = await withTimeout(
    supabase.from("profiles").select("role, restaurant_id, display_name").eq("user_id", userId).maybeSingle(),
    12000,
    "profiles.select"
  );
  if (res.error) throw res.error;
  return res.data;
}

async function loadRestaurant(restaurantId) {
  const res = await withTimeout(
    supabase.from("restaurants").select("id,name,code,seat_limit").eq("id", restaurantId).single(),
    12000,
    "restaurants.select"
  );
  if (res.error) throw res.error;
  return res.data;
}

async function loadPendingJoinRequests(restaurantId) {
  const res = await withTimeout(
    supabase
      .from("join_requests")
      .select("id,email,status,created_at")
      .eq("restaurant_id", restaurantId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    12000,
    "join_requests.select"
  );
  if (res.error) throw res.error;
  return res.data || [];
}

async function fetchMyLatestJoinRequest(userId) {
  const res = await withTimeout(
    supabase
      .from("join_requests")
      .select("id,status,restaurant_id,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    12000,
    "join_requests.my_latest"
  );
  if (res.error) throw res.error;
  return res.data;
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
function renderHud() {
  const role = appState.profile?.role || "-";
  const r = appState.restaurant;

  document.getElementById("hudRole").textContent = role;
  document.getElementById("hudRestName").textContent = r?.name || "-";
  document.getElementById("hudJoinCode").textContent = r?.code || "-";
  document.getElementById("hudSeatLimit").textContent = r?.seat_limit ?? "-";

  const badge = document.getElementById("premiumBadge");
  if (badge) badge.textContent = `PREMIUM • ${String(role).toUpperCase()}`;

  const adminBlock = document.getElementById("adminOnlyBlock");
  if (role === "admin") adminBlock.classList.remove("hidden");
  else adminBlock.classList.add("hidden");

  renderJoinRequestsList();
}

function renderJoinRequestsList() {
  const el = document.getElementById("joinRequestsList");
  if (!el) return;

  const reqs = appState.joinRequests || [];
  if (!reqs.length) {
    el.innerHTML = `<div style="opacity:.8;">No pending requests.</div>`;
    return;
  }

  el.innerHTML = reqs
    .map((r) => {
      const email = r.email || "unknown";
      const created = r.created_at ? new Date(r.created_at).toLocaleString() : "";
      return `
        <div style="display:flex; justify-content:space-between; gap:10px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="min-width:0;">
            <div style="font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${email}</div>
            <div style="font-size:12px; opacity:.75;">pending • ${created}</div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button data-approve="${r.id}" style="font-size:12px;">Accept</button>
            <button data-reject="${r.id}" style="font-size:12px; opacity:.9;">Reject</button>
          </div>
        </div>
      `;
    })
    .join("");

  el.querySelectorAll("button[data-approve]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-approve");
      if (!id) return;
      await adminApproveJoinRequest(id);
    });
  });

  el.querySelectorAll("button[data-reject]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-reject");
      if (!id) return;
      await adminRejectJoinRequest(id);
    });
  });
}

// ------------------------------------------------------------
// Router
// ------------------------------------------------------------
async function routePremium(reason = "manual") {
  const now = Date.now();
  if (routingLock) return;
  if (now - lastRouteAt < 250) return;
  lastRouteAt = now;
  routingLock = true;

  try {
    const { session, error: sErr } = await withTimeout(getSession(), 8000, "getSession");
    appState.session = session || null;

    setDebug({
      step: "route.session",
      time: new Date().toISOString(),
      reason,
      hasSession: !!session,
      sessionError: sErr?.message || null,
    });

    if (sErr || !session?.user) {
      appState.profile = null;
      appState.restaurant = null;
      appState.joinRequests = [];
      stopPendingPoll();
      return showScreen("screenPremiumEntry");
    }

    const userId = session.user.id;
    const profile = await loadProfile(userId);
    appState.profile = profile;

    setDebug({
      step: "route.profile",
      time: new Date().toISOString(),
      user: { id: userId, email: session.user.email },
      profile,
    });

    if (!profile?.restaurant_id) {
      if (profile?.role === "admin") {
        stopPendingPoll();
        return showScreen("screenCreateRestaurant");
      }

      const latestReq = await fetchMyLatestJoinRequest(userId);
      if (latestReq?.status === "pending") {
        showScreen("screenWaiterPending");
        setMsg("pendingMsg", "Status: pending");
        startPendingPoll(userId);
        return;
      }

      stopPendingPoll();
      return showScreen("screenPremiumEntry");
    }

    const restaurant = await loadRestaurant(profile.restaurant_id);
    appState.restaurant = restaurant;

    if (profile.role === "admin") {
      appState.joinRequests = await loadPendingJoinRequests(restaurant.id);
    } else {
      appState.joinRequests = [];
    }

    renderHud();
    stopPendingPoll();
    return showScreen("screenPremiumApp");
  } catch (e) {
    console.error(e);
    setDebug({ step: "route.crash", time: new Date().toISOString(), error: e?.message || String(e) });
    stopPendingPoll();
    return showScreen("screenPremiumEntry");
  } finally {
    routingLock = false;
  }
}

// ------------------------------------------------------------
// Pending poll (waiter)
// ------------------------------------------------------------
function startPendingPoll(userId) {
  stopPendingPoll();
  pendingPollTimer = setInterval(async () => {
    try {
      const req = await fetchMyLatestJoinRequest(userId);
      if (!req) return;

      setMsg("pendingMsg", `Status: ${req.status}`);

      if (req.status === "approved") {
        stopPendingPoll();
        await routePremium("waiter.approved");
      } else if (req.status === "rejected") {
        stopPendingPoll();
        setMsg("pendingMsg", "Status: rejected. Ask your manager.");
      } else if (req.status === "canceled") {
        stopPendingPoll();
        setMsg("pendingMsg", "Status: canceled.");
      }
    } catch {}
  }, 2500);
}

// ------------------------------------------------------------
// Actions
// ------------------------------------------------------------
async function createPremiumRestaurant() {
  try {
    const name = (document.getElementById("restName").value || "").trim();
    if (!name) throw new Error("Restaurant name is required.");

    const { session } = await withTimeout(getSession(), 8000, "getSession");
    if (!session?.user) throw new Error("Not logged in.");

    const seatLimit = 15;
    const joinCode = Math.random().toString(16).slice(2, 12).toUpperCase();

    setMsg("createRestMsg", "Creating...");

    const ins = await withTimeout(
      supabase
        .from("restaurants")
        .insert({
          name,
          code: joinCode,
          seat_limit: seatLimit,
          created_by: session.user.id,
        })
        .select("id,name,code,seat_limit")
        .single(),
      15000,
      "restaurants.insert"
    );
    if (ins.error) throw ins.error;

    const r = ins.data;

    const upd = await withTimeout(
      supabase.from("profiles").update({ restaurant_id: r.id }).eq("user_id", session.user.id),
      15000,
      "profiles.update(restaurant_id)"
    );
    if (upd.error) throw upd.error;

    document.getElementById("codeBox").classList.remove("hidden");
    document.getElementById("createdJoinCode").textContent = r.code;
    setMsg("createRestMsg", "Created. Share the join code with your waiters.");

    setDebug({ step: "restaurant.create.ok", time: new Date().toISOString(), restaurant: r });

  } catch (e) {
    setMsg("createRestMsg", e?.message || "Create failed");
    setDebug({ step: "restaurant.create.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
}

async function waiterRequestAccess() {
  try {
    const code = normCode(document.getElementById("wtrJoinCode").value);
    if (!code) throw new Error("Enter the join code.");

    const { session } = await withTimeout(getSession(), 8000, "getSession");
    if (!session?.user) throw new Error("Login first (as a waiter).");

    setMsg("wtrMsg", "Requesting access...");

    const rpc = await withTimeout(
      supabase.rpc("request_join_by_code", { p_code: code }),
      15000,
      "rpc.request_join_by_code"
    );
    if (rpc.error) throw rpc.error;

    if (!rpc.data?.ok) {
      const err = rpc.data?.error || "unknown";
      if (err === "invalid_code") throw new Error("Invalid join code.");
      if (err === "seat_limit_reached") throw new Error("Restaurant is full.");
      if (err === "already_in_restaurant") throw new Error("You are already in a restaurant.");
      throw new Error("Could not request access.");
    }

    showScreen("screenWaiterPending");
    setMsg("pendingMsg", "Status: pending");
    startPendingPoll(session.user.id);

    setDebug({ step: "waiter.request.ok", time: new Date().toISOString(), code });
  } catch (e) {
    setMsg("wtrMsg", e?.message || "Request failed");
    setDebug({ step: "waiter.request.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
}

async function waiterCancelPending() {
  try {
    const { session } = await withTimeout(getSession(), 8000, "getSession");
    const userId = session?.user?.id;
    if (!userId) throw new Error("Not logged in.");

    const latest = await fetchMyLatestJoinRequest(userId);
    if (!latest || latest.status !== "pending") throw new Error("No pending request to cancel.");

    const upd = await withTimeout(
      supabase.from("join_requests").update({ status: "canceled" }).eq("id", latest.id),
      12000,
      "join_requests.cancel"
    );
    if (upd.error) throw upd.error;

    stopPendingPoll();
    showScreen("screenPremiumEntry");
  } catch (e) {
    setMsg("pendingMsg", e?.message || "Cancel failed");
  }
}

async function waiterRefreshPending() {
  try {
    const { session } = await withTimeout(getSession(), 8000, "getSession");
    const userId = session?.user?.id;
    if (!userId) throw new Error("Not logged in.");

    const latest = await fetchMyLatestJoinRequest(userId);
    if (!latest) return setMsg("pendingMsg", "No request found.");

    setMsg("pendingMsg", `Status: ${latest.status}`);
    if (latest.status === "approved") await routePremium("waiter.refresh.approved");
  } catch (e) {
    setMsg("pendingMsg", e?.message || "Refresh failed");
  }
}

async function adminApproveJoinRequest(requestId) {
  try {
    setMsg("hudMsg", "Approving...");
    const rpc = await withTimeout(
      supabase.rpc("approve_join_request", { p_request_id: requestId }),
      15000,
      "rpc.approve_join_request"
    );
    if (rpc.error) throw rpc.error;
    if (!rpc.data?.ok) throw new Error(rpc.data?.error || "Approve failed");

    setMsg("hudMsg", "Approved (once-off).");
    appState.joinRequests = await loadPendingJoinRequests(appState.restaurant.id);
    renderJoinRequestsList();
  } catch (e) {
    setMsg("hudMsg", e?.message || "Approve failed");
  }
}

async function adminRejectJoinRequest(requestId) {
  try {
    setMsg("hudMsg", "Rejecting...");
    const rpc = await withTimeout(
      supabase.rpc("reject_join_request", { p_request_id: requestId }),
      15000,
      "rpc.reject_join_request"
    );
    if (rpc.error) throw rpc.error;
    if (!rpc.data?.ok) throw new Error(rpc.data?.error || "Reject failed");

    setMsg("hudMsg", "Rejected.");
    appState.joinRequests = await loadPendingJoinRequests(appState.restaurant.id);
    renderJoinRequestsList();
  } catch (e) {
    setMsg("hudMsg", e?.message || "Reject failed");
  }
}

async function logoutEverywhere() {
  try {
    stopPendingPoll();
    await signOut();
  } finally {
    appState.session = null;
    appState.profile = null;
    appState.restaurant = null;
    appState.joinRequests = [];
    closeHud();
    showScreen("screenPremiumEntry");
  }
}

// ------------------------------------------------------------
// Tabs (Premium)
function setPremiumTab(tab) {
  const managerPanel = document.getElementById("managerPanel");
  const waiterPanel = document.getElementById("waiterPanel");
  const tabManager = document.getElementById("tabManager");
  const tabWaiter = document.getElementById("tabWaiter");

  if (tab === "manager") {
    managerPanel.classList.remove("hidden");
    waiterPanel.classList.add("hidden");
    tabManager.style.opacity = "1";
    tabWaiter.style.opacity = ".75";
  } else {
    managerPanel.classList.add("hidden");
    waiterPanel.classList.remove("hidden");
    tabManager.style.opacity = ".75";
    tabWaiter.style.opacity = "1";
  }
}
// ------------------------------------------------------------
// Buttons / Events
// ------------------------------------------------------------

// Demo
document.getElementById("btnStartDemo").addEventListener("click", () => {
  showScreen("screenGameDemo");
  if (typeof window.initBottleCallerGame === "function") {
    try { window.initBottleCallerGame(); } catch {}
  }
});
document.getElementById("btnExitDemo").addEventListener("click", () => {
  showScreen("screenDemoEntry");
});

// Navigate
document.getElementById("btnGoPremiumEntry").addEventListener("click", () => {
  showScreen("screenPremiumEntry");
  setPremiumTab("manager");
});
document.getElementById("btnBackToDemoEntry").addEventListener("click", () => {
  showScreen("screenDemoEntry");
});

// Premium tabs
document.getElementById("tabManager").addEventListener("click", () => setPremiumTab("manager"));
document.getElementById("tabWaiter").addEventListener("click", () => setPremiumTab("waiter"));

// Manager login/signup
document.getElementById("btnMgrLogin").addEventListener("click", async () => {
  try {
    const email = normEmail(document.getElementById("mgrEmail").value);
    const password = document.getElementById("mgrPassword").value || "";
    if (!email) throw new Error("Enter email.");
    if (!password) throw new Error("Enter password.");
    setMsg("mgrMsg", "Logging in...");

    const res = await withTimeout(signIn(email, password), 15000, "mgr.signIn");
    if (res.error) throw res.error;

    await routePremium("mgr.login.ok");
  } catch (e) {
    setMsg("mgrMsg", e?.message || "Login failed");
  }
});

document.getElementById("btnMgrSignup").addEventListener("click", async () => {
  try {
    const email = normEmail(document.getElementById("mgrEmail").value);
    const password = document.getElementById("mgrPassword").value || "";
    if (!email) throw new Error("Enter email.");
    if (!password) throw new Error("Enter password.");
    setMsg("mgrMsg", "Creating manager account...");

    const { error } = await withTimeout(signUp(email, password, { role: "admin", display_name: null }), 15000, "mgr.signUp");
    if (error) throw error;

    setMsg("mgrMsg", "Manager created. Now login.");
  } catch (e) {
    setMsg("mgrMsg", e?.message || "Signup failed");
  }
});

// Waiter login/signup
document.getElementById("btnWtrLogin").addEventListener("click", async () => {
  try {
    const email = normEmail(document.getElementById("wtrEmail").value);
    const password = document.getElementById("wtrPassword").value || "";
    if (!email) throw new Error("Enter email.");
    if (!password) throw new Error("Enter password.");
    setMsg("wtrMsg", "Logging in...");

    const res = await withTimeout(signIn(email, password), 15000, "wtr.signIn");
    if (res.error) throw res.error;

    setMsg("wtrMsg", "Logged in. Enter join code to request access.");
    await routePremium("wtr.login.ok");
    // Route may show create/premium app depending on current state; waiter with no restaurant stays here.
    showScreen("screenPremiumEntry");
    setPremiumTab("waiter");
  } catch (e) {
    setMsg("wtrMsg", e?.message || "Login failed");
  }
});

document.getElementById("btnWtrSignup").addEventListener("click", async () => {
  try {
    const email = normEmail(document.getElementById("wtrEmail").value);
    const password = document.getElementById("wtrPassword").value || "";
    if (!email) throw new Error("Enter email.");
    if (!password) throw new Error("Enter password.");
    setMsg("wtrMsg", "Creating waiter account...");

    const { error } = await withTimeout(signUp(email, password, { role: "waiter", display_name: null }), 15000, "wtr.signUp");
    if (error) throw error;

    setMsg("wtrMsg", "Waiter created. Now login.");
  } catch (e) {
    setMsg("wtrMsg", e?.message || "Signup failed");
  }
});

// Waiter request access
document.getElementById("btnRequestAccess").addEventListener("click", waiterRequestAccess);

// Create restaurant
document.getElementById("btnCreateRestaurant").addEventListener("click", createPremiumRestaurant);
document.getElementById("btnEnterPremium").addEventListener("click", () => routePremium("enterPremium"));

document.getElementById("btnCopyCreatedCode").addEventListener("click", async () => {
  try {
    const code = (document.getElementById("createdJoinCode").textContent || "").trim();
    await navigator.clipboard.writeText(code);
    setMsg("codeMsg", "Copied.");
  } catch (e) {
    setMsg("codeMsg", e?.message || "Copy failed");
  }
});

// Pending screen
document.getElementById("btnPendingRefresh").addEventListener("click", waiterRefreshPending);
document.getElementById("btnPendingCancel").addEventListener("click", waiterCancelPending);

// HUD open/close
document.getElementById("btnOpenHud").addEventListener("click", async () => {
  if (appState.profile?.role === "admin" && appState.restaurant?.id) {
    appState.joinRequests = await loadPendingJoinRequests(appState.restaurant.id);
  }
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
    setMsg("hudMsg", "Copied join code.");
  } catch (e) {
    setMsg("hudMsg", e?.message || "Copy failed");
  }
});

// Logout buttons
document.getElementById("btnLogoutPremium").addEventListener("click", logoutEverywhere);
document.getElementById("btnLogoutCreate").addEventListener("click", logoutEverywhere);
document.getElementById("btnLogoutPending").addEventListener("click", logoutEverywhere);

// ------------------------------------------------------------
// Boot + auth change routing
// ------------------------------------------------------------
showScreen("screenDemoEntry");
setPremiumTab("manager");
setDebug({ step: "boot.ready", time: new Date().toISOString(), supabaseUrl: import.meta.env.VITE_SUPABASE_URL });

supabase.auth.onAuthStateChange((event) => {
  setDebug({ step: "auth.change", event, time: new Date().toISOString() });
  setTimeout(() => routePremium(`auth.change:${event}`), 150);
});

routePremium("boot.resume");
