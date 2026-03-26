import { BC_TYPES } from "../bcMessages";

export function makeWinesMutateHandler({
  supabase,
  getSourceCtx,
  isDemoMsg,
  rejectIfEpochMismatch,
  getSenderCtxOrReject,
  getLiveAuthOrNull,
}) {
  if (!supabase) throw new Error("makeWinesMutateHandler: supabase required");
  if (!getSourceCtx) throw new Error("makeWinesMutateHandler: getSourceCtx required");
  if (!isDemoMsg) throw new Error("makeWinesMutateHandler: isDemoMsg required");
  if (!rejectIfEpochMismatch) throw new Error("makeWinesMutateHandler: rejectIfEpochMismatch required");
  if (!getSenderCtxOrReject) throw new Error("makeWinesMutateHandler: getSenderCtxOrReject required");
  if (!getLiveAuthOrNull) throw new Error("makeWinesMutateHandler: getLiveAuthOrNull required");

  return async ({ msg, event, reply }) => {
    const replyType = BC_TYPES.WINES_MUTATE_RESULT;
    const reqId = msg?.reqId || null;
    const action = String(msg?.action || "");
    const payload = msg?.payload || {};
    const senderCtx = getSourceCtx(event.source);

    if (isDemoMsg(msg, senderCtx)) {
      reply(replyType, { reqId, ok: true, demo: true });
      return;
    }

    if (rejectIfEpochMismatch(event, msg, replyType, { reqId })) {
      return;
    }

    if (!action) {
      reply(replyType, { reqId, ok: false, error: "missing_action" });
      return;
    }

    const ctx = getSenderCtxOrReject(
      event,
      senderCtx,
      replyType,
      { reqId },
      {
        requireRestaurant: true,
        allowedRoles: ["single_manager", "group_manager", "enterpriser"],
      }
    );
    if (!ctx) return;

    const liveAuth = await getLiveAuthOrNull();
    const userId = liveAuth?.userId || null;

    if (!userId) {
      reply(replyType, { reqId, ok: false, error: "no_session" });
      return;
    }

    if (String(userId) !== String(ctx.userId)) {
      reply(replyType, { reqId, ok: false, error: "forbidden_user" });
      return;
    }

    const rid = ctx.restaurantId;

    try {
      if (action === "add") {
        const row = {
          restaurant_id: rid,
          created_by: userId,
          name: payload?.name || "",
          varietal: payload?.varietal || "",
          fruit_tags: payload?.fruit_tags || [],
          texture_tags: payload?.texture_tags || [],
          oak_level: payload?.oak_level || "",
          process: payload?.process || "",
          region: payload?.region || "",
          story: payload?.story || "",
        };

        const { error } = await supabase.from("bc_wines").insert(row);
        if (error) throw error;
      } else if (action === "upsert") {
        const wineId = payload?.id;
        if (!wineId) {
          reply(replyType, { reqId, ok: false, error: "missing_wine_id" });
          return;
        }

        const { error } = await supabase
          .from("bc_wines")
          .update({
            name: payload?.name || "",
            varietal: payload?.varietal || "",
            fruit_tags: payload?.fruit_tags || [],
            texture_tags: payload?.texture_tags || [],
            oak_level: payload?.oak_level || "",
            process: payload?.process || "",
            region: payload?.region || "",
            story: payload?.story || "",
          })
          .eq("id", wineId)
          .eq("restaurant_id", rid);

        if (error) throw error;
      } else if (action === "delete") {
        const wineId = payload?.wineId || payload?.id;
        if (!wineId) {
          reply(replyType, { reqId, ok: false, error: "missing_wine_id" });
          return;
        }

        const { error } = await supabase
          .from("bc_wines")
          .delete()
          .eq("id", wineId)
          .eq("restaurant_id", rid);

        if (error) throw error;
      } else if (action === "delete_all") {
        const { error } = await supabase
          .from("bc_wines")
          .delete()
          .eq("restaurant_id", rid);

        if (error) throw error;
      } else {
        reply(replyType, { reqId, ok: false, error: "unsupported_action" });
        return;
      }

      reply(replyType, { reqId, ok: true });
    } catch (e) {
      reply(replyType, {
        reqId,
        ok: false,
        error: e?.message || String(e),
      });
    }
  };
}
