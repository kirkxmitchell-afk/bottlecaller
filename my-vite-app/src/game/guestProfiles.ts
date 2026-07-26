/**
 * Guest profile source of truth for floor greets + V2 wine encounters.
 *
 * Update v2.1 composition:
 * - guestType → response / timing / difficulty bias
 * - guestId → depiction seed + art
 * - partyShape → single | couple (explicit, or inferred from art/copy)
 * - depiction → contextual floor hint + wine dialogue framing
 *
 * V3 remains gated until floor + wine type/AP behaviour fully align.
 */

export type GodotGuestId =
  | "blonde_date"
  | "african_older_gentleman"
  | "skeptic_reader"
  | "skeptic_v1"
  | "african_regular_table";

export type V2DemoEncounterId =
  | "encounter_v2_014"
  | "encounter_v2_013"
  | "encounter_v2_011"
  | "encounter_v2_015"
  | "encounter_v2_016";

export type GuestType = "tourist" | "regular" | "skeptic";

/** Table occupancy shape — part of depiction; drives dialogue context. */
export type PartyShape = "single" | "couple";

export type GreetChoice = "greet_food" | "greet_wine" | "greet_aperitif";
export type OfferChoice = "offer_food" | "offer_wine" | "walk_away";

export type ObjectPathKind = "food" | "wine" | "aperitif";

export type ObjectPathResult = {
  kind: ObjectPathKind | "mismatch" | "walk_away";
  /** Matched greet→offer object path (food / wine) or aperitif conversion. */
  objectSuccess: boolean;
  /** Aperitif may be opened only once per table session via greet_aperitif. */
  aperitifOpportunityUsed: boolean;
  note: string;
};

export type GuestFloorLines = {
  greetFood: string;
  greetWine: string;
  greetAperitif: string;
  offerFood: string;
  offerWine: string;
  walkAway: string;
};

export type GuestProfile = {
  guestId: GodotGuestId;
  /** Canonical type — drives V2 family + response control. */
  guestType: GuestType;
  /** Explicit party shape; art/copy may also infer the same value. */
  partyShape: PartyShape;
  /** Floor / V2 display title. */
  displayName: string;
  /** Short depiction shown before greet choices (type + id + party context). */
  depiction: string;
  /** Linked V2 wine encounter (demo map). */
  v2EncounterId: V2DemoEncounterId;
  /** Content schema version; v2.1 adds party shape + type lane differentiation. */
  encounterSchema: "v2" | "v2.1" | "v3";
  floorLines: GuestFloorLines;
};

/** Object success pairs: greet food↔offer food, greet wine↔offer wine.
 *  Aperitif: single opportunity (greet_aperitif), then offer food or wine converts. */
export function evaluateObjectPath(
  greeting: GreetChoice | string,
  offer: OfferChoice | string
): ObjectPathResult {
  if (offer === "walk_away") {
    return {
      kind: "walk_away",
      objectSuccess: false,
      aperitifOpportunityUsed: greeting === "greet_aperitif",
      note: "Guest deferred; no object path closed.",
    };
  }

  if (greeting === "greet_aperitif") {
    return {
      kind: "aperitif",
      objectSuccess: offer === "offer_food" || offer === "offer_wine",
      aperitifOpportunityUsed: true,
      note:
        "Single aperitif opportunity used. Follow-up offer converts aperitif + food (and wine if offered).",
    };
  }

  if (greeting === "greet_food" && offer === "offer_food") {
    return {
      kind: "food",
      objectSuccess: true,
      aperitifOpportunityUsed: false,
      note: "Food object path: greet food + offer food.",
    };
  }

  if (greeting === "greet_wine" && offer === "offer_wine") {
    return {
      kind: "wine",
      objectSuccess: true,
      aperitifOpportunityUsed: false,
      note: "Wine object path: greet wine + offer wine → V2 encounter + AP.",
    };
  }

  return {
    kind: "mismatch",
    objectSuccess: false,
    aperitifOpportunityUsed: false,
    note: `Mismatched path (${greeting} → ${offer}); object success requires matching food or wine pairs.`,
  };
}

