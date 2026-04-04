ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS loan_purpose text,
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS property_value numeric,
  ADD COLUMN IF NOT EXISTS credit_range text,
  ADD COLUMN IF NOT EXISTS employment_type text,
  ADD COLUMN IF NOT EXISTS annual_income numeric,
  ADD COLUMN IF NOT EXISTS timeline text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';