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
  | "too-much-info"
  | "group-consensus"
  | "proof-demand"
  | "ego-risk"
  | "speed-pressure"
  | "identity-cue"
  | "vibe-amplify"
  | "precision-test";

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

export type EncounterStepChoice = {
  text: string;
  correct: boolean;
};

export type EncounterStepFeedback = {
  correct: string;
  wrong: string;
};

export type EncounterStep = {
  stage: "read" | "recommend" | "close" | string;
  skillFocus: SkillFocus | "frame";
  prompt: string;
  choices: EncounterStepChoice[];
  feedback: EncounterStepFeedback;
};

export type EncounterVariation = {
  id: string;
  label?: string;
  difficulty?: Array<"easy" | "medium" | "hard">;
  contextLine?: string;
  guestLine?: string;
  physicalCues?: string[];
  verbalCues?: string[];
  pressureBias?: {
    openness?: number;
    resistance?: number;
    confidence?: number;
    urgency?: number;
  } | null;
  trapProfile?: {
    hook?: string;
    delivery?: string;
    pivot?: string;
  } | null;
  notes?: string;
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
  steps?: EncounterStep[];
  variations?: EncounterVariation[];
};

export type EncounterPack = {
  demo: Encounter[];
  premium: Encounter[];
};

export type MakeVariationEncounterInput = {
  encounterNumber: number;
  guestStateActual: GuestState;
  skillFocus: SkillFocus;
  baseContextLine: string;
  baseGuestLine: string;
  basePhysicalCues?: string[];
  baseVerbalCues?: string[];
  variations?: EncounterVariation[];
};

export function makeVariationEncounter({
  encounterNumber,
  guestStateActual,
  skillFocus,
  baseContextLine,
  baseGuestLine,
  basePhysicalCues = [],
  baseVerbalCues = [],
  variations = []
}: MakeVariationEncounterInput): Encounter {
  return {
    encounterNumber,
    guestStateActual,
    meta: {
      tier: tierFromEncounterNumber(encounterNumber),
      difficulty: 3,
      skillFocus,
      trapType: "none"
    },
    contextLine: baseContextLine || "",
    guestLine: baseGuestLine || "",
    physicalCues: Array.isArray(basePhysicalCues) ? basePhysicalCues : [],
    verbalCues: Array.isArray(baseVerbalCues) ? baseVerbalCues : [],
    variations: Array.isArray(variations) ? variations : []
  };
}

export function tierFromEncounterNumber(n: number): 1 | 2 | 3 {
  if (n >= 1 && n <= 5) return 1;
  if (n >= 6 && n <= 12) return 2;
  return 3; // 13..20
}

// ------------------------------------------------------------
// ✅ AUTHOR HERE
// ------------------------------------------------------------
/*
ENCOUNTER CONVERSION WORKSHEET

Encounter Number:
Guest Family:
Skill Focus:

Core lesson:
Best mode:
Best hook:
Best delivery tone:
Most tempting wrong instinct:

A = baseline readable
B = alternate flavor
C = medium pressure
D = hard anti-pattern
E = hard urgency/complexity

Check before shipping:
[ ] All 5 still teach the same lesson
[ ] Easy only shows A/B
[ ] Medium shows A/B/C
[ ] Hard shows A/B/C/D/E
[ ] Trap profiles differ meaningfully
[ ] Pressure biases differ meaningfully
[ ] No variation contradicts the guest family
[ ] Reflection still reads cleanly
*/

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
      guestStateActual: "Decider",
      contextLine: "They want a clean decision with minimal talk.",
      guestLine: "“Just pick something good — we’ll trust you.”",
      physicalCues: ["Menu half-closed", "Looks up immediately"],
      verbalCues: ["“Just pick something good.”", "“What would you order?”"],
      toneTag: "Fast",
      tags: ["decider", "lead", "fast"], // optional / non-validated
      meta: {
        tier: tierFromEncounterNumber(1),
        difficulty: 1,
        skillFocus: "read",
        trapType: "none",
      },
    },
    {
      encounterNumber: 2,
      guestStateActual: "Griever",
      contextLine: "They look tired. They want safety, not performance.",
      guestLine: "“I don’t really know wine… something easy?”",
      physicalCues: ["Soft voice", "Avoids eye contact"],
      verbalCues: ["“Something easy.”", "“Not too heavy.”"],
      toneTag: "Soft",
      tags: ["griever", "hold", "soft"],
      meta: {
        tier: tierFromEncounterNumber(2),
        difficulty: 1,
        skillFocus: "read",
        trapType: "none",
      },
    },
    {
      encounterNumber: 3,
      guestStateActual: "Fancy",
      contextLine: "They’re checking if you have taste and standards.",
      guestLine: "“Do you have something more… refined?”",
      physicalCues: ["Slow scan of the list", "Raises eyebrow slightly"],
      verbalCues: ["“More refined.”", "“What’s your best glass?”"],
      toneTag: "Status",
      tags: ["fancy", "reflect", "status"],
      meta: {
        tier: tierFromEncounterNumber(3),
        difficulty: 1,
        skillFocus: "read",
        trapType: "status-test",
      },
    },
    {
      encounterNumber: 4,
      guestStateActual: "Bargain-Smart",
      contextLine: "They’re not cheap — they’re rational. They want proof.",
      guestLine: "“What’s the best value bottle here?”",
      physicalCues: ["Finger on price column", "Leans in slightly"],
      verbalCues: ["“Best value.”", "“Worth it for the price?”"],
      toneTag: "Proof",
      tags: ["bargain-smart", "hold", "value"],
      meta: {
        tier: tierFromEncounterNumber(4),
        difficulty: 2,
        skillFocus: "read",
        trapType: "value-bait",
      },
    },
    {
      encounterNumber: 5,
      guestStateActual: "Celebrator",
      contextLine: "Energy is up — they want the moment to feel special.",
      guestLine: "“We’re celebrating — make it fun.”",
      physicalCues: ["Smiling", "Glances around the table"],
      verbalCues: ["“Make it fun.”", "“Something memorable.”"],
      toneTag: "Vibe",
      tags: ["celebrator", "lead", "vibe"],
      meta: {
        tier: tierFromEncounterNumber(5),
        difficulty: 2,
        skillFocus: "read",
        trapType: "none",
      },
    },
    {
      encounterNumber: 6,
      difficulty: 2,
      guestStateActual: "Decider",
      contextLine: "The guest wants help narrowing the choice.",
      guestLine: "I just need something good.",
      physicalCues: [
        "glances between two bottles",
        "keeps returning to the list"
      ],
      verbalCues: [
        "They want the choice made simpler.",
        "They are ready to move if someone narrows the field confidently."
      ],
      toneTag: "Narrowing",
      tags: ["decider", "guide", "narrowing"],
      meta: { tier: tierFromEncounterNumber(6), difficulty: 2, skillFocus: "mode", trapType: "none" },
      variations: [
        {
          id: "A",
          label: "clean_narrowing",
          difficulty: ["easy", "medium", "hard"],

          contextLine: "The guest wants help narrowing the choice quickly.",
          guestLine: "I just need something good without overthinking it.",
          physicalCues: [
            "glances between two bottles",
            "looks ready to order"
          ],
          verbalCues: [
            "They want the choice made simpler.",
            "They are waiting for a confident steer."
          ],

          pressureBias: {
            openness: 0.02,
            resistance: -0.02,
            confidence: 0.00,
            urgency: 0.08
          },

          trapProfile: {
            hook: "vague",
            delivery: "balanced",
            pivot: "impatience"
          },

          notes: "Core readable version. Good first decider."
        },
        {
          id: "B",
          label: "soft_indecision",
          difficulty: ["easy", "medium", "hard"],

          contextLine: "The guest is open, but keeps circling the list.",
          guestLine: "I'm stuck between a few options.",
          physicalCues: [
            "looks back and forth between the menu and the table",
            "pauses before speaking"
          ],
          verbalCues: [
            "They sound open but indecisive.",
            "They do not want more information - they want less friction."
          ],

          pressureBias: {
            openness: 0.00,
            resistance: 0.03,
            confidence: -0.05,
            urgency: 0.02
          },

          trapProfile: {
            hook: "balanced",
            delivery: "vague",
            pivot: "confusion"
          },

          notes: "Alternate flavor. Softer uncertainty."
        },
        {
          id: "C",
          label: "decision_fatigue",
          difficulty: ["medium", "hard"],

          contextLine: "The guest looks slightly worn down by too many options.",
          guestLine: "I don't want to overthink this anymore.",
          physicalCues: [
            "exhales while looking at the list",
            "stops reading midway down the page"
          ],
          verbalCues: [
            "They want less decision work, not more detail.",
            "They are ready to move if the recommendation becomes clean."
          ],

          pressureBias: {
            openness: -0.03,
            resistance: 0.04,
            confidence: -0.04,
            urgency: 0.12
          },

          trapProfile: {
            hook: "pushy",
            delivery: "rushed",
            pivot: "impatience"
          },

          notes: "Medium pressure. Tempts rushed simplification."
        },
        {
          id: "D",
          label: "guarded_decider",
          difficulty: ["hard"],

          contextLine: "The guest wants clarity, but is wary of being pushed.",
          guestLine: "I just want the right bottle, not a sales pitch.",
          physicalCues: [
            "raises an eyebrow when recommendations start coming too fast",
            "leans back slightly"
          ],
          verbalCues: [
            "They want direction, but not pressure.",
            "They may resist if the recommendation feels too forceful."
          ],

          pressureBias: {
            openness: -0.08,
            resistance: 0.12,
            confidence: -0.06,
            urgency: 0.04
          },

          trapProfile: {
            hook: "pushy",
            delivery: "pushy",
            pivot: "resistance"
          },

          notes: "Hard anti-pressure variant."
        },
        {
          id: "E",
          label: "high_stakes_choice",
          difficulty: ["hard"],

          contextLine: "The guest wants to choose quickly, but feels the bottle matters.",
          guestLine: "Can you just point me to the best fit here?",
          physicalCues: [
            "looks ready to commit",
            "wants the recommendation landed fast"
          ],
          verbalCues: [
            "They want a clear recommendation quickly.",
            "They do not want a long walk through options."
          ],

          pressureBias: {
            openness: 0.01,
            resistance: 0.00,
            confidence: -0.03,
            urgency: 0.15
          },

          trapProfile: {
            hook: "practical",
            delivery: "rushed",
            pivot: "impatience"
          },

          notes: "Hard urgency variant."
        }
      ]
    },
    {
      encounterNumber: 7,
      difficulty: 3,
      guestStateActual: "Griever",
      contextLine: "The guest wants reassurance more than excitement.",
      guestLine: "I'm not very confident choosing wine.",
      physicalCues: [
        "keeps scanning the list without settling",
        "looks cautious before responding"
      ],
      verbalCues: [
        "They need reassurance before they move.",
        "They seem more worried about risk than excited about wine."
      ],
      toneTag: "Reassuring",
      tags: ["griever", "hook", "risk-reduction"],
      meta: { tier: tierFromEncounterNumber(7), difficulty: 3, skillFocus: "hook", trapType: "none" },
      variations: [
        {
          id: "A",
          label: "gentle_reassurance",
          difficulty: ["easy", "medium", "hard"],

          contextLine: "The guest looks cautious and wants the choice to feel safe.",
          guestLine: "I'm just not very confident with wine.",
          physicalCues: [
            "glances at the list, then back to you",
            "hesitates before speaking"
          ],
          verbalCues: [
            "They need reassurance before they move.",
            "They are looking for safety."
          ],

          pressureBias: {
            openness: 0.00,
            resistance: -0.02,
            confidence: -0.06,
            urgency: 0.00
          },

          trapProfile: {
            hook: "balanced",
            delivery: "vague",
            pivot: "hesitation"
          },

          notes: "Core reassuring Griever. Best for validating flavour-first support."
        },
        {
          id: "B",
          label: "fear_of_regret",
          difficulty: ["easy", "medium", "hard"],

          contextLine: "The guest seems afraid of making the wrong choice.",
          guestLine: "I just don't want to regret ordering it.",
          physicalCues: [
            "reads the wine list slowly",
            "looks slightly tense when options are mentioned"
          ],
          verbalCues: [
            "They seem afraid of choosing wrong.",
            "They are waiting for reassurance before committing."
          ],

          pressureBias: {
            openness: -0.03,
            resistance: 0.04,
            confidence: -0.08,
            urgency: 0.01
          },

          trapProfile: {
            hook: "vague",
            delivery: "balanced",
            pivot: "confusion"
          },

          notes: "Softer anxiety. Tempts fuzzy reassurance."
        },
        {
          id: "C",
          label: "hesitant_commitment",
          difficulty: ["medium", "hard"],

          contextLine: "The guest needs the risk of the choice reduced before they commit.",
          guestLine: "I want to feel sure before I say yes.",
          physicalCues: [
            "leans in, but does not look settled",
            "seems close to deciding, but not comfortable"
          ],
          verbalCues: [
            "They want the spend to feel emotionally safe.",
            "They may shut down if the recommendation feels too strong."
          ],

          pressureBias: {
            openness: -0.02,
            resistance: 0.06,
            confidence: -0.10,
            urgency: 0.04
          },

          trapProfile: {
            hook: "vague",
            delivery: "pushy",
            pivot: "hesitation"
          },

          notes: "Medium pressure. Wrong confidence can backfire."
        },
        {
          id: "D",
          label: "guarded_refusal_edge",
          difficulty: ["hard"],

          contextLine: "The guest's hesitation is close to turning into refusal.",
          guestLine: "I really don't want to make a bad call here.",
          physicalCues: [
            "pulls back when recommendations sound too certain",
            "looks guarded and unconvinced"
          ],
          verbalCues: [
            "They may shut down if the recommendation feels too risky or too strong.",
            "They are looking for safety, not persuasion."
          ],

          pressureBias: {
            openness: -0.08,
            resistance: 0.14,
            confidence: -0.12,
            urgency: 0.02
          },

          trapProfile: {
            hook: "pushy",
            delivery: "pushy",
            pivot: "resistance"
          },

          notes: "Hard anti-pressure variant. Strong punishment for force."
        },
        {
          id: "E",
          label: "fragile_yes_moment",
          difficulty: ["hard"],

          contextLine: "The guest could say yes, but only if the recommendation feels genuinely safe.",
          guestLine: "I'm nervous about committing to the wrong one.",
          physicalCues: [
            "looks ready to decide, but still uneasy",
            "wants reassurance before landing"
          ],
          verbalCues: [
            "They need calm certainty, not a hard sell.",
            "They want to feel safe saying yes."
          ],

          pressureBias: {
            openness: 0.01,
            resistance: 0.08,
            confidence: -0.10,
            urgency: 0.06
          },

          trapProfile: {
            hook: "practical",
            delivery: "vague",
            pivot: "hesitation"
          },

          notes: "Hard fragile-yes variant. Tests safe closing."
        }
      ]
    },

    // --- Stage 2 (8–14) introduce more pressure / second-guessing ---
    {
      encounterNumber: 8,
      difficulty: 2,
      guestStateActual: "Fancy",
      contextLine: "The guest wants the bottle to feel like part of the experience.",
      guestLine: "I'm after something refined.",
      physicalCues: [
        "reads the list with care",
        "responds to tone as much as content"
      ],
      verbalCues: [
        "They respond to tone and refinement.",
        "They want the bottle to feel intentionally chosen."
      ],
      toneTag: "Polished",
      tags: ["fancy", "hook", "elevate"],
      meta: { tier: tierFromEncounterNumber(8), difficulty: 2, skillFocus: "hook", trapType: "none" },
      variations: [
        {
          id: "A",
          label: "polished_recommendation",
          difficulty: ["easy", "medium", "hard"],

          contextLine: "The guest wants the bottle to feel considered, not just expensive.",
          guestLine: "I'd like something that feels elevated.",
          physicalCues: [
            "listens closely to how the recommendation is framed",
            "shows interest when the tone feels polished"
          ],
          verbalCues: [
            "They respond to refinement and tone.",
            "They want the bottle to feel intentionally chosen."
          ],

          pressureBias: {
            openness: 0.03,
            resistance: 0.00,
            confidence: 0.00,
            urgency: 0.00
          },

          trapProfile: {
            hook: "romantic",
            delivery: "balanced",
            pivot: "hesitation"
          },

          notes: "Core Fancy baseline. Story should feel premium and natural."
        },
        {
          id: "B",
          label: "taste_sensitive_guest",
          difficulty: ["easy", "medium", "hard"],

          contextLine: "The guest is listening for whether the recommendation feels thoughtful.",
          guestLine: "I want something with a bit more character.",
          physicalCues: [
            "seems interested, but selective",
            "reacts subtly to wording"
          ],
          verbalCues: [
            "They care about the feel of the recommendation.",
            "They are sensitive to whether the recommendation feels thoughtful."
          ],

          pressureBias: {
            openness: 0.00,
            resistance: 0.03,
            confidence: -0.02,
            urgency: 0.00
          },

          trapProfile: {
            hook: "balanced",
            delivery: "romantic",
            pivot: "confusion"
          },

          notes: "Alternative Fancy. Tests thoughtful vs generic language."
        },
        {
          id: "C",
          label: "anti_generic_fancy",
          difficulty: ["medium", "hard"],

          contextLine: "The guest notices quickly if the recommendation feels generic.",
          guestLine: "I want this to feel a little more special.",
          physicalCues: [
            "stays attentive, but not easily impressed",
            "seems to lose interest when phrasing feels ordinary"
          ],
          verbalCues: [
            "They are sensitive to whether the recommendation feels generic.",
            "They want the bottle to feel distinctive, not merely expensive."
          ],

          pressureBias: {
            openness: -0.02,
            resistance: 0.05,
            confidence: 0.00,
            urgency: 0.02
          },

          trapProfile: {
            hook: "flavour",
            delivery: "balanced",
            pivot: "confusion"
          },

          notes: "Medium pressure. Penalizes generic polish."
        },
        {
          id: "D",
          label: "high_standard_tone_test",
          difficulty: ["hard"],

          contextLine: "The guest's standards are high and the tone matters.",
          guestLine: "I don't want something obvious.",
          physicalCues: [
            "becomes cooler when the recommendation feels too direct",
            "expects elegance without effort"
          ],
          verbalCues: [
            "They are judging the recommendation as much as the bottle.",
            "They will disengage if the recommendation feels obvious or flat."
          ],

          pressureBias: {
            openness: -0.05,
            resistance: 0.10,
            confidence: -0.02,
            urgency: 0.00
          },

          trapProfile: {
            hook: "practical",
            delivery: "pushy",
            pivot: "resistance"
          },

          notes: "Hard anti-obvious variant. Great for testing tone failure."
        },
        {
          id: "E",
          label: "considered_choice_pressure",
          difficulty: ["hard"],

          contextLine: "The guest wants the bottle to feel properly chosen, not merely recommended.",
          guestLine: "I want it to feel considered.",
          physicalCues: [
            "is open, but exacting",
            "wants the recommendation to carry style and intention"
          ],
          verbalCues: [
            "They want the bottle to feel like part of the experience.",
            "They notice whether the recommendation lands with taste."
          ],

          pressureBias: {
            openness: 0.01,
            resistance: 0.06,
            confidence: -0.03,
            urgency: 0.03
          },

          trapProfile: {
            hook: "romantic",
            delivery: "romantic",
            pivot: "hesitation"
          },

          notes: "Hard selective Fancy. Tests polish without drift into fluff."
        }
      ]
    },
    {
      encounterNumber: 9,
      difficulty: 3,
      guestStateActual: "Bargain-Smart",
      contextLine: "The guest wants confidence that the bottle is worth the spend.",
      guestLine: "I don't mind spending if it makes sense.",
      physicalCues: [
        "checks the price before the bottle name",
        "looks interested but not persuaded yet"
      ],
      verbalCues: [
        "They care about whether it's worth it.",
        "They want the spend to feel justified."
      ],
      toneTag: "Value",
      tags: ["bargain-smart", "hook", "justify-spend"],
      meta: { tier: tierFromEncounterNumber(9), difficulty: 3, skillFocus: "hook", trapType: "none" },
      variations: [
        {
          id: "A",
          label: "clear_value_case",
          difficulty: ["easy", "medium", "hard"],

          contextLine: "The guest is open to spending, but only if the logic is clear.",
          guestLine: "I want something that's worth it.",
          physicalCues: [
            "reads prices carefully",
            "seems ready to listen if the case is made well"
          ],
          verbalCues: [
            "They are price-aware without being closed.",
            "They want a good reason to spend."
          ],

          pressureBias: {
            openness: 0.01,
            resistance: 0.00,
            confidence: 0.00,
            urgency: 0.00
          },

          trapProfile: {
            hook: "practical",
            delivery: "balanced",
            pivot: "confusion"
          },

          notes: "Core readable value-first version."
        },
        {
          id: "B",
          label: "smart_spend_test",
          difficulty: ["easy", "medium", "hard"],

          contextLine: "The guest is mentally comparing price to quality.",
          guestLine: "I'm looking for the smart choice here.",
          physicalCues: [
            "compares options rather than reacting emotionally",
            "listens for justification"
          ],
          verbalCues: [
            "They're looking for the smartest trade-off.",
            "They want the recommendation to feel justified, not inflated."
          ],

          pressureBias: {
            openness: 0.00,
            resistance: 0.04,
            confidence: -0.02,
            urgency: 0.00
          },

          trapProfile: {
            hook: "balanced",
            delivery: "vague",
            pivot: "objection"
          },

          notes: "Alternative value-rational read. Punishes weak justification."
        },
        {
          id: "C",
          label: "price_step_up",
          difficulty: ["medium", "hard"],

          contextLine: "The guest may spend more, but only if the bottle clearly earns it.",
          guestLine: "I don't mind paying more if there's a clear step up.",
          physicalCues: [
            "looks open to upgrade, but skeptical",
            "waits for a clean value case"
          ],
          verbalCues: [
            "They want the spend to feel justified.",
            "They are testing whether the recommendation holds up."
          ],

          pressureBias: {
            openness: -0.01,
            resistance: 0.05,
            confidence: -0.03,
            urgency: 0.02
          },

          trapProfile: {
            hook: "story",
            delivery: "vague",
            pivot: "objection"
          },

          notes: "Medium pressure. Tempts emotional oversell instead of justification."
        },
        {
          id: "D",
          label: "anti_fluff_value",
          difficulty: ["hard"],

          contextLine: "The guest will disengage if the recommendation sounds inflated or fluffy.",
          guestLine: "I need a reason this is worth the extra money.",
          physicalCues: [
            "stays cool when phrasing becomes too romantic",
            "wants logic, not atmosphere"
          ],
          verbalCues: [
            "They need the recommendation to feel justified, not inflated.",
            "They care more about the smart case than the mood."
          ],

          pressureBias: {
            openness: -0.04,
            resistance: 0.10,
            confidence: -0.03,
            urgency: 0.03
          },

          trapProfile: {
            hook: "romantic",
            delivery: "romantic",
            pivot: "resistance"
          },

          notes: "Hard anti-fluff variant. Great for punishing story-heavy overreach."
        },
        {
          id: "E",
          label: "justify_it_cleanly",
          difficulty: ["hard"],

          contextLine: "The guest is ready to buy if the recommendation makes sharp practical sense.",
          guestLine: "I need to understand why this is the smart spend.",
          physicalCues: [
            "looks ready to commit, but still analytical",
            "wants the recommendation landed cleanly"
          ],
          verbalCues: [
            "They want the spend to feel justified quickly.",
            "They are open, but only to a recommendation that makes practical sense."
          ],

          pressureBias: {
            openness: 0.02,
            resistance: 0.04,
            confidence: -0.01,
            urgency: 0.08
          },

          trapProfile: {
            hook: "practical",
            delivery: "rushed",
            pivot: "impatience"
          },

          notes: "Hard urgency + value logic variant. Tests clean justification under pressure."
        }
      ]
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
      guestStateActual: "Griever",
      contextLine: "They’re quietly resisting pressure — soften and simplify.",
      guestLine: "“Maybe we’ll just do water for now.”",
      physicalCues: ["Half smile", "Looks away"],
      verbalCues: ["“Just water.”", "“Maybe later.”"],
      toneTag: "Withdrawn",
      tags: ["griever", "hold", "withdrawn"],
      meta: {
        tier: tierFromEncounterNumber(13),
        difficulty: 4,
        skillFocus: "pivot",
        trapType: "silence",
      },
    },
    {
      encounterNumber: 14,
      guestStateActual: "Bargain-Smart",
      contextLine: "They’ll challenge your claim. One weak answer = no sale.",
      guestLine: "“Is that actually good… or just expensive?”",
      physicalCues: ["Crossed arms", "Narrowed eyes"],
      verbalCues: ["“Actually good?”", "“Or just expensive?”"],
      toneTag: "Skeptical",
      tags: ["bargain-smart", "hold", "skeptical"],
      meta: {
        tier: tierFromEncounterNumber(14),
        difficulty: 5,
        skillFocus: "hook",
        trapType: "price-pushback",
      },
    },

    // --- Stage 3 (15–20) advanced: social dynamics / higher stakes ---
    {
      encounterNumber: 15,
      guestStateActual: "Celebrator",
      contextLine: "They want a win the whole table agrees on.",
      guestLine: "“Something everyone will like.”",
      physicalCues: ["Looks around the table", "Group nods"],
      verbalCues: ["“Everyone will like.”", "“Crowd-pleaser.”"],
      toneTag: "Group",
      tags: ["celebrator", "lead", "group"],
      meta: {
        tier: tierFromEncounterNumber(15),
        difficulty: 4,
        skillFocus: "delivery",
        trapType: "group-consensus",
      },
    },
    {
      encounterNumber: 16,
      guestStateActual: "Fancy",
      contextLine: "They’re the alpha at the table — impress without trying too hard.",
      guestLine: "“We drink well. Surprise me.”",
      physicalCues: ["Leans back", "Confident smile"],
      verbalCues: ["“We drink well.”", "“Surprise me.”"],
      toneTag: "Power",
      tags: ["fancy", "reflect", "power"],
      meta: {
        tier: tierFromEncounterNumber(16),
        difficulty: 4,
        skillFocus: "delivery",
        trapType: "status-test",
      },
    },
    {
      encounterNumber: 17,
      guestStateActual: "Decider",
      contextLine: "They want a single decisive call but will punish fluff.",
      guestLine: "“One pick. No speech.”",
      physicalCues: ["Hand up (stop gesture)", "Quick eye contact"],
      verbalCues: ["“No speech.”", "“One pick.”"],
      toneTag: "NoFluff",
      tags: ["decider", "lead", "no-fluff"],
      meta: {
        tier: tierFromEncounterNumber(17),
        difficulty: 4,
        skillFocus: "pivot",
        trapType: "too-much-info",
      },
    },
    {
      encounterNumber: 18,
      guestStateActual: "Bargain-Smart",
      contextLine: "They negotiate emotionally: you must reframe value, not defend price.",
      guestLine: "“If we spend more, what do we *get*?”",
      physicalCues: ["Tilts head", "Waits"],
      verbalCues: ["“What do we get?”", "“Convince me.”"],
      toneTag: "Reframe",
      tags: ["bargain-smart", "hold", "reframe"],
      meta: {
        tier: tierFromEncounterNumber(18),
        difficulty: 5,
        skillFocus: "hook",
        trapType: "proof-demand",
      },
    },
    {
      encounterNumber: 19,
      guestStateActual: "Griever",
      contextLine: "They’ll say yes only if it feels safe and effortless.",
      guestLine: "“I don’t want anything too intense.”",
      physicalCues: ["Soft voice", "Looks down at the list"],
      verbalCues: ["“Not too intense.”", "“Keep it simple.”"],
      toneTag: "Careful",
      tags: ["griever", "hold", "careful"],
      meta: {
        tier: tierFromEncounterNumber(19),
        difficulty: 5,
        skillFocus: "pivot",
        trapType: "ego-risk",
      },
    },
    {
      encounterNumber: 20,
      guestStateActual: "Fancy",
      contextLine: "They want you to lead with taste, not price or hype.",
      guestLine: "“What’s the most *elegant* bottle tonight?”",
      physicalCues: ["Still posture", "Long pause after asking"],
      verbalCues: ["“Most elegant.”", "“Not obvious.”"],
      toneTag: "Taste",
      tags: ["fancy", "reflect", "taste"],
      meta: {
        tier: tierFromEncounterNumber(20),
        difficulty: 5,
        skillFocus: "delivery",
        trapType: "status-test",
      },
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

export function validateEncounters(pack: EncounterPack): void {
  function assert(cond: any, msg: string) {
    if (!cond) throw new Error(msg);
  }

  function findDupes(list: any[], label: string) {
    const seen = new Set<number>();
    const dupes = new Set<number>();
    for (const e of list) {
      const n = e?.encounterNumber;
      if (seen.has(n)) dupes.add(n);
      seen.add(n);
    }
    if (dupes.size) {
      throw new Error(`[encounters] Duplicate encounterNumber in ${label}: ${Array.from(dupes).join(", ")}`);
    }
  }

  function validateList(list: any[], label: string) {
    assert(Array.isArray(list), `[encounters] ${label} must be an array`);
    assert(list.length > 0, `[encounters] ${label} is empty`);

    findDupes(list, label);

    for (const e of list) {
      assert(typeof e.encounterNumber === "number", `[encounters] ${label} missing encounterNumber`);
      assert(e.encounterNumber >= 1, `[encounters] ${label} encounterNumber must be >= 1`);

      assert(typeof e.guestStateActual === "string", `[encounters] ${label} #${e.encounterNumber} missing guestStateActual`);
      assert(typeof e.contextLine === "string" && e.contextLine.length > 0, `[encounters] ${label} #${e.encounterNumber} missing contextLine`);
      assert(typeof e.guestLine === "string" && e.guestLine.length > 0, `[encounters] ${label} #${e.encounterNumber} missing guestLine`);

      assert(Array.isArray(e.physicalCues), `[encounters] ${label} #${e.encounterNumber} physicalCues must be array`);
      assert(Array.isArray(e.verbalCues), `[encounters] ${label} #${e.encounterNumber} verbalCues must be array`);

      assert(e.meta && typeof e.meta === "object", `[encounters] ${label} #${e.encounterNumber} missing meta`);
      assert([1, 2, 3].includes(e.meta.tier), `[encounters] ${label} #${e.encounterNumber} meta.tier must be 1|2|3`);
      assert([1, 2, 3, 4, 5].includes(e.meta.difficulty), `[encounters] ${label} #${e.encounterNumber} meta.difficulty must be 1..5`);
      assert(typeof e.meta.skillFocus === "string", `[encounters] ${label} #${e.encounterNumber} meta.skillFocus missing`);
      assert(typeof e.meta.trapType === "string", `[encounters] ${label} #${e.encounterNumber} meta.trapType missing`);

      // Tier must match encounterNumber bucket (prevents accidental mis-tagging)
      const expectedTier = tierFromEncounterNumber(e.encounterNumber);
      assert(
        e.meta.tier === expectedTier,
        `[encounters] ${label} #${e.encounterNumber} meta.tier is ${e.meta.tier} but should be ${expectedTier}`
      );
    }
  }

  validateList(pack.demo, "demo");
  validateList(pack.premium, "premium");
}
