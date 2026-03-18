-- BottleCaller security hardening, phase 1.
-- Goal: reduce browser-exposed mutation and scope leakage without breaking
-- the current authenticated app flows.
--
-- This phase does four things:
-- 1) introduces a canonical "allowed restaurants" helper for the current user
-- 2) enables RLS on scope tables and limits them to authenticated SELECT only
-- 3) narrows function execute grants away from PUBLIC/anon
-- 4) fixes the mutable-search-path / role-gating problems on admin_set_seat_limit
--    and removes the always-true warning on public.wines

begin;

-- ---------------------------------------------------------------------------
-- Canonical helpers
-- ---------------------------------------------------------------------------

create or replace function public.bc_canonical_membership_role(p_user_id uuid default auth.uid())
returns text
language sql
stable
set search_path = ''
as $$
  select lower(
    coalesce(
      nullif(p.membership_role, ''),
      case lower(coalesce(p.role, ''))
        when 'manager' then 'single_manager'
        when 'enterprise_admin' then 'enterpriser'
        else p.role
      end,
      'waiter'
    )
  )
  from public.profiles p
  where p.user_id = p_user_id
  limit 1
$$;

create or replace function public.get_allowed_restaurants_for_current_user()
returns table(
  scope_id uuid,
  scope_type text,
  restaurant_id uuid,
  restaurant_name text,
  restaurant_code text,
  seat_limit integer,
  require_invite boolean,
  is_active boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select
      p.user_id,
      lower(coalesce(p.scope_type, '')) as scope_type,
      p.scope_id,
      p.restaurant_id as active_restaurant_id
    from public.profiles p
    where p.user_id = auth.uid()
  ),
  allowed_restaurants as (
    select
      sr.scope_id,
      me.scope_type,
      r.id as restaurant_id,
      r.name as restaurant_name,
      r.code as restaurant_code,
      r.seat_limit,
      r.require_invite,
      (r.id = me.active_restaurant_id) as is_active,
      r.created_at
    from me
    join public.bc_scope_restaurants sr
      on (
        (me.scope_type = 'restaurant' and sr.scope_id = me.scope_id and sr.restaurant_id = me.active_restaurant_id)
        or
        (me.scope_type in ('group', 'enterprise') and sr.scope_id = me.scope_id)
      )
    join public.restaurants r
      on r.id = sr.restaurant_id
  )
  select distinct
    ar.scope_id,
    ar.scope_type,
    ar.restaurant_id,
    ar.restaurant_name,
    ar.restaurant_code,
    ar.seat_limit,
    ar.require_invite,
    ar.is_active
  from allowed_restaurants ar
  order by
    ar.is_active desc,
    ar.restaurant_name asc
$$;

revoke all on function public.get_allowed_restaurants_for_current_user() from public;
revoke all on function public.get_allowed_restaurants_for_current_user() from anon;
grant execute on function public.get_allowed_restaurants_for_current_user() to authenticated;

-- ---------------------------------------------------------------------------
-- Scope tables: authenticated SELECT only, now enforced by RLS
-- ---------------------------------------------------------------------------

alter table public.bc_scope_restaurants enable row level security;
alter table public.bc_scope_memberships enable row level security;
alter table public.bc_scopes enable row level security;

revoke all on public.bc_scope_restaurants from anon, authenticated;
revoke all on public.bc_scope_memberships from anon, authenticated;
revoke all on public.bc_scopes from anon, authenticated;

grant select on public.bc_scope_restaurants to authenticated;
grant select on public.bc_scope_memberships to authenticated;
grant select on public.bc_scopes to authenticated;

drop policy if exists bc_scope_restaurants_select_current_scope on public.bc_scope_restaurants;
create policy bc_scope_restaurants_select_current_scope
on public.bc_scope_restaurants
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles me
    where me.user_id = auth.uid()
      and (
        (
          lower(coalesce(me.scope_type, '')) = 'restaurant'
          and me.scope_id = bc_scope_restaurants.scope_id
          and me.restaurant_id = bc_scope_restaurants.restaurant_id
        )
        or
        (
          lower(coalesce(me.scope_type, '')) in ('group', 'enterprise')
          and me.scope_id = bc_scope_restaurants.scope_id
        )
      )
  )
  or exists (
    select 1
    from public.bc_scope_memberships sm
    where sm.user_id = auth.uid()
      and sm.scope_id = bc_scope_restaurants.scope_id
  )
);

