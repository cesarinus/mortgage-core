
CREATE TABLE public.lead_export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid,
  export_system text NOT NULL DEFAULT 'arive',
  payload jsonb,
  response jsonb,
  validation_errors jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lead_export_logs_lead_idx ON public.lead_export_logs(lead_id, created_at DESC);

GRANT SELECT, INSERT ON public.lead_export_logs TO authenticated;
GRANT ALL ON public.lead_export_logs TO service_role;

ALTER TABLE public.lead_export_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and admins can view export logs"
  ON public.lead_export_logs
  FOR SELECT
  TO authenticated
  USING (public.user_owns_lead(lead_id) OR public.is_admin());

CREATE POLICY "Owners can insert export logs"
  ON public.lead_export_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_owns_lead(lead_id) OR public.is_admin());

CREATE POLICY "Admins manage export logs"
  ON public.lead_export_logs
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
