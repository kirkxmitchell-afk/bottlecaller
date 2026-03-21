begin;

create or replace function public.bc_get_restaurant_environment_profiles_v1(p_restaurant_id uuid)
returns table(user_id uuid, display_name text, role text)
language sql
security definer
set search_path = ''
as $function$
  with scope_ids as (
    select distinct sr.scope_id
    from public.bc_scope_restaurants sr
    where sr.restaurant_id = p_restaurant_id
  )
  select distinct on (p.user_id)
    p.user_id,
    coalesce(nullif(p.display_name, ''), 'Member') as display_name,
    public.bc_canonical_membership_role(p.user_id) as role
  from public.profiles p
  left join scope_ids s
    on s.scope_id = p.scope_id
  where
    p.restaurant_id = p_restaurant_id
    or s.scope_id is not null
  order by
    p.user_id,
    case public.bc_canonical_membership_role(p.user_id)
      when 'single_manager' then 1
      when 'group_manager' then 2
      when 'enterpriser' then 3
      when 'waiter' then 4
      else 5
    end,
    p.created_at asc;
$function$;

revoke all on function public.bc_get_restaurant_environment_profiles_v1(uuid) from public;
revoke all on function public.bc_get_restaurant_environment_profiles_v1(uuid) from anon;
grant execute on function public.bc_get_restaurant_environment_profiles_v1(uuid) to authenticated;

commit;
