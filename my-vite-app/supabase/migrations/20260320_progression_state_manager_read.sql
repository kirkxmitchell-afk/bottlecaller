-- Allow managers to read canonical progression rows for restaurants they manage.
-- This keeps manager-facing performance/selection views aligned with the
-- canonical progression source instead of falling back to legacy leaderboard math.

begin;

drop policy if exists bc_progression_state_v1_select_manager_restaurant
on public.bc_progression_state_v1;

create policy bc_progression_state_v1_select_manager_restaurant
on public.bc_progression_state_v1
for select
to authenticated
using (
  restaurant_id is not null
  and public.is_manager_in_restaurant(restaurant_id)
);

commit;
