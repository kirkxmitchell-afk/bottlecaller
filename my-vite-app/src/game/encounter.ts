// src/game/encounters.ts
// BottleCaller Encounter Authoring v1
// Single source of truth for authored encounters (demo + premium)
// - Pure data + validation helpers
// - No DOM, no storage, no engine imports

export type GuestState =
  | "Decider"
  | "Fancy"
  | "Griever"
  | "Celebrator"
  | "Bargain-Smart";

export type SkillFocus =
  | "read"
  | "mode"
  | "hook"
  | "delivery"
  | "pivot"
  | "reset";

export type TrapType =
  | "none"
  | "mixed-signals"
  | "value-bait"
  | "status-test"
  | "silence"
  | "partner-check"
  | "time-pressure"
  | "price-pushback"
  | "false-agreement"
  | "too-much-info";

export type EncounterMeta = {
  /** Tier bucket (Strict unlock uses this) */
  tier: 1 | 2 | 3;

  /** Micro difficulty inside tier (1 easiest -> 5 hardest) */
  difficulty: 1 | 2 | 3 | 4 | 5;

  /** What this encounter is really training */
  skillFocus: SkillFocus;

  /** What trap is being used (or "none") */
  trapType: TrapType;
};

export type Encounter = {
  encounterNumber: number; // 1..N

  guestStateActual: GuestState;

  contextLine: string;
  guestLine: string;

  physicalCues: string[];
  verbalCues: string[];

  toneTag?: string;
  meta: EncounterMeta;

  // Backwards-compatible fields (optional)
  difficulty?: number;
  tags?: string[];
  wineIndexHint?: number;
};

export type EncounterPack = {
  demo: Encounter[];
  premium: Encounter[];
};

export function tierFromEncounterNumber(n: number): 1 | 2 | 3 {
  if (n >= 1 && n <= 5) return 1;
  if (n >= 6 && n <= 12) return 2;
  return 3; // 13..20
}

// ------------------------------------------------------------
// ✅ AUTHOR HERE
// ------------------------------------------------------------

