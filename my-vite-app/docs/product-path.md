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

- `getV2TierToServe()` in `game/game.html` chooses the premium V2 tier from the local V2 authority ledger and the parent tier gate.
- `loadV2ProgressionAuthorityState()` in `game/game.html` seeds the local V2 ledger from parent canonical authority when the server state is richer than local storage.
- `buildProgressionResultFromCanonicalState()` in `src/main.js` reads `bc_progression_state_v1.canonical_state`, extracts the V2 progression snapshot, and calls `decideAllowedTierLazy()`.
- `src/game/progressionEvaluator.ts` evaluates Tier 2 and Tier 3 eligibility from recent green/red outcomes and pivot evidence.
- `src/progressionStore.js` keeps the local point-to-tier fallback aligned with the same thresholds: Tier 2 at 5 progression encounters and Tier 3 at 12.

Current limitation: `src/game/encounterV2.ts` only contains authored Tier 1 vertical-slice content. If the authority gate allows Tier 2 or Tier 3 before new content is authored, `runtimeV2.ts` falls back to the available V2 encounter pool.

## Difficulty

- `getV2DifficultyModeForStart()` in `game/game.html` resolves the requested mode.
- `startRuntimeV2Session()` in `src/game/runtimeV2.ts` stores `difficultyMode` on the session and game state.
- `getDifficultyPolicyV2()` in `src/game/engineV2.ts` applies easy, medium, and hard policy to friction, early commit pressure, close windows, max mistakes, and max actions.

Medium preserves the previous V2 behavior. Easy is more forgiving. Hard is stricter and fails faster.
