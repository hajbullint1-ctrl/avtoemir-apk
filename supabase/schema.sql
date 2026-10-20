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


-- Student profiles (full_name shown in chats)
create table if not exists public.profiles (
  id text primary key,
  full_name text not null default '',
  phone text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select to anon, authenticated using (true);
drop policy if exists "profiles_insert_all" on public.profiles;
create policy "profiles_insert_all" on public.profiles for insert to anon, authenticated with check (true);
drop policy if exists "profiles_update_all" on public.profiles;
create policy "profiles_update_all" on public.profiles for update to anon, authenticated using (true) with check (true);

-- Per-student theory lesson completion
create table if not exists public.theory_progress (
  student_id text not null,
  lesson_id text not null,
  completed boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);

alter table public.theory_progress enable row level security;

drop policy if exists "theory_progress_select_all" on public.theory_progress;
create policy "theory_progress_select_all" on public.theory_progress for select to anon, authenticated using (true);
drop policy if exists "theory_progress_insert_all" on public.theory_progress;
create policy "theory_progress_insert_all" on public.theory_progress for insert to anon, authenticated with check (true);
drop policy if exists "theory_progress_update_all" on public.theory_progress;
create policy "theory_progress_update_all" on public.theory_progress for update to anon, authenticated using (true) with check (true);

insert into public.app_state (key, data) values
  ('profiles', '[]'::jsonb),
  ('theoryProgress', '{}'::jsonb)
on conflict (key) do nothing;

-- Public bucket for theory lesson photo cards
insert into storage.buckets (id, name, public)
values ('theory-cards', 'theory-cards', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "theory_cards_public_read" on storage.objects;
create policy "theory_cards_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'theory-cards');

drop policy if exists "theory_cards_insert" on storage.objects;
create policy "theory_cards_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'theory-cards');

drop policy if exists "theory_cards_update" on storage.objects;
create policy "theory_cards_update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'theory-cards');

drop policy if exists "theory_cards_delete" on storage.objects;
create policy "theory_cards_delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'theory-cards');

-- Student identity and medical documents (admin download)
insert into storage.buckets (id, name, public)
values ('student-docs', 'student-docs', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "student_docs_public_read" on storage.objects;
create policy "student_docs_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'student-docs');

drop policy if exists "student_docs_insert" on storage.objects;
create policy "student_docs_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'student-docs');

drop policy if exists "student_docs_update" on storage.objects;
create policy "student_docs_update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'student-docs');

drop policy if exists "student_docs_delete" on storage.objects;
create policy "student_docs_delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'student-docs');
