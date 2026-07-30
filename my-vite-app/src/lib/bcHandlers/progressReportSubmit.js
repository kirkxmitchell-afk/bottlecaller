import { BC_TYPES } from "../bcMessages";
import { resolveCanonicalWriteState } from "../../game/v2ProgressionAuthority.ts";

function isMissingRelationError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  return code === "42P01" || /does not exist|undefined table/i.test(message);
}

function normalizeAllowedScopeType(value, fallback = "restaurant") {
  const s = String(value || "").trim().toLowerCase();
  return s || fallback;
}

function resolveProgressionWriteOwner({
  targetUserId = null,
  waiterUserId = null,
  receiver_user_id = null,
  activeProfile = null,
  progressionOwnerUserId = null,
  progressionOwnerRestaurantId = null,
  membership = null,
  restaurantId = null,
} = {}) {
  const w = globalThis?.window;
  const userId =
    targetUserId ||
    waiterUserId ||
    receiver_user_id ||
    activeProfile?.user_id ||
    progressionOwnerUserId ||
    w?.__BC_PROGRESS_OWNER_USER_ID__ ||
    w?.__BC_ACTIVE_WAITER_USER_ID__ ||
    null;

  const resolvedRestaurantId =
    restaurantId ||
    activeProfile?.restaurant_id ||
    progressionOwnerRestaurantId ||
    w?.__BC_ACTIVE_WAITER_RESTAURANT_ID__ ||
    null;

  return { userId, restaurantId: resolvedRestaurantId };
}

async function upsertProgressReportMessage({
  supabase,
  ctx,
  scopeType,
  scopeId,
  body,
  payload,
}) {
  const baseRow = {
    scope_type: scopeType,
    scope_id: scopeId,
    restaurant_id: ctx.restaurantId,
    sender_user_id: ctx.userId,
    receiver_user_id: ctx.userId,
    sender_role: ctx.membershipRole || ctx.role || "waiter",
    type: "progress_report",
    body,
    payload,
  };

  const { data: existingRow, error: existingError } = await supabase
    .from("bc_messages_v1")
    .select("id")
    .eq("restaurant_id", ctx.restaurantId)
    .eq("sender_user_id", ctx.userId)
    .eq("receiver_user_id", ctx.userId)
    .eq("type", "progress_report")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return { ok: false, error: existingError.message || String(existingError), inserted: 0 };
  }

  if (existingRow?.id) {
    const { error: updateError } = await supabase
      .from("bc_messages_v1")
      .update(baseRow)
      .eq("id", existingRow.id);

    if (updateError) {
      return { ok: false, error: updateError.message || String(updateError), inserted: 0 };
    }

    return { ok: true, inserted: 0, updated: true };
  }

  const { error: insertError } = await supabase
    .from("bc_messages_v1")
    .insert(baseRow);

  if (insertError) {
    return { ok: false, error: insertError.message || String(insertError), inserted: 0 };
  }

  return { ok: true, inserted: 1, updated: false };
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
    difficulty: Number.isFinite(Number(p?.difficulty)) ? Math.round(Number(p.difficulty)) : null,
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

