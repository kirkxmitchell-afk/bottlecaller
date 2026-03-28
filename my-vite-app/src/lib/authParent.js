import { getSupabaseParent } from "./supabaseParent";

export async function parentSignIn(email, password) {
  const sb = getSupabaseParent();
  return sb.auth.signInWithPassword({ email, password });
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
