CREATE TABLE IF NOT EXISTS public.user_targets (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  calls_target integer NOT NULL DEFAULT 0,
  applications_target integer NOT NULL DEFAULT 0,
  preapprovals_target integer NOT NULL DEFAULT 0,
  funded_target integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_targets TO authenticated;
GRANT ALL ON public.user_targets TO service_role;

ALTER TABLE public.user_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own targets"
  ON public.user_targets FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE TRIGGER trg_user_targets_updated
  BEFORE UPDATE ON public.user_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();