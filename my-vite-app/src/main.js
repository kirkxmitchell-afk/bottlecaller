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
      <p>Your profile row is missing OR profile read is blocked.</p>
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

const debugEl = document.getElementById("debugPanel");
debugEl.textContent = "Debug panel live ✅";

// ---------- STATE ----------
let gameInitialized = false;
let routingLock = false;
let lastRouteAt = 0;

const appState = {
  lastCreatedRestaurant: null,
};

// ---------- HELPERS ----------
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

  // do not spam debug calls here; routing handles debug
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

// ---------- TIMEOUT ----------
function withTimeout(promise, ms, label = "operation") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// ---------- DEBUG ----------
function setDebug(obj) {
  debugEl.textContent = JSON.stringify(obj, null, 2);
}

// Direct health ping (connectivity sanity)
async function pingSupabaseHealth() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  const url = `${base}/auth/v1/health`;

  try {
    const res = await withTimeout(fetch(url, { method: "GET" }), 6000, "fetch.health");
    const text = await res.text();
    setDebug({
      step: "ping.health.ok",
      time: new Date().toISOString(),
      url,
      status: res.status,
      bodyPreview: text.slice(0, 220),
    });
  } catch (e) {
    setDebug({
      step: "ping.health.fail",
      time: new Date().toISOString(),
      url,
      error: e?.message || String(e),
    });
  }
}

