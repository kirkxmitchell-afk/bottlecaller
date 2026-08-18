/** Long-term skill bank: grows/decays by encounter measurement + outcome. */

export const SKILL_BANK_AXES = [
  "read",
  "framing",
  "delivery",
  "recovery",
  "closing",
  "speed",
] as const;

export type SkillBankAxis = (typeof SKILL_BANK_AXES)[number];

export type SkillBankShape = Record<SkillBankAxis, number>;

export type SkillBankMeta = {
  updatedAt: number;
  sampleCount: number;
  lastOutcome: string | null;
  lastMode: "full" | "speed_only" | "seed";
  lastMeasurement: SkillBankShape | null;
};

export type SkillBankUpdateMode = "full" | "speed_only";

/** Sticky blend — one encounter moves the bank ~18% toward the measurement. */
export const SKILL_BANK_LEARNING_RATE = 0.18;

/** Floor pace should not whip the radar. */
export const SKILL_BANK_SPEED_LEARNING_RATE = 0.08;

export const EMPTY_SKILL_BANK: SkillBankShape = Object.freeze({
  read: 0,
  framing: 0,
  delivery: 0,
  recovery: 0,
  closing: 0,
  speed: 0,
}) as SkillBankShape;

function asObject(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" ? (value as Record<string, any>) : null;
}

function clampSkill(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function blankSkillBank(): SkillBankShape {
  return { ...EMPTY_SKILL_BANK };
}

export function outcomeBiasForSkillBank(outcome: string | null | undefined): number {
  switch (String(outcome || "").trim().toLowerCase()) {
    case "premium_success":
      return 2;
    case "standard_success":
      return 1;
    case "weak_success":
      return 0;
    case "neutral_exit":
      return -1;
    case "failure":
      return -2;
    default:
      return 0;
  }
}

export function normalizeSkillMeasurement(raw: unknown): SkillBankShape | null {
  const skills = asObject(raw);
  if (!skills) return null;

  const read = Number(skills.read ?? skills.ask ?? skills.read_pct);
  const framing = Number(skills.framing ?? skills.recommend ?? skills.framing_pct);
  const delivery = Number(skills.delivery ?? skills.encounter_success ?? skills.delivery_pct);
  const recovery = Number(skills.recovery ?? skills.recover ?? skills.recovery_pct);
  const closing = Number(skills.closing ?? skills.commit ?? skills.closing_pct);
  const speed = Number(skills.speed ?? skills.speed_pct);

  const values = [read, framing, delivery, recovery, closing, speed];
  if (!values.some((value) => Number.isFinite(value))) return null;

  return {
    read: clampSkill(read),
    framing: clampSkill(framing),
    delivery: clampSkill(delivery),
    recovery: clampSkill(recovery),
    closing: clampSkill(closing),
    speed: clampSkill(speed),
  };
}

export function extractSkillBankFromCanonicalState(
  canonicalState: unknown,
): { bank: SkillBankShape | null; meta: SkillBankMeta | null } {
  const state = asObject(canonicalState);
  const skills = asObject(state?.skills);
  const bank = normalizeSkillMeasurement(skills?.bank);
  const metaRaw = asObject(skills?.bankMeta);
  const meta: SkillBankMeta | null = metaRaw
    ? {
        updatedAt: Number(metaRaw.updatedAt || 0) || 0,
        sampleCount: Math.max(0, Math.round(Number(metaRaw.sampleCount || 0) || 0)),
        lastOutcome: metaRaw.lastOutcome != null ? String(metaRaw.lastOutcome) : null,
        lastMode:
          metaRaw.lastMode === "speed_only" || metaRaw.lastMode === "seed" || metaRaw.lastMode === "full"
            ? metaRaw.lastMode
            : "full",
        lastMeasurement: normalizeSkillMeasurement(metaRaw.lastMeasurement),
      }
    : null;
  return { bank, meta };
}

export function isSkillBankSeeded(bank: SkillBankShape | null | undefined): boolean {
  if (!bank) return false;
  return SKILL_BANK_AXES.some((axis) => Number(bank[axis] || 0) > 0);
}

function blendAxis(current: number, measurement: number, rate: number, bias: number): number {
  return clampSkill(current + rate * (measurement - current) + bias);
}

export function applySkillBankUpdate(args: {
  currentBank?: SkillBankShape | null;
  measurement?: SkillBankShape | null;
  outcome?: string | null;
  mode?: SkillBankUpdateMode;
  sampleCount?: number;
}): {
  bank: SkillBankShape;
  meta: SkillBankMeta;
  seeded: boolean;
  changed: boolean;
} | null {
  const measurement = args.measurement ? { ...args.measurement } : null;
  if (!measurement) return null;

  const mode: SkillBankUpdateMode = args.mode === "speed_only" ? "speed_only" : "full";
  const previous = args.currentBank ? { ...args.currentBank } : null;
  const seededAlready = isSkillBankSeeded(previous);
  const bias = mode === "full" ? outcomeBiasForSkillBank(args.outcome) : 0;
  const nextSampleCount = Math.max(0, Math.round(Number(args.sampleCount || 0) || 0)) + 1;

  if (!seededAlready && mode === "full") {
    return {
      bank: { ...measurement },
      meta: {
        updatedAt: Date.now(),
        sampleCount: nextSampleCount,
        lastOutcome: args.outcome != null ? String(args.outcome) : null,
        lastMode: "seed",
        lastMeasurement: { ...measurement },
      },
      seeded: true,
      changed: true,
    };
  }

  const base = previous ? { ...previous } : blankSkillBank();

  if (mode === "speed_only") {
    if (!seededAlready) {
      // Do not invent conversation axes from a speed-only write.
      base.speed = measurement.speed;
    } else {
      base.speed = blendAxis(base.speed, measurement.speed, SKILL_BANK_SPEED_LEARNING_RATE, 0);
    }
  } else {
    for (const axis of SKILL_BANK_AXES) {
      const rate = axis === "speed" ? SKILL_BANK_SPEED_LEARNING_RATE : SKILL_BANK_LEARNING_RATE;
      const axisBias = axis === "speed" ? 0 : bias;
      base[axis] = blendAxis(Number(base[axis] || 0), Number(measurement[axis] || 0), rate, axisBias);
    }
  }

  return {
    bank: base,
    meta: {
      updatedAt: Date.now(),
      sampleCount: nextSampleCount,
      lastOutcome: args.outcome != null ? String(args.outcome) : null,
      lastMode: mode,
      lastMeasurement: { ...measurement },
    },
    seeded: false,
    changed: true,
  };
}

export function attachSkillBankToCanonicalState(
  canonicalState: Record<string, any> | null | undefined,
  update: { bank: SkillBankShape; meta: SkillBankMeta } | null,
): Record<string, any> {
  const state = { ...(asObject(canonicalState) || {}) };
  const skills = { ...(asObject(state.skills) || {}) };
  if (update) {
    skills.bank = { ...update.bank };
    skills.bankMeta = { ...update.meta };
    if (update.meta.lastMeasurement) {
      skills.measurements = { ...update.meta.lastMeasurement };
    }
  }
  state.skills = skills;
  return state;
}
