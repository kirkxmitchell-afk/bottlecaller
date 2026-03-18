-- Source-control the remaining restaurant lifecycle functions that are either
-- app-used directly or are dependencies of other repo-managed RPCs.

begin;

create or replace function public.add_restaurant_to_scope(
  p_scope_id uuid,
  p_restaurant_id uuid
)
returns json
language plpgsql
security definer
set search_path = ''
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

  select public.bc_canonical_membership_role(v_uid)
  into v_role;

  if v_role not in ('group_manager', 'enterpriser') then
    return json_build_object('ok', false, 'error', 'not_manager');
  end if;

  select s.scope_type, s.restaurant_limit
  into v_scope_type, v_limit
  from public.bc_scopes s
  where s.id = p_scope_id;

  if v_scope_type is null then
    return json_build_object('ok', false, 'error', 'scope_not_found');
  end if;

  if v_scope_type not in ('group', 'enterprise') then
    return json_build_object('ok', false, 'error', 'invalid_scope_type');
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.user_id = v_uid
      and p.scope_id = p_scope_id
      and lower(coalesce(p.scope_type, '')) = v_scope_type
      and p.access_tier = 'premium'
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

create or replace function public.admin_attach_restaurant_to_scope(
  p_scope_id uuid,
  p_restaurant_id uuid
)
returns json
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_scope_type text;
begin
  select s.scope_type
  into v_scope_type
  from public.bc_scopes s
  where s.id = p_scope_id;

  if v_scope_type not in ('group', 'enterprise') then
    return json_build_object('ok', false, 'error', 'scope_not_group_or_enterprise');
  end if;

  insert into public.bc_scope_restaurants (scope_id, restaurant_id)
  values (p_scope_id, p_restaurant_id)
  on conflict do nothing;

  return json_build_object('ok', true);
end;
$function$;

create or replace function public.bc_get_restaurant_manager_targets_v1(p_restaurant_id uuid)
returns table(user_id uuid, display_name text, role text)
language sql
security definer
set search_path = ''
as $function$
  select
    p.user_id,
    coalesce(nullif(p.display_name, ''), 'Manager') as display_name,
    p.role
  from public.profiles p
  where p.restaurant_id = p_restaurant_id
    and public.bc_canonical_membership_role(p.user_id) in (
      'single_manager',
      'group_manager',
      'enterpriser'
    )
  order by
    case public.bc_canonical_membership_role(p.user_id)
      when 'single_manager' then 1
      when 'group_manager' then 2
      else 3
    end,
    p.created_at asc;
$function$;

create or replace function public.create_restaurant(p_name text)
returns json
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_existing uuid;
  v_restaurant public.restaurants%rowtype;
  v_code text;
  v_scope_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select
    public.bc_canonical_membership_role(v_uid),
    p.restaurant_id
  into v_role, v_existing
  from public.profiles p
  where p.user_id = v_uid;

  if v_role is null or v_role = '' then
    return json_build_object('ok', false, 'error', 'profile_missing');
  end if;

  if v_role not in ('single_manager', 'group_manager', 'enterpriser') then
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
  values (v_scope_id, v_restaurant.id)
  on conflict do nothing;

  update public.profiles
  set restaurant_id = v_restaurant.id,
      access_tier = 'premium',
      scope_type = 'restaurant',
      scope_id = v_scope_id,
      membership_role = v_role
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
set search_path = ''
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

  select public.bc_canonical_membership_role(v_uid)
  into v_role;

  if v_role not in ('single_manager', 'group_manager', 'enterpriser') then
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
    insert into public.bc_scopes (scope_type, name, created_by)
    values ('restaurant', v_name, v_uid)
    returning id into v_scope_id;
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
      claimed_role = coalesce(v_row.package_tier, v_role),
      restaurant_id = v_restaurant_id,
      scope_id = v_scope_id,
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
returns table(
  restaurant_id uuid,
  restaurant_name text,
  restaurant_code text,
  seat_limit integer
)
language sql
security definer
set search_path = ''
as $function$
  select
    r.id as restaurant_id,
    r.name as restaurant_name,
    r.code as restaurant_code,
    r.seat_limit
  from public.bc_scope_restaurants sr
  join public.restaurants r
    on r.id = sr.restaurant_id
  where sr.scope_id = p_scope_id
  order by r.created_at asc;
