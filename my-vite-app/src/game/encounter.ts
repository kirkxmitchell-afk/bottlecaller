// src/game/encounters.ts
// BottleCaller Encounter Authoring v1
// Single source of truth for authored encounters (demo + premium)
// - Pure data + validation helpers
// - No DOM, no storage, no engine imports

export type Stage = 1 | 2 | 3;
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type GuestState = "Decider" | "Fancy" | "Griever" | "Celebrator" | "Bargain-Smart";

export type EncounterTier = "demo" | "premium";

export type Encounter = {
  id: number; // unique
  tier: EncounterTier; // demo/premium
  stage: Stage;
  difficulty: Difficulty;

  // What the UI shows in Step 1 (Observe)
  guestStateActual: GuestState;
  contextLine: string;
  guestLine: string;

  physicalCues: string[];
  verbalCues: string[];

  toneTag?: string;

  // Optional: if you want deterministic wine selection per encounter
  // (demo currently uses wine = wines[demoStep], premium random)
  wineIndexHint?: number; // e.g. 0..LIMIT-1
};

export type EncounterPack = {
  demo: Encounter[];     // usually 2
  premium: Encounter[];  // usually 20
};

// ------------------------------------------------------------
// ✅ AUTHOR HERE
// ------------------------------------------------------------

