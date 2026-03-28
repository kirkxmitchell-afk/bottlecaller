import { BC_TYPES } from "../bcMessages";

export function makeLogoutHandler({ doLogout }) {
  if (!doLogout) throw new Error("makeLogoutHandler: doLogout required");

  return async ({ reply }) => {
    // optional immediate UX response (iframe can collapse)
    reply(BC_TYPES.AUTH_STATE, { authed: false });

    await doLogout("iframe_request");
  };
}