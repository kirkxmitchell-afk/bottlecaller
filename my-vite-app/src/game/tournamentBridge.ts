type TournamentEnvelope = {
  type: string;
  requestId?: string | null;
  epoch?: number;
  payload?: any;
};

const pending = new Map<
  string,
  {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timer: number;
    responseType: string;
  }
>();

let installed = false;
let requestSeq = 0;

function getEpoch(): number {
  try {
    return Number((window as any).__BC_EPOCH__ || 0);
  } catch {
    return 0;
  }
}

function getMode(): string {
  try {
    return String((window as any).bcMode || "premium").toLowerCase();
  } catch {
    return "premium";
  }
}

function ensureListener() {
  if (installed) return;
  installed = true;

  window.addEventListener("message", (event: MessageEvent<TournamentEnvelope>) => {
    if (event.origin !== window.location.origin) return;
    const msg = event.data;
    if (!msg || msg.type == null || (msg as any).source !== "BC_MSG" || (msg as any).v !== 1) return;

    const requestId = String(msg.requestId || "");
    if (!requestId) return;

    const entry = pending.get(requestId);
    if (!entry) return;
    if (msg.type !== entry.responseType) return;

    pending.delete(requestId);
    window.clearTimeout(entry.timer);
    entry.resolve(msg.payload ?? null);
  });
}

function sendRequest(type: string, responseType: string, payload: any, timeoutMs = 3000): Promise<any> {
  ensureListener();
  const requestId = `tour_${Date.now()}_${++requestSeq}`;

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pending.delete(requestId);
      reject(new Error(`${type}:timeout`));
    }, timeoutMs);

    pending.set(requestId, {
      resolve,
      reject,
      timer,
      responseType,
    });

    window.parent?.postMessage(
      {
        source: "BC_MSG",
        v: 1,
        type,
        requestId,
        epoch: getEpoch(),
        mode: getMode(),
        payload: payload || {},
      },
      window.location.origin
    );
  });
}

export function requestTournamentCreate(definition: any) {
  return sendRequest("tournament_create", "tournament_created", { definition }, 5000);
}

export function requestTournamentSnapshot(tournamentId: string | null = null) {
  return sendRequest("tournament_snapshot", "tournament_snapshot_result", { tournamentId }, 5000);
}

export function requestTournamentStart(tournamentId: string) {
  return sendRequest("tournament_start", "tournament_started", { tournamentId }, 5000);
}

export function requestTournamentAdvance(payload: {
  tournamentId: string;
  completedEntry: any;
  restore?: any;
}) {
  return sendRequest("tournament_advance", "tournament_advanced", payload, 5000);
}

export function requestTournamentRestore(tournamentId: string | null = null) {
  return sendRequest("tournament_restore", "tournament_restored", { tournamentId }, 5000);
}

export function sendTournamentCheckpoint(payload: {
  tournamentId: string;
  restore: any;
}) {
  return sendRequest("tournament_checkpoint", "tournament_checkpoint_result", payload, 3000);
}
