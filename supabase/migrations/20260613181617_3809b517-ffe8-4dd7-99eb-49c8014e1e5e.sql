
-- ============ LEAD SOURCES (extend existing) ============
ALTER TABLE public.lead_sources
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS default_lead_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_lead_sources_updated_at ON public.lead_sources;
CREATE TRIGGER trg_lead_sources_updated_at BEFORE UPDATE ON public.lead_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults if table empty-ish (only inserts missing names)
INSERT INTO public.lead_sources (name, color, icon, sort, default_lead_score)
VALUES
  ('Realtor','#FF7A00','Home',1,75),
  ('Past Client','#16A34A','Users',2,80),
  ('Referral','#0EA5E9','Share2',3,70),
  ('Google Ads','#EAB308','Search',4,50),
  ('Facebook','#1877F2','Facebook',5,40),
  ('Instagram','#E1306C','Instagram',6,40),
  ('Organic Search','#10B981','Globe',7,55),
  ('Open House','#F97316','DoorOpen',8,60),
  ('Walk-In','#A855F7','Footprints',9,55),
  ('Website Form','#3B82F6','FileText',10,50),
  ('AI Assistant','#8B5CF6','Bot',11,85),
  ('Digital Twin','#06B6D4','BrainCircuit',12,80),
  ('VAPI Voice Agent','#EF4444','PhoneCall',13,75),
  ('Zapier Import','#FB923C','Zap',14,40),
  ('ARIVE Import','#64748B','Database',15,40)
ON CONFLICT (name) DO NOTHING;

-- ============ LEAD SOURCE RULES ============
CREATE TABLE IF NOT EXISTS public.lead_source_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.lead_sources(id) ON DELETE CASCADE,
  name text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_source_rules TO authenticated;
GRANT ALL ON public.lead_source_rules TO service_role;
ALTER TABLE public.lead_source_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read lead source rules" ON public.lead_source_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage lead source rules" ON public.lead_source_rules FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP TRIGGER IF EXISTS trg_lead_source_rules_updated_at ON public.lead_source_rules;
CREATE TRIGGER trg_lead_source_rules_updated_at BEFORE UPDATE ON public.lead_source_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ LEAD SOURCE ANALYTICS DAILY ============
CREATE TABLE IF NOT EXISTS public.lead_source_analytics_daily (
  source_id uuid NOT NULL REFERENCES public.lead_sources(id) ON DELETE CASCADE,
  day date NOT NULL,
  leads int NOT NULL DEFAULT 0,
  applications int NOT NULL DEFAULT 0,
  funded int NOT NULL DEFAULT 0,
  revenue_cents bigint NOT NULL DEFAULT 0,
  conversion_pct numeric NOT NULL DEFAULT 0,
  avg_close_days numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_id, day)
);
GRANT SELECT ON public.lead_source_analytics_daily TO authenticated;
GRANT ALL ON public.lead_source_analytics_daily TO service_role;
ALTER TABLE public.lead_source_analytics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read lead source analytics" ON public.lead_source_analytics_daily FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins write lead source analytics" ON public.lead_source_analytics_daily FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ PIPELINE STAGES ============
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  color text,
  icon text,
  probability_pct int NOT NULL DEFAULT 0,
  expected_days int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  is_terminal boolean NOT NULL DEFAULT false,
  sort int NOT NULL DEFAULT 0,
  arive_stage_id text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_stages TO authenticated;
GRANT ALL ON public.pipeline_stages TO service_role;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read pipeline stages" ON public.pipeline_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage pipeline stages" ON public.pipeline_stages FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP TRIGGER IF EXISTS trg_pipeline_stages_updated_at ON public.pipeline_stages;
CREATE TRIGGER trg_pipeline_stages_updated_at BEFORE UPDATE ON public.pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.pipeline_stages (key, name, color, icon, probability_pct, expected_days, sort, is_terminal) VALUES
  ('lead','Lead','#94A3B8','Sparkles',5,3,1,false),
  ('pre_qualification','Pre-Qualification','#60A5FA','ClipboardCheck',15,5,2,false),
  ('pre_approval','Pre-Approval','#3B82F6','BadgeCheck',25,7,3,false),
  ('application_sent','Application','#06B6D4','FileSignature',40,7,4,false),
  ('processing','Processing','#0EA5E9','Loader',55,7,5,false),
  ('underwriting','Underwriting','#6366F1','Search',75,7,6,false),
  ('conditional_approval','Conditional Approval','#8B5CF6','CheckCircle2',85,5,7,false),
  ('clear_to_close','Clear To Close','#EAB308','KeyRound',90,3,8,false),
  ('funding','Funding','#F97316','Banknote',95,2,9,false),
  ('closed','Closed','#16A34A','Trophy',100,0,10,true),
  ('lost','Lost','#EF4444','XCircle',0,0,11,true)
