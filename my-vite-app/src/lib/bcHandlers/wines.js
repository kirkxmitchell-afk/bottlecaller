import { BC_TYPES } from "../bcMessages";

export function makeWinesHandler({ fetchWines }) {
  if (!fetchWines) throw new Error("makeWinesHandler: fetchWines required");

  return async ({ msg, event, state, reply }) => {
    const { reqId, restaurantId, mode } = msg;
    const wines = await fetchWines({ restaurantId, mode, msg, event, state });

    reply(BC_TYPES.WINES_REPORT, { ok: true, reqId, wines });
  };
}
