import { BC_TYPES } from "../bcMessages";

export function makeLeaderboardHandler({
  supabase,
  getSourceCtx,
  isDemoMsg,
  rejectIfEpochMismatch,
  getSenderCtxOrReject,
  getLiveAuthOrNull,
}) {
  if (!supabase) throw new Error("makeLeaderboardHandler: supabase required");
  if (!getSourceCtx) throw new Error("makeLeaderboardHandler: getSourceCtx required");
  if (!isDemoMsg) throw new Error("makeLeaderboardHandler: isDemoMsg required");
  if (!rejectIfEpochMismatch) throw new Error("makeLeaderboardHandler: rejectIfEpochMismatch required");
  if (!getSenderCtxOrReject) throw new Error("makeLeaderboardHandler: getSenderCtxOrReject required");
  if (!getLiveAuthOrNull) throw new Error("makeLeaderboardHandler: getLiveAuthOrNull required");

  return async ({ msg, event, reply }) => {
    const replyType = BC_TYPES.LEADERBOARD_RESPONSE;
    const reqId = msg?.reqId || null;
    const senderCtx = getSourceCtx(event.source);

    if (isDemoMsg(msg, senderCtx)) {
      reply(replyType, { reqId, ok: true, rows: [], demo: true });
      return;
    }

    if (rejectIfEpochMismatch(event, msg, replyType, { reqId, rows: [] })) {
      return;
    }

    const ctx = getSenderCtxOrReject(
      event,
      senderCtx,
      replyType,
      { reqId, rows: [] },
      {
        requireRestaurant: true,
        allowedRoles: ["waiter", "single_manager", "group_manager", "enterpriser"],
      }
    );
    if (!ctx) return;

    const liveAuth = await getLiveAuthOrNull();
    const authed = liveAuth?.userId || null;

    if (!authed) {
      reply(replyType, { reqId, ok: false, rows: [], error: "no_session" });
      return;
    }

    if (String(authed) !== String(ctx.userId)) {
      reply(replyType, { reqId, ok: false, rows: [], error: "forbidden_user" });
      return;
    }

    const { data, error } = await supabase
      .from("bc_waiter_leaderboard_v1")
      .select("*")
      .eq("restaurant_id", ctx.restaurantId)
      .order("total_points", { ascending: false })
      .order("last_activity_at", { ascending: false })
      .limit(50);

    if (error) {
      reply(replyType, {
        reqId,
        ok: false,
        rows: [],
        error: error.message || String(error),
      });
      return;
    }

    reply(replyType, {
      reqId,
      ok: true,
      rows: data || [],
    });
  };
}
