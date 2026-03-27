// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

/**
 * Vite env variables must start with VITE_. Set these in project root .env
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Only warn (not throw) so dev server still starts; you'll see this in console.
  console.warn("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in env.");
}

export const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_ANON_KEY ?? "");

/* Auth helpers used by the app — keep these small and predictable */
export async function signIn({ email, password }) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp({ email, password }) {
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  return { data: data?.user ?? null, error };
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}