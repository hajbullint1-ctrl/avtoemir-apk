-- AvtoEmir: FULL bootstrap for a NEW Supabase project
-- Dashboard → SQL Editor → New query → Paste → Run
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT)

-- ── core ──────────────────────────────────────────────────────
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
  ('deletedAccountIds', '[]'::jsonb)
on conflict (key) do nothing;

-- ── profiles ─────────────────────────────────────────────────────
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

-- ── theory progress ───────────────────────────────────────────────
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

-- ── presence ──────────────────────────────────────────────────────
create table if not exists public.presence (
  id text primary key,
  last_seen timestamptz not null default now()
);
alter table public.presence enable row level security;
drop policy if exists "presence_select_all" on public.presence;
create policy "presence_select_all" on public.presence for select to anon, authenticated using (true);
drop policy if exists "presence_insert_all" on public.presence;
create policy "presence_insert_all" on public.presence for insert to anon, authenticated with check (true);
drop policy if exists "presence_update_all" on public.presence;
create policy "presence_update_all" on public.presence for update to anon, authenticated using (true) with check (true);

-- ── student_mistakes + RPC ────────────────────────────────────────
create table if not exists public.student_mistakes (
  id bigserial primary key,
  student_id text not null,
  question_id text not null,
  is_resolved boolean not null default false,
  attempts_count integer not null default 1,
  last_wrong_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, question_id)
);
create index if not exists student_mistakes_student_unresolved_idx
  on public.student_mistakes (student_id) where is_resolved = false;
alter table public.student_mistakes enable row level security;
drop policy if exists "student_mistakes_select" on public.student_mistakes;
create policy "student_mistakes_select" on public.student_mistakes for select to anon, authenticated using (true);
drop policy if exists "student_mistakes_insert" on public.student_mistakes;
create policy "student_mistakes_insert" on public.student_mistakes for insert to anon, authenticated with check (true);
drop policy if exists "student_mistakes_update" on public.student_mistakes;
create policy "student_mistakes_update" on public.student_mistakes for update to anon, authenticated using (true) with check (true);
drop policy if exists "student_mistakes_delete" on public.student_mistakes;
create policy "student_mistakes_delete" on public.student_mistakes for delete to anon, authenticated using (true);

create or replace function public.record_student_mistake(p_student_id text, p_question_id text)
returns void language plpgsql as $$
begin
  insert into public.student_mistakes (student_id, question_id, is_resolved, attempts_count, last_wrong_at)
  values (p_student_id, p_question_id, false, 1, now())
  on conflict (student_id, question_id) do update set
    is_resolved = false,
    attempts_count = public.student_mistakes.attempts_count + 1,
    last_wrong_at = now(),
    resolved_at = null;
end;
$$;

create or replace function public.resolve_student_mistake(p_student_id text, p_question_id text)
returns void language plpgsql as $$
begin
  update public.student_mistakes
  set is_resolved = true, resolved_at = now()
  where student_id = p_student_id and question_id = p_question_id and is_resolved = false;
end;
$$;

-- ── Storage buckets ───────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('theory-cards', 'theory-cards', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('student-docs', 'student-docs', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "theory_cards_public_read" on storage.objects;
create policy "theory_cards_public_read" on storage.objects for select to anon, authenticated using (bucket_id = 'theory-cards');
drop policy if exists "theory_cards_insert" on storage.objects;
create policy "theory_cards_insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'theory-cards');
drop policy if exists "theory_cards_update" on storage.objects;
create policy "theory_cards_update" on storage.objects for update to anon, authenticated using (bucket_id = 'theory-cards');
drop policy if exists "theory_cards_delete" on storage.objects;
create policy "theory_cards_delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'theory-cards');

drop policy if exists "student_docs_public_read" on storage.objects;
create policy "student_docs_public_read" on storage.objects for select to anon, authenticated using (bucket_id = 'student-docs');
drop policy if exists "student_docs_insert" on storage.objects;
create policy "student_docs_insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'student-docs');
drop policy if exists "student_docs_update" on storage.objects;
create policy "student_docs_update" on storage.objects for update to anon, authenticated using (bucket_id = 'student-docs');
drop policy if exists "student_docs_delete" on storage.objects;
create policy "student_docs_delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'student-docs');
