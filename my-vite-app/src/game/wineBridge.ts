// src/game/wineBridge.ts
import { supabase } from "../lib/supabaseClient.js";

export type WineRow = {
  id: string;
  restaurant_id: string;
  created_by: string;
  name: string;
  varietal: string;
  fruit_tags: string[];
  texture_tags: string[];
  oak_level: string;
  process: string;
  region: string;
  story: string;
};

export type WineInput = {
  name: string;
  varietal: string;
  fruitTags: string[];
  textureTags: string[];
  oakLevel: string;
  process: string;
  region: string;
  story: string;
};

function toUiWine(r: WineRow) {
  return {
    id: r.id,
    name: r.name,
    varietal: r.varietal,
    fruitTags: r.fruit_tags || [],
    textureTags: r.texture_tags || [],
    oakLevel: r.oak_level || "",
    process: r.process || "",
    region: r.region || "",
    story: r.story || "",
  };
}

export async function fetchRestaurantWines(restaurantId: string) {
  const { data, error } = await supabase
    .from("bc_wines")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map(toUiWine);
}

export async function addRestaurantWine(restaurantId: string, wine: WineInput) {
  const { data: userRes, error: uErr } = await supabase.auth.getUser();
  if (uErr) throw uErr;

  const userId = userRes?.user?.id;
  if (!userId) throw new Error("not_authenticated");

  const row = {
    restaurant_id: restaurantId,
    created_by: userId,
    name: wine.name,
    varietal: wine.varietal,
    fruit_tags: wine.fruitTags || [],
    texture_tags: wine.textureTags || [],
    oak_level: wine.oakLevel || "",
    process: wine.process || "",
    region: wine.region || "",
    story: wine.story || "",
  };

  const { error } = await supabase.from("bc_wines").insert(row);
  if (error) throw error;
}

export async function deleteRestaurantWine(wineId: string) {
  const { error } = await supabase.from("bc_wines").delete().eq("id", wineId);
  if (error) throw error;
}

export async function deleteAllRestaurantWines(restaurantId: string) {
  const { data: userRes, error: uErr } = await supabase.auth.getUser();
  if (uErr) throw uErr;

  const userId = userRes?.user?.id;
  if (!userId) throw new Error("not_authenticated");

  const { error } = await supabase
    .from("bc_wines")
    .delete()
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
  return true;
}
