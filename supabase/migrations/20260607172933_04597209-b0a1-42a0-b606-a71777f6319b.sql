
ALTER TABLE public.borrower_payment_details
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;

ALTER TABLE public.borrower_income_calculations
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS borrower_name text;

CREATE INDEX IF NOT EXISTS idx_payment_details_lead_contact
  ON public.borrower_payment_details (lead_id, contact_id);

CREATE INDEX IF NOT EXISTS idx_income_calc_lead_contact
  ON public.borrower_income_calculations (lead_id, contact_id);