drop policy if exists bc_scope_memberships_select_own on public.bc_scope_memberships;
create policy bc_scope_memberships_select_own
on public.bc_scope_memberships
for select
to authenticated
using (
  user_id = auth.uid()
);

drop policy if exists bc_scopes_select_current_scope on public.bc_scopes;
create policy bc_scopes_select_current_scope
on public.bc_scopes
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles me
    where me.user_id = auth.uid()
      and me.scope_id = bc_scopes.id
  )
  or exists (
    select 1
    from public.bc_scope_memberships sm
    where sm.user_id = auth.uid()
      and sm.scope_id = bc_scopes.id
  )
);

-- ---------------------------------------------------------------------------
-- Views: remove anon access, keep authenticated SELECT while we migrate the
-- client off broad view reads.
-- ---------------------------------------------------------------------------

revoke all on public.bc_manager_board_v1 from anon, authenticated;
revoke all on public.bc_readiness_v1 from anon, authenticated;
revoke all on public.bc_restaurant_seats_v1 from anon, authenticated;
revoke all on public.bc_trend_fatigue_v1 from anon, authenticated;
revoke all on public.bc_weakest_link_v1 from anon, authenticated;

grant select on public.bc_manager_board_v1 to authenticated;
grant select on public.bc_readiness_v1 to authenticated;
grant select on public.bc_restaurant_seats_v1 to authenticated;
grant select on public.bc_trend_fatigue_v1 to authenticated;
grant select on public.bc_weakest_link_v1 to authenticated;

-- ---------------------------------------------------------------------------
-- Function execute grants: PUBLIC/anon should not be able to call these.
-- ---------------------------------------------------------------------------

revoke all on function public.admin_set_seat_limit(uuid, integer) from public;
revoke all on function public.admin_set_seat_limit(uuid, integer) from anon;
grant execute on function public.admin_set_seat_limit(uuid, integer) to authenticated;

revoke all on function public.claim_license_code(text, text) from public;
revoke all on function public.claim_license_code(text, text) from anon;
grant execute on function public.claim_license_code(text, text) to authenticated;

revoke all on function public.redeem_code(text) from public;
revoke all on function public.redeem_code(text) from anon;
grant execute on function public.redeem_code(text) to authenticated;

revoke all on function public.create_restaurant(text) from public;
revoke all on function public.create_restaurant(text) from anon;
grant execute on function public.create_restaurant(text) to authenticated;

revoke all on function public.create_restaurant_from_code(text, text) from public;
revoke all on function public.create_restaurant_from_code(text, text) from anon;
grant execute on function public.create_restaurant_from_code(text, text) to authenticated;

revoke all on function public.create_restaurant_invite(uuid, text) from public;
revoke all on function public.create_restaurant_invite(uuid, text) from anon;
grant execute on function public.create_restaurant_invite(uuid, text) to authenticated;

revoke all on function public.join_restaurant_by_code(text) from public;
revoke all on function public.join_restaurant_by_code(text) from anon;
grant execute on function public.join_restaurant_by_code(text) to authenticated;

revoke all on function public.add_restaurant_to_scope(uuid, uuid) from public;
revoke all on function public.add_restaurant_to_scope(uuid, uuid) from anon;
grant execute on function public.add_restaurant_to_scope(uuid, uuid) to authenticated;

revoke all on function public.set_active_restaurant_for_scope(uuid) from public;
revoke all on function public.set_active_restaurant_for_scope(uuid) from anon;
grant execute on function public.set_active_restaurant_for_scope(uuid) to authenticated;

revoke all on function public.get_scope_restaurants(uuid) from public;
revoke all on function public.get_scope_restaurants(uuid) from anon;
grant execute on function public.get_scope_restaurants(uuid) to authenticated;

revoke all on function public.bc_get_restaurant_manager_ids(uuid) from public;
revoke all on function public.bc_get_restaurant_manager_ids(uuid) from anon;
grant execute on function public.bc_get_restaurant_manager_ids(uuid) to authenticated;

