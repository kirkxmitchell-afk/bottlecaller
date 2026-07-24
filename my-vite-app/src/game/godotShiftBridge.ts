/** Godot floor ↔ V2 encounter linking for demo (premium-ready). */

export const GODOT_GUEST_ORDER = [
  "blonde_date",
  "african_older_gentleman",
  "skeptic_reader",
  "skeptic_v1",
  "african_regular_table",
] as const;

export const V2_DEMO_ENCOUNTER_ORDER = [
  "encounter_v2_014",
  "encounter_v2_013",
  "encounter_v2_011",
  "encounter_v2_015",
  "encounter_v2_016",
] as const;

export type GodotGuestId = (typeof GODOT_GUEST_ORDER)[number];
export type V2DemoEncounterId = (typeof V2_DEMO_ENCOUNTER_ORDER)[number];

/** Same-order 1:1 map: Godot guest → V2 demo encounter. */
export const GODOT_GUEST_TO_V2_ENCOUNTER: Record<GodotGuestId, V2DemoEncounterId> = {
  blonde_date: "encounter_v2_014",
  african_older_gentleman: "encounter_v2_013",
  skeptic_reader: "encounter_v2_011",
  skeptic_v1: "encounter_v2_015",
  african_regular_table: "encounter_v2_016",
};

export const V2_ENCOUNTER_TO_GODOT_GUEST: Record<V2DemoEncounterId, GodotGuestId> = {
  encounter_v2_014: "blonde_date",
  encounter_v2_013: "african_older_gentleman",
  encounter_v2_011: "skeptic_reader",
  encounter_v2_015: "skeptic_v1",
  encounter_v2_016: "african_regular_table",
};

export const GODOT_SOURCE = "BC_GODOT";
export const APP_SOURCE = "BC_APP";

export function resolveV2EncounterIdFromGodotGuest(payload: {
  guestId?: string | null;
  guestIndex?: number | null;
} = {}): string | null {
  const guestId = String(payload.guestId || "").trim();
  if (guestId && guestId in GODOT_GUEST_TO_V2_ENCOUNTER) {
    return GODOT_GUEST_TO_V2_ENCOUNTER[guestId as GodotGuestId];
  }

  const index = Number(payload.guestIndex);
  if (Number.isFinite(index) && index >= 0 && index < V2_DEMO_ENCOUNTER_ORDER.length) {
    return V2_DEMO_ENCOUNTER_ORDER[Math.floor(index)];
  }

  return null;
}

export function isGodotBridgeMessage(data: any): boolean {
  return !!(data && data.source === GODOT_SOURCE && Number(data.v || 0) >= 1 && data.type);
}

export function createAppMessageToGodot(type: string, payload: Record<string, unknown> = {}) {
  return {
    source: APP_SOURCE,
    v: 1,
    type,
    payload,
    at: Date.now(),
  };
}

/** Local `/godot-shift` or an absolute CDN/R2 base (no trailing slash). */
export function normalizeGodotShiftBase(raw?: string | null): string {
  const value = String(raw || "/godot-shift").trim() || "/godot-shift";
  return value.replace(/\/$/, "");
}

export function resolveGodotShiftOrigin(base: string, fallbackOrigin = ""): string {
  const normalized = normalizeGodotShiftBase(base);
  if (/^https?:\/\//i.test(normalized)) {
    try {
      return new URL(normalized).origin;
    } catch {
      return fallbackOrigin || "";
    }
  }
  return fallbackOrigin || "";
}

export function createGodotShiftBridgeApi(options: { baseUrl?: string | null } = {}) {
  const baseUrl = normalizeGodotShiftBase(options.baseUrl);
  return {
    GODOT_GUEST_ORDER,
    V2_DEMO_ENCOUNTER_ORDER,
    GODOT_GUEST_TO_V2_ENCOUNTER,
    V2_ENCOUNTER_TO_GODOT_GUEST,
    baseUrl,
    origin: resolveGodotShiftOrigin(baseUrl),
    normalizeGodotShiftBase,
    resolveGodotShiftOrigin,
    resolveV2EncounterIdFromGodotGuest,
    isGodotBridgeMessage,
    createAppMessageToGodot,
  };
}
