# BottleCaller Product Path

This repo now treats the V2 encounter harness as the current gameplay path for both the demo and the premium iframe.

## Current Gameplay Owner

- `game/game.html` owns the current browser game shell. The V2 path is selected by `shouldUseV2Harness()` and started by `startV2HarnessEncounter()`.
- `src/game/runtimeV2.ts` owns V2 session creation, encounter rotation, product selection, snapshots, and action application.
- `src/game/engineV2.ts` owns V2 gameplay rules: choice quality, timing pressure, close windows, failure rules, walk-away rules, authority deltas, and difficulty policy.
- `src/game/encounterV2.ts` owns the authored V2 encounter content. Current authored V2 content is the Tier 1 vertical slice returned by `getTier1VerticalSliceEncounters()`.
- `src/game/typesV2.ts` owns the shared V2 data contracts.

The legacy/V1 play path should not be extended for new waiter/manager progression work unless it is being kept alive for backwards compatibility.

## Demo Path

- Demo V2 uses `getV2EncounterLimit()` in `game/game.html`, which returns `3` for demo mode.
- Demo AP and bottle rewards are local-only through `applyV2BottleRewardProgress()` and `V2_BOTTLE_REWARD_STORAGE_KEY`.
- Demo mode does not submit premium progress reports because `shouldSubmitV2ProgressReport()` returns false for demo mode.

## Premium Waiter And Manager Path

- Premium V2 uses the same V2 runtime as demo, embedded in the premium iframe.
- `shouldSubmitV2ProgressReport()` gates premium writes to iframe sessions with `userId`, `restaurantId`, and a supported role.
- `buildV2ProgressReportDraft()` creates the payload used for waiter profile history, skill radar, managerboard outputs, and canonical progression.
- `maybeSubmitV2ProgressReport()` sends `progress_report_submit` to the parent app.
- `src/lib/bcHandlers/progressReportSubmit.js` persists premium output through `makeProgressReportSubmitHandler()`.

## State Ownership

V2 has two separate scoring concepts:

- Skill/profile/managerboard score: calculated by `buildV2SkillSnapshot()` and packaged by `buildV2ProgressReportDraft()` in `game/game.html`. The parent handler inserts this into `bc_skill_snapshots_v1` through `insertSkillSnapshotAndDrillEffect()`.
- Game progression authority: calculated by `recordV2ProgressionAuthority()` and packaged by `buildV2CanonicalProgressionState()` in `game/game.html`. The parent handler upserts this into `bc_progression_state_v1` through `upsertCanonicalProgressionState()`.

Authority points and bottle rewards are not the same thing as skill score. Authority points control game progression and reward unlocks. Skill score feeds the profile radar, history, and managerboard.

## Tier Serving

Served tier is always the **minimum** of two independent gates:

1. **Rules / evidence gate** (`rulesTierToServe`)
   - Evaluated by `decideV2RulesTierFromSnapshot()` in `game/game.html` and `src/game/progressionEvaluator.ts`
   - Tier 2: at least 5 progression encounters, recent window >= 5, green rate >= 60%, at most 1 red
   - Tier 3: at least 12 progression encounters, recent window >= 10, green rate >= 80%, 0 reds, no red in T2+, at least one successful pivot
   - `src/progressionStore.js` `deriveTier()` mirrors the encounter-count fallback: Tier 2 at 5, Tier 3 at 12

2. **AP unlock gate** (`apTierUnlocked`)
   - Evaluated by `getV2TierUnlockedByAP()` from bottle/authority points
   - Tier 2 at 180 AP, Tier 3 at 500 AP, Tier 4 at 1100 AP, Tier 5 at 2000 AP
   - Shared constants live in `src/game/v2ProgressionAuthority.ts` (`V2_AP_TIER_UNLOCKS`)

`normalizeV2ProgressionAuthorityState()` and `getV2TierToServe()` serve `min(apTierUnlocked, rulesTierToServe, …)`.
The V2 play HUD surfaces both gates via `getV2TierGateSummary()`.

Hydration/write safety:

- Iframe hydrate merges local + server authority through `mergeV2ProgressionAuthorityStates()` and never replaces richer local attempt history with AP-only server payloads.
- Parent upserts merge through `resolveCanonicalWriteState()` / `upsertCanonicalProgressionState()`, using `basedOnUpdatedAt` so newer server rows are not blindly overwritten.

- `getV2TierToServe()` in `game/game.html` chooses the premium V2 tier from the local V2 authority ledger and the parent tier gate.
- `loadV2ProgressionAuthorityState()` in `game/game.html` seeds/merges the local V2 ledger from parent canonical authority.
- `buildProgressionResultFromCanonicalState()` in `src/main.js` reads `bc_progression_state_v1.canonical_state`, extracts the V2 progression snapshot, and calls `decideAllowedTierLazy()`.

Current limitation: `src/game/encounterV2.ts` only contains authored Tier 1 vertical-slice content. If the authority gate allows Tier 2 or Tier 3 before new content is authored, `runtimeV2.ts` falls back to the available V2 encounter pool.

## Difficulty

- `getV2DifficultyModeForStart()` in `game/game.html` resolves the requested mode.
- `startRuntimeV2Session()` in `src/game/runtimeV2.ts` stores `difficultyMode` on the session and game state.
- `getDifficultyPolicyV2()` in `src/game/engineV2.ts` applies easy, medium, and hard policy to friction, early commit pressure, close windows, max mistakes, and max actions.
- Walk-away unlock stays at 3 mistakes via `getWalkAwayMistakeThreshold()` so medium preserves the previous V2 walk-away behavior. Failure still uses each mode's `maxMistakes`.

Medium is the default. Easy is more forgiving. Hard is stricter and fails faster.
