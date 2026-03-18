-- BACKUP / RECOVERY SNAPSHOT ONLY.
-- Reconstructed from exported function/policy metadata on 2026-03-18.
-- Keep this as a reference copy for disaster recovery, diffing, or manual
-- restoration of older definitions after a bad migration or accidental drop.
-- Do not use this as the source of truth for current security behavior.
-- Running this file can overwrite newer hardening in 20260318_security_phase1_safe.sql
-- because the source export contained dump artifacts and legacy role naming.

begin;

-- ===== CREATE FUNCTION definitions =====

create or replace function public.add_restaurant_to_scope(p_scope_id uuid, p_restaurant_id uuid)
returns json
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_scope_type text;
  v_limit int;
  v_count int;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select lower(coalesce(role, ''))
  into v_role
  from public.profiles
  where user_id = v_uid;

  if v_role <> 'manager' then
    return json_build_object('ok', false, 'error', 'not_manager');
  end if;

  select scope_type, restaurant_limit
  into v_scope_type, v_limit
  from public.bc_scopes
  where id = p_scope_id;

  if v_scope_type is null then
    return json_build_object('ok', false, 'error', 'scope_not_found');
  end if;

  if v_scope_type not in ('group', 'enterprise') then
    return json_build_object('ok', false, 'error', 'invalid_scope_type');
  end if;

  if not exists (
    select 1
    from public.profiles
    where user_id = v_uid
      and scope_id = p_scope_id
      and scope_type = v_scope_type
      and access_tier = 'premium'
  ) then
    return json_build_object('ok', false, 'error', 'not_in_that_scope');
  end if;

  select count(*)
  into v_count
  from public.bc_scope_restaurants
  where scope_id = p_scope_id;

  if v_limit is not null and v_count >= v_limit then
    return json_build_object(
      'ok', false,
      'error', 'scope_restaurant_limit_reached',
      'limit', v_limit
    );
  end if;

  insert into public.bc_scope_restaurants (scope_id, restaurant_id)
  values (p_scope_id, p_restaurant_id)
  on conflict do nothing;

  return json_build_object(
    'ok', true,
    'scope_id', p_scope_id,
    'restaurant_id', p_restaurant_id
  );
end;
$function$;

create or replace function public.admin_attach_restaurant_to_scope(p_scope_id uuid, p_restaurant_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_scope_type text;
begin
  select scope_type
  into v_scope_type
  from public.bc_scopes
  where id = p_scope_id;

  if v_scope_type not in ('group', 'enterprise') then
    return json_build_object('ok', false, 'error', 'scope_not_group_or_enterprise');
  end if;

  insert into public.bc_scope_restaurants (scope_id, restaurant_id)
  values (p_scope_id, p_restaurant_id)
  on conflict do nothing;

  return json_build_object('ok', true);
end;
$function$;

create or replace function public.admin_set_seat_limit(p_restaurant_id uuid, p_seat_limit integer)
returns json
language plpgsql
security definer
as $function$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if p_seat_limit is null or p_seat_limit < 1 then
    raise exception 'invalid_seat_limit';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'manager'
      and p.access_tier = 'premium'
      and p.restaurant_id = p_restaurant_id
  ) then
    return json_build_object('ok', false, 'error', 'not_authorized');
  end if;

  update public.restaurants
  set seat_limit = p_seat_limit
  where id = p_restaurant_id;

  return json_build_object(
    'ok', true,
    'restaurant_id', p_restaurant_id,
    'seat_limit', p_seat_limit
  );
end;
$function$;

create or replace function public.bc_get_restaurant_manager_targets_v1(p_restaurant_id uuid)
returns table(user_id uuid, display_name text, role text)
language sql
security definer
set search_path = public
as $function$
  select
    p.user_id,
    coalesce(nullif(p.display_name, ''), 'Manager') as display_name,
    p.role
  from public.profiles p
  where p.restaurant_id = p_restaurant_id
    and p.role in ('manager', 'group_manager', 'enterprise_admin')
  order by
    case p.role
      when 'manager' then 1
      when 'group_manager' then 2
      else 3
    end,
    p.created_at asc;
$function$;