revoke all on function public.bc_get_restaurant_manager_targets_v1(uuid) from public;
revoke all on function public.bc_get_restaurant_manager_targets_v1(uuid) from anon;
grant execute on function public.bc_get_restaurant_manager_targets_v1(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_set_seat_limit: fix search_path, align parameter name with current app
-- caller (p_new_limit), and support the canonical manager role set.
-- ---------------------------------------------------------------------------

drop function if exists public.admin_set_seat_limit(uuid, integer);

create or replace function public.admin_set_seat_limit(p_restaurant_id uuid, p_new_limit integer)
returns json
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_scope_id uuid;
  v_scope_type text;
  v_role text;
  v_allowed boolean := false;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_new_limit is null or p_new_limit < 1 then
    raise exception 'invalid_seat_limit';
  end if;

  select
    p.scope_id,
    lower(coalesce(p.scope_type, '')),
    lower(
      coalesce(
        nullif(p.membership_role, ''),
        case lower(coalesce(p.role, ''))
          when 'manager' then 'single_manager'
          when 'enterprise_admin' then 'enterpriser'
          else p.role
        end,
        'waiter'
      )
    )
  into v_scope_id, v_scope_type, v_role
  from public.profiles p
  where p.user_id = v_uid;

  if v_role = 'single_manager' and v_scope_type = 'restaurant' then
    select exists (
      select 1
      from public.profiles p
      where p.user_id = v_uid
        and p.restaurant_id = p_restaurant_id
    ) into v_allowed;
  elsif v_role in ('group_manager', 'enterpriser') and v_scope_type in ('group', 'enterprise') then
    select exists (
      select 1
      from public.bc_scope_restaurants sr
      where sr.scope_id = v_scope_id
        and sr.restaurant_id = p_restaurant_id
    ) into v_allowed;
  end if;

  if not v_allowed then
    return json_build_object('ok', false, 'error', 'not_authorized');
  end if;

  update public.restaurants
  set seat_limit = p_new_limit
  where id = p_restaurant_id;

  return json_build_object(
    'ok', true,
    'restaurant_id', p_restaurant_id,
    'seat_limit', p_new_limit
  );
end;
$function$;

revoke all on function public.admin_set_seat_limit(uuid, integer) from public;
revoke all on function public.admin_set_seat_limit(uuid, integer) from anon;
grant execute on function public.admin_set_seat_limit(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Wines: fix the always-true policy warning on legacy public.wines and align
-- bc_wines manager policies with canonical manager roles.
-- ---------------------------------------------------------------------------

drop policy if exists wines_update_admin_only on public.wines;
create policy wines_update_admin_only
on public.wines
for update
to authenticated
using (
  (
    (
      select lower(coalesce(p.role, ''))
      from public.profiles p
      where p.user_id = auth.uid()
    ) = 'admin'
  )
  and restaurant_id = (
    select p.restaurant_id
    from public.profiles p
    where p.user_id = auth.uid()
  )
)
with check (
  (
    (
      select lower(coalesce(p.role, ''))
      from public.profiles p
      where p.user_id = auth.uid()
    ) = 'admin'
  )
  and restaurant_id = (
    select p.restaurant_id
    from public.profiles p
    where p.user_id = auth.uid()
  )
);

drop policy if exists "managers delete wines" on public.bc_wines;
drop policy if exists "managers insert wines" on public.bc_wines;
drop policy if exists "managers update wines" on public.bc_wines;

create policy "managers delete wines"
on public.bc_wines
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.restaurant_id = bc_wines.restaurant_id
      and lower(
        coalesce(
          nullif(p.membership_role, ''),
          case lower(coalesce(p.role, ''))
            when 'manager' then 'single_manager'
            when 'enterprise_admin' then 'enterpriser'
            else p.role
          end,
          'waiter'
        )
      ) in ('single_manager', 'group_manager', 'enterpriser')
  )
);

create policy "managers insert wines"
on public.bc_wines
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.restaurant_id = bc_wines.restaurant_id
      and lower(
        coalesce(
          nullif(p.membership_role, ''),
          case lower(coalesce(p.role, ''))
            when 'manager' then 'single_manager'
            when 'enterprise_admin' then 'enterpriser'
            else p.role
          end,
          'waiter'
        )
      ) in ('single_manager', 'group_manager', 'enterpriser')
  )
);

create policy "managers update wines"
on public.bc_wines
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.restaurant_id = bc_wines.restaurant_id
      and lower(
        coalesce(
          nullif(p.membership_role, ''),
          case lower(coalesce(p.role, ''))
            when 'manager' then 'single_manager'
            when 'enterprise_admin' then 'enterpriser'
            else p.role
          end,
          'waiter'
        )
      ) in ('single_manager', 'group_manager', 'enterpriser')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.restaurant_id = bc_wines.restaurant_id
      and lower(
        coalesce(
          nullif(p.membership_role, ''),
          case lower(coalesce(p.role, ''))
            when 'manager' then 'single_manager'
            when 'enterprise_admin' then 'enterpriser'
            else p.role
          end,
          'waiter'
        )
      ) in ('single_manager', 'group_manager', 'enterpriser')
  )
);

commit;
