CREATE TABLE public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  subject text,
  audience_role text NOT NULL DEFAULT 'Realtor',
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated;
GRANT ALL ON public.email_campaigns TO service_role;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage campaigns" ON public.email_campaigns FOR ALL TO authenticated
USING (public.has_role('admin') OR public.has_role('loan_officer') OR public.has_role('processor') OR public.has_role('assistant'))
WITH CHECK (public.has_role('admin') OR public.has_role('loan_officer') OR public.has_role('processor') OR public.has_role('assistant'));
CREATE TRIGGER trg_email_campaigns_updated BEFORE UPDATE ON public.email_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.email_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  email text NOT NULL,
  first_name text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaign_recipients TO authenticated;
GRANT ALL ON public.email_campaign_recipients TO service_role;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage campaign recipients" ON public.email_campaign_recipients FOR ALL TO authenticated
USING (public.has_role('admin') OR public.has_role('loan_officer') OR public.has_role('processor') OR public.has_role('assistant'))
WITH CHECK (public.has_role('admin') OR public.has_role('loan_officer') OR public.has_role('processor') OR public.has_role('assistant'));

CREATE TABLE public.email_unsubscribes (
  email text PRIMARY KEY,
  campaign_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_unsubscribes TO authenticated;
GRANT ALL ON public.email_unsubscribes TO service_role;
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view unsubscribes" ON public.email_unsubscribes FOR SELECT TO authenticated
USING (public.has_role('admin') OR public.has_role('loan_officer') OR public.has_role('processor') OR public.has_role('assistant'));