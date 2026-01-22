// src/main.js
import "./style.css";
import { supabase, signIn, signUp, signOut, getUser, getSession } from "./lib/supabaseClient.js";

console.log("supabase client present:", !!supabase);

// ---------- UI RENDER ----------
document.querySelector("#app").innerHTML = `
  <section id="screenAuth" class="screen">
    <div class="panel stack">
      <h2>Login</h2>
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

  <section id="screenCreateRestaurant" class="screen hidden">
    <div class="panel stack">
      <h2>Create Restaurant</h2>
      <input id="restName" type="text" placeholder="Restaurant name" />
      <input id="restSeats" type="number" placeholder="Seat limit (default 15)" />
      <button id="btnCreateRestaurant" type="button">Create</button>

      <div id="createRestMsg"></div>

      <div id="invitePanel" class="hidden">
        <hr/>
        <h3>Invite your waiters</h3>
        <p><b>Join code:</b> <span id="inviteCodeText"></span></p>
        <div class="row">
          <button id="btnCopyCode" type="button">Copy code</button>
          <button id="btnContinueToGame" type="button">Continue to game</button>
        </div>
        <div id="inviteMsg"></div>
      </div>

      <button id="btnLogoutA" type="button">Logout</button>
    </div>
  </section>

  <section id="screenJoinRestaurant" class="screen hidden">
    <div class="panel stack">
      <h2>Join Restaurant</h2>
      <input id="joinCode" type="text" placeholder="Restaurant code" />
      <button id="btnJoin" type="button">Join</button>
      <div id="joinMsg"></div>
      <button id="btnLogoutW" type="button">Logout</button>
    </div>
  </section>

  <section id="screenProfileError" class="screen hidden">
    <div class="panel stack">
      <h2>Account setup issue</h2>
      <p>Your profile row is missing. This is usually a trigger/config issue.</p>
      <button id="btnRetryRoute" type="button">Retry</button>
      <button id="btnLogoutE" type="button">Logout</button>
      <pre id="profileErrBox" style="white-space:pre-wrap"></pre>
    </div>
  </section>

  <section id="screenGame" class="screen hidden">
    <div class="panel stack">
      <h2>BottleCaller</h2>
      <div id="gameRoot">GAME LOADS HERE</div>
      <button id="btnLogoutG" type="button">Logout</button>
    </div>
  </section>

  <!-- ✅ DEBUG PANEL (ALWAYS VISIBLE + PINNED) -->
  <pre id="debugPanel"
    style="
      position: fixed;
      right: 12px;
      bottom: 12px;
      width: min(560px, 92vw);
      max-height: 55vh;
      overflow: auto;
      z-index: 99999;
      white-space: pre-wrap;
      background: rgba(0,0,0,0.94);
      color: #00ff66;
      padding: 12px;
      border-radius: 12px;
      font-size: 12px;
      border: 1px solid rgba(0,255,102,0.35);
      box-shadow: 0 10px 30px rgba(0,0,0,0.55);
    "></pre>
`;

// If you don't see this text, this file isn't being loaded/refreshed.
document.getElementById("debugPanel").textContent = "Debug panel live ✅";

// ---------- HELPERS ----------
let gameInitialized = false;

const appState = {
  lastCreatedRestaurant: null, // { id, name, code, seat_limit }
};

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  document.getElementById(id)?.classList.remove("hidden");

  if (id === "screenCreateRestaurant") renderInvitePanel();

  if (id === "screenGame" && !gameInitialized) {
    gameInitialized = true;
    if (typeof window.initBottleCallerGame === "function") {
      window.initBottleCallerGame();
    }
  }

  setTimeout(() => refreshDebug({ step: "showScreen", screen: id }), 0);
}

function setMsg(elId, msg) {
  const el = document.getElementById(elId);
  if (el) el.textContent = msg || "";
}

