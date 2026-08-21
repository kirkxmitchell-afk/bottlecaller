// Pure V2 progression-authority helpers shared by iframe hydrate, parent upsert, and tests.

export type V2ProgressionSnapshot = {
  encountersTotal: number;
  last10Count: number;
  last10Greens: number;
  last10Reds: number;
  anyRedT2Plus: boolean;
  pivotsTaken: number;
  pivotsSuccess: number;
};

export type V2AuthorityAttempt = {
  key: string;
  encounterId?: string | null;
  encounterTitle?: string;
  tier?: number;
  outcome?: string;
  authorityDelta?: number;
  apAfter?: number;
  isGreen?: boolean;
  isRed?: boolean;
  pivotTaken?: boolean;
  pivotSuccess?: boolean;
  difficultyMode?: string;
  completedAt?: number;
  [key: string]: unknown;
};

export type V2AuthorityState = {
  v?: number;
  source?: string;
  totalAP: number;
  tierToServe: number;
  apTierUnlocked: number;
  rulesTierToServe: number;
  attempts: V2AuthorityAttempt[];
  progressionSnapshot: V2ProgressionSnapshot;
  updatedAt?: number;
  [key: string]: unknown;
};

function asObject(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" ? (value as Record<string, any>) : null;
}

function firstFinite(...values: unknown[]): number | null {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function applySignedAuthorityDelta(totalAP: unknown, authorityDelta: unknown): number {
  const current = firstFinite(totalAP, 0) || 0;
  const delta = firstFinite(authorityDelta, 0) || 0;
  return Math.max(0, Math.round(current + delta));
}

export function buildV2ProgressionSnapshotFromAttempts(
  attempts: V2AuthorityAttempt[] | null | undefined,
): V2ProgressionSnapshot {
  const rows = Array.isArray(attempts) ? attempts : [];
  const last10 = rows.slice(-10);
  return {
    encountersTotal: rows.length,
    last10Count: last10.length,
    last10Greens: last10.filter((item) => !!item.isGreen).length,
    last10Reds: last10.filter((item) => !!item.isRed).length,
    anyRedT2Plus: rows.some((item) => Number(item?.tier || 1) >= 2 && !!item.isRed),
    pivotsTaken: rows.filter((item) => !!item.pivotTaken).length,
    pivotsSuccess: rows.filter((item) => !!item.pivotSuccess).length,
  };
}

export function mergeV2AttemptLists(
  primary: V2AuthorityAttempt[] | null | undefined,
  secondary: V2AuthorityAttempt[] | null | undefined,
  limit = 100,
): V2AuthorityAttempt[] {
  const byKey = new Map<string, V2AuthorityAttempt>();
  const push = (item: V2AuthorityAttempt | null | undefined, index: number) => {
    if (!item || typeof item !== "object") return;
    const key = String(item.key || `attempt_${index}_${item.encounterId || "unknown"}`);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { ...item, key });
      return;
    }
    const prevAt = Number(prev.completedAt || 0);
    const nextAt = Number(item.completedAt || 0);
    byKey.set(key, nextAt >= prevAt ? { ...prev, ...item, key } : { ...item, ...prev, key });
  };

  (Array.isArray(primary) ? primary : []).forEach((item, index) => push(item, index));
  (Array.isArray(secondary) ? secondary : []).forEach((item, index) => push(item, index + 10_000));

  return Array.from(byKey.values())
    .sort((a, b) => Number(a.completedAt || 0) - Number(b.completedAt || 0))
    .slice(-Math.max(1, limit));
}

export function authorityRichness(state: Partial<V2AuthorityState> | null | undefined) {
  const attempts = Array.isArray(state?.attempts) ? state!.attempts!.length : 0;
  const snapshotTotal = Number(state?.progressionSnapshot?.encountersTotal || 0);
  const latestAttemptAt = (Array.isArray(state?.attempts) ? state!.attempts! : []).reduce(
    (latest, attempt) => Math.max(latest, Number(attempt?.completedAt || 0)),
    0,
  );
  return {
    attempts,
    encountersTotal: Math.max(snapshotTotal, attempts),
    totalAP: Math.max(0, Number(state?.totalAP || 0)),
    updatedAt: Math.max(Number(state?.updatedAt || 0), latestAttemptAt),
  };
}

/**
 * Prefer authoritative/server fields only when they are at least as rich as local.
 * Never prefer an AP-only/empty-attempt server payload over richer local history.
 */
