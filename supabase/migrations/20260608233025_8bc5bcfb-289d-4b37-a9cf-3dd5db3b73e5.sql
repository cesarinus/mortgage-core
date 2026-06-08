
-- 1. Gate column on income calculations
ALTER TABLE public.borrower_income_calculations
  ADD COLUMN IF NOT EXISTS shared_with_borrower boolean NOT NULL DEFAULT false;

-- 2. Enums for the new extractions table
DO $$ BEGIN
  CREATE TYPE public.income_doc_type AS ENUM ('pay_stub','w2','form_1099','form_1040','business_return','unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.income_extraction_status AS ENUM ('pending','applied','dismissed','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Extractions table
CREATE TABLE IF NOT EXISTS public.income_document_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id uuid NOT NULL REFERENCES public.crm_attachments(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  doc_type public.income_doc_type NOT NULL DEFAULT 'unknown',
  tax_year integer,
  period_ending_date date,
  extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric,
  status public.income_extraction_status NOT NULL DEFAULT 'pending',
  error text,
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz,
  applied_by uuid
);

CREATE INDEX IF NOT EXISTS idx_income_extractions_lead ON public.income_document_extractions(lead_id);
CREATE INDEX IF NOT EXISTS idx_income_extractions_attachment ON public.income_document_extractions(attachment_id);

GRANT SELECT, UPDATE ON public.income_document_extractions TO authenticated;
GRANT ALL ON public.income_document_extractions TO service_role;

ALTER TABLE public.income_document_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners read extractions"
  ON public.income_document_extractions FOR SELECT
  TO authenticated
  USING (lead_id IS NOT NULL AND public.user_owns_lead(lead_id));

CREATE POLICY "admins all extractions"
  ON public.income_document_extractions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "owners update extractions"
  ON public.income_document_extractions FOR UPDATE
  TO authenticated
  USING (lead_id IS NOT NULL AND public.user_owns_lead(lead_id))
  WITH CHECK (lead_id IS NOT NULL AND public.user_owns_lead(lead_id));

CREATE TRIGGER trg_income_extractions_updated_at
  BEFORE UPDATE ON public.income_document_extractions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
