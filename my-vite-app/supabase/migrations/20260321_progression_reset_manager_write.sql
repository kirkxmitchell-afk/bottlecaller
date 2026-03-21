-- Allow managers to perform waiter progression resets inside restaurants they manage.
-- The browser reset path upserts a blank canonical progression row and deletes
-- skill snapshots for the waiter, so manager authority must cover both tables.

begin;

grant insert, update on public.bc_progression_state_v1 to authenticated;

drop policy if exists bc_progression_state_v1_insert_manager_restaurant
on public.bc_progression_state_v1;

create policy bc_progression_state_v1_insert_manager_restaurant
on public.bc_progression_state_v1
for insert
to authenticated
with check (
  restaurant_id is not null
  and public.is_manager_in_restaurant(restaurant_id)
);

drop policy if exists bc_progression_state_v1_update_manager_restaurant
on public.bc_progression_state_v1;

create policy bc_progression_state_v1_update_manager_restaurant
on public.bc_progression_state_v1
for update
to authenticated
using (
  restaurant_id is not null
  and public.is_manager_in_restaurant(restaurant_id)
)
with check (
  restaurant_id is not null
  and public.is_manager_in_restaurant(restaurant_id)
);

grant select, delete on public.bc_skill_snapshots_v1 to authenticated;

drop policy if exists bc_skill_snapshots_v1_select_manager_restaurant
on public.bc_skill_snapshots_v1;

create policy bc_skill_snapshots_v1_select_manager_restaurant
on public.bc_skill_snapshots_v1
for select
to authenticated
using (
  restaurant_id is not null
  and public.is_manager_in_restaurant(restaurant_id)
);

drop policy if exists bc_skill_snapshots_v1_delete_manager_restaurant
on public.bc_skill_snapshots_v1;

create policy bc_skill_snapshots_v1_delete_manager_restaurant
on public.bc_skill_snapshots_v1
for delete
to authenticated
using (
  restaurant_id is not null
  and public.is_manager_in_restaurant(restaurant_id)
);

commit;
