// src/main.js
import "./style.css";
import { supabase, signIn, signUp, signOut, getSession } from "./lib/supabaseClient.js";

console.log("supabase client present:", !!supabase);

// ------------------------------------------------------------
// UI
// ------------------------------------------------------------
document.querySelector("#app").innerHTML = `
  <!-- AUTH (Demo entry + link to Premium) -->
  <section id="screenAuth" class="screen">
    <div class="panel stack">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <h2 style="margin:0;">BottleCaller</h2>
        <button id="btnGoPremium" type="button" style="font-size:12px; opacity:.85;">Premium</button>
      </div>

      <p style="margin-top:6px; opacity:.9;">
        Demo is open. Premium is for restaurant managers.
      </p>

      <div class="row" style="margin-top:6px;">
        <button id="btnStartDemo" type="button">Start Demo</button>
      </div>

      <hr style="width:100%; opacity:.25; margin:14px 0;" />

      <h3 style="margin:0;">Demo Login (optional)</h3>
      <p style="margin-top:6px; opacity:.8; font-size:13px;">
        You can also log in (for testing). Premium managers use the Premium screen.
      </p>

      <input id="authEmail" type="email" placeholder="Email" />
      <input id="authPassword" type="password" placeholder="Password" />
      <div class="row">
        <button id="btnLogin" type="button">Login</button>
        <button id="btnGoSignup" type="button">Sign up</button>
      </div>
      <div id="authMsg"></div>
    </div>

    <div class="panel stack hidden" id="signupPanel">
      <h2>Sign up</h2>
      <input id="suName" type="text" placeholder="Display name" />
      <input id="suEmail" type="email" placeholder="Email" />
      <input id="suPassword" type="password" placeholder="Password" />
      <div class="row">
        <button id="btnRoleAdmin" type="button">I’m a Manager</button>
        <button id="btnRoleWaiter" type="button">I’m a Waiter</button>
      </div>
      <div id="signupMsg"></div>
    </div>
  </section>

  <!-- PREMIUM AUTH (Manager-only) -->
  <section id="screenPremiumAuth" class="screen hidden">
    <div class="panel stack">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <h2 style="margin:0;">Premium</h2>
        <button id="btnBackToAuth" type="button" style="font-size:12px; opacity:.85;">Back</button>
      </div>

      <p style="margin-top:6px; opacity:.9;">
        Premium is for managers. Includes <b>15 seats</b> by default (editable later).
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
        Waiters do not sign up here. They will join inside Premium using a code + verification (next step).
      </p>
    </div>
  </section>

  <!-- PREMIUM: Create Restaurant -->
  <section id="screenCreateRestaurant" class="screen hidden">
    <div class="panel stack">
      <h2>Create Restaurant (Premium)</h2>
      <input id="restName" type="text" placeholder="Restaurant name" />
      <button id="btnCreateRestaurant" type="button">Create (15 seats)</button>

      <div id="createRestMsg"></div>

      <div id="invitePanel" class="hidden">
        <hr/>
        <h3>Premium Menu</h3>
        <p style="margin-top:6px; opacity:.85;">
          Join code is inside Premium (not on the public entry).
        </p>
        <p><b>Join code:</b> <span id="inviteCodeText"></span></p>
        <div class="row">
          <button id="btnCopyCode" type="button">Copy code</button>
          <button id="btnContinueToGame" type="button">Enter Premium</button>
        </div>
        <div id="inviteMsg"></div>
      </div>

      <button id="btnLogoutA" type="button">Logout</button>
    </div>
  </section>

  <!-- PREMIUM GAME -->
  <section id="screenGamePremium" class="screen hidden">
    <div class="panel stack">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div style="display:flex; gap:10px; align-items:center;">
          <h2 style="margin:0;">BottleCaller</h2>
          <span style="font-size:12px; padding:4px 8px; border:1px solid rgba(0,0,0,.15); border-radius:999px;">
            PREMIUM
          </span>
        </div>
        <div style="display:flex; gap:8px;">
          <button id="btnOpenHud" type="button">Menu</button>
          <button id="btnLogoutG" type="button">Logout</button>
        </div>
      </div>

      <div id="gameRootPremium">GAME LOADS HERE</div>
    </div>
  </section>

  <!-- DEMO GAME -->
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

      <div id="gameRootDemo">GAME LOADS HERE</div>
    </div>
  </section>

  <!-- HUD / MENU (Premium only) -->
  <div id="hudBackdrop" class="hidden"
    style="
      position:fixed; inset:0;
      background: rgba(0,0,0,0.55);
      z-index: 99998;
    "></div>

  <div id="hudPanel" class="hidden"
    style="
      position:fixed;
      right: 12px;
      top: 12px;
      width: min(420px, 92vw);
      z-index: 99999;
      background: #111;
      color: #fff;
      border-radius: 14px;
      padding: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    ">
    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
      <b>Premium Menu</b>
      <button id="btnCloseHud" type="button" style="font-size:12px;">Close</button>
    </div>

    <div style="margin-top:10px; font-size:13px; opacity:.95;">
      <div><b>Restaurant:</b> <span id="hudRestName">-</span></div>
      <div><b>Join code:</b> <span id="hudJoinCode">-</span></div>
      <div><b>Seat limit:</b> <span id="hudSeatLimit">-</span></div>
    </div>

    <hr style="opacity:.25; margin:12px 0;" />

    <div style="font-size:12px; opacity:.9;">
      <b>Next step (we will build):</b>
      <ul style="margin:8px 0 0 18px; padding:0; opacity:.9;">
        <li>Toggle: invite required (email/phone)</li>
        <li>Invite list + “dissociate” (revoke) contacts</li>
        <li>Waiter join = code + OTP verification</li>
      </ul>
    </div>

    <div class="row" style="margin-top:12px;">
      <button id="btnCopyHudCode" type="button">Copy join code</button>
    </div>

    <div id="hudMsg" style="margin-top:8px; font-size:12px; opacity:.9;"></div>
  </div>

  <!-- DEBUG PANEL -->
  <pre id="debugPanel"
    style="
      position: fixed;
      right: 12px;
      bottom: 12px;
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

// ------------------------------------------------------------
// State
// ------------------------------------------------------------
const debugEl = document.getElementById("debugPanel");
debugEl.textContent = "Debug panel live ✅";

let appMode = "public"; // 'public' | 'demo' | 'premium'
let routingLock = false;
let lastRouteAt = 0;

const appState = {
  lastCreatedRestaurant: null, // { id, name, code, seat_limit }
  premiumRestaurantMeta: null, // { id, name, code, seat_limit }
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
  setMsg("signupMsg", "");
  setMsg("premMsg", "");
  setMsg("createRestMsg", "");
  setMsg("inviteMsg", "");
  setMsg("hudMsg", "");
}

function withTimeout(promise, ms, label = "operation") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function setDebug(obj) {
  debugEl.textContent = JSON.stringify(obj, null, 2);
}

function openHud() {
  document.getElementById("hudBackdrop").classList.remove("hidden");
  document.getElementById("hudPanel").classList.remove("hidden");
}

function closeHud() {
  document.getElementById("hudBackdrop").classList.add("hidden");
  document.getElementById("hudPanel").classList.add("hidden");
}

function renderPremiumHudMeta(meta) {
  document.getElementById("hudRestName").textContent = meta?.name || "-";
  document.getElementById("hudJoinCode").textContent = meta?.code || "-";
  document.getElementById("hudSeatLimit").textContent = meta?.seat_limit ?? "-";
}

function renderInvitePanelFromCreated(r) {
  const panel = document.getElementById("invitePanel");
  const codeText = document.getElementById("inviteCodeText");
  if (!panel || !codeText) return;

  if (r?.code) {
    panel.classList.remove("hidden");
    codeText.textContent = r.code;
  } else {
    panel.classList.add("hidden");
    codeText.textContent = "";
  }
}

// ------------------------------------------------------------
// Premium: fetch restaurant meta for HUD
// ------------------------------------------------------------
async function loadPremiumRestaurantMeta(restaurantId) {
  const res = await withTimeout(
    supabase.from("restaurants").select("id,name,code,seat_limit").eq("id", restaurantId).single(),
    12000,
    "restaurants.select"
  );
  if (res.error) throw res.error;
  appState.premiumRestaurantMeta = res.data;
  renderPremiumHudMeta(res.data);
}

// ------------------------------------------------------------
// Router (Premium uses session/profile; Demo bypasses Supabase)
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
    setDebug({
      step: "premium.route.session",
      reason,
      time: new Date().toISOString(),
      hasSession: !!session,
      sessionError: sErr?.message || null,
      mode: appMode,
    });

    if (sErr || !session?.user) {
      appMode = "public";
      return showScreen("screenPremiumAuth");
    }

    // Read profile (RLS)
    const userId = session.user.id;
    const profRes = await withTimeout(
      supabase.from("profiles").select("role, restaurant_id, display_name").eq("user_id", userId).maybeSingle(),
      12000,
      "profiles.select"
    );

    if (profRes.error || !profRes.data) {
      setDebug({ step: "premium.route.profile.error", time: new Date().toISOString(), error: profRes.error?.message || "missing_profile" });
      return showScreen("screenPremiumAuth");
    }

    const profile = profRes.data;

    // Premium is manager-only
    if (profile.role !== "admin") {
      setMsg("premMsg", "This Premium area is for managers only.");
      await signOut();
      appMode = "public";
      return showScreen("screenPremiumAuth");
    }

    if (!profile.restaurant_id) {
      return showScreen("screenCreateRestaurant");
    }

    // Load restaurant meta into HUD
    await loadPremiumRestaurantMeta(profile.restaurant_id);

    appMode = "premium";
    return showScreen("screenGamePremium");
  } catch (e) {
    console.error(e);
    setDebug({ step: "premium.route.crash", time: new Date().toISOString(), error: e.message || String(e) });
    showScreen("screenPremiumAuth");
  } finally {
    routingLock = false;
  }
}

// ------------------------------------------------------------
// Actions: Public/Demo
// ------------------------------------------------------------
document.getElementById("btnStartDemo").addEventListener("click", () => {
  appMode = "demo";
  setDebug({ step: "demo.start", time: new Date().toISOString() });
  showScreen("screenGameDemo");

  // If your embedded HTML game initializer exists, call it.
  if (typeof window.initBottleCallerGame === "function") {
    try { window.initBottleCallerGame(); } catch {}
  }
});

document.getElementById("btnExitDemo").addEventListener("click", () => {
  appMode = "public";
  setDebug({ step: "demo.exit", time: new Date().toISOString() });
  showScreen("screenAuth");
});

// Demo auth UI (optional testing)
const signupPanel = document.getElementById("signupPanel");
document.getElementById("btnGoSignup").addEventListener("click", () => {
  signupPanel.classList.toggle("hidden");
});

document.getElementById("btnLogin").addEventListener("click", async () => {
  try {
    clearMsgs();
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;

    setMsg("authMsg", "Logging in...");
    const res = await withTimeout(signIn(email, password), 15000, "signIn");
    if (res?.error) throw res.error;

    setMsg("authMsg", "Logged in (demo testing).");
    setDebug({ step: "demo.login.ok", time: new Date().toISOString(), email });

    // We do NOT route to premium here. This is demo/testing login only.
  } catch (e) {
    console.error(e);
    setMsg("authMsg", e.message || "Login failed");
    setDebug({ step: "demo.login.failed", time: new Date().toISOString(), error: e.message || String(e) });
  }
});

async function doSignup(role) {
  try {
    clearMsgs();
    const displayName = document.getElementById("suName").value.trim();
    const email = document.getElementById("suEmail").value.trim();
    const password = document.getElementById("suPassword").value;

    const { error } = await withTimeout(signUp(email, password, { role, display_name: displayName || null }), 15000, "signUp");
    if (error) throw error;

    setMsg("signupMsg", "Signup created. If confirmation is on, confirm email then log in.");
    setDebug({ step: "demo.signup.ok", time: new Date().toISOString(), role, email });
  } catch (e) {
    console.error(e);
    setMsg("signupMsg", e.message || "Signup failed");
    setDebug({ step: "demo.signup.failed", time: new Date().toISOString(), error: e.message || String(e) });
  }
}

document.getElementById("btnRoleAdmin").addEventListener("click", () => doSignup("admin"));
document.getElementById("btnRoleWaiter").addEventListener("click", () => doSignup("waiter"));

// ------------------------------------------------------------
// Actions: Premium entry
// ------------------------------------------------------------
document.getElementById("btnGoPremium").addEventListener("click", () => {
  appMode = "public";
  showScreen("screenPremiumAuth");
});

document.getElementById("btnBackToAuth").addEventListener("click", () => {
  appMode = "public";
  showScreen("screenAuth");
});

// Premium manager login
document.getElementById("btnPremiumLogin").addEventListener("click", async () => {
  try {
    clearMsgs();

    const email = document.getElementById("premEmail").value.trim();
    const password = document.getElementById("premPassword").value;

    setMsg("premMsg", "Logging in...");
    const res = await withTimeout(signIn(email, password), 15000, "premium.signIn");
    if (res?.error) throw res.error;

    setMsg("premMsg", "Logged in. Routing...");
    await routePremium("premium.login.ok");
  } catch (e) {
    console.error(e);
    setMsg("premMsg", e.message || "Premium login failed");
    setDebug({ step: "premium.login.failed", time: new Date().toISOString(), error: e.message || String(e) });
  }
});

// Premium manager signup (forces role=admin)
document.getElementById("btnPremiumSignup").addEventListener("click", async () => {
  try {
    clearMsgs();

    const email = document.getElementById("premEmail").value.trim();
    const password = document.getElementById("premPassword").value;

    setMsg("premMsg", "Creating Premium account...");
    const { error } = await withTimeout(signUp(email, password, { role: "admin", display_name: null }), 15000, "premium.signUp");
    if (error) throw error;

    setMsg("premMsg", "Account created. If confirmation is on, confirm email then log in.");
    setDebug({ step: "premium.signup.ok", time: new Date().toISOString(), email });
  } catch (e) {
    console.error(e);
    setMsg("premMsg", e.message || "Premium signup failed");
    setDebug({ step: "premium.signup.failed", time: new Date().toISOString(), error: e.message || String(e) });
  }
});

// ------------------------------------------------------------
// Premium: Create Restaurant (default 15 seats, code hidden in premium menu)
// ------------------------------------------------------------
document.getElementById("btnCreateRestaurant").addEventListener("click", async () => {
  try {
    clearMsgs();

    const name = document.getElementById("restName").value.trim();
    if (!name) throw new Error("Restaurant name is required");

    const { session } = await getSession();
    if (!session?.user) throw new Error("Not logged in");

    // Seat cap is “vended” here: default 15 (editable later in premium menu)
    const seatLimit = 15;
    const code = Math.random().toString(16).slice(2, 12).toUpperCase();

    const { data: r, error: rErr } = await withTimeout(
      supabase
        .from("restaurants")
        .insert({ name, code, seat_limit: seatLimit, created_by: session.user.id })
        .select("id,name,code,seat_limit")
        .single(),
      15000,
      "restaurants.insert"
    );
    if (rErr) throw rErr;

    const { error: pErr } = await withTimeout(
      supabase.from("profiles").update({ restaurant_id: r.id }).eq("user_id", session.user.id),
      15000,
      "profiles.update"
    );
    if (pErr) throw pErr;

    appState.lastCreatedRestaurant = r;
    renderInvitePanelFromCreated(r);

    setMsg("createRestMsg", "Created. Your join code is available inside Premium.");
    setDebug({ step: "premium.restaurant.created", time: new Date().toISOString(), restaurant: r });

    // Load HUD meta now
    await loadPremiumRestaurantMeta(r.id);
  } catch (e) {
    console.error(e);
    setMsg("createRestMsg", e.message || "Create failed");
    setDebug({ step: "premium.restaurant.create.failed", time: new Date().toISOString(), error: e.message || String(e) });
  }
});

document.getElementById("btnCopyCode").addEventListener("click", async () => {
  try {
    const code = appState.lastCreatedRestaurant?.code;
    if (!code) throw new Error("No code available yet.");
    await navigator.clipboard.writeText(code);
    setMsg("inviteMsg", "Copied join code.");
  } catch (e) {
    setMsg("inviteMsg", e.message || "Copy failed");
  }
});

document.getElementById("btnContinueToGame").addEventListener("click", async () => {
  await routePremium("premium.continue");
});

// Premium HUD
document.getElementById("btnOpenHud").addEventListener("click", () => {
  renderPremiumHudMeta(appState.premiumRestaurantMeta);
  openHud();
});

document.getElementById("btnCloseHud").addEventListener("click", closeHud);
document.getElementById("hudBackdrop").addEventListener("click", closeHud);

document.getElementById("btnCopyHudCode").addEventListener("click", async () => {
  try {
    const code = appState.premiumRestaurantMeta?.code;
    if (!code) throw new Error("No code loaded yet.");
    await navigator.clipboard.writeText(code);
    setMsg("hudMsg", "Copied.");
  } catch (e) {
    setMsg("hudMsg", e.message || "Copy failed");
  }
});

// Logout buttons (premium)
async function doLogout() {
  try {
    await signOut();
  } finally {
    appMode = "public";
    appState.lastCreatedRestaurant = null;
    appState.premiumRestaurantMeta = null;
    closeHud();
    showScreen("screenPremiumAuth");
    setDebug({ step: "premium.logout", time: new Date().toISOString() });
  }
}

document.getElementById("btnLogoutA").addEventListener("click", doLogout);
document.getElementById("btnLogoutG").addEventListener("click", doLogout);
document.getElementById("btnRetryRoute")?.addEventListener("click", () => routePremium("retry"));

// ------------------------------------------------------------
// Boot
// ------------------------------------------------------------
showScreen("screenAuth");

// If user already has a premium session, let them continue
supabase.auth.onAuthStateChange((event) => {
  setDebug({ step: "auth.change", event, time: new Date().toISOString() });
  // Only route premium if they are currently in premium flow
  // (We also allow auto-continue if they’re already authenticated)
  setTimeout(() => routePremium(`auth.change:${event}`), 150);
});

setDebug({ step: "boot.ready", time: new Date().toISOString(), supabaseUrl: import.meta.env.VITE_SUPABASE_URL });
