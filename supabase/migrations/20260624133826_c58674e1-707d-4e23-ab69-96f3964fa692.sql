-- =========================================================================
-- Stage D — Compatibility layer: `deals` view over `pipeline_opportunities`
-- Plan: .lovable/plan.md
-- =========================================================================

-- D.1 Rename the physical table. All FKs (tasks.deal_id, crm_activities.deal_id,
-- crm_attachments.deal_id, deal_stage_history.deal_id, deal_events.deal_id,
-- income_document_extractions.deal_id, mortgage_snapshots.deal_id,
-- timeline_events.deal_id) follow the rename automatically because Postgres
-- FKs reference the table OID, not the name.
ALTER TABLE IF EXISTS public.deals RENAME TO deals_legacy;

-- D.2 Drop the duplicate stage-change trigger on the legacy table.
-- Stage history is now logged through pipeline_opportunities; double-logging
-- would create duplicate timeline events.
DROP TRIGGER IF EXISTS on_deal_stage_change ON public.deals_legacy;

COMMENT ON TABLE public.deals_legacy IS
  'Frozen historical Deals table (renamed from public.deals in Stage D). Reads and writes go through the public.deals VIEW which routes to pipeline_opportunities. Kept in place because incoming FKs (tasks.deal_id, etc.) still reference these IDs.';

-- D.3 Helper: map any text stage value to a valid deal_stage enum label.
-- Needed because pipeline_opportunities.stage may hold values that aren't in
-- the deal_stage enum (e.g. 'application_started').
CREATE OR REPLACE FUNCTION public.stage_to_deal_enum(_raw text)
RETURNS public.deal_stage
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(coalesce(_raw, ''))
    WHEN 'new_lead'              THEN 'new_lead'::public.deal_stage
    WHEN 'contacted'             THEN 'contacted'::public.deal_stage
    WHEN 'application_started'   THEN 'application_sent'::public.deal_stage
    WHEN 'application_sent'      THEN 'application_sent'::public.deal_stage
    WHEN 'application_submitted' THEN 'application_sent'::public.deal_stage
    WHEN 'docs_received'         THEN 'docs_received'::public.deal_stage
    WHEN 'processing'            THEN 'docs_received'::public.deal_stage
    WHEN 'underwriting'          THEN 'underwriting'::public.deal_stage
    WHEN 'approved'              THEN 'approved'::public.deal_stage
    WHEN 'conditional_approval'  THEN 'approved'::public.deal_stage
    WHEN 'clear_to_close'        THEN 'clear_to_close'::public.deal_stage
    WHEN 'closed'                THEN 'closed'::public.deal_stage
    WHEN 'funded'                THEN 'closed'::public.deal_stage
    WHEN 'lost'                  THEN 'lost'::public.deal_stage
    ELSE 'new_lead'::public.deal_stage
  END;
$$;

-- D.4 The compatibility view. Column shape matches the old `deals` table 1:1.
-- For migrated rows the view returns the original deal id (so children's
-- deal_id FKs still resolve and React code that joined on it keeps working).
CREATE OR REPLACE VIEW public.deals
WITH (security_invoker = true) AS
SELECT
  COALESCE(po.legacy_deal_id, po.id)         AS id,
  po.contact_id                              AS contact_id,
  po.loan_officer_id                         AS loan_officer_id,
  po.loan_amount                             AS loan_amount,
  po.loan_type                               AS loan_type,
  po.property_address                        AS property_address,
  public.stage_to_deal_enum(po.stage)        AS stage,
  po.notes                                   AS notes,
  po.created_by                              AS created_by,
  po.created_at                              AS created_at,
  po.updated_at                              AS updated_at
FROM public.pipeline_opportunities po;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
GRANT ALL                            ON public.deals TO service_role;

COMMENT ON VIEW public.deals IS
  'Compatibility view over pipeline_opportunities. SELECT returns Opportunities in the legacy Deals shape; INSERT/UPDATE/DELETE are routed by INSTEAD OF triggers. security_invoker=true so underlying Opportunities RLS applies.';

-- D.5 INSTEAD OF INSERT — create an Opportunity and a stub deals_legacy row
-- so that subsequent child inserts referencing deal_id still satisfy the FK.
CREATE OR REPLACE FUNCTION public.deals_view_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_legacy_id    uuid := COALESCE(NEW.id, gen_random_uuid());
  v_opportunity  uuid;
  v_lead_id      uuid;
  v_stage_text   text := COALESCE(NEW.stage::text, 'new_lead');
