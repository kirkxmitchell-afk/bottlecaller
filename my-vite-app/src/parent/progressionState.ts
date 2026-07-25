// src/parent/progressionState.ts
import { getSupabaseParent } from "../lib/supabaseParent.js";
import type { ProgressionState, RecentWindow, Tier, WeakestLink, Readiness } from "../game/progressionGuards";
import { deriveTier } from "../progressionStore.js";
import {
  classifyEncounterResolutionForProgression,
  extractLiveProgressionSnapshot,
  logLiveProgressionContractCheck,
} from "./progressionShared.js";

export async function buildProgressionInputs(params: {
  userId: string;
  restaurantId: string;
}): Promise<{ state: ProgressionState; win: RecentWindow }> {
  const supabase = getSupabaseParent();
  const { userId, restaurantId } = params;

  const live = logLiveProgressionContractCheck(userId, restaurantId);
  const liveSnapshot = live?.state?.ctxReady && live?.state?.progressionReady
    ? extractLiveProgressionSnapshot(live)
    : null;

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

  const e1 = await supabase
    .from("bc_event_log")
    .select("occurred_at,payload")
    .eq("user_id", userId)
    .eq("restaurant_id", restaurantId)
    .eq("event_type", "encounter_resolved")
    .order("occurred_at", { ascending: false })
    .limit(50);

  // 4) Ritual / drill compliance (if you have it in manager board view already, you can use that)
  const c1 = await supabase
    .from("bc_manager_board_v1")
    .select("ritual_done_today")
    .eq("user_id", userId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  // 5) Canonical progression state
  const p1 = await supabase
    .from("bc_progression_state_v1")
    .select("canonical_state")
    .eq("user_id", userId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  const readiness = (r1.data?.readiness || "UNKNOWN") as Readiness;

  const weakestLink = ((w1.data?.weakest_link || "NONE").toUpperCase()) as WeakestLink;
  const weakestRate = (w1.data?.weakest_rate ?? null) as number | null;

  const canonicalState =
    p1.data?.canonical_state && typeof p1.data.canonical_state === "object"
      ? p1.data.canonical_state
      : {};
  const canonicalEconomy =
    canonicalState?.economy && typeof canonicalState.economy === "object"
      ? canonicalState.economy
      : {};
  const canonicalAuthority =
    canonicalState?.authority && typeof canonicalState.authority === "object"
      ? canonicalState.authority
      : {};

  const canonicalPoints = Number(canonicalEconomy?.points ?? canonicalState?.points ?? 0);
  const tierFromPoints = deriveTier(canonicalPoints);
  const servedTierRaw = Number(canonicalAuthority?.tierToServe ?? canonicalEconomy?.tier ?? tierFromPoints);
  const tier: Tier =
    servedTierRaw >= 3 ? 3 :
    servedTierRaw === 2 ? 2 :
    1;

  const readinessLast10Count = Number(r1.data?.last10_count ?? 0);
  const readinessGreens = Number(r1.data?.last10_greens ?? 0);
  const readinessYellows = Number(r1.data?.last10_yellows ?? 0);
  const readinessReds = Number(r1.data?.last10_reds ?? 0);
  const readinessAvgChainScore =
    r1.data?.last10_avg_chain_score != null ? Number(r1.data.last10_avg_chain_score) : null;

  const eventRows = Array.isArray(e1.data) ? e1.data : [];
  const recentEvents = eventRows.map(classifyEncounterResolutionForProgression);
  const recent10 = recentEvents.slice(0, 10);
  const dbRecentWindow = recent10.length
    ? {
        n: recent10.length,
        greens: recent10.filter((item) => item.isGreen).length,
        yellows: Math.max(0, recent10.length - recent10.filter((item) => item.isGreen).length - recent10.filter((item) => item.isRed).length),
        reds: recent10.filter((item) => item.isRed).length,
        avgChainScore: recent10.reduce((sum, item) => sum + Number(item.chainScore ?? 0), 0) / recent10.length,
        recoveryAttempts: recent10.filter((item) => item.pivotTaken).length,
        recoverySuccess: recent10.filter((item) => item.pivotSuccess).length,
        recoveryAvoidance: Math.max(0, recent10.filter((item) => item.pivotTaken).length - recent10.filter((item) => item.pivotSuccess).length),
      }
    : {
        n: readinessLast10Count,
        greens: readinessGreens,
        yellows: readinessYellows,
        reds: readinessReds,
        avgChainScore: readinessAvgChainScore,
        recoveryAttempts: 0,
        recoverySuccess: 0,
        recoveryAvoidance: 0,
      };

  const liveRecentWindow = liveSnapshot
    ? {
        n: liveSnapshot.last10Count,
        greens: liveSnapshot.last10Greens,
        yellows: Math.max(0, liveSnapshot.last10Count - liveSnapshot.last10Greens - liveSnapshot.last10Reds),
        reds: liveSnapshot.last10Reds,
        avgChainScore: dbRecentWindow.avgChainScore,
        recoveryAttempts: liveSnapshot.pivotsTaken,
        recoverySuccess: liveSnapshot.pivotsSuccess,
        recoveryAvoidance: Math.max(0, liveSnapshot.pivotsTaken - liveSnapshot.pivotsSuccess),
      }
    : null;

  const recentWindow = liveRecentWindow || dbRecentWindow;
  const last10Count = recentWindow.n;
  const greens = recentWindow.greens;
  const yellows = recentWindow.yellows;
  const reds = recentWindow.reds;
  const avgChainScore = recentWindow.avgChainScore;
  const recoveryAttempts = recentWindow.recoveryAttempts;
  const recoverySuccess = recentWindow.recoverySuccess;
  const recoveryAvoidance = recentWindow.recoveryAvoidance;

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

  const liveTierRaw = Number(
    live?.state?.runtime?.progression?.tierToServe ??
      live?.state?.runtime?.progression?.authority?.tierToServe ??
      live?.state?.runtime?.progression?.result?.tierToServe ??
      NaN
  );
  const liveTier: Tier | null = Number.isFinite(liveTierRaw)
    ? liveTierRaw >= 3
      ? 3
      : liveTierRaw === 2
        ? 2
        : 1
    : null;

  const state: ProgressionState = {
    tier: liveTier ?? tier,
    readiness,
    weakestLink,
    drillDoneToday: !!c1.data?.ritual_done_today,
  };

  return { state, win };
}
