-- AvtoEmir: student_mistakes + RPC
CREATE TABLE IF NOT EXISTS public.student_mistakes (
  id bigserial PRIMARY KEY,
  student_id text NOT NULL,
  question_id text NOT NULL,
  is_resolved boolean NOT NULL DEFAULT false,
  attempts_count integer NOT NULL DEFAULT 1,
  last_wrong_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, question_id)
);
CREATE INDEX IF NOT EXISTS student_mistakes_student_unresolved_idx
  ON public.student_mistakes (student_id) WHERE is_resolved = false;
ALTER TABLE public.student_mistakes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_mistakes_select" ON public.student_mistakes;
CREATE POLICY "student_mistakes_select" ON public.student_mistakes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "student_mistakes_insert" ON public.student_mistakes;
CREATE POLICY "student_mistakes_insert" ON public.student_mistakes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "student_mistakes_update" ON public.student_mistakes;
CREATE POLICY "student_mistakes_update" ON public.student_mistakes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "student_mistakes_delete" ON public.student_mistakes;
CREATE POLICY "student_mistakes_delete" ON public.student_mistakes FOR DELETE TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.record_student_mistake(p_student_id text, p_question_id text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.student_mistakes (student_id, question_id, is_resolved, attempts_count, last_wrong_at)
  VALUES (p_student_id, p_question_id, false, 1, now())
  ON CONFLICT (student_id, question_id) DO UPDATE SET
    is_resolved = false,
    attempts_count = public.student_mistakes.attempts_count + 1,
    last_wrong_at = now(),
    resolved_at = NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_student_mistake(p_student_id text, p_question_id text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.student_mistakes
  SET is_resolved = true, resolved_at = now()
  WHERE student_id = p_student_id AND question_id = p_question_id AND is_resolved = false;
END;
$$;