export function shouldPreferAuthoritativeV2Authority(
  authoritative: Partial<V2AuthorityState> | null | undefined,
  localState: Partial<V2AuthorityState> | null | undefined,
): boolean {
  if (!authoritative) return false;
  const auth = authorityRichness(authoritative);
  const local = authorityRichness(localState || {});

  if (auth.encountersTotal > local.encountersTotal) return true;
  if (auth.attempts > local.attempts) return true;
  if (
    auth.updatedAt > local.updatedAt &&
    auth.encountersTotal >= local.encountersTotal &&
    auth.attempts >= local.attempts
  ) {
    return true;
  }
  return false;
}

export function mergeV2ProgressionAuthorityStates(
  authoritative: Partial<V2AuthorityState> | null | undefined,
  localState: Partial<V2AuthorityState> | null | undefined,
): V2AuthorityState {
  const local = asObject(localState) || {};
  const auth = asObject(authoritative) || {};
  const preferAuth = shouldPreferAuthoritativeV2Authority(auth, local);
  const base = preferAuth ? { ...local, ...auth } : { ...auth, ...local };
  const attempts = mergeV2AttemptLists(
    Array.isArray(local.attempts) ? local.attempts : [],
    Array.isArray(auth.attempts) ? auth.attempts : [],
  );
  const snapshotFromAttempts = buildV2ProgressionSnapshotFromAttempts(attempts);
  const preferredSnapshot = preferAuth
    ? auth.progressionSnapshot || local.progressionSnapshot
    : local.progressionSnapshot || auth.progressionSnapshot;
  const progressionSnapshot =
    attempts.length > 0
      ? snapshotFromAttempts
      : preferredSnapshot && typeof preferredSnapshot === "object"
        ? preferredSnapshot
        : snapshotFromAttempts;

  const totalAP = Math.max(
    0,
    Math.round(
      firstFinite(
        preferAuth ? auth.totalAP : local.totalAP,
        local.totalAP,
        auth.totalAP,
        0,
      ) || 0,
    ),
  );
  const apTierUnlocked = getV2TierUnlockedByAP(totalAP);
  const rulesTierToServe = Math.max(1, Number(base.rulesTierToServe || 1) || 1);
  const tierToServe = Math.max(
    1,
    Math.min(apTierUnlocked, rulesTierToServe, Number(base.tierToServe || 1) || 1),
  );

  return {
    v: 1,
    source: "v2_harness",
    ...base,
    totalAP,
    attempts,
    progressionSnapshot,
    updatedAt: Math.max(Number(local.updatedAt || 0), Number(auth.updatedAt || 0)),
    tierToServe,
    apTierUnlocked,
    rulesTierToServe,
  };
}

export function mergeBottleRewardStates(
  serverState: Record<string, any> | null | undefined,
  incomingState: Record<string, any> | null | undefined,
): Record<string, any> | null {
  const server = asObject(serverState);
  const incoming = asObject(incomingState);
  if (!server && !incoming) return null;

  const serverRewards = Array.isArray(server?.rewards) ? server.rewards : [];
  const incomingRewards = Array.isArray(incoming?.rewards) ? incoming.rewards : [];
  const byId = new Map<string, Record<string, any>>();

  for (const reward of serverRewards) {
    const id = String(reward?.id || "");
    if (id) byId.set(id, { ...reward });
  }
  for (const reward of incomingRewards) {
    const id = String(reward?.id || "");
    if (!id) continue;
    const previous = byId.get(id);
    const nextClaimed = !!reward?.claimed;
    const prevClaimed = !!previous?.claimed;
    const nextClaimedAt = Number(reward?.claimedAt || 0);
    const prevClaimedAt = Number(previous?.claimedAt || 0);
    if (
      !previous ||
      (nextClaimed && !prevClaimed) ||
      (nextClaimed && prevClaimed && nextClaimedAt >= prevClaimedAt)
    ) {
      byId.set(id, { ...(previous || {}), ...reward });
    }
  }

  const serverUpdatedAt = Number(server?.updatedAt || 0);
  const incomingUpdatedAt = Number(incoming?.updatedAt || 0);
  const preferred = incomingUpdatedAt >= serverUpdatedAt ? incoming : server;
  const totalAP = Math.max(0, Math.round(Number(preferred?.totalAP || 0)));

  return {
    totalAP,
    tierUnlocked: getV2TierUnlockedByAP(totalAP),
    updatedAt: Math.max(serverUpdatedAt, incomingUpdatedAt),
    rewards: Array.from(byId.values()),
  };
}

