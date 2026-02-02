// src/lib/bcMessageBridge.ts
import { enqueueEvent } from "./bcQueue";
import { flushQueueToServer } from "./bcSync";

type AnyMsg = any;

const TRUSTED_SOURCE = "BC_MSG";
const VERSION = 1;

function isTrustedOrigin(_origin: string) {
  return true; // tighten later
}

/**
 * Context provider gets set from main.js.
 * It returns the live app state that the game needs.
 */
type BCContext = {
  mode: "demo" | "premium";
  userId: string | null;
  role: "waiter" | "manager" | null;
  restaurantId: string | null;
};

let ctxProvider: (() => BCContext) | null = null;

export function setBCContextProvider(fn: () => BCContext) {
  ctxProvider = fn;
}

function replyWithContext(targetWindow: Window, modeHint?: "demo" | "premium") {
  const ctx = ctxProvider ? ctxProvider() : null;

  const payload = {
    source: TRUSTED_SOURCE,
    v: VERSION,
    type: "ctx",
    ctx: ctx
      ? {
          ...ctx,
          // If the game says “I am premium” but provider is stale, we respect hint.
          mode: modeHint ?? ctx.mode,
        }
      : {
          mode: modeHint ?? "demo",
          userId: null,
          role: null,
          restaurantId: null,
        },
    ts: Date.now(),
  };

  targetWindow.postMessage(payload, window.location.origin);
}

export function installBCMessageBridge() {
  window.addEventListener("message", (e: MessageEvent<AnyMsg>) => {
    if (!isTrustedOrigin(e.origin)) return;

    const m = e.data;
    if (!m || m.source !== TRUSTED_SOURCE || m.v !== VERSION) return;

    // 1) Game emits an event -> queue + flush
    if (m.type === "event_emit" && m.event?.eventId && m.event?.eventType) {
      enqueueEvent({
        eventId: m.event.eventId,
        eventType: m.event.eventType,
        payload: m.event.payload ?? {},
      });

      void flushQueueToServer();
      return;
    }

    // 2) Game requests ctx -> reply immediately
    // Game should send: {source:"BC_MSG", v:1, type:"ctx_request", mode:"premium"|"demo"}
    if (m.type === "ctx_request") {
      if (e.source && typeof (e.source as Window).postMessage === "function") {
        replyWithContext(e.source as Window, m.mode);
      }
      return;
    }

    // 3) Gate messages (future)
    if (m.type === "gate") {
      // openGateModal(m.data)
      return;
    }
  });

  window.addEventListener("online", () => {
    void flushQueueToServer({ force: true, online: true });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void flushQueueToServer();
  });
}
