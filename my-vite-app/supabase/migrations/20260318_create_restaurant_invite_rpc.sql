-- Create missing create_restaurant_invite RPC used by the app HUD.
-- The app calls:
--   supabase.rpc('create_restaurant_invite', {
--     p_restaurant_id: <uuid>,
--     p_email: <text>
--   })
--
-- Expected result shape:
--   { ok: true, ... } or { ok: false, error: '...' }

begin;

create or replace function public.create_restaurant_invite(
  p_restaurant_id uuid,
  p_email text
)
returns json
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_existing_id uuid;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_restaurant_id is null then
    return json_build_object('ok', false, 'error', 'missing_restaurant_id');
  end if;

  if v_email = '' then
    return json_build_object('ok', false, 'error', 'missing_email');
  end if;

  if not (
    public.is_manager_in_restaurant(p_restaurant_id)
    or exists (
      select 1
      from public.profiles p
      where p.user_id = v_uid
        and lower(coalesce(p.role, '')) = 'admin'
        and p.restaurant_id = p_restaurant_id
    )
  ) then
    return json_build_object('ok', false, 'error', 'not_authorized');
  end if;

  select i.id
  into v_existing_id
  from public.restaurant_invites i
  where i.restaurant_id = p_restaurant_id
    and lower(i.email) = v_email
  order by i.created_at desc
  limit 1;

  if v_existing_id is not null then
    update public.restaurant_invites
    set status = 'pending',
        revoked_at = null,
        revoked_by = null,
        accepted_user_id = null
    where id = v_existing_id;

    return json_build_object(
      'ok', true,
      'mode', 'updated',
      'invite_id', v_existing_id,
      'restaurant_id', p_restaurant_id,
      'email', v_email
    );
  end if;

  insert into public.restaurant_invites (
    restaurant_id,
    email,
    status
  )
  values (
    p_restaurant_id,
    v_email,
    'pending'
  )
  returning id into v_existing_id;

  return json_build_object(
    'ok', true,
    'mode', 'created',
    'invite_id', v_existing_id,
    'restaurant_id', p_restaurant_id,
    'email', v_email
  );
end;
$function$;

revoke all on function public.create_restaurant_invite(uuid, text) from public;
revoke all on function public.create_restaurant_invite(uuid, text) from anon;
grant execute on function public.create_restaurant_invite(uuid, text) to authenticated;

commit;