BEGIN
  -- Resolve lead via contact -> person -> lead (best effort).
  IF NEW.contact_id IS NOT NULL THEN
    SELECT l.id INTO v_lead_id
    FROM public.contacts c
    JOIN public.leads l ON l.person_id = c.person_id
    WHERE c.id = NEW.contact_id
    ORDER BY l.created_at
    LIMIT 1;
  END IF;

  -- Stub row in deals_legacy so any child INSERT with deal_id=v_legacy_id is valid.
  INSERT INTO public.deals_legacy (
    id, contact_id, loan_officer_id, loan_amount, loan_type,
    property_address, stage, notes, created_by, created_at, updated_at
  ) VALUES (
    v_legacy_id, NEW.contact_id, NEW.loan_officer_id, NEW.loan_amount, NEW.loan_type,
    NEW.property_address, public.stage_to_deal_enum(v_stage_text), NEW.notes,
    COALESCE(NEW.created_by, auth.uid()), COALESCE(NEW.created_at, now()), COALESCE(NEW.updated_at, now())
  );

  -- Canonical record in pipeline_opportunities.
  INSERT INTO public.pipeline_opportunities (
    lead_id, contact_id, loan_officer_id, created_by,
    loan_amount, loan_type, property_address, notes,
    stage, lifecycle_stage,
    legacy_deal_id, source_system,
    created_at, updated_at
  ) VALUES (
    v_lead_id, NEW.contact_id, NEW.loan_officer_id, COALESCE(NEW.created_by, auth.uid()),
    NEW.loan_amount, NEW.loan_type, NEW.property_address, NEW.notes,
    v_stage_text, public.map_legacy_stage(v_stage_text),
    v_legacy_id, 'deal_migrated',
    COALESCE(NEW.created_at, now()), COALESCE(NEW.updated_at, now())
  )
  RETURNING id INTO v_opportunity;

  INSERT INTO public.deal_to_opportunity (deal_id, opportunity_id)
  VALUES (v_legacy_id, v_opportunity)
  ON CONFLICT (deal_id) DO NOTHING;

  NEW.id := v_legacy_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS deals_view_instead_insert ON public.deals;
CREATE TRIGGER deals_view_instead_insert
  INSTEAD OF INSERT ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.deals_view_insert();

-- D.6 INSTEAD OF UPDATE — write through to Opportunities, mirror to legacy stub.
CREATE OR REPLACE FUNCTION public.deals_view_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_opp_id uuid;
  v_new_stage text := COALESCE(NEW.stage::text, OLD.stage::text);
BEGIN
  -- Find the opportunity for this view row.
  SELECT id INTO v_opp_id
  FROM public.pipeline_opportunities
  WHERE COALESCE(legacy_deal_id, id) = OLD.id;

  IF v_opp_id IS NULL THEN
    RAISE EXCEPTION 'deals view: no opportunity found for id %', OLD.id;
  END IF;

  UPDATE public.pipeline_opportunities
     SET contact_id       = NEW.contact_id,
         loan_officer_id  = NEW.loan_officer_id,
         loan_amount      = NEW.loan_amount,
         loan_type        = NEW.loan_type,
         property_address = NEW.property_address,
         notes            = NEW.notes,
         stage            = v_new_stage,
         lifecycle_stage  = public.map_legacy_stage(v_new_stage),
         updated_at       = now()
   WHERE id = v_opp_id;

  -- Keep the legacy stub aligned so any child still pointing at deals_legacy
  -- sees consistent denormalized values.
  UPDATE public.deals_legacy
     SET contact_id       = NEW.contact_id,
         loan_officer_id  = NEW.loan_officer_id,
         loan_amount      = NEW.loan_amount,
         loan_type        = NEW.loan_type,
         property_address = NEW.property_address,
         notes            = NEW.notes,
         stage            = public.stage_to_deal_enum(v_new_stage),
         updated_at       = now()
   WHERE id = OLD.id;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS deals_view_instead_update ON public.deals;
CREATE TRIGGER deals_view_instead_update
  INSTEAD OF UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.deals_view_update();

-- D.7 INSTEAD OF DELETE — remove the opportunity (children cascade) and the legacy stub.
CREATE OR REPLACE FUNCTION public.deals_view_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_opp_id uuid;
BEGIN
  SELECT id INTO v_opp_id
  FROM public.pipeline_opportunities
  WHERE COALESCE(legacy_deal_id, id) = OLD.id;

  IF v_opp_id IS NOT NULL THEN
    DELETE FROM public.pipeline_opportunities WHERE id = v_opp_id;
  END IF;

  DELETE FROM public.deals_legacy WHERE id = OLD.id;

  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS deals_view_instead_delete ON public.deals;
CREATE TRIGGER deals_view_instead_delete
  INSTEAD OF DELETE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.deals_view_delete();
