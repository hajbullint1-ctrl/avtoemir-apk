-- Deleted account snapshots for admin restore + ensure keys exist
insert into public.app_state (key, data) values
  ('deletedStudentIds', '[]'::jsonb),
  ('deletedAccountIds', '[]'::jsonb),
  ('deletedRecords', '[]'::jsonb),
  ('maintenanceMode', 'false'::jsonb)
on conflict (key) do nothing;

-- Realtime for live sync across devices (ignore if already added)
do $$
begin
  alter publication supabase_realtime add table public.app_state;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