function countAcceptedGodotGreetings(events: unknown): { accepted: number; samples: number } {
  const rows = Array.isArray(events) ? events : [];
  let accepted = 0;
  rows.forEach((row) => {
    const rating = String(row?.greetingRating || row?.greeting_rating || "").trim().toLowerCase();
    if (
      row?.accepted === true ||
      row?.recovered === true ||
      rating === "strong" ||
      rating === "acceptable" ||
      rating === "good" ||
      rating === "excellent"
    ) {
      accepted += 1;
    }
  });
  return { accepted, samples: rows.length };
}

function getGodotGuestOutcomes(payload: Record<string, any>): Record<string, any>[] {
  const rows = payload.guestOutcomes ?? payload.guest_outcomes;
  return (Array.isArray(rows) ? rows : [])
    .map((row) => asObject(row))
    .filter((row): row is Record<string, any> => !!row);
}

function isLostGodotGuestOutcome(row: Record<string, any>): boolean {
  const completionKind = String(row.completionKind || row.completion_kind || "").toLowerCase();
  if (row.paid === true || completionKind === "paid_completion") return false;
  return (
    row.walkedOut === true ||
    row.walked_out === true ||
    completionKind.includes("walkout") ||
    String(row.outcome || "").toLowerCase() === "failure"
  );
}

export function accumulateGodotShiftStats(
  previous: Record<string, any> | null | undefined,
  payload: Record<string, any> | null | undefined,
  extras: Record<string, any> = {},
): Record<string, any> {
  const prev = asObject(previous) || {};
  const p = asObject(payload) || {};
  const extra = asObject(extras) || {};
  const shiftRunId = String(
    extra.shiftRunId || p.shiftRunId || p.lastShiftRunId || prev.lastShiftRunId || "",
  ).trim();
  const duplicate = !!(shiftRunId && String(prev.lastShiftRunId || "") === shiftRunId);

  const guestOutcomes = getGodotGuestOutcomes(p);
  const completedGuests = Math.max(
    0,
    Math.round(firstFinite(p.guestServices, p.guestsServed, p.completedGuestServices, 0) || 0),
  );
  const aggregateLost = Math.max(
    0,
    Math.round(firstFinite(p.walkAways, p.guestsLost, p.walk_aways, 0) || 0),
  );
  const explicitServed = firstFinite(p.guestsServed, p.guests_served);
  const lost = guestOutcomes.length
    ? guestOutcomes.filter(isLostGodotGuestOutcome).length
    : aggregateLost;
  const served = guestOutcomes.length
    ? guestOutcomes.length - lost
    : Math.max(
        0,
        Math.round(explicitServed ?? Math.max(0, completedGuests - lost)),
      );
  const wineSales = Math.max(
    0,
    Math.round(firstFinite(p.wineSales, p.bottlesSold, 0) || 0),
  );
  const wineOffers = Math.max(
    0,
    Math.round(firstFinite(p.wineOffers, p.bottlesAttempted, wineSales, 0) || 0),
  );
  const greetings = countAcceptedGodotGreetings(p.interactionAuthorityEvents);
  const opDelta = firstFinite(
    p.operationalAuthorityDelta,
    p.authorityDeltaTotal,
    p.shiftScore,
    extra.operationalAuthorityDelta,
  );
  const prevDeltas = Array.isArray(prev.authorityDeltas) ? prev.authorityDeltas.map(Number).filter(Number.isFinite) : [];
  const authorityDeltas = duplicate
    ? prevDeltas
    : (opDelta != null ? [...prevDeltas, opDelta].slice(-50) : prevDeltas);
  const elapsedShiftTime = firstFinite(extra.elapsedShiftTime, p.elapsedShiftTime, p.elapsed_shift_time);
  const avgTimeSellingBottleSec =
    wineSales > 0 && elapsedShiftTime != null ? elapsedShiftTime / wineSales : null;

  return {
    ...prev,
    coinBalance: Math.max(
      0,
      firstFinite(extra.coinBalance, p.coinBalance, p.coins, prev.coinBalance, 0) || 0,
    ),
    lastShiftRunId: shiftRunId || prev.lastShiftRunId || null,
    lastShiftCompletedAt: extra.lastShiftCompletedAt || Date.now(),
    elapsedShiftTime: elapsedShiftTime ?? prev.elapsedShiftTime ?? null,
    speedPct: firstFinite(extra.speedPct, p.speedPct, prev.speedPct),
    bottleMeter: firstFinite(p.bottleMeter, p.bottlesSold, prev.bottleMeter),
    bottleMeterMax: firstFinite(p.bottleMeterMax, p.bottleTarget, prev.bottleMeterMax),
    guestServices: completedGuests,
    servedGuestServices: served,
    walkAways: lost,
    guestOutcomes,
    wineSales,
    wineOffers,
    foodOffers: Math.max(0, Math.round(firstFinite(p.foodOffers, 0) || 0)),
    lastWineStreak: wineSales,
    lastOperationalAuthorityDelta: opDelta,
    avgTimeSellingBottleSec,
    guestsServed: Number(prev.guestsServed || 0) + (duplicate ? 0 : served),
    guestsLost: Number(prev.guestsLost || 0) + (duplicate ? 0 : lost),
    bottlesSold: Number(prev.bottlesSold || 0) + (duplicate ? 0 : wineSales),
    bottlesAttempted: Number(prev.bottlesAttempted || 0) + (duplicate ? 0 : wineOffers),
    shiftsCompleted: Number(prev.shiftsCompleted || 0) + (duplicate ? 0 : 1),
    greetingAcceptedCount: Number(prev.greetingAcceptedCount || 0) + (duplicate ? 0 : greetings.accepted),
    greetingSampleCount: Number(prev.greetingSampleCount || 0) + (duplicate ? 0 : greetings.samples),
    authorityDeltas,
  };
}

