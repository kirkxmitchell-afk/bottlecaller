import type {
  AskType,
  CommitType,
  ChoiceQuality,
  EncounterGuestResponseMap,
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

function makeGuestResponseMap(
  partial: EncounterGuestResponseMap = {},
): EncounterGuestResponseMap {
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
    guestResponses: makeGuestResponseMap(seed.guestResponses),
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

type ResponseLineMap<T extends string> = Record<T, { text: string; quality: ChoiceQuality }>;

function makeResponseSet(args: {
  ask: ResponseLineMap<AskType>;
  recommend: ResponseLineMap<RecommendAngle>;
  commit: ResponseLineMap<CommitType>;
}): EncounterGuestResponseMap {
  return args;
}

function buildGuestResponsesForFamily(family: string): EncounterGuestResponseMap {
  const packs: Record<string, EncounterGuestResponseMap> = {
    tourist: makeResponseSet({
      ask: {
        preference: {
          text: "Usually French reds, but we wanted to try something different while we're here.",
          quality: "poor",
        },
        occasion: {
          text: "No, not really. We're just visiting and wanted dinner to feel a bit local.",
          quality: "good",
        },
        experience: {
          text: "Honestly, not really. That's exactly why we wanted your help.",
          quality: "optimal",
        },
        budget: {
          text: "Er... price isn't really the main thing. We just wanted to try something local.",
          quality: "disaster",
        },
      },
      recommend: {
        flavour: {
          text: "That helps. We wanted something local, but not too heavy.",
          quality: "good",
        },
        story: {
          text: "That sounds exactly like what we were hoping for.",
          quality: "optimal",
        },
        value: {
          text: "Er... we're not really choosing based on price tonight.",
          quality: "disaster",
        },
        confidence: {
          text: "Okay... but why that one for us?",
          quality: "poor",
        },
      },
      commit: {
        recommendation: {
          text: "Perfect. Let's do that.",
          quality: "optimal",
        },
        assumption: {
          text: "Alright, that sounds good.",
          quality: "good",
        },
        celebration: {
          text: "Maybe... but we're not really celebrating anything.",
          quality: "poor",
        },
        value: {
          text: "No, we said we wanted something local.",
          quality: "disaster",
        },
      },
    }),
    skeptic: makeResponseSet({
      ask: {
        preference: {
          text: "Good. I usually like something elegant, not heavy.",
          quality: "optimal",
        },
        occasion: {
          text: "Dinner. Nothing dramatic. I just want the choice to make sense.",
          quality: "good",
        },
        experience: {
          text: "I've had enough wine to know when someone is guessing.",
          quality: "poor",
        },
        budget: {
          text: "Er... that is exactly the sort of question I was hoping to avoid.",
          quality: "disaster",
        },
      },
      recommend: {
        flavour: {
          text: "That might work. What makes it more elegant than the others?",
          quality: "poor",
        },
        story: {
          text: "That feels more considered. Keep going.",
          quality: "optimal",
        },
        value: {
          text: "No, I did not ask for the bargain bottle.",
          quality: "disaster",
        },
        confidence: {
          text: "Maybe. Confidence is fine, but I need a reason.",
          quality: "poor",
        },
      },
      commit: {
        recommendation: {
          text: "Alright. That sounds like you actually read the table.",
          quality: "optimal",
        },
        assumption: {
          text: "I guess that could work. Let's try it.",
          quality: "good",
        },
        celebration: {
          text: "That sounds a bit theatrical for what I asked.",
          quality: "poor",
        },
        value: {
          text: "No. You're still making this about price.",
          quality: "disaster",
        },
      },
    }),
    regular: makeResponseSet({
      ask: {
        preference: {
          text: "Exactly. You remember we like a red that is easy but not boring.",
          quality: "optimal",
        },
        occasion: {
          text: "Nothing special. Just our usual kind of night.",
          quality: "poor",
        },
        experience: {
          text: "You know us by now. We don't need the basics again.",
          quality: "good",
        },
        budget: {
          text: "Um... same sort of spend as usual, I suppose.",
          quality: "poor",
        },
      },
      recommend: {
        flavour: {
          text: "That sounds like us.",
          quality: "optimal",
        },
        story: {
          text: "We don't need the whole story tonight.",
          quality: "disaster",
        },
        value: {
          text: "Maybe, but don't make it feel like we're downgrading.",
          quality: "poor",
        },
        confidence: {
          text: "If you think it is in our lane, we'll listen.",
          quality: "good",
        },
      },
      commit: {
        recommendation: {
          text: "Yes, that is the one.",
          quality: "optimal",
        },
        assumption: {
          text: "Alright, if you think that keeps it familiar.",
          quality: "good",
        },
        celebration: {
          text: "Not really a celebration tonight. Just keep it comfortable.",
          quality: "poor",
        },
        value: {
          text: "Er... we did not ask for the value pick.",
          quality: "disaster",
        },
      },
    }),
    family: makeResponseSet({
      ask: {
        preference: {
          text: "We are flexible, as long as everyone at the table can enjoy it.",
          quality: "good",
        },
        occasion: {
          text: "Just family dinner. Nothing too fancy.",
          quality: "poor",
        },
        experience: {
          text: "We know enough to enjoy it, but not enough to gamble on something strange.",
          quality: "good",
        },
        budget: {
          text: "Yes, exactly. We don't mind spending, we just want it to make sense.",
          quality: "optimal",
        },
      },
      recommend: {
        flavour: {
          text: "That sounds easy enough for everyone.",
          quality: "good",
        },
        story: {
          text: "Um... we don't really need the backstory if it costs more.",
          quality: "disaster",
        },
        value: {
          text: "That's the kind of answer we were looking for.",
          quality: "optimal",
        },
        confidence: {
          text: "Maybe. Is it actually worth it for the table?",
          quality: "poor",
        },
      },
      commit: {
        recommendation: {
          text: "Alright, that sounds fair.",
          quality: "good",
        },
        assumption: {
          text: "I guess so, as long as it is not a big jump.",
          quality: "poor",
        },
        celebration: {
          text: "No, it's not that kind of dinner.",
          quality: "disaster",
        },
        value: {
          text: "Great. Let's go with that.",
          quality: "optimal",
        },
      },
    }),
    date: makeResponseSet({
      ask: {
        preference: {
          text: "Something smooth would be nice. Nothing too heavy.",
          quality: "good",
        },
        occasion: {
          text: "Yes, exactly. Something that fits the mood without making it a whole production.",
          quality: "optimal",
        },
        experience: {
          text: "We know a little, but we don't want to make this too technical.",
          quality: "poor",
        },
        budget: {
          text: "Er... that is not really the feeling we were going for.",
          quality: "disaster",
        },
      },
      recommend: {
        flavour: {
          text: "That sounds elegant but easy.",
          quality: "optimal",
        },
        story: {
          text: "That sounds nice, as long as it doesn't become a lecture.",
          quality: "good",
        },
        value: {
          text: "We're not really trying to make this about value.",
          quality: "disaster",
        },
        confidence: {
          text: "Maybe... but keep it relaxed.",
          quality: "poor",
        },
      },
      commit: {
        recommendation: {
          text: "That feels right. Let's do that.",
          quality: "optimal",
        },
        assumption: {
          text: "Alright, that sounds nice.",
          quality: "good",
        },
        celebration: {
          text: "I guess, but maybe not too showy.",
          quality: "poor",
        },
        value: {
          text: "No, we don't want the evening to feel like a price decision.",
          quality: "disaster",
        },
      },
    }),
    private_table: makeResponseSet({
      ask: {
        preference: {
          text: "Light and easy would be good.",
          quality: "optimal",
        },
        occasion: {
          text: "We're really just trying to keep it quiet tonight.",
          quality: "disaster",
        },
        experience: {
          text: "Um... we don't need much detail. Something simple is fine.",
          quality: "poor",
        },
        budget: {
          text: "I guess just keep it sensible.",
          quality: "good",
        },
      },
      recommend: {
        flavour: {
          text: "That sounds simple enough. Thank you.",
          quality: "optimal",
        },
        story: {
          text: "Not really... we don't need the story tonight.",
          quality: "poor",
        },
        value: {
          text: "Fine, as long as it is easy.",
          quality: "good",
        },
        confidence: {
          text: "Okay, but we do not need a big sell.",
          quality: "poor",
        },
      },
      commit: {
        recommendation: {
          text: "Yes, that is fine.",
          quality: "optimal",
        },
        assumption: {
          text: "Please do not rush us.",
          quality: "disaster",
        },
        celebration: {
          text: "No, that's too much for us tonight.",
          quality: "disaster",
        },
        value: {
          text: "Alright, that should be okay.",
          quality: "good",
        },
      },
    }),
    celebration: makeResponseSet({
      ask: {
        preference: {
          text: "Something everyone can enjoy, but still special.",
          quality: "good",
        },
        occasion: {
          text: "Exactly. We just want the right bottle for tonight.",
          quality: "optimal",
        },
        experience: {
          text: "We're not really trying to turn this into homework.",
          quality: "disaster",
        },
        budget: {
          text: "Maybe... but don't make the birthday feel cheap.",
          quality: "poor",
        },
      },
      recommend: {
        flavour: {
          text: "That sounds nice. Will it feel festive enough?",
          quality: "good",
        },
        story: {
          text: "Cute, but can we keep the night moving?",
          quality: "poor",
        },
        value: {
          text: "Er... it's her birthday. We're not starting with value.",
          quality: "disaster",
        },
        confidence: {
          text: "Perfect. That's the kind of lead we needed.",
          quality: "optimal",
        },
      },
      commit: {
        recommendation: {
          text: "Yes, let's do it.",
          quality: "good",
        },
        assumption: {
          text: "Alright, bring it. We trust you.",
          quality: "good",
        },
        celebration: {
          text: "Yes. That's the bottle.",
          quality: "optimal",
        },
        value: {
          text: "No, don't make this about the spend.",
          quality: "disaster",
        },
      },
    }),
    business_table: makeResponseSet({
      ask: {
        preference: {
          text: "Something polished but easy for everyone.",
          quality: "good",
        },
        occasion: {
          text: "Business dinner. Something easy for everyone to agree on.",
          quality: "optimal",
        },
        experience: {
          text: "We do not need a wine lesson.",
          quality: "disaster",
        },
        budget: {
          text: "Um... just keep it appropriate.",
          quality: "poor",
        },
      },
      recommend: {
        flavour: {
          text: "Sounds fine, but can you land the decision?",
          quality: "poor",
        },
        story: {
          text: "Maybe, but keep it brief.",
          quality: "good",
        },
        value: {
          text: "Not really the point at this table.",
          quality: "disaster",
        },
        confidence: {
          text: "Good. That is the kind of clean answer we needed.",
          quality: "optimal",
        },
      },
      commit: {
        recommendation: {
          text: "That works. Bring that.",
          quality: "good",
        },
        assumption: {
          text: "Yes. Please bring that.",
          quality: "optimal",
        },
        celebration: {
          text: "No, this is not a celebration table.",
          quality: "disaster",
        },
        value: {
          text: "Maybe, but do not make it sound like a compromise.",
          quality: "poor",
        },
      },
    }),
    collector: makeResponseSet({
      ask: {
        preference: {
          text: "I like bottles that feel specific to where they come from.",
          quality: "optimal",
        },
        occasion: {
          text: "No special occasion. I just want something with a point of view.",
          quality: "good",
        },
        experience: {
          text: "I know the basics. You can skip those.",
          quality: "poor",
        },
        budget: {
          text: "That is not really the filter I am using.",
          quality: "disaster",
        },
      },
      recommend: {
        flavour: {
          text: "Maybe. What makes it more than just tasty?",
          quality: "good",
        },
        story: {
          text: "Good. That is actually interesting.",
          quality: "optimal",
        },
        value: {
          text: "No, I am not asking for the value pick.",
          quality: "disaster",
        },
        confidence: {
          text: "Confident is fine, but why that bottle?",
          quality: "poor",
        },
      },
      commit: {
        recommendation: {
          text: "Yes. Let's try it.",
          quality: "optimal",
        },
        assumption: {
          text: "Alright, if that is the most specific choice.",
          quality: "good",
        },
        celebration: {
          text: "Not really. I am not looking for theatre.",
          quality: "poor",
        },
        value: {
          text: "No, value is not what makes this interesting.",
          quality: "disaster",
        },
      },
    }),
    crew: makeResponseSet({
      ask: {
        preference: {
          text: "Something reliable. We have an early start.",
          quality: "good",
        },
        occasion: {
          text: "Nothing special. Just a good bottle before we head out tomorrow.",
          quality: "poor",
        },
        experience: {
          text: "We know the place. Just help us choose well.",
          quality: "poor",
        },
        budget: {
          text: "Exactly. We want the smart spend, not the show-off bottle.",
          quality: "optimal",
        },
      },
      recommend: {
        flavour: {
          text: "That sounds easy enough. Is it the smart one?",
          quality: "good",
        },
        story: {
          text: "We do not need the tourist story tonight.",
          quality: "disaster",
        },
        value: {
          text: "That is the answer we wanted.",
          quality: "optimal",
        },
        confidence: {
          text: "Maybe, but don't overcomplicate it.",
          quality: "poor",
        },
      },
      commit: {
        recommendation: {
          text: "Alright, that works.",
          quality: "good",
        },
        assumption: {
          text: "I guess, as long as it is the sensible choice.",
          quality: "poor",
        },
        celebration: {
          text: "No, we're not trying to make a night of it.",
          quality: "disaster",
        },
        value: {
          text: "Perfect. Bring that one.",
          quality: "optimal",
        },
      },
    }),
  };

  return packs[family] || packs.tourist;
}

function makeTier1Encounter(args: {
  id: string;
  title: string;
  family: string;
  modifier: string;
  hiddenPressure: string;
  masterProfile: EncounterV2["masterProfile"];
  variant: EncounterV2["variant"];
  scene: string;
  sceneClue?: string;
  images?: EncounterV2["images"];
  visualClues: string[];
  verbalClue: string;
  contextClue: string;
  redHerring: string;
  lesson: string;
  serviceStage?: ServiceStage;
  targetProductId?: string | null;
  targetProductCategory?: ProductCategory | null;
  targetRecommendAngle: RecommendAngle;
  recommendScoring?: Partial<Record<RecommendAngle, ChoiceQuality>>;
  allowedProductIds?: string[];
  reactions?: EncounterReactionMap;
  guestResponses?: EncounterGuestResponseMap;
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
    startingProgress: 0,
    startingFrustration: 0,
    idealRhythm: ["ask", "recommend", "commit"],
    scene: args.scene,
    sceneClue: args.sceneClue,
    images: args.images,
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
    guestResponses: makeGuestResponseMap(args.guestResponses || buildGuestResponsesForFamily(args.family)),
    serviceStage: args.serviceStage || "opening",
    targetProductId: args.targetProductId || null,
    targetProductCategory: args.targetProductCategory || null,
    targetRecommendAngle: args.targetRecommendAngle,
    recommendScoring: args.recommendScoring || {},
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
    sceneClue: "Visitors scanning the local wine section.",
    images: {
      previewArt: "/game/encounters/001/preview-art.png",
      mainNeutral: "/game/encounters/001/main-neutral.png",
      mainPositive: "/game/encounters/001/main-positive.png",
      mainNegative: "/game/encounters/001/main-negative.png",
      endSuccessArt: "/game/encounters/001/end-success-art.png",
      endFailureArt: "/game/encounters/001/end-failure-art.png",
      neutralExitArt: "/game/encounters/001/neutral-exit-art.png",
    },
    visualClues: [
      "They keep looking at unfamiliar wine names.",
      "They seem excited rather than tense.",
      "They are taking in the room as part of the experience.",
    ],
    verbalClue: "We've never been here before. We'd love to try something local.",
    contextClue: "They sound like visitors and want the dinner to feel connected to place.",
    redHerring: "They are well dressed, which could tempt you to oversell luxury instead of local discovery.",
    lesson:
      "These guests needed a local story they could feel good about choosing. Price framing or rushing the close misses why they asked for help.",
    targetProductId: "product_cartology_chenin",
    targetRecommendAngle: "story",
    recommendScoring: {
      flavour: "good",
      story: "optimal",
      value: "poor",
      confidence: "good",
    },
    allowedProductIds: ["product_cartology_chenin", "product_uva_mira_cabernet", "product_valmoissine_pinot_noir"],
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
    title: "The Skeptic",
    family: "skeptic",
    modifier: "testing_confidence",
    hiddenPressure: "needs_to_feel_seen",
    masterProfile: "recognition",
    variant: null,
    scene:
      "A guest keeps the list open but watches you more than the page, testing whether you actually understand the table.",
    sceneClue: "Confident guest tests whether you understand the table.",
    images: {
      previewArt: "/game/encounters/002/preview-art.png",
      mainNeutral: "/game/encounters/002/main-neutral.png",
      mainPositive: "/game/encounters/002/main-positive.png",
      mainNegative: "/game/encounters/002/main-negative.png",
      endSuccessArt: "/game/encounters/002/end-success-art.png",
      endFailureArt: "/game/encounters/002/end-failure-art.png",
      neutralExitArt: "/game/encounters/002/neutral-exit-art.png",
    },
    visualClues: [
      "They pause before answering and study your confidence.",
      "They have marked a few familiar-looking bottles.",
      "Their tone is controlled, not confused.",
    ],
    verbalClue: "I know what I like, so don't just give me the usual pitch.",
    contextClue: "They want recognition and relevance before they will trust a recommendation.",
    redHerring: "Their confidence can tempt you into trying to prove yourself instead of first showing that you understand them.",
    lesson:
      "Skeptical guests do not need a speech. They need one precise read that proves you are listening.",
    targetProductId: "product_uva_mira_cabernet",
    targetRecommendAngle: "story",
    recommendScoring: {
      flavour: "good",
      story: "optimal",
      value: "poor",
      confidence: "good",
    },
    allowedProductIds: ["product_cartology_chenin", "product_uva_mira_cabernet", "product_valmoissine_pinot_noir"],
    reactions: {
      ask: {
        preference: {
          optimal: "Good. I usually like something elegant, not heavy.",
        },
        budget: {
          disaster: "That is exactly the sort of waiter question I was hoping to avoid.",
        },
      },
      recommend: {
        story: {
          optimal: "That feels more considered. Keep going.",
        },
        value: {
          disaster: "I did not ask for the bargain bottle.",
        },
      },
      commit: {
        recommendation: {
          optimal: "Alright. That sounds like you actually read the table.",
        },
      },
    },
  }),
  makeTier1Encounter({
    id: "encounter_v2_003",
    title: "The Regular",
    family: "regular",
    modifier: "habit_driven",
    hiddenPressure: "wants_comfort_without_boredom",
    masterProfile: "recognition",
    variant: "comfort",
    scene:
      "A regular sits down comfortably and glances at the list, clearly expecting the evening to feel familiar.",
    sceneClue: "Returning guest wants comfort with a small lift.",
    images: {
      previewArt: "/game/encounters/003/preview-art.png",
      mainNeutral: "/game/encounters/003/main-neutral.png",
      mainPositive: "/game/encounters/003/main-positive.png",
      mainNegative: "/game/encounters/003/main-negative.png",
      endSuccessArt: "/game/encounters/003/end-success-art.png",
      endFailureArt: "/game/encounters/003/end-failure-art.png",
      neutralExitArt: "/game/encounters/003/neutral-exit-art.png",
    },
    visualClues: [
      "They greet the room with ease.",
      "They look at the same section of the wine list first.",
      "They seem open, but only if the choice still feels safe.",
    ],
    verbalClue: "You know us. Something in our lane, maybe with a little change.",
    contextClue: "They want comfort first and novelty second.",
    redHerring: "Because they are regulars, you may overplay story or surprise when the safest move is familiar flavour.",
    lesson:
      "Regulars reward recognition. The best move is to anchor them in what they already trust, then offer a small lift.",
    targetProductId: "product_valmoissine_pinot_noir",
    targetRecommendAngle: "flavour",
    recommendScoring: {
      flavour: "optimal",
      story: "poor",
      value: "good",
      confidence: "good",
    },
    allowedProductIds: ["product_cartology_chenin", "product_uva_mira_cabernet", "product_valmoissine_pinot_noir"],
    reactions: {
      ask: {
        preference: {
          optimal: "Exactly. You remember we like a red that is easy but not boring.",
        },
        occasion: {
          poor: "Nothing special. Just our usual kind of night.",
        },
      },
      recommend: {
        flavour: {
          optimal: "That sounds like us.",
        },
        story: {
          disaster: "We do not need the whole story tonight.",
        },
      },
      commit: {
        recommendation: {
          optimal: "Yes, that is the one.",
        },
      },
    },
  }),
  makeTier1Encounter({
    id: "encounter_v2_011",
    title: "One Clear Reason",
    family: "skeptic",
    modifier: "testing_confidence_glasses",
    hiddenPressure: "needs_to_feel_seen_without_being_sold",
    masterProfile: "recognition",
    variant: null,
    scene:
      "A sharply dressed skeptic watches the table before the list, giving you only enough attention to prove the recommendation is worth hearing.",
    sceneClue: "Skeptic guest tests whether you can read the table before pitching.",
    images: {
      previewArt: "/game/encounters/011/preview-art.png",
      mainNeutral: "/game/encounters/011/main-neutral.png",
      mainPositive: "/game/encounters/011/main-positive.png",
      mainNegative: "/game/encounters/011/main-negative.png",
      endSuccessArt: "/game/encounters/011/end-success-art.png",
      endFailureArt: "/game/encounters/011/end-failure-art.png",
      neutralExitArt: "/game/encounters/011/neutral-exit-art.png",
    },
    visualClues: [
      "They keep their arms close and let silence do some testing.",
      "Two empty glasses are already placed, so the choice still matters.",
      "They are open to being impressed, but only by relevance.",
    ],
    verbalClue: "Convince me it fits the table, not just the list.",
    contextClue: "They want recognition before recommendation: one precise read should come before the bottle.",
    redHerring: "Their confidence can tempt you to push authority, but a generic confident close will feel like a pitch.",
    lesson:
      "Skeptics reward being read accurately. Lead with relevance, then use the bottle as proof rather than performance.",
    targetProductId: "product_uva_mira_cabernet",
    targetRecommendAngle: "story",
    recommendScoring: {
      flavour: "good",
      story: "optimal",
      value: "disaster",
      confidence: "poor",
    },
    allowedProductIds: ["product_cartology_chenin", "product_uva_mira_cabernet", "product_valmoissine_pinot_noir"],
    reactions: {
      ask: {
        preference: {
          optimal: "Elegant and structured. I do not want anything heavy-handed.",
        },
        budget: {
          disaster: "That is not the point. I am asking whether you understand the table.",
        },
      },
      recommend: {
        story: {
          optimal: "That is a useful reason. Keep it there.",
        },
        confidence: {
          disaster: "Confidence without a reason is just pressure.",
        },
      },
      commit: {
        recommendation: {
          optimal: "Alright. That was specific enough. Bring it.",
        },
      },
    },
  }),
  makeTier1Encounter({
    id: "encounter_v2_012",
    title: "The Measured Skeptic",
    family: "skeptic",
    modifier: "precision_test",
    hiddenPressure: "needs_relevance_not_pitch",
    masterProfile: "recognition",
    variant: "expertise",
    scene:
      "A reserved guest studies the list quietly, then looks up as if weighing whether you can offer anything more useful than a pitch.",
    sceneClue: "Reserved skeptic tests whether the recommendation has a point.",
    images: {
      previewArt: "/game/encounters/012/preview-art.png",
      mainNeutral: "/game/encounters/012/main-neutral.png",
      mainPositive: "/game/encounters/012/main-positive.png",
      mainNegative: "/game/encounters/012/main-negative.png",
      endSuccessArt: "/game/encounters/012/end-success-art.png",
      endFailureArt: "/game/encounters/012/end-failure-art.png",
      neutralExitArt: "/game/encounters/012/neutral-exit-art.png",
    },
    visualClues: [
      "They hold the list close and keep their answers short.",
      "They are not confused; they are deciding whether your read is useful.",
      "They respond better to precision than charm.",
    ],
    verbalClue: "I do not need the usual explanation. Tell me what actually makes sense.",
    contextClue: "They want one relevant reason before they will trust the bottle.",
    redHerring: "Their restraint can tempt you to fill the silence with detail, but that makes the recommendation feel generic.",
    lesson:
      "Measured skeptics reward precision. Read their filter, give one relevant reason, then close without overselling.",
    targetProductId: "product_uva_mira_cabernet",
    targetRecommendAngle: "story",
    recommendScoring: {
      flavour: "good",
      story: "optimal",
      value: "disaster",
      confidence: "poor",
    },
    allowedProductIds: ["product_cartology_chenin", "product_uva_mira_cabernet", "product_valmoissine_pinot_noir"],
    reactions: {
      ask: {
        preference: {
          optimal: "Elegant, structured, and not too heavy. That is the lane.",
        },
        budget: {
          disaster: "That is not the question. I am asking whether the bottle makes sense.",
        },
      },
      recommend: {
        story: {
          optimal: "Good. That is a reason, not a speech.",
        },
        value: {
          disaster: "No. I am not looking for the value bottle.",
        },
      },
      commit: {
        recommendation: {
          optimal: "Alright. That is clear enough. Let's do it.",
        },
      },
    },
  }),
  makeTier1Encounter({
    id: "encounter_v2_004",
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
    targetProductId: "product_valmoissine_pinot_noir",
    targetRecommendAngle: "value",
    allowedProductIds: ["product_cartology_chenin", "product_uva_mira_cabernet", "product_valmoissine_pinot_noir"],
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
    id: "encounter_v2_005",
    title: "The First Date",
    family: "date",
    modifier: "emotional_status",
    hiddenPressure: "wants_to_signal_taste_without_pressure",
    masterProfile: "recognition",
    variant: "emotional_status",
    scene:
      "Two guests sit close together, smiling but careful, both wanting the bottle to support the moment without making it awkward.",
    visualClues: [
      "They look at each other before answering.",
      "The table feels warm, but slightly self-conscious.",
      "They want the choice to feel tasteful, not flashy.",
    ],
    verbalClue: "We want something nice, but not too serious.",
    contextClue: "The bottle needs to help the date feel easy and considered.",
    redHerring: "A big premium push may look impressive but could make the moment feel performative.",
    lesson:
      "First-date tables need emotional calibration. The right bottle signals taste while keeping the pressure low.",
    targetProductId: "product_uva_mira_cabernet",
    targetRecommendAngle: "flavour",
    allowedProductIds: ["product_cartology_chenin", "product_uva_mira_cabernet", "product_valmoissine_pinot_noir"],
    reactions: {
      ask: {
        occasion: {
          optimal: "Yes, exactly. Something that fits the mood without making it a whole production.",
        },
        budget: {
          disaster: "That is not really the feeling we were going for.",
        },
      },
      recommend: {
        flavour: {
          optimal: "That sounds elegant but easy.",
        },
        value: {
          disaster: "We are not really trying to make this about value.",
        },
      },
      commit: {
        recommendation: {
          optimal: "That feels right. Let's do that.",
        },
      },
    },
  }),
  makeTier1Encounter({
    id: "encounter_v2_006",
    title: "We're Fine, Thanks",
    family: "private_table",
    modifier: "low_contact",
    hiddenPressure: "protecting_space",
    masterProfile: "reassurance",
    variant: "privacy",
    scene:
      "A quiet table keeps conversation low and gives short answers when approached.",
    visualClues: [
      "Menus stay low and close to the table.",
      "They avoid inviting a long explanation.",
      "Their body language asks for space, not performance.",
    ],
    verbalClue: "We're fine, thanks. Maybe just something easy.",
    contextClue: "They may still buy, but only if you respect the boundary.",
    redHerring: "The short answer can tempt you to push harder for information, which will create friction.",
    lesson:
      "Some tables reward restraint. A concise flavour fit protects the experience better than a full sales routine.",
    targetProductId: "product_cartology_chenin",
    targetRecommendAngle: "flavour",
    allowedProductIds: ["product_cartology_chenin", "product_uva_mira_cabernet", "product_valmoissine_pinot_noir"],
    reactions: {
      ask: {
        preference: {
          optimal: "Light and easy would be good.",
        },
        occasion: {
          disaster: "We are really just trying to keep it quiet tonight.",
        },
      },
      recommend: {
        flavour: {
          optimal: "That sounds simple enough. Thank you.",
        },
        confidence: {
          poor: "Okay, but we do not need a big sell.",
        },
      },
      commit: {
        recommendation: {
          optimal: "Yes, that is fine.",
        },
        assumption: {
          disaster: "Please do not rush us.",
        },
      },
    },
  }),
  makeTier1Encounter({
    id: "encounter_v2_007",
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
    targetProductId: "product_uva_mira_cabernet",
    targetRecommendAngle: "confidence",
    allowedProductIds: ["product_cartology_chenin", "product_uva_mira_cabernet", "product_valmoissine_pinot_noir"],
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
  makeTier1Encounter({
    id: "encounter_v2_008",
    title: "The Mining Indaba Table",
    family: "business_table",
    modifier: "decision_hierarchy",
    hiddenPressure: "needs_decisive_social_lead",
    masterProfile: "recognition",
    variant: "decision_hierarchy",
    scene:
      "A business table has several voices, but one quiet guest is clearly setting the direction.",
    visualClues: [
      "Others glance toward one guest before agreeing.",
      "The table wants momentum but not a loud sales moment.",
      "The decision-maker is calm and time-aware.",
    ],
    verbalClue: "We need something that works for the table. Keep it straightforward.",
    contextClue: "The table needs hierarchy read correctly: lead the decision without embarrassing the decision-maker.",
    redHerring: "The loudest guest may not be the buyer. Following them can lose authority with the real decision-maker.",
    lesson:
      "Decision-hierarchy tables reward calm confidence. Read who matters, then land the choice clearly.",
    targetProductId: "product_valmoissine_pinot_noir",
    targetRecommendAngle: "confidence",
    allowedProductIds: ["product_cartology_chenin", "product_uva_mira_cabernet", "product_valmoissine_pinot_noir"],
    reactions: {
      ask: {
        occasion: {
          optimal: "Business dinner. Something easy for everyone to agree on.",
        },
        experience: {
          disaster: "We do not need a wine lesson.",
        },
      },
      recommend: {
        confidence: {
          optimal: "Good. That is the kind of clean answer we needed.",
        },
        flavour: {
          poor: "Sounds fine, but can you land the decision?",
        },
      },
      commit: {
        assumption: {
          optimal: "Yes. Please bring that.",
        },
      },
    },
  }),
  makeTier1Encounter({
    id: "encounter_v2_009",
    title: "The Collector",
    family: "collector",
    modifier: "expertise",
    hiddenPressure: "wants_relevance_not_basics",
    masterProfile: "recognition",
    variant: "expertise",
    scene:
      "A guest scans the list quickly, clearly recognizing producers and regions before looking up at you.",
    visualClues: [
      "They move past entry-level descriptions quickly.",
      "They notice region and producer details.",
      "They want a meaningful recommendation, not a beginner explanation.",
    ],
    verbalClue: "Anything on here with a bit of a point of view?",
    contextClue: "They want expertise that is relevant and concise.",
    redHerring: "Their knowledge may tempt you to over-explain, but the stronger move is to offer a precise story.",
    lesson:
      "Collectors reward relevance. Give them one reason the bottle matters instead of a generic premium pitch.",
    targetProductId: "product_cartology_chenin",
    targetRecommendAngle: "story",
    allowedProductIds: ["product_cartology_chenin", "product_uva_mira_cabernet", "product_valmoissine_pinot_noir"],
    reactions: {
      ask: {
        preference: {
          optimal: "I like bottles that feel specific to where they come from.",
        },
        budget: {
          disaster: "That is not really the filter I am using.",
        },
      },
      recommend: {
        story: {
          optimal: "Good. That is actually interesting.",
        },
        confidence: {
          poor: "Confident is fine, but why that bottle?",
        },
      },
      commit: {
        recommendation: {
          optimal: "Yes. Let's try it.",
        },
      },
    },
  }),
  makeTier1Encounter({
    id: "encounter_v2_010",
    title: "The Layover Crew",
    family: "crew",
    modifier: "returning_guests",
    hiddenPressure: "smart_value_with_familiarity",
    masterProfile: "recognition",
    variant: "smart_value",
    scene:
      "A relaxed crew table has been here before and wants a reliable bottle before an early flight.",
    visualClues: [
      "They are comfortable in the room and move quickly.",
      "They compare value more than status.",
      "They want a bottle that feels familiar, practical, and still good.",
    ],
    verbalClue: "We've been here before. What's the smart bottle tonight?",
    contextClue: "They want to feel like returning guests who know how to spend well.",
    redHerring: "Because they are experienced, you may chase novelty when they mainly want a smart reliable answer.",
    lesson:
      "Returning value-aware guests want recognition and practical confidence. The right answer makes them feel savvy.",
    targetProductId: "product_valmoissine_pinot_noir",
    targetRecommendAngle: "value",
    allowedProductIds: ["product_cartology_chenin", "product_uva_mira_cabernet", "product_valmoissine_pinot_noir"],
    reactions: {
      ask: {
        budget: {
          optimal: "Exactly. We want the smart spend, not the show-off bottle.",
        },
        experience: {
          poor: "We know the place. Just help us choose well.",
        },
      },
      recommend: {
        value: {
          optimal: "That is the answer we wanted.",
        },
        story: {
          disaster: "We do not need the tourist story tonight.",
        },
      },
      commit: {
        value: {
          optimal: "Perfect. Bring that one.",
        },
      },
    },
  }),
  makeTier1Encounter({
    id: "encounter_v2_013",
    title: "Same Lane Tonight",
    family: "regular",
    modifier: "known_room_local_regular",
    hiddenPressure: "wants_familiar_respect_without_fuss",
    masterProfile: "recognition",
    variant: "comfort",
    scene:
      "A familiar local regular settles into the room with relaxed confidence, expecting the recommendation to respect what he already enjoys.",
    sceneClue: "Known regular wants familiar comfort with a respectful lift.",
    images: {
      previewArt: "/game/encounters/013/preview-art.png",
      mainNeutral: "/game/encounters/013/main-neutral.png",
      mainPositive: "/game/encounters/013/main-positive.png",
      mainNegative: "/game/encounters/013/main-negative.png",
      endSuccessArt: "/game/encounters/013/end-success-art.png",
      endFailureArt: "/game/encounters/013/end-failure-art.png",
      neutralExitArt: "/game/encounters/013/neutral-exit-art.png",
    },
    visualClues: [
      "He looks comfortable in the room and does not need a long introduction.",
      "The empty glasses suggest the bottle is still part of the evening's rhythm.",
      "His expression asks for recognition before novelty.",
    ],
    verbalClue: "You know the kind of thing I like. Keep it in that lane.",
    contextClue: "He wants to feel remembered, not sold to.",
    redHerring: "Because he is relaxed, you may assume anything familiar will work, but he still wants a small lift.",
    lesson:
      "Regulars reward precise recognition. Anchor the recommendation in their known comfort zone, then make the choice feel considered.",
    targetProductId: "product_valmoissine_pinot_noir",
    targetRecommendAngle: "flavour",
    recommendScoring: {
      flavour: "optimal",
      story: "poor",
      value: "good",
      confidence: "good",
    },
    allowedProductIds: ["product_cartology_chenin", "product_uva_mira_cabernet", "product_valmoissine_pinot_noir"],
    reactions: {
      ask: {
        preference: {
          optimal: "Exactly. You remember the style.",
        },
        experience: {
          good: "You know I have been here before. No need for the basics.",
        },
      },
      recommend: {
        flavour: {
          optimal: "That sounds right. Familiar, but not lazy.",
        },
        story: {
          disaster: "I do not need the long story tonight.",
        },
      },
      commit: {
        recommendation: {
          optimal: "Yes. That is the kind of bottle I meant.",
        },
      },
    },
  }),
  makeTier1Encounter({
    id: "encounter_v2_014",
    title: "The Window Date",
    family: "tourist",
    modifier: "romantic_tourist_table",
    hiddenPressure: "wants_romance_without_pressure",
    masterProfile: "recognition",
    variant: "emotional_status",
    scene:
      "A tourist-like date couple sits close by the window, wanting the bottle to make the night feel special without becoming too serious.",
    sceneClue: "Tourist date table wants charm, local ease, and emotional calm.",
    images: {
      previewArt: "/game/encounters/014/preview-art.png",
      mainNeutral: "/game/encounters/014/main-neutral.png",
      mainPositive: "/game/encounters/014/main-positive.png",
      mainNegative: "/game/encounters/014/main-negative.png",
      endSuccessArt: "/game/encounters/014/end-success-art.png",
      endFailureArt: "/game/encounters/014/end-failure-art.png",
      neutralExitArt: "/game/encounters/014/neutral-exit-art.png",
    },
    visualClues: [
      "They sit close but are still careful about the tone of the night.",
      "The room and view matter as much as the wine itself.",
      "They want the choice to feel attractive, not forced.",
    ],
    verbalClue: "Something nice for the two of us, but not too intense.",
    contextClue: "The bottle needs to support the date without making the table feel pressured.",
    redHerring: "The romantic setting can tempt a showy premium push, but that may make the moment feel heavy.",
    lesson:
      "Tourist date tables reward emotional calibration. Keep the bottle elegant, easy to accept, and connected to the mood.",
    targetProductId: "product_uva_mira_cabernet",
    targetRecommendAngle: "story",
    recommendScoring: {
      flavour: "good",
      story: "optimal",
      value: "disaster",
      confidence: "poor",
    },
    allowedProductIds: ["product_cartology_chenin", "product_uva_mira_cabernet", "product_valmoissine_pinot_noir"],
    reactions: {
      ask: {
        occasion: {
          optimal: "Exactly. We want it to feel like the night, not a big production.",
        },
        budget: {
          disaster: "That makes it feel a bit transactional.",
        },
      },
      recommend: {
        flavour: {
          optimal: "That sounds elegant and easy. That is the mood.",
        },
        value: {
          disaster: "We are not really trying to make this about value.",
        },
      },
      commit: {
        recommendation: {
          optimal: "Yes, that feels right for us.",
        },
      },
    },
  }),
  makeTier1Encounter({
    id: "encounter_v2_015",
    title: "Don't Guess",
    family: "skeptic",
    modifier: "v2_precision_test",
    hiddenPressure: "needs_relevance_before_trust",
    masterProfile: "recognition",
    variant: "expertise",
    scene:
      "A guarded skeptic with glasses studies the table and waits to see whether your recommendation has a precise reason behind it.",
    sceneClue: "Skeptic guest tests whether the recommendation is relevant.",
    images: {
      previewArt: "/game/encounters/015/preview-art.png",
      mainNeutral: "/game/encounters/015/main-neutral.png",
      mainPositive: "/game/encounters/015/main-positive.png",
      mainNegative: "/game/encounters/015/main-negative.png",
      endSuccessArt: "/game/encounters/015/end-success-art.png",
      endFailureArt: "/game/encounters/015/end-failure-art.png",
      neutralExitArt: "/game/encounters/015/neutral-exit-art.png",
    },
    visualClues: [
      "He watches the recommendation more than the list.",
      "His expression shifts quickly when the answer feels generic.",
      "He warms only when the reason feels specific.",
    ],
    verbalClue: "I do not need the pitch. Tell me why that bottle makes sense.",
    contextClue: "He wants one clear reason before he gives the recommendation trust.",
    redHerring: "The serious tone can tempt you into overexplaining, but too much detail will feel like a performance.",
    lesson:
      "Skeptics reward precision. Give one relevant reason, connect it to the table, then close without overworking the sale.",
    targetProductId: "product_uva_mira_cabernet",
    targetRecommendAngle: "story",
    recommendScoring: {
      flavour: "good",
      story: "optimal",
      value: "disaster",
      confidence: "poor",
    },
    allowedProductIds: ["product_cartology_chenin", "product_uva_mira_cabernet", "product_valmoissine_pinot_noir"],
    reactions: {
      ask: {
        preference: {
          optimal: "Structured, elegant, not too heavy. That is the lane.",
        },
        budget: {
          disaster: "That is not the question I asked.",
        },
      },
      recommend: {
        story: {
          optimal: "Good. That is an actual reason.",
        },
        value: {
          disaster: "No. I am not asking for the value bottle.",
        },
      },
      commit: {
        recommendation: {
          optimal: "Alright. That makes sense. Bring it.",
        },
      },
    },
  }),
  makeTier1Encounter({
    id: "encounter_v2_016",
    title: "You Know Our Bottle",
    family: "regular",
    modifier: "cape_town_young_regular_couple",
    hiddenPressure: "wants_recognition_without_overexplaining",
    masterProfile: "recognition",
    variant: "comfort",
    scene:
      "A young Cape Town regular couple settles into a familiar table, expecting the bottle to feel like it remembers their style without turning into a pitch.",
    sceneClue: "Regular couple wants recognition, comfort, and a small lift.",
    images: {
      previewArt: "/game/encounters/016/preview-art.png",
      mainNeutral: "/game/encounters/016/main-neutral.png",
      mainPositive: "/game/encounters/016/main-positive.png",
      mainNegative: "/game/encounters/016/main-negative.png",
      endSuccessArt: "/game/encounters/016/end-success-art.png",
      endFailureArt: "/game/encounters/016/end-failure-art.png",
      neutralExitArt: "/game/encounters/016/neutral-exit-art.png",
    },
    visualClues: [
      "They sit like they know the room already.",
      "They look warm, but they do not want the basics repeated.",
      "Their attention sharpens when the recommendation sounds personally remembered.",
    ],
    verbalClue: "You know our kind of bottle. Something familiar, but still worth opening.",
    contextClue: "They want to feel recognized as regulars while still getting a considered recommendation.",
    redHerring: "Their relaxed energy can tempt you to get casual, but they still expect the recommendation to be precise.",
    lesson:
      "Regular couples reward remembered preference. Anchor the bottle in their usual lane, then add one clear reason it improves tonight.",
    targetProductId: "product_valmoissine_pinot_noir",
    targetRecommendAngle: "flavour",
    recommendScoring: {
      flavour: "optimal",
      story: "poor",
      value: "good",
      confidence: "good",
    },
    allowedProductIds: ["product_cartology_chenin", "product_uva_mira_cabernet", "product_valmoissine_pinot_noir"],
    reactions: {
      ask: {
        preference: {
          optimal: "Exactly. Same lane, just something with a little more lift.",
        },
        experience: {
          good: "You know we have been here before. No need to start from zero.",
        },
      },
      recommend: {
        flavour: {
          optimal: "That sounds like us. Familiar, but still interesting.",
        },
        story: {
          disaster: "We do not need the whole story tonight.",
        },
      },
      commit: {
        recommendation: {
          optimal: "Yes, that feels right. Bring that one.",
        },
      },
    },
  }),
];

const DEMO_TIER1_VERTICAL_SLICE_IDS = [
  "encounter_v2_014",
  "encounter_v2_013",
  "encounter_v2_011",
  "encounter_v2_015",
  "encounter_v2_016",
] as const;

const DEMO_TIER1_VERTICAL_SLICE_ENCOUNTERS = DEMO_TIER1_VERTICAL_SLICE_IDS
  .map((id) => TIER1_VERTICAL_SLICE_ENCOUNTERS.find((encounter) => encounter.id === id))
  .filter((encounter): encounter is EncounterV2 => !!encounter);

export function getTier1VerticalSliceEncounters(limit = 5): EncounterV2[] {
  const safeLimit = Number.isFinite(limit) && limit > 0
    ? Math.min(TIER1_VERTICAL_SLICE_ENCOUNTERS.length, Math.floor(limit))
    : 5;

  if (safeLimit <= DEMO_TIER1_VERTICAL_SLICE_ENCOUNTERS.length) {
    return DEMO_TIER1_VERTICAL_SLICE_ENCOUNTERS.slice(0, safeLimit);
  }

  return TIER1_VERTICAL_SLICE_ENCOUNTERS.slice(0, safeLimit);
}
