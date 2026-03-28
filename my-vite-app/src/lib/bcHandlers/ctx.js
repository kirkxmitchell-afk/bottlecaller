import { BC_TYPES } from "../bcMessages";

export function makeCtxHandler({ getBcCtx }) {
  if (!getBcCtx) throw new Error("makeCtxHandler: getBcCtx required");

  return async ({ msg, event, state, reply }) => {
    const requestedMode = msg.mode || "premium";
    const bcCtx = await getBcCtx({ requestedMode, msg, event, state });
    if (!bcCtx) return;

    reply(BC_TYPES.CTX, { ...bcCtx });
  };
}
