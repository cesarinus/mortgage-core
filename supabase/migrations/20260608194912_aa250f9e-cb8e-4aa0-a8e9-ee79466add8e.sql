ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS middle_name text,
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS dob date;

ALTER TABLE public.crm_companies
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS license_number text;