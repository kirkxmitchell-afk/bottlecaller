import { getSupabaseParent } from "./supabaseParent";

export async function signIn(email, password) {
  const sb = getSupabaseParent();
  return sb.auth.signInWithPassword({ email, password });
}

export async function signUp(email, password, metadata = {}) {
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

export async function signOutLocal() {
  const sb = getSupabaseParent();
  const { error } = await sb.auth.signOut();
  if (error) console.warn("[AUTH] signOut error", error);
  return { error };
}

export async function getUser() {
  const sb = getSupabaseParent();
  const { data, error } = await sb.auth.getUser();
  return { user: data?.user ?? null, error };
}

export async function getSession() {
  const sb = getSupabaseParent();
  const { data, error } = await sb.auth.getSession();
  return { session: data?.session ?? null, error };
}

export function onAuthStateChange(callback) {
  const sb = getSupabaseParent();
  return sb.auth.onAuthStateChange((event, session) => callback(event, session));
}