$function$;

create or replace function public.join_restaurant_by_code(p_code text)
returns json
language plpgsql
security definer
set search_path = ''
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
    if v_lc.status = 'disabled' or v_lc.disabled_at is not null then
      return json_build_object('ok', false, 'error', 'code_disabled');
    end if;

    if v_lc.status = 'restaurant_active' and v_lc.restaurant_id is not null then
      v_restaurant_id := v_lc.restaurant_id;
    end if;
  end if;

  if v_restaurant_id is null then
    select r.id
    into v_restaurant_id
    from public.restaurants r
    where r.code = v_input;
  end if;

  if v_restaurant_id is null then
    return json_build_object('ok', false, 'error', 'invalid_code');
  end if;

  select r.seat_limit, r.require_invite
  into v_seat_limit, v_require_invite
  from public.restaurants r
  where r.id = v_restaurant_id;

  if v_require_invite then
    v_email := lower(auth.email());

    select exists (
      select 1
      from public.restaurant_invites i
      where i.restaurant_id = v_restaurant_id
        and lower(i.email) = v_email
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

  select sr.scope_id
  into v_scope_id
  from public.bc_scope_restaurants sr
  join public.bc_scopes s
    on s.id = sr.scope_id
  where sr.restaurant_id = v_restaurant_id
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
      and lower(email) = lower(auth.email())
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

create or replace function public.set_active_restaurant_for_scope(p_restaurant_id uuid)
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
  v_ok boolean;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select
    p.scope_id,
    lower(coalesce(p.scope_type, '')),
    public.bc_canonical_membership_role(v_uid)
  into v_scope_id, v_scope_type, v_role
  from public.profiles p
  where p.user_id = v_uid;

  if v_role not in ('group_manager', 'enterpriser') or v_scope_type not in ('group', 'enterprise') then
    return json_build_object('ok', false, 'error', 'not_group_manager');
  end if;

  select exists (
    select 1
    from public.bc_scope_restaurants sr
    where sr.scope_id = v_scope_id
      and sr.restaurant_id = p_restaurant_id
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

revoke all on function public.add_restaurant_to_scope(uuid, uuid) from public;
revoke all on function public.add_restaurant_to_scope(uuid, uuid) from anon;
grant execute on function public.add_restaurant_to_scope(uuid, uuid) to authenticated;

revoke all on function public.admin_attach_restaurant_to_scope(uuid, uuid) from public;
revoke all on function public.admin_attach_restaurant_to_scope(uuid, uuid) from anon;
grant execute on function public.admin_attach_restaurant_to_scope(uuid, uuid) to authenticated;

revoke all on function public.bc_get_restaurant_manager_targets_v1(uuid) from public;
revoke all on function public.bc_get_restaurant_manager_targets_v1(uuid) from anon;
grant execute on function public.bc_get_restaurant_manager_targets_v1(uuid) to authenticated;

revoke all on function public.create_restaurant(text) from public;
revoke all on function public.create_restaurant(text) from anon;
grant execute on function public.create_restaurant(text) to authenticated;

revoke all on function public.create_restaurant_from_code(text, text) from public;
revoke all on function public.create_restaurant_from_code(text, text) from anon;
grant execute on function public.create_restaurant_from_code(text, text) to authenticated;

revoke all on function public.get_scope_restaurants(uuid) from public;
revoke all on function public.get_scope_restaurants(uuid) from anon;
grant execute on function public.get_scope_restaurants(uuid) to authenticated;

revoke all on function public.join_restaurant_by_code(text) from public;
revoke all on function public.join_restaurant_by_code(text) from anon;
grant execute on function public.join_restaurant_by_code(text) to authenticated;

revoke all on function public.set_active_restaurant_for_scope(uuid) from public;
revoke all on function public.set_active_restaurant_for_scope(uuid) from anon;
grant execute on function public.set_active_restaurant_for_scope(uuid) to authenticated;

commit;
