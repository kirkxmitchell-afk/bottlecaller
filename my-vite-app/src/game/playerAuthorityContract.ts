export const PLAYER_AUTHORITY_CONTRACT_VERSION = 1 as const;

export const PLAYER_SKILL_UNLOCKS = {
  WINE_DISCOVERY: "wine_discovery_1",
  FOOD_RECOVERY: "food_recovery_1",
  APERITIF_CONVERSION: "aperitif_conversion_1",
  WINE_RECOVERY: "wine_recovery_1",
} as const;

export type PlayerSkillUnlockId =
  (typeof PLAYER_SKILL_UNLOCKS)[keyof typeof PLAYER_SKILL_UNLOCKS];

export type SkillMeasurements = Record<string, number>;

export type PlayerAuthoritySnapshot = {
  v: typeof PLAYER_AUTHORITY_CONTRACT_VERSION;
  source: string;
  progression: {
    authorityPoints: number;
    tierToServe: number;
    apTierUnlocked: number;
    rulesTierToServe: number;
  };
  skills: {
    unlockedSkillIds: string[];
    measurements: SkillMeasurements;
    unlockSource: "explicit" | "legacy_tier_fallback";
  };
  economy: {
    godotCoins: number;
    owner: "godot_shift";
  };
  updatedAt: string;
};

export type GuestGreetingAccess = {
  accepted: boolean;
  recovered: boolean;
  allowedOffers: Array<"food" | "wine">;
  requiredSkillId: PlayerSkillUnlockId | null;
  reason: string;
};

const TIER_DEFAULT_UNLOCKS: Record<number, PlayerSkillUnlockId[]> = {
  1: [PLAYER_SKILL_UNLOCKS.WINE_DISCOVERY],
  2: [
    PLAYER_SKILL_UNLOCKS.WINE_DISCOVERY,
    PLAYER_SKILL_UNLOCKS.FOOD_RECOVERY,
    PLAYER_SKILL_UNLOCKS.APERITIF_CONVERSION,
  ],
  3: [
    PLAYER_SKILL_UNLOCKS.WINE_DISCOVERY,
    PLAYER_SKILL_UNLOCKS.FOOD_RECOVERY,
    PLAYER_SKILL_UNLOCKS.APERITIF_CONVERSION,
    PLAYER_SKILL_UNLOCKS.WINE_RECOVERY,
  ],
  4: [
    PLAYER_SKILL_UNLOCKS.WINE_DISCOVERY,
    PLAYER_SKILL_UNLOCKS.FOOD_RECOVERY,
    PLAYER_SKILL_UNLOCKS.APERITIF_CONVERSION,
    PLAYER_SKILL_UNLOCKS.WINE_RECOVERY,
  ],
  5: [
    PLAYER_SKILL_UNLOCKS.WINE_DISCOVERY,
    PLAYER_SKILL_UNLOCKS.FOOD_RECOVERY,
    PLAYER_SKILL_UNLOCKS.APERITIF_CONVERSION,
    PLAYER_SKILL_UNLOCKS.WINE_RECOVERY,
  ],
};

function finiteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampTier(value: unknown): number {
  return Math.max(1, Math.min(5, Math.floor(finiteNumber(value, 1))));
}

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
}

export function getDefaultSkillUnlocksForTier(tier: unknown): string[] {
  return [...TIER_DEFAULT_UNLOCKS[clampTier(tier)]];
}

export function normalizeSkillMeasurements(
  measurements: unknown,
): SkillMeasurements {
  if (!measurements || typeof measurements !== "object") return {};

  return Object.fromEntries(
    Object.entries(measurements as Record<string, unknown>)
      .map(([key, value]) => [
        String(key || "").trim(),
        Math.max(0, Math.min(100, finiteNumber(value, 0))),
      ])
      .filter(([key]) => Boolean(key)),
  );
}

