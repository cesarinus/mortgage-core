CREATE TABLE public.integration_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'zapier',
  url text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  events text[] NOT NULL DEFAULT ARRAY['lead.created','deal.stage_changed','deal.closed']::text[],
  last_fired_at timestamptz,
  last_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_webhooks TO authenticated;
GRANT ALL ON public.integration_webhooks TO service_role;

ALTER TABLE public.integration_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own webhooks"
  ON public.integration_webhooks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own webhooks"
  ON public.integration_webhooks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own webhooks"
  ON public.integration_webhooks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete own webhooks"
  ON public.integration_webhooks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_integration_webhooks_updated_at
  BEFORE UPDATE ON public.integration_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();