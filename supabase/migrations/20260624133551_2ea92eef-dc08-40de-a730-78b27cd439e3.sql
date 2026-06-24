-- =========================================================================
-- Stage C — Migrate `deals` rows into `pipeline_opportunities`
-- Plan: .lovable/plan.md
-- Idempotent + additive. Originals retained for full rollback.
-- =========================================================================

-- C.0 Mapping table (provenance + rollback aid)
CREATE TABLE IF NOT EXISTS public.deal_to_opportunity (
  deal_id        uuid PRIMARY KEY REFERENCES public.deals(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL UNIQUE REFERENCES public.pipeline_opportunities(id) ON DELETE CASCADE,
  migrated_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_to_opportunity TO authenticated;
GRANT ALL                            ON public.deal_to_opportunity TO service_role;

ALTER TABLE public.deal_to_opportunity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage deal_to_opportunity" ON public.deal_to_opportunity;
CREATE POLICY "Admins manage deal_to_opportunity"
  ON public.deal_to_opportunity FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Owners read deal_to_opportunity" ON public.deal_to_opportunity;
CREATE POLICY "Owners read deal_to_opportunity"
  ON public.deal_to_opportunity FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_to_opportunity.deal_id
        AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid())
    )
  );

-- C.1 Insert one Opportunity per un-migrated Deal.
-- lead_id is derived via contact -> person -> lead; null when unresolved (allowed since Stage A).
WITH unmigrated AS (
  SELECT d.*
  FROM public.deals d
  LEFT JOIN public.deal_to_opportunity m ON m.deal_id = d.id
  LEFT JOIN public.pipeline_opportunities po ON po.legacy_deal_id = d.id
  WHERE m.deal_id IS NULL AND po.id IS NULL
),
resolved AS (
  SELECT
    u.*,
    (
      SELECT l.id
      FROM public.contacts c
      JOIN public.leads l ON l.person_id = c.person_id
      WHERE c.id = u.contact_id
      ORDER BY l.created_at
      LIMIT 1
    ) AS derived_lead_id
  FROM unmigrated u
),
inserted AS (
  INSERT INTO public.pipeline_opportunities (
    lead_id, contact_id, loan_officer_id, created_by,
    loan_amount, loan_type, property_address, notes,
    stage, lifecycle_stage,
    legacy_deal_id, source_system,
    created_at, updated_at
  )
  SELECT
    r.derived_lead_id,
    r.contact_id,
    r.loan_officer_id,
    r.created_by,
    r.loan_amount,
    r.loan_type,
    r.property_address,
    r.notes,
    r.stage::text,
    public.map_legacy_stage(r.stage::text),
    r.id,
    'deal_migrated',
    r.created_at,
    r.updated_at
  FROM resolved r
  RETURNING id AS opportunity_id, legacy_deal_id AS deal_id
)
INSERT INTO public.deal_to_opportunity (deal_id, opportunity_id)
SELECT deal_id, opportunity_id FROM inserted
ON CONFLICT (deal_id) DO NOTHING;

-- C.2 Add `opportunity_id` to child tables that only had `deal_id` (additive).
ALTER TABLE public.crm_activities
  ADD COLUMN IF NOT EXISTS opportunity_id uuid
    REFERENCES public.pipeline_opportunities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_crm_activities_opportunity_id ON public.crm_activities(opportunity_id);

ALTER TABLE public.crm_attachments
  ADD COLUMN IF NOT EXISTS opportunity_id uuid
    REFERENCES public.pipeline_opportunities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_crm_attachments_opportunity_id ON public.crm_attachments(opportunity_id);

ALTER TABLE public.deal_stage_history
  ADD COLUMN IF NOT EXISTS opportunity_id uuid
    REFERENCES public.pipeline_opportunities(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_deal_stage_history_opportunity_id ON public.deal_stage_history(opportunity_id);

ALTER TABLE public.deal_events
  ADD COLUMN IF NOT EXISTS opportunity_id uuid
    REFERENCES public.pipeline_opportunities(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_deal_events_opportunity_id ON public.deal_events(opportunity_id);

ALTER TABLE public.income_document_extractions
  ADD COLUMN IF NOT EXISTS opportunity_id uuid
    REFERENCES public.pipeline_opportunities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_income_doc_extractions_opportunity_id ON public.income_document_extractions(opportunity_id);

-- C.3 Backfill `opportunity_id` on every dual-keyed child where it's missing.
UPDATE public.tasks t
   SET opportunity_id = m.opportunity_id
  FROM public.deal_to_opportunity m
 WHERE t.deal_id = m.deal_id AND t.opportunity_id IS NULL;

UPDATE public.timeline_events t
   SET opportunity_id = m.opportunity_id
  FROM public.deal_to_opportunity m
 WHERE t.deal_id = m.deal_id AND t.opportunity_id IS NULL;

UPDATE public.mortgage_snapshots t
   SET opportunity_id = m.opportunity_id
  FROM public.deal_to_opportunity m
 WHERE t.deal_id = m.deal_id AND t.opportunity_id IS NULL;

UPDATE public.crm_activities t
   SET opportunity_id = m.opportunity_id
  FROM public.deal_to_opportunity m
 WHERE t.deal_id = m.deal_id AND t.opportunity_id IS NULL;

UPDATE public.crm_attachments t
   SET opportunity_id = m.opportunity_id
  FROM public.deal_to_opportunity m
 WHERE t.deal_id = m.deal_id AND t.opportunity_id IS NULL;

UPDATE public.deal_stage_history t
   SET opportunity_id = m.opportunity_id
  FROM public.deal_to_opportunity m
 WHERE t.deal_id = m.deal_id AND t.opportunity_id IS NULL;

UPDATE public.deal_events t
   SET opportunity_id = m.opportunity_id
  FROM public.deal_to_opportunity m
 WHERE t.deal_id = m.deal_id AND t.opportunity_id IS NULL;

UPDATE public.income_document_extractions t
   SET opportunity_id = m.opportunity_id
  FROM public.deal_to_opportunity m
 WHERE t.deal_id = m.deal_id AND t.opportunity_id IS NULL;

-- C.4 Remap any crm_field_values rows from record_type='deals' to 'opportunities'.
-- (currently 0 rows; the UPDATE is a no-op but stays for future runs.)
UPDATE public.crm_field_values v
   SET record_type = 'opportunities',
       record_id   = m.opportunity_id
  FROM public.deal_to_opportunity m
 WHERE v.record_type = 'deals' AND v.record_id = m.deal_id;

COMMENT ON TABLE public.deal_to_opportunity IS
  'Stage C provenance map. One row per Deal migrated into pipeline_opportunities. Used by the Stage D compatibility view and by Stage G rollback.';
