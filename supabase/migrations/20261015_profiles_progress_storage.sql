-- Run in Supabase SQL Editor if schema.sql was applied before 2026-10-15.


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
