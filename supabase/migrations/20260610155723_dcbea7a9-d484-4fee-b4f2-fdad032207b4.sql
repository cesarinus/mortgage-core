
CREATE TABLE public.crm_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label text NOT NULL,
  icon text,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.crm_modules TO authenticated;
GRANT ALL ON public.crm_modules TO service_role;
ALTER TABLE public.crm_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modules read" ON public.crm_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "modules admin write" ON public.crm_modules FOR ALL TO authenticated
  USING (public.has_role('admin'::app_role)) WITH CHECK (public.has_role('admin'::app_role));

CREATE TABLE public.crm_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.crm_modules(id) ON DELETE CASCADE,
  slug text NOT NULL,
  label text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  hidden boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, slug)
);
GRANT SELECT ON public.crm_sections TO authenticated;
GRANT ALL ON public.crm_sections TO service_role;
ALTER TABLE public.crm_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sections read" ON public.crm_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "sections admin write" ON public.crm_sections FOR ALL TO authenticated
  USING (public.has_role('admin'::app_role)) WITH CHECK (public.has_role('admin'::app_role));

CREATE TABLE public.crm_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.crm_modules(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.crm_sections(id) ON DELETE SET NULL,
  internal_name text NOT NULL,
  label text NOT NULL,
  description text,
  field_type text NOT NULL,
  required boolean NOT NULL DEFAULT false,
  hidden boolean NOT NULL DEFAULT false,
  read_only boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  default_value text,
  placeholder text,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, internal_name)
);
GRANT SELECT ON public.crm_fields TO authenticated;
GRANT ALL ON public.crm_fields TO service_role;
ALTER TABLE public.crm_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fields read" ON public.crm_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "fields admin write" ON public.crm_fields FOR ALL TO authenticated
  USING (public.has_role('admin'::app_role)) WITH CHECK (public.has_role('admin'::app_role));

CREATE TABLE public.crm_field_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL REFERENCES public.crm_fields(id) ON DELETE CASCADE,
  value text NOT NULL,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.crm_field_options TO authenticated;
GRANT ALL ON public.crm_field_options TO service_role;
ALTER TABLE public.crm_field_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "options read" ON public.crm_field_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "options admin write" ON public.crm_field_options FOR ALL TO authenticated
  USING (public.has_role('admin'::app_role)) WITH CHECK (public.has_role('admin'::app_role));

CREATE TABLE public.crm_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL REFERENCES public.crm_fields(id) ON DELETE CASCADE,
  record_type text NOT NULL,
  record_id uuid NOT NULL,
  value jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (field_id, record_type, record_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_field_values TO authenticated;
GRANT ALL ON public.crm_field_values TO service_role;
ALTER TABLE public.crm_field_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "values read" ON public.crm_field_values FOR SELECT TO authenticated USING (true);
CREATE POLICY "values write owner or admin" ON public.crm_field_values FOR ALL TO authenticated
  USING (public.has_role('admin'::app_role) OR (record_type = 'lead' AND public.user_owns_lead(record_id)))
  WITH CHECK (public.has_role('admin'::app_role) OR (record_type = 'lead' AND public.user_owns_lead(record_id)));

CREATE TRIGGER trg_crm_modules_updated BEFORE UPDATE ON public.crm_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_sections_updated BEFORE UPDATE ON public.crm_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_fields_updated BEFORE UPDATE ON public.crm_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_field_values_updated BEFORE UPDATE ON public.crm_field_values
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.crm_modules (slug, label, icon, sort_order) VALUES
  ('borrowers','Borrowers','user', 10),
  ('co_borrowers','Co-Borrowers','users', 20),
  ('leads','Leads','target', 30),
  ('loans','Loans','file-text', 40),
  ('applications','Applications','clipboard', 50),
  ('opportunities','Opportunities','trending-up', 60),
  ('realtors','Realtors','home', 70),
  ('referral_partners','Referral Partners','handshake', 80),
  ('companies','Companies','building', 90),
  ('contacts','Contacts','contact', 100),
  ('tasks','Tasks','check-square', 110),
  ('documents','Documents','folder', 120),
  ('marketing','Marketing','megaphone', 130)
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE m_id uuid;
BEGIN
  SELECT id INTO m_id FROM public.crm_modules WHERE slug='borrowers';
  IF m_id IS NOT NULL THEN
    INSERT INTO public.crm_sections (module_id, slug, label, sort_order, is_system) VALUES
      (m_id,'personal','Personal Information', 10, true),
      (m_id,'contact','Contact Information', 20, true),
      (m_id,'mortgage','Mortgage Details', 30, true),
      (m_id,'employment','Employment', 40, false),
      (m_id,'income','Income', 50, false),
      (m_id,'financial','Financial Information', 60, false),
      (m_id,'property','Property Information', 70, false),
      (m_id,'loan','Loan Information', 80, false),
      (m_id,'ai','AI Analysis', 90, false)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