create or replace function public.claim_license_code(p_code text, p_restaurant_name text default null::text)
returns json
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  v_profile_role text;
  v_profile_membership_role text;
  v_lc public.license_codes%rowtype;
  v_new_restaurant_id uuid;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_code = '' then
    return json_build_object('ok', false, 'error', 'missing_code');
  end if;

  select
    lower(coalesce(role, '')),
    lower(coalesce(membership_role, ''))
  into v_profile_role, v_profile_membership_role
  from public.profiles
  where user_id = v_uid;

  select *
  into v_lc
  from public.license_codes
  where code = v_code
  for update;

  if not found then
    return json_build_object('ok', false, 'error', 'invalid_code');
  end if;

  if v_lc.status = 'disabled' or v_lc.disabled_at is not null then
    return json_build_object('ok', false, 'error', 'disabled');
  end if;

  if v_lc.code_purpose <> 'manager_setup' then
    return json_build_object('ok', false, 'error', 'not_manager_setup_code');
  end if;

  if v_lc.package_tier not in ('single_manager', 'group_manager', 'enterpriser') then
    return json_build_object('ok', false, 'error', 'invalid_package_tier');
  end if;

  if v_lc.scope_type not in ('restaurant', 'group', 'enterprise') then
    return json_build_object('ok', false, 'error', 'invalid_scope_type');
  end if;

  if v_lc.claimed_by is not null and v_lc.claimed_by <> v_uid then
    return json_build_object('ok', false, 'error', 'code_claimed_by_other');
  end if;

  if v_profile_role not in ('single_manager', 'group_manager', 'enterpriser')
     and v_profile_membership_role not in ('single_manager', 'group_manager', 'enterpriser') then
    return json_build_object('ok', false, 'error', 'invalid_manager_membership');
  end if;

  if coalesce(v_profile_membership_role, v_profile_role) <> v_lc.package_tier then
    return json_build_object(
      'ok', false,
      'error', 'membership_package_mismatch',
      'expected', v_lc.package_tier,
      'actual', coalesce(v_profile_membership_role, v_profile_role)
    );
  end if;

  update public.license_codes
  set claimed_by = v_uid,
      claimed_role = v_lc.package_tier,
      access_tier = coalesce(v_lc.access_tier, 'premium')
  where code = v_code;

  if v_lc.scope_type = 'restaurant' then
    if v_lc.restaurant_id is null then
      if coalesce(trim(p_restaurant_name), '') = '' then
        update public.license_codes
        set status = 'restaurant_pending_name'
        where code = v_code;

        return json_build_object(
          'ok', false,
          'error', 'need_restaurant_name',
          'code', v_code
        );
      end if;

      insert into public.restaurants (
        name,
        code,
        seat_limit,
        require_invite,
        created_by
      )
      values (
        trim(p_restaurant_name),
        v_code,
        coalesce(v_lc.seat_limit_override, 15),
        true,
        v_uid
      )
      returning id into v_new_restaurant_id;

      update public.license_codes
      set restaurant_id = v_new_restaurant_id,
          scope_id = v_new_restaurant_id,
          status = 'restaurant_active'
      where code = v_code;
    else
      v_new_restaurant_id := v_lc.restaurant_id;

      update public.license_codes
      set status = 'restaurant_active'
      where code = v_code;
    end if;

    update public.profiles
    set role = v_lc.package_tier,
        membership_role = v_lc.package_tier,
        access_tier = 'premium',
        scope_type = 'restaurant',
        scope_id = v_new_restaurant_id,
        restaurant_id = v_new_restaurant_id
    where user_id = v_uid;

    return json_build_object(
      'ok', true,
      'mode', 'premium_restaurant',
      'code', v_code,
      'membership_role', v_lc.package_tier,
      'scope_type', 'restaurant',
      'scope_id', v_new_restaurant_id,
      'restaurant_id', v_new_restaurant_id
    );
  end if;

  if v_lc.scope_type = 'group' then
    update public.license_codes
    set status = 'group_active'
    where code = v_code;

    update public.profiles
    set role = 'group_manager',
        membership_role = 'group_manager',
        access_tier = 'premium',
        scope_type = 'group',
        scope_id = v_lc.scope_id
    where user_id = v_uid;

    return json_build_object(
      'ok', true,
      'mode', 'group_active',
      'code', v_code,
      'membership_role', 'group_manager',
      'scope_type', 'group',
      'scope_id', v_lc.scope_id,
      'max_restaurants', v_lc.max_restaurants
    );
  end if;

  if v_lc.scope_type = 'enterprise' then
    update public.license_codes
    set status = 'enterprise_active'
    where code = v_code;

    update public.profiles
    set role = 'enterpriser',
        membership_role = 'enterpriser',
        access_tier = 'premium',
        scope_type = 'enterprise',
        scope_id = v_lc.scope_id
    where user_id = v_uid;

    return json_build_object(
      'ok', true,
      'mode', 'enterprise_active',
      'code', v_code,
      'membership_role', 'enterpriser',
      'scope_type', 'enterprise',
      'scope_id', v_lc.scope_id,
      'max_restaurants', v_lc.max_restaurants
    );
  end if;

  return json_build_object('ok', false, 'error', 'unhandled_scope_type');