export const ENCOUNTERS: EncounterPack = {
  demo: [
    {
      encounterNumber: 1,
      difficulty: 1,
      guestStateActual: "Decider",
      contextLine: "They scan the list fast, ready to choose.",
      guestLine: "“We’re in a bit of a rush.”",
      physicalCues: ["Phone on table, glancing at time", "Direct eye contact, waiting"],
      verbalCues: ["“We’re in a bit of a rush.”", "“What’s your best?”"],
      toneTag: "Direct",
  meta: { tier: tierFromEncounterNumber(1), difficulty: 1, skillFocus: "read", trapType: "none" },
  wineIndexHint: 0,
    },
    {
      encounterNumber: 2,
      difficulty: 1,
      guestStateActual: "Bargain-Smart",
      contextLine: "They scan prices carefully and test your confidence.",
      guestLine: "“Is there something worth it without going crazy?”",
      physicalCues: ["Points at the price column", "Pages through wine list quickly"],
      verbalCues: ["“Is there something worth it without going crazy?”", "“What’s the best value here?”"],
      toneTag: "Testing",
  meta: { tier: tierFromEncounterNumber(2), difficulty: 1, skillFocus: "read", trapType: "none" },
  wineIndexHint: 1,
    },
  ],

  premium: [
    // --- Stage 1 (1–7) learn the loop ---
    {
      encounterNumber: 1,
      difficulty: 1,
      guestStateActual: "Decider",
      contextLine: "They want a clean decision with minimal talk.",
      guestLine: "“Just pick something good — we’ll trust you.”",
      physicalCues: ["Menu half-closed", "Looks up immediately"],
      verbalCues: ["“Just pick something good.”", "“What would you order?”"],
  toneTag: "Fast",
  tags: ["decider", "lead", "fast"],
  meta: { tier: tierFromEncounterNumber(1), difficulty: 1, skillFocus: "read", trapType: "none" },
    },
    {
      encounterNumber: 2,
      difficulty: 1,
      guestStateActual: "Griever",
      contextLine: "They look tired. They want safety, not performance.",
      guestLine: "“I don’t really know wine… something easy?”",
      physicalCues: ["Soft voice", "Avoids eye contact"],
      verbalCues: ["“Something easy.”", "“Not too heavy.”"],
  toneTag: "Soft",
  tags: ["griever", "hold", "soft"],
  meta: { tier: tierFromEncounterNumber(2), difficulty: 1, skillFocus: "read", trapType: "none" },
    },
    {
      encounterNumber: 3,
      difficulty: 1,
      guestStateActual: "Fancy",
      contextLine: "They’re checking if you have taste and standards.",
      guestLine: "“Do you have something more… refined?”",
      physicalCues: ["Slow scan of the list", "Raises eyebrow slightly"],
      verbalCues: ["“More refined.”", "“What’s your best glass?”"],
  toneTag: "Status",
  tags: ["fancy", "reflect", "status"],
  meta: { tier: tierFromEncounterNumber(3), difficulty: 1, skillFocus: "read", trapType: "none" },
    },
    {
      encounterNumber: 4,
      difficulty: 2,
      guestStateActual: "Bargain-Smart",
      contextLine: "They’re not cheap — they’re rational. They want proof.",
      guestLine: "“What’s the best value bottle here?”",
      physicalCues: ["Finger on price column", "Leans in slightly"],
      verbalCues: ["“Best value.”", "“Worth it for the price?”"],
  toneTag: "Proof",
  tags: ["bargain-smart", "hold", "value"],
  meta: { tier: tierFromEncounterNumber(4), difficulty: 2, skillFocus: "read", trapType: "none" },
    },
    {
      encounterNumber: 5,
      difficulty: 2,
      guestStateActual: "Celebrator",
      contextLine: "Energy is up — they want the moment to feel special.",
      guestLine: "“We’re celebrating — make it fun.”",
      physicalCues: ["Smiling", "Glances around the table"],
      verbalCues: ["“Make it fun.”", "“Something memorable.”"],
  toneTag: "Vibe",
  tags: ["celebrator", "lead", "vibe"],
  meta: { tier: tierFromEncounterNumber(5), difficulty: 2, skillFocus: "read", trapType: "none" },
    },
    {
      encounterNumber: 6,
      difficulty: 2,
      guestStateActual: "Decider",
      contextLine: "They’re decisive but impatient — don’t over-explain.",
      guestLine: "“Two options. Then we choose.”",
      physicalCues: ["Tap-tap on the menu", "Short nods"],
      verbalCues: ["“Two options.”", "“Keep it quick.”"],
  toneTag: "Impatient",
  tags: ["decider", "lead", "impatient"],
  meta: { tier: tierFromEncounterNumber(6), difficulty: 2, skillFocus: "read", trapType: "none" },
    },
    {
      encounterNumber: 7,
      difficulty: 3,
      guestStateActual: "Fancy",
      contextLine: "They want you to sound like you belong in their world.",
      guestLine: "“We like lighter reds… elegant.”",
      physicalCues: ["Tilts head", "Quiet confidence"],
      verbalCues: ["“Elegant.”", "“Not too heavy.”"],
  toneTag: "Elegant",
  tags: ["fancy", "reflect", "elegant"],
  meta: { tier: tierFromEncounterNumber(7), difficulty: 3, skillFocus: "read", trapType: "none" },
    },

    // --- Stage 2 (8–14) introduce more pressure / second-guessing ---
    {
      encounterNumber: 8,
      difficulty: 2,
      guestStateActual: "Griever",
      contextLine: "They’re anxious about choosing wrong — make it safe.",
      guestLine: "“I don’t want to mess this up.”",
      physicalCues: ["Small laugh", "Looks to friend for help"],
      verbalCues: ["“I don’t want to mess this up.”", "“We’re not wine people.”"],
  toneTag: "Anxious",
  tags: ["griever", "hold", "anxious"],
  meta: { tier: tierFromEncounterNumber(8), difficulty: 2, skillFocus: "read", trapType: "none" },
    },
    {
      encounterNumber: 9,
      difficulty: 3,
      guestStateActual: "Bargain-Smart",
      contextLine: "They’ll buy premium if you justify it like a pro.",
      guestLine: "“What makes this worth more?”",
      physicalCues: ["Points at two bottles", "Waits for your argument"],
      verbalCues: ["“Worth more?”", "“What’s the difference?”"],
  toneTag: "Compare",
  tags: ["bargain-smart", "hold", "compare"],
  meta: { tier: tierFromEncounterNumber(9), difficulty: 3, skillFocus: "read", trapType: "none" },
    },
    {
      encounterNumber: 10,
      difficulty: 3,
      guestStateActual: "Celebrator",
      contextLine: "They’re in a mood—your job is to elevate it, not teach.",
      guestLine: "“We want something with a story.”",
      physicalCues: ["Laughing", "Leans back relaxed"],
      verbalCues: ["“With a story.”", "“What’s your favorite?”"],
  toneTag: "High",
  tags: ["celebrator", "reflect", "story"],
  meta: { tier: tierFromEncounterNumber(10), difficulty: 3, skillFocus: "read", trapType: "none" },
    },
    {
      encounterNumber: 11,
      difficulty: 4,
      guestStateActual: "Fancy",
      contextLine: "They’re testing if you can be precise without rambling.",
      guestLine: "“What’s the style — old world or new world?”",
      physicalCues: ["Direct stare", "Small smirk"],
      verbalCues: ["“Old world or new world?”", "“Be specific.”"],
  toneTag: "Test",
  tags: ["fancy", "reflect", "test"],
  meta: { tier: tierFromEncounterNumber(11), difficulty: 4, skillFocus: "read", trapType: "none" },
    },
    {
      encounterNumber: 12,
      difficulty: 4,
      guestStateActual: "Decider",
      contextLine: "They want certainty; your hesitation loses the table.",
      guestLine: "“Just tell us what to do — we’re hungry.”",
      physicalCues: ["Glances at kitchen", "Menu closed"],
      verbalCues: ["“Tell us what to do.”", "“We’re hungry.”"],
  toneTag: "Now",
  tags: ["decider", "lead", "now"],
  meta: { tier: tierFromEncounterNumber(12), difficulty: 4, skillFocus: "read", trapType: "none" },
    },
    {
      encounterNumber: 13,
      difficulty: 4,
      guestStateActual: "Griever",
      contextLine: "They’re quietly resisting pressure — soften and simplify.",
      guestLine: "“Maybe we’ll just do water for now.”",
      physicalCues: ["Half smile", "Looks away"],
      verbalCues: ["“Just water.”", "“Maybe later.”"],
  toneTag: "Withdrawn",
  tags: ["griever", "hold", "withdrawn"],
  meta: { tier: tierFromEncounterNumber(13), difficulty: 4, skillFocus: "read", trapType: "none" },
    },
    {
      encounterNumber: 14,
      difficulty: 5,
      guestStateActual: "Bargain-Smart",
      contextLine: "They’ll challenge your claim. One weak answer = no sale.",
      guestLine: "“Is that actually good… or just expensive?”",
      physicalCues: ["Crossed arms", "Narrowed eyes"],
      verbalCues: ["“Actually good?”", "“Or just expensive?”"],
  toneTag: "Skeptical",
  tags: ["bargain-smart", "hold", "skeptical"],
  meta: { tier: tierFromEncounterNumber(14), difficulty: 5, skillFocus: "read", trapType: "none" },
    },

    // --- Stage 3 (15–20) advanced: social dynamics / higher stakes ---
    {
      encounterNumber: 15,
      difficulty: 3,
      guestStateActual: "Celebrator",
      contextLine: "They want a win the whole table agrees on.",
      guestLine: "“Something everyone will like.”",
      physicalCues: ["Looks around the table", "Group nods"],
      verbalCues: ["“Everyone will like.”", "“Crowd-pleaser.”"],
  toneTag: "Group",
  tags: ["celebrator", "lead", "group"],
  meta: { tier: tierFromEncounterNumber(15), difficulty: 3, skillFocus: "read", trapType: "none" },
    },
    {
      encounterNumber: 16,
      difficulty: 4,
      guestStateActual: "Fancy",
      contextLine: "They’re the alpha at the table — impress without trying too hard.",
      guestLine: "“We drink well. Surprise me.”",
      physicalCues: ["Leans back", "Confident smile"],
      verbalCues: ["“We drink well.”", "“Surprise me.”"],
  toneTag: "Power",
  tags: ["fancy", "reflect", "power"],
  meta: { tier: tierFromEncounterNumber(16), difficulty: 4, skillFocus: "read", trapType: "none" },
    },
    {
      encounterNumber: 17,
      difficulty: 4,
      guestStateActual: "Decider",
      contextLine: "They want a single decisive call but will punish fluff.",
      guestLine: "“One pick. No speech.”",
      physicalCues: ["Hand up (stop gesture)", "Quick eye contact"],
      verbalCues: ["“No speech.”", "“One pick.”"],
  toneTag: "NoFluff",
  tags: ["decider", "lead", "no-fluff"],
  meta: { tier: tierFromEncounterNumber(17), difficulty: 4, skillFocus: "read", trapType: "none" },
    },
    {
      encounterNumber: 18,
      difficulty: 5,
      guestStateActual: "Bargain-Smart",
      contextLine: "They negotiate emotionally: you must reframe value, not defend price.",
      guestLine: "“If we spend more, what do we *get*?”",
      physicalCues: ["Tilts head", "Waits"],
      verbalCues: ["“What do we get?”", "“Convince me.”"],
  toneTag: "Reframe",
  tags: ["bargain-smart", "hold", "reframe"],
  meta: { tier: tierFromEncounterNumber(18), difficulty: 5, skillFocus: "read", trapType: "none" },
    },
    {
      encounterNumber: 19,
      difficulty: 5,
      guestStateActual: "Griever",
      contextLine: "They’ll say yes only if it feels safe and effortless.",
      guestLine: "“I don’t want anything too intense.”",
      physicalCues: ["Soft voice", "Looks down at the list"],
      verbalCues: ["“Not too intense.”", "“Keep it simple.”"],
  toneTag: "Careful",
  tags: ["griever", "hold", "careful"],
  meta: { tier: tierFromEncounterNumber(19), difficulty: 5, skillFocus: "read", trapType: "none" },
    },
    {
      encounterNumber: 20,
      difficulty: 5,
      guestStateActual: "Fancy",
      contextLine: "They want you to lead with taste, not price or hype.",
      guestLine: "“What’s the most *elegant* bottle tonight?”",
      physicalCues: ["Still posture", "Long pause after asking"],
      verbalCues: ["“Most elegant.”", "“Not obvious.”"],
  toneTag: "Taste",
  tags: ["fancy", "reflect", "taste"],
  meta: { tier: tierFromEncounterNumber(20), difficulty: 5, skillFocus: "read", trapType: "none" },
    },
  ],
};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