function clearMsgs(opts = { keepCreate: false }) {
  setMsg("authMsg", "");
  setMsg("signupMsg", "");
  setMsg("joinMsg", "");
  setMsg("inviteMsg", "");
  if (!opts.keepCreate) setMsg("createRestMsg", "");
  const errBox = document.getElementById("profileErrBox");
  if (errBox) errBox.textContent = "";
}

function renderInvitePanel() {
  const panel = document.getElementById("invitePanel");
  const codeText = document.getElementById("inviteCodeText");
  if (!panel || !codeText) return;

  const r = appState.lastCreatedRestaurant;
  if (r?.code) {
    panel.classList.remove("hidden");
    codeText.textContent = r.code;
  } else {
    panel.classList.add("hidden");
    codeText.textContent = "";
    setMsg("inviteMsg", "");
  }
}

// ---------- TIMEOUT HELPER ----------
function withTimeout(promise, ms, label = "operation") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// ---------- DEBUG ----------
function setDebug(obj) {
  const el = document.getElementById("debugPanel");
  if (!el) return;
  el.textContent = JSON.stringify(obj, null, 2);
}

/**
 * Timeout-safe debug refresh:
 * - If auth endpoints stall, you'll SEE it (no silent hangs).
 */
async function refreshDebug(extra = {}) {
  // show immediate activity before any awaits
  setDebug({
    ...extra,
    time: new Date().toISOString(),
    debug: "refreshDebug called",
  });

  try {
    const uRes = await withTimeout(supabase.auth.getUser(), 4000, "auth.getUser");
    const sRes = await withTimeout(supabase.auth.getSession(), 4000, "auth.getSession");

    const uData = uRes?.data;
    const uErr = uRes?.error;
    const sData = sRes?.data;
    const sErr = sRes?.error;

    let profile = null;
    let pErr = null;

    if (uData?.user) {
      const res = await withTimeout(
        supabase
          .from("profiles")
          .select("role, restaurant_id, display_name")
          .eq("user_id", uData.user.id)
          .maybeSingle(),
        4000,
        "profiles.select"
      );
      profile = res.data ?? null;
      pErr = res.error ?? null;
    }

    const visibleScreens = Array.from(document.querySelectorAll(".screen"))
      .filter((s) => !s.classList.contains("hidden"))
      .map((s) => s.id);

    setDebug({
      ...extra,
      time: new Date().toISOString(),
      auth: {
        user: uData?.user ? { id: uData.user.id, email: uData.user.email } : null,
        hasSession: !!sData?.session,
        userError: uErr?.message || null,
        sessionError: sErr?.message || null,
      },
      profile,
      profileError: pErr
        ? { message: pErr.message, code: pErr.code, details: pErr.details, hint: pErr.hint }
        : null,
      screenVisible: visibleScreens,
      lastCreatedRestaurant: appState.lastCreatedRestaurant
        ? { id: appState.lastCreatedRestaurant.id, code: appState.lastCreatedRestaurant.code }
        : null,
    });
  } catch (e) {
    console.error("refreshDebug error:", e);
    setDebug({
      ...extra,
      time: new Date().toISOString(),
      debugError: e?.message || String(e),
      note:
        "If you see auth.getUser/auth.getSession timeout, the browser is not completing requests to Supabase. Next: run ping.health below + open /auth/v1/health in the browser.",
    });
  }
}

// ---------- CONNECTIVITY PROBES (separate from supabase-js) ----------
async function pingSupabaseHealth() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  const url = `${base}/auth/v1/health`;

  try {
    setDebug({ step: "ping.health.start", url, time: new Date().toISOString() });
    const res = await withTimeout(fetch(url, { method: "GET" }), 6000, "fetch.health");
    const text = await res.text();
    setDebug({
      step: "ping.health.ok",
      time: new Date().toISOString(),
      url,
      status: res.status,
      bodyPreview: text.slice(0, 220),
      hint:
        "If this works but auth.getUser times out, it's likely something specific to auth/session requests or storage. If this times out too, it's pure connectivity/path blocking to Supabase.",
    });
  } catch (e) {
    setDebug({
      step: "ping.health.fail",
      time: new Date().toISOString(),
      url,
      error: e?.message || String(e),
      hint:
        "If fetch.health times out, your browser cannot complete HTTPS requests to Supabase from this origin/network. Test the same URL directly in the address bar.",
    });
  }
}

