// src/lib/bcQueue.ts
type QueueStatus = "pending" | "sent" | "failed";

export type BCQueuedEvent = {
  eventId: string;               // uuid
  eventType: string;             // one of the 7 types
  payload: Record<string, any>;  // event payload
  createdAt: number;             // Date.now()
  status: QueueStatus;
  attemptCount: number;
};

const QUEUE_KEY = "bc_event_queue_premium_v1";
const MAX_QUEUE_SIZE = 2000; // safety cap
const MAX_ATTEMPTS = 10;

function readQueue(): BCQueuedEvent[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Trust but verify minimally: coerce to BCQueuedEvent[]
    return parsed as BCQueuedEvent[];
  } catch {
    return [];
  }
}

function writeQueue(q: BCQueuedEvent[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function getQueueCount(): number {
  return readQueue().filter(e => e.status !== "sent").length;
}

export function enqueueEvent(e: Omit<BCQueuedEvent, "status" | "attemptCount" | "createdAt"> & { createdAt?: number }) {
  const q = readQueue();
  const item: BCQueuedEvent = {
    eventId: e.eventId,
    eventType: e.eventType,
    payload: e.payload,
    createdAt: e.createdAt ?? Date.now(),
    status: "pending",
    attemptCount: 0,
  };

  q.push(item);

  // cap queue size (drop oldest SENT first, then oldest overall)
  if (q.length > MAX_QUEUE_SIZE) {
    const keep = q.filter(x => x.status !== "sent");
    const trimmed = keep.length > MAX_QUEUE_SIZE ? keep.slice(keep.length - MAX_QUEUE_SIZE) : keep;
    writeQueue(trimmed);
    return;
  }

  writeQueue(q);
}

export function markSent(eventIds: string[]) {
  const set = new Set(eventIds);
  const q = readQueue().map(e => (set.has(e.eventId) ? { ...e, status: "sent" as const } : e));
  writeQueue(q);
}

export function markFailed(eventIds: string[]) {
  const set = new Set(eventIds);
  const q: BCQueuedEvent[] = readQueue().map((e): BCQueuedEvent => {
    if (!set.has(e.eventId)) return e;

    const attemptCount = e.attemptCount + 1;
    const status: QueueStatus = attemptCount >= MAX_ATTEMPTS ? "failed" : "pending";

    return {
      ...e,
      status,
      attemptCount,
    };
  });
  writeQueue(q);
}

export function peekBatch(limit: number): BCQueuedEvent[] {
  const q = readQueue();
  return q
    .filter(e => e.status === "pending")
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, limit);
}
