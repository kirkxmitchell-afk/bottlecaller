# DB Source-Control Inventory

Snapshot date: 2026-03-18

This inventory is based on:
- repo migrations under `my-vite-app/supabase/migrations/`
- the exported backup snapshot at [2026-03-18_exported_functions_policies_reconstruction_backup.sql](/Users/huntly/bottlecaller/my-vite-app/supabase/backups/2026-03-18_exported_functions_policies_reconstruction_backup.sql)
- the live `pg_policies` / view-definition retrievals provided from Supabase

## In Repo And Actively Managed

These are now clearly represented by repo migrations:

- `public.bc_canonical_membership_role(uuid)`
- `public.get_allowed_restaurants_for_current_user()`
- `public.admin_set_seat_limit(uuid, integer)`
- `public.is_manager_in_restaurant(uuid)`
- `public.create_restaurant_invite(uuid, text)`
- `public.claim_license_code(text, text)`
- `public.redeem_code(text)`
- `public.add_restaurant_to_scope(uuid, uuid)`
- `public.admin_attach_restaurant_to_scope(uuid, uuid)`
- `public.bc_get_restaurant_manager_targets_v1(uuid)`
- `public.create_restaurant(text)`
- `public.create_restaurant_from_code(text, text)`
- `public.get_scope_restaurants(uuid)`
- `public.join_restaurant_by_code(text)`
- `public.set_active_restaurant_for_scope(uuid)`
- scope-table RLS on `bc_scope_restaurants`, `bc_scope_memberships`, `bc_scopes`
- hardening/cleanup policies on `bc_event_log`, `bc_messages_v1`, `bc_progression_state_v1`, `restaurant_invites`, `bc_wines`, `wines`
- view `security_invoker` changes in phase 2

## Live Functions Missing From Repo Migrations

These function definitions appear in the Supabase backup snapshot, but are not authored as first-class repo migrations today:

None from the previously identified high-impact lifecycle set.

The backup snapshot still remains useful as a historical reference, but the
main app-used lifecycle functions have now been brought under repo control.

## Functions Referenced But Still Unresolved

These are referenced by repo migrations, but no authoritative definition currently exists in repo migrations, and they were not present in the backup reconstruction file either:

- `public.create_restaurant_invite(uuid, text)`

Live lookup result: not found with that exact signature in `public`.

Important note:

- `create_restaurant_invite` is still called by the app code, so this is an active gap that should be implemented or retrieved intentionally.

## Stale Repo References

These names are referenced in repo migrations but were not found live in Supabase with the expected signatures:

- `public.bc_get_restaurant_manager_ids(uuid)`

Current repo scan found no app call site for `bc_get_restaurant_manager_ids`, so it currently looks like a stale migration reference rather than an active production dependency.

## Live Policies Still Not Clearly Source-Controlled

These policy areas still exist live in Supabase, but are not fully represented by current repo migrations as authoritative definitions:

### Telemetry / activity tables

- `bc_drill_runs_v1`
  - `bc_drill_runs_insert_own`
  - `bc_drill_runs_select_manager_restaurant`
  - `bc_drill_runs_select_own`
  - `bc_drill_runs_update_own`

- `bc_skill_snapshots_v1`
  - `bc_skill_snapshots_insert_own`
  - `bc_skill_snapshots_select_manager_restaurant`
  - `bc_skill_snapshots_select_own`

### Messaging tables

- `bc_messages_v1`
  - `bc_messages_insert_sender`
  - `bc_messages_select_own`
  - `bc_messages_update_receiver`
  - `bc_messages_select_manager_restaurant`

### Residual own-profile / restaurant policies

- `profiles`
  - `profile_insert_own`
  - `profile_read_own`
  - `profile_update_own`
  - `profiles_select_manager_same_restaurant`
  - `profiles_select_own`
  - `user_can_read_own_profile`
  - `user_can_update_own_profile`

- `restaurants`
  - `restaurant_insert_own`
  - `restaurant_read_by_members`

### Remaining wine policies still live

- `bc_wines`
  - `read wines in my restaurant`
  - `waiters can read restaurant wines`

- `wines`
  - `wines_read_same_restaurant`
  - `wines_write_admin_only`

## Recommended Next Cleanup Order

If you want to continue source-controlling the DB in a disciplined way, the next order should be:

1. Resolve the active missing function definition:
   - `create_restaurant_invite`
   This is called by the app and was not found live with the expected signature.

2. Source-control the high-impact lifecycle functions from the backup snapshot:
   - `claim_license_code`
   - `create_restaurant`
   - `create_restaurant_from_code`
   - `join_restaurant_by_code`
   - `redeem_code`
   - `set_active_restaurant_for_scope`
   - `add_restaurant_to_scope`

3. Remove stale migration references such as:
   - `bc_get_restaurant_manager_ids`

4. Normalize role naming inside those functions to the current canonical model:
   - `single_manager`
   - `group_manager`
   - `enterpriser`
   - `waiter`

5. Consolidate duplicated live policies on:
   - `profiles`
   - `bc_drill_runs_v1`
   - `bc_skill_snapshots_v1`
   - any remaining legacy `wines` table usage

## Practical Meaning

The app is now materially hardened, but the repo is still not a complete source of truth for the live database.

Current status:

- security posture: much better
- operational risk: reduced
- source-control completeness: improved, but still partial

The next project is no longer emergency security response. It is controlled database codification.
