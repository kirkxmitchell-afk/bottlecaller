import { BC_TYPES } from "../bcMessages";

export function makeMessageMarkReadHandler({
  supabase,
  getSourceCtx,
  isDemoMsg,
  rejectIfEpochMismatch,
  getSenderCtxOrReject,
  getLiveAuthOrNull,
}) {
  if (!supabase) throw new Error("makeMessageMarkReadHandler: supabase required");
  if (!getSourceCtx) throw new Error("makeMessageMarkReadHandler: getSourceCtx required");
  if (!isDemoMsg) throw new Error("makeMessageMarkReadHandler: isDemoMsg required");
  if (!rejectIfEpochMismatch) throw new Error("makeMessageMarkReadHandler: rejectIfEpochMismatch required");
  if (!getSenderCtxOrReject) throw new Error("makeMessageMarkReadHandler: getSenderCtxOrReject required");
  if (!getLiveAuthOrNull) throw new Error("makeMessageMarkReadHandler: getLiveAuthOrNull required");

  return async ({ msg, event, reply }) => {
    const replyType = BC_TYPES.MESSAGE_MARK_READ_RESULT;
    const reqId = msg?.reqId || null;
    const id = msg?.id || null;
    const senderCtx = getSourceCtx(event.source);

    if (isDemoMsg(msg, senderCtx)) {
      reply(replyType, { reqId, ok: true, demo: true, id });
      return;
    }

    if (rejectIfEpochMismatch(event, msg, replyType, { reqId, id })) {
      return;
    }

    const ctx = getSenderCtxOrReject(
      event,
      senderCtx,
      replyType,
      { reqId, id },
      {
        requireRestaurant: true,
        allowedRoles: ["waiter", "single_manager", "group_manager", "enterpriser"],
      }
    );
    if (!ctx) return;

    const liveAuth = await getLiveAuthOrNull();
    const authed = liveAuth?.userId || null;

    if (!authed) {
      reply(replyType, { reqId, ok: false, id, error: "no_session" });
      return;
    }

    if (String(authed) !== String(ctx.userId)) {
      reply(replyType, { reqId, ok: false, id, error: "forbidden_user" });
      return;
    }

    if (!id) {
      reply(replyType, { reqId, ok: false, id, error: "missing_id" });
      return;
    }

    const { error } = await supabase
      .from("bc_messages_v1")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("receiver_user_id", ctx.userId);

    if (error) {
      reply(replyType, {
        reqId,
        ok: false,
        id,
        error: error.message || String(error),
      });
      return;
    }

    reply(replyType, { reqId, ok: true, id });
  };
}
