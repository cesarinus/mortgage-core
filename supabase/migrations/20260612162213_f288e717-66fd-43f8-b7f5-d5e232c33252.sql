
-- 1) Extend app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'assistant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'realtor';

-- 2) Conditional logic: target a field or a section
ALTER TABLE public.crm_field_conditions
  ADD COLUMN IF NOT EXISTS target_kind text NOT NULL DEFAULT 'field',
  ADD COLUMN IF NOT EXISTS target_id uuid;

-- 3) Layout templates
CREATE TABLE IF NOT EXISTS public.crm_layout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.crm_modules(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  layout jsonb NOT NULL DEFAULT '{"sections":[]}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_layout_templates TO authenticated;
GRANT ALL ON public.crm_layout_templates TO service_role;
ALTER TABLE public.crm_layout_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read layout templates" ON public.crm_layout_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write layout templates" ON public.crm_layout_templates
  FOR ALL TO authenticated
  USING (public.has_role('admin'::app_role))
  WITH CHECK (public.has_role('admin'::app_role));
CREATE TRIGGER trg_crm_layout_templates_updated
  BEFORE UPDATE ON public.crm_layout_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Section permissions
CREATE TABLE IF NOT EXISTS public.crm_section_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.crm_sections(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_edit boolean NOT NULL DEFAULT true,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_section_permissions TO authenticated;
GRANT ALL ON public.crm_section_permissions TO service_role;
ALTER TABLE public.crm_section_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read section perms" ON public.crm_section_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write section perms" ON public.crm_section_permissions
  FOR ALL TO authenticated
  USING (public.has_role('admin'::app_role))
  WITH CHECK (public.has_role('admin'::app_role));
CREATE TRIGGER trg_crm_section_permissions_updated
  BEFORE UPDATE ON public.crm_section_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Audit logs
CREATE TABLE IF NOT EXISTS public.crm_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES public.crm_modules(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_label text,
  action text NOT NULL,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.crm_audit_logs TO authenticated;
GRANT ALL ON public.crm_audit_logs TO service_role;
ALTER TABLE public.crm_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read audit logs" ON public.crm_audit_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated insert audit logs" ON public.crm_audit_logs
  FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_crm_audit_logs_module_created
  ON public.crm_audit_logs (module_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_audit_logs_actor_created
  ON public.crm_audit_logs (actor_id, created_at DESC);