ON CONFLICT (key) DO NOTHING;

-- ============ STAGE REQUIREMENTS ============
CREATE TABLE IF NOT EXISTS public.pipeline_stage_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
  field_id uuid REFERENCES public.crm_fields(id) ON DELETE CASCADE,
  field_key text,
  required boolean NOT NULL DEFAULT true,
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_stage_requirements TO authenticated;
GRANT ALL ON public.pipeline_stage_requirements TO service_role;
ALTER TABLE public.pipeline_stage_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read stage requirements" ON public.pipeline_stage_requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage stage requirements" ON public.pipeline_stage_requirements FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ STAGE RULES ============
CREATE TABLE IF NOT EXISTS public.pipeline_stage_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger text NOT NULL DEFAULT 'on_enter',
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_stage_rules TO authenticated;
GRANT ALL ON public.pipeline_stage_rules TO service_role;
ALTER TABLE public.pipeline_stage_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read stage rules" ON public.pipeline_stage_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage stage rules" ON public.pipeline_stage_rules FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP TRIGGER IF EXISTS trg_pipeline_stage_rules_updated_at ON public.pipeline_stage_rules;
CREATE TRIGGER trg_pipeline_stage_rules_updated_at BEFORE UPDATE ON public.pipeline_stage_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ STAGE ANALYTICS DAILY ============
CREATE TABLE IF NOT EXISTS public.pipeline_stage_analytics_daily (
  stage_id uuid NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
  day date NOT NULL,
  avg_time_hours numeric NOT NULL DEFAULT 0,
  conversion_pct numeric NOT NULL DEFAULT 0,
  drop_off_pct numeric NOT NULL DEFAULT 0,
  funded int NOT NULL DEFAULT 0,
  revenue_cents bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (stage_id, day)
);
GRANT SELECT ON public.pipeline_stage_analytics_daily TO authenticated;
GRANT ALL ON public.pipeline_stage_analytics_daily TO service_role;
ALTER TABLE public.pipeline_stage_analytics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read stage analytics" ON public.pipeline_stage_analytics_daily FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins write stage analytics" ON public.pipeline_stage_analytics_daily FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ NOTIFICATION PREFERENCES ============
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  channels jsonb NOT NULL DEFAULT '{}'::jsonb,
  quiet_hours jsonb NOT NULL DEFAULT '{"start":"22:00","end":"07:00","tz":"America/New_York","enabled":false}'::jsonb,
  digest_mode text NOT NULL DEFAULT 'instant',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notification prefs" ON public.notification_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS trg_notif_prefs_updated_at ON public.notification_preferences;
CREATE TRIGGER trg_notif_prefs_updated_at BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ NOTIFICATION TEMPLATES ============
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  channel text NOT NULL,
  subject text,
  body text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notification_templates TO authenticated;
GRANT ALL ON public.notification_templates TO service_role;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read notification templates" ON public.notification_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage notification templates" ON public.notification_templates FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ NOTIFICATION EVENTS ============
CREATE TABLE IF NOT EXISTS public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  channel text NOT NULL DEFAULT 'in_app',
  title text,
  body text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  priority text NOT NULL DEFAULT 'normal',
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_events_user ON public.notification_events(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_events TO authenticated;
GRANT ALL ON public.notification_events TO service_role;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notification events" ON public.notification_events FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ NOTIFICATION DIGESTS ============
CREATE TABLE IF NOT EXISTS public.notification_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_digests TO authenticated;
GRANT ALL ON public.notification_digests TO service_role;
ALTER TABLE public.notification_digests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notification digests" ON public.notification_digests FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