async function upsertCanonicalProgressionState({
  supabase,
  ctx,
  payload,
  authUserId = null,
}) {
  const canonicalStateRaw =
    payload?.progressionState ||
    payload?.progression_state ||
    null;

  if (!canonicalStateRaw || typeof canonicalStateRaw !== "object") {
    return { ok: false, skipped: true, reason: "missing_progression_state" };
  }

  const buildRewardsSummary = (state) => {
    const encounterEntries = Object.values(
      state?.rewards?.encounters ||
      state?.run?.scoredThisRun ||
      {}
    );
    const drillEntries = Object.values(state?.rewards?.drills || {});
    const challengeEntries = Object.values(state?.rewards?.timedChallenges || {});
    const premiumEntries = Object.values(state?.rewards?.premiumByEncounter || {});
    const sumRewardPoints = (rows) =>
      rows.reduce((sum, row) => sum + Number(row?.rewardPoints || row?.reward?.totalPoints || 0), 0);
    const roundReward = (value) => {
      const n = Number(value || 0);
      return Math.max(0, Math.round(n * 10) / 10);
    };

    return {
      encounters: {
        count: encounterEntries.length,
        totalPoints: roundReward(sumRewardPoints(encounterEntries)),
      },
      drills: {
        count: drillEntries.length,
        totalPoints: roundReward(sumRewardPoints(drillEntries)),
      },
      timedChallenges: {
        count: challengeEntries.length,
        totalPoints: roundReward(sumRewardPoints(challengeEntries)),
      },
      premium: {
        count: premiumEntries.length,
        totalPoints: roundReward(sumRewardPoints(premiumEntries)),
      },
    };
  };

  const canonicalState = {
    ...canonicalStateRaw,
    rewardsSummary:
      canonicalStateRaw?.rewardsSummary && typeof canonicalStateRaw.rewardsSummary === "object"
        ? canonicalStateRaw.rewardsSummary
        : buildRewardsSummary(canonicalStateRaw),
  };

  const session = globalThis?.appState?.session || null;
  const profile = globalThis?.appState?.profile || null;
  const { userId: progressionOwnerUserId, restaurantId: progressionOwnerRestaurantId } =
    resolveProgressionWriteOwner({
      targetUserId: payload?.targetUserId || null,
      waiterUserId: payload?.waiterUserId || null,
      receiver_user_id: payload?.receiver_user_id || null,
      activeProfile: payload?.activeProfile || null,
      progressionOwnerUserId: ctx?.progressionOwnerUserId || null,
      progressionOwnerRestaurantId: ctx?.progressionOwnerRestaurantId || null,
      membership: payload?.membership || null,
      restaurantId:
        payload?.restaurantId ||
        payload?.restaurant_id ||
        ctx?.progressionOwnerRestaurantId ||
        null,
    });

  console.log("[BC progression upsert target]", {
    authUserId: session?.user?.id || authUserId || null,
    authProfileUserId: profile?.user_id || null,
    progressionOwnerUserId,
    progressionOwnerRestaurantId,
    canonicalPoints: canonicalState?.economy?.points ?? null,
    rewardsSummary: canonicalState?.rewardsSummary ?? null,
  });

  if (!progressionOwnerUserId || !progressionOwnerRestaurantId) {
    console.warn("[BC progression upsert] missing owner identity", {
      authUserId: session?.user?.id || authUserId || null,
      authProfileUserId: profile?.user_id || null,
      progressionOwnerUserId,
      progressionOwnerRestaurantId,
      ctx,
      payload,
    });
    throw new Error("Missing waiter-owned progression target");
  }

  const { data: existingRow, error: existingError } = await supabase
    .from("bc_progression_state_v1")
    .select("canonical_state, updated_at")
    .eq("user_id", progressionOwnerUserId)
    .eq("restaurant_id", progressionOwnerRestaurantId)
    .maybeSingle();

  if (existingError && !isMissingRelationError(existingError)) {
    console.warn("[PROGRESSION STATE] existing row lookup failed", existingError);
    return { ok: false, error: existingError.message || String(existingError) };
  }

  if (existingError && isMissingRelationError(existingError)) {
    console.warn("[PROGRESSION STATE] dedicated table missing, using snapshot payload fallback");
    return { ok: false, skipped: true, reason: "missing_table" };
  }

  const writePlan = resolveCanonicalWriteState({
    serverRow: existingRow || null,
    incomingState: canonicalState,
  });

  const nextCanonicalState = {
    ...writePlan.state,
    rewardsSummary:
      writePlan.state?.rewardsSummary && typeof writePlan.state.rewardsSummary === "object"
        ? writePlan.state.rewardsSummary
        : buildRewardsSummary(writePlan.state),
    basedOnUpdatedAt:
      Number(writePlan.state?.basedOnUpdatedAt || canonicalState?.basedOnUpdatedAt || 0) ||
      (existingRow?.updated_at ? Date.parse(String(existingRow.updated_at)) : 0) ||
      0,
    capturedAt: Date.now(),
  };

  const row = {
    user_id: progressionOwnerUserId,
    restaurant_id: progressionOwnerRestaurantId,
    scope_id: ctx.scopeId || null,
    canonical_state: nextCanonicalState,
    source_type: "progress_report",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("bc_progression_state_v1")
    .upsert(row, { onConflict: "user_id,restaurant_id" });

  if (error) {
    if (isMissingRelationError(error)) {
      console.warn("[PROGRESSION STATE] dedicated table missing, using snapshot payload fallback");
      return { ok: false, skipped: true, reason: "missing_table" };
    }
    console.warn("[PROGRESSION STATE] upsert failed", error);
    return { ok: false, error: error.message || String(error) };
  }

  return {
    ok: true,
    merged: !!writePlan.merged,
    staleBaseMerged: !!writePlan.rejectedStale,
    canonicalState: nextCanonicalState,
  };
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
      const nextPayload = {
        ...(payload || {}),
        updatedAt: Date.now()
      };

      const canonicalOnly = nextPayload?.canonicalOnly === true;
      const writeResult = canonicalOnly
        ? { ok: true, inserted: 0, updated: false, skipped: true }
        : await upsertProgressReportMessage({
            supabase,
            ctx,
            scopeType,
            scopeId,
            body,
            payload: nextPayload,
          });

      if (!writeResult?.ok) {
        reply(replyType, {
          reqId,
          ok: false,
          inserted: 0,
          error: writeResult?.error || "progress_report_write_failed",
        });
        return;
      }

      const inserted = Number(writeResult?.inserted || 0);

      const progressionStateResult = await upsertCanonicalProgressionState({
        supabase,
        ctx,
        payload: nextPayload,
        authUserId: authed,
      });

      const snapshotResult = canonicalOnly
        ? { ok: true, skipped: true }
        : await insertSkillSnapshotAndDrillEffect({
            supabase,
            ctx,
            payload,
          });

      reply(replyType, {
        reqId,
        ok: true,
        inserted,
        updated: !!writeResult?.updated,
        serverSkillSnapshot:
          nextPayload?.skills && typeof nextPayload.skills === "object"
            ? {
                read: Number(nextPayload.skills.read || 0),
                framing: Number(nextPayload.skills.framing || 0),
                delivery: Number(nextPayload.skills.delivery || 0),
                recovery: Number(nextPayload.skills.recovery || 0),
                closing: Number(nextPayload.skills.closing || 0),
              }
            : null,
        serverProgressionState:
          nextPayload?.progressionState && typeof nextPayload.progressionState === "object"
            ? nextPayload.progressionState
            : null,
        syncedEncounterNumber: nextPayload?.encounterNumber ?? null,
        syncedAt: nextPayload?.updatedAt ?? Date.now(),
        progressionStateOk: !!progressionStateResult?.ok,
        progressionStateSkipped: !!progressionStateResult?.skipped,
        progressionStateError:
          progressionStateResult?.ok || progressionStateResult?.skipped
            ? null
            : (progressionStateResult?.error || "progression_state_write_failed"),
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
