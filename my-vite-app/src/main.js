// src/main.js
import "./style.css";
import { supabase, signIn, signUp, signOut, getSession } from "./lib/supabaseClient.js";

console.log("supabase client present:", !!supabase);

// ------------------------------------------------------------
// UI (same look/structure, but removed join_requests + approval screens)
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
        Demo is open. Premium is for restaurant teams.
      </p>

      <div class="row" style="margin-top:6px;">
        <button id="btnStartDemo" type="button">Start Demo</button>
        <button id="btnGoPremiumWaiterJoin" type="button" style="opacity:.9;">I have a Premium join code</button>
      </div>

      <hr style="width:100%; opacity:.25; margin:14px 0;" />

      <h3 style="margin:0;">Dev login (optional)</h3>
      <p style="margin-top:6px; opacity:.8; font-size:13px;">
        This is only for testing. Waiters land inside Demo after login.
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
        Waiters join from Demo using the join code.
      </p>
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

  <!-- PREMIUM APP (Both roles, but waiter only after joining a restaurant) -->
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
          <span id="demoAuthedBadge"
            class="hidden"
            style="font-size:12px; padding:4px 8px; border:1px solid rgba(0,0,0,.15); border-radius:999px; opacity:.85;">
            LOGGED IN
          </span>
        </div>
        <div style="display:flex; gap:8px;">
          <button id="btnDemoGoPremium" type="button" style="opacity:.9;">Premium</button>
          <button id="btnExitDemo" type="button">Exit Demo</button>
        </div>
      </div>

      <!-- Join block: visible ONLY for logged-in waiter with restaurant_id = null -->
      <div id="demoJoinBlock" class="hidden"
        style="margin-top:10px; padding:12px; border:1px solid rgba(0,0,0,.12); border-radius:12px; background:#fff;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <div>
            <b>Join a restaurant</b>
            <div style="font-size:12px; opacity:.75; margin-top:3px;">
              Paste your join code to unlock Premium (seat limit enforced).
            </div>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <input id="demoJoinCode" type="text" placeholder="Join code" style="min-width:180px;" />
            <button id="btnDemoJoin" type="button">Join</button>
          </div>
        </div>
        <div id="demoJoinMsg" style="margin-top:8px; font-size:12px; opacity:.9;"></div>
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

const appState = {
  session: null,
  profile: null, // { role, restaurant_id, display_name }
  restaurant: null, // { id, name, code, seat_limit, require_invite }
  invites: [],
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
  setMsg("createRestMsg", "");
  setMsg("inviteMsg", "");
  setMsg("hudMsg", "");
  setMsg("demoJoinMsg", "");
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

async function loadAuthedState(reason = "manual") {
  const { session, error: sErr } = await withTimeout(getSession(), 8000, "getSession");
  if (sErr) throw sErr;

  appState.session = session || null;
  appState.profile = null;
  appState.restaurant = null;
  appState.invites = [];

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
    restaurant: appState.restaurant ? { id: appState.restaurant.id, name: appState.restaurant.name } : null,
  });
}

// ------------------------------------------------------------
// DEMO UI logic (join-by-code lives here now)
// ------------------------------------------------------------
function renderDemoJoinBlock() {
  const badge = document.getElementById("demoAuthedBadge");
  const joinBlock = document.getElementById("demoJoinBlock");

  const isAuthed = !!appState.session?.user;
  if (badge) {
    if (isAuthed) badge.classList.remove("hidden");
    else badge.classList.add("hidden");
  }

  const role = appState.profile?.role;
  const hasRestaurant = !!appState.profile?.restaurant_id;

  // visible only for logged-in waiter who is NOT assigned to a restaurant
  const showJoin = isAuthed && role === "waiter" && !hasRestaurant;

  if (joinBlock) {
    if (showJoin) joinBlock.classList.remove("hidden");
    else joinBlock.classList.add("hidden");
  }
}

