ALTER TABLE public.crm_layout_templates
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'module_only';

ALTER TABLE public.crm_layout_templates
  DROP CONSTRAINT IF EXISTS crm_layout_templates_scope_chk;
ALTER TABLE public.crm_layout_templates
  ADD CONSTRAINT crm_layout_templates_scope_chk
  CHECK (scope IN ('module_only','applicant_shared'));

UPDATE public.crm_layout_templates t
SET scope = 'applicant_shared'
FROM public.crm_modules m
WHERE m.id = t.module_id
  AND m.slug IN ('borrowers','co_borrowers')
  AND t.scope = 'module_only';