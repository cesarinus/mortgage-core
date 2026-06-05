
-- 1) email_providers
CREATE TABLE IF NOT EXISTS public.email_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  host text NOT NULL,
  port integer NOT NULL DEFAULT 587,
  username text NOT NULL,
  password text NOT NULL,
  from_email text NOT NULL,
  from_name text NOT NULL DEFAULT 'NGCapital Mortgage',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_providers TO authenticated;
GRANT ALL ON public.email_providers TO service_role;
ALTER TABLE public.email_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage email_providers" ON public.email_providers;
CREATE POLICY "Admins manage email_providers" ON public.email_providers
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS trg_email_providers_updated_at ON public.email_providers;
CREATE TRIGGER trg_email_providers_updated_at BEFORE UPDATE ON public.email_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) email_logs extensions
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.pipeline_opportunities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_email_logs_lead ON public.email_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_opportunity ON public.email_logs(opportunity_id);

-- 3) email_templates extensions
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS merge_fields text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS trigger_event text;

-- 4) Seed templates
INSERT INTO public.email_templates (name, alias, subject, html_content, text_content, category, is_system, merge_fields, trigger_event)
VALUES
('Welcome Email', 'welcome-email',
 'Welcome to NGCapital — Let''s get started',
 '<p>Hi {{first_name}},</p><p>Welcome to NGCapital Mortgage. Your loan officer will contact you within 24 hours.</p><p><strong>To get pre-qualified, please have these documents ready:</strong></p><ul><li>Photo ID (Driver''s License / Passport)</li><li>Last 2 pay stubs</li><li>Last 2 years W-2s or tax returns</li><li>Last 2 months bank statements</li><li>Proof of residence (utility bill or lease agreement)</li><li>If self-employed: Profit &amp; Loss + Balance Sheet</li></ul><p>You can upload your documents securely through our <a href="{{portal_link}}">borrower portal</a>.</p><p>Thanks,<br/>Christian Martinez<br/>NGCapital Mortgage</p>',
 'Hi {{first_name}}, welcome to NGCapital. Your loan officer will contact you within 24 hours. Documents needed: Photo ID, last 2 pay stubs, last 2 years W-2s, last 2 months bank statements, proof of residence, and (if self-employed) P&L + Balance Sheet. Upload: {{portal_link}}',
 'lifecycle', true,
 ARRAY['first_name','last_name','portal_link'],
 'lead_created')
ON CONFLICT (alias) DO NOTHING;

INSERT INTO public.email_templates (name, alias, subject, html_content, text_content, category, is_system, merge_fields, trigger_event)
VALUES
('Document Reminder', 'document-reminder',
 'Reminder: Documents needed for pre-qualification',
 '<p>Hi {{first_name}},</p><p>Just a friendly reminder — we''re still waiting on a few documents to complete your pre-qualification:</p><ul><li>Photo ID</li><li>Last 2 pay stubs</li><li>Last 2 years W-2s or tax returns</li><li>Last 2 months bank statements</li><li>Proof of residence</li><li>If self-employed: P&amp;L + Balance Sheet</li></ul><p>Please upload them here: <a href="{{portal_link}}">{{portal_link}}</a></p><p>Thanks,<br/>Christian Martinez</p>',
 'Hi {{first_name}}, friendly reminder to upload your documents: {{portal_link}}',
 'lifecycle', true,
 ARRAY['first_name','portal_link'],
 'qualified_no_docs')
ON CONFLICT (alias) DO NOTHING;

INSERT INTO public.email_templates (name, alias, subject, html_content, text_content, category, is_system, merge_fields, trigger_event)
VALUES
('Google Review Request', 'google-review-request',
 'Quick favor — would you leave us a Google review?',
 '<p>Hi {{first_name}},</p><p>Congratulations on closing! It was a pleasure helping you. If you have a minute, would you mind sharing your experience with a quick Google review?</p><p><a href="{{google_review_link}}">Leave a Google review</a></p><p>Thank you so much,<br/>Christian Martinez<br/>NGCapital Mortgage</p>',
 'Hi {{first_name}}, congrats on closing! Could you leave us a Google review? {{google_review_link}}',
 'lifecycle', true,
 ARRAY['first_name','google_review_link'],
 'deal_closed')
ON CONFLICT (alias) DO NOTHING;

-- 5) Triggers calling send-email edge function
CREATE OR REPLACE FUNCTION public.notify_lead_created_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','net'
AS $function$
DECLARE
  v_url text := 'https://hyskofjwotohgdtocsie.supabase.co/functions/v1/send-email';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5c2tvZmp3b3RvaGdkdG9jc2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NjcxODUsImV4cCI6MjA4NjA0MzE4NX0.2M5GNKjxatuYJ2cG3kwHjcrwdK8CTRXwPerdv__J8vQ';
BEGIN
  IF NEW.email IS NULL OR NEW.email = '' THEN RETURN NEW; END IF;
  BEGIN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || v_anon,
        'x-trigger-source','db-trigger'
      ),
      body := jsonb_build_object(
        'template_alias','welcome-email',
        'to', NEW.email,
        'lead_id', NEW.id,
        'vars', jsonb_build_object(
          'first_name', COALESCE(NEW.first_name,''),
          'last_name', COALESCE(NEW.last_name,''),
          'portal_link','https://ngcapital.net/portal/login'
        )
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'notify_lead_created_email failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_lead_created_email ON public.leads;
CREATE TRIGGER trg_notify_lead_created_email
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.notify_lead_created_email();

CREATE OR REPLACE FUNCTION public.notify_deal_closed_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','net'
AS $function$
DECLARE
  v_url text := 'https://hyskofjwotohgdtocsie.supabase.co/functions/v1/send-email';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5c2tvZmp3b3RvaGdkdG9jc2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NjcxODUsImV4cCI6MjA4NjA0MzE4NX0.2M5GNKjxatuYJ2cG3kwHjcrwdK8CTRXwPerdv__J8vQ';
  v_lead public.leads%ROWTYPE;
BEGIN
  IF NEW.stage <> 'closed' OR OLD.stage = 'closed' THEN RETURN NEW; END IF;
  SELECT * INTO v_lead FROM public.leads WHERE id = NEW.lead_id;
  IF v_lead.email IS NULL THEN RETURN NEW; END IF;
  BEGIN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || v_anon,
        'x-trigger-source','db-trigger'
      ),
      body := jsonb_build_object(
        'template_alias','google-review-request',
        'to', v_lead.email,
        'lead_id', v_lead.id,
        'opportunity_id', NEW.id,
        'vars', jsonb_build_object(
          'first_name', COALESCE(v_lead.first_name,''),
          'google_review_link','https://g.page/r/CfDh9HCvSE-WEBE/review'
        )
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'notify_deal_closed_email failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_deal_closed_email ON public.pipeline_opportunities;
CREATE TRIGGER trg_notify_deal_closed_email
AFTER UPDATE ON public.pipeline_opportunities
FOR EACH ROW EXECUTE FUNCTION public.notify_deal_closed_email();
