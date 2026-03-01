import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const PARENT_STORAGE_KEY = "bc_supabase_auth_v1";

function isIframe() {
  try { return window.self !== window.top; } catch { return true; }
}

// Parent-only: importing this in iframe is a hard error.
if (isIframe()) {
  console.error("[SUPABASE] supabaseParent imported inside iframe. Forbidden.");
  throw new Error("Supabase parent client import is forbidden in iframe context.");
}

let supabase = null;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Restart dev server after setting them."
  );
}

// Tiny in-memory storage (used only during forced-logout boots)
function memoryStorage() {
  const mem = new Map();
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: (k) => { mem.delete(k); },
  };
}

export function getSupabaseParent() {
  if (supabase) return supabase;

  // If logout latch exists, do not rehydrate/persist during this boot.
  let lock = null;
  try { lock = localStorage.getItem("__BC_LOGOUT_LOCK__"); } catch {}
  const forceLoggedOut = !!window.__BC_FORCE_LOGGED_OUT__ || !!lock;

  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: forceLoggedOut
      ? {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: PARENT_STORAGE_KEY,
          // prevent any storage writes during forced logout boot
          storage: memoryStorage(),
        }
      : {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storageKey: PARENT_STORAGE_KEY,
        },
  });

  supabase.__BC_ID__ = "sb_" + Math.random().toString(16).slice(2);
  window.__BC_SUPABASE__ = supabase;
  window.__BC_SUPABASE_ID__ = supabase.__BC_ID__;
  window.__BC_SUPABASE_STORAGE_KEY__ = PARENT_STORAGE_KEY;

  console.log(
    "[SUPABASE] created PARENT client",
    supabase.__BC_ID__,
    "forceLoggedOut=",
    forceLoggedOut
  );

  return supabase;
}

export function purgeAuthStorage() {
  // Your key
  try { localStorage.removeItem(PARENT_STORAGE_KEY); } catch {}
  try { sessionStorage.removeItem(PARENT_STORAGE_KEY); } catch {}

  // Supabase default/legacy keys
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.includes("auth-token")) localStorage.removeItem(k);
    }
  } catch {}

  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith("sb-") && k.includes("auth-token")) sessionStorage.removeItem(k);
    }
  } catch {}
}

// Backward-compatible alias while migrating callsites.
export const purgeSupabaseStorage = purgeAuthStorage;
