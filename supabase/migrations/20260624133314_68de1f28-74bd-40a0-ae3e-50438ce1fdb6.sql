-- =========================================================================
-- Stage B — Canonical lifecycle stage taxonomy (additive only)
-- Plan: .lovable/plan.md
-- =========================================================================

-- B.1 Canonical stage catalog
CREATE TABLE IF NOT EXISTS public.lifecycle_stages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key               text NOT NULL UNIQUE,
  label             text NOT NULL,
  sort              int  NOT NULL,
  is_terminal       boolean NOT NULL DEFAULT false,
  color             text,
  probability_pct   int,
  expected_days     int,
  description       text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT                         ON public.lifecycle_stages TO authenticated;
GRANT ALL                            ON public.lifecycle_stages TO service_role;

ALTER TABLE public.lifecycle_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone signed in can read lifecycle stages" ON public.lifecycle_stages;
CREATE POLICY "Anyone signed in can read lifecycle stages"
  ON public.lifecycle_stages FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage lifecycle stages" ON public.lifecycle_stages;
CREATE POLICY "Admins manage lifecycle stages"
  ON public.lifecycle_stages FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS lifecycle_stages_set_updated_at ON public.lifecycle_stages;
CREATE TRIGGER lifecycle_stages_set_updated_at
  BEFORE UPDATE ON public.lifecycle_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- B.2 Seed the 9 canonical stages (idempotent)
INSERT INTO public.lifecycle_stages (key, label, sort, is_terminal, color, probability_pct, expected_days) VALUES
  ('prospect',              'Prospect',              10, false, '#94a3b8',  5,  NULL),
  ('application_started',   'Application Started',   20, false, '#60a5fa', 15,   7),
  ('application_submitted', 'Application Submitted', 30, false, '#06b6d4', 30,   5),
  ('processing',            'Processing',            40, false, '#14b8a6', 50,  10),
  ('underwriting',          'Underwriting',          50, false, '#0d9488', 65,  10),
  ('conditional_approval',  'Conditional Approval',  60, false, '#10b981', 80,   7),
  ('clear_to_close',        'Clear to Close',        70, false, '#eab308', 92,   3),
  ('funded',                'Funded',                80, true,  '#16a34a',100,   0),
  ('lost',                  'Lost',                  90, true,  '#ef4444',  0,   0)
ON CONFLICT (key) DO UPDATE
  SET label = EXCLUDED.label,
      sort  = EXCLUDED.sort,
      is_terminal = EXCLUDED.is_terminal,
      color = EXCLUDED.color,
      probability_pct = EXCLUDED.probability_pct,
      expected_days = EXCLUDED.expected_days;

-- B.3 Mapping function: any legacy stage -> canonical lifecycle key
CREATE OR REPLACE FUNCTION public.map_legacy_stage(_raw text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(coalesce(_raw, ''))
    -- Legacy lead/deal pre-app states
    WHEN ''                    THEN 'prospect'
    WHEN 'new_lead'            THEN 'prospect'
    WHEN 'new'                 THEN 'prospect'
    WHEN 'contacted'           THEN 'prospect'
    WHEN 'qualified'           THEN 'prospect'
    WHEN 'prequalified'        THEN 'prospect'
    -- Application phase
    WHEN 'application_started' THEN 'application_started'
    WHEN 'application_sent'    THEN 'application_submitted'
    WHEN 'application_submitted' THEN 'application_submitted'
    WHEN 'processing'          THEN 'processing'
    -- Underwriting / approval
    WHEN 'underwriting'        THEN 'underwriting'
    WHEN 'approved'            THEN 'conditional_approval'
    WHEN 'conditional_approval' THEN 'conditional_approval'
    WHEN 'clear_to_close'      THEN 'clear_to_close'
    -- Terminal
    WHEN 'closed'              THEN 'funded'
    WHEN 'funded'              THEN 'funded'
    WHEN 'lost'                THEN 'lost'
    WHEN 'unqualified'         THEN 'lost'
    ELSE 'prospect'
  END;
$$;

-- B.4 Add canonical column to Opportunities (additive). Old `stage` stays as-is.
ALTER TABLE public.pipeline_opportunities
  ADD COLUMN IF NOT EXISTS lifecycle_stage text
    REFERENCES public.lifecycle_stages(key) ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS idx_pipeline_opp_lifecycle_stage
  ON public.pipeline_opportunities(lifecycle_stage);

-- B.5 Backfill canonical stage for every existing row
UPDATE public.pipeline_opportunities
   SET lifecycle_stage = public.map_legacy_stage(stage)
 WHERE lifecycle_stage IS NULL;

-- B.6 Auto-sync trigger: whenever legacy `stage` is written, mirror canonical.
-- Keeps the column populated for existing React code that only sets `stage`.
CREATE OR REPLACE FUNCTION public.sync_lifecycle_stage_from_legacy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM COALESCE(OLD.stage, '') THEN
    NEW.lifecycle_stage := public.map_legacy_stage(NEW.stage);
  ELSIF NEW.lifecycle_stage IS NULL THEN
    NEW.lifecycle_stage := public.map_legacy_stage(NEW.stage);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_lifecycle_stage ON public.pipeline_opportunities;
CREATE TRIGGER trg_sync_lifecycle_stage
  BEFORE INSERT OR UPDATE OF stage ON public.pipeline_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.sync_lifecycle_stage_from_legacy();

-- B.7 Document that pipeline_stages is now considered legacy
COMMENT ON TABLE public.pipeline_stages IS
  'LEGACY — admin-configured stage catalog. Superseded by public.lifecycle_stages (single source of truth, see plan .lovable/plan.md). Kept for backward compatibility with Pipeline Stages Manager during the consolidation window.';

COMMENT ON COLUMN public.pipeline_opportunities.stage IS
  'LEGACY stage column kept for back-compat with the existing Deals/Opportunities UI. Canonical value lives in lifecycle_stage and is auto-synced via trg_sync_lifecycle_stage.';

COMMENT ON COLUMN public.pipeline_opportunities.lifecycle_stage IS
  'Canonical mortgage lifecycle stage (FK lifecycle_stages.key). Single source of truth.';
