// src/auth.js
import { getSupabaseParent } from "./lib/supabaseParent.js";
import { signIn, signUp, signOutLocal as sbSignOut, getUser, getSession } from "./lib/authParent.js";

/**
 * With the DB trigger enabled, you do NOT insert into profiles from the client anymore.
 * The trigger creates the profile row automatically on signup.
 */

export async function signUpEmail({ email, password, displayName, role }) {
  const { error } = await signUp(email, password, {
    role,
    display_name: displayName || null
  });
  if (error) throw error;

  // If email confirmation is enabled, session may be null until confirmed.
  // That's okay now — the trigger still creates the profile row.
  await getSession();

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
  return session;
}

export async function getMyProfile() {
  const supabase = getSupabaseParent();
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
  const supabase = getSupabaseParent();
  const cleaned = (code || "").trim().toUpperCase();
  if (!cleaned) throw new Error("Enter a restaurant code.");

  const { data, error } = await supabase.rpc("join_restaurant_by_code", {
    p_code: cleaned
  });

  if (error) throw error;
  return data;
}

export async function createRestaurant({ name, seatLimit = 15, code }) {
  const supabase = getSupabaseParent();
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

  const { error: pErr } = await supabase
    .from("profiles")
    .update({ restaurant_id: data.id })
    .eq("user_id", user.id);

  if (pErr) throw pErr;

  return data;
}