// ---------- ROUTER ----------
async function routeAfterLogin(opts = { clear: true }) {
  if (opts.clear) clearMsgs();

  try {
    await refreshDebug({ step: "route.start" });

    const { user, error: userErr } = await getUser();
    await refreshDebug({ step: "route.gotUser", hasUser: !!user, userErr: userErr?.message || null });

    if (userErr) {
      setMsg("authMsg", `Auth error: ${userErr.message || "unknown"}`);
      return showScreen("screenAuth");
    }

    if (!user) {
      setMsg("authMsg", "No active session. Log in again.");
      return showScreen("screenAuth");
    }

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("role, restaurant_id, display_name")
      .eq("user_id", user.id)
      .maybeSingle();

    await refreshDebug({ step: "route.profileFetched", hasProfile: !!profile, pErr: pErr?.message || null });

    if (pErr) {
      const errBox = document.getElementById("profileErrBox");
      if (errBox) errBox.textContent = JSON.stringify(pErr, null, 2);
      return showScreen("screenProfileError");
    }

    if (!profile) {
      const errBox = document.getElementById("profileErrBox");
      if (errBox) errBox.textContent = "No profile row found for this user yet.";
      return showScreen("screenProfileError");
    }

    if (!profile.restaurant_id) {
      return showScreen(profile.role === "admin" ? "screenCreateRestaurant" : "screenJoinRestaurant");
    }

    return showScreen("screenGame");
  } catch (e) {
    console.error("routeAfterLogin crash:", e);
    setMsg("authMsg", `Router crashed: ${e.message || e}`);
    await refreshDebug({ step: "route.crash", error: e.message || String(e) });
    return showScreen("screenAuth");
  }
}

// ---------- ACTIONS ----------
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
    await refreshDebug({ step: "login.clicked", email });

    // If this hangs, we surface it
    const res = await withTimeout(signIn(email, password), 12000, "signIn");
    await refreshDebug({ step: "login.signInReturned", signInError: res?.error?.message || null });

    if (res?.error) throw res.error;

    setMsg("authMsg", "Signed in. Routing...");
    await refreshDebug({ step: "login.success" });

    await routeAfterLogin();
  } catch (e) {
    console.error(e);
    setMsg("authMsg", e.message || "Login failed");
    await refreshDebug({ step: "login.failed", error: e.message || String(e) });
  }
});

// Signup
async function doSignup(role) {
  try {
    const displayName = document.getElementById("suName").value.trim();
    const email = document.getElementById("suEmail").value.trim();
    const password = document.getElementById("suPassword").value;

    await refreshDebug({ step: "signup.clicked", role, email });

    const { error } = await signUp(email, password, { role, display_name: displayName || null });
    if (error) throw error;

    await getSession();
    setMsg("signupMsg", "Signup created. Check your email to confirm, then return and log in.");
    showScreen("screenAuth");
    await refreshDebug({ step: "signup.success", role, email });
  } catch (e) {
    console.error(e);
    setMsg("signupMsg", e.message || "Signup failed");
    await refreshDebug({ step: "signup.failed", error: e.message || String(e) });
  }
}

document.getElementById("btnRoleAdmin").addEventListener("click", () => doSignup("admin"));
document.getElementById("btnRoleWaiter").addEventListener("click", () => doSignup("waiter"));

