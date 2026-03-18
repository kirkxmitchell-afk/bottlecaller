-- BottleCaller security hardening, phase 1.5.
-- Apply after phase 1 and before phase 2.
--
-- Goal: make the phase-2 `security_invoker` view flip viable by tightening and
-- normalizing the base-table RLS that manager-facing views actually depend on.
--
-- This phase does three things:
-- 1) broadens manager restaurant-access checks from "current restaurant only"
--    to canonical scope-aware access (restaurant / group / enterprise)
-- 2) removes legacy PUBLIC telemetry policies from bc_event_log and replaces
--    overlapping manager telemetry rules with one canonical authenticated rule
-- 3) gives managers authenticated read access to waiter progress/drill messages
--    in restaurants they can manage so bc_waiter_leaderboard_v1 can survive
--    `security_invoker = true`

begin;

-- ---------------------------------------------------------------------------
-- Canonical manager restaurant access helper.
-- ---------------------------------------------------------------------------

create or replace function public.is_manager_in_restaurant(p_restaurant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles me
    where me.user_id = auth.uid()
      and public.bc_canonical_membership_role(me.user_id) in (
        'single_manager',
        'group_manager',
        'enterpriser'
      )
      and (
        (
          lower(coalesce(me.scope_type, '')) = 'restaurant'
          and me.restaurant_id = p_restaurant
        )
        or
        (
          lower(coalesce(me.scope_type, '')) in ('group', 'enterprise')
          and exists (
            select 1
            from public.bc_scope_restaurants sr
            where sr.scope_id = me.scope_id
              and sr.restaurant_id = p_restaurant
          )
        )
      )
  )
$$;

revoke all on function public.is_manager_in_restaurant(uuid) from public;
revoke all on function public.is_manager_in_restaurant(uuid) from anon;
grant execute on function public.is_manager_in_restaurant(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- bc_event_log: authenticated-only own insert/select/update plus one canonical
-- manager read policy across scope restaurants.
-- ---------------------------------------------------------------------------

drop policy if exists "Players can insert their own events" on public.bc_event_log;
drop policy if exists "Players can read their own events" on public.bc_event_log;
drop policy if exists "manager can read restaurant telemetry" on public.bc_event_log;
drop policy if exists bc_event_log_read_manager_scope_restaurants on public.bc_event_log;

create policy bc_event_log_read_manager_scope_restaurants_v2
on public.bc_event_log
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    restaurant_id is not null
    and public.is_manager_in_restaurant(restaurant_id)
  )
);

-- ---------------------------------------------------------------------------
-- bc_messages_v1: keep sender/receiver visibility and add manager visibility
-- for waiter progress/drill messages in manageable restaurants. This is the
-- minimum read surface needed for bc_waiter_leaderboard_v1 under security_invoker.
-- ---------------------------------------------------------------------------

drop policy if exists bc_messages_select_manager_restaurant on public.bc_messages_v1;

create policy bc_messages_select_manager_restaurant
on public.bc_messages_v1
for select
to authenticated
using (
  (
    sender_user_id = auth.uid()
    or receiver_user_id = auth.uid()
  )
  or (
    restaurant_id is not null
    and type in ('progress_report', 'drill_completed')
    and sender_role = 'waiter'
    and public.is_manager_in_restaurant(restaurant_id)
  )
);

commit;
