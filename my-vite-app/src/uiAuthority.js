import { getSupabase } from "./lib/supabaseSingleton.js";
import { mountPremium, unmountPremium } from "./premiumMount.js";

const supabase = getSupabase();

const state = {
  session: null,
  mode: "home", // home | demo | premium
  role: null,
  bootId: 0,
};

let cfg = {
  els: {
    screenHome: null,
    screenDemo: null,
    premiumHost: null,
    btnLogout: null,
  },
  resetRoleTemplates: () => {},
  buildBcCtxFromState: () => ({}),
};

function hideAllScreens() {
  cfg.els.screenHome && (cfg.els.screenHome.style.display = "none");
  cfg.els.screenDemo && (cfg.els.screenDemo.style.display = "none");
}

function applyLoggedOutUI() {
  unmountPremium({ container: cfg.els.premiumHost });
  cfg.resetRoleTemplates();
  hideAllScreens();
  cfg.els.screenHome && (cfg.els.screenHome.style.display = "block");
  cfg.els.btnLogout && (cfg.els.btnLogout.style.display = "none");
  try {
    history.replaceState({}, "", location.pathname);
  } catch {}
}

function applyLoggedInUI() {
  cfg.els.btnLogout && (cfg.els.btnLogout.style.display = "inline-flex");
}

export function renderAuthorityUI() {
  if (!state.session) {
    state.mode = "home";
    applyLoggedOutUI();
    return;
  }

  applyLoggedInUI();
  hideAllScreens();

  if (state.mode === "demo") {
    unmountPremium({ container: cfg.els.premiumHost });
    cfg.els.screenDemo && (cfg.els.screenDemo.style.display = "block");
    return;
  }

  if (state.mode === "premium") {
    mountPremium({
      container: cfg.els.premiumHost,
      src: "/game/game.html?mode=premium",
      ctx: cfg.buildBcCtxFromState(state),
    });
    return;
  }

  cfg.els.screenHome && (cfg.els.screenHome.style.display = "block");
}

export function initUiAuthority(options = {}) {
  cfg = {
    ...cfg,
    ...options,
    els: {
      ...cfg.els,
      ...(options.els || {}),
    },
  };
}

export function setAuthSession(session) {
  state.session = session || null;
  state.bootId++;
  renderAuthorityUI();
}

export function setMode(mode) {
  let nextMode = mode;
  if (!state.session && nextMode !== "home") nextMode = "home";
  state.mode = nextMode;
  renderAuthorityUI();
}

export function setRole(role) {
  state.role = role || null;
}

export function getState() {
  return { ...state };
}

export async function hardLogout() {
  setAuthSession(null);
  state.mode = "home";
  try {
    history.replaceState({}, "", location.pathname);
  } catch {}

  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn("[AUTH] signOut error", e);
  }

  try {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) setAuthSession(null);
  } catch {
    setAuthSession(null);
  }
}
