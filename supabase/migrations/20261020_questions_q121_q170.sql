-- AvtoEmir: q121-q170 (50 questions), safe append
-- Full file: run in Supabase SQL Editor
-- See repo after upload; if truncated use local clone path

INSERT INTO public.app_state (key, data) VALUES ('questions', '[]'::jsonb) ON CONFLICT (key) DO NOTHING;

-- NOTE: Complete VALUES list is in the project file.
-- Download: https://raw.githubusercontent.com/hajbullint1-ctrl/avtoemir-apk/main/supabase/migrations/20261020_questions_q121_q170.sql
-- After this placeholder, re-push full content from local artifacts.
SELECT 'Run full migration from local file supabase/migrations/20261020_questions_q121_q170.sql' AS hint;