export function createPlayerAuthoritySnapshot(input: {
  source?: string;
  authorityPoints?: unknown;
  tierToServe?: unknown;
  apTierUnlocked?: unknown;
  rulesTierToServe?: unknown;
  unlockedSkillIds?: unknown;
  skillMeasurements?: unknown;
  godotCoins?: unknown;
  updatedAt?: string;
}): PlayerAuthoritySnapshot {
  const tierToServe = clampTier(input.tierToServe);
  const explicitUnlocks = uniqueStrings(input.unlockedSkillIds);
  const hasExplicitUnlockList = Array.isArray(input.unlockedSkillIds);

  return {
    v: PLAYER_AUTHORITY_CONTRACT_VERSION,
    source: String(input.source || "bottlecaller_web"),
    progression: {
      authorityPoints: Math.max(0, finiteNumber(input.authorityPoints, 0)),
      tierToServe,
      apTierUnlocked: clampTier(input.apTierUnlocked ?? tierToServe),
      rulesTierToServe: clampTier(input.rulesTierToServe ?? tierToServe),
    },
    skills: {
      unlockedSkillIds: hasExplicitUnlockList
        ? explicitUnlocks
        : getDefaultSkillUnlocksForTier(tierToServe),
      measurements: normalizeSkillMeasurements(input.skillMeasurements),
      unlockSource: hasExplicitUnlockList
        ? "explicit"
        : "legacy_tier_fallback",
    },
    economy: {
      godotCoins: Math.max(0, Math.floor(finiteNumber(input.godotCoins, 0))),
      owner: "godot_shift",
    },
    updatedAt: input.updatedAt || new Date().toISOString(),
  };
}

export function resolveGuestGreetingAccess(input: {
  guestType?: unknown;
  greeting?: unknown;
  profileTier?: unknown;
  unlockedSkillIds?: unknown;
}): GuestGreetingAccess {
  const guestType = String(input.guestType || "").trim().toLowerCase();
  const greeting = String(input.greeting || "").trim().toLowerCase();
  const profileTier = clampTier(input.profileTier);
  const unlocks = new Set(uniqueStrings(input.unlockedSkillIds));

  if (greeting === "wine") {
    return {
      accepted: true,
      recovered: false,
      allowedOffers: ["wine"],
      requiredSkillId: PLAYER_SKILL_UNLOCKS.WINE_DISCOVERY,
      reason: "wine_greeting_opens_wine_offer",
    };
  }

  if (greeting === "food") {
    if (guestType === "regular") {
      return {
        accepted: true,
        recovered: false,
        allowedOffers: ["food"],
        requiredSkillId: null,
        reason: "regular_accepts_food_greeting",
      };
    }

    const recovered =
      profileTier >= 2 && unlocks.has(PLAYER_SKILL_UNLOCKS.FOOD_RECOVERY);
    return {
      accepted: recovered,
      recovered,
      allowedOffers: recovered ? ["food"] : [],
      requiredSkillId: PLAYER_SKILL_UNLOCKS.FOOD_RECOVERY,
      reason: recovered
        ? "food_recovery_unlocked"
        : "guest_rejects_food_greeting",
    };
  }

  if (greeting === "aperitif") {
    if (guestType === "tourist") {
      return {
        accepted: true,
        recovered: false,
        allowedOffers: ["food", "wine"],
        requiredSkillId: null,
        reason: "tourist_accepts_aperitif_greeting",
      };
    }

    const recovered =
      profileTier >= 2 &&
      unlocks.has(PLAYER_SKILL_UNLOCKS.APERITIF_CONVERSION);
    return {
      accepted: recovered,
      recovered,
      allowedOffers: recovered ? ["food", "wine"] : [],
      requiredSkillId: PLAYER_SKILL_UNLOCKS.APERITIF_CONVERSION,
      reason: recovered
        ? "aperitif_conversion_unlocked"
        : "guest_rejects_aperitif_greeting",
    };
  }

  return {
    accepted: false,
    recovered: false,
    allowedOffers: [],
    requiredSkillId: null,
    reason: "unknown_greeting",
  };
}

export function buildV2EconomyEvidence(input: {
  resultId?: unknown;
  outcome?: unknown;
  wineSold?: unknown;
  progress?: unknown;
  frustration?: unknown;
  mistakes?: unknown;
  actionCount?: unknown;
  turn?: unknown;
}) {
  return {
    v: 1,
    resultId: String(input.resultId || ""),
    outcome: String(input.outcome || "failure").toLowerCase(),
    wineSold: Boolean(input.wineSold),
    progress: finiteNumber(input.progress, 0),
    frustration: finiteNumber(input.frustration, 0),
    mistakes: Math.max(0, Math.floor(finiteNumber(input.mistakes, 0))),
    actionCount: Math.max(0, Math.floor(finiteNumber(input.actionCount, 0))),
    turn: Math.max(0, Math.floor(finiteNumber(input.turn, 0))),
    coinAuthority: "godot_shift" as const,
  };
}
