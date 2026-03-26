import { BC_TYPES } from "../bcMessages";

export function makeProgressionSnapshotHandler({
  getSourceCtx,
  isDemoMsg,
  rejectIfEpochMismatch,
  getSenderCtxOrReject,
  getLiveAuthOrNull,
  buildProgressionResult,
  getActiveRestaurantId,
  getAppState,
  getIframeEpoch,
}) {
  if (!getSourceCtx) throw new Error("makeProgressionSnapshotHandler: getSourceCtx required");
  if (!isDemoMsg) throw new Error("makeProgressionSnapshotHandler: isDemoMsg required");
  if (!rejectIfEpochMismatch) throw new Error("makeProgressionSnapshotHandler: rejectIfEpochMismatch required");
  if (!getSenderCtxOrReject) throw new Error("makeProgressionSnapshotHandler: getSenderCtxOrReject required");
  if (!getLiveAuthOrNull) throw new Error("makeProgressionSnapshotHandler: getLiveAuthOrNull required");
  if (!buildProgressionResult) throw new Error("makeProgressionSnapshotHandler: buildProgressionResult required");
  if (!getActiveRestaurantId) throw new Error("makeProgressionSnapshotHandler: getActiveRestaurantId required");
  if (!getAppState) throw new Error("makeProgressionSnapshotHandler: getAppState required");
  if (!getIframeEpoch) throw new Error("makeProgressionSnapshotHandler: getIframeEpoch required");

  return async ({ msg, event, reply }) => {
    const replyType = BC_TYPES.PROGRESSION_SNAPSHOT;
    const reqId = msg?.reqId || null;
    const senderCtx = getSourceCtx(event.source);

    if (!senderCtx) {
      reply(BC_TYPES.CTX_NOT_READY, {
        ok: false,
        reason: "no_sender_ctx",
        epoch: Number(getIframeEpoch() || 0),
        retryAfterMs: 250,
        why: "no_sender_ctx",
      });
      return;
    }

    if (isDemoMsg(msg, senderCtx)) {
      reply(replyType, {
        reqId,
        ok: true,
        demo: true,
        tierToServe: 1,
        reasons: [],
        reasonsHuman: [],
        snapshot: {
          encountersTotal: 0,
          last10Count: 0,
          last10Greens: 0,
          last10Reds: 0,
          anyRedT2Plus: false,
          pivotsTaken: 0,
          pivotsSuccess: 0,
        },
      });
      return;
    }

    if (rejectIfEpochMismatch(event, msg, replyType, { reqId })) {
      return;
    }

    const ctx = getSenderCtxOrReject(
      event,
      senderCtx,
      replyType,
      { reqId },
      {
        requireRestaurant: true,
        allowedRoles: ["waiter", "single_manager", "group_manager", "enterpriser"],
      }
    );
    if (!ctx) return;

    const appState = getAppState();
    const rid = getActiveRestaurantId?.();
    const ready =
      !!appState?.session &&
      !!appState?.profile?.role &&
      !!rid;

    if (!ready) {
      reply(BC_TYPES.CTX_NOT_READY, {
        ok: false,
        epoch: Number(getIframeEpoch() || 0),
        retryAfterMs: 250,
        why: "profile_or_restaurant_not_ready",
      });
      return;
    }

    const liveAuth = await getLiveAuthOrNull();
    const authed = liveAuth?.userId || null;

    if (!authed) {
      reply(replyType, { reqId, ok: false, error: "no_session" });
      return;
    }

    if (String(authed) !== String(ctx.userId)) {
      reply(replyType, { reqId, ok: false, error: "forbidden_user" });
      return;
    }

    const desiredTier = Number(msg?.desiredTier || 3);
    const normalizedDesiredTier = desiredTier === 1 ? 1 : desiredTier === 2 ? 2 : 3;

    const result = await buildProgressionResult({
      userId: ctx.userId,
      restaurantId: ctx.restaurantId,
      desiredTier: normalizedDesiredTier,
    });

    reply(replyType, {
      reqId,
      ok: true,
      tierToServe: result?.tierToServe ?? 1,
      reasons: result?.reasons || [],
      reasonsHuman: result?.reasonsHuman || [],
      snapshot: result?.snapshot || null,
    });
  };
}
