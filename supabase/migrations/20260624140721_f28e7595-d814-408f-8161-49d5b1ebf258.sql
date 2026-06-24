
-- H2: stage metadata
ALTER TABLE public.lifecycle_stages
  ADD COLUMN IF NOT EXISTS required_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS required_documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS automation_triggers jsonb NOT NULL DEFAULT '[]'::jsonb;

-- H3: transition rules
CREATE TABLE IF NOT EXISTS public.lifecycle_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_stage text NOT NULL,
  to_stage text NOT NULL,
  is_allowed boolean NOT NULL DEFAULT true,
  requires_override boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_stage, to_stage)
);
GRANT SELECT ON public.lifecycle_transitions TO authenticated;
GRANT ALL ON public.lifecycle_transitions TO service_role;
ALTER TABLE public.lifecycle_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lt_read_auth" ON public.lifecycle_transitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "lt_admin_write" ON public.lifecycle_transitions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.lifecycle_override_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL,
  from_stage text,
  to_stage text NOT NULL,
  actor_id uuid,
  override_reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.lifecycle_override_log TO authenticated;
GRANT ALL ON public.lifecycle_override_log TO service_role;
ALTER TABLE public.lifecycle_override_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lol_read_admin" ON public.lifecycle_override_log FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "lol_insert_admin" ON public.lifecycle_override_log FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- Seed forward-only matrix using sort order; lost reachable from any non-terminal
INSERT INTO public.lifecycle_transitions (from_stage, to_stage, is_allowed, requires_override)
SELECT a.key, b.key, true, false
  FROM public.lifecycle_stages a, public.lifecycle_stages b
 WHERE a.is_terminal = false
   AND ((b.sort = a.sort + 10 AND b.key <> 'lost') OR b.key = 'lost')
ON CONFLICT (from_stage, to_stage) DO NOTHING;

-- Reopen lost back to prospect requires override
INSERT INTO public.lifecycle_transitions (from_stage, to_stage, is_allowed, requires_override, notes)
VALUES ('lost','prospect', true, true, 'Reopen lost opportunity')
ON CONFLICT (from_stage, to_stage) DO NOTHING;

-- H4: opportunity events bus
CREATE TABLE IF NOT EXISTS public.opportunity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_opp_events_opp_created ON public.opportunity_events (opportunity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opp_events_type_created ON public.opportunity_events (event_type, created_at DESC);
GRANT SELECT, INSERT ON public.opportunity_events TO authenticated;
GRANT ALL ON public.opportunity_events TO service_role;
ALTER TABLE public.opportunity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oe_read_auth" ON public.opportunity_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "oe_insert_service" ON public.opportunity_events FOR INSERT TO authenticated WITH CHECK (true);

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunity_events;

-- Trigger to emit events on pipeline_opportunities changes
CREATE OR REPLACE FUNCTION public.emit_opportunity_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.opportunity_events (opportunity_id, event_type, payload, actor_id)
    VALUES (NEW.id, 'opportunity.created',
            jsonb_build_object('stage', NEW.stage, 'lifecycle_stage', NEW.lifecycle_stage),
            auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.lifecycle_stage IS DISTINCT FROM OLD.lifecycle_stage
       OR NEW.stage IS DISTINCT FROM OLD.stage THEN
      INSERT INTO public.opportunity_events (opportunity_id, event_type, payload, actor_id)
      VALUES (NEW.id, 'opportunity.stage.changed',
              jsonb_build_object('from', OLD.lifecycle_stage, 'to', NEW.lifecycle_stage,
                                 'legacy_from', OLD.stage, 'legacy_to', NEW.stage),
              auth.uid());
      IF NEW.lifecycle_stage = 'funded' AND OLD.lifecycle_stage IS DISTINCT FROM 'funded' THEN
        INSERT INTO public.opportunity_events (opportunity_id, event_type, payload, actor_id)
        VALUES (NEW.id, 'opportunity.funded',
                jsonb_build_object('loan_amount', NEW.loan_amount), auth.uid());
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emit_opportunity_event ON public.pipeline_opportunities;
CREATE TRIGGER trg_emit_opportunity_event
AFTER INSERT OR UPDATE ON public.pipeline_opportunities
FOR EACH ROW EXECUTE FUNCTION public.emit_opportunity_event();

-- RPC for callers to assert transition (optional client-side guard)
CREATE OR REPLACE FUNCTION public.assert_lifecycle_transition(
  _opportunity_id uuid, _from text, _to text, _override_reason text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule public.lifecycle_transitions%ROWTYPE;
BEGIN
  IF _from = _to THEN RETURN true; END IF;
  SELECT * INTO v_rule FROM public.lifecycle_transitions
    WHERE from_stage = _from AND to_stage = _to;
  IF NOT FOUND OR NOT v_rule.is_allowed THEN
    IF _override_reason IS NULL OR NOT public.is_admin() THEN
      RAISE EXCEPTION 'Transition % -> % is not allowed', _from, _to;
    END IF;
    INSERT INTO public.lifecycle_override_log (opportunity_id, from_stage, to_stage, actor_id, override_reason)
    VALUES (_opportunity_id, _from, _to, auth.uid(), _override_reason);
    RETURN true;
  END IF;
  IF v_rule.requires_override THEN
    IF _override_reason IS NULL THEN
      RAISE EXCEPTION 'Transition % -> % requires override reason', _from, _to;
    END IF;
    INSERT INTO public.lifecycle_override_log (opportunity_id, from_stage, to_stage, actor_id, override_reason)
    VALUES (_opportunity_id, _from, _to, auth.uid(), _override_reason);
  END IF;
  RETURN true;
END;
$$;