async function demoJoinRestaurantByCode() {
  try {
    clearMsgs();

    const code = normCode(document.getElementById("demoJoinCode")?.value);
    if (!code) throw new Error("Enter a join code.");

    await loadAuthedState("demo.join.precheck");
    if (!appState.session?.user) throw new Error("You must be logged in as a waiter first.");
    if (appState.profile?.role !== "waiter") throw new Error("Join-by-code is for waiter accounts.");

    setMsg("demoJoinMsg", "Joining...");
    setDebug({ step: "demo.join.start", time: new Date().toISOString(), code });

    // IMPORTANT: param name must match p_code in SQL
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
      if (err === "invite_required") throw new Error("Invite required. Ask the manager to add your email.");
      if (err === "already_in_restaurant") throw new Error("You are already assigned to a restaurant.");
      throw new Error("Join failed.");
    }

    setMsg("demoJoinMsg", "Joined ✅ Premium unlocked.");
    setDebug({ step: "demo.join.ok", time: new Date().toISOString(), restaurant_id: rpc.data.restaurant_id });

    // refresh state so join block hides and premium routing works
    await loadAuthedState("demo.join.refresh");
    renderDemoJoinBlock();
  } catch (e) {
    console.error(e);
    setMsg("demoJoinMsg", e?.message || "Join failed");
    setDebug({ step: "demo.join.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
}

async function routeDemo(reason = "manual") {
  appMode = "demo";
  clearMsgs();
  try {
    await loadAuthedState(`routeDemo:${reason}`);
  } catch {}
  setDebug({ step: "route.demo", time: new Date().toISOString(), reason, authed: !!appState.session?.user });
  showScreen("screenGameDemo");
  renderDemoJoinBlock();

  if (typeof window.initBottleCallerGame === "function") {
    try {
      window.initBottleCallerGame();
    } catch {}
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

// ------------------------------------------------------------
// Premium router (Premium stays separate; no auto-open from auth unless admin)
// ------------------------------------------------------------
async function routePremium(reason = "manual") {
  const now = Date.now();
  if (routingLock) return;
  if (now - lastRouteAt < 250) return;
  lastRouteAt = now;
  routingLock = true;

  try {
    clearMsgs();

    await loadAuthedState(`routePremium:${reason}`);

    setDebug({
      step: "premium.route",
      time: new Date().toISOString(),
      reason,
      hasSession: !!appState.session?.user,
      profile: appState.profile,
    });

    if (!appState.session?.user) {
      appMode = "public";
      closeHud();
      return showScreen("screenPremiumAuth");
    }

    const profile = appState.profile;

    // Waiter without restaurant: keep Premium separate and push them to Demo join
    if (profile?.role === "waiter" && !profile?.restaurant_id) {
      showScreen("screenPremiumAuth");
      setMsg("premMsg", "Waiters: join a restaurant from Demo (paste your join code there).");
      return;
    }

    // Admin without restaurant: create it
    if (profile?.role === "admin" && !profile?.restaurant_id) {
      return showScreen("screenCreateRestaurant");
    }

    // Anyone with restaurant_id can enter Premium app
    if (!profile?.restaurant_id) {
      showScreen("screenPremiumAuth");
      setMsg("premMsg", "No restaurant assigned yet.");
      return;
    }

    // If admin, load invites for the HUD
    if (profile.role === "admin" && appState.restaurant?.id) {
      try {
        appState.invites = await loadInvites(appState.restaurant.id);
      } catch (e) {
        setDebug({ step: "invites.load.failed", time: new Date().toISOString(), error: e?.message || String(e) });
        appState.invites = [];
      }
    } else {
      appState.invites = [];
    }

    renderHud();
    appMode = "premium";
    showScreen("screenPremiumApp");
  } catch (e) {
    console.error(e);
    setDebug({ step: "premium.route.crash", time: new Date().toISOString(), error: e.message || String(e) });
    closeHud();
    showScreen("screenPremiumAuth");
  } finally {
    routingLock = false;
  }
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
    setDebug({
      step: "restaurants.require_invite.failed",
      time: new Date().toISOString(),
      error: e?.message || String(e),
    });
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

    setMsg("createRestMsg", "Creating...");
    setDebug({ step: "restaurant.create.start", time: new Date().toISOString(), name });

    // ✅ One atomic DB call does everything:
    // - generates code
    // - inserts restaurant
    // - attaches your profile.restaurant_id
    const rpc = await withTimeout(
      supabase.rpc("create_restaurant", { p_name: name }),
      15000,
      "rpc.create_restaurant"
    );

    if (rpc.error) throw rpc.error;

    if (!rpc.data?.ok) {
      const err = rpc.data?.error || "unknown";
      if (err === "admin_only") throw new Error("Only managers can create a restaurant.");
      if (err === "already_has_restaurant") throw new Error("You already belong to a restaurant.");
      if (err === "name_required") throw new Error("Restaurant name is required.");
      throw new Error("Create failed.");
    }

    const r = rpc.data.restaurant;

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

// Demo start (public)
document.getElementById("btnStartDemo").addEventListener("click", () => routeDemo("public.start_demo"));

// Demo exit
document.getElementById("btnExitDemo").addEventListener("click", () => {
  appMode = "public";
  setDebug({ step: "demo.exit", time: new Date().toISOString() });
  showScreen("screenAuth");
});

// Demo join + demo -> premium
document.getElementById("btnDemoJoin").addEventListener("click", demoJoinRestaurantByCode);
document.getElementById("btnDemoGoPremium").addEventListener("click", () => routePremium("demo.premium.click"));

// Public → Premium (manager auth screen)
document.getElementById("btnGoPremium").addEventListener("click", () => routePremium("public.premium.click"));
document.getElementById("btnBackToAuth").addEventListener("click", () => {
  appMode = "public";
  showScreen("screenAuth");
});

// Public → “I have a Premium join code”
// This now sends you to Demo (join happens inside Demo for logged-in waiter)
document.getElementById("btnGoPremiumWaiterJoin").addEventListener("click", async () => {
  clearMsgs();
  try {
    await loadAuthedState("public.have_code");
    if (!appState.session?.user) {
      setMsg("authMsg", "Log in as a waiter first, then paste the join code inside Demo.");
      return;
    }
    await routeDemo("public.have_code.to_demo");
    // small UX nudge
    const input = document.getElementById("demoJoinCode");
    if (input && !input.classList.contains("hidden")) input.focus();
  } catch (e) {
    setMsg("authMsg", "Log in as a waiter first, then paste the join code inside Demo.");
  }
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

    setMsg("authMsg", "Logged in. Routing...");
    await routeAfterAuth("dev.login.ok");
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

// HUD open/close
document.getElementById("btnOpenHud").addEventListener("click", () => {
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

// Logout (premium + general)
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
    showScreen("screenAuth");
    setDebug({ step: "logout", time: new Date().toISOString(), reason });
  }
}
document.getElementById("btnLogoutPremium").addEventListener("click", () => logoutAll("premium.logout"));
document.getElementById("btnLogoutCreate").addEventListener("click", () => logoutAll("create.logout"));

// ------------------------------------------------------------
// Auth routing:
// - waiter signup/login -> DEMO loads (with join input if restaurant_id null)
// - premium stays separate; admin can route into premium
// ------------------------------------------------------------
async function routeAfterAuth(reason = "auth") {
  try {
    clearMsgs();
    await loadAuthedState(`routeAfterAuth:${reason}`);

    if (!appState.session?.user) {
      appMode = "public";
      showScreen("screenAuth");
      return;
    }

    const role = appState.profile?.role;

    // Waiter ALWAYS lands in demo (this is your requested behavior)
    if (role === "waiter") {
      await routeDemo(`authed.waiter:${reason}`);
      return;
    }

    // Admin can go Premium (still separate from Demo)
    await routePremium(`authed.admin:${reason}`);
  } catch (e) {
    console.error(e);
    setDebug({ step: "routeAfterAuth.failed", time: new Date().toISOString(), error: e?.message || String(e) });
    showScreen("screenAuth");
  }
}

// ------------------------------------------------------------
// Boot + auth change routing
// ------------------------------------------------------------
showScreen("screenAuth");
setDebug({ step: "boot.ready", time: new Date().toISOString(), supabaseUrl: import.meta.env.VITE_SUPABASE_URL });

supabase.auth.onAuthStateChange((event) => {
  setDebug({ step: "auth.change", event, time: new Date().toISOString() });
  setTimeout(() => {
    routeAfterAuth(`auth.change:${event}`);
  }, 150);
});

// Resume on refresh
routeAfterAuth("boot.resume");
