export function isCoarsePointer() {
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

export function isPortrait() {
  try {
    if (window.matchMedia("(orientation: portrait)").matches) return true;
    if (window.matchMedia("(orientation: landscape)").matches) return false;
  } catch {}
  return window.innerHeight > window.innerWidth;
}

export async function requestLandscapeLock() {
  try {
    const orientation = window.screen?.orientation;
    if (!orientation || typeof orientation.lock !== "function") return false;
    await orientation.lock("landscape");
    return true;
  } catch {
    return false;
  }
}

export async function unlockLandscape() {
  try {
    window.screen?.orientation?.unlock?.();
    return true;
  } catch {
    return false;
  }
}

export function visualViewportHeight() {
  return Math.ceil(window.visualViewport?.height || window.innerHeight || 800);
}
