// src/game/eventLogBridge.ts
const ORIGIN = window.location.origin;

function getEpoch() {
  return Number((window as any).__BC_EPOCH__ || 0);
}

function getMode() {
  return String((window as any).bcMode || "premium").toLowerCase();
}

function postToParent(payload: Record<string, unknown>) {
  const msg = {
    source: "BC_MSG",
    v: 1,
    epoch: getEpoch(),
    mode: getMode(),
    ...payload,
  };
  window.parent?.postMessage(msg, ORIGIN);
}

function waitFor(type: string, reqId: string, timeoutMs = 8000): Promise<any> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      window.removeEventListener("message", onMsg);
      reject(new Error("timeout waiting for " + type));
    }, timeoutMs);

    function onMsg(e: MessageEvent) {
      const msg = e?.data as any;
      if (!msg || msg.source !== "BC_MSG" || msg.v !== 1) return;
      if (e.origin !== ORIGIN) return;
      if (msg.type !== type) return;
      if (msg.reqId !== reqId) return;
      clearTimeout(t);
      window.removeEventListener("message", onMsg);
      resolve(msg);
    }

    window.addEventListener("message", onMsg);
  });
}

export async function hasRitualCompletedTodayZA() {
  const reqId = "rit_" + Math.random().toString(16).slice(2);
  postToParent({ type: "ritual_status_request", reqId });
  const res = await waitFor("ritual_status_response", reqId, 12000);
  if (!res?.ok) throw new Error(res?.error || "ritual_status_request failed");
  return !!res.doneToday;
}
