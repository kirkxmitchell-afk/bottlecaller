import { supabase, signIn, signUp, signOut, getUser } from "./lib/supabaseClient.js";

export async function signUpEmail({ email, password, displayName, role }) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  // Create the user's profile row
  const userId = data.user.id;

  const { error: pErr } = await supabase.from("profiles").insert({
    user_id: userId,
    role,
    display_name: displayName,
    restaurant_id: null
  });

  if (pErr) throw pErr;
}

export async function signInEmail({ email, password }) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getMyProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, restaurant_id, display_name")
    .eq("user_id", (await supabase.auth.getUser()).data.user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function joinRestaurantByCode(code) {
  const { data, error } = await supabase.rpc("join_restaurant_by_code", {
    p_code: code
  });
  if (error) throw error;
  return data; // { ok: true } or { ok:false, error:'seat_limit_reached' }
}

export async function createRestaurant({ name, seatLimit = 15, code }) {
  const user = (await supabase.auth.getUser()).data.user;

  // Generate a simple code if you didn’t pass one
  const joinCode =
    (code && code.trim().toUpperCase()) ||
    Math.random().toString(16).slice(2, 12).toUpperCase();

  const { data, error } = await supabase
    .from("restaurants")
    .insert({
      name,
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