end;
$function$;

create or replace function public.create_restaurant(p_name text)
returns json
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_uid uuid;
  v_role text;
  v_existing uuid;
  v_restaurant public.restaurants%rowtype;
  v_code text;
  v_scope_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select lower(coalesce(role, '')), restaurant_id
  into v_role, v_existing
  from public.profiles
  where user_id = v_uid;

  if v_role = '' then
    return json_build_object('ok', false, 'error', 'profile_missing');
  end if;

  if v_role not in ('manager', 'single_manager', 'group_manager', 'enterpriser') then
    return json_build_object('ok', false, 'error', 'manager_only');
  end if;

  if v_existing is not null then
    return json_build_object('ok', false, 'error', 'already_has_restaurant');
  end if;

  if coalesce(trim(p_name), '') = '' then
    return json_build_object('ok', false, 'error', 'missing_name');
  end if;

  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));

  insert into public.restaurants (name, code, seat_limit, require_invite, created_by)
  values (trim(p_name), v_code, 15, true, v_uid)
  returning * into v_restaurant;

  insert into public.bc_scopes (scope_type, name, created_by)
  values ('restaurant', trim(p_name), v_uid)
  returning id into v_scope_id;

  insert into public.bc_scope_restaurants (scope_id, restaurant_id)
  values (v_scope_id, v_restaurant.id);

  update public.profiles
  set restaurant_id = v_restaurant.id,
      access_tier = 'premium',
      scope_type = 'restaurant',
      scope_id = v_scope_id,
      membership_role = case
        when role = 'manager' then 'single_manager'
        else role
      end
  where user_id = v_uid;

  return json_build_object(
    'ok', true,
    'restaurant', row_to_json(v_restaurant),
    'scope_id', v_scope_id
  );
end;
$function$;

create or replace function public.create_restaurant_from_code(p_code text, p_name text)
returns json
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_name text := trim(coalesce(p_name, ''));
  v_uid uuid := auth.uid();
  v_role text;
  v_row public.license_codes%rowtype;
  v_scope_id uuid;
  v_restaurant_id uuid;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_code = '' then
    return json_build_object('ok', false, 'error', 'missing_code');
  end if;

  if v_name = '' then
    return json_build_object('ok', false, 'error', 'missing_restaurant_name');
  end if;

  select lower(coalesce(role, ''))
  into v_role
  from public.profiles
  where user_id = v_uid;

  if v_role <> 'manager' then
    return json_build_object('ok', false, 'error', 'manager_only');
  end if;

  select *
  into v_row
  from public.license_codes
  where code = v_code
  for update;

  if not found then
    return json_build_object('ok', false, 'error', 'code_not_found');
  end if;

  if v_row.status <> 'restaurant_pending_name' then
    return json_build_object(
      'ok', false,
      'error', 'invalid_code_state',
      'status', v_row.status
    );
  end if;

  if v_row.claimed_by is not null and v_row.claimed_by <> v_uid then
    return json_build_object('ok', false, 'error', 'code_claimed_by_other');
  end if;

  v_scope_id := v_row.scope_id;
  if v_scope_id is null then
    return json_build_object('ok', false, 'error', 'missing_scope');
  end if;

  insert into public.restaurants (name, created_by)
  values (v_name, v_uid)
  returning id into v_restaurant_id;

  insert into public.bc_scope_restaurants (scope_id, restaurant_id)
  values (v_scope_id, v_restaurant_id)
  on conflict do nothing;

  update public.license_codes
  set status = 'restaurant_active',
      claimed_by = v_uid,
      claimed_role = 'manager',
      restaurant_id = v_restaurant_id,
      access_tier = 'premium'
  where code = v_code;

  update public.profiles
  set access_tier = 'premium',
      restaurant_id = v_restaurant_id,
      scope_type = 'restaurant',
      scope_id = v_scope_id
  where user_id = v_uid;

  return json_build_object(
    'ok', true,
    'restaurant_id', v_restaurant_id,
    'scope_id', v_scope_id,
    'code', v_code
  );
