// src/game/eventLogBridge.ts
import { supabase } from "../lib/supabaseClient.js";

export async function hasRitualCompletedTodayZA() {
  // We fetch the most recent ritual and compare to ZA “today”
  const { data, error } = await supabase
    .from("bc_event_log")
    .select("occurred_at")
    .eq("event_type", "ritual_completed")
    .order("occurred_at", { ascending: false })
    .limit(1);

  if (error) throw error;

  const last = data?.[0]?.occurred_at ? new Date(data[0].occurred_at) : null;
  if (!last) return false;

  // ZA “today” boundary
  const now = new Date();
  const zaNow = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Johannesburg" }));
  const startZA = new Date(zaNow);
  startZA.setHours(0, 0, 0, 0);

  // convert startZA back to “real” UTC moment
  const startZA_utc = new Date(startZA.toISOString());

  return last >= startZA_utc;
}
