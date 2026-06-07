
-- ============================================
-- loan_conditions
-- ============================================
CREATE TABLE IF NOT EXISTS public.loan_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  pipeline_opportunity_id uuid REFERENCES public.pipeline_opportunities(id) ON DELETE SET NULL,
  condition_type text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  description text,
  required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending',
  received_at timestamptz,
  received_via text,
  document_url text,
  document_name text,
  notes text,
  source text NOT NULL DEFAULT 'manual',
  ocr_status text NOT NULL DEFAULT 'none',
  ocr_raw jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loan_conditions_lead ON public.loan_conditions(lead_id);
CREATE INDEX IF NOT EXISTS idx_loan_conditions_pipeline ON public.loan_conditions(pipeline_opportunity_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_conditions TO authenticated;
GRANT ALL ON public.loan_conditions TO service_role;

ALTER TABLE public.loan_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all loan_conditions"
  ON public.loan_conditions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "owners read loan_conditions"
  ON public.loan_conditions FOR SELECT TO authenticated
  USING (public.user_owns_lead(lead_id));

CREATE POLICY "owners insert loan_conditions"
  ON public.loan_conditions FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_lead(lead_id));

CREATE POLICY "owners update loan_conditions"
  ON public.loan_conditions FOR UPDATE TO authenticated
  USING (public.user_owns_lead(lead_id))
  WITH CHECK (public.user_owns_lead(lead_id));

CREATE POLICY "owners delete loan_conditions"
  ON public.loan_conditions FOR DELETE TO authenticated
  USING (public.user_owns_lead(lead_id));

CREATE TRIGGER trg_loan_conditions_updated_at
  BEFORE UPDATE ON public.loan_conditions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- borrower_income_calculations
-- ============================================
CREATE TABLE IF NOT EXISTS public.borrower_income_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  borrower_type text NOT NULL,
  calculation_date timestamptz NOT NULL DEFAULT now(),
  monthly_income numeric,
  annual_income numeric,
  base_income numeric,
  overtime numeric DEFAULT 0,
  bonus numeric DEFAULT 0,
  commission numeric DEFAULT 0,
  self_employment_income numeric DEFAULT 0,
  other_income numeric DEFAULT 0,
  income_breakdown jsonb,
  source text NOT NULL DEFAULT 'manual',
  supporting_doc_ids uuid[],
  calculated_by text NOT NULL DEFAULT 'system',
  ocr_log jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_income_calc_lead ON public.borrower_income_calculations(lead_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.borrower_income_calculations TO authenticated;
GRANT ALL ON public.borrower_income_calculations TO service_role;

ALTER TABLE public.borrower_income_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all income_calc"
  ON public.borrower_income_calculations FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "owners read income_calc"
  ON public.borrower_income_calculations FOR SELECT TO authenticated
  USING (public.user_owns_lead(lead_id));

CREATE POLICY "owners insert income_calc"
  ON public.borrower_income_calculations FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_lead(lead_id));

CREATE POLICY "owners update income_calc"
  ON public.borrower_income_calculations FOR UPDATE TO authenticated
  USING (public.user_owns_lead(lead_id))
  WITH CHECK (public.user_owns_lead(lead_id));

CREATE POLICY "owners delete income_calc"
  ON public.borrower_income_calculations FOR DELETE TO authenticated
  USING (public.user_owns_lead(lead_id));

CREATE POLICY "portal borrower reads income_calc"
  ON public.borrower_income_calculations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pipeline_opportunities po
      JOIN public.portal_users pu ON pu.deal_id = po.id
      WHERE po.lead_id = borrower_income_calculations.lead_id
        AND pu.user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_income_calc_updated_at
  BEFORE UPDATE ON public.borrower_income_calculations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Auto-seed trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.seed_loan_conditions_on_pipeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stage = 'application_sent' AND (OLD.stage IS DISTINCT FROM NEW.stage) THEN
    -- avoid duplicate seeding
    IF NOT EXISTS (SELECT 1 FROM public.loan_conditions WHERE pipeline_opportunity_id = NEW.id) THEN
      INSERT INTO public.loan_conditions (lead_id, pipeline_opportunity_id, condition_type, category, title, description, required)
      SELECT NEW.lead_id, NEW.id, condition_type, category, title, description, required
      FROM (
        VALUES
          ('tax_return', 'income', 'Last 2 Years Personal Tax Returns', 'All schedules including W-2s if applicable', true),
          ('tax_return_corporate', 'income', 'Last 2 Years Corporate Tax Returns (if self-employed)', '1120 or Schedule C with all schedules', true),
          ('w2', 'income', 'Last 2 Years W-2s', 'All employer-issued W-2 forms', true),
          ('1099', 'income', 'Last 2 Years 1099s', 'All 1099-MISC/NEC/DIV/int', true),
          ('pay_stubs', 'income', 'Recent Pay Stubs', 'Last 2 months (bi-weekly), 4 (weekly), 1 (monthly)', true),
          ('ssa_award_letter', 'income', 'SSA Award Letter', 'If Social Security is used as income', false),
          ('child_support', 'income', 'Child Support Documentation', 'If child support is used as income', false),
          ('bank_statements', 'asset', 'Last 2 Months Bank Statements', 'All accounts', true),
          ('id_document', 'id', 'Government-Issued Photo ID', 'Driver license, US passport, green card', true),
          ('ssn_document', 'id', 'SSN Card or Citizenship Proof', 'SSN card or naturalization certificate', true)
      ) AS t(condition_type, category, title, description, required);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_loan_conditions ON public.pipeline_opportunities;
CREATE TRIGGER trg_seed_loan_conditions
  AFTER UPDATE OF stage ON public.pipeline_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.seed_loan_conditions_on_pipeline();

-- Also seed on INSERT when created in application_sent (default stage)
CREATE OR REPLACE FUNCTION public.seed_loan_conditions_on_pipeline_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stage = 'application_sent' THEN
    IF NOT EXISTS (SELECT 1 FROM public.loan_conditions WHERE pipeline_opportunity_id = NEW.id) THEN
      INSERT INTO public.loan_conditions (lead_id, pipeline_opportunity_id, condition_type, category, title, description, required)
      SELECT NEW.lead_id, NEW.id, condition_type, category, title, description, required
      FROM (
        VALUES
          ('tax_return', 'income', 'Last 2 Years Personal Tax Returns', 'All schedules including W-2s if applicable', true),
          ('tax_return_corporate', 'income', 'Last 2 Years Corporate Tax Returns (if self-employed)', '1120 or Schedule C with all schedules', true),
          ('w2', 'income', 'Last 2 Years W-2s', 'All employer-issued W-2 forms', true),
          ('1099', 'income', 'Last 2 Years 1099s', 'All 1099-MISC/NEC/DIV/int', true),
          ('pay_stubs', 'income', 'Recent Pay Stubs', 'Last 2 months (bi-weekly), 4 (weekly), 1 (monthly)', true),
          ('ssa_award_letter', 'income', 'SSA Award Letter', 'If Social Security is used as income', false),
          ('child_support', 'income', 'Child Support Documentation', 'If child support is used as income', false),
          ('bank_statements', 'asset', 'Last 2 Months Bank Statements', 'All accounts', true),
          ('id_document', 'id', 'Government-Issued Photo ID', 'Driver license, US passport, green card', true),
          ('ssn_document', 'id', 'SSN Card or Citizenship Proof', 'SSN card or naturalization certificate', true)
      ) AS t(condition_type, category, title, description, required);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_loan_conditions_insert ON public.pipeline_opportunities;
CREATE TRIGGER trg_seed_loan_conditions_insert
  AFTER INSERT ON public.pipeline_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.seed_loan_conditions_on_pipeline_insert();
