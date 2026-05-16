ALTER TABLE public.loan_scenarios
  ADD COLUMN IF NOT EXISTS buydown_mode          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS points_budget         numeric,
  ADD COLUMN IF NOT EXISTS points_purchasable    numeric,
  ADD COLUMN IF NOT EXISTS rate_reduction_pct    numeric,
  ADD COLUMN IF NOT EXISTS reduction_per_point   numeric DEFAULT 0.25,
  ADD COLUMN IF NOT EXISTS bought_down_rate      numeric,
  ADD COLUMN IF NOT EXISTS breakeven_vs_a_months integer,
  ADD COLUMN IF NOT EXISTS breakeven_vs_b_months integer;