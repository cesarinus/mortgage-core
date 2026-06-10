
-- 1. Field mappings table
CREATE TABLE public.los_field_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration text NOT NULL DEFAULT 'arive',
  crm_field text NOT NULL,
  external_field text NOT NULL,
  required boolean NOT NULL DEFAULT false,
  default_value text,
  data_type text NOT NULL DEFAULT 'string',
  transform text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (integration, crm_field)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.los_field_mappings TO authenticated;
GRANT ALL ON public.los_field_mappings TO service_role;

ALTER TABLE public.los_field_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read mappings"
  ON public.los_field_mappings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage mappings"
  ON public.los_field_mappings FOR ALL
  TO authenticated
  USING (public.has_role('admin'::app_role))
  WITH CHECK (public.has_role('admin'::app_role));

CREATE TRIGGER trg_los_field_mappings_updated
  BEFORE UPDATE ON public.los_field_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. New lead columns (additive, nullable)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lien_position text,
  ADD COLUMN IF NOT EXISTS transaction_type text,
  ADD COLUMN IF NOT EXISTS subject_property_tbd boolean NOT NULL DEFAULT false;

-- 3. Seed provisional ARIVE mappings
INSERT INTO public.los_field_mappings (integration, crm_field, external_field, required, data_type, sort_order) VALUES
  ('arive','first_name','firstName',true,'string',10),
  ('arive','last_name','lastName',true,'string',20),
  ('arive','email','email',true,'email',30),
  ('arive','phone','phone',true,'phone',40),
  ('arive','property_address','propertyAddress',false,'string',50),
  ('arive','property_city','city',false,'string',60),
  ('arive','property_state','state',false,'string',70),
  ('arive','property_zip','zip',false,'zip',80),
  ('arive','property_type','propertyType',false,'string',90),
  ('arive','loan_purpose','loanPurpose',true,'string',100),
  ('arive','loan_amount','loanAmount',true,'money',110),
  ('arive','property_value','purchasePrice',false,'money',120),
  ('arive','occupancy_type','occupancyType',false,'string',130),
  ('arive','loan_officer_name','loanOfficerName',false,'string',140),
  ('arive','loan_officer_email','loanOfficerEmail',false,'email',150),
  ('arive','lien_position','lienPosition',false,'string',160),
  ('arive','transaction_type','transactionType',false,'string',170)
ON CONFLICT (integration, crm_field) DO NOTHING;
