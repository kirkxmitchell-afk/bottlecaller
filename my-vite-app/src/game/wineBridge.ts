// src/game/wineBridge.ts
const ORIGIN = window.location.origin;

function postToParent(payload: Record<string, unknown>) {
  window.parent?.postMessage({ source: "BC_MSG", v: 1, ...payload }, ORIGIN);
}

function waitFor(
  type: string,
  matchFn?: (msg: any) => boolean,
  timeoutMs = 8000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      window.removeEventListener("message", onMsg);
      reject(new Error("timeout waiting for " + type));
    }, timeoutMs);

    function onMsg(e: MessageEvent) {
      const msg = e?.data as any;
      if (!msg || msg.source !== "BC_MSG" || msg.v !== 1) return;
      if (e.origin !== ORIGIN) return;
      if (msg.type !== type) return;
      if (matchFn && !matchFn(msg)) return;

      clearTimeout(t);
      window.removeEventListener("message", onMsg);
      resolve(msg);
    }

    window.addEventListener("message", onMsg);
  });
}

function toDbWineShape(wine: any) {
  return {
    id: wine?.id || undefined,
    name: wine?.name || "",
    varietal: wine?.varietal || "",
    fruit_tags: wine?.fruitTags || wine?.fruit_tags || wine?.fruit || [],
    texture_tags: wine?.textureTags || wine?.texture_tags || wine?.texture || [],
    oak_level: wine?.oakLevel || wine?.oak_level || wine?.oak || "",
    process: wine?.process || "",
    region: wine?.region || "",
    story: wine?.story || "",
  };
}

export async function requestWines(rid: string) {
  const reqId = "wreq_" + Math.random().toString(16).slice(2);

  postToParent({
    type: "wines_request",
    reqId,
    restaurantId: rid,
    mode: "premium",
  });

  const res = await waitFor("wines_report", (m) => m.reqId === reqId, 12000);
  if (!res.ok) throw new Error(res.error || "wines_request failed");
  return res.wines || [];
}

export async function fetchRestaurantWines(_scopeId: string | null, restaurantId: string) {
  return requestWines(restaurantId);
}

async function mutateWines(action: string, payload: any, restaurantId?: string) {
  const reqId = "wmut_" + Math.random().toString(16).slice(2);
  postToParent({
    type: "wines_mutate",
    reqId,
    action,
    restaurantId: restaurantId || null,
    payload: payload || {},
    mode: "premium",
  });

  const res = await waitFor("wines_mutate_result", (m) => m.reqId === reqId, 12000);
  if (!res.ok) throw new Error(res.error || `wines_mutate:${action} failed`);
  return true;
}

export async function addRestaurantWine(_scopeId: string | null, restaurantId: string, wine: any) {
  return mutateWines("add", toDbWineShape(wine), restaurantId);
}

export async function upsertRestaurantWine(_scopeId: string | null, restaurantId: string, wine: any) {
  return mutateWines("upsert", toDbWineShape(wine), restaurantId);
}

export async function deleteRestaurantWine(wineId: string) {
  return mutateWines("delete", { wineId });
}

export async function deleteAllRestaurantWines(_scopeId: string | null, restaurantId: string) {
  return mutateWines("delete_all", {}, restaurantId);
}