export function mergeGodotShiftCanonical(
  serverShift: Record<string, any> | null | undefined,
  incomingShift: Record<string, any> | null | undefined,
): Record<string, any> {
  const server = asObject(serverShift) || {};
  const incoming = asObject(incomingShift) || {};
  if (!Object.keys(server).length) return { ...incoming };
  if (!Object.keys(incoming).length) return { ...server };

  const incomingNewer =
    Number(incoming.lastShiftCompletedAt || 0) >= Number(server.lastShiftCompletedAt || 0);
  const newer = incomingNewer ? incoming : server;
  const older = incomingNewer ? server : incoming;
  const sameRun = !!(
    incoming.lastShiftRunId &&
    String(incoming.lastShiftRunId) === String(server.lastShiftRunId || "")
  );
  const mergeLifetime = (lifetimeKey: string, lastShiftKey: string) => {
    const serverLife = Number(server[lifetimeKey] || 0);
    const incomingLife = Number(incoming[lifetimeKey] || 0);
    if (sameRun) return Math.max(serverLife, incomingLife);
    const fromLastShift = Number(incoming[lastShiftKey] || 0);
    return Math.max(serverLife + fromLastShift, incomingLife, serverLife);
  };
  const mergeDeltas = [
    ...(Array.isArray(server.authorityDeltas) ? server.authorityDeltas : []),
    ...(Array.isArray(incoming.authorityDeltas) ? incoming.authorityDeltas : []),
  ]
    .map(Number)
    .filter(Number.isFinite)
    .slice(-50);

  return {
    ...older,
    ...newer,
    guestsServed: mergeLifetime("guestsServed", "servedGuestServices"),
    guestsLost: mergeLifetime("guestsLost", "walkAways"),
    bottlesSold: mergeLifetime("bottlesSold", "wineSales"),
    bottlesAttempted: mergeLifetime("bottlesAttempted", "wineOffers"),
    shiftsCompleted: sameRun
      ? Math.max(Number(server.shiftsCompleted || 0), Number(incoming.shiftsCompleted || 0))
      : Math.max(
          Number(server.shiftsCompleted || 0) + (incoming.lastShiftRunId ? 1 : 0),
          Number(incoming.shiftsCompleted || 0),
          Number(server.shiftsCompleted || 0),
        ),
    greetingAcceptedCount: Math.max(
      Number(server.greetingAcceptedCount || 0),
      Number(incoming.greetingAcceptedCount || 0),
    ),
    greetingSampleCount: Math.max(
      Number(server.greetingSampleCount || 0),
      Number(incoming.greetingSampleCount || 0),
    ),
    authorityDeltas: mergeDeltas.length ? mergeDeltas : (newer.authorityDeltas || older.authorityDeltas || []),
    coinBalance: Math.max(Number(server.coinBalance || 0), Number(incoming.coinBalance || 0)),
  };
}

