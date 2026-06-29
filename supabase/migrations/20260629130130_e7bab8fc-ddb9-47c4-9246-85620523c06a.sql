ALTER TABLE public.self_employed_profiles
  ADD COLUMN IF NOT EXISTS manual_worksheet jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS income_source_mode text NOT NULL DEFAULT 'upload' CHECK (income_source_mode IN ('upload','manual'));