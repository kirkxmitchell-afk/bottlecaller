create table if not exists public.bc_progression_state_v1 (
  user_id uuid not null,
  restaurant_id uuid not null,
  scope_id uuid null,
  canonical_state jsonb not null default '{}'::jsonb,
  source_type text not null default 'progress_report',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);

create index if not exists bc_progression_state_v1_restaurant_idx
  on public.bc_progression_state_v1 (restaurant_id, updated_at desc);

alter table public.bc_progression_state_v1
  enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bc_progression_state_v1'
      and policyname = 'bc_progression_state_v1_select_own'
  ) then
    create policy "bc_progression_state_v1_select_own"
      on public.bc_progression_state_v1
      for select
      using (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bc_progression_state_v1'
      and policyname = 'bc_progression_state_v1_insert_own'
  ) then
    create policy "bc_progression_state_v1_insert_own"
      on public.bc_progression_state_v1
      for insert
      with check (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bc_progression_state_v1'
      and policyname = 'bc_progression_state_v1_update_own'
  ) then
    create policy "bc_progression_state_v1_update_own"
      on public.bc_progression_state_v1
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;