export function buildGodotShiftEncounterDrafts(payload: Record<string, any> | null | undefined = {}): Array<Record<string, any>> {
  const p = asObject(payload) || {};
  const shiftRunId = String(p.shiftRunId || p.lastShiftRunId || "").trim() || `godot_${Date.now()}`;
  const guestOutcomes = getGodotGuestOutcomes(p);
  if (guestOutcomes.length) {
    return guestOutcomes.map((row, index) => {
      const lost = isLostGodotGuestOutcome(row);
      const rawGrade = String(row.performanceGrade || row.performance_grade || "").toUpperCase();
      const performanceGrade = /^[A-F]$/.test(rawGrade) ? rawGrade : lost ? "F" : "C";
      const rawSignal = String(row.chainSignal || row.chain_signal || "").toLowerCase();
      const chainSignal = ["green", "yellow", "red"].includes(rawSignal)
        ? rawSignal
        : lost
          ? "red"
          : ["A", "B"].includes(performanceGrade)
            ? "green"
            : "yellow";
      const suppliedOutcome = String(row.outcome || "").toLowerCase();
      const outcome = suppliedOutcome || (
        lost
          ? "failure"
          : performanceGrade === "A"
            ? "premium_success"
            : performanceGrade === "B"
              ? "standard_success"
              : "weak_success"
      );
      const guestId = String(row.guestId || row.guest_id || "guest").trim() || "guest";
      const serviceId = String(
        row.serviceId || row.service_id || `${row.guestIndex ?? row.guest_index ?? index}:${guestId}`,
      );
      const encounterId = String(
        row.v2EncounterId ||
        row.v2_encounter_id ||
        row.encounterId ||
        row.encounter_id ||
        `godot_shift_guest_${guestId}`,
      );
      const bottleServedValue = row.bottleServed ?? row.bottle_served ?? row.wineSold ?? row.wine_sold;

      return {
        eventId: `${shiftRunId}:guest:${serviceId}`,
        encounterId,
        performanceGrade,
        chainSignal,
        isGreen: chainSignal === "green",
        isRed: chainSignal === "red",
        outcome,
        mode: String(row.mode || row.difficultyMode || "premium"),
        bottleServed: typeof bottleServedValue === "boolean" ? bottleServedValue : null,
        reflection: {
          ...row,
          source: "godot_shift",
          kind: String(row.completionKind || row.completion_kind || (lost ? "walk_away" : "guest_served")),
          shiftRunId,
        },
      };
    });
  }

  const completedGuests = Math.max(
    0,
    Math.round(firstFinite(p.guestServices, p.guestsServed, p.completedGuestServices, 0) || 0),
  );
  const lost = Math.max(
    0,
    Math.round(firstFinite(p.walkAways, p.guestsLost, p.walk_aways, 0) || 0),
  );
  const explicitServed = firstFinite(p.guestsServed, p.guests_served);
  const served = Math.max(
    0,
    Math.round(explicitServed ?? Math.max(0, completedGuests - lost)),
  );
  const drafts: Array<Record<string, any>> = [];
  for (let i = 0; i < served; i += 1) {
    drafts.push({
      eventId: `${shiftRunId}:served:${i}`,
      encounterId: `godot_shift_served_${shiftRunId}_${i}`,
      performanceGrade: "B",
      chainSignal: "green",
      isGreen: true,
      isRed: false,
      outcome: "standard_success",
      mode: "premium",
      bottleServed: null,
      reflection: { source: "godot_shift", kind: "guest_served", shiftRunId },
    });
  }
  for (let i = 0; i < lost; i += 1) {
    drafts.push({
      eventId: `${shiftRunId}:lost:${i}`,
      encounterId: `godot_shift_lost_${shiftRunId}_${i}`,
      performanceGrade: "F",
      chainSignal: "red",
      isGreen: false,
      isRed: true,
      outcome: "failure",
      mode: "premium",
      bottleServed: false,
      reflection: { source: "godot_shift", kind: "walk_away", shiftRunId },
    });
  }
  return drafts;
}

