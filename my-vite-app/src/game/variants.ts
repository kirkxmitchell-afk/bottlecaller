import type { VariantDefinition } from "./typesV2";

export const VARIANTS: Record<string, VariantDefinition> = {
  smart_value: {
    id: "smart_value",
    matrix: {
      ask: {
        preference: "good",
        occasion: "disaster",
        experience: "poor",
        budget: "optimal",
      },
      recommend: {
        flavour: "good",
        story: "disaster",
        value: "optimal",
        confidence: "poor",
      },
      commit: {
        recommendation: "good",
        assumption: "poor",
        celebration: "disaster",
        value: "optimal",
      },
    },
  },
  comfort: {
    id: "comfort",
    matrix: {
      ask: {
        preference: "optimal",
        occasion: "poor",
        experience: "good",
        budget: "disaster",
      },
      recommend: {
        flavour: "optimal",
        story: "poor",
        value: "disaster",
        confidence: "good",
      },
      commit: {
        recommendation: "optimal",
        assumption: "poor",
        celebration: "disaster",
        value: "disaster",
      },
    },
  },
  privacy: {
    id: "privacy",
    matrix: {
      ask: {
        preference: "optimal",
        occasion: "poor",
        experience: "good",
        budget: "disaster",
      },
      recommend: {
        flavour: "optimal",
        story: "poor",
        value: "disaster",
        confidence: "poor",
      },
      commit: {
        recommendation: "optimal",
        assumption: "disaster",
        celebration: "disaster",
        value: "disaster",
      },
    },
  },
  celebration: {
    id: "celebration",
    matrix: {
      ask: {
        preference: "poor",
        occasion: "good",
        experience: "disaster",
        budget: "disaster",
      },
      recommend: {
        flavour: "good",
        story: "good",
        value: "disaster",
        confidence: "optimal",
      },
      commit: {
        recommendation: "poor",
        assumption: "good",
        celebration: "optimal",
        value: "disaster",
      },
    },
  },
  decision_hierarchy: {
    id: "decision_hierarchy",
    matrix: {
      ask: {
        preference: "good",
        occasion: "optimal",
        experience: "disaster",
        budget: "poor",
      },
      recommend: {
        flavour: "poor",
        story: "good",
        value: "disaster",
        confidence: "optimal",
      },
      commit: {
        recommendation: "good",
        assumption: "optimal",
        celebration: "poor",
        value: "disaster",
      },
    },
  },
  expertise: {
    id: "expertise",
    matrix: {
      ask: {
        preference: "optimal",
        occasion: "poor",
        experience: "good",
        budget: "disaster",
      },
      recommend: {
        flavour: "good",
        story: "optimal",
        value: "disaster",
        confidence: "poor",
      },
      commit: {
        recommendation: "optimal",
        assumption: "good",
        celebration: "poor",
        value: "disaster",
      },
    },
  },
  emotional_status: {
    id: "emotional_status",
    matrix: {
      ask: {
        preference: "poor",
        occasion: "good",
        experience: "good",
        budget: "disaster",
      },
      recommend: {
        flavour: "good",
        story: "optimal",
        value: "disaster",
        confidence: "good",
      },
      commit: {
        recommendation: "good",
        assumption: "poor",
        celebration: "optimal",
        value: "disaster",
      },
    },
  },
};

export function getVariant(variantId: string | null | undefined): VariantDefinition | null {
  if (!variantId) return null;
  return VARIANTS[String(variantId).trim().toLowerCase()] || null;
}

