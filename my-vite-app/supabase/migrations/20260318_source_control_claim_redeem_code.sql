-- Source-control claim/redeem code lifecycle functions.
-- These were present in the Supabase backup snapshot but were not yet
-- represented by repo migrations.

begin;

create or replace function public.claim_license_code(
  p_code text,
  p_restaurant_name text default null::text
)
returns json
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  v_membership_role text;
  v_lc public.license_codes%rowtype;
  v_new_restaurant_id uuid;
  v_scope_id uuid;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_code = '' then
    return json_build_object('ok', false, 'error', 'missing_code');
  end if;

  select public.bc_canonical_membership_role(v_uid)
  into v_membership_role;

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

  if v_membership_role not in ('single_manager', 'group_manager', 'enterpriser') then
    return json_build_object('ok', false, 'error', 'invalid_manager_membership');
  end if;

  if v_membership_role <> v_lc.package_tier then
    return json_build_object(
      'ok', false,
      'error', 'membership_package_mismatch',
      'expected', v_lc.package_tier,
      'actual', v_membership_role
    );
  end if;

  update public.license_codes
  set claimed_by = v_uid,
      claimed_role = v_lc.package_tier,
      access_tier = coalesce(v_lc.access_tier, 'premium')
  where code = v_code;

  if v_lc.scope_type = 'restaurant' then
    v_scope_id := v_lc.scope_id;

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

      if v_scope_id is null then
        insert into public.bc_scopes (scope_type, name, created_by)
        values ('restaurant', trim(p_restaurant_name), v_uid)
        returning id into v_scope_id;
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

      insert into public.bc_scope_restaurants (scope_id, restaurant_id)
      values (v_scope_id, v_new_restaurant_id)
      on conflict do nothing;

      update public.license_codes
      set restaurant_id = v_new_restaurant_id,
          scope_id = v_scope_id,
          status = 'restaurant_active'
      where code = v_code;
    else
      v_new_restaurant_id := v_lc.restaurant_id;

      if v_scope_id is null then
        select sr.scope_id
        into v_scope_id
        from public.bc_scope_restaurants sr
        join public.bc_scopes s
          on s.id = sr.scope_id
        where sr.restaurant_id = v_new_restaurant_id
          and s.scope_type = 'restaurant'
        limit 1;

        if v_scope_id is null then
          insert into public.bc_scopes (scope_type, name, created_by)
          select 'restaurant', r.name, v_uid
          from public.restaurants r
          where r.id = v_new_restaurant_id
          returning id into v_scope_id;

          insert into public.bc_scope_restaurants (scope_id, restaurant_id)
          values (v_scope_id, v_new_restaurant_id)
          on conflict do nothing;
        end if;
      end if;

      update public.license_codes
      set scope_id = v_scope_id,
          status = 'restaurant_active'
      where code = v_code;
    end if;

    update public.profiles
    set role = v_lc.package_tier,
        membership_role = v_lc.package_tier,
        access_tier = 'premium',
        scope_type = 'restaurant',
        scope_id = v_scope_id,
        restaurant_id = v_new_restaurant_id
    where user_id = v_uid;

    return json_build_object(
      'ok', true,
      'mode', 'premium_restaurant',
      'code', v_code,
      'membership_role', v_lc.package_tier,
      'scope_type', 'restaurant',
      'scope_id', v_scope_id,
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

create or replace function public.redeem_code(p_code text)
returns json
language plpgsql
security definer
set search_path = ''
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
    if public.bc_canonical_membership_role(v_uid) = 'waiter' then
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

  if public.bc_canonical_membership_role(v_uid) = 'waiter' then
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

revoke all on function public.claim_license_code(text, text) from public;
revoke all on function public.claim_license_code(text, text) from anon;
grant execute on function public.claim_license_code(text, text) to authenticated;

revoke all on function public.redeem_code(text) from public;
revoke all on function public.redeem_code(text) from anon;
grant execute on function public.redeem_code(text) to authenticated;

commit;