exception
  when others then
    return json_build_object('ok', false, 'error', 'server_error', 'detail', sqlerrm);
end;
$function$;

create or replace function public.get_scope_restaurants(p_scope_id uuid)
returns table(restaurant_id uuid, restaurant_name text, restaurant_code text, seat_limit integer)
language sql
security definer
set search_path = public
as $function$
  select
    r.id as restaurant_id,
    r.name as restaurant_name,
    r.code as restaurant_code,
    r.seat_limit
  from public.bc_scope_restaurants sr
  join public.restaurants r on r.id = sr.restaurant_id
  where sr.scope_id = p_scope_id
  order by r.created_at asc;
$function$;

create or replace function public.is_manager_in_restaurant(p_restaurant uuid)
returns boolean
language sql
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.profiles me
    where me.user_id = auth.uid()
      and lower(me.role) in ('manager', 'group_manager', 'enterprise_admin')
      and me.restaurant_id = p_restaurant
  );
$function$;

create or replace function public.join_restaurant_by_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  v_input text := upper(trim(coalesce(p_code, '')));
  v_restaurant_id uuid;
  v_scope_id uuid;
  v_seat_limit int;
  v_count int;
  v_require_invite boolean;
  v_email text;
  v_ok boolean;
  v_lc public.license_codes%rowtype;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_input = '' then
    return json_build_object('ok', false, 'error', 'missing_code');
  end if;

  if exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and restaurant_id is not null
  ) then
    return json_build_object('ok', false, 'error', 'already_in_restaurant');
  end if;

  select *
  into v_lc
  from public.license_codes
  where code = v_input
  for update;

  if found then
    if v_lc.status = 'disabled' then
      return json_build_object('ok', false, 'error', 'code_disabled');
    end if;

    if v_lc.status = 'restaurant_active' and v_lc.restaurant_id is not null then
      v_restaurant_id := v_lc.restaurant_id;
    end if;
  end if;

  if v_restaurant_id is null then
    select id
    into v_restaurant_id
    from public.restaurants
    where code = v_input;
  end if;

  if v_restaurant_id is null then
    return json_build_object('ok', false, 'error', 'invalid_code');
  end if;

  select seat_limit, require_invite
  into v_seat_limit, v_require_invite
  from public.restaurants
  where id = v_restaurant_id;

  if v_require_invite then
    v_email := lower(auth.email());

    select exists (
      select 1
      from public.restaurant_invites i
      where i.restaurant_id = v_restaurant_id
        and i.email = v_email
        and i.status in ('pending', 'accepted')
    )
    into v_ok;

    if not v_ok then
      return json_build_object('ok', false, 'error', 'invite_required');
    end if;
  end if;

  select count(*)
  into v_count
  from public.profiles
  where restaurant_id = v_restaurant_id;

  if v_count >= v_seat_limit then
    return json_build_object('ok', false, 'error', 'seat_limit_reached');
  end if;

  select bsr.scope_id
  into v_scope_id
  from public.bc_scope_restaurants bsr
  join public.bc_scopes s on s.id = bsr.scope_id
  where bsr.restaurant_id = v_restaurant_id
    and s.scope_type = 'restaurant'
  limit 1;

  if v_scope_id is null then
    return json_build_object('ok', false, 'error', 'restaurant_scope_missing');
  end if;

  update public.profiles
  set role = 'waiter',
      membership_role = 'waiter',
      restaurant_id = v_restaurant_id,
      access_tier = 'premium',
      scope_type = 'restaurant',
      scope_id = v_scope_id
  where user_id = auth.uid();

  if v_require_invite then
    update public.restaurant_invites
    set status = 'accepted',
        accepted_user_id = auth.uid()
    where restaurant_id = v_restaurant_id
      and email = lower(auth.email())
      and status = 'pending';
  end if;

  return json_build_object(
    'ok', true,
    'restaurant_id', v_restaurant_id,
    'membership_role', 'waiter',
    'scope_type', 'restaurant',
    'scope_id', v_scope_id
  );
