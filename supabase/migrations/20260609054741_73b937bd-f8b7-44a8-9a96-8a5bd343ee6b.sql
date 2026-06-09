
CREATE TABLE public.assistant_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  question text NOT NULL,
  tool_calls jsonb NOT NULL DEFAULT '[]'::jsonb,
  tool_results_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_clicked_id text,
  result_clicked_kind text,
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.assistant_interactions TO authenticated;
GRANT ALL ON public.assistant_interactions TO service_role;

ALTER TABLE public.assistant_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own interactions"
  ON public.assistant_interactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own interactions"
  ON public.assistant_interactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role('admin'::app_role));

CREATE POLICY "Users update own interactions"
  ON public.assistant_interactions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX assistant_interactions_user_created_idx
  ON public.assistant_interactions (user_id, created_at DESC);