export const ENCOUNTERS: EncounterPack = {
  demo: [
    {
      id: 1,
      tier: "demo",
      stage: 1,
      difficulty: 1,
      guestStateActual: "Decider",
      contextLine: "They scan the list fast, ready to choose.",
      guestLine: "“We’re in a bit of a rush.”",
      physicalCues: ["Phone on table, glancing at time", "Direct eye contact, waiting"],
      verbalCues: ["“We’re in a bit of a rush.”", "“What’s your best?”"],
      toneTag: "Direct",
      wineIndexHint: 0,
    },
    {
      id: 2,
      tier: "demo",
      stage: 1,
      difficulty: 1,
      guestStateActual: "Bargain-Smart",
      contextLine: "They scan prices carefully and test your confidence.",
      guestLine: "“Is there something worth it without going crazy?”",
      physicalCues: ["Points at the price column", "Pages through wine list quickly"],
      verbalCues: ["“Is there something worth it without going crazy?”", "“What’s the best value here?”"],
      toneTag: "Testing",
      wineIndexHint: 1,
    },
  ],

  premium: [
    // --- Stage 1 (1–7) learn the loop ---
    {
      id: 101,
      tier: "premium",
      stage: 1,
      difficulty: 1,
      guestStateActual: "Decider",
      contextLine: "They want a clean decision with minimal talk.",
      guestLine: "“Just pick something good — we’ll trust you.”",
      physicalCues: ["Menu half-closed", "Looks up immediately"],
      verbalCues: ["“Just pick something good.”", "“What would you order?”"],
      toneTag: "Fast",
    },
    {
      id: 102,
      tier: "premium",
      stage: 1,
      difficulty: 1,
      guestStateActual: "Griever",
      contextLine: "They look tired. They want safety, not performance.",
      guestLine: "“I don’t really know wine… something easy?”",
      physicalCues: ["Soft voice", "Avoids eye contact"],
      verbalCues: ["“Something easy.”", "“Not too heavy.”"],
      toneTag: "Soft",
    },
    {
      id: 103,
      tier: "premium",
      stage: 1,
      difficulty: 1,
      guestStateActual: "Fancy",
      contextLine: "They’re checking if you have taste and standards.",
      guestLine: "“Do you have something more… refined?”",
      physicalCues: ["Slow scan of the list", "Raises eyebrow slightly"],
      verbalCues: ["“More refined.”", "“What’s your best glass?”"],
      toneTag: "Status",
    },
    {
      id: 104,
      tier: "premium",
      stage: 1,
      difficulty: 2,
      guestStateActual: "Bargain-Smart",
      contextLine: "They’re not cheap — they’re rational. They want proof.",
      guestLine: "“What’s the best value bottle here?”",
      physicalCues: ["Finger on price column", "Leans in slightly"],
      verbalCues: ["“Best value.”", "“Worth it for the price?”"],
      toneTag: "Proof",
    },
    {
      id: 105,
      tier: "premium",
      stage: 1,
      difficulty: 2,
      guestStateActual: "Celebrator",
      contextLine: "Energy is up — they want the moment to feel special.",
      guestLine: "“We’re celebrating — make it fun.”",
      physicalCues: ["Smiling", "Glances around the table"],
      verbalCues: ["“Make it fun.”", "“Something memorable.”"],
      toneTag: "Vibe",
    },
    {
      id: 106,
      tier: "premium",
      stage: 1,
      difficulty: 2,
      guestStateActual: "Decider",
      contextLine: "They’re decisive but impatient — don’t over-explain.",
      guestLine: "“Two options. Then we choose.”",
      physicalCues: ["Tap-tap on the menu", "Short nods"],
      verbalCues: ["“Two options.”", "“Keep it quick.”"],
      toneTag: "Impatient",
    },
    {
      id: 107,
      tier: "premium",
      stage: 1,
      difficulty: 3,
      guestStateActual: "Fancy",
      contextLine: "They want you to sound like you belong in their world.",
      guestLine: "“We like lighter reds… elegant.”",
      physicalCues: ["Tilts head", "Quiet confidence"],
      verbalCues: ["“Elegant.”", "“Not too heavy.”"],
      toneTag: "Elegant",
    },

    // --- Stage 2 (8–14) introduce more pressure / second-guessing ---
    {
      id: 108,
      tier: "premium",
      stage: 2,
      difficulty: 2,
      guestStateActual: "Griever",
      contextLine: "They’re anxious about choosing wrong — make it safe.",
      guestLine: "“I don’t want to mess this up.”",
      physicalCues: ["Small laugh", "Looks to friend for help"],
      verbalCues: ["“I don’t want to mess this up.”", "“We’re not wine people.”"],
      toneTag: "Anxious",
    },
    {
      id: 109,
      tier: "premium",
      stage: 2,
      difficulty: 3,
      guestStateActual: "Bargain-Smart",
      contextLine: "They’ll buy premium if you justify it like a pro.",
      guestLine: "“What makes this worth more?”",
      physicalCues: ["Points at two bottles", "Waits for your argument"],
      verbalCues: ["“Worth more?”", "“What’s the difference?”"],
      toneTag: "Compare",
    },
    {
      id: 110,
      tier: "premium",
      stage: 2,
      difficulty: 3,
      guestStateActual: "Celebrator",
      contextLine: "They’re in a mood—your job is to elevate it, not teach.",
      guestLine: "“We want something with a story.”",
      physicalCues: ["Laughing", "Leans back relaxed"],
      verbalCues: ["“With a story.”", "“What’s your favorite?”"],
      toneTag: "High",
    },
    {
      id: 111,
      tier: "premium",
      stage: 2,
      difficulty: 4,
      guestStateActual: "Fancy",
      contextLine: "They’re testing if you can be precise without rambling.",
      guestLine: "“What’s the style — old world or new world?”",
      physicalCues: ["Direct stare", "Small smirk"],
      verbalCues: ["“Old world or new world?”", "“Be specific.”"],
      toneTag: "Test",
    },
    {
      id: 112,
      tier: "premium",
      stage: 2,
      difficulty: 4,
      guestStateActual: "Decider",
      contextLine: "They want certainty; your hesitation loses the table.",
      guestLine: "“Just tell us what to do — we’re hungry.”",
      physicalCues: ["Glances at kitchen", "Menu closed"],
      verbalCues: ["“Tell us what to do.”", "“We’re hungry.”"],
      toneTag: "Now",
    },
    {
      id: 113,
      tier: "premium",
      stage: 2,
      difficulty: 4,
      guestStateActual: "Griever",
      contextLine: "They’re quietly resisting pressure — soften and simplify.",
      guestLine: "“Maybe we’ll just do water for now.”",
      physicalCues: ["Half smile", "Looks away"],
      verbalCues: ["“Just water.”", "“Maybe later.”"],
      toneTag: "Withdrawn",
    },
    {
      id: 114,
      tier: "premium",
      stage: 2,
      difficulty: 5,
      guestStateActual: "Bargain-Smart",
      contextLine: "They’ll challenge your claim. One weak answer = no sale.",
      guestLine: "“Is that actually good… or just expensive?”",
      physicalCues: ["Crossed arms", "Narrowed eyes"],
      verbalCues: ["“Actually good?”", "“Or just expensive?”"],
      toneTag: "Skeptical",
    },

    // --- Stage 3 (15–20) advanced: social dynamics / higher stakes ---
    {
      id: 115,
      tier: "premium",
      stage: 3,
      difficulty: 3,
      guestStateActual: "Celebrator",
      contextLine: "They want a win the whole table agrees on.",
      guestLine: "“Something everyone will like.”",
      physicalCues: ["Looks around the table", "Group nods"],
      verbalCues: ["“Everyone will like.”", "“Crowd-pleaser.”"],
      toneTag: "Group",
    },
    {
      id: 116,
      tier: "premium",
      stage: 3,
      difficulty: 4,
      guestStateActual: "Fancy",
      contextLine: "They’re the alpha at the table — impress without trying too hard.",
      guestLine: "“We drink well. Surprise me.”",
      physicalCues: ["Leans back", "Confident smile"],
      verbalCues: ["“We drink well.”", "“Surprise me.”"],
      toneTag: "Power",
    },
    {
      id: 117,
      tier: "premium",
      stage: 3,
      difficulty: 4,
      guestStateActual: "Decider",
      contextLine: "They want a single decisive call but will punish fluff.",
      guestLine: "“One pick. No speech.”",
      physicalCues: ["Hand up (stop gesture)", "Quick eye contact"],
      verbalCues: ["“No speech.”", "“One pick.”"],
      toneTag: "NoFluff",
    },
    {
      id: 118,
      tier: "premium",
      stage: 3,
      difficulty: 5,
      guestStateActual: "Bargain-Smart",
      contextLine: "They negotiate emotionally: you must reframe value, not defend price.",
      guestLine: "“If we spend more, what do we *get*?”",
      physicalCues: ["Tilts head", "Waits"],
      verbalCues: ["“What do we get?”", "“Convince me.”"],
      toneTag: "Reframe",
    },
    {
      id: 119,
      tier: "premium",
      stage: 3,
      difficulty: 5,
      guestStateActual: "Griever",
      contextLine: "They’ll say yes only if it feels safe and effortless.",
      guestLine: "“I don’t want anything too intense.”",
      physicalCues: ["Soft voice", "Looks down at the list"],
      verbalCues: ["“Not too intense.”", "“Keep it simple.”"],
      toneTag: "Careful",
    },
    {
      id: 120,
      tier: "premium",
      stage: 3,
      difficulty: 5,
      guestStateActual: "Fancy",
      contextLine: "They want you to lead with taste, not price or hype.",
      guestLine: "“What’s the most *elegant* bottle tonight?”",
      physicalCues: ["Still posture", "Long pause after asking"],
      verbalCues: ["“Most elegant.”", "“Not obvious.”"],
      toneTag: "Taste",
    },
  ],
};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

