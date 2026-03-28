import { BC_TYPES } from "../bcMessages";

export function makeHardResetProgressionHandler({
  getSourceCtx,
  isDemoMsg,
  rejectIfEpochMismatch,
  getSenderCtxOrReject,
  getLiveAuthOrNull,
  hardResetProgressionStateOnly,
}) {
  if (!getSourceCtx) throw new Error("makeHardResetProgressionHandler: getSourceCtx required");
  if (!isDemoMsg) throw new Error("makeHardResetProgressionHandler: isDemoMsg required");
  if (!rejectIfEpochMismatch) throw new Error("makeHardResetProgressionHandler: rejectIfEpochMismatch required");
  if (!getSenderCtxOrReject) throw new Error("makeHardResetProgressionHandler: getSenderCtxOrReject required");
  if (!getLiveAuthOrNull) throw new Error("makeHardResetProgressionHandler: getLiveAuthOrNull required");
  if (!hardResetProgressionStateOnly) throw new Error("makeHardResetProgressionHandler: hardResetProgressionStateOnly required");

  return async ({ msg, event, reply }) => {
    const reqId = msg?.reqId || null;
    const replyType = BC_TYPES.HARD_RESET_PROGRESSION_RESULT;
    const senderCtx = getSourceCtx(event.source);

    if (isDemoMsg(msg, senderCtx)) {
      reply(replyType, {
        reqId,
        ok: false,
        resetMode: "progression_only",
        error: "demo_not_supported",
      });
      return;
    }

    if (rejectIfEpochMismatch(event, msg, replyType, { reqId, resetMode: "progression_only" })) {
      return;
    }

    const ctx = getSenderCtxOrReject(
      event,
      senderCtx,
      replyType,
      { reqId, resetMode: "progression_only" },
      {
        requireRestaurant: true,
        allowedRoles: ["waiter", "single_manager", "group_manager", "enterpriser"],
      }
    );
    if (!ctx) return;

    const liveAuth = await getLiveAuthOrNull();
    const authed = liveAuth?.userId || null;
    if (!authed) {
      reply(replyType, { reqId, ok: false, resetMode: "progression_only", error: "no_session" });
      return;
    }

    if (String(authed) !== String(ctx.userId)) {
      reply(replyType, { reqId, ok: false, resetMode: "progression_only", error: "forbidden_user" });
      return;
    }

    const userId =
      msg?.userId ||
      ctx?.progressionOwnerUserId ||
      ctx?.userId ||
      null;
    const restaurantId =
      msg?.restaurantId ||
      ctx?.progressionOwnerRestaurantId ||
      ctx?.restaurantId ||
      null;

    if (String(userId || "") !== String(ctx.userId || "")) {
      reply(replyType, { reqId, ok: false, resetMode: "progression_only", error: "forbidden_target_user" });
      return;
    }

    if (String(restaurantId || "") !== String(ctx.restaurantId || "")) {
      reply(replyType, { reqId, ok: false, resetMode: "progression_only", error: "forbidden_target_restaurant" });
      return;
    }

    try {
      const result = await hardResetProgressionStateOnly({
        userId,
        restaurantId,
        scopeId: ctx?.scopeId || null,
      });

      reply(replyType, {
        reqId,
        ok: true,
        ...result,
      });
    } catch (e) {
      reply(replyType, {
        reqId,
        ok: false,
        resetMode: "progression_only",
        userId,
        restaurantId,
        error: e?.message || String(e),
      });
    }
  };
}
