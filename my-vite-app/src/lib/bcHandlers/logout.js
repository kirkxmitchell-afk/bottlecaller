import { BC_TYPES } from "../bcMessages";

export function makeLogoutHandler({ doLogout }) {
  if (!doLogout) throw new Error("makeLogoutHandler: doLogout required");

  return async ({ reply }) => {
    const godotOrDemo =
      !!window.__BC_GODOT_DEMO_LOCK__ ||
      document.documentElement?.dataset?.bcGodotDemo === "true" ||
      document.documentElement?.dataset?.bcV2Demo === "true" ||
      !!document.getElementById("gameRootDemoFrame");
    if (godotOrDemo) {
      console.warn("[LOGOUT] iframe logout request ignored during Godot/demo play");
      return;
    }

    // optional immediate UX response (iframe can collapse)
    reply(BC_TYPES.AUTH_STATE, { authed: false });

    await doLogout("iframe_request");
  };
}