// Create restaurant (Admin)
document.getElementById("btnCreateRestaurant").addEventListener("click", async () => {
  try {
    clearMsgs({ keepCreate: true });

    const name = document.getElementById("restName").value.trim();
    const seatLimitRaw = document.getElementById("restSeats").value;
    const seatLimit = seatLimitRaw ? parseInt(seatLimitRaw, 10) : 15;

    if (!name) throw new Error("Restaurant name is required");

    const { user } = await getUser();
    if (!user) throw new Error("Not logged in");

    const code = Math.random().toString(16).slice(2, 12).toUpperCase();

    const { data: r, error: rErr } = await supabase
      .from("restaurants")
      .insert({ name, code, seat_limit: seatLimit, created_by: user.id })
      .select("id,name,code,seat_limit")
      .single();
    if (rErr) throw rErr;

    const { error: pErr } = await supabase
      .from("profiles")
      .update({ restaurant_id: r.id })
      .eq("user_id", user.id);
    if (pErr) throw pErr;

    appState.lastCreatedRestaurant = r;

    setMsg("createRestMsg", `Created. Share this join code with your waiters: ${r.code}`);
    showScreen("screenCreateRestaurant");
    await refreshDebug({ step: "createRestaurant.success", code: r.code });
  } catch (e) {
    console.error(e);
    setMsg("createRestMsg", e.message || "Create failed");
    await refreshDebug({ step: "createRestaurant.failed", error: e.message || String(e) });
  }
});

document.getElementById("btnCopyCode").addEventListener("click", async () => {
  try {
    const code = appState.lastCreatedRestaurant?.code;
    if (!code) throw new Error("No code to copy yet.");
    await navigator.clipboard.writeText(code);
    setMsg("inviteMsg", "Copied to clipboard.");
  } catch (e) {
    console.error(e);
    setMsg("inviteMsg", e.message || "Copy failed.");
  } finally {
    await refreshDebug({ step: "copyCode.clicked" });
  }
});

document.getElementById("btnContinueToGame").addEventListener("click", async () => {
  await routeAfterLogin();
});

// Join restaurant (Waiter)
document.getElementById("btnJoin").addEventListener("click", async () => {
  try {
    clearMsgs({ keepCreate: true });

    const code = document.getElementById("joinCode").value.trim().toUpperCase();
    if (!code) throw new Error("Enter a restaurant code");

    await refreshDebug({ step: "join.clicked", code });

    // Support both possible RPC parameter names (p_code vs join_code)
    let rpcRes = await supabase.rpc("join_restaurant_by_code", { p_code: code });
    if (rpcRes.error && /p_code/i.test(rpcRes.error.message || "")) {
      rpcRes = await supabase.rpc("join_restaurant_by_code", { join_code: code });
    }

    const { data, error } = rpcRes;
    if (error) throw error;

    if (!data?.ok) {
      if (data?.error === "seat_limit_reached") throw new Error("Seat limit reached (restaurant full).");
      if (data?.error === "invalid_code") throw new Error("Invalid code.");
      throw new Error("Could not join restaurant.");
    }

    await refreshDebug({ step: "join.success" });
    await routeAfterLogin();
  } catch (e) {
    console.error(e);
    setMsg("joinMsg", e.message || "Join failed");
    await refreshDebug({ step: "join.failed", error: e.message || String(e) });
  }
});

// Logout
async function doLogout() {
  try {
    await signOut();
    gameInitialized = false;
    appState.lastCreatedRestaurant = null;
    await routeAfterLogin();
  } catch (e) {
    console.error(e);
  } finally {
    await refreshDebug({ step: "logout" });
  }
}

["btnLogoutA", "btnLogoutW", "btnLogoutE", "btnLogoutG"].forEach((id) => {
  document.getElementById(id).addEventListener("click", doLogout);
});

document.getElementById("btnRetryRoute").addEventListener("click", () => routeAfterLogin());

// ---------- BOOT ----------
routeAfterLogin();
refreshDebug({ step: "app.load" });

// Run a direct health ping (not using supabase-js) to isolate connectivity issues.
pingSupabaseHealth();

// Re-route on auth changes
supabase.auth.onAuthStateChange(() => routeAfterLogin());

// prove we reached the end of the file
setDebug({ step: "main.js reached end ✅", time: new Date().toISOString() });