// ---------- ROUTER (session-first, avoids getUser hammer) ----------
async function routeAfterLogin(reason = "manual") {
  // lock to prevent auth spam loops
  const now = Date.now();
  if (routingLock) return;
  if (now - lastRouteAt < 250) return;
  lastRouteAt = now;
  routingLock = true;

  try {
    clearMsgs();

    // ✅ SESSION FIRST (this is the big change)
    const { session, error: sErr } = await withTimeout(getSession(), 6000, "getSession");
    setDebug({
      step: "route.session",
      reason,
      time: new Date().toISOString(),
      hasSession: !!session,
      sessionError: sErr?.message || null,
    });

    if (sErr) {
      setMsg("authMsg", `Session error: ${sErr.message}`);
      return showScreen("screenAuth");
    }

    if (!session?.user) {
      return showScreen("screenAuth");
    }

    const userId = session.user.id;

    // profile read (RLS)
    const profRes = await withTimeout(
      supabase.from("profiles").select("role, restaurant_id, display_name").eq("user_id", userId).maybeSingle(),
      6000,
      "profiles.select"
    );

    if (profRes.error) {
      const errBox = document.getElementById("profileErrBox");
      if (errBox) errBox.textContent = JSON.stringify(profRes.error, null, 2);
      setDebug({
        step: "route.profile.error",
        time: new Date().toISOString(),
        message: profRes.error.message,
        code: profRes.error.code,
        details: profRes.error.details,
      });
      return showScreen("screenProfileError");
    }

    if (!profRes.data) {
      const errBox = document.getElementById("profileErrBox");
      if (errBox) errBox.textContent = "No profile row found for this user yet.";
      setDebug({
        step: "route.profile.missing",
        time: new Date().toISOString(),
        userId,
      });
      return showScreen("screenProfileError");
    }

    const profile = profRes.data;

    setDebug({
      step: "route.profile.ok",
      time: new Date().toISOString(),
      user: { id: userId, email: session.user.email },
      profile,
    });

    if (!profile.restaurant_id) {
      return showScreen(profile.role === "admin" ? "screenCreateRestaurant" : "screenJoinRestaurant");
    }

    return showScreen("screenGame");
  } catch (e) {
    console.error("routeAfterLogin crash:", e);
    setMsg("authMsg", e.message || "Routing failed");
    setDebug({
      step: "route.crash",
      time: new Date().toISOString(),
      error: e?.message || String(e),
    });
    return showScreen("screenAuth");
  } finally {
    routingLock = false;
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

    setDebug({ step: "login.clicked", time: new Date().toISOString(), email });

    const res = await withTimeout(signIn(email, password), 15000, "signIn");
    if (res?.error) throw res.error;

    setMsg("authMsg", "Signed in. Routing...");
    setDebug({ step: "login.ok", time: new Date().toISOString(), email });

    await routeAfterLogin("login.ok");
  } catch (e) {
    console.error(e);
    setMsg("authMsg", e.message || "Login failed");
    setDebug({ step: "login.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
});

// Signup
async function doSignup(role) {
  try {
    const displayName = document.getElementById("suName").value.trim();
    const email = document.getElementById("suEmail").value.trim();
    const password = document.getElementById("suPassword").value;

    setDebug({ step: "signup.clicked", time: new Date().toISOString(), role, email });

    const { error } = await withTimeout(signUp(email, password, { role, display_name: displayName || null }), 15000, "signUp");
    if (error) throw error;

    await getSession();
    setMsg("signupMsg", "Signup created. Check email if confirmation is on; then log in.");
    showScreen("screenAuth");
    setDebug({ step: "signup.ok", time: new Date().toISOString(), role, email });
  } catch (e) {
    console.error(e);
    setMsg("signupMsg", e.message || "Signup failed");
    setDebug({ step: "signup.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
}

document.getElementById("btnRoleAdmin").addEventListener("click", () => doSignup("admin"));
document.getElementById("btnRoleWaiter").addEventListener("click", () => doSignup("waiter"));

// Create restaurant
document.getElementById("btnCreateRestaurant").addEventListener("click", async () => {
  try {
    clearMsgs({ keepCreate: true });

    const name = document.getElementById("restName").value.trim();
    const seatLimitRaw = document.getElementById("restSeats").value;
    const seatLimit = seatLimitRaw ? parseInt(seatLimitRaw, 10) : 15;

    if (!name) throw new Error("Restaurant name is required");

    const { session } = await getSession();
    if (!session?.user) throw new Error("Not logged in");

    const code = Math.random().toString(16).slice(2, 12).toUpperCase();

    const { data: r, error: rErr } = await withTimeout(
      supabase.from("restaurants").insert({ name, code, seat_limit: seatLimit, created_by: session.user.id }).select("id,name,code,seat_limit").single(),
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

    setMsg("createRestMsg", `Created. Share this join code with your waiters: ${r.code}`);
    showScreen("screenCreateRestaurant");
    setDebug({ step: "createRestaurant.ok", time: new Date().toISOString(), code: r.code, restaurantId: r.id });
  } catch (e) {
    console.error(e);
    setMsg("createRestMsg", e.message || "Create failed");
    setDebug({ step: "createRestaurant.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
});

document.getElementById("btnCopyCode").addEventListener("click", async () => {
  try {
    const code = appState.lastCreatedRestaurant?.code;
    if (!code) throw new Error("No code to copy yet.");
    await navigator.clipboard.writeText(code);
    setMsg("inviteMsg", "Copied to clipboard.");
    setDebug({ step: "copyCode.ok", time: new Date().toISOString(), code });
  } catch (e) {
    console.error(e);
    setMsg("inviteMsg", e.message || "Copy failed.");
    setDebug({ step: "copyCode.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
});

document.getElementById("btnContinueToGame").addEventListener("click", async () => {
  await routeAfterLogin("continueToGame");
});

// Join restaurant
document.getElementById("btnJoin").addEventListener("click", async () => {
  try {
    clearMsgs({ keepCreate: true });

    const code = document.getElementById("joinCode").value.trim().toUpperCase();
    if (!code) throw new Error("Enter a restaurant code");

    setDebug({ step: "join.clicked", time: new Date().toISOString(), code });

    // Try both RPC param names
    let rpcRes = await withTimeout(supabase.rpc("join_restaurant_by_code", { p_code: code }), 15000, "rpc.join(p_code)");
    if (rpcRes.error && /p_code/i.test(rpcRes.error.message || "")) {
      rpcRes = await withTimeout(supabase.rpc("join_restaurant_by_code", { join_code: code }), 15000, "rpc.join(join_code)");
    }

    const { data, error } = rpcRes;
    if (error) throw error;

    if (!data?.ok) {
      if (data?.error === "seat_limit_reached") throw new Error("Seat limit reached (restaurant full).");
      if (data?.error === "invalid_code") throw new Error("Invalid code.");
      throw new Error("Could not join restaurant.");
    }

    setDebug({ step: "join.ok", time: new Date().toISOString(), code });
    await routeAfterLogin("join.ok");
  } catch (e) {
    console.error(e);
    setMsg("joinMsg", e.message || "Join failed");
    setDebug({ step: "join.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
});

// Logout
async function doLogout() {
  try {
    await signOut();
    gameInitialized = false;
    appState.lastCreatedRestaurant = null;
    await routeAfterLogin("logout");
  } catch (e) {
    console.error(e);
    setDebug({ step: "logout.failed", time: new Date().toISOString(), error: e?.message || String(e) });
  }
}

["btnLogoutA", "btnLogoutW", "btnLogoutE", "btnLogoutG"].forEach((id) => {
  document.getElementById(id).addEventListener("click", doLogout);
});

document.getElementById("btnRetryRoute").addEventListener("click", () => routeAfterLogin("retry"));

// ---------- BOOT ----------
(async () => {
  setDebug({ step: "boot.start", time: new Date().toISOString() });

  // Connectivity sanity
  await pingSupabaseHealth();

  // Initial routing
  await routeAfterLogin("boot");

  // Auth changes (debounced + session-first routing)
  supabase.auth.onAuthStateChange((event) => {
    setDebug({ step: "auth.change", time: new Date().toISOString(), event });
    // slight delay lets storage settle
    setTimeout(() => routeAfterLogin(`auth.change:${event}`), 150);
  });
})();
