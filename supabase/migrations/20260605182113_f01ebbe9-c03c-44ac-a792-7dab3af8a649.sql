CREATE TABLE public.lead_screening_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  emails_checked text[] NOT NULL DEFAULT '{}',
  matches_found integer NOT NULL DEFAULT 0,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.lead_screening_audit TO authenticated;
GRANT ALL ON public.lead_screening_audit TO service_role;

ALTER TABLE public.lead_screening_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all screening audit"
  ON public.lead_screening_audit FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "actor reads own screening audit"
  ON public.lead_screening_audit FOR SELECT
  TO authenticated
  USING (actor_id = auth.uid());

CREATE POLICY "auth inserts screening audit"
  ON public.lead_screening_audit FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE INDEX idx_lead_screening_audit_actor ON public.lead_screening_audit(actor_id);
CREATE INDEX idx_lead_screening_audit_created ON public.lead_screening_audit(created_at DESC);