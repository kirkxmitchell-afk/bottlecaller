import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fixed key so we can purge deterministically
const STORAGE_KEY = "bc_supabase_auth_v1";

export function getSupabase() {
  // One instance only
  if (window.__BC_SUPABASE__) return window.__BC_SUPABASE__;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[SUPABASE] Missing env vars", {
      VITE_SUPABASE_URL: !!SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: !!SUPABASE_ANON_KEY,
    });
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: STORAGE_KEY,
    },
  });

  // Fingerprint to prove singleton
  client.__BC_ID__ = "sb_" + Math.random().toString(16).slice(2);
  console.log("[SUPABASE] singleton created", client.__BC_ID__, "storageKey=", STORAGE_KEY);

  window.__BC_SUPABASE__ = client;
  window.__BC_SUPABASE_ID__ = client.__BC_ID__;
  window.__BC_SUPABASE_STORAGE_KEY__ = STORAGE_KEY;

  return client;
}
