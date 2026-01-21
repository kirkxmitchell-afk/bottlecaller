// src/auth.js
import { supabase, signIn, signUp, signOut as sbSignOut, getUser, getSession } from "./lib/supabaseClient.js";

/**
 * NOTE ABOUT SIGNUP + RLS:
 * If Supabase email confirmation is ON, signUp may NOT create an authenticated session immediately.
 * In that case, inserting into `profiles` from the client can hit RLS (auth.uid() is null).
 *
 * Fast dev path: disable email confirmation.
 * Production path: use an auth trigger to create profiles server-side.
 */

export async function signUpEmail({ email, password, displayName, role }) {
  // Create auth user
  const { data, error } = await signUp(email, password);
  if (error) throw error;

  const userId = data?.user?.id;
  if (!userId) throw new Error("Signup succeeded but no user returned.");

  // Try to ensure session exists (helps in some cases; won't fix email-confirm-required)
  await getSession();

  // Create the user's profile row (required for routing)
  const { error: pErr } = await supabase.from("profiles").insert({
    user_id: userId,
    role,
    display_name: displayName || null,
    restaurant_id: null
  });

  if (pErr) {
    // Give a clearer message for the common case
    const msg = pErr?.message || String(pErr);
    if (msg.toLowerCase().includes("row level security")) {
      throw new Error(
        "Profile insert blocked by RLS. If email confirmation is enabled, disable it for dev or add an auth trigger to create profiles."
      );
    }
    throw pErr;
  }

  return { ok: true };
}

export async function signInEmail({ email, password }) {
  const { error } = await signIn(email, password);
  if (error) throw error;
  return { ok: true };
}

export async function signOut() {
  await sbSignOut();
  return { ok: true };
}

export async function getCurrentSession() {
  const { session, error } = await getSession();
  if (error) throw error;
  return session; // may be null
}

export async function getMyProfile() {
  const { user, error: uErr } = await getUser();
  if (uErr) throw uErr;
  if (!user) throw new Error("Not logged in.");

  const { data, error } = await supabase
    .from("profiles")
    .select("role, restaurant_id, display_name")
    .eq("user_id", user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function joinRestaurantByCode(code) {
  const cleaned = (code || "").trim().toUpperCase();
  if (!cleaned) throw new Error("Enter a restaurant code.");

  const { data, error } = await supabase.rpc("join_restaurant_by_code", {
    p_code: cleaned
  });

  if (error) throw error;

  // Expected: { ok: true } or { ok:false, error:'seat_limit_reached' }
  return data;
}

export async function createRestaurant({ name, seatLimit = 15, code }) {
  const cleanName = (name || "").trim();
  if (!cleanName) throw new Error("Restaurant name is required.");

  const { user, error: uErr } = await getUser();
  if (uErr) throw uErr;
  if (!user) throw new Error("Not logged in.");

  const joinCode =
    (code && code.trim().toUpperCase()) ||
    Math.random().toString(16).slice(2, 12).toUpperCase();

  const { data, error } = await supabase
    .from("restaurants")
    .insert({
      name: cleanName,
      code: joinCode,
      seat_limit: seatLimit,
      created_by: user.id
    })
    .select()
    .single();

  if (error) throw error;

  // Attach admin to their restaurant
  const { error: pErr } = await supabase
    .from("profiles")
    .update({ restaurant_id: data.id })
    .eq("user_id", user.id);

  if (pErr) throw pErr;

  return data; // includes code
}