export function getEncountersForTier(tier: EncounterTier): Encounter[] {
  return tier === "demo" ? ENCOUNTERS.demo : ENCOUNTERS.premium;
}

export function getEncounterById(id: number): Encounter | undefined {
  return [...ENCOUNTERS.demo, ...ENCOUNTERS.premium].find((e) => e.id === id);
}

export function getNextEncounterId(tier: EncounterTier, currentId: number): number | null {
  const list = getEncountersForTier(tier).slice().sort((a, b) => a.id - b.id);
  const idx = list.findIndex((e) => e.id === currentId);
  if (idx < 0) return list[0]?.id ?? null;
  return list[idx + 1]?.id ?? null;
}

// ------------------------------------------------------------
// Validation (call once at boot, fail loud in dev)
// ------------------------------------------------------------

export function validateEncounters(pack: EncounterPack = ENCOUNTERS): { ok: true } {
  const all = [...pack.demo, ...pack.premium];

  // Unique ids
  const seen = new Set<number>();
  for (const e of all) {
    if (seen.has(e.id)) throw new Error(`[encounters] Duplicate id: ${e.id}`);
    seen.add(e.id);
  }

  // Tier correctness
  for (const e of pack.demo) if (e.tier !== "demo") throw new Error(`[encounters] demo encounter ${e.id} tier != demo`);
  for (const e of pack.premium) if (e.tier !== "premium") throw new Error(`[encounters] premium encounter ${e.id} tier != premium`);

  // Required fields
  for (const e of all) {
    if (!e.contextLine?.trim()) throw new Error(`[encounters] ${e.id} missing contextLine`);
    if (!e.guestLine?.trim()) throw new Error(`[encounters] ${e.id} missing guestLine`);
    if (!Array.isArray(e.physicalCues) || e.physicalCues.length === 0) throw new Error(`[encounters] ${e.id} missing physicalCues`);
    if (!Array.isArray(e.verbalCues) || e.verbalCues.length === 0) throw new Error(`[encounters] ${e.id} missing verbalCues`);
  }

  // Expectations
  if (pack.demo.length !== 2) console.warn(`[encounters] demo length is ${pack.demo.length} (expected 2)`);
  if (pack.premium.length < 20) console.warn(`[encounters] premium length is ${pack.premium.length} (expected >= 20)`);

  return { ok: true };
}
