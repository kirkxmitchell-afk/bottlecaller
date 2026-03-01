import { createClient } from "@supabase/supabase-js";

export function getSupabase() {
  if (window.__BC_SUPABASE__) return window.__BC_SUPABASE__;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  window.__BC_SUPABASE__ = client;
  console.log("[SUPABASE] singleton created");
  return client;
}
