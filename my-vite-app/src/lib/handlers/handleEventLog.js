// src/lib/handlers/handleEventLog.js
export async function handleEventLog({
  msg,
  event,
  supabase,
  tagSource,
  ctx,
  replyType = "event_log_ack",
}) {
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

        v: p.v ?? 1,
        mode: p.mode ?? p.bcMode ?? null,
        session_id: p.sessionId ?? p.session_id ?? null,
        seq: p.seq ?? null,

        encounter_id: p.encounterId ?? p.encounter_id ?? null,
        encounter_number: p.encounterNumber ?? p.encounter_number ?? null,
        tier: p.tier ?? null,

        chain_score: p.chainScore ?? p.chain_score ?? null,
        chain_signal: p.chainSignal ?? p.chain_signal ?? null,
        performance_grade: p.performanceGrade ?? p.performance_grade ?? null,
        final_difficulty: p.finalDifficulty ?? p.final_difficulty ?? null,

        chosen_guest_type: p.chosenGuestType ?? p.chosen_guest_type ?? null,
        chosen_mode: p.chosenMode ?? p.chosen_mode ?? null,
        chosen_hook: p.chosenHook ?? p.chosen_hook ?? null,
        actual_guest_type: p.actualGuestType ?? p.actual_guest_type ?? null,

        chosen_guest_type_norm: p.chosenGuestTypeNorm ?? p.chosen_guest_type_norm ?? null,
        actual_guest_type_norm: p.actualGuestTypeNorm ?? p.actual_guest_type_norm ?? null,

        pivot_type: p.pivotType ?? p.pivot_type ?? null,
        pivot_taken: p.pivotTaken ?? p.pivot_taken ?? null,
        pivot_success: p.pivotSuccess ?? p.pivot_success ?? null,

        read_correct: p.readCorrect ?? p.read_correct ?? null,
        delivery_correct: p.deliveryCorrect ?? p.delivery_correct ?? null,

        mode_status: p.modeStatus ?? p.mode_status ?? null,
        hook_status: p.hookStatus ?? p.hook_status ?? null,

        is_green: p.isGreen ?? p.is_green ?? null,
        is_red: p.isRed ?? p.is_red ?? null,

        mode_optimal: p.modeOptimal ?? p.mode_optimal ?? null,
        hook_optimal: p.hookOptimal ?? p.hook_optimal ?? null,
      };

      const up = await supabase
        .from("bc_encounter_resolutions_v2")
        .upsert(resRow, { onConflict: "event_id" });

      if (up.error) console.warn("[BC] encounter_resolutions upsert failed", up.error);
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
