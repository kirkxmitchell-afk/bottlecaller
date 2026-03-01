// src/lib/handlers/handleEventLog.js
export async function handleEventLog({
  msg,
  event,
  supabase,
  getSourceCtx,
  tagSource,
}) {
  const { eventType, payload } = msg || {};
  if (!eventType) return;

  const senderCtx = getSourceCtx(event.source);
  const isFromIframe = !!event.source && event.source !== window;

  if (isFromIframe && !senderCtx) {
    console.warn("[BC] event_log ignored (no senderCtx yet)", { eventType });
    event.source?.postMessage(
      { source: "BC_MSG", v: 1, type: "event_log_ack", ok: false, error: "no_sender_ctx" },
      event.origin
    );
    return;
  }

  console.log("[BC] event_log from", tagSource(event.source), senderCtx);

  const isDemoNow =
    String(msg?.mode || "").toLowerCase() === "demo" ||
    String(payload?.mode || "").toLowerCase() === "demo" ||
    String(payload?.bcMode || "").toLowerCase() === "demo";

  if (isDemoNow) {
    event.source?.postMessage(
      { source: "BC_MSG", v: 1, type: "event_log_ack", ok: true, demo: true, eventType },
      event.origin
    );
    return;
  }

  const isDemoPayload = String(payload?.mode || "").toLowerCase() === "demo";
  if (isDemoPayload) {
    event.source?.postMessage(
      { source: "BC_MSG", v: 1, type: "event_log_ack", ok: true, demo: true, eventType },
      event.origin
    );
    return;
  }

  const userId = senderCtx?.userId || null;

  // Prefer sender-bound ctx restaurant to avoid cross-iframe contamination.
  const restaurantId = senderCtx?.restaurantId || null;

  if (
    payload?.restaurantId &&
    senderCtx?.restaurantId &&
    String(payload.restaurantId) !== String(senderCtx.restaurantId)
  ) {
    console.warn("[BC] payload rid mismatch; using senderCtx", {
      payloadRid: payload.restaurantId,
      senderRid: senderCtx.restaurantId,
    });
  }

  // If not authed, ignore
  if (!userId) return;

  // If your DB requires restaurant_id, do NOT insert without it
  if (!restaurantId) {
    console.warn("[BC] event_log skipped (no restaurant_id)", { eventType });
    event.source?.postMessage(
      { source: "BC_MSG", v: 1, type: "event_log_ack", ok: false, error: "no_restaurant_id" },
      event.origin
    );
    return;
  }

  try {
    const row = {
      event_id: payload?.eventId || crypto.randomUUID(),
      user_id: userId,
      restaurant_id: restaurantId,
      event_type: String(eventType),
      payload: payload || {},
      occurred_at: new Date().toISOString(),
    };

    if (eventType === "encounter_resolved") {
      const p = payload || {};
      console.log("[BC] about to upsert encounter_resolved payload fields", {
        v: p?.v,
        encounterId: p?.encounterId,
        sessionId: p?.sessionId,
        hasChecksKey: Object.prototype.hasOwnProperty.call(p, "checks"),
        keys: Object.keys(p || {}),
      });
    }

    console.log("[BC] upsert row", row);

    const ins = await supabase
      .from("bc_event_log")
      .upsert(row, { onConflict: "event_id" });

    if (ins.error) throw ins.error;

    if (eventType === "encounter_resolved") {
      const p = payload || {};
      const nowIso = new Date().toISOString();
      const evId = String(p.eventId || payload?.eventId || crypto.randomUUID());

      const resRow = {
        event_id: evId,
        user_id: userId,
        restaurant_id: restaurantId,
        occurred_at: p.occurredAt || p.occurred_at || nowIso,
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

      if (up.error) {
        console.warn("[BC] encounter_resolutions upsert failed", up.error);
      } else {
        console.log("[BC] encounter_resolutions upsert ✅", { event_id: evId, userId, restaurantId });
      }
    }

    event.source?.postMessage(
      { source: "BC_MSG", v: 1, type: "event_log_ack", ok: true, eventType },
      event.origin
    );
  } catch (e) {
    console.error("[BC] event_log handler failed:", e);
    try {
      event.source?.postMessage(
        { source: "BC_MSG", v: 1, type: "event_log_ack", ok: false, error: String(e?.message || e) },
        event.origin
      );
    } catch {}
  }
}