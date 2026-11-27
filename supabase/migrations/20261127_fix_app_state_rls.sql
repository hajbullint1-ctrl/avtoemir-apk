-- Fix: live project had RLS on app_state but no policies for the
-- publishable/anon key, so every upsert failed with 42501 and the
-- table stayed empty. Certificate date, notices, bookings, messages
-- never reached the cloud.

alter table public.app_state enable row level security;

drop policy if exists "app_state_select_all" on public.app_state;
drop policy if exists "app_state_insert_all" on public.app_state;
drop policy if exists "app_state_update_all" on public.app_state;
drop policy if exists "app_state_delete_all" on public.app_state;

-- Grant to public so both legacy anon JWT and new publishable keys work.
create policy "app_state_select_all" on public.app_state
  for select to public using (true);
create policy "app_state_insert_all" on public.app_state
  for insert to public with check (true);
create policy "app_state_update_all" on public.app_state
  for update to public using (true) with check (true);
create policy "app_state_delete_all" on public.app_state
  for delete to public using (true);

-- Seed keys the client reads/writes (no-op if already present).
insert into public.app_state (key, data) values
  ('students', '[]'::jsonb),
  ('notices', '[]'::jsonb),
  ('bookings', '[]'::jsonb),
  ('messages', '[]'::jsonb),
  ('droppedMessageIds', '[]'::jsonb),
  ('accounts', '[]'::jsonb),
  ('deletedStudentIds', '[]'::jsonb),
  ('deletedAccountIds', '[]'::jsonb),
  ('deletedRecords', '[]'::jsonb),
  ('maintenanceMode', 'false'::jsonb)
on conflict (key) do nothing;