export function getEncountersForTier(tier: "demo" | "premium"): Encounter[] {
  return tier === "demo" ? ENCOUNTERS.demo : ENCOUNTERS.premium;
}

export function getEncounterByNumber(n: number): Encounter | undefined {
  return [...ENCOUNTERS.demo, ...ENCOUNTERS.premium].find((e) => e.encounterNumber === n);
}

export function getNextEncounterNumber(tier: "demo" | "premium", currentNumber: number): number | null {
  const list = getEncountersForTier(tier).slice().sort((a, b) => a.encounterNumber - b.encounterNumber);
  const idx = list.findIndex((e) => e.encounterNumber === currentNumber);
  if (idx < 0) return list[0]?.encounterNumber ?? null;
  return list[idx + 1]?.encounterNumber ?? null;
}

// ------------------------------------------------------------
// Validation (call once at boot, fail loud in dev)
// ------------------------------------------------------------

function assert(cond: any, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function normalizeEncounterNumber(n: any): number {
  const num = typeof n === "string" ? parseInt(n, 10) : n;
  return Number.isFinite(num) ? num : NaN;
}

function validateList(list: any[], label: string) {
  assert(Array.isArray(list), `[encounters] ${label} must be an array`);

  const seen = new Set<number>();
  const dupes = new Set<number>();

  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    assert(e && typeof e === "object", `[encounters] ${label}[${i}] must be an object`);

    const n = normalizeEncounterNumber((e as any).encounterNumber);
    assert(Number.isFinite(n), `[encounters] ${label}[${i}] encounterNumber must be a number`);

    // Force it back onto the object so later code is consistent
    (e as any).encounterNumber = n;

    if (seen.has(n)) dupes.add(n);
    seen.add(n);

    // Minimal required fields (tighten later)
    assert(typeof (e as any).guestStateActual === "string" && (e as any).guestStateActual.length,
      `[encounters] ${label}[${i}] missing guestStateActual`);

    assert(typeof (e as any).contextLine === "string" && (e as any).contextLine.length,
      `[encounters] ${label}[${i}] missing contextLine`);

    assert(typeof (e as any).guestLine === "string" && (e as any).guestLine.length,
      `[encounters] ${label}[${i}] missing guestLine`);
  }

  if (dupes.size) {
    console.error(`[encounters] ${label} duplicates:`, Array.from(dupes));
    // Throw the *first* duplicate number in a stable way
    const first = Array.from(dupes)[0];
    throw new Error(`[encounters] Duplicate encounterNumber: ${first} (${label})`);
  }
}

export function validateEncounters(pack: EncounterPack) {
  assert(pack && typeof pack === "object", `[encounters] pack missing`);

  // Validate each list independently (NO cross-contamination)
  validateList((pack as any).demo, "demo");
  validateList((pack as any).premium, "premium");

  // Optional: sanity check expected counts (comment out if you don't want it)
  // assert(pack.demo.length > 0, "[encounters] demo list is empty");
  // assert(pack.premium.length > 0, "[encounters] premium list is empty");
}
