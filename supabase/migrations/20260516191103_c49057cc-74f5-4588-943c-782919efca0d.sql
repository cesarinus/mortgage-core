ALTER TABLE public.loan_scenarios
  ADD COLUMN IF NOT EXISTS loan_term_years integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS interest_rate numeric,
  ADD COLUMN IF NOT EXISTS rate_source text DEFAULT 'mnd_live';