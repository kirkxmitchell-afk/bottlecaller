import { BC_TYPES } from "../bcMessages";

export function makeRunsCountHandler({ fetchRunsCount }) {
  if (!fetchRunsCount) throw new Error("makeRunsCountHandler: fetchRunsCount required");

  return async ({ msg, event, state, reply }) => {
    const { userId, restaurantId, mode } = msg;
    const count = await fetchRunsCount({ userId, restaurantId, mode, msg, event, state });
    const reqId = msg?.reqId || null;

    reply(BC_TYPES.RUNS_COUNT_RESPONSE, { reqId, ok: true, count });
  };
}
