
CREATE TABLE public.los_integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event text NOT NULL,
  direction text NOT NULL DEFAULT 'outbound',
  payload jsonb,
  response jsonb,
  status text NOT NULL DEFAULT 'pending',
  error text,
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX los_integration_logs_lead_id_idx ON public.los_integration_logs(lead_id);
CREATE INDEX los_integration_logs_created_at_idx ON public.los_integration_logs(created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.los_integration_logs TO authenticated;
GRANT ALL ON public.los_integration_logs TO service_role;

ALTER TABLE public.los_integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own LOS logs"
  ON public.los_integration_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role('admin'::app_role));

CREATE POLICY "Users insert their own LOS logs"
  ON public.los_integration_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update their own LOS logs"
  ON public.los_integration_logs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role('admin'::app_role));