end;
$function$;

create or replace function public.redeem_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  v_profile public.profiles%rowtype;
  v_lc public.license_codes%rowtype;
  v_join json;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_code = '' then
    return json_build_object('ok', false, 'error', 'missing_code');
  end if;

  select *
  into v_profile
  from public.profiles
  where user_id = v_uid;

  if not found then
    return json_build_object('ok', false, 'error', 'profile_not_found');
  end if;

  select *
  into v_lc
  from public.license_codes
  where code = v_code
  for update;

  if not found then
    return json_build_object('ok', false, 'error', 'code_not_found');
  end if;

  if v_lc.status = 'disabled' or v_lc.disabled_at is not null then
    return json_build_object('ok', false, 'error', 'code_disabled');
  end if;

  if coalesce(v_lc.code_purpose, '') = 'manager_setup' then
    if coalesce(v_profile.membership_role, v_profile.role, '') = 'waiter' then
      return json_build_object('ok', false, 'error', 'manager_code_required');
    end if;

    if v_lc.scope_type = 'restaurant' then
      if v_lc.restaurant_id is null then
        return json_build_object(
          'ok', true,
          'next', 'need_restaurant_name',
          'code', v_code,
          'scope_type', v_lc.scope_type,
          'scope_id', v_lc.scope_id,
          'package_tier', v_lc.package_tier
        );
      else
        return json_build_object(
          'ok', true,
          'next', 'claim_manager_code',
          'code', v_code,
          'scope_type', v_lc.scope_type,
          'scope_id', v_lc.scope_id,
          'restaurant_id', v_lc.restaurant_id,
          'package_tier', v_lc.package_tier
        );
      end if;
    end if;

    if v_lc.scope_type in ('group', 'enterprise') then
      return json_build_object(
        'ok', true,
        'next', 'claim_manager_code',
        'code', v_code,
        'scope_type', v_lc.scope_type,
        'scope_id', v_lc.scope_id,
        'package_tier', v_lc.package_tier,
        'max_restaurants', v_lc.max_restaurants
      );
    end if;

    return json_build_object('ok', false, 'error', 'invalid_scope_type');
  end if;

  if coalesce(v_profile.membership_role, v_profile.role, '') = 'waiter' then
    v_join := public.join_restaurant_by_code(v_code);

    if coalesce((v_join ->> 'ok')::boolean, false) = true then
      return json_build_object(
        'ok', true,
        'next', 'joined_restaurant',
        'code', v_code,
        'restaurant_id', v_join ->> 'restaurant_id'
      );
    end if;

    return v_join;
  end if;

  return json_build_object('ok', false, 'error', 'unsupported_redeem_path');
exception
  when others then
    return json_build_object('ok', false, 'error', 'server_error', 'detail', sqlerrm);
end;
$function$;

