import { BC_TYPES } from "../bcMessages";

export function makeRitualStatusHandler({
  supabase,
  getSourceCtx,
  isDemoMsg,
  rejectIfEpochMismatch,
  getSenderCtxOrReject,
  getLiveAuthOrNull,
}) {
  if (!supabase) throw new Error("makeRitualStatusHandler: supabase required");
  if (!getSourceCtx) throw new Error("makeRitualStatusHandler: getSourceCtx required");
  if (!isDemoMsg) throw new Error("makeRitualStatusHandler: isDemoMsg required");
  if (!rejectIfEpochMismatch) throw new Error("makeRitualStatusHandler: rejectIfEpochMismatch required");
  if (!getSenderCtxOrReject) throw new Error("makeRitualStatusHandler: getSenderCtxOrReject required");
  if (!getLiveAuthOrNull) throw new Error("makeRitualStatusHandler: getLiveAuthOrNull required");

  return async ({ msg, event, reply }) => {
    const replyType = BC_TYPES.RITUAL_STATUS_RESPONSE;
    const reqId = msg?.reqId || null;
    const senderCtx = getSourceCtx(event.source);

    if (isDemoMsg(msg, senderCtx)) {
      reply(replyType, {
        reqId,
        ok: true,
        doneToday: false,
        demo: true,
      });
      return;
    }

    if (rejectIfEpochMismatch(event, msg, replyType, { reqId, doneToday: false })) {
      return;
    }

    const ctx = getSenderCtxOrReject(
      event,
      senderCtx,
      replyType,
      { reqId, doneToday: false },
      {
        requireRestaurant: true,
        allowedRoles: ["waiter", "single_manager", "group_manager", "enterpriser"],
      }
    );
    if (!ctx) return;

    const liveAuth = await getLiveAuthOrNull();
    const authed = liveAuth?.userId || null;

    if (!authed) {
      reply(replyType, {
        reqId,
        ok: false,
        doneToday: false,
        error: "no_session",
      });
      return;
    }

    if (String(authed) !== String(ctx.userId)) {
      reply(replyType, {
        reqId,
        ok: false,
        doneToday: false,
        error: "forbidden_user",
      });
      return;
    }

    const now = new Date();
    const zaNow = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Johannesburg" }));
    const startZA = new Date(zaNow);
    startZA.setHours(0, 0, 0, 0);
    const startIso = startZA.toISOString();

    const { data, error } = await supabase
      .from("bc_event_log")
      .select("id")
      .eq("event_type", "ritual_completed")
      .eq("user_id", ctx.userId)
      .eq("restaurant_id", ctx.restaurantId)
      .gte("occurred_at", startIso)
      .limit(1);

    if (error) {
      reply(replyType, {
        reqId,
        ok: false,
        doneToday: false,
        error: error.message || String(error),
      });
      return;
    }

    const doneToday = Array.isArray(data) && data.length > 0;

    reply(replyType, {
      reqId,
      ok: true,
      doneToday,
    });
  };
}
