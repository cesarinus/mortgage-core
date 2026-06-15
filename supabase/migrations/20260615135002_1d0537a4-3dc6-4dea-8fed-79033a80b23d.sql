
-- ============================================================
-- Sprint 3: ARIVE Mapping, Integrations Hub, Team & Security
-- ============================================================

-- ---- Phase 1: ARIVE LOS Mapping ----
ALTER TABLE public.los_field_mappings
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS sync_direction text NOT NULL DEFAULT 'crm_to_los',
  ADD COLUMN IF NOT EXISTS transform_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS transform_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'mapped',
  ADD COLUMN IF NOT EXISTS last_validated_at timestamptz;

CREATE TABLE IF NOT EXISTS public.arive_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type text NOT NULL,
  object_id uuid,
  direction text NOT NULL DEFAULT 'crm_to_los',
  status text NOT NULL DEFAULT 'pending',
  payload jsonb,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.arive_sync_jobs TO authenticated;
GRANT ALL ON public.arive_sync_jobs TO service_role;
ALTER TABLE public.arive_sync_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read arive_sync_jobs" ON public.arive_sync_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write arive_sync_jobs" ON public.arive_sync_jobs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---- Phase 2: Integrations Hub ----
CREATE TABLE IF NOT EXISTS public.integration_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  credentials_secret_ref text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_connections TO authenticated;
GRANT ALL ON public.integration_connections TO service_role;
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read integ_conn" ON public.integration_connections FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write integ_conn" ON public.integration_connections FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_integ_conn_updated BEFORE UPDATE ON public.integration_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.integration_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  checked_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  latency_ms integer,
  requests_today integer DEFAULT 0,
  error_count integer DEFAULT 0,
  details jsonb
);
GRANT SELECT, INSERT ON public.integration_health_snapshots TO authenticated;
GRANT ALL ON public.integration_health_snapshots TO service_role;
ALTER TABLE public.integration_health_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read health" ON public.integration_health_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write health" ON public.integration_health_snapshots FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Seed default integrations
INSERT INTO public.integration_connections (key, name, category, provider, status) VALUES
  ('supabase','Supabase','infra','supabase','connected'),
  ('lovable_ai','Lovable AI','ai','lovable','connected'),
  ('openai','OpenAI','ai','openai','disconnected'),
  ('ollama','Ollama (Local)','ai','ollama','disconnected'),
  ('twilio','Twilio','comms','twilio','disconnected'),
  ('resend','Resend','comms','resend','connected'),
  ('zapier','Zapier','automation','zapier','disconnected'),
  ('n8n','n8n','automation','n8n','disconnected'),
  ('arive','ARIVE LOS','mortgage','arive','connected'),
  ('google','Google','productivity','google','disconnected'),
  ('microsoft','Microsoft','productivity','microsoft','disconnected')
ON CONFLICT (key) DO NOTHING;

-- ---- Phase 3: Team & Permissions ----
-- Extend app_role enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='loan_officer' AND enumtypid='public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'loan_officer';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='processor' AND enumtypid='public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'processor';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='assistant' AND enumtypid='public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'assistant';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='realtor' AND enumtypid='public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'realtor';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='portal_user' AND enumtypid='public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'portal_user';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  base_role text,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write roles" ON public.roles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_roles_updated BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource text NOT NULL,
  action text NOT NULL,
  UNIQUE (resource, action)
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write permissions" ON public.permissions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'own',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read role_perms" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write role_perms" ON public.role_permissions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.record_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  resource text NOT NULL,
  scope text NOT NULL DEFAULT 'own',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, resource)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.record_permissions TO authenticated;
GRANT ALL ON public.record_permissions TO service_role;
ALTER TABLE public.record_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read rec_perms" ON public.record_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write rec_perms" ON public.record_permissions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invitations TO authenticated;
GRANT ALL ON public.team_invitations TO service_role;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read invites" ON public.team_invitations FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin write invites" ON public.team_invitations FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Seed system roles
INSERT INTO public.roles (key, name, description, base_role, is_system) VALUES
  ('admin','Admin','Full access to all resources','admin',true),
  ('loan_officer','Loan Officer','Manages leads, borrowers, and pipeline','loan_officer',true),
  ('processor','Processor','Manages documents, pipeline, and loan status','processor',true),
  ('assistant','Assistant','Manages tasks and communications','assistant',true),
  ('realtor','Realtor','Views assigned referrals and tracks status','realtor',true),
  ('portal_user','Borrower Portal User','Views loan status, uploads documents','portal_user',true)
ON CONFLICT (key) DO NOTHING;

-- Seed permissions
INSERT INTO public.permissions (resource, action)
SELECT r, a FROM (VALUES ('leads'),('borrowers'),('loans'),('pipeline'),('documents'),('reports'),('settings')) AS res(r)
CROSS JOIN (VALUES ('view'),('create'),('edit'),('delete'),('export'),('manage')) AS act(a)
ON CONFLICT (resource, action) DO NOTHING;

-- has_permission helper
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _resource text, _action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.base_role = ur.role::text
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id
      AND p.resource = _resource
      AND p.action = _action
  ) OR public.has_role('admin'::app_role)
$$;

-- ---- Phase 4: Security Center ----
CREATE TABLE IF NOT EXISTS public.security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  password_policy jsonb NOT NULL DEFAULT '{"min_length":10,"require_upper":true,"require_number":true,"require_symbol":false}'::jsonb,
  session_timeout_minutes integer NOT NULL DEFAULT 480,
  lockout_threshold integer NOT NULL DEFAULT 5,
  lockout_minutes integer NOT NULL DEFAULT 15,
  mfa_mode text NOT NULL DEFAULT 'optional',
  mfa_default_channel text NOT NULL DEFAULT 'email',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.security_settings TO authenticated;
GRANT ALL ON public.security_settings TO service_role;
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sec_settings" ON public.security_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write sec_settings" ON public.security_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_sec_settings_updated BEFORE UPDATE ON public.security_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.security_settings (singleton) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip text,
  device text,
  location text,
  user_agent text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_sessions TO service_role;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions read" ON public.user_sessions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "own sessions write" ON public.user_sessions FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  ip text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read sec_events" ON public.security_events FOR SELECT TO authenticated USING (public.is_admin() OR user_id = auth.uid());
CREATE POLICY "auth insert sec_events" ON public.security_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.mfa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'email',
  enabled boolean NOT NULL DEFAULT false,
  secret_ref text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mfa_settings TO authenticated;
GRANT ALL ON public.mfa_settings TO service_role;
ALTER TABLE public.mfa_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mfa read" ON public.mfa_settings FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "own mfa write" ON public.mfa_settings FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE TRIGGER trg_mfa_updated BEFORE UPDATE ON public.mfa_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