const TYPE_FLOOR_LINES: Record<GuestType, GuestFloorLines> = {
  tourist: {
    greetFood:
      "We are ready to eat, but we are still figuring out what fits the night.",
    greetWine:
      "We wanted something that feels local — what would you suggest for us?",
    greetAperitif:
      "Something light to start could help while we settle into the room.",
    offerFood: "Yes — start us with food and we will follow your lead.",
    offerWine: "Alright. If you have a bottle that fits us, we will listen.",
    walkAway: "Give us a moment. We will call you when we are ready.",
  },
  regular: {
    greetFood: "You know we are ready when we look ready. Food first is fine.",
    greetWine: "You know our kind of bottle. Keep it in that lane.",
    greetAperitif: "An aperitif is fine if it does not turn into a performance.",
    offerFood: "Yes. Same rhythm as usual — food, then we decide the rest.",
    offerWine: "If it is in our lane, bring it. No long pitch.",
    walkAway: "We will wave when we are ready. No rush.",
  },
  skeptic: {
    greetFood: "Food is fine. Just do not turn the table into a sales floor.",
    greetWine: "Convince me the bottle fits the table — not just the list.",
    greetAperitif: "An aperitif only if there is a clear reason for it.",
    offerFood: "Fine. Start with food. Keep the rest precise.",
    offerWine: "Alright. One clear reason, then we will decide.",
    walkAway: "Not yet. Come back when you have something specific.",
  },
};

const SINGLE_FLOOR_LINES: Record<GuestType, GuestFloorLines> = {
  tourist: {
    greetFood:
      "I am ready to eat, but I am still figuring out what fits the night.",
    greetWine:
      "I wanted something that feels local — what would you suggest for me?",
    greetAperitif:
      "Something light to start could help while I settle into the room.",
    offerFood: "Yes — start me with food and I will follow your lead.",
    offerWine: "Alright. If you have a bottle that fits, I will listen.",
    walkAway: "Give me a moment. I will call you when I am ready.",
  },
  regular: {
    greetFood: "You know I am ready when I look ready. Food first is fine.",
    greetWine: "You know my kind of bottle. Keep it in that lane.",
    greetAperitif: "An aperitif is fine if it does not turn into a performance.",
    offerFood: "Yes. Same rhythm as usual — food, then I decide the rest.",
    offerWine: "If it is in my lane, bring it. No long pitch.",
    walkAway: "I will wave when I am ready. No rush.",
  },
  skeptic: {
    greetFood: "Food is fine. Just do not turn the table into a sales floor.",
    greetWine: "Convince me the bottle fits the table — not just the list.",
    greetAperitif: "An aperitif only if there is a clear reason for it.",
    offerFood: "Fine. Start with food. Keep the rest precise.",
    offerWine: "Alright. One clear reason, then I will decide.",
    walkAway: "Not yet. Come back when you have something specific.",
  },
};

export function getFloorLinesForComposition(
  guestType: GuestType,
  partyShape: PartyShape,
): GuestFloorLines {
  return partyShape === "single"
    ? SINGLE_FLOOR_LINES[guestType]
    : TYPE_FLOOR_LINES[guestType];
}

/**
 * Infer party shape from art paths / depiction / hint copy.
 * Explicit profile.partyShape still wins when provided to resolvePartyShape.
 */
export function inferPartyShapeFromArt(input: {
  guestId?: string | null;
  depiction?: string | null;
  guestHint?: string | null;
  artPath?: string | null;
} = {}): PartyShape {
  const blob = [
    input.guestId,
    input.depiction,
    input.guestHint,
    input.artPath,
  ]
    .map((part) => String(part || "").toLowerCase())
    .join(" ");

  if (
    /\bcouple\b/.test(blob) ||
    /\bdate\b/.test(blob) ||
    /\btwo of us\b/.test(blob) ||
    /\bpair\b/.test(blob) ||
    /\btogether\b/.test(blob)
  ) {
    return "couple";
  }

  if (
    /\bsingle\b/.test(blob) ||
    /\bgentleman\b/.test(blob) ||
    /\bsolo\b/.test(blob) ||
    /\balone\b/.test(blob)
  ) {
    return "single";
  }

  const id = String(input.guestId || "").toLowerCase();
  if (id.includes("date") || id.endsWith("_table") || id.includes("couple")) {
    return "couple";
  }
  if (id.includes("gentleman") || id.includes("skeptic") || id.includes("reader")) {
    return "single";
  }

  return "single";
}

