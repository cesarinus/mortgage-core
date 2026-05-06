-- Newsletter MVP: subscribers, email_templates, email_logs (additive, RLS-locked to admins)

CREATE TABLE IF NOT EXISTS public.subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  email text NOT NULL UNIQUE,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed','unsubscribed','bounced')),
  lead_id uuid,
  source text DEFAULT 'manual',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON public.subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON public.subscribers(status);
CREATE INDEX IF NOT EXISTS idx_subscribers_tags ON public.subscribers USING GIN(tags);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage subscribers" ON public.subscribers
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER trg_subscribers_updated_at
  BEFORE UPDATE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  alias text UNIQUE,
  subject text NOT NULL DEFAULT '',
  html_content text NOT NULL DEFAULT '',
  text_content text NOT NULL DEFAULT '',
  category text DEFAULT 'general',
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage email_templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER trg_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid REFERENCES public.subscribers(id) ON DELETE SET NULL,
  lead_id uuid,
  template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  template_alias text,
  recipient_email text NOT NULL,
  subject text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('queued','sent','failed','opened','clicked','bounced')),
  provider_message_id text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON public.email_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read email_logs" ON public.email_logs
  FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins insert email_logs" ON public.email_logs
  FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins update email_logs" ON public.email_logs
  FOR UPDATE TO authenticated USING (is_admin());


-- Seed Google Review Request template
INSERT INTO public.email_templates (name, alias, subject, html_content, text_content, category, is_system)
VALUES (
  'Google Review Request',
  'google-review-request',
  'Quick favor — would you leave us a Google review?',
  '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f7f5f1;font-family:Inter,Arial,sans-serif;color:#1f1f1f;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f1;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<tr><td style="background:#ea7c3a;padding:28px 32px;text-align:center;color:#ffffff;">
<div style="font-size:22px;font-weight:700;letter-spacing:0.5px;">NexGen Capital Corp</div>
<div style="font-size:13px;opacity:0.9;margin-top:4px;">Serving borrower needs</div>
</td></tr>
<tr><td style="padding:36px 36px 12px 36px;">
<p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{first_name}},</p>
<p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Thank you again for your business. I would really appreciate it if you would take 30 seconds to complete a review of our services on Google.</p>
<p style="font-size:16px;line-height:1.6;margin:0 0 28px;">Your feedback helps us continue providing excellent service and helps others make confident decisions.</p>
</td></tr>
<tr><td align="center" style="padding:0 36px 32px 36px;">
<a href="{{google_review_link}}" style="background:#ea7c3a;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;">Leave a Google Review</a>
</td></tr>
<tr><td style="padding:0 36px 32px 36px;">
<p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:#444;">If you have any questions, feel free to reach out anytime.</p>
<hr style="border:none;border-top:1px solid #eee;margin:0 0 20px;"/>
<p style="font-size:13px;line-height:1.6;color:#666;margin:0;">
<strong style="color:#1f1f1f;">Cesar A Martinez</strong><br/>
NexGen Capital Corp · NMLS 1766649<br/>
<a href="mailto:cmartinez@ngcapital.net" style="color:#ea7c3a;text-decoration:none;">cmartinez@ngcapital.net</a><br/>
3960 Radio Rd Ste 105, Naples, FL 34104
</p>
</td></tr>
</table>
</td></tr></table></body></html>',
  E'Hi {{first_name}},\n\nThank you again for your business. I would really appreciate it if you could take a moment to leave us a review on Google.\n\n{{google_review_link}}\n\nIf you have any questions, feel free to reach out.\n\nCesar A Martinez\nNexGen Capital Corp\nNMLS 256062\ncmartinez@ngcapital.net',
  'review',
  true
)
ON CONFLICT (alias) DO NOTHING;
