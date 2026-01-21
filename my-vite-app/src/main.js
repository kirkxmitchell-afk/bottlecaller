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
      <p>Profile row missing or blocked by RLS. This usually means signup didn’t create a profile.</p>
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
`;

// ---------- HELPERS ----------
let gameInitialized = false;

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  document.getElementById(id)?.classList.remove("hidden");

  if (id === "screenGame" && !gameInitialized) {
    gameInitialized = true;
    if (typeof window.initBottleCallerGame === "function") {
      window.initBottleCallerGame();
    }
  }
}

function setMsg(elId, msg) {
  const el = document.getElementById(elId);
  if (el) el.textContent = msg || "";
}

function clearMsgs() {
  setMsg("authMsg", "");
  setMsg("signupMsg", "");
  setMsg("createRestMsg", "");
  setMsg("joinMsg", "");
  const errBox = document.getElementById("profileErrBox");
  if (errBox) errBox.textContent = "";
}

// ---------- ROUTER (STEP 6 CORE) ----------
async function routeAfterLogin() {
  clearMsgs();

  const { user, error: userErr } = await getUser();
  if (userErr) {
    console.error(userErr);
    return showScreen("screenAuth");
  }
  if (!user) return showScreen("screenAuth");

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("role, restaurant_id, display_name")
    .eq("user_id", user.id)
    .single();

  if (pErr || !profile) {
    console.error("Profile missing or blocked by RLS:", pErr);
    const errBox = document.getElementById("profileErrBox");
    if (errBox) errBox.textContent = JSON.stringify(pErr, null, 2);
    return showScreen("screenProfileError");
  }

  if (!profile.restaurant_id) {
    return showScreen(profile.role === "admin" ? "screenCreateRestaurant" : "screenJoinRestaurant");
  }

  return showScreen("screenGame");
}

// ---------- ACTIONS ----------
const signupPanel = document.getElementById("signupPanel");
document.getElementById("btnGoSignup").addEventListener("click", () => {
  signupPanel.classList.toggle("hidden");
});

document.getElementById("btnLogin").addEventListener("click", async () => {
  try {
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;

    const { error } = await signIn(email, password);
    if (error) throw error;

    await routeAfterLogin();
  } catch (e) {
    console.error(e);
    setMsg("authMsg", e.message || "Login failed");
  }
});

/**
 * Signup + profile insert:
 * If Supabase email confirmation is ON, signUp may NOT create a session immediately.
 * That means inserting into profiles from the client can fail RLS (auth.uid() null).
 *
 * Fast dev path: disable email confirmation.
 * Production path: auth trigger creates profile server-side.
 */
async function doSignup(role) {
  try {
    const displayName = document.getElementById("suName").value.trim();
    const email = document.getElementById("suEmail").value.trim();
    const password = document.getElementById("suPassword").value;

    const { data, error } = await signUp(email, password);
    if (error) throw error;

    const userId = data?.user?.id;
    if (!userId) {
      throw new Error(
        "Signup created no active user session. If email confirmation is enabled, check your email first (or disable confirmation for dev)."
      );
    }

    // Helps with timing in some environments (won't override confirm-email requirement)
    await getSession();

    const { error: pErr } = await supabase.from("profiles").insert({
      user_id: userId,
      role,
      display_name: displayName || null,
      restaurant_id: null
    });

    if (pErr) {
      const msg = (pErr.message || "").toLowerCase();
      if (msg.includes("row level security")) {
        throw new Error(
          "Profile creation blocked by RLS. If email confirmation is enabled, disable it for dev OR add an auth trigger to auto-create profiles."
        );
      }
      throw pErr;
    }

    setMsg("signupMsg", "Signup complete. Now routing…");
    await routeAfterLogin();
  } catch (e) {
    console.error(e);
    setMsg("signupMsg", e.message || "Signup failed");
  }
}

document.getElementById("btnRoleAdmin").addEventListener("click", () => doSignup("admin"));
document.getElementById("btnRoleWaiter").addEventListener("click", () => doSignup("waiter"));

document.getElementById("btnCreateRestaurant").addEventListener("click", async () => {
  try {
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
      .select()
      .single();
    if (rErr) throw rErr;

    const { error: pErr } = await supabase
      .from("profiles")
      .update({ restaurant_id: r.id })
      .eq("user_id", user.id);
    if (pErr) throw pErr;

    setMsg("createRestMsg", `Created. Join code: ${r.code}`);
    await routeAfterLogin();
  } catch (e) {
    console.error(e);
    setMsg("createRestMsg", e.message || "Create failed");
  }
});

document.getElementById("btnJoin").addEventListener("click", async () => {
  try {
    const code = document.getElementById("joinCode").value.trim().toUpperCase();
    if (!code) throw new Error("Enter a restaurant code");

    const { data, error } = await supabase.rpc("join_restaurant_by_code", { p_code: code });
    if (error) throw error;

    if (!data?.ok) {
      if (data?.error === "seat_limit_reached") throw new Error("Seat limit reached (restaurant full).");
      if (data?.error === "invalid_code") throw new Error("Invalid code.");
      throw new Error("Could not join restaurant.");
    }

    await routeAfterLogin();
  } catch (e) {
    console.error(e);
    setMsg("joinMsg", e.message || "Join failed");
  }
});

async function doLogout() {
  try {
    await signOut();
    gameInitialized = false;
    await routeAfterLogin();
  } catch (e) {
    console.error(e);
  }
}

["btnLogoutA", "btnLogoutW", "btnLogoutE", "btnLogoutG"].forEach((id) => {
  document.getElementById(id).addEventListener("click", doLogout);
});

document.getElementById("btnRetryRoute").addEventListener("click", routeAfterLogin);

// Run on load
routeAfterLogin();

// Re-route on auth changes
supabase.auth.onAuthStateChange(() => routeAfterLogin());