export function resolvePartyShape(input: {
  explicit?: PartyShape | string | null;
  guestId?: string | null;
  depiction?: string | null;
  guestHint?: string | null;
  artPath?: string | null;
} = {}): PartyShape {
  if (input.explicit === "single" || input.explicit === "couple") {
    return input.explicit;
  }
  return inferPartyShapeFromArt(input);
}

export const GUEST_PROFILES: Record<GodotGuestId, GuestProfile> = {
  blonde_date: {
    guestId: "blonde_date",
    guestType: "tourist",
    partyShape: "couple",
    displayName: "Window Date",
    depiction:
      "Tourist date couple by the window: polished, a little unfamiliar with the room — wanting the night to feel special without pressure.",
    v2EncounterId: "encounter_v2_014",
    encounterSchema: "v2.1",
    floorLines: getFloorLinesForComposition("tourist", "couple"),
  },
  african_older_gentleman: {
    guestId: "african_older_gentleman",
    guestType: "regular",
    partyShape: "single",
    displayName: "Known Regular",
    depiction:
      "A known African regular: settled, expecting recognition and a familiar lane without fuss.",
    v2EncounterId: "encounter_v2_013",
    encounterSchema: "v2.1",
    floorLines: getFloorLinesForComposition("regular", "single"),
  },
  skeptic_reader: {
    guestId: "skeptic_reader",
    guestType: "skeptic",
    partyShape: "single",
    displayName: "Guarded Reader",
    depiction:
      "Guarded skeptic with a bookish presence: reading the table and waiting for one precise reason before trust.",
    v2EncounterId: "encounter_v2_011",
    encounterSchema: "v2.1",
    floorLines: getFloorLinesForComposition("skeptic", "single"),
  },
  skeptic_v1: {
    guestId: "skeptic_v1",
    guestType: "skeptic",
    partyShape: "single",
    displayName: "Precision Guest",
    depiction:
      "Precision skeptic: same response control as the reader — relevance before trust, no guessing.",
    v2EncounterId: "encounter_v2_015",
    encounterSchema: "v2.1",
    floorLines: getFloorLinesForComposition("skeptic", "single"),
  },
  african_regular_table: {
    guestId: "african_regular_table",
    guestType: "regular",
    partyShape: "couple",
    displayName: "Regular Couple",
    depiction:
      "African regular couple: familiar with the room, wanting recognition and comfort without a pitch.",
    v2EncounterId: "encounter_v2_016",
    encounterSchema: "v2.1",
    floorLines: getFloorLinesForComposition("regular", "couple"),
  },
};

export function getGuestProfile(guestId: string | null | undefined): GuestProfile | null {
  const id = String(guestId || "").trim();
  if (id && id in GUEST_PROFILES) {
    return GUEST_PROFILES[id as GodotGuestId];
  }
  return null;
}

export function getGuestType(guestId: string | null | undefined): GuestType | null {
  return getGuestProfile(guestId)?.guestType ?? null;
}

export function getGuestPartyShape(
  guestId: string | null | undefined,
  artHints: {
    depiction?: string | null;
    guestHint?: string | null;
    artPath?: string | null;
    explicit?: PartyShape | string | null;
  } = {},
): PartyShape | null {
  const profile = getGuestProfile(guestId);
  if (!profile && !artHints.explicit && !artHints.depiction && !artHints.artPath) {
    return null;
  }
  return resolvePartyShape({
    explicit: artHints.explicit ?? profile?.partyShape,
    guestId: guestId || profile?.guestId,
    depiction: artHints.depiction ?? profile?.depiction,
    guestHint: artHints.guestHint,
    artPath: artHints.artPath,
  });
}

/** V3 only when floor guest type and V2 encounter family already correspond. */
export function guestTypeMatchesV2Family(
  guestType: GuestType,
  encounterFamily: string
): boolean {
  return guestType === encounterFamily;
}
