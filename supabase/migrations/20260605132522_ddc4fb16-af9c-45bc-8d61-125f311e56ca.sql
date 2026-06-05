
-- ============================================================
-- Twenty CRM additive extension (no renames, no drops)
-- ============================================================

-- Enums (idempotent)
DO $$ BEGIN
  CREATE TYPE public.company_type AS ENUM
    ('lender','title_company','insurance_agency','real_estate_brokerage','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.contact_role AS ENUM
    ('lead','borrower','co_borrower','real_estate_agent','title_agent',
     'insurance_agent','referral_partner','internal_staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.role_on_deal AS ENUM
    ('primary_borrower','co_borrower','real_estate_agent','title_agent',
     'insurance_agent','referral_partner','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- crm_companies extensions
ALTER TABLE public.crm_companies
  ADD COLUMN IF NOT EXISTS company_type public.company_type NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS notes text;

-- contacts extensions (project's "crm_contacts" == public.contacts)
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role public.contact_role,
  ADD COLUMN IF NOT EXISTS lead_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS temperature text;

CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON public.contacts(company_id);

-- leads extensions
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS co_borrower_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_company_id ON public.leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_co_borrower_id ON public.leads(co_borrower_id);

-- lead_contacts extensions
ALTER TABLE public.lead_contacts
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role_on_deal public.role_on_deal,
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_lead_contacts_company_id ON public.lead_contacts(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_contacts_primary_per_lead
  ON public.lead_contacts(lead_id) WHERE is_primary = true;
