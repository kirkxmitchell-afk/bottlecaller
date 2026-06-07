import type {
  EncounterReactionMap,
  EncounterV2,
  ProductCategory,
  RecommendAngle,
  ServiceStage,
} from "./typesV2";

type EncounterSeed = EncounterV2;

function makeReactionMap(
  partial: EncounterReactionMap = {},
): EncounterReactionMap {
  return {
    ask: partial.ask || {},
    recommend: partial.recommend || {},
    commit: partial.commit || {},
  };
}

function makeEncounter(seed: EncounterSeed): EncounterV2 {
  return {
    ...seed,
    visualClues: Array.isArray(seed.visualClues) ? seed.visualClues : [],
    allowedProductIds: Array.isArray(seed.allowedProductIds) ? seed.allowedProductIds : [],
    guestReactions: makeReactionMap(seed.guestReactions),
    foodOrder: seed.foodOrder || null,
  };
}

export function validateEncounterV2(encounter: EncounterV2): string[] {
  const errors: string[] = [];

  if (!encounter.id) errors.push("missing id");
  if (!encounter.title) errors.push("missing title");
  if (!encounter.masterProfile) errors.push("missing masterProfile");
  if (!encounter.scene) errors.push("missing scene");
  if (!encounter.verbalClue) errors.push("missing verbalClue");
  if (!encounter.contextClue) errors.push("missing contextClue");
  if (!Array.isArray(encounter.visualClues) || encounter.visualClues.length === 0) {
    errors.push("missing visualClues");
  }
  if (!Array.isArray(encounter.idealRhythm) || encounter.idealRhythm.length === 0) {
    errors.push("missing idealRhythm");
  }
  if (!encounter.choiceLines?.ask || !encounter.choiceLines?.recommend || !encounter.choiceLines?.commit) {
    errors.push("missing choiceLines");
  }
  if (
    encounter.targetProductId == null &&
    encounter.targetProductCategory == null &&
    (!Array.isArray(encounter.allowedProductIds) || encounter.allowedProductIds.length === 0)
  ) {
    errors.push("missing product targeting");
  }

  return errors;
}

export function validateEncounterSet(encounters: EncounterV2[]): Record<string, string[]> {
  return (Array.isArray(encounters) ? encounters : []).reduce<Record<string, string[]>>((acc, encounter) => {
    const errors = validateEncounterV2(encounter);
    if (errors.length) acc[encounter.id || `unknown_${Object.keys(acc).length}`] = errors;
    return acc;
  }, {});
}

function buildCommonChoiceLines() {
  return {
    ask: {
      preference: "What kinds of wines do you usually enjoy?",
      occasion: "What kind of moment are you having tonight?",
      experience: "Have you tried much South African wine before?",
      budget: "Would you like me to keep this comfortable, or step it up a little?",
    },
    recommend: {
      flavour: "This one gives you the cleanest flavour fit for the table.",
      story: "This bottle tells the most interesting local story on the list.",
      value: "This is the smartest spend for what you're trying to achieve.",
      confidence: "If I were landing this table cleanly, this is where I'd go.",
    },
    commit: {
      recommendation: "If you want the strongest overall fit, I'd put this bottle on the table.",
      assumption: "Perfect, I'll get that opened for you.",
      celebration: "This is the bottle that will make the moment feel right.",
      value: "This is the smartest bottle for the spend.",
    },
  } as const;
}

const COMMON_LINES = buildCommonChoiceLines();

function makeTier1Encounter(args: {
  id: string;
  title: string;
  family: string;
  modifier: string;
  hiddenPressure: string;
  masterProfile: EncounterV2["masterProfile"];
  variant: EncounterV2["variant"];
  scene: string;
  visualClues: string[];
  verbalClue: string;
  contextClue: string;
  redHerring: string;
  lesson: string;
  serviceStage?: ServiceStage;
  targetProductId?: string | null;
  targetProductCategory?: ProductCategory | null;
  targetRecommendAngle: RecommendAngle;
  allowedProductIds?: string[];
  reactions?: EncounterReactionMap;
}): EncounterV2 {
  return makeEncounter({
    id: args.id,
    title: args.title,
    tier: 1,
    difficulty: "easy",
    family: args.family,
    modifier: args.modifier,
    hiddenPressure: args.hiddenPressure,
    masterProfile: args.masterProfile,
    variant: args.variant,
    startingProgress: 2,
    startingFrustration: 0,
    idealRhythm: ["ask", "recommend", "commit"],
    scene: args.scene,
    visualClues: args.visualClues,
    verbalClue: args.verbalClue,
    contextClue: args.contextClue,
    redHerring: args.redHerring,
    lesson: args.lesson,
    rewards: {
      premiumSuccess: 30,
      standardSuccess: 20,
      weakSuccess: 10,
      neutralExit: 5,
      failure: -15,
    },
    choiceLines: {
      ask: { ...COMMON_LINES.ask },
      recommend: { ...COMMON_LINES.recommend },
      commit: { ...COMMON_LINES.commit },
    },
    guestReactions: makeReactionMap(args.reactions),
    serviceStage: args.serviceStage || "opening",
    targetProductId: args.targetProductId || null,
    targetProductCategory: args.targetProductCategory || null,
    targetRecommendAngle: args.targetRecommendAngle,
    allowedProductIds: args.allowedProductIds || [],
  });
}

export const TIER1_VERTICAL_SLICE_ENCOUNTERS: EncounterV2[] = [
  makeTier1Encounter({
    id: "encounter_v2_001",
    title: "First Taste of South Africa",
    family: "tourist",
    modifier: "first_visit",
    hiddenPressure: "wants_local_experience",
    masterProfile: "discovery",
    variant: null,
    scene:
      "A couple sits near the window, taking in the room and scanning the local section of the wine list together.",
    visualClues: [
      "They keep looking at unfamiliar wine names.",
      "They seem excited rather than tense.",
      "They are taking in the room as part of the experience.",
    ],
    verbalClue: "We've never been here before. We'd love to try something local.",
    contextClue: "They sound like visitors and want the dinner to feel connected to place.",
    redHerring: "They are well dressed, which could tempt you to oversell luxury instead of local discovery.",
    lesson:
      "These guests did not need the most expensive bottle. They needed a local story they could feel good about choosing.",
    targetProductId: "product_001",
    targetRecommendAngle: "story",
    allowedProductIds: ["product_001", "product_002", "product_003"],
    reactions: {
      ask: {
        experience: {
          optimal: "Honestly, not really. That's exactly why we wanted your help.",
        },
        budget: {
          disaster: "Price isn't really the point. We wanted to try something local.",
        },
      },
      recommend: {
        story: {
          optimal: "That sounds exactly like what we were hoping for.",
        },
        value: {
          disaster: "We weren't really trying to choose on price.",
        },
      },
      commit: {
        recommendation: {
          optimal: "Perfect. Let's do that.",
        },
      },
    },
  }),
  makeTier1Encounter({
    id: "encounter_v2_002",
    title: "The Family Bill",
    family: "family",
    modifier: "price_awareness",
    hiddenPressure: "smart_spend",
    masterProfile: "reassurance",
    variant: "smart_value",
    scene:
      "A family of four is scanning the list carefully while checking the rest of the bill.",
    visualClues: [
      "One guest is watching the price column closely.",
      "The energy is practical, not celebratory.",
      "They are trying to keep the evening comfortable rather than flashy.",
    ],
    verbalClue: "Is there something worth it without going crazy on price?",
    contextClue: "They are open to spending, but only if the choice feels defensible.",
    redHerring: "They may look like they are simply cheap, but the real pressure is wanting to feel smart, not small.",
    lesson:
      "Value guests want to feel justified. The best path is not apology or luxury theatre, but a clear smart-spend answer.",
    targetProductId: "product_003",
    targetRecommendAngle: "value",
    allowedProductIds: ["product_001", "product_002", "product_003"],
    reactions: {
      ask: {
        budget: {
          optimal: "Yes, exactly. We don't mind spending, we just want it to make sense.",
        },
      },
      recommend: {
        value: {
          optimal: "That's the kind of answer we were looking for.",
        },
        story: {
          disaster: "We don't really need the backstory if it costs more.",
        },
      },
      commit: {
        value: {
          optimal: "Great. Let's go with that.",
        },
      },
    },
  }),
  makeTier1Encounter({
    id: "encounter_v2_003",
    title: "The Birthday Table",
    family: "celebration",
    modifier: "birthday",
    hiddenPressure: "keep_the_moment_moving",
    masterProfile: "momentum",
    variant: "celebration",
    scene:
      "A birthday table is already smiling and leaning forward, ready for the night to gather momentum.",
    visualClues: [
      "The table is lively and emotionally open.",
      "Guests are looking for a bottle that lifts the occasion.",
      "They do not want a long technical conversation.",
    ],
    verbalClue: "It's her birthday. We want the bottle to feel right.",
    contextClue: "The table needs energy and occasion more than a lecture or too many questions.",
    redHerring: "A romantic-feeling bottle might sound elegant, but if it slows the table down it is still the wrong move.",
    lesson:
      "Celebration tables reward momentum. The best move is one that lifts the night quickly and confidently.",
    targetProductId: "product_002",
    targetRecommendAngle: "confidence",
    allowedProductIds: ["product_001", "product_002", "product_003"],
    reactions: {
      ask: {
        experience: {
          disaster: "We're not really trying to turn this into homework.",
        },
        occasion: {
          optimal: "Exactly. We just want the right bottle for tonight.",
        },
      },
      recommend: {
        confidence: {
          optimal: "Perfect. That's the kind of lead we needed.",
        },
      },
      commit: {
        celebration: {
          optimal: "Yes. That's the bottle.",
        },
      },
    },
  }),
];

export function getTier1VerticalSliceEncounters(): EncounterV2[] {
  return TIER1_VERTICAL_SLICE_ENCOUNTERS.slice();
}
