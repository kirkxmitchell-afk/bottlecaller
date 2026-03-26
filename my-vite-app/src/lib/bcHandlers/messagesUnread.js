import { BC_TYPES } from "../bcMessages";

export function makeMessagesUnreadHandler({
  supabase,
  getSourceCtx,
  isDemoMsg,
  rejectIfEpochMismatch,
  getSenderCtxOrReject,
  getLiveAuthOrNull,
}) {
  if (!supabase) throw new Error("makeMessagesUnreadHandler: supabase required");
  if (!getSourceCtx) throw new Error("makeMessagesUnreadHandler: getSourceCtx required");
  if (!isDemoMsg) throw new Error("makeMessagesUnreadHandler: isDemoMsg required");
  if (!rejectIfEpochMismatch) throw new Error("makeMessagesUnreadHandler: rejectIfEpochMismatch required");
  if (!getSenderCtxOrReject) throw new Error("makeMessagesUnreadHandler: getSenderCtxOrReject required");
  if (!getLiveAuthOrNull) throw new Error("makeMessagesUnreadHandler: getLiveAuthOrNull required");

  return async ({ msg, event, reply }) => {
    const reqId = msg?.reqId || null;
    const senderCtx = getSourceCtx(event.source);

    if (isDemoMsg(msg, senderCtx)) {
      reply(BC_TYPES.MESSAGES_UNREAD_RESPONSE, {
        reqId,
        ok: true,
        rows: [],
        demo: true,
      });
      return;
    }

    if (rejectIfEpochMismatch(event, msg, BC_TYPES.MESSAGES_UNREAD_RESPONSE, { reqId, rows: [] })) {
      return;
    }

    const ctx = getSenderCtxOrReject(
      event,
      senderCtx,
      BC_TYPES.MESSAGES_UNREAD_RESPONSE,
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
      reply(BC_TYPES.MESSAGES_UNREAD_RESPONSE, {
        reqId,
        ok: false,
        rows: [],
        error: "no_session",
      });
      return;
    }

    if (String(authed) !== String(ctx.userId)) {
      reply(BC_TYPES.MESSAGES_UNREAD_RESPONSE, {
        reqId,
        ok: false,
        rows: [],
        error: "forbidden_user",
      });
      return;
    }

    const { data, error } = await supabase
      .from("bc_messages_v1")
      .select("id, type, body, payload, sender_user_id, sender_role, receiver_user_id, created_at, restaurant_id, scope_id, scope_type")
      .eq("receiver_user_id", ctx.userId)
      .eq("restaurant_id", ctx.restaurantId)
      .is("archived_at", null)
      .is("read_at", null)
      .order("created_at", { ascending: true })
      .limit(25);

    if (error) {
      reply(BC_TYPES.MESSAGES_UNREAD_RESPONSE, {
        reqId,
        ok: false,
        rows: [],
        error: error.message || String(error),
      });
      return;
    }

    reply(BC_TYPES.MESSAGES_UNREAD_RESPONSE, {
      reqId,
      ok: true,
      rows: data || [],
    });
  };
}
