import { BC_TYPES } from "../bcMessages";

function normalizeAllowedScopeType(value, fallback = "restaurant") {
  const s = String(value || "").trim().toLowerCase();
  return s || fallback;
}

async function insertSkillSnapshotAndDrillEffect({
  supabase,
  ctx,
  payload,
}) {
  const p = payload || {};
  const skills = p?.skills || {};

  const { error: snapError } = await supabase.from("bc_skill_snapshots_v1").insert({
    user_id: ctx.userId,
    restaurant_id: ctx.restaurantId,
    scope_id: ctx.scopeId || null,

    encounter_number: p?.encounterNumber ?? null,
    guest_state: p?.guestStateActual ?? null,
    difficulty: p?.difficulty ?? null,
    chain_signal: p?.chainSignal ?? null,
    chain_score: p?.chainScore ?? null,

    read_pct: skills.read ?? 0,
    framing_pct: skills.framing ?? 0,
    delivery_pct: skills.delivery ?? 0,
    recovery_pct: skills.recovery ?? 0,
    closing_pct: skills.closing ?? 0,

    strongest_skill: p?.strongestSkill ?? null,
    weakest_skill: p?.weakestSkill ?? null,

    payload: p,
  });

  if (snapError) {
    console.warn("[SNAPSHOT] parent insert failed", snapError);
    return { ok: false, error: snapError.message || String(snapError) };
  }

  console.log("[SNAPSHOT] parent insert success ✅", {
    userId: ctx.userId,
    restaurantId: ctx.restaurantId,
    encounterNumber: p?.encounterNumber,
  });

  try {
    const { data: recentDrill, error: recentDrillError } = await supabase
      .from("bc_drill_runs_v1")
      .select("id, focus, completed_at, effectiveness_delta")
      .eq("user_id", ctx.userId)
      .eq("restaurant_id", ctx.restaurantId)
      .eq("completed", true)
      .is("effectiveness_delta", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentDrillError || !recentDrill?.id || !recentDrill?.focus) {
      return { ok: true };
    }

    const focusMap = {
      read: "read",
      frame: "framing",
      framing: "framing",
      delivery: "delivery",
      recovery: "recovery",
      closing: "closing",
    };

    const skillKey = focusMap[String(recentDrill.focus || "").toLowerCase()] || null;
    const currentSkillValue = skillKey ? Number(skills?.[skillKey] || 0) : null;

    if (!skillKey || currentSkillValue == null) {
      return { ok: true };
    }

    const { data: beforeSnap, error: beforeSnapError } = await supabase
      .from("bc_skill_snapshots_v1")
      .select("read_pct, framing_pct, delivery_pct, recovery_pct, closing_pct, created_at")
      .eq("user_id", ctx.userId)
      .eq("restaurant_id", ctx.restaurantId)
      .lt("created_at", recentDrill.completed_at)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (beforeSnapError || !beforeSnap) {
      return { ok: true };
    }

    const beforeMap = {
      read: Number(beforeSnap.read_pct || 0),
      framing: Number(beforeSnap.framing_pct || 0),
      delivery: Number(beforeSnap.delivery_pct || 0),
      recovery: Number(beforeSnap.recovery_pct || 0),
      closing: Number(beforeSnap.closing_pct || 0),
    };

    const beforeValue = Number(beforeMap[skillKey] || 0);
    const delta = currentSkillValue - beforeValue;

    const note =
      delta > 0
        ? `${skillKey} improved +${delta}% after ${recentDrill.focus} drill`
        : delta < 0
          ? `${skillKey} changed ${delta}% after ${recentDrill.focus} drill`
          : `${skillKey} stayed flat after ${recentDrill.focus} drill`;

    const { error: effError } = await supabase
      .from("bc_drill_runs_v1")
      .update({
        effectiveness_delta: delta,
        effectiveness_note: note,
      })
      .eq("id", recentDrill.id);

    if (effError) {
      console.warn("[DRILL EFFECT] update failed", effError);
      return { ok: true };
    }

    console.log("[DRILL EFFECT] updated ✅", {
      drillRunId: recentDrill.id,
      delta,
      note,
    });

    const { error: insightMsgError } = await supabase.from("bc_messages_v1").insert({
      scope_type: "restaurant",
      scope_id: ctx.restaurantId,
      restaurant_id: ctx.restaurantId,
      sender_user_id: ctx.userId,
      receiver_user_id: ctx.userId,
      sender_role: "system",
      type: "drill_effectiveness",
      body: note,
      payload: {
        drillRunId: recentDrill.id,
        focus: recentDrill.focus,
        delta,
        skillKey,
      },
    });

    if (insightMsgError) {
      console.warn("[DRILL EFFECT] insight message insert failed", insightMsgError);
    }
  } catch (e) {
    console.warn("[DRILL EFFECT] exception", e);
  }

  return { ok: true };
}

