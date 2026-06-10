
-- Phase 2: Layouts, Permissions, Conditions, ARIVE bridge

CREATE TABLE IF NOT EXISTS public.crm_field_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES public.crm_fields(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_edit BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (field_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_field_permissions TO authenticated;
GRANT ALL ON public.crm_field_permissions TO service_role;
ALTER TABLE public.crm_field_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read field perms" ON public.crm_field_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write field perms" ON public.crm_field_permissions FOR ALL TO authenticated USING (public.has_role('admin'::app_role)) WITH CHECK (public.has_role('admin'::app_role));
CREATE TRIGGER trg_crm_field_permissions_updated BEFORE UPDATE ON public.crm_field_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.crm_field_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES public.crm_fields(id) ON DELETE CASCADE,
  -- action: show | hide | require | readonly
  action TEXT NOT NULL DEFAULT 'show',
  -- rule: jsonb { "all": [ { "field_id": "...", "op": "eq|neq|in|gt|lt|empty|not_empty", "value": ... } ] }
  rule JSONB NOT NULL DEFAULT '{"all":[]}'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_field_conditions TO authenticated;
GRANT ALL ON public.crm_field_conditions TO service_role;
ALTER TABLE public.crm_field_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read field conds" ON public.crm_field_conditions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write field conds" ON public.crm_field_conditions FOR ALL TO authenticated USING (public.has_role('admin'::app_role)) WITH CHECK (public.has_role('admin'::app_role));
CREATE TRIGGER trg_crm_field_conditions_updated BEFORE UPDATE ON public.crm_field_conditions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.crm_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.crm_modules(id) ON DELETE CASCADE,
  role app_role,
  name TEXT NOT NULL DEFAULT 'Default',
  is_default BOOLEAN NOT NULL DEFAULT false,
  -- layout: { sections: [ { section_id, hidden, sort, columns, fields: [{field_id, sort, width}] } ] }
  layout JSONB NOT NULL DEFAULT '{"sections":[]}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_layouts TO authenticated;
GRANT ALL ON public.crm_layouts TO service_role;
ALTER TABLE public.crm_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read layouts" ON public.crm_layouts FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write layouts" ON public.crm_layouts FOR ALL TO authenticated USING (public.has_role('admin'::app_role)) WITH CHECK (public.has_role('admin'::app_role));
CREATE TRIGGER trg_crm_layouts_updated BEFORE UPDATE ON public.crm_layouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.crm_layout_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID NOT NULL REFERENCES public.crm_layouts(id) ON DELETE CASCADE,
  version INT NOT NULL,
  layout JSONB NOT NULL,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (layout_id, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_layout_versions TO authenticated;
GRANT ALL ON public.crm_layout_versions TO service_role;
ALTER TABLE public.crm_layout_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read layout versions" ON public.crm_layout_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write layout versions" ON public.crm_layout_versions FOR ALL TO authenticated USING (public.has_role('admin'::app_role)) WITH CHECK (public.has_role('admin'::app_role));

-- ARIVE bridge: allow los_field_mappings to point to a custom CRM field
ALTER TABLE public.los_field_mappings ADD COLUMN IF NOT EXISTS crm_field_id UUID REFERENCES public.crm_fields(id) ON DELETE SET NULL;
ALTER TABLE public.los_field_mappings ADD COLUMN IF NOT EXISTS module_slug TEXT;
