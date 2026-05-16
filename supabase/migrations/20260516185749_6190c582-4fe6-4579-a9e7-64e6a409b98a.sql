
CREATE TABLE public.loan_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Option A',
  sublabel text,
  purchase_price numeric,
  property_address text,
  down_payment_amt numeric,
  down_payment_pct numeric,
  loan_amount numeric,
  ltv numeric,
  mortgage_type text,
  lien_position text,
  pi numeric DEFAULT 0,
  hoi numeric DEFAULT 166.67,
  supplemental numeric DEFAULT 47.67,
  property_taxes numeric DEFAULT 240.75,
  mi numeric DEFAULT 0,
  dues numeric DEFAULT 0,
  other_amount numeric DEFAULT 0,
  other_label text,
  total_piti numeric DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_loan_scenarios_lead_id ON public.loan_scenarios(lead_id);

ALTER TABLE public.loan_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all loan_scenarios"
  ON public.loan_scenarios
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "owners read loan_scenarios"
  ON public.loan_scenarios
  FOR SELECT TO authenticated
  USING (user_owns_lead(lead_id));

CREATE POLICY "owners insert loan_scenarios"
  ON public.loan_scenarios
  FOR INSERT TO authenticated
  WITH CHECK (user_owns_lead(lead_id) AND created_by = auth.uid());

CREATE POLICY "owners update loan_scenarios"
  ON public.loan_scenarios
  FOR UPDATE TO authenticated
  USING (user_owns_lead(lead_id));

CREATE POLICY "owners delete loan_scenarios"
  ON public.loan_scenarios
  FOR DELETE TO authenticated
  USING (user_owns_lead(lead_id) OR created_by = auth.uid());

CREATE TRIGGER trg_loan_scenarios_updated_at
  BEFORE UPDATE ON public.loan_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
