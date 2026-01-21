// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

/**
 * Vite env variables must start with VITE_ and live in:
 * my-vite-app/.env
 *
 * Required:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 *
 * After editing .env, restart: npm run dev
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in my-vite-app/.env. Restart dev server after setting them."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* Auth helpers used by the app — keep these small and predictable */
export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

/**
 * Pass metadata to populate new.raw_user_meta_data in Postgres trigger:
 * signUp(email, password, { role: 'admin', display_name: 'Kirk' })
 */
export async function signUp(email, password, metadata = {}) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: metadata }
  });
}

export async function signOut() {
  return supabase.auth.signOut();
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