export function makeProgressReportSubmitHandler({
  supabase,
  getSourceCtx,
  isDemoMsg,
  rejectIfEpochMismatch,
  getSenderCtxOrReject,
  getLiveAuthOrNull,
}) {
  if (!supabase) throw new Error("makeProgressReportSubmitHandler: supabase required");
  if (!getSourceCtx) throw new Error("makeProgressReportSubmitHandler: getSourceCtx required");
  if (!isDemoMsg) throw new Error("makeProgressReportSubmitHandler: isDemoMsg required");
  if (!rejectIfEpochMismatch) throw new Error("makeProgressReportSubmitHandler: rejectIfEpochMismatch required");
  if (!getSenderCtxOrReject) throw new Error("makeProgressReportSubmitHandler: getSenderCtxOrReject required");
  if (!getLiveAuthOrNull) throw new Error("makeProgressReportSubmitHandler: getLiveAuthOrNull required");

  return async ({ msg, event, reply }) => {
    const reqId = msg?.reqId || null;
    const replyType = BC_TYPES.PROGRESS_REPORT_SUBMIT_RESULT;
    const senderCtx = getSourceCtx(event.source);

    if (isDemoMsg(msg, senderCtx)) {
      reply(replyType, {
        reqId,
        ok: true,
        demo: true,
        inserted: 0,
      });
      return;
    }

    if (rejectIfEpochMismatch(event, msg, replyType, { reqId, inserted: 0 })) {
      return;
    }

    const ctx = getSenderCtxOrReject(
      event,
      senderCtx,
      replyType,
      { reqId, inserted: 0 },
      {
        requireRestaurant: true,
        allowedRoles: ["waiter", "single_manager", "group_manager", "enterpriser"],
      }
    );
    if (!ctx) return;

    const liveAuth = await getLiveAuthOrNull();
    const authed = liveAuth?.userId || null;

    if (!authed) {
      reply(replyType, { reqId, ok: false, inserted: 0, error: "no_session" });
      return;
    }

    if (String(authed) !== String(ctx.userId)) {
      reply(replyType, { reqId, ok: false, inserted: 0, error: "forbidden_user" });
      return;
    }

    const scopeType = normalizeAllowedScopeType(
      msg?.scope_type || ctx.scopeType || "restaurant",
      "restaurant"
    );

    const scopeId =
      msg?.scope_id ||
      ctx.scopeId ||
      ctx.restaurantId;

    const body = String(msg?.body || "Progress report").slice(0, 2000);
    const payload = msg?.payload ?? null;

    try {
      const { data, error } = await supabase.rpc("bc_send_progress_report_v1", {
        p_scope_type: scopeType,
        p_scope_id: scopeId,
        p_restaurant_id: ctx.restaurantId,
        p_body: body,
        p_payload: payload,
      });

      if (error) {
        reply(replyType, {
          reqId,
          ok: false,
          inserted: 0,
          error: error.message || String(error),
        });
        return;
      }

      const inserted = Number(data || 0);

      const snapshotResult = await insertSkillSnapshotAndDrillEffect({
        supabase,
        ctx,
        payload,
      });

      reply(replyType, {
        reqId,
        ok: true,
        inserted,
        snapshotOk: !!snapshotResult?.ok,
        snapshotError: snapshotResult?.ok ? null : (snapshotResult?.error || "snapshot_insert_failed"),
      });
    } catch (e) {
      reply(replyType, {
        reqId,
        ok: false,
        inserted: 0,
        error: e?.message || String(e),
      });
    }
  };
}
