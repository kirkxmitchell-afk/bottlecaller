// src/game/progressionBridge.ts
// Iframe-only bridge: request progression snapshots from parent via BC_MSG.

type Tier = 1 | 2 | 3;

export type ProgressionSnapshotPayload = {
  reqId: string | null;
  ok: boolean;
  demo?: boolean;
  tierToServe?: Tier;
  reasons?: string[];
  reasonsHuman?: string[];
  snapshot?: any;
  canonicalState?: any;
  authority?: any;
  authorityPoints?: number | null;
  error?: string;
  retryAfterMs?: number;
  why?: string;
  epoch?: number;
};

type PendingReq = {
  resolve: (payload: ProgressionSnapshotPayload) => void;
  timer: number;
  desiredTier: Tier;
  startedAt: number;
  attempts: number;
};

const pending = new Map<string, PendingReq>();
const listeners = new Set<(payload: ProgressionSnapshotPayload) => void>();
let installed = false;
let reqSeq = 0;

function isIframe() {
  try {
    return !!(window.parent && window.parent !== window && window.frameElement);
  } catch {
    return true;
  }
}

function getMode(): string {
  try {
    return String((window as any).bcMode || "premium").toLowerCase();
  } catch {
    return "premium";
  }
}

function getEpoch(): number {
  try {
    return Number((window as any).__BC_EPOCH__ || 0);
  } catch {
    return 0;
  }
}

function postToParent(payload: Record<string, unknown>) {
  window.parent?.postMessage(
    {
      source: "BC_MSG",
      v: 1,
      mode: getMode(),
      epoch: getEpoch(),
      ...payload,
    },
    window.location.origin
  );
}

function epochMatches(msg: any): boolean {
  const myEpoch = Number(getEpoch() || 0);
  const parentEpoch = Number(msg?.epoch || 0);
  if (!myEpoch || !parentEpoch) return true;
  return myEpoch === parentEpoch;
}

function ensureListener() {
  if (installed) return;
  installed = true;

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    const msg = event?.data;
    if (!msg || msg.source !== "BC_MSG" || msg.v !== 1) return;

    if (msg.type === "progression_snapshot") {
      const reqId = String(msg.reqId || "");
      const entry = pending.get(reqId);
      const payload = msg as ProgressionSnapshotPayload;

      if (entry) {
        pending.delete(reqId);
        window.clearTimeout(entry.timer);
        entry.resolve(payload);
      }
      for (const cb of listeners) cb(payload);
      return;
    }

    if (msg.type === "ctx_not_ready" || msg.type === "ctx_required") {
      if (!epochMatches(msg)) return;

      for (const [reqId, entry] of pending.entries()) {
        const elapsed = Date.now() - entry.startedAt;
        if (elapsed > 2000) continue;

        entry.attempts += 1;
        const base = Number(msg.retryAfterMs || 250);
        const delay = Math.min(1200, base + entry.attempts * 150);

        window.setTimeout(() => {
          if (!pending.has(reqId)) return;
          postToParent({
            type: "progression_snapshot_request",
            reqId,
            desiredTier: entry.desiredTier,
          });
        }, delay);
      }
      return;
    }
  });
}

export async function requestProgressionSnapshot(desiredTier: Tier = 3) {
  if (!isIframe()) {
    return { reqId: null, ok: false, error: "not_iframe" } as ProgressionSnapshotPayload;
  }

  ensureListener();
  const reqId = `prog_${Date.now()}_${++reqSeq}`;

  if (getMode() !== "demo" && !getEpoch()) {
    return { reqId, ok: false, error: "missing_epoch" } as ProgressionSnapshotPayload;
  }

  return await new Promise<ProgressionSnapshotPayload>((resolve) => {
    const startedAt = Date.now();
    const timer = window.setTimeout(() => {
      pending.delete(reqId);
      resolve({ reqId, ok: false, error: "timeout" });
    }, 2000);

    pending.set(reqId, {
      resolve,
      timer,
      desiredTier,
      startedAt,
      attempts: 0,
    });

    postToParent({
      type: "progression_snapshot_request",
      reqId,
      desiredTier,
    });
  });
}

export function onProgressionSnapshot(cb: (payload: ProgressionSnapshotPayload) => void) {
  ensureListener();
  listeners.add(cb);
  return () => listeners.delete(cb);
}
