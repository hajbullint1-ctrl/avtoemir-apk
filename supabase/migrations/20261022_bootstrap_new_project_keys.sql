-- Extra app_state keys used by current app (safe on existing projects)
insert into public.app_state (key, data) values
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
  ('roadSigns', '[]'::jsonb),
  ('studentMistakes', '{}'::jsonb),
  ('deletedStudentIds', '[]'::jsonb),
  ('deletedAccountIds', '[]'::jsonb)
on conflict (key) do nothing;
