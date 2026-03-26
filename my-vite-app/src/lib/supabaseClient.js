// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

/**
 * Vite env variables must start with VITE_. Set these in project root .env
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_CONFIG_ERROR = "Supabase configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(SUPABASE_CONFIG_ERROR);
}

function makeConfigError() {
  return new Error(SUPABASE_CONFIG_ERROR);
}

function createFallbackSupabase() {
  return {
    auth: {
      async signInWithPassword() {
        return { data: { session: null, user: null }, error: makeConfigError() };
      },
      async signUp() {
        return { data: { user: null, session: null }, error: makeConfigError() };
      },
      async signOut() {
        return { error: null };
      },
      async getUser() {
        return { data: { user: null }, error: null };
      },
      async getSession() {
        return { data: { session: null }, error: null };
      },
      onAuthStateChange() {
        return {
          data: {
            subscription: {
              unsubscribe() {},
            },
          },
        };
      },
    },
  };
}

let client;

try {
  client = createClient(SUPABASE_URL ?? "", SUPABASE_ANON_KEY ?? "");
} catch (error) {
  console.error("Supabase client init failed:", error);
  client = createFallbackSupabase();
}

export const supabase = client;

/* Auth helpers used by the app — keep these small and predictable */
function resolveCredentials(emailOrCredentials, password) {
  if (typeof emailOrCredentials === "object" && emailOrCredentials !== null) {
    return {
      email: emailOrCredentials.email,
      password: emailOrCredentials.password,
    };
  }

  return {
    email: emailOrCredentials,
    password,
  };
}

export async function signIn(emailOrCredentials, password) {
  const { email, password: resolvedPassword } = resolveCredentials(emailOrCredentials, password);
  return supabase.auth.signInWithPassword({ email, password: resolvedPassword });
}

export async function signUp(emailOrCredentials, password, options = {}) {
  const { email, password: resolvedPassword } = resolveCredentials(emailOrCredentials, password);
  return supabase.auth.signUp({
    email,
    password: resolvedPassword,
    options,
  });
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
  return { session: data?.session ?? null, error };
}
