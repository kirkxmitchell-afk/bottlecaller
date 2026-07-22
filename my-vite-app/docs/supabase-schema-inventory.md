# Supabase Schema Inventory

There are no SQL migrations or schema files in `my-vite-app` at this point. This document records the client-side Supabase contract that is currently evidenced by the repository.

## Environment

- `src/lib/supabaseParent.js` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `.env.example` keeps placeholder values.
- `.env.production` was removed from source control so real deployment values are not shipped in the repo.

## Core Progression Tables

| Object | Evidence | Purpose |
| --- | --- | --- |
| `bc_progression_state_v1` | `src/lib/bcHandlers/progressReportSubmit.js` `upsertCanonicalProgressionState()` | Stores canonical waiter-owned progression state. |
| `bc_progression_state_v1` | `src/main.js` `buildProgressionResultFromCanonicalState()` and `hydrateProgressionSpineFromLatestSnapshot()` | Reads canonical progression for tier serving and premium hydration. |
| `bc_skill_snapshots_v1` | `src/lib/bcHandlers/progressReportSubmit.js` `insertSkillSnapshotAndDrillEffect()` | Stores profile radar/history skill snapshots. |
| `bc_skill_snapshots_v1` | `src/main.js` managerboard/profile readers | Feeds profile, performance history, and managerboard panels. |
| `bc_encounter_resolutions_v2` | `src/main.js` `fetchEncounterResolutionSummaries()` | Reads encounter resolution summaries for manager performance views. |
| `bc_event_log` | `src/lib/handlers/handleEventLog.js`, `src/main.js`, `src/parent/progressionState.ts` | Stores event stream data used by readiness, progression fallback, and managerboard summaries. |

## Manager And Profile Tables

| Object | Evidence | Purpose |
| --- | --- | --- |
| `bc_manager_board_v1` | `src/parent/progressionState.ts` | Managerboard summary state. |
| `bc_readiness_v1` | `src/main.js`, `src/parent/progressionState.ts` | Waiter readiness metrics. |
| `bc_totals_v1` | `src/main.js`, `src/parent/progressionRouter.ts` | Aggregate waiter totals. |
| `bc_user_latest_v1` | `src/main.js` | Latest waiter activity/profile aggregate. |
| `bc_waiter_leaderboard_v1` | `src/lib/bcHandlers/leaderboard.js`, `src/main.js` | Waiter leaderboard rows. |
| `bc_weakest_link_v1` | `src/parent/progressionState.ts` | Weakest-link manager insight. |
| `bc_trend_fatigue_v1` | `src/parent/progressionState.ts` | Trend/fatigue manager insight. |

## Restaurant, Auth, And Scope Tables

| Object | Evidence | Purpose |
| --- | --- | --- |
| `profiles` | `src/main.js`, `src/lib/bcSync.ts` | User profile, role, and restaurant binding. |
| `restaurants` | `src/main.js` | Restaurant records, settings, seat limits. |
| `restaurant_invites` | `src/main.js` | Invite creation and redemption flow. |
| `bc_restaurant_seats_v1` | `src/main.js` | Seat/license accounting. |
| `bc_scope_restaurants` | `src/main.js` | Multi-restaurant scope membership. |

## Content And Messaging Tables

| Object | Evidence | Purpose |
| --- | --- | --- |
| `bc_messages_v1` | `src/lib/bcHandlers/progressReportSubmit.js`, `src/lib/bcHandlers/messagesUnread.js`, `src/lib/bcHandlers/messagesMarkRead.js`, `src/main.js` | Progress reports, manager messages, drill effectiveness notices. |
| `bc_wines` | `src/main.js`, `src/lib/bcHandlers/wines.js`, `src/lib/bcHandlers/winesMutate.js` | Restaurant wine list data. |
| `bc_drill_runs_v1` | `src/lib/bcHandlers/progressReportSubmit.js`, `src/main.js` | Drill runs and drill effectiveness updates. |
| `bc_run_counts_v1` | `src/main.js` | Run count summaries. |

## RPC Functions

| Function | Evidence | Purpose |
| --- | --- | --- |
| `admin_set_seat_limit` | `src/main.js` | Manager/admin seat limit update. |
| `bc_get_restaurant_environment_profiles_v1` | `src/main.js` | Environment roster lookup. |
| `claim_license_code` | `src/main.js` | License claim flow. |
| `create_restaurant` | `src/main.js` | Restaurant creation. |
| `create_restaurant_invite` | `src/main.js` | Invite creation. |
| `join_restaurant_by_code` | `src/main.js` | Join by code flow. |
| `redeem_code` | `src/main.js` | Code redemption flow. |

## Required Follow-Up

Add real Supabase migrations or schema docs for every table/RPC above before treating the backend contract as locked. The client currently assumes these objects exist, but the repository does not define them.
