// src/game/progressionBridge.ts
// Iframe-only bridge: request progression snapshots from parent via BC_MSG.

type ProgressionSnapshotPayload = {
  reqId: string | null;
  ok: boolean;
  demo?: boolean;
  tierToServe?: 1 | 2 | 3;
  reasons?: string[];
  reasonsHuman?: string[];
  snapshot?: any;
  error?: string;
};

const pending = new Map<string, (payload: ProgressionSnapshotPayload) => void>();
let installed = false;
let reqSeq = 0;

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

function ensureListener() {
  if (installed) return;
  installed = true;
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    const msg = event?.data;
    if (!msg || msg.source !== "BC_MSG" || msg.v !== 1) return;
    if (msg.type !== "progression_snapshot") return;

    const reqId = String(msg.reqId || "");
    const resolve = pending.get(reqId);
    if (!resolve) return;
    pending.delete(reqId);
    resolve(msg as ProgressionSnapshotPayload);
  });
}

export async function requestProgressionSnapshot(desiredTier: 1 | 2 | 3 = 3) {
  ensureListener();
  const reqId = `prog_${Date.now()}_${++reqSeq}`;

  return await new Promise<ProgressionSnapshotPayload>((resolve) => {
    const timer = window.setTimeout(() => {
      pending.delete(reqId);
      resolve({
        reqId,
        ok: false,
        error: "timeout",
      });
    }, 2000);

    pending.set(reqId, (payload) => {
      window.clearTimeout(timer);
      resolve(payload);
    });

    postToParent({
      type: "progression_snapshot_request",
      reqId,
      desiredTier,
    });
  });
}

