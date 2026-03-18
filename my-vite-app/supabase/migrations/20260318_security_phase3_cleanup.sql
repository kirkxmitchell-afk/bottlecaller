-- BottleCaller security hardening, phase 3 cleanup.
-- Apply after phases 1, 1.5, and 2.
--
-- Goal: remove obvious legacy overlap left behind after the hardening passes,
-- while preserving current authenticated app behavior.
--
-- This phase does three things:
-- 1) removes legacy PUBLIC table access on auth-bound tables
-- 2) replaces PUBLIC auth.uid()-based progression policies with authenticated
-- 3) replaces overlapping restaurant_invites policies with one canonical
--    authenticated policy set that supports both legacy admin and current
--    manager-role access

begin;

-- ---------------------------------------------------------------------------
-- bc_event_log / bc_messages_v1: remove lingering broad grants and keep only
-- authenticated table privileges to match the RLS model already in place.
-- ---------------------------------------------------------------------------

revoke all on public.bc_event_log from public, anon;
grant select, insert, update on public.bc_event_log to authenticated;

revoke all on public.bc_messages_v1 from public, anon;
grant select, insert, update on public.bc_messages_v1 to authenticated;

-- ---------------------------------------------------------------------------
-- bc_progression_state_v1: convert legacy PUBLIC policies to authenticated-only
-- while preserving the same row predicates.
-- ---------------------------------------------------------------------------

revoke all on public.bc_progression_state_v1 from public, anon;
grant select, insert, update on public.bc_progression_state_v1 to authenticated;

drop policy if exists "bc_progression_state_v1_select_own" on public.bc_progression_state_v1;
drop policy if exists "bc_progression_state_v1_insert_own" on public.bc_progression_state_v1;
drop policy if exists "bc_progression_state_v1_update_own" on public.bc_progression_state_v1;

create policy "bc_progression_state_v1_select_own"
on public.bc_progression_state_v1
for select
to authenticated
using (auth.uid() = user_id);

create policy "bc_progression_state_v1_insert_own"
on public.bc_progression_state_v1
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "bc_progression_state_v1_update_own"
on public.bc_progression_state_v1
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- restaurant_invites: remove overlapping admin/public policies and replace
-- them with one canonical authenticated policy set.
-- ---------------------------------------------------------------------------

revoke all on public.restaurant_invites from public, anon;
grant select, insert, update on public.restaurant_invites to authenticated;

drop policy if exists "Admins can insert invites for their restaurant" on public.restaurant_invites;
drop policy if exists "Admins can read invites for their restaurant" on public.restaurant_invites;
drop policy if exists "Admins can update invites for their restaurant" on public.restaurant_invites;
drop policy if exists managers_insert_own_restaurant_invites on public.restaurant_invites;
drop policy if exists managers_select_own_restaurant_invites on public.restaurant_invites;
drop policy if exists managers_update_own_restaurant_invites on public.restaurant_invites;

create policy restaurant_invites_insert_manager_scope
on public.restaurant_invites
for insert
to authenticated
with check (
  (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and lower(coalesce(p.role, '')) = 'admin'
        and p.restaurant_id = restaurant_invites.restaurant_id
    )
  )
  or public.is_manager_in_restaurant(restaurant_invites.restaurant_id)
);

create policy restaurant_invites_select_manager_scope
on public.restaurant_invites
for select
to authenticated
using (
  (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and lower(coalesce(p.role, '')) = 'admin'
        and p.restaurant_id = restaurant_invites.restaurant_id
    )
  )
  or public.is_manager_in_restaurant(restaurant_invites.restaurant_id)
);

create policy restaurant_invites_update_manager_scope
on public.restaurant_invites
for update
to authenticated
using (
  (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and lower(coalesce(p.role, '')) = 'admin'
        and p.restaurant_id = restaurant_invites.restaurant_id
    )
  )
  or public.is_manager_in_restaurant(restaurant_invites.restaurant_id)
)
with check (
  (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and lower(coalesce(p.role, '')) = 'admin'
        and p.restaurant_id = restaurant_invites.restaurant_id
    )
  )
  or public.is_manager_in_restaurant(restaurant_invites.restaurant_id)
);

commit;
