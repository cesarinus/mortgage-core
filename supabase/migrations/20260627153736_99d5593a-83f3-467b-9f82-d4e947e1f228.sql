
-- =========================================================================
-- Phase 1: Self-Employed Income Analysis schema
-- =========================================================================

-- ---------- Enums ----------
DO $$ BEGIN
  CREATE TYPE public.income_type AS ENUM (
    'w2','schedule_c','schedule_e','schedule_f',
    'partnership_1065','s_corp_1120s','c_corp_1120','multiple'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.business_entity_type AS ENUM (
    'sole_prop','single_member_llc','partnership',
    's_corp','c_corp','schedule_e_rental','schedule_f_farm'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.income_analysis_status AS ENUM (
    'draft','documents_pending','extracting','calculated','review','approved','archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.income_document_status AS ENUM (
    'uploaded','classified','extracted','needs_review','approved','rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Borrower income type on leads ----------
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS income_type    public.income_type,
  ADD COLUMN IF NOT EXISTS income_sources jsonb NOT NULL DEFAULT '[]'::jsonb;

-- =========================================================================
-- 1. income_analysis_cases
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.income_analysis_cases (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id      uuid NOT NULL REFERENCES public.pipeline_opportunities(id) ON DELETE CASCADE,
  lead_id             uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  primary_contact_id  uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  status              public.income_analysis_status NOT NULL DEFAULT 'draft',
  tax_years           integer[] NOT NULL DEFAULT ARRAY[2024,2025]::integer[],
  formula_version     text NOT NULL DEFAULT 'all-in-one-2025.v1',
  qualifying_income_monthly numeric(14,2),
  qualifying_income_annual  numeric(14,2),
  underwriter_notes   text,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_income_cases_opportunity
  ON public.income_analysis_cases(opportunity_id);
CREATE INDEX IF NOT EXISTS ix_income_cases_status
  ON public.income_analysis_cases(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_analysis_cases TO authenticated;
GRANT ALL ON public.income_analysis_cases TO service_role;
ALTER TABLE public.income_analysis_cases ENABLE ROW LEVEL SECURITY;

-- Helper: owner of opportunity (admin OR lead owner OR opportunity LO/creator)
CREATE OR REPLACE FUNCTION public.user_can_access_opportunity(_opp_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role('admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.pipeline_opportunities po
      LEFT JOIN public.leads l ON l.id = po.lead_id
      WHERE po.id = _opp_id
        AND (
          po.loan_officer_id = auth.uid()
          OR l.assigned_to    = auth.uid()
          OR l.created_by     = auth.uid()
        )
    );
$$;

CREATE POLICY ia_cases_select ON public.income_analysis_cases
  FOR SELECT TO authenticated
  USING (public.user_can_access_opportunity(opportunity_id));
CREATE POLICY ia_cases_insert ON public.income_analysis_cases
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_opportunity(opportunity_id));
CREATE POLICY ia_cases_update ON public.income_analysis_cases
  FOR UPDATE TO authenticated
  USING (public.user_can_access_opportunity(opportunity_id))
  WITH CHECK (public.user_can_access_opportunity(opportunity_id));
CREATE POLICY ia_cases_delete ON public.income_analysis_cases
  FOR DELETE TO authenticated
  USING (public.has_role('admin'::app_role));

-- =========================================================================
-- 2. income_analysis_businesses
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.income_analysis_businesses (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             uuid NOT NULL REFERENCES public.income_analysis_cases(id) ON DELETE CASCADE,
  borrower_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  business_name       text,
  ein                 text,
  entity_type         public.business_entity_type NOT NULL,
  ownership_pct       numeric(6,3),
  business_start_date date,
  months_in_service   integer,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ia_biz_ownership_range CHECK (ownership_pct IS NULL OR (ownership_pct >= 0 AND ownership_pct <= 100))
);
CREATE INDEX IF NOT EXISTS ix_ia_biz_case ON public.income_analysis_businesses(case_id);
CREATE INDEX IF NOT EXISTS ix_ia_biz_contact ON public.income_analysis_businesses(borrower_contact_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_analysis_businesses TO authenticated;
GRANT ALL ON public.income_analysis_businesses TO service_role;
ALTER TABLE public.income_analysis_businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY ia_biz_rw ON public.income_analysis_businesses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.income_analysis_cases c
                  WHERE c.id = case_id AND public.user_can_access_opportunity(c.opportunity_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.income_analysis_cases c
                       WHERE c.id = case_id AND public.user_can_access_opportunity(c.opportunity_id)));

-- =========================================================================
-- 3. income_analysis_tax_years
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.income_analysis_tax_years (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id      uuid NOT NULL REFERENCES public.income_analysis_cases(id) ON DELETE CASCADE,
  business_id  uuid REFERENCES public.income_analysis_businesses(id) ON DELETE CASCADE,
  tax_year     integer NOT NULL,
  is_ytd       boolean NOT NULL DEFAULT false,
  period_end   date,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ia_year_range CHECK (tax_year BETWEEN 2000 AND 2100)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ia_year_case_biz_year
  ON public.income_analysis_tax_years(case_id, COALESCE(business_id, '00000000-0000-0000-0000-000000000000'::uuid), tax_year);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_analysis_tax_years TO authenticated;
GRANT ALL ON public.income_analysis_tax_years TO service_role;
ALTER TABLE public.income_analysis_tax_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY ia_year_rw ON public.income_analysis_tax_years
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.income_analysis_cases c
                  WHERE c.id = case_id AND public.user_can_access_opportunity(c.opportunity_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.income_analysis_cases c
                       WHERE c.id = case_id AND public.user_can_access_opportunity(c.opportunity_id)));

-- =========================================================================
-- 4. income_analysis_documents
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.income_analysis_documents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id        uuid NOT NULL REFERENCES public.income_analysis_cases(id) ON DELETE CASCADE,
  business_id    uuid REFERENCES public.income_analysis_businesses(id) ON DELETE SET NULL,
  attachment_id  uuid REFERENCES public.crm_attachments(id) ON DELETE SET NULL,
  form_code      text,           -- '1040','sch_c','sch_e','sch_f','k1_1065','k1_1120s','1065','1120','1120s','w2','p_and_l','balance_sheet'
  tax_year       integer,
  status         public.income_document_status NOT NULL DEFAULT 'uploaded',
  classification_confidence numeric(5,4),
  detected_borrower_name text,
  detected_business_name text,
  detected_ein           text,
  ai_model        text,
  ai_raw          jsonb NOT NULL DEFAULT '{}'::jsonb,
  error           text,
  uploaded_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_ia_docs_case ON public.income_analysis_documents(case_id);
CREATE INDEX IF NOT EXISTS ix_ia_docs_attachment ON public.income_analysis_documents(attachment_id);
CREATE INDEX IF NOT EXISTS ix_ia_docs_form_year ON public.income_analysis_documents(form_code, tax_year);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_analysis_documents TO authenticated;
GRANT ALL ON public.income_analysis_documents TO service_role;
ALTER TABLE public.income_analysis_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY ia_docs_rw ON public.income_analysis_documents
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.income_analysis_cases c
                  WHERE c.id = case_id AND public.user_can_access_opportunity(c.opportunity_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.income_analysis_cases c
                       WHERE c.id = case_id AND public.user_can_access_opportunity(c.opportunity_id)));

-- =========================================================================
-- 5. income_analysis_extractions  (raw IRS line values — immutable history)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.income_analysis_extractions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       uuid NOT NULL REFERENCES public.income_analysis_cases(id) ON DELETE CASCADE,
  business_id   uuid REFERENCES public.income_analysis_businesses(id) ON DELETE CASCADE,
  document_id   uuid REFERENCES public.income_analysis_documents(id) ON DELETE SET NULL,
  tax_year      integer NOT NULL,
  form_code     text NOT NULL,           -- e.g. 'sch_c'
  line_code     text NOT NULL,           -- e.g. 'line_31','line_13','box_5'
  value_numeric numeric(18,2),
  value_text    text,
  source        text NOT NULL DEFAULT 'ai',   -- 'ai','manual','imported','calculated'
  confidence    numeric(5,4),
  is_current    boolean NOT NULL DEFAULT true,
  entered_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_ia_extr_lookup
  ON public.income_analysis_extractions(case_id, business_id, tax_year, form_code, line_code);
CREATE INDEX IF NOT EXISTS ix_ia_extr_current
  ON public.income_analysis_extractions(case_id, is_current)
  WHERE is_current;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_analysis_extractions TO authenticated;
GRANT ALL ON public.income_analysis_extractions TO service_role;
ALTER TABLE public.income_analysis_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ia_extr_rw ON public.income_analysis_extractions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.income_analysis_cases c
                  WHERE c.id = case_id AND public.user_can_access_opportunity(c.opportunity_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.income_analysis_cases c
                       WHERE c.id = case_id AND public.user_can_access_opportunity(c.opportunity_id)));

-- =========================================================================
-- 6. income_analysis_calculations
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.income_analysis_calculations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id          uuid NOT NULL REFERENCES public.income_analysis_cases(id) ON DELETE CASCADE,
  business_id      uuid REFERENCES public.income_analysis_businesses(id) ON DELETE CASCADE,
  tax_year         integer,
  section_code     text NOT NULL,           -- 'sch_c','sch_e','sch_f','1065','1120s','1120','liquidity','comparative','summary'
  formula_version  text NOT NULL DEFAULT 'all-in-one-2025.v1',
  inputs           jsonb NOT NULL DEFAULT '{}'::jsonb,
  outputs          jsonb NOT NULL DEFAULT '{}'::jsonb,
  subtotal         numeric(18,2),
  computed_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  computed_at      timestamptz NOT NULL DEFAULT now(),
  is_current       boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS ix_ia_calc_lookup
  ON public.income_analysis_calculations(case_id, business_id, tax_year, section_code);
CREATE INDEX IF NOT EXISTS ix_ia_calc_current
  ON public.income_analysis_calculations(case_id, is_current) WHERE is_current;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_analysis_calculations TO authenticated;
GRANT ALL ON public.income_analysis_calculations TO service_role;
ALTER TABLE public.income_analysis_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY ia_calc_rw ON public.income_analysis_calculations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.income_analysis_cases c
                  WHERE c.id = case_id AND public.user_can_access_opportunity(c.opportunity_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.income_analysis_cases c
                       WHERE c.id = case_id AND public.user_can_access_opportunity(c.opportunity_id)));

-- =========================================================================
-- 7. income_analysis_summaries
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.income_analysis_summaries (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                  uuid NOT NULL REFERENCES public.income_analysis_cases(id) ON DELETE CASCADE,
  borrower_contact_id      uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  business_id              uuid REFERENCES public.income_analysis_businesses(id) ON DELETE SET NULL,
  business_name_snapshot   text,
  entity_type_snapshot     public.business_entity_type,
  ownership_pct_snapshot   numeric(6,3),
  year_1                   integer,
  year_2                   integer,
  year_1_income            numeric(18,2),
  year_2_income            numeric(18,2),
  average_annual_income    numeric(18,2),
  average_monthly_income   numeric(18,2),
  trend                    text,             -- 'increasing','stable','declining'
  narrative                text,
  formula_version          text NOT NULL DEFAULT 'all-in-one-2025.v1',
  generated_at             timestamptz NOT NULL DEFAULT now(),
  generated_by             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_ia_sum_case ON public.income_analysis_summaries(case_id);
CREATE INDEX IF NOT EXISTS ix_ia_sum_business ON public.income_analysis_summaries(business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_analysis_summaries TO authenticated;
GRANT ALL ON public.income_analysis_summaries TO service_role;
ALTER TABLE public.income_analysis_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY ia_sum_rw ON public.income_analysis_summaries
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.income_analysis_cases c
                  WHERE c.id = case_id AND public.user_can_access_opportunity(c.opportunity_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.income_analysis_cases c
                       WHERE c.id = case_id AND public.user_can_access_opportunity(c.opportunity_id)));

-- =========================================================================
-- 8. income_analysis_audit_log
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.income_analysis_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     uuid REFERENCES public.income_analysis_cases(id) ON DELETE CASCADE,
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  entity      text,
  entity_id   uuid,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_ia_audit_case ON public.income_analysis_audit_log(case_id, created_at DESC);

GRANT SELECT, INSERT ON public.income_analysis_audit_log TO authenticated;
GRANT ALL ON public.income_analysis_audit_log TO service_role;
ALTER TABLE public.income_analysis_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY ia_audit_select ON public.income_analysis_audit_log
  FOR SELECT TO authenticated
  USING (case_id IS NULL
         OR EXISTS (SELECT 1 FROM public.income_analysis_cases c
                     WHERE c.id = case_id AND public.user_can_access_opportunity(c.opportunity_id)));
CREATE POLICY ia_audit_insert ON public.income_analysis_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (case_id IS NULL
              OR EXISTS (SELECT 1 FROM public.income_analysis_cases c
                          WHERE c.id = case_id AND public.user_can_access_opportunity(c.opportunity_id)));

-- =========================================================================
-- updated_at triggers
-- =========================================================================
CREATE TRIGGER trg_ia_cases_updated     BEFORE UPDATE ON public.income_analysis_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ia_biz_updated       BEFORE UPDATE ON public.income_analysis_businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ia_years_updated     BEFORE UPDATE ON public.income_analysis_tax_years
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ia_docs_updated      BEFORE UPDATE ON public.income_analysis_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ia_sum_updated       BEFORE UPDATE ON public.income_analysis_summaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
