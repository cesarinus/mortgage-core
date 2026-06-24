-- =========================================================================
-- Stage A — Extend pipeline_opportunities (additive only, fully reversible)
-- Plan: .lovable/plan.md
-- Rollback: see /mnt/documents/lifecycle-consolidation/A_rollback.sql
-- =========================================================================

-- A.1 Add columns needed to absorb `deals` rows without losing data.
ALTER TABLE public.pipeline_opportunities
  ADD COLUMN IF NOT EXISTS contact_id      uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS loan_officer_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS loan_type       text,
  ADD COLUMN IF NOT EXISTS name            text,
  ADD COLUMN IF NOT EXISTS legacy_deal_id  uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS source_system   text NOT NULL DEFAULT 'opportunity'
    CHECK (source_system IN ('opportunity','deal_migrated'));

CREATE INDEX IF NOT EXISTS idx_pipeline_opp_contact_id      ON public.pipeline_opportunities(contact_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_opp_loan_officer_id ON public.pipeline_opportunities(loan_officer_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_opp_legacy_deal_id  ON public.pipeline_opportunities(legacy_deal_id);

-- A.2 Relax lead_id NOT NULL + UNIQUE.
-- One migrated deal has no resolvable lead; one lead already has both an opportunity
-- and a deal to migrate. Long-term mortgage CRM supports multiple opportunities per lead.
ALTER TABLE public.pipeline_opportunities ALTER COLUMN lead_id DROP NOT NULL;
ALTER TABLE public.pipeline_opportunities DROP CONSTRAINT IF EXISTS pipeline_opportunities_lead_id_key;
-- Keep the btree index for lookup performance (already exists as pipeline_opportunities_lead_idx).

-- A.3 Relax the stage CHECK to accept legacy deal stages during the
-- compatibility window. Canonical stage lives in `lifecycle_stage` (added Stage B).
ALTER TABLE public.pipeline_opportunities DROP CONSTRAINT IF EXISTS pipeline_opportunities_stage_chk;
ALTER TABLE public.pipeline_opportunities
  ADD CONSTRAINT pipeline_opportunities_stage_chk
  CHECK (stage IN (
    -- canonical pipeline values (pre-existing)
    'application_sent','underwriting','approved','clear_to_close','closed','lost',
    -- legacy deal_stage values preserved for migrated rows
    'new_lead','contacted','application_started'
  ));

-- A.4 Extend RLS to mirror the ownership paths `deals` exposes today,
-- so migrated rows remain visible to their original LO / creator / portal user
-- without breaking the existing lead-owner policies.

-- View
DROP POLICY IF EXISTS "Owners read opportunities (extended)" ON public.pipeline_opportunities;
CREATE POLICY "Owners read opportunities (extended)"
  ON public.pipeline_opportunities FOR SELECT TO authenticated
  USING (
    (lead_id IS NOT NULL AND public.user_owns_lead(lead_id))
    OR loan_officer_id = auth.uid()
    OR created_by      = auth.uid()
    OR (contact_id IS NOT NULL AND public.user_owns_contact(contact_id))
    OR public.is_admin()
    OR (legacy_deal_id IS NOT NULL AND public.is_portal_user_for_deal(legacy_deal_id))
  );

-- Update
DROP POLICY IF EXISTS "Owners update opportunities (extended)" ON public.pipeline_opportunities;
CREATE POLICY "Owners update opportunities (extended)"
  ON public.pipeline_opportunities FOR UPDATE TO authenticated
  USING (
    (lead_id IS NOT NULL AND public.user_owns_lead(lead_id))
    OR loan_officer_id = auth.uid()
    OR created_by      = auth.uid()
    OR public.is_admin()
  );

-- Delete
DROP POLICY IF EXISTS "Owners delete opportunities (extended)" ON public.pipeline_opportunities;
CREATE POLICY "Owners delete opportunities (extended)"
  ON public.pipeline_opportunities FOR DELETE TO authenticated
  USING (
    (lead_id IS NOT NULL AND public.user_owns_lead(lead_id))
    OR loan_officer_id = auth.uid()
    OR created_by      = auth.uid()
    OR public.is_admin()
  );

-- A.5 Re-affirm grants (no-op if already present, satisfies platform rule).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_opportunities TO authenticated;
GRANT ALL                            ON public.pipeline_opportunities TO service_role;

-- A.6 Document the canonical decision in the table comment.
COMMENT ON TABLE public.pipeline_opportunities IS
  'Canonical mortgage Opportunity entity (Lifecycle Consolidation, Option C). `deals` is being absorbed into this table; see plan .lovable/plan.md. legacy_deal_id provides back-mapping; source_system marks migrated rows.';
