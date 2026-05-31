import { getSupabaseParent, SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabaseParent";

const SDK_SIGN_IN_TIMEOUT_MS = 5000;
const DIRECT_AUTH_TIMEOUT_MS = 8000;

function isNetworkFetchError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  const name = String(error?.name || "").toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    name.includes("fetch")
  );
}

function makeAuthError(message, extras = {}) {
  const error = new Error(message);
  Object.assign(error, extras);
  return error;
}

function withDeadline(promise, ms, label) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(
        makeAuthError(`${label} timed out after ${ms}ms`, {
          code: "auth_timeout",
        })
      );
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function directPasswordGrant(email, password) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DIRECT_AUTH_TIMEOUT_MS);
  let response;

  try {
    response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw makeAuthError(
        `Direct Supabase auth request timed out after ${DIRECT_AUTH_TIMEOUT_MS}ms.`,
        { code: "direct_auth_timeout" }
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      data: { session: null, user: null },
      error: makeAuthError(
        payload?.msg ||
          payload?.error_description ||
          payload?.message ||
          `Auth request failed (${response.status}).`,
        {
          status: response.status,
          code: payload?.error_code || payload?.error || payload?.code || "auth_request_failed",
          payload,
        }
      ),
    };
  }

  const sb = getSupabaseParent();
  return sb.auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  });
}

export async function parentSignIn(email, password) {
  const sb = getSupabaseParent();
  try {
    const result = await withDeadline(
      sb.auth.signInWithPassword({ email, password }),
      SDK_SIGN_IN_TIMEOUT_MS,
      "Supabase SDK sign-in"
    );
    if (!isNetworkFetchError(result?.error)) return result;

    console.warn("[AUTH] signInWithPassword fetch failed, retrying via direct password grant", result.error);
    try {
      return await directPasswordGrant(email, password);
    } catch (fallbackError) {
      throw makeAuthError(
        `Browser could not reach Supabase auth at ${SUPABASE_URL}. Check browser privacy shields, extensions, VPN/proxy rules, or retry in a fresh tab.`,
        {
          cause: fallbackError,
          code: "browser_fetch_blocked",
        }
      );
    }
  } catch (error) {
    if (!isNetworkFetchError(error) && error?.code !== "auth_timeout") throw error;

    console.warn("[AUTH] signInWithPassword stalled or threw fetch error, retrying via direct password grant", error);
    try {
      return await directPasswordGrant(email, password);
    } catch (fallbackError) {
      throw makeAuthError(
        `Browser could not reach Supabase auth at ${SUPABASE_URL}. Check browser privacy shields, extensions, VPN/proxy rules, or retry in a fresh tab.`,
        {
          cause: fallbackError,
          code: "browser_fetch_blocked",
        }
      );
    }
  }
}

export async function parentSignUp(email, password, metadata = {}) {
  const sb = getSupabaseParent();
  return sb.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: window.location.origin,
    },
  });
}

export async function parentSignOutGlobal() {
  const sb = getSupabaseParent();
  return sb.auth.signOut({ scope: "global" });
}

export async function signOutLocal() {
  const sb = getSupabaseParent();
  const { error } = await sb.auth.signOut();
  if (error) console.warn("[AUTH] signOut error", error);
  return { error };
}

export async function parentGetUser() {
  const sb = getSupabaseParent();
  const { data, error } = await sb.auth.getUser();
  return { user: data?.user ?? null, error };
}

export async function parentGetSession() {
  const sb = getSupabaseParent();
  const { data, error } = await sb.auth.getSession();
  return { session: data?.session ?? null, error };
}

export function onAuthStateChange(callback) {
  const sb = getSupabaseParent();
  return sb.auth.onAuthStateChange((event, session) => callback(event, session));
}

// Backward-compatible exports during migration.
export const signIn = parentSignIn;
export const signUp = parentSignUp;
export const getUser = parentGetUser;
export const getSession = parentGetSession;
