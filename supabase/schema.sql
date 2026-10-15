-- AvtoEmir: shared app state in Supabase
-- Run this once in Supabase Dashboard → SQL Editor → New query → Run

-- Single table for shared JSON slices (school, instructors, notices, …)
create table if not exists public.app_state (
  key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_state_updated_at on public.app_state;
create trigger app_state_updated_at
  before update on public.app_state
  for each row execute function public.set_updated_at();

-- Demo policies: anyone with the anon/publishable key can read & write.
-- Tighten later (admin-only writes via service role or authenticated admin role).
alter table public.app_state enable row level security;

drop policy if exists "app_state_select_all" on public.app_state;
create policy "app_state_select_all"
  on public.app_state for select
  to anon, authenticated
  using (true);

drop policy if exists "app_state_insert_all" on public.app_state;
create policy "app_state_insert_all"
  on public.app_state for insert
  to anon, authenticated
  with check (true);

drop policy if exists "app_state_update_all" on public.app_state;
create policy "app_state_update_all"
  on public.app_state for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "app_state_delete_all" on public.app_state;
create policy "app_state_delete_all"
  on public.app_state for delete
  to anon, authenticated
  using (true);

-- Optional seed keys (empty until the app writes real data)
insert into public.app_state (key, data) values
  ('school', '{}'::jsonb),
  ('instructors', '[]'::jsonb),
  ('notices', '[]'::jsonb)
on conflict (key) do nothing;