create or replace function public.set_active_restaurant_for_scope(p_restaurant_id uuid)
returns json
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  v_uid uuid := auth.uid();
  v_scope_id uuid;
  v_ok boolean;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select scope_id
  into v_scope_id
  from public.profiles
  where user_id = v_uid
    and role = 'manager'
    and access_tier = 'premium'
    and scope_type = 'group';

  if v_scope_id is null then
    return json_build_object('ok', false, 'error', 'not_group_manager');
  end if;

  select exists (
    select 1
    from public.bc_scope_restaurants
    where scope_id = v_scope_id
      and restaurant_id = p_restaurant_id
  )
  into v_ok;

  if not v_ok then
    return json_build_object('ok', false, 'error', 'restaurant_not_in_scope');
  end if;

  update public.profiles
  set restaurant_id = p_restaurant_id
  where user_id = v_uid;

  return json_build_object(
    'ok', true,
    'restaurant_id', p_restaurant_id,
    'scope_id', v_scope_id
  );
end;
$function$;

-- ===== RECONSTRUCTED CREATE POLICY statements =====

drop policy if exists "managers delete wines" on public.bc_wines;
create policy "managers delete wines"
on public.bc_wines
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'manager'::text
      and p.restaurant_id = bc_wines.restaurant_id
  )
);

drop policy if exists "managers insert wines" on public.bc_wines;
create policy "managers insert wines"
on public.bc_wines
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'manager'::text
      and p.restaurant_id = bc_wines.restaurant_id
  )
  and created_by = auth.uid()
);

drop policy if exists "managers update wines" on public.bc_wines;
create policy "managers update wines"
on public.bc_wines
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'manager'::text
      and p.restaurant_id = bc_wines.restaurant_id
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'manager'::text
      and p.restaurant_id = bc_wines.restaurant_id
  )
);

drop policy if exists "read wines in my restaurant" on public.bc_wines;
create policy "read wines in my restaurant"
on public.bc_wines
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.restaurant_id = bc_wines.restaurant_id
  )
);

drop policy if exists "waiters can read restaurant wines" on public.bc_wines;
create policy "waiters can read restaurant wines"
on public.bc_wines
for select
to authenticated
using (
  restaurant_id = (
    select p.restaurant_id
    from public.profiles p
    where p.user_id = auth.uid()
    limit 1
  )
);

drop policy if exists "profile_insert_own" on public.profiles;
create policy "profile_insert_own"
on public.profiles
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "profile_read_own" on public.profiles;
create policy "profile_read_own"
on public.profiles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "profile_update_own" on public.profiles;
create policy "profile_update_own"
on public.profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "profiles_select_manager_same_restaurant" on public.profiles;
create policy "profiles_select_manager_same_restaurant"
on public.profiles
for select
to authenticated
using (public.is_manager_in_restaurant(restaurant_id));

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_can_read_own_profile" on public.profiles;
create policy "user_can_read_own_profile"
on public.profiles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_can_update_own_profile" on public.profiles;
create policy "user_can_update_own_profile"
on public.profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "restaurant_insert_own" on public.restaurants;
create policy "restaurant_insert_own"
on public.restaurants
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "restaurant_read_by_members" on public.restaurants;
create policy "restaurant_read_by_members"
on public.restaurants
for select
to authenticated
using (
  created_by = auth.uid()
  or id = (
    select p.restaurant_id
    from public.profiles p
    where p.user_id = auth.uid()
  )
);

drop policy if exists "wines_read_same_restaurant" on public.wines;
create policy "wines_read_same_restaurant"
on public.wines
for select
to authenticated
using (
  restaurant_id = (
    select p.restaurant_id
    from public.profiles p
    where p.user_id = auth.uid()
  )
);

drop policy if exists "wines_update_admin_only" on public.wines;
create policy "wines_update_admin_only"
on public.wines
for update
to authenticated
using (
  (
    (
      select p.role
      from public.profiles p
      where p.user_id = auth.uid()
    ) = 'admin'::text
  )
  and restaurant_id = (
    select p.restaurant_id
    from public.profiles p
    where p.user_id = auth.uid()
  )
)
with check (true);

drop policy if exists "wines_write_admin_only" on public.wines;
create policy "wines_write_admin_only"
on public.wines
for insert
to authenticated
with check (
  (
    (
      select p.role
      from public.profiles p
      where p.user_id = auth.uid()
    ) = 'admin'::text
  )
  and restaurant_id = (
    select p.restaurant_id
    from public.profiles p
    where p.user_id = auth.uid()
  )
);

commit;
