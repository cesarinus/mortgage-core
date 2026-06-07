
-- Extend existing calc table
ALTER TABLE public.borrower_income_calculations
  ADD COLUMN IF NOT EXISTS years_average numeric,
  ADD COLUMN IF NOT EXISTS ocr_status text NOT NULL DEFAULT 'none';

-- New table: payment details
CREATE TABLE IF NOT EXISTS public.borrower_payment_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  borrower_type text NOT NULL DEFAULT 'employed',
  pay_period_type text NOT NULL DEFAULT 'biweekly',
  pay_stub_ending_date date,
  pay_stub_period_days int,
  pay_stub_gross_base numeric DEFAULT 0,
  pay_stub_overtime numeric DEFAULT 0,
  pay_stub_bonus numeric DEFAULT 0,
  pay_stub_commission numeric DEFAULT 0,
  pay_stub_period_start date,
  pay_stub_period_end date,
  w2_year_1 int,
  w2_year_1_wages numeric,
  w2_year_2 int,
  w2_year_2_wages numeric,
  ytd_base numeric DEFAULT 0,
  ytd_overtime numeric DEFAULT 0,
  ytd_bonus numeric DEFAULT 0,
  ytd_commission numeric DEFAULT 0,
  ytd_total numeric DEFAULT 0,
  ytd_as_of_date date,
  se_avg_monthly_net numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_details_lead ON public.borrower_payment_details(lead_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.borrower_payment_details TO authenticated;
GRANT ALL ON public.borrower_payment_details TO service_role;

ALTER TABLE public.borrower_payment_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all payment_details" ON public.borrower_payment_details
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "owners read payment_details" ON public.borrower_payment_details
  FOR SELECT TO authenticated USING (user_owns_lead(lead_id));

CREATE POLICY "owners insert payment_details" ON public.borrower_payment_details
  FOR INSERT TO authenticated WITH CHECK (user_owns_lead(lead_id));

CREATE POLICY "owners update payment_details" ON public.borrower_payment_details
  FOR UPDATE TO authenticated USING (user_owns_lead(lead_id)) WITH CHECK (user_owns_lead(lead_id));

CREATE POLICY "owners delete payment_details" ON public.borrower_payment_details
  FOR DELETE TO authenticated USING (user_owns_lead(lead_id));

CREATE POLICY "portal borrower reads payment_details" ON public.borrower_payment_details
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.pipeline_opportunities po
      JOIN public.portal_users pu ON pu.deal_id = po.id
      WHERE po.lead_id = borrower_payment_details.lead_id
        AND pu.user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_payment_details_updated_at
  BEFORE UPDATE ON public.borrower_payment_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: notify on income condition flipping to received
CREATE OR REPLACE FUNCTION public.notify_income_condition_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.category = 'income' AND NEW.status = 'received' AND (OLD.status IS DISTINCT FROM 'received') THEN
    PERFORM pg_notify('income_condition_received', NEW.lead_id::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_income_condition_received ON public.loan_conditions;
CREATE TRIGGER trg_notify_income_condition_received
  AFTER UPDATE OF status ON public.loan_conditions
  FOR EACH ROW EXECUTE FUNCTION public.notify_income_condition_received();
