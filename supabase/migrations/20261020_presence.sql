
-- Who is in the app right now. One row per student, updated by a heartbeat.
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

insert into public.app_state (key, data) values
  ('presence', '{}'::jsonb),
  ('droppedMessageIds', '[]'::jsonb)
on conflict (key) do nothing;
