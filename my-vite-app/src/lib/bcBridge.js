import { isBcMessage, bcReply, BC_TYPES } from "./bcMessages";

/**
 * Create a bridge that routes BC iframe messages to handlers.
 *
 * Handlers signature:
 *   async function handler({ msg, event, send, state }) {}
 *
 * send(payload) sends to the event.source (the iframe window)
 */
export function createBcBridge({
  allowedOrigin,
  handlers,
  state = {},
  debug = false,
}) {
  if (!allowedOrigin) throw new Error("createBcBridge: allowedOrigin is required");

  const log = (...args) => debug && console.log("[BC_BRIDGE]", ...args);

  function sendTo(event, payload) {
    try {
      event.source?.postMessage(payload, allowedOrigin);
    } catch (e) {
      console.warn("[BC_BRIDGE] postMessage failed", e);
    }
  }

  async function onMessage(event) {
    // 1) hard origin gate
    if (event.origin !== allowedOrigin) return;

    const msg = event.data;
    if (!isBcMessage(msg)) return;

    const handler = handlers[msg.type];
    if (!handler) {
      log("no handler for", msg.type);
      sendTo(event, bcReply(BC_TYPES.ERROR, { ok: false, error: "UNKNOWN_MSG", got: msg.type }));
      return;
    }

    try {
      log("->", msg.type, msg);
      const t0 = performance.now();
      await handler({
        msg,
        event,
        state,
        send: (payload) => sendTo(event, payload),
        reply: (type, payload = {}) => sendTo(event, bcReply(type, payload)),
      });
      log("<-", msg.type, Math.round(performance.now() - t0) + "ms");
    } catch (e) {
      console.warn("[BC_BRIDGE] handler failed", msg.type, e);
      sendTo(event, bcReply(BC_TYPES.ERROR, { ok: false, error: "HANDLER_FAILED", detail: String(e?.message || e) }));
    }
  }

  window.addEventListener("message", onMessage);

  return {
    dispose() {
      window.removeEventListener("message", onMessage);
    },
  };
}
