ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS borrower_type public.borrower_employment_type NOT NULL DEFAULT 'employee';

COMMENT ON COLUMN public.contacts.borrower_type IS 'Borrower income classification used by CRM income analysis and borrower portal display.';