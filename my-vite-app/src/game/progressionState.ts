// src/game/progressionState.ts
import { supabase } from "../lib/supabaseClient"; // adjust path if needed
import type { ProgressionState, RecentWindow, Tier, WeakestLink, Readiness } from "./progressionGuards";

export async function buildProgressionInputs(params: {
  userId: string;
  restaurantId: string;
}): Promise<{ state: ProgressionState; win: RecentWindow }> {
  const { userId, restaurantId } = params;

  // 1) Readiness view (last10 + readiness)
  const r1 = await supabase
    .from("bc_readiness_v1")
    .select("*")
    .eq("user_id", userId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  // 2) Weakest link view
  const w1 = await supabase
    .from("bc_weakest_link_v1")
    .select("*")
    .eq("user_id", userId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  // 3) Trend fatigue view
  const t1 = await supabase
    .from("bc_trend_fatigue_v1")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  // 4) Ritual / drill compliance (if you have it in manager board view already, you can use that)
  const c1 = await supabase
    .from("bc_manager_board_v1")
    .select("ritual_done_today")
    .eq("user_id", userId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  const readiness = (r1.data?.readiness || "UNKNOWN") as Readiness;

  const weakestLink = ((w1.data?.weakest_link || "NONE").toUpperCase()) as WeakestLink;
  const weakestRate = (w1.data?.weakest_rate ?? null) as number | null;

  // Decide current tier:
  // If you store tier in profiles/access_tier, fetch that instead.
  // For now, clamp default to 1 until you wire tier persistence.
  const tier: Tier = 1;

  const last10Count = Number(r1.data?.last10_count ?? 0);
  const greens = Number(r1.data?.last10_greens ?? 0);
  const yellows = Number(r1.data?.last10_yellows ?? 0);
  const reds = Number(r1.data?.last10_reds ?? 0);

  const avgChainScore =
    r1.data?.last10_avg_chain_score != null ? Number(r1.data.last10_avg_chain_score) : null;

  // Recovery metrics:
  // If you have these in bc_sessions_v1 / bc_encounter_resolutions_v1, replace these.
  const recoveryAttempts = 0;
  const recoverySuccess = 0;
  const recoveryAvoidance = 0;

  // Simple panic heuristic:
  const panicPattern = reds >= 2;

  const fatigueTrend = !!(t1.data?.trend && String(t1.data.trend).toUpperCase() === "FATIGUE");

  const win: RecentWindow = {
    n: last10Count,
    greens,
    yellows,
    reds,
    avgChainScore,
    recoveryAttempts,
    recoverySuccess,
    recoveryAvoidance,
    panicPattern,
    fatigueTrend,
    weakestLink,
    weakestRate,
  };

  const state: ProgressionState = {
    tier,
    readiness,
    weakestLink,
    drillDoneToday: !!c1.data?.ritual_done_today,
  };

  return { state, win };
}
