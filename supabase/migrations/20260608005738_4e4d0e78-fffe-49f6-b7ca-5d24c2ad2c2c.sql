CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  profile text NOT NULL,
  feature text NOT NULL,
  context jsonb,
  rating text NOT NULL CHECK (rating IN ('up','down')),
  reason text,
  resolved boolean NOT NULL DEFAULT false
);

GRANT ALL ON public.ai_feedback TO service_role;

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny direct client insert" ON public.ai_feedback FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "Deny direct client select" ON public.ai_feedback FOR SELECT TO authenticated, anon USING (false);
CREATE POLICY "Deny direct client update" ON public.ai_feedback FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny direct client delete" ON public.ai_feedback FOR DELETE TO authenticated, anon USING (false);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_created_at ON public.ai_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_feature ON public.ai_feedback(feature);