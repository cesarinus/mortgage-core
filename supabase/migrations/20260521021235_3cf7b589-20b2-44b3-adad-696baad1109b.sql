
-- Borrower type enum
DO $$ BEGIN
  CREATE TYPE public.borrower_employment_type AS ENUM ('employee', 'self_employed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.financial_statement_type AS ENUM ('pnl', 'balance_sheet', 'cash_flow', 'combined');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Self-employed / borrower financial profile per deal
CREATE TABLE IF NOT EXISTS public.self_employed_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL UNIQUE,
  contact_id uuid,
  borrower_type public.borrower_employment_type NOT NULL DEFAULT 'employee',
  business_name text,
  tax_id text,
  business_type text,
  -- Editable line items: array of { section, category, label, amount }
  -- section in: income, expense, asset_current, asset_fixed, liability_current, liability_long, equity
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  period_start date,
  period_end date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.self_employed_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all self_employed_profiles"
  ON public.self_employed_profiles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "deal owners read self_employed_profiles"
  ON public.self_employed_profiles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = self_employed_profiles.deal_id
      AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid())
  ));

CREATE POLICY "deal owners insert self_employed_profiles"
  ON public.self_employed_profiles FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = self_employed_profiles.deal_id
        AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid())
    )
  );

CREATE POLICY "deal owners update self_employed_profiles"
  ON public.self_employed_profiles FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = self_employed_profiles.deal_id
      AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid())
  ));

CREATE POLICY "deal owners delete self_employed_profiles"
  ON public.self_employed_profiles FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = self_employed_profiles.deal_id
      AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid())
  ));

CREATE TRIGGER trg_sep_updated_at
  BEFORE UPDATE ON public.self_employed_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_sep_deal_id ON public.self_employed_profiles(deal_id);
CREATE INDEX IF NOT EXISTS idx_sep_contact_id ON public.self_employed_profiles(contact_id);

-- Generated financial statement snapshots
CREATE TABLE IF NOT EXISTS public.financial_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  contact_id uuid,
  statement_type public.financial_statement_type NOT NULL,
  period_start date,
  period_end date,
  json_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_url text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all financial_statements"
  ON public.financial_statements FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "deal owners read financial_statements"
  ON public.financial_statements FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = financial_statements.deal_id
      AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid())
  ));

CREATE POLICY "deal owners insert financial_statements"
  ON public.financial_statements FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = financial_statements.deal_id
        AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid())
    )
  );

CREATE POLICY "deal owners delete financial_statements"
  ON public.financial_statements FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = financial_statements.deal_id
      AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid())
  ));

CREATE INDEX IF NOT EXISTS idx_fs_deal_id ON public.financial_statements(deal_id);
CREATE INDEX IF NOT EXISTS idx_fs_type ON public.financial_statements(statement_type);