export function mergeCanonicalProgressionState(
  serverState: Record<string, any> | null | undefined,
  incomingState: Record<string, any> | null | undefined,
): Record<string, any> {
  const server = asObject(serverState) || {};
  const incoming = asObject(incomingState) || {};
  if (!Object.keys(server).length) return { ...incoming };
  if (!Object.keys(incoming).length) return { ...server };

  const serverAuthority = asObject(server.v2?.authority) || asObject(server.authority) || {};
  const incomingAuthority = asObject(incoming.v2?.authority) || asObject(incoming.authority) || {};
  const mergedAuthority = mergeV2ProgressionAuthorityStates(serverAuthority, incomingAuthority);
  const preferIncoming = shouldPreferAuthoritativeV2Authority(incomingAuthority, serverAuthority);
  const mergedBottleRewards = mergeBottleRewardStates(
    asObject(server.v2)?.bottleRewards || asObject(server.bottleRewards),
    asObject(incoming.v2)?.bottleRewards || asObject(incoming.bottleRewards),
  );
  const synchronizedBottleRewards = mergedBottleRewards
    ? {
        ...mergedBottleRewards,
        totalAP: mergedAuthority.totalAP,
        tierUnlocked: getV2TierUnlockedByAP(mergedAuthority.totalAP),
      }
    : null;

  const merged = {
    ...server,
    ...incoming,
    economy: {
      ...(asObject(server.economy) || {}),
      ...(asObject(incoming.economy) || {}),
      authorityPoints: mergedAuthority.totalAP,
      ap: mergedAuthority.totalAP,
      points: Math.max(
        Number(server.economy?.points || 0),
        Number(incoming.economy?.points || 0),
        Number(mergedAuthority.progressionSnapshot?.encountersTotal || 0),
      ),
      tier: mergedAuthority.tierToServe,
    },
    authority: {
      ...(asObject(server.authority) || {}),
      ...(asObject(incoming.authority) || {}),
      ...mergedAuthority,
      authorityPoints: mergedAuthority.totalAP,
      tierToServe: mergedAuthority.tierToServe,
      apTierUnlocked: mergedAuthority.apTierUnlocked,
      rulesTierToServe: mergedAuthority.rulesTierToServe,
      progressionSnapshot: mergedAuthority.progressionSnapshot,
    },
    rewards: {
      ...(asObject(server.rewards) || {}),
      ...(asObject(incoming.rewards) || {}),
      v2: {
        ...((asObject(server.rewards)?.v2 as object) || {}),
        ...((asObject(incoming.rewards)?.v2 as object) || {}),
        totalAP: mergedAuthority.totalAP,
        tierToServe: mergedAuthority.tierToServe,
        attempts: mergedAuthority.attempts,
      },
    },
    v2: {
      ...(asObject(server.v2) || {}),
      ...(asObject(incoming.v2) || {}),
      authority: mergedAuthority,
      ...(synchronizedBottleRewards ? { bottleRewards: synchronizedBottleRewards } : {}),
      latestSnapshot: preferIncoming
        ? incoming.v2?.latestSnapshot || server.v2?.latestSnapshot || null
        : server.v2?.latestSnapshot || incoming.v2?.latestSnapshot || null,
    },
    ...(synchronizedBottleRewards ? { bottleRewards: synchronizedBottleRewards } : {}),
    // Preserve long-term skill bank across merges; bank writes are applied server-side.
    skills: {
      ...(asObject(server.skills) || {}),
      ...(asObject(incoming.skills) || {}),
      bank:
        asObject(incoming.skills)?.bank ||
        asObject(server.skills)?.bank ||
        null,
      bankMeta:
        asObject(incoming.skills)?.bankMeta ||
        asObject(server.skills)?.bankMeta ||
        null,
      measurements:
        asObject(incoming.skills)?.measurements ||
        asObject(server.skills)?.measurements ||
        null,
    },
    godotShift: mergeGodotShiftCanonical(asObject(server.godotShift), asObject(incoming.godotShift)),
    capturedAt: Math.max(Number(server.capturedAt || 0), Number(incoming.capturedAt || 0), Date.now()),
    basedOnUpdatedAt:
      firstFinite(incoming.basedOnUpdatedAt, server.basedOnUpdatedAt, server.updatedAt, 0) || 0,
  };

  return merged;
}

export function shouldRejectStaleCanonicalWrite({
  serverUpdatedAtMs,
  clientBasedOnUpdatedAtMs,
}: {
  serverUpdatedAtMs: number | null | undefined;
  clientBasedOnUpdatedAtMs: number | null | undefined;
}): boolean {
  const serverAt = Number(serverUpdatedAtMs || 0);
  const basedOn = Number(clientBasedOnUpdatedAtMs || 0);
  if (!serverAt || !basedOn) return false;
  return serverAt > basedOn;
}

