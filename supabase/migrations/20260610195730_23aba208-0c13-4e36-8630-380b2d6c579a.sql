
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS refinance_type text,
  ADD COLUMN IF NOT EXISTS cash_out_purpose text;

UPDATE public.crm_field_options
SET label = 'Debt Consolidation'
WHERE field_id = '60676aa1-d127-4454-9d74-85fbb6d70eab'
  AND value = 'DebtConsolidation';
