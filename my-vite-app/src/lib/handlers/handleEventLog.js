// src/lib/handlers/handleEventLog.js
export async function handleEventLog({
  msg,
  event,
  supabase,
  tagSource,
  ctx,
  replyType = "event_log_ack",
}) {
  function isRetryableEncounterResolutionError(error) {
    const code = String(error?.code || "").toUpperCase();
    const msg = String(error?.message || "").toLowerCase();
    return (
      code === "42P01" ||
      code === "42703" ||
      msg.includes("does not exist") ||
      msg.includes("relation") ||
      msg.includes("schema cache") ||
      msg.includes("column") ||
      msg.includes("could not find")
    );
  }

  function parseMissingColumnFromError(error) {
    const message = String(error?.message || "");
    const match =
      message.match(/Could not find the '([^']+)' column/i) ||
      message.match(/column "?([^"\s]+)"? does not exist/i);
    return match?.[1] ? String(match[1]) : null;
  }

  async function upsertEncounterResolutionRow({
    payload = {},
    eventId = null,
    userId = null,
    restaurantId = null,
    occurredAt = null,
  } = {}) {
    const p = payload || {};
    const checks = p.checks || {};
    const chosen = p.chosen || {};
    const actual = p.actual || {};

    const performanceGrade =
      p.performanceGrade ??
      p.performance_grade ??
      null;
    const chainScore =
      p.chainScore ??
      p.chain_score ??
      null;
    const chainSignal =
      p.chainSignal ??
      p.chain_signal ??
      null;
    const modeStatus =
      checks.modeStatus ??
      p.modeStatus ??
      p.mode_status ??
      null;
    const hookStatus =
      checks.hookStatus ??
      p.hookStatus ??
      p.hook_status ??
      null;
    const readCorrect =
      checks.readCorrect ??
      p.guestReadCorrect ??
      p.readCorrect ??
      p.read_correct ??
      null;
    const deliveryCorrect =
      checks.deliveryCorrect ??
      p.deliveryCorrect ??
      p.delivery_correct ??
      null;
    const actualGuestTypeNorm =
      actual.guestTypeNorm ??
      p.actualGuestTypeNorm ??
      p.actual_guest_type_norm ??
      p.actualGuestType ??
      p.actual_guest_type ??
      null;
    const chosenGuestTypeNorm =
      chosen.guestTypeNorm ??
      p.chosenGuestTypeNorm ??
      p.chosen_guest_type_norm ??
      chosen.guestType ??
      p.chosenGuestType ??
      p.chosen_guest_type ??
      null;

    const tableCandidates = [
      {
        table: "bc_encounter_resolutions_v2",
        row: {
          event_id: eventId,
          user_id: userId,
          restaurant_id: restaurantId,
          occurred_at: occurredAt,
          actual_guest_type_norm: actualGuestTypeNorm,
          chain_score: chainScore,
          is_green: performanceGrade === "green",
          is_red: performanceGrade === "red",
          read_correct: readCorrect,
          delivery_correct: deliveryCorrect,
          mode_optimal: modeStatus === "right",
          hook_optimal: hookStatus === "right",
          mode_status: modeStatus,
          hook_status: hookStatus,
          chain_signal: chainSignal,
          performance_grade: performanceGrade,
          tier: p.tier ?? null,
          encounter_number: p.encounterNumber ?? p.encounter_number ?? null,
          session_id: p.sessionId ?? p.session_id ?? null,
        },
      },
      {
        table: "bc_encounter_resolutions_v1",
        row: {
          event_id: eventId,
          user_id: userId,
          restaurant_id: restaurantId,
          occurred_at: occurredAt,
          encounter_id: p.encounterId ?? p.encounter_id ?? null,
          encounter_number: p.encounterNumber ?? p.encounter_number ?? null,
          session_id: p.sessionId ?? p.session_id ?? null,
          role: p.role ?? null,
          guest_state_actual: actualGuestTypeNorm,
          guest_read: chosenGuestTypeNorm,
          mode_selected: chosen.mode ?? p.chosenMode ?? p.chosen_mode ?? null,
          hook_selected: chosen.hook ?? p.chosenHook ?? p.chosen_hook ?? null,
          delivery_correct: deliveryCorrect,
          chain_score: chainScore,
          chain_signal: chainSignal,
          outcome: p.outcome ?? chainSignal ?? null,
          score: p.score ?? chainScore ?? null,
        },
      },
      {
        table: "bc_encounter_resolutions",
        row: {
          event_id: eventId,
          user_id: userId,
          restaurant_id: restaurantId,
          occurred_at: occurredAt,
          encounter_id: p.encounterId ?? p.encounter_id ?? null,
          encounter_number: p.encounterNumber ?? p.encounter_number ?? null,
          session_id: p.sessionId ?? p.session_id ?? null,
          role: p.role ?? null,
          guest_state_actual: actualGuestTypeNorm,
          guest_read: chosenGuestTypeNorm,
          mode_selected: chosen.mode ?? p.chosenMode ?? p.chosen_mode ?? null,
          hook_selected: chosen.hook ?? p.chosenHook ?? p.chosen_hook ?? null,
          delivery_correct: deliveryCorrect,
          chain_score: chainScore,
          chain_signal: chainSignal,
          outcome: p.outcome ?? chainSignal ?? null,
          score: p.score ?? chainScore ?? null,
        },
      },
    ];

    let lastError = null;
    for (const { table, row } of tableCandidates) {
      let candidateRow = { ...row };

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const up = await supabase
          .from(table)
          .upsert([candidateRow], { onConflict: "event_id" });
        if (!up.error) return { ok: true, table };

        lastError = up.error;
        if (!isRetryableEncounterResolutionError(up.error)) break;

        const missingColumn = parseMissingColumnFromError(up.error);
        if (!missingColumn || !(missingColumn in candidateRow)) break;

        console.warn("[BC] encounter_resolutions retry without missing column", {
          table,
          missingColumn,
        });
        delete candidateRow[missingColumn];
      }
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
      const up = await upsertEncounterResolutionRow({
        payload: payload || {},
        eventId,
        userId,
        restaurantId,
        occurredAt,
      });

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
