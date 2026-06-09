
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS sent_to_los_at timestamptz;
ALTER TABLE public.pipeline_opportunities ADD COLUMN IF NOT EXISTS arive_loan_id text;
CREATE INDEX IF NOT EXISTS idx_pipeline_opp_arive_loan_id ON public.pipeline_opportunities(arive_loan_id);

CREATE TABLE IF NOT EXISTS public.los_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.pipeline_opportunities(id) ON DELETE SET NULL,
  arive_loan_id text UNIQUE,
  loan_status text,
  purchase_price numeric,
  loan_amount numeric,
  interest_rate numeric,
  loan_program text,
  estimated_close_date date,
  du_findings text,
  conditions jsonb,
  raw jsonb,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.los_loans TO authenticated;
GRANT ALL ON public.los_loans TO service_role;

ALTER TABLE public.los_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lead owners read los_loans" ON public.los_loans
  FOR SELECT USING (public.user_owns_lead(lead_id));
CREATE POLICY "Admins all los_loans" ON public.los_loans
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_los_loans_lead ON public.los_loans(lead_id);
CREATE INDEX IF NOT EXISTS idx_los_loans_deal ON public.los_loans(deal_id);

CREATE TRIGGER los_loans_set_updated_at BEFORE UPDATE ON public.los_loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
