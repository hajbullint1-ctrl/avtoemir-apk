-- AvtoEmir: FULL bootstrap for a NEW Supabase project
-- Dashboard → SQL Editor → New query → Paste → Run
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT)

-- ── core ────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.app_state (
  key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists app_state_updated_at on public.app_state;
create trigger app_state_updated_at
  before update on public.app_state
  for each row execute function public.set_updated_at();

alter table public.app_state enable row level security;
drop policy if exists "app_state_select_all" on public.app_state;
create policy "app_state_select_all" on public.app_state for select to anon, authenticated using (true);
drop policy if exists "app_state_insert_all" on public.app_state;
create policy "app_state_insert_all" on public.app_state for insert to anon, authenticated with check (true);
drop policy if exists "app_state_update_all" on public.app_state;
create policy "app_state_update_all" on public.app_state for update to anon, authenticated using (true) with check (true);
drop policy if exists "app_state_delete_all" on public.app_state;
create policy "app_state_delete_all" on public.app_state for delete to anon, authenticated using (true);

-- All keys the app reads/writes
insert into public.app_state (key, data) values
  ('school', '{}'::jsonb),
  ('instructors', '[]'::jsonb),
  ('notices', '[]'::jsonb),
  ('students', '[]'::jsonb),
  ('theory', '[]'::jsonb),
  ('questions', '[]'::jsonb),
  ('reviews', '[]'::jsonb),
  ('messages', '[]'::jsonb),
  ('bookings', '[]'::jsonb),
  ('accounts', '[]'::jsonb),
  ('recovery', '[]'::jsonb),
  ('results', '[]'::jsonb),
  ('learnedSigns', '[]'::jsonb),
  ('profiles', '[]'::jsonb),
  ('theoryProgress', '{}'::jsonb),
  ('roadSigns', '[]'::jsonb),
  ('presence', '{}'::jsonb),
  ('droppedMessageIds', '[]'::jsonb),
  ('studentMistakes', '{}'::jsonb),
  ('deletedStudentIds', '[]'::jsonb),
  ('deletedAccountIds', '[]'::jsonb),
  ('deletedRecords', '[]'::jsonb),
  ('maintenanceMode', 'false'::jsonb),
  ('registrationRequests', '[]'::jsonb),
  ('regCredentials', '{}'::jsonb)
on conflict (key) do nothing;
