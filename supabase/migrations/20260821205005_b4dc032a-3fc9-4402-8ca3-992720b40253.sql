CREATE TABLE public.closing_disclosures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES public.pipeline_opportunities(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  deal_type text NOT NULL DEFAULT 'Closing Disclosure',
  form_type text NOT NULL DEFAULT 'CFPB_H25A_6PG',
  status text NOT NULL DEFAULT 'draft',
  crm_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.closing_disclosures TO authenticated;
GRANT ALL ON public.closing_disclosures TO service_role;

ALTER TABLE public.closing_disclosures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cd_select" ON public.closing_disclosures
FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_admin()
  OR (opportunity_id IS NOT NULL AND public.user_can_access_opportunity(opportunity_id))
  OR (lead_id IS NOT NULL AND public.user_owns_lead(lead_id))
);

CREATE POLICY "cd_insert" ON public.closing_disclosures
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "cd_update" ON public.closing_disclosures
FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_admin()
  OR (opportunity_id IS NOT NULL AND public.user_can_access_opportunity(opportunity_id))
)
WITH CHECK (
  created_by = auth.uid()
  OR public.is_admin()
  OR (opportunity_id IS NOT NULL AND public.user_can_access_opportunity(opportunity_id))
);

CREATE POLICY "cd_delete" ON public.closing_disclosures
FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.is_admin());

CREATE INDEX idx_closing_disclosures_opportunity ON public.closing_disclosures(opportunity_id);
CREATE INDEX idx_closing_disclosures_created_by ON public.closing_disclosures(created_by);

CREATE TRIGGER update_closing_disclosures_updated_at
BEFORE UPDATE ON public.closing_disclosures
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();