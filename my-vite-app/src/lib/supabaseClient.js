import { createClient } from "@supabase/supabase-js";

/**
 * Env vars live in: my-vite-app/.env
 * Required:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Parent uses persistent auth
const PARENT_STORAGE_KEY = "bc_supabase_auth_v1";

// Iframe must NOT persist auth
const IFRAME_STORAGE_KEY = "bc_supabase_iframe_ephemeral_v1";

function isIframe() {
  try { return window.self !== window.top; } catch { return true; }
}

// Tiny in-memory storage implementation (prevents localStorage writes)
function memoryStorage() {
  const mem = new Map();
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: (k) => { mem.delete(k); },
  };
}

let supabase;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in my-vite-app/.env. Restart dev server after setting them."
  );
}

export function getSupabase() {
  if (supabase) return supabase;

  const inIframe = isIframe();

  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: inIframe
      ? {
          // 🚫 IFRAME: never persist, never refresh, never touch localStorage
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: IFRAME_STORAGE_KEY,
          storage: memoryStorage(),
        }
      : {
          // ✅ PARENT: persistent auth
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storageKey: PARENT_STORAGE_KEY,
        },
  });

  supabase.__BC_ID__ = "sb_" + Math.random().toString(16).slice(2);
  window.__BC_SUPABASE__ = supabase;
  window.__BC_SUPABASE_ID__ = supabase.__BC_ID__;
  window.__BC_SUPABASE_STORAGE_KEY__ = inIframe ? IFRAME_STORAGE_KEY : PARENT_STORAGE_KEY;

  console.log(
    `[SUPABASE] created ${inIframe ? "IFRAME" : "PARENT"} client`,
    supabase.__BC_ID__,
    "storageKey=",
    inIframe ? IFRAME_STORAGE_KEY : PARENT_STORAGE_KEY
  );

  return supabase;
}

// Backward-compat export (since your game imports { supabase })
export { supabase };
supabase = getSupabase();

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

/**
 * Pass metadata for the trigger:
 * signUp(email, password, { role: 'admin', display_name: 'Kirk' })
 */
export async function signUp(email, password, metadata = {}) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      // If confirm-email is ON, send user back to your app after confirming
      emailRedirectTo: window.location.origin
    }
  });
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.warn("[AUTH] signOut error", error);
  }
  return { error };
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user ?? null, error };
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data?.session ?? null, error };
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => callback(event, session));
}
