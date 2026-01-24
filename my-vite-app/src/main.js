// src/main.js
import "./style.css";
import { supabase, signIn, signUp, signOut, getSession } from "./lib/supabaseClient.js";

console.log("supabase client present:", !!supabase);

// ------------------------------------------------------------
// UI
// ------------------------------------------------------------
document.querySelector("#app").innerHTML = `
  <!-- PUBLIC ENTRY (Demo + Premium) -->
  <section id="screenAuth" class="screen">
    <div class="panel stack">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <h2 style="margin:0;">BottleCaller</h2>
        <button id="btnGoPremium" type="button" style="font-size:12px; opacity:.85;">Premium</button>
      </div>

      <p style="margin-top:6px; opacity:.9;">
        Demo is open. Premium is for restaurant teams (invite-only + manager approval).
      </p>

      <div class="row" style="margin-top:6px;">
        <button id="btnStartDemo" type="button">Start Demo</button>
        <button id="btnGoPremiumWaiterJoin" type="button" style="opacity:.9;">I have a Premium invite</button>
      </div>

      <hr style="width:100%; opacity:.25; margin:14px 0;" />

      <h3 style="margin:0;">Dev login (optional)</h3>
      <p style="margin-top:6px; opacity:.8; font-size:13px;">
        This is only for testing. Premium entry is above.
      </p>

      <input id="authEmail" type="email" placeholder="Email" />
      <input id="authPassword" type="password" placeholder="Password" />
      <div class="row">
        <button id="btnLoginDev" type="button">Login</button>
        <button id="btnGoSignupDev" type="button">Sign up</button>
      </div>
      <div id="authMsg"></div>
    </div>

    <div class="panel stack hidden" id="signupPanelDev">
      <h2>Dev sign up</h2>
      <input id="suNameDev" type="text" placeholder="Display name" />
      <input id="suEmailDev" type="email" placeholder="Email" />
      <input id="suPasswordDev" type="password" placeholder="Password" />
      <div class="row">
        <button id="btnRoleAdminDev" type="button">I’m a Manager</button>
        <button id="btnRoleWaiterDev" type="button">I’m a Waiter</button>
      </div>
      <div id="signupMsgDev"></div>
    </div>
  </section>

  <!-- PREMIUM MANAGER AUTH -->
  <section id="screenPremiumAuth" class="screen hidden">
    <div class="panel stack">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <h2 style="margin:0;">Premium</h2>
        <button id="btnBackToAuth" type="button" style="font-size:12px; opacity:.85;">Back</button>
      </div>

      <p style="margin-top:6px; opacity:.9;">
        Premium is for <b>managers</b>. Default <b>15 seats</b> (editable later).
      </p>

      <h3 style="margin:0;">Manager login</h3>
      <input id="premEmail" type="email" placeholder="Email" />
      <input id="premPassword" type="password" placeholder="Password" />

      <div class="row">
        <button id="btnPremiumLogin" type="button">Login</button>
        <button id="btnPremiumSignup" type="button">Create Premium Account</button>
      </div>

      <div id="premMsg"></div>

      <p style="margin-top:10px; opacity:.75; font-size:12px;">
        Waiters request access using the join code. Managers accept/reject in the menu.
      </p>
    </div>
  </section>

  <!-- PREMIUM WAITER JOIN (Invite-only + Manager approval) -->
  <section id="screenPremiumWaiterJoin" class="screen hidden">
    <div class="panel stack">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <h2 style="margin:0;">Join Premium</h2>
        <button id="btnBackToAuthFromJoin" type="button" style="font-size:12px; opacity:.85;">Back</button>
      </div>

      <p style="margin-top:6px; opacity:.9;">
        Enter the restaurant join code. Your manager must approve your request.
      </p>

      <input id="wjCode" type="text" placeholder="Restaurant join code" />

      <div class="row">
        <button id="btnRequestJoin" type="button">Request Access</button>
      </div>

      <div id="wjMsg"></div>

      <p style="margin-top:10px; opacity:.75; font-size:12px;">
        Invite-only: your email must be on the manager invite list (if invite required is enabled).
      </p>
    </div>
  </section>

  <!-- WAITING FOR APPROVAL -->
  <section id="screenWaiterPending" class="screen hidden">
    <div class="panel stack">
      <h2>Waiting for approval</h2>
      <p>Your manager must approve your request from their Premium menu.</p>
      <div id="pendingMsg"></div>

      <div class="row">
        <button id="btnPendingRefresh" type="button">Refresh</button>
        <button id="btnPendingCancel" type="button">Cancel request</button>
      </div>

      <button id="btnLogoutPending" type="button">Logout</button>
    </div>
  </section>

  <!-- PREMIUM: Create Restaurant (Manager) -->
  <section id="screenCreateRestaurant" class="screen hidden">
    <div class="panel stack">
      <h2>Create Restaurant (Premium)</h2>
      <input id="restName" type="text" placeholder="Restaurant name" />
      <button id="btnCreateRestaurant" type="button">Create (15 seats)</button>

      <div id="createRestMsg"></div>

      <div id="invitePanel" class="hidden">
        <hr/>
        <h3>Premium created</h3>
        <p style="margin-top:6px; opacity:.85;">
          Join code is inside Premium menu.
        </p>
        <p><b>Join code:</b> <span id="inviteCodeText"></span></p>
        <div class="row">
          <button id="btnCopyCode" type="button">Copy code</button>
          <button id="btnEnterPremium" type="button">Enter Premium</button>
        </div>
        <div id="inviteMsg"></div>
      </div>

      <button id="btnLogoutCreate" type="button">Logout</button>
    </div>
  </section>

  <!-- PREMIUM APP (Both roles) -->
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
      <div><b>Invite required:</b> <span id="hudRequireInvite">-</span></div>
    </div>

    <div class="row" style="margin-top:10px;">
      <button id="btnCopyHudCode" type="button">Copy join code</button>
    </div>

    <div id="adminOnlyBlock" class="hidden">
      <hr style="opacity:.25; margin:12px 0;" />

      <h3 style="margin:0;">Manager controls</h3>

      <div style="margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <label style="font-size:12px; opacity:.9;">
          <input id="toggleRequireInvite" type="checkbox" />
          Require invite to join
        </label>
        <button id="btnSaveRequireInvite" type="button">Save</button>
      </div>

      <div style="margin-top:10px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <input id="seatLimitInput" type="number" placeholder="Seat limit" style="max-width:160px;" />
        <button id="btnSaveSeatLimit" type="button">Save seat limit</button>
        <span style="font-size:12px; opacity:.75;">(May be blocked by restaurants RLS — debug will show)</span>
      </div>

      <hr style="opacity:.25; margin:12px 0;" />

      <h3 style="margin:0;">Join requests</h3>
      <p style="margin:6px 0 0; font-size:12px; opacity:.8;">
        Waiters request access using the join code. Approve once-off here.
      </p>
      <div id="joinRequestsList" style="margin-top:10px; font-size:12px; opacity:.95;"></div>

      <hr style="opacity:.25; margin:12px 0;" />

      <h3 style="margin:0;">Invite emails</h3>
      <div style="margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <input id="inviteEmailInput" type="email" placeholder="waiter@email.com" style="flex:1; min-width:220px;" />
        <button id="btnAddInvite" type="button">Add invite</button>
      </div>

      <div id="invitesList" style="margin-top:10px; font-size:12px; opacity:.95;"></div>
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
let appMode = "public"; // public | demo | premium
let routingLock = false;
let lastRouteAt = 0;

let pendingPollTimer = null;

const appState = {
  session: null,
  profile: null, // { role, restaurant_id, display_name }
  restaurant: null, // { id, name, code, seat_limit, require_invite }
  invites: [],
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

function clearMsgs() {
  setMsg("authMsg", "");
  setMsg("signupMsgDev", "");
  setMsg("premMsg", "");
  setMsg("wjMsg", "");
  setMsg("pendingMsg", "");
  setMsg("createRestMsg", "");
  setMsg("inviteMsg", "");
  setMsg("hudMsg", "");
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
// Data loaders
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
  document.getElementById("hudRequireInvite").textContent = r ? (r.require_invite ? "Yes" : "No") : "-";

  const badge = document.getElementById("premiumBadge");
  if (badge) badge.textContent = `PREMIUM • ${String(role).toUpperCase()}`;

  const adminBlock = document.getElementById("adminOnlyBlock");
  if (role === "admin") adminBlock.classList.remove("hidden");
  else adminBlock.classList.add("hidden");

  const toggle = document.getElementById("toggleRequireInvite");
  if (toggle && r) toggle.checked = !!r.require_invite;

  const seatInput = document.getElementById("seatLimitInput");
  if (seatInput && r) seatInput.value = String(r.seat_limit ?? "");

  renderInvitesList();
  renderJoinRequestsList();
}

function renderInvitesList() {
  const el = document.getElementById("invitesList");
  if (!el) return;

  const invites = appState.invites || [];
  if (!invites.length) {
    el.innerHTML = `<div style="opacity:.8;">No invites yet.</div>`;
    return;
  }

  el.innerHTML = invites
    .map((i) => {
      const status = i.status;
      const email = i.email;
      const meta = status === "accepted" ? "accepted" : status === "revoked" ? "revoked" : "pending";

      const btn =
        status === "revoked"
          ? `<button data-action="reinvite" data-email="${email}" style="font-size:12px;">Re-invite</button>`
          : `<button data-action="revoke" data-email="${email}" style="font-size:12px;">Dissociate</button>`;

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
// Premium router (session-first)
// ------------------------------------------------------------
async function routePremium(reason = "manual") {
  const now = Date.now();
  if (routingLock) return;
  if (now - lastRouteAt < 250) return;
  lastRouteAt = now;
  routingLock = true;

  try {
    clearMsgs();

    const { session, error: sErr } = await withTimeout(getSession(), 8000, "getSession");
    appState.session = session || null;

    setDebug({
      step: "premium.route.session",
      time: new Date().toISOString(),
      reason,
      hasSession: !!session,
      sessionError: sErr?.message || null,
    });

    if (sErr || !session?.user) {
      appMode = "public";
      appState.profile = null;
      appState.restaurant = null;
      appState.invites = [];
      appState.joinRequests = [];
      stopPendingPoll();
      return showScreen("screenPremiumAuth");
    }

    const userId = session.user.id;

    const profile = await loadProfile(userId);
    appState.profile = profile;

    setDebug({
      step: "premium.route.profile",
      time: new Date().toISOString(),
      user: { id: userId, email: session.user.email },
      profile,
    });

    if (!profile?.restaurant_id) {
      // Admins: create restaurant
      if (profile?.role === "admin") {
        stopPendingPoll();
        return showScreen("screenCreateRestaurant");
      }

      // Waiters: if they already have a pending request, show waiting screen.
      const latestReq = await fetchMyLatestJoinRequest(userId);
      if (latestReq?.status === "pending") {
        showScreen("screenWaiterPending");
        setMsg("pendingMsg", "Status: pending");
        startPendingPoll(userId);
        return;
      }

      stopPendingPoll();
      return showScreen("screenPremiumWaiterJoin");
    }

    // Load restaurant meta
    const restaurant = await loadRestaurant(profile.restaurant_id);
    appState.restaurant = restaurant;

    // Load invites + requests for admin (RLS enforces anyway)
    if (profile.role === "admin") {
      try {
        appState.invites = await loadInvites(restaurant.id);
      } catch (e) {
        setDebug({ step: "invites.load.failed", time: new Date().toISOString(), error: e?.message || String(e) });
        appState.invites = [];
      }

      try {
        appState.joinRequests = await loadPendingJoinRequests(restaurant.id);
      } catch (e) {
        setDebug({ step: "join_requests.load.failed", time: new Date().toISOString(), error: e?.message || String(e) });
        appState.joinRequests = [];
      }
    } else {
      appState.invites = [];
      appState.joinRequests = [];
    }

    renderHud();
    stopPendingPoll();
    appMode = "premium";
    return showScreen("screenPremiumApp");
  } catch (e) {
    console.error(e);
    setDebug({ step: "premium.route.crash", time: new Date().toISOString(), error: e.message || String(e) });
    stopPendingPoll();
    return showScreen("screenPremiumAuth");
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
        setMsg("pendingMsg", "Status: rejected. Ask your manager or check the invite.");
      } else if (req.status === "canceled") {
        stopPendingPoll();
        setMsg("pendingMsg", "Status: canceled.");
      }
    } catch (e) {
      console.error(e);
    }
  }, 2500);
}

// ------------------------------------------------------------
// Admin actions (HUD)
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
    if (appState.profile?.role !== "admin") throw new Error("Admin only.");

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
          .update({
            status: "pending",
            revoked_at: null,
            revoked_by: null,
          })
          .eq("restaurant_id", r.id)
          .eq("email", email),
        12000,
        "invites.update(reinvite)"
      );
      if (upd.error) throw upd.error;
    }

    appState.invites = await loadInvites(r.id);
    renderInvitesList();
    setMsg("hudMsg", `Invited: ${email}`);
    setDebug({ step: "invites.add.ok", time: new Date().toISOString(), email });
  } catch (e) {
    console.error(e);
    setMsg("hudMsg", e?.message || "Invite failed");
    setDebug({ step: "invites.add.failed", time: new Date().toISOString(), error: e?.message || String(e) });
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
    if (appState.profile?.role !== "admin") throw new Error("Admin only.");

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
    setMsg("hudMsg", `Dissociated: ${email}`);
    setDebug({ step: "invites.revoke.ok", time: new Date().toISOString(), email });
  } catch (e) {
    console.error(e);
    setMsg("hudMsg", e?.message || "Dissociate failed");
    setDebug({ step: "invites.revoke.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
}

async function adminSaveRequireInvite() {
  try {
    setMsg("hudMsg", "");
    const r = appState.restaurant;
    if (!r?.id) throw new Error("Restaurant not loaded.");
    if (appState.profile?.role !== "admin") throw new Error("Admin only.");

    const desired = !!document.getElementById("toggleRequireInvite")?.checked;

    const upd = await withTimeout(
      supabase.from("restaurants").update({ require_invite: desired }).eq("id", r.id).select().single(),
      12000,
      "restaurants.update(require_invite)"
    );
    if (upd.error) throw upd.error;

    appState.restaurant = upd.data;
    renderHud();
    setMsg("hudMsg", `Saved: require_invite = ${desired ? "ON" : "OFF"}`);
    setDebug({ step: "restaurants.require_invite.ok", time: new Date().toISOString(), desired });
  } catch (e) {
    console.error(e);
    setMsg("hudMsg", e?.message || "Save failed (RLS may block updates)");
    setDebug({ step: "restaurants.require_invite.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
}

async function adminSaveSeatLimit() {
  try {
    setMsg("hudMsg", "");
    const r = appState.restaurant;
    if (!r?.id) throw new Error("Restaurant not loaded.");
    if (appState.profile?.role !== "admin") throw new Error("Admin only.");

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
    setMsg("hudMsg", `Saved: seat_limit = ${seatLimit}`);
    setDebug({ step: "restaurants.seat_limit.ok", time: new Date().toISOString(), seatLimit });
  } catch (e) {
    console.error(e);
    setMsg("hudMsg", e?.message || "Save failed (RLS may block updates)");
    setDebug({ step: "restaurants.seat_limit.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
}

async function adminRefreshRequests() {
  try {
    const r = appState.restaurant;
    if (!r?.id) return;
    if (appState.profile?.role !== "admin") return;
    appState.joinRequests = await loadPendingJoinRequests(r.id);
    renderJoinRequestsList();
  } catch (e) {
    setDebug({ step: "join_requests.refresh.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
}

async function adminApproveJoinRequest(requestId) {
  try {
    setMsg("hudMsg", "");
    if (appState.profile?.role !== "admin") throw new Error("Admin only.");

    setMsg("hudMsg", "Approving...");
    setDebug({ step: "join_requests.approve.start", time: new Date().toISOString(), requestId });

    const rpc = await withTimeout(
      supabase.rpc("approve_join_request", { p_request_id: requestId }),
      15000,
      "rpc.approve_join_request"
    );
    if (rpc.error) throw rpc.error;
    if (!rpc.data?.ok) throw new Error(rpc.data?.error || "Approve failed");

    setMsg("hudMsg", "Approved (once-off).");
    setDebug({ step: "join_requests.approve.ok", time: new Date().toISOString(), requestId });

    await adminRefreshRequests();
  } catch (e) {
    console.error(e);
    setMsg("hudMsg", e?.message || "Approve failed");
    setDebug({ step: "join_requests.approve.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
}

async function adminRejectJoinRequest(requestId) {
  try {
    setMsg("hudMsg", "");
    if (appState.profile?.role !== "admin") throw new Error("Admin only.");

    setMsg("hudMsg", "Rejecting...");
    setDebug({ step: "join_requests.reject.start", time: new Date().toISOString(), requestId });

    const rpc = await withTimeout(
      supabase.rpc("reject_join_request", { p_request_id: requestId }),
      15000,
      "rpc.reject_join_request"
    );
    if (rpc.error) throw rpc.error;
    if (!rpc.data?.ok) throw new Error(rpc.data?.error || "Reject failed");

    setMsg("hudMsg", "Rejected.");
    setDebug({ step: "join_requests.reject.ok", time: new Date().toISOString(), requestId });

    await adminRefreshRequests();
  } catch (e) {
    console.error(e);
    setMsg("hudMsg", e?.message || "Reject failed");
    setDebug({ step: "join_requests.reject.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
}

// ------------------------------------------------------------
// Premium waiter request join (no email)
// ------------------------------------------------------------
async function waiterRequestJoin() {
  try {
    clearMsgs();

    const code = normCode(document.getElementById("wjCode").value);
    if (!code) throw new Error("Enter the restaurant join code.");

    const { session, error: sErr } = await withTimeout(getSession(), 8000, "getSession");
    if (sErr) throw sErr;
    if (!session?.user) throw new Error("You must be logged in to request access (create a waiter account).");

    setMsg("wjMsg", "Requesting access...");
    setDebug({ step: "waiter.request_join.start", time: new Date().toISOString(), code });

    const rpc = await withTimeout(
      supabase.rpc("request_join_by_code", { p_code: code }),
      15000,
      "rpc.request_join_by_code"
    );

    if (rpc.error) throw rpc.error;

    if (!rpc.data?.ok) {
      const err = rpc.data?.error || "unknown";
      if (err === "invite_required") throw new Error("Invite required. Ask the manager to add your email.");
      if (err === "invalid_code") throw new Error("Invalid join code.");
      if (err === "already_in_restaurant") throw new Error("You are already assigned to a restaurant.");
      throw new Error("Could not request access.");
    }

    setMsg("wjMsg", "Requested. Waiting for manager approval...");
    setDebug({ step: "waiter.request_join.ok", time: new Date().toISOString(), restaurant_id: rpc.data.restaurant_id });

    showScreen("screenWaiterPending");
    setMsg("pendingMsg", "Status: pending");
    startPendingPoll(session.user.id);
  } catch (e) {
    console.error(e);
    setMsg("wjMsg", e?.message || "Request failed");
    setDebug({ step: "waiter.request_join.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
}

async function waiterCancelPending() {
  try {
    clearMsgs();
    const { session, error: sErr } = await withTimeout(getSession(), 8000, "getSession");
    if (sErr) throw sErr;
    if (!session?.user) throw new Error("Not logged in.");

    const latest = await fetchMyLatestJoinRequest(session.user.id);
    if (!latest || latest.status !== "pending") throw new Error("No pending request to cancel.");

    const upd = await withTimeout(
      supabase.from("join_requests").update({ status: "canceled" }).eq("id", latest.id),
      12000,
      "join_requests.cancel"
    );
    if (upd.error) throw upd.error;

    stopPendingPoll();
    setMsg("pendingMsg", "Canceled.");
    showScreen("screenPremiumWaiterJoin");
  } catch (e) {
    console.error(e);
    setMsg("pendingMsg", e?.message || "Cancel failed");
  }
}

async function waiterRefreshPending() {
  try {
    const { session } = await withTimeout(getSession(), 8000, "getSession");
    const userId = session?.user?.id;
    if (!userId) throw new Error("Not logged in.");

    const latest = await fetchMyLatestJoinRequest(userId);
    if (!latest) {
      setMsg("pendingMsg", "No request found.");
      return;
    }
    setMsg("pendingMsg", `Status: ${latest.status}`);
    if (latest.status === "approved") await routePremium("waiter.manual_refresh.approved");
  } catch (e) {
    setMsg("pendingMsg", e?.message || "Refresh failed");
  }
}

// ------------------------------------------------------------
// Create restaurant (Premium admin)
// - default 15 seats
// - default require_invite = true
// ------------------------------------------------------------
async function createPremiumRestaurant() {
  try {
    clearMsgs();
    const name = (document.getElementById("restName").value || "").trim();
    if (!name) throw new Error("Restaurant name is required.");

    const { session, error: sErr } = await withTimeout(getSession(), 8000, "getSession");
    if (sErr) throw sErr;
    if (!session?.user) throw new Error("Not logged in.");

    const seatLimit = 15;
    const requireInvite = true;
    const joinCode = Math.random().toString(16).slice(2, 12).toUpperCase();

    setMsg("createRestMsg", "Creating...");
    setDebug({ step: "restaurant.create.start", time: new Date().toISOString(), name });

    const ins = await withTimeout(
      supabase
        .from("restaurants")
        .insert({
          name,
          code: joinCode,
          seat_limit: seatLimit,
          require_invite: requireInvite,
          created_by: session.user.id,
        })
        .select("id,name,code,seat_limit,require_invite")
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

    document.getElementById("invitePanel").classList.remove("hidden");
    document.getElementById("inviteCodeText").textContent = r.code;

    setMsg("createRestMsg", "Created. Join code is inside Premium menu.");
    setDebug({ step: "restaurant.create.ok", time: new Date().toISOString(), restaurant: r });

    await routePremium("restaurant.create.ok");
  } catch (e) {
    console.error(e);
    setMsg("createRestMsg", e?.message || "Create failed");
    setDebug({ step: "restaurant.create.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
}

// ------------------------------------------------------------
// Buttons / Events
// ------------------------------------------------------------

// Demo
document.getElementById("btnStartDemo").addEventListener("click", () => {
  appMode = "demo";
  setDebug({ step: "demo.start", time: new Date().toISOString() });
  showScreen("screenGameDemo");
  if (typeof window.initBottleCallerGame === "function") {
    try { window.initBottleCallerGame(); } catch {}
  }
});
document.getElementById("btnExitDemo").addEventListener("click", () => {
  appMode = "public";
  setDebug({ step: "demo.exit", time: new Date().toISOString() });
  showScreen("screenAuth");
});

// Public → Premium Manager Auth
document.getElementById("btnGoPremium").addEventListener("click", () => {
  appMode = "public";
  showScreen("screenPremiumAuth");
});
document.getElementById("btnBackToAuth").addEventListener("click", () => {
  appMode = "public";
  showScreen("screenAuth");
});

// Public → Premium Waiter Join
document.getElementById("btnGoPremiumWaiterJoin").addEventListener("click", () => {
  showScreen("screenPremiumWaiterJoin");
});
document.getElementById("btnBackToAuthFromJoin").addEventListener("click", () => {
  showScreen("screenAuth");
});

// Dev signup toggle
const signupPanelDev = document.getElementById("signupPanelDev");
document.getElementById("btnGoSignupDev").addEventListener("click", () => {
  signupPanelDev.classList.toggle("hidden");
});

// Dev login (optional)
document.getElementById("btnLoginDev").addEventListener("click", async () => {
  try {
    clearMsgs();
    const email = normEmail(document.getElementById("authEmail").value);
    const password = document.getElementById("authPassword").value || "";
    if (!email) throw new Error("Enter email.");
    if (!password) throw new Error("Enter password.");

    setMsg("authMsg", "Logging in...");
    const res = await withTimeout(signIn(email, password), 15000, "dev.signIn");
    if (res.error) throw res.error;

    setMsg("authMsg", "Logged in (dev).");
    setDebug({ step: "dev.login.ok", time: new Date().toISOString(), email });
  } catch (e) {
    console.error(e);
    setMsg("authMsg", e?.message || "Login failed");
    setDebug({ step: "dev.login.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
});

// Dev signup (optional)
async function devSignup(role) {
  try {
    clearMsgs();
    const displayName = (document.getElementById("suNameDev").value || "").trim();
    const email = normEmail(document.getElementById("suEmailDev").value);
    const password = document.getElementById("suPasswordDev").value || "";
    if (!email) throw new Error("Enter email.");
    if (!password) throw new Error("Enter password.");

    const { error } = await withTimeout(
      signUp(email, password, { role, display_name: displayName || null }),
      15000,
      "dev.signUp"
    );
    if (error) throw error;

    setMsg("signupMsgDev", "Signup created. If confirmation is on, confirm email then log in.");
    setDebug({ step: "dev.signup.ok", time: new Date().toISOString(), role, email });
  } catch (e) {
    console.error(e);
    setMsg("signupMsgDev", e?.message || "Signup failed");
    setDebug({ step: "dev.signup.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
}
document.getElementById("btnRoleAdminDev").addEventListener("click", () => devSignup("admin"));
document.getElementById("btnRoleWaiterDev").addEventListener("click", () => devSignup("waiter"));

// Premium manager login
document.getElementById("btnPremiumLogin").addEventListener("click", async () => {
  try {
    clearMsgs();
    const email = normEmail(document.getElementById("premEmail").value);
    const password = document.getElementById("premPassword").value || "";
    if (!email) throw new Error("Enter email.");
    if (!password) throw new Error("Enter password.");

    setMsg("premMsg", "Logging in...");
    setDebug({ step: "premium.login.start", time: new Date().toISOString(), email });

    const res = await withTimeout(signIn(email, password), 15000, "premium.signIn");
    if (res.error) throw res.error;

    setMsg("premMsg", "Logged in. Routing...");
    await routePremium("premium.login.ok");
  } catch (e) {
    console.error(e);
    setMsg("premMsg", e?.message || "Premium login failed");
    setDebug({ step: "premium.login.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
});

// Premium manager signup (forces role=admin)
document.getElementById("btnPremiumSignup").addEventListener("click", async () => {
  try {
    clearMsgs();
    const email = normEmail(document.getElementById("premEmail").value);
    const password = document.getElementById("premPassword").value || "";
    if (!email) throw new Error("Enter email.");
    if (!password) throw new Error("Enter password.");

    setMsg("premMsg", "Creating Premium manager account...");
    setDebug({ step: "premium.signup.start", time: new Date().toISOString(), email });

    const { error } = await withTimeout(
      signUp(email, password, { role: "admin", display_name: null }),
      15000,
      "premium.signUp"
    );
    if (error) throw error;

    setMsg("premMsg", "Account created. If confirmation is on, confirm email then log in.");
    setDebug({ step: "premium.signup.ok", time: new Date().toISOString(), email });
  } catch (e) {
    console.error(e);
    setMsg("premMsg", e?.message || "Premium signup failed");
    setDebug({ step: "premium.signup.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
});

// Premium create restaurant
document.getElementById("btnCreateRestaurant").addEventListener("click", createPremiumRestaurant);

// Copy code (create screen preview)
document.getElementById("btnCopyCode").addEventListener("click", async () => {
  try {
    const code = (document.getElementById("inviteCodeText").textContent || "").trim();
    if (!code) throw new Error("No code yet.");
    await navigator.clipboard.writeText(code);
    setMsg("inviteMsg", "Copied.");
  } catch (e) {
    setMsg("inviteMsg", e?.message || "Copy failed");
  }
});
document.getElementById("btnEnterPremium").addEventListener("click", () => routePremium("enterPremium"));

// Waiter request join handlers
document.getElementById("btnRequestJoin").addEventListener("click", waiterRequestJoin);
document.getElementById("btnPendingRefresh").addEventListener("click", waiterRefreshPending);
document.getElementById("btnPendingCancel").addEventListener("click", waiterCancelPending);

// HUD open/close
document.getElementById("btnOpenHud").addEventListener("click", async () => {
  // refresh requests each time manager opens HUD
  if (appState.profile?.role === "admin") await adminRefreshRequests();
  renderHud();
  openHud();
});
document.getElementById("btnCloseHud").addEventListener("click", closeHud);
document.getElementById("hudBackdrop").addEventListener("click", closeHud);

// HUD copy code
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

// HUD admin actions
document.getElementById("btnAddInvite").addEventListener("click", async () => {
  const v = document.getElementById("inviteEmailInput").value;
  await adminAddInvite(v);
  document.getElementById("inviteEmailInput").value = "";
});
document.getElementById("btnSaveRequireInvite").addEventListener("click", adminSaveRequireInvite);
document.getElementById("btnSaveSeatLimit").addEventListener("click", adminSaveSeatLimit);

// Logout (premium)
async function logoutPremium() {
  try {
    stopPendingPoll();
    await signOut();
  } finally {
    appMode = "public";
    appState.session = null;
    appState.profile = null;
    appState.restaurant = null;
    appState.invites = [];
    appState.joinRequests = [];
    closeHud();
    showScreen("screenPremiumAuth");
    setDebug({ step: "premium.logout", time: new Date().toISOString() });
  }
}
document.getElementById("btnLogoutPremium").addEventListener("click", logoutPremium);
document.getElementById("btnLogoutCreate").addEventListener("click", logoutPremium);
document.getElementById("btnLogoutPending").addEventListener("click", logoutPremium);

// ------------------------------------------------------------
// Boot + auth change routing
// ------------------------------------------------------------
showScreen("screenAuth");
setDebug({ step: "boot.ready", time: new Date().toISOString(), supabaseUrl: import.meta.env.VITE_SUPABASE_URL });

supabase.auth.onAuthStateChange((event) => {
  setDebug({ step: "auth.change", event, time: new Date().toISOString() });
  setTimeout(() => {
    routePremium(`auth.change:${event}`);
  }, 150);
});

// Also try to resume premium if already authenticated
routePremium("boot.resume");
