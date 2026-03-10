// src/lib/handlers/handleEventLog.js
export async function handleEventLog({
  msg,
  event,
  supabase,
  tagSource,
  ctx,
  replyType = "event_log_ack",
}) {
  async function upsertEncounterResolutionRow(resRow) {
    const tableCandidates = [
      "bc_encounter_resolutions",
      "bc_encounter_resolutions_v1",
    ];

    let lastError = null;
    for (const table of tableCandidates) {
      const up = await supabase
        .from(table)
        .upsert([resRow], { onConflict: "event_id" });
      if (!up.error) return { ok: true, table };
      lastError = up.error;

      const msg = String(up.error?.message || "").toLowerCase();
      const isMissingRelation =
        msg.includes("does not exist") ||
        msg.includes("relation") ||
        msg.includes("schema cache");
      if (!isMissingRelation) break;
    }

    return { ok: false, error: lastError };
  }

  try {
    const { eventType, payload } = msg || {};
    if (!eventType) return;

    // Parent guarantees ctx is valid & restaurant-bound.
    if (!ctx?.userId || !ctx?.restaurantId) {
      event.source?.postMessage(
        { source: "BC_MSG", v: 1, type: replyType, ok: false, error: "missing_ctx_param" },
        event.origin
      );
      return;
    }

    const userId = ctx.userId;
    const restaurantId = ctx.restaurantId;

    console.log("[BC] event_log from", tagSource?.(event.source), ctx);

    // Single source of truth IDs/timestamps
    const eventId = String(payload?.eventId || crypto.randomUUID());
    const occurredAt =
      payload?.occurredAt ||
      payload?.occurred_at ||
      new Date().toISOString();

    // 1) event log row
    const row = {
      event_id: eventId,
      user_id: userId,
      restaurant_id: restaurantId,
      event_type: String(eventType),
      payload: payload || {},
      occurred_at: occurredAt,
    };

    const ins = await supabase
      .from("bc_event_log")
      .upsert(row, { onConflict: "event_id" });
    if (ins.error) throw ins.error;

    // 2) encounter resolution (only for that event type)
    if (eventType === "encounter_resolved") {
      const p = payload || {};

      const resRow = {
        event_id: eventId,
        user_id: userId,
        restaurant_id: restaurantId,
        occurred_at: occurredAt,
        encounter_id: p.encounterId ?? p.encounter_id ?? null,
        encounter_number: p.encounterNumber ?? p.encounter_number ?? null,
        session_id: p.sessionId ?? p.session_id ?? null,
        role: p.role ?? null,
        guest_state_actual:
          p.actualGuestType ??
          p.actual_guest_type ??
          p.actualGuestTypeNorm ??
          p.actual_guest_type_norm ??
          null,
        guest_read:
          p.chosenGuestType ??
          p.chosen_guest_type ??
          p.chosenGuestTypeNorm ??
          p.chosen_guest_type_norm ??
          null,
        mode_selected: p.chosenMode ?? p.chosen_mode ?? null,
        hook_selected: p.chosenHook ?? p.chosen_hook ?? null,
        delivery_correct: p.deliveryCorrect ?? p.delivery_correct ?? null,
        chain_score: p.chainScore ?? p.chain_score ?? null,
        chain_signal: p.chainSignal ?? p.chain_signal ?? null,
        outcome: p.outcome ?? p.chainSignal ?? p.chain_signal ?? null,
        score: p.score ?? p.chainScore ?? p.chain_score ?? null,
      };

      const up = await upsertEncounterResolutionRow(resRow);

      if (!up.ok) console.warn("[BC] encounter_resolutions upsert failed", up.error);
    }

    event.source?.postMessage(
      { source: "BC_MSG", v: 1, type: replyType, ok: true, eventType },
      event.origin
    );
  } catch (e) {
    console.error("[BC] event_log handler failed:", e);
    try {
      event.source?.postMessage(
        { source: "BC_MSG", v: 1, type: replyType, ok: false, error: String(e?.message || e) },
        event.origin
      );
    } catch {}
  }
}
