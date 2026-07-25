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
  return {
    attempts,
    encountersTotal: Math.max(snapshotTotal, attempts),
    totalAP: Math.max(0, Number(state?.totalAP || 0)),
    updatedAt: Number(state?.updatedAt || 0),
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
  if (auth.totalAP > local.totalAP && auth.encountersTotal >= local.encountersTotal && auth.attempts >= local.attempts) {
    return true;
  }
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

  return {
    v: 1,
    source: "v2_harness",
    ...base,
    totalAP,
    attempts,
    progressionSnapshot,
    updatedAt: Math.max(Number(local.updatedAt || 0), Number(auth.updatedAt || 0), Date.now()),
    tierToServe: Number(base.tierToServe || 1) || 1,
    apTierUnlocked: Number(base.apTierUnlocked || 1) || 1,
    rulesTierToServe: Number(base.rulesTierToServe || 1) || 1,
  };
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
      latestSnapshot: preferIncoming
        ? incoming.v2?.latestSnapshot || server.v2?.latestSnapshot || null
        : server.v2?.latestSnapshot || incoming.v2?.latestSnapshot || null,
    },
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