export function resolveCanonicalWriteState({
  serverRow,
  incomingState,
}: {
  serverRow?: { canonical_state?: any; updated_at?: string | null } | null;
  incomingState: Record<string, any>;
}): { state: Record<string, any>; rejectedStale: boolean; merged: boolean } {
  const serverState = asObject(serverRow?.canonical_state);
  const serverUpdatedAtMs = serverRow?.updated_at ? Date.parse(String(serverRow.updated_at)) : 0;
  const basedOn = firstFinite(incomingState?.basedOnUpdatedAt, incomingState?.based_on_updated_at, 0) || 0;

  if (serverState && shouldRejectStaleCanonicalWrite({
    serverUpdatedAtMs,
    clientBasedOnUpdatedAtMs: basedOn,
  })) {
    // Still merge so newer local attempts are not discarded, but keep server as base.
    return {
      state: mergeCanonicalProgressionState(serverState, incomingState),
      rejectedStale: true,
      merged: true,
    };
  }

  if (serverState) {
    return {
      state: mergeCanonicalProgressionState(serverState, incomingState),
      rejectedStale: false,
      merged: true,
    };
  }

  return { state: { ...incomingState }, rejectedStale: false, merged: false };
}

/** Walk-away unlock stays at 3 mistakes (pre-difficulty-policy behavior). Failure still uses maxMistakes. */
export function getWalkAwayMistakeThreshold(_maxMistakes?: number): number {
  return 3;
}

export function shouldSubmitV2ProgressReportGate(input: {
  isDemo?: boolean;
  bcMode?: string | null;
  isIframe?: boolean;
  ctx?: {
    userId?: string | null;
    restaurantId?: string | null;
    membershipRole?: string | null;
    membership_role?: string | null;
    role?: string | null;
  } | null;
}): boolean {
  if (input.isDemo || String(input.bcMode || "").toLowerCase() === "demo") return false;
  if (!input.isIframe) return false;
  const ctx = input.ctx || {};
  const role = String(ctx.membershipRole || ctx.membership_role || ctx.role || "").toLowerCase();
  return !!(
    ctx.userId &&
    ctx.restaurantId &&
    ["waiter", "single_manager", "group_manager", "enterpriser"].includes(role)
  );
}

/** AP unlock thresholds (bottle/authority points) — separate from rules encounter thresholds. */
export const V2_AP_TIER_UNLOCKS = Object.freeze({
  1: 0,
  2: 180,
  3: 500,
  4: 1100,
  5: 2000,
});

/** Rules encounter thresholds used by decideV2RulesTierFromSnapshot / progressionEvaluator. */
export const V2_RULES_TIER_UNLOCKS = Object.freeze({
  1: { minEncountersTotal: 0 },
  2: { minEncountersTotal: 5, minRecent: 5, minGreenRate: 0.6, maxReds: 1 },
  3: { minEncountersTotal: 12, minRecent: 10, minGreenRate: 0.8, maxReds: 0, requirePivotSuccess: true },
});

export function getV2TierUnlockedByAP(totalAP: number): number {
  const ap = Number(totalAP || 0);
  if (ap >= V2_AP_TIER_UNLOCKS[5]) return 5;
  if (ap >= V2_AP_TIER_UNLOCKS[4]) return 4;
  if (ap >= V2_AP_TIER_UNLOCKS[3]) return 3;
  if (ap >= V2_AP_TIER_UNLOCKS[2]) return 2;
  return 1;
}

export function splitProgressReportScoring(payload: Record<string, any> | null | undefined) {
  const p = asObject(payload) || {};
  const skills = asObject(p.skills) || null;
  const progressionState = asObject(p.progressionState) || asObject(p.progression_state) || null;
  const authority =
    asObject(progressionState?.v2?.authority) ||
    asObject(progressionState?.authority) ||
    null;
  return {
    skills,
    progressionState,
    authorityPoints: firstFinite(
      authority?.totalAP,
      authority?.authorityPoints,
      progressionState?.economy?.authorityPoints,
      progressionState?.economy?.ap,
      p.v2Snapshot?.bottleRewards?.totalAP,
    ),
    hasSkillScore: !!skills,
    hasProgressionAuthority: !!progressionState,
  };
}
