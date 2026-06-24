
CREATE TABLE IF NOT EXISTS public.entity_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_key TEXT NOT NULL UNIQUE,
  table_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  owner_module TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.entity_registry TO authenticated;
GRANT ALL ON public.entity_registry TO service_role;
ALTER TABLE public.entity_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage entity_registry" ON public.entity_registry FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Authenticated read entity_registry" ON public.entity_registry FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.system_integrity_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_key TEXT NOT NULL UNIQUE,
  entity_key TEXT NOT NULL REFERENCES public.entity_registry(entity_key) ON DELETE CASCADE,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  sql_probe TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_integrity_checks TO authenticated;
GRANT ALL ON public.system_integrity_checks TO service_role;
ALTER TABLE public.system_integrity_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage system_integrity_checks" ON public.system_integrity_checks FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Authenticated read system_integrity_checks" ON public.system_integrity_checks FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.entity_health_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_key TEXT NOT NULL,
  check_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass','warn','fail','error')),
  issue_count INTEGER NOT NULL DEFAULT 0,
  details JSONB,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scan_run_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_entity_health_report_scanned_at ON public.entity_health_report (scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_entity_health_report_entity ON public.entity_health_report (entity_key, check_key, scanned_at DESC);
GRANT SELECT ON public.entity_health_report TO authenticated;
GRANT ALL ON public.entity_health_report TO service_role;
ALTER TABLE public.entity_health_report ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read entity_health_report" ON public.entity_health_report FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY "Service role manages entity_health_report" ON public.entity_health_report FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_entity_registry_updated_at BEFORE UPDATE ON public.entity_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_system_integrity_checks_updated_at BEFORE UPDATE ON public.system_integrity_checks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.entity_registry (entity_key, table_name, display_name, owner_module, description) VALUES
  ('opportunity',         'pipeline_opportunities', 'Opportunity',         'pipeline', 'Canonical mortgage deal / opportunity record'),
  ('lead',                'leads',                  'Lead',                'leads',    'Inbound leads prior to opportunity conversion'),
  ('contact',             'contacts',               'Contact',             'contacts', 'CRM contact records'),
  ('task',                'tasks',                  'Task',                'tasks',    'Tasks tied to opportunities, leads, or contacts'),
  ('deal_stage_history',  'deal_stage_history',     'Deal Stage History',  'pipeline', 'Audit trail of opportunity stage transitions'),
  ('deal_documents',      'deal_documents',         'Deal Documents',      'pipeline', 'Documents attached to opportunities'),
  ('deal_to_opportunity', 'deal_to_opportunity',    'Deal->Opportunity Map','pipeline', 'Provenance map from legacy deals to opportunities')
ON CONFLICT (entity_key) DO NOTHING;

INSERT INTO public.system_integrity_checks (check_key, entity_key, description, severity, sql_probe) VALUES
  ('opportunity.stage_enum_valid', 'opportunity',
   'Every pipeline_opportunities.stage value maps to a known deal_stage enum', 'warning',
   'SELECT count(*) FROM public.pipeline_opportunities po WHERE public.stage_to_deal_enum(po.stage::text) IS NULL'),
  ('deal_stage_history.orphan_opportunity', 'deal_stage_history',
   'deal_stage_history rows reference an existing opportunity (via deals view)', 'critical',
   'SELECT count(*) FROM public.deal_stage_history h LEFT JOIN public.deals d ON d.id = h.deal_id WHERE d.id IS NULL'),
  ('deal_documents.orphan_opportunity', 'deal_documents',
   'deal_documents rows reference an existing opportunity (via deals view)', 'critical',
   'SELECT count(*) FROM public.deal_documents dd LEFT JOIN public.deals d ON d.id = dd.deal_id WHERE d.id IS NULL'),
  ('opportunity.missing_legacy_stub', 'opportunity',
   'Migrated opportunities have a matching deals_legacy stub row for FK validity', 'warning',
   'SELECT count(*) FROM public.pipeline_opportunities po WHERE po.legacy_deal_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.deals_legacy dl WHERE dl.id = po.legacy_deal_id)'),
  ('deal_to_opportunity.dangling', 'deal_to_opportunity',
   'deal_to_opportunity entries point to an existing pipeline_opportunities row', 'critical',
   'SELECT count(*) FROM public.deal_to_opportunity m LEFT JOIN public.pipeline_opportunities po ON po.id = m.opportunity_id WHERE po.id IS NULL'),
  ('task.orphan_parent', 'task',
   'Tasks linked to an opportunity reference an existing opportunity', 'warning',
   'SELECT count(*) FROM public.tasks t WHERE t.deal_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.deals d WHERE d.id = t.deal_id)')
ON CONFLICT (check_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.run_integrity_scan()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id UUID := gen_random_uuid();
  v_check RECORD;
  v_count BIGINT;
  v_status TEXT;
  v_err TEXT;
BEGIN
  FOR v_check IN
    SELECT check_key, entity_key, severity, sql_probe
    FROM public.system_integrity_checks
    WHERE is_active = true
  LOOP
    BEGIN
      EXECUTE v_check.sql_probe INTO v_count;
      IF v_count = 0 THEN v_status := 'pass';
      ELSIF v_check.severity = 'critical' THEN v_status := 'fail';
      ELSE v_status := 'warn';
      END IF;
      INSERT INTO public.entity_health_report (entity_key, check_key, status, issue_count, details, scan_run_id)
      VALUES (v_check.entity_key, v_check.check_key, v_status, COALESCE(v_count,0),
              jsonb_build_object('severity', v_check.severity), v_run_id);
    EXCEPTION WHEN OTHERS THEN
      v_err := SQLERRM;
      INSERT INTO public.entity_health_report (entity_key, check_key, status, issue_count, details, scan_run_id)
      VALUES (v_check.entity_key, v_check.check_key, 'error', 0,
              jsonb_build_object('error', v_err, 'severity', v_check.severity), v_run_id);
    END;
  END LOOP;
  RETURN v_run_id;
END;
$$;
REVOKE ALL ON FUNCTION public.run_integrity_scan() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_integrity_scan() TO service_role;
