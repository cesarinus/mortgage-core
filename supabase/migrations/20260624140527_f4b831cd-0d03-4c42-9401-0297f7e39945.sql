
-- Phase G2: Canonical Opportunity Schema Extension
ALTER TABLE public.pipeline_opportunities
  ADD COLUMN IF NOT EXISTS transaction_type text,
  ADD COLUMN IF NOT EXISTS loan_program text,
  ADD COLUMN IF NOT EXISTS occupancy_type text,
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS property_use text,
  ADD COLUMN IF NOT EXISTS subject_property_value numeric,
  ADD COLUMN IF NOT EXISTS purchase_price numeric,
  ADD COLUMN IF NOT EXISTS down_payment numeric,
  ADD COLUMN IF NOT EXISTS ltv numeric,
  ADD COLUMN IF NOT EXISTS cltv numeric,
  ADD COLUMN IF NOT EXISTS dti numeric,
  ADD COLUMN IF NOT EXISTS lock_status text,
  ADD COLUMN IF NOT EXISTS lock_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS rate_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS los_loan_number text,
  ADD COLUMN IF NOT EXISTS los_status text,
  ADD COLUMN IF NOT EXISTS los_last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS funded_at timestamptz,
  ADD COLUMN IF NOT EXISTS lost_reason text,
  ADD COLUMN IF NOT EXISTS lost_at timestamptz,
  ADD COLUMN IF NOT EXISTS health_score integer,
  ADD COLUMN IF NOT EXISTS health_calculated_at timestamptz;

-- G4: canonical flag on entity_registry (additive column + tag rows)
ALTER TABLE public.entity_registry
  ADD COLUMN IF NOT EXISTS canonical boolean NOT NULL DEFAULT false;

UPDATE public.entity_registry SET canonical = true
  WHERE table_name = 'pipeline_opportunities';
UPDATE public.entity_registry SET canonical = false
  WHERE table_name = 'deals_legacy';

-- Ensure a registry row exists for deals_legacy so the flag is queryable
INSERT INTO public.entity_registry (entity_key, table_name, display_name, owner_module, is_active, canonical)
SELECT 'deal_legacy', 'deals_legacy', 'Deal (Legacy)', 'mortgage_core', true, false
WHERE NOT EXISTS (SELECT 1 FROM public.entity_registry WHERE table_name = 'deals_legacy');
