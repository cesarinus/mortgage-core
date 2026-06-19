
-- 1. Table
CREATE TABLE IF NOT EXISTS public.timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.pipeline_opportunities(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  application_id uuid,
  event_type text NOT NULL,
  event_source text NOT NULL,
  title text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid,
  source_ref_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_type, source_ref_id)
);

CREATE INDEX IF NOT EXISTS idx_timeline_person ON public.timeline_events(person_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_lead ON public.timeline_events(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_deal ON public.timeline_events(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_opp ON public.timeline_events(opportunity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_type ON public.timeline_events(event_type);
CREATE INDEX IF NOT EXISTS idx_timeline_source ON public.timeline_events(event_source);

GRANT SELECT ON public.timeline_events TO authenticated;
GRANT ALL ON public.timeline_events TO service_role;

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timeline_admins_all" ON public.timeline_events
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "timeline_lead_owners_read" ON public.timeline_events
  FOR SELECT TO authenticated
  USING (
    (lead_id IS NOT NULL AND public.user_owns_lead(lead_id))
    OR (deal_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = timeline_events.deal_id
        AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid())
    ))
    OR (deal_id IS NOT NULL AND public.is_portal_user_for_deal(deal_id))
  );

-- 2. Internal logger
CREATE OR REPLACE FUNCTION public.timeline_log(
  _event_type text,
  _event_source text,
  _title text,
  _description text DEFAULT NULL,
  _person_id uuid DEFAULT NULL,
  _lead_id uuid DEFAULT NULL,
  _opportunity_id uuid DEFAULT NULL,
  _deal_id uuid DEFAULT NULL,
  _application_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb,
  _actor_id uuid DEFAULT NULL,
  _source_ref_id uuid DEFAULT NULL,
  _created_at timestamptz DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person uuid := _person_id;
  v_id uuid;
BEGIN
  IF v_person IS NULL AND _lead_id IS NOT NULL THEN
    SELECT person_id INTO v_person FROM public.leads WHERE id = _lead_id;
  END IF;
  INSERT INTO public.timeline_events (
    person_id, lead_id, opportunity_id, deal_id, application_id,
    event_type, event_source, title, description, metadata,
    actor_id, source_ref_id, created_at
  ) VALUES (
    v_person, _lead_id, _opportunity_id, _deal_id, _application_id,
    _event_type, _event_source, _title, _description, COALESCE(_metadata, '{}'::jsonb),
    COALESCE(_actor_id, auth.uid()), _source_ref_id, COALESCE(_created_at, now())
  )
  ON CONFLICT (event_type, source_ref_id) DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.timeline_log(text,text,text,text,uuid,uuid,uuid,uuid,uuid,jsonb,uuid,uuid,timestamptz) TO authenticated;

-- 3. Forward-write triggers
-- 3a. leads insert → LEAD_CREATED
CREATE OR REPLACE FUNCTION public.tlg_lead_created() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.timeline_log(
    'LEAD_CREATED', 'lead',
    'Lead created: ' || btrim(coalesce(NEW.first_name,'') || ' ' || coalesce(NEW.last_name,'')),
    COALESCE(NEW.source, 'manual'),
    NEW.person_id, NEW.id, NULL, NULL, NULL,
    jsonb_build_object('status', NEW.status, 'source', NEW.source),
    NEW.created_by, NEW.id, NEW.created_at
  );
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_tl_lead_created ON public.leads;
CREATE TRIGGER trg_tl_lead_created AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.tlg_lead_created();

-- 3b. lead_stage_history → LEAD_STAGE_CHANGED
CREATE OR REPLACE FUNCTION public.tlg_lead_stage() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.timeline_log(
    'LEAD_STAGE_CHANGED', 'lead',
    'Stage: ' || COALESCE(NEW.old_status,'(new)') || ' → ' || NEW.new_status,
    NEW.trigger_event,
    NULL, NEW.lead_id, NULL, NULL, NULL,
    jsonb_build_object('old', NEW.old_status, 'new', NEW.new_status, 'trigger', NEW.trigger_event),
    NULL, NEW.id, NEW.changed_at
  );
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_tl_lead_stage ON public.lead_stage_history;
CREATE TRIGGER trg_tl_lead_stage AFTER INSERT ON public.lead_stage_history
FOR EACH ROW EXECUTE FUNCTION public.tlg_lead_stage();

-- 3c. deal_stage_history → DEAL_STAGE_CHANGED
CREATE OR REPLACE FUNCTION public.tlg_deal_stage() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.timeline_log(
    'DEAL_STAGE_CHANGED', 'deal',
    'Deal stage: ' || COALESCE(NEW.old_stage::text,'(new)') || ' → ' || NEW.new_stage::text,
    NULL,
    NULL, NULL, NULL, NEW.deal_id, NULL,
    jsonb_build_object('old', NEW.old_stage, 'new', NEW.new_stage),
    NEW.changed_by, NEW.id, NEW.changed_at
  );
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_tl_deal_stage ON public.deal_stage_history;
CREATE TRIGGER trg_tl_deal_stage AFTER INSERT ON public.deal_stage_history
FOR EACH ROW EXECUTE FUNCTION public.tlg_deal_stage();

-- 3d. crm_activities → maps NOTE_ADDED / TASK_CREATED / CALL_LOGGED / MEETING_LOGGED
CREATE OR REPLACE FUNCTION public.tlg_crm_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_type text;
BEGIN
  v_type := CASE NEW.activity_type
    WHEN 'note' THEN 'NOTE_ADDED'
    WHEN 'task' THEN 'TASK_CREATED'
    WHEN 'call' THEN 'CALL_LOGGED'
    WHEN 'meeting' THEN 'MEETING_LOGGED'
    WHEN 'attachment' THEN 'DOCUMENT_UPLOADED'
    ELSE 'ACTIVITY_' || upper(NEW.activity_type)
  END;
  PERFORM public.timeline_log(
    v_type, 'crm',
    COALESCE(NEW.title, NEW.activity_type),
    NEW.body,
    NULL, NEW.lead_id, NULL, NEW.deal_id, NULL,
    COALESCE(NEW.metadata, '{}'::jsonb),
    NEW.actor_id, NEW.id, NEW.created_at
  );
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_tl_crm_activity ON public.crm_activities;
CREATE TRIGGER trg_tl_crm_activity AFTER INSERT ON public.crm_activities
FOR EACH ROW EXECUTE FUNCTION public.tlg_crm_activity();

-- 3e. portal_invites → PORTAL_INVITE_SENT
CREATE OR REPLACE FUNCTION public.tlg_portal_invite() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.timeline_log(
    'PORTAL_INVITE_SENT', 'portal',
    'Portal invite sent to ' || NEW.email,
    NULL,
    NULL, NEW.lead_id, NULL, NEW.deal_id, NULL,
    jsonb_build_object('email', NEW.email),
    NEW.created_by, NEW.id, NEW.created_at
  );
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_tl_portal_invite ON public.portal_invites;
CREATE TRIGGER trg_tl_portal_invite AFTER INSERT ON public.portal_invites
FOR EACH ROW EXECUTE FUNCTION public.tlg_portal_invite();

-- 4. Historical backfill (idempotent via UNIQUE on (event_type, source_ref_id))
-- 4a. leads
INSERT INTO public.timeline_events (event_type, event_source, title, description, person_id, lead_id, metadata, actor_id, source_ref_id, created_at)
SELECT 'LEAD_CREATED', 'lead',
  'Lead created: ' || btrim(coalesce(l.first_name,'') || ' ' || coalesce(l.last_name,'')),
  COALESCE(l.source, 'manual'),
  l.person_id, l.id,
  jsonb_build_object('status', l.status, 'source', l.source),
  l.created_by, l.id, l.created_at
FROM public.leads l
ON CONFLICT (event_type, source_ref_id) DO NOTHING;

-- 4b. lead_stage_history
INSERT INTO public.timeline_events (event_type, event_source, title, description, person_id, lead_id, metadata, source_ref_id, created_at)
SELECT 'LEAD_STAGE_CHANGED', 'lead',
  'Stage: ' || COALESCE(h.old_status,'(new)') || ' → ' || h.new_status,
  h.trigger_event,
  l.person_id, h.lead_id,
  jsonb_build_object('old', h.old_status, 'new', h.new_status, 'trigger', h.trigger_event),
  h.id, h.changed_at
FROM public.lead_stage_history h
LEFT JOIN public.leads l ON l.id = h.lead_id
ON CONFLICT (event_type, source_ref_id) DO NOTHING;

-- 4c. deal_stage_history
INSERT INTO public.timeline_events (event_type, event_source, title, deal_id, metadata, actor_id, source_ref_id, created_at)
SELECT 'DEAL_STAGE_CHANGED', 'deal',
  'Deal stage: ' || COALESCE(h.old_stage::text,'(new)') || ' → ' || h.new_stage::text,
  h.deal_id,
  jsonb_build_object('old', h.old_stage, 'new', h.new_stage),
  h.changed_by, h.id, h.changed_at
FROM public.deal_stage_history h
ON CONFLICT (event_type, source_ref_id) DO NOTHING;

-- 4d. crm_activities (covers notes/tasks/calls/meetings/attachments)
INSERT INTO public.timeline_events (event_type, event_source, title, description, person_id, lead_id, deal_id, metadata, actor_id, source_ref_id, created_at)
SELECT
  CASE a.activity_type
    WHEN 'note' THEN 'NOTE_ADDED'
    WHEN 'task' THEN 'TASK_CREATED'
    WHEN 'call' THEN 'CALL_LOGGED'
    WHEN 'meeting' THEN 'MEETING_LOGGED'
    WHEN 'attachment' THEN 'DOCUMENT_UPLOADED'
    ELSE 'ACTIVITY_' || upper(a.activity_type)
  END,
  'crm',
  COALESCE(a.title, a.activity_type),
  a.body,
  l.person_id, a.lead_id, a.deal_id,
  COALESCE(a.metadata, '{}'::jsonb),
  a.actor_id, a.id, a.created_at
FROM public.crm_activities a
LEFT JOIN public.leads l ON l.id = a.lead_id
ON CONFLICT (event_type, source_ref_id) DO NOTHING;

-- 4e. crm_tasks completed (separate TASK_COMPLETED event)
INSERT INTO public.timeline_events (event_type, event_source, title, person_id, lead_id, metadata, source_ref_id, created_at)
SELECT 'TASK_COMPLETED', 'crm',
  'Task completed: ' || t.title,
  l.person_id, t.lead_id,
  jsonb_build_object('priority', t.priority),
  t.id, t.completed_at
FROM public.crm_tasks t
LEFT JOIN public.leads l ON l.id = t.lead_id
WHERE t.completed_at IS NOT NULL
ON CONFLICT (event_type, source_ref_id) DO NOTHING;

-- 4f. portal_invites
INSERT INTO public.timeline_events (event_type, event_source, title, lead_id, deal_id, metadata, actor_id, source_ref_id, created_at)
SELECT 'PORTAL_INVITE_SENT', 'portal',
  'Portal invite sent to ' || pi.email,
  pi.lead_id, pi.deal_id,
  jsonb_build_object('email', pi.email, 'accepted_at', pi.accepted_at),
  pi.created_by, pi.id, pi.created_at
FROM public.portal_invites pi
ON CONFLICT (event_type, source_ref_id) DO NOTHING;

-- 4g. portal_invites accepted
INSERT INTO public.timeline_events (event_type, event_source, title, lead_id, deal_id, metadata, source_ref_id, created_at)
SELECT 'PORTAL_INVITE_ACCEPTED', 'portal',
  'Borrower accepted portal invite',
  pi.lead_id, pi.deal_id,
  jsonb_build_object('email', pi.email),
  pi.id, pi.accepted_at
FROM public.portal_invites pi
WHERE pi.accepted_at IS NOT NULL
ON CONFLICT (event_type, source_ref_id) DO NOTHING;

-- 4h. crm_attachments (DOCUMENT_UPLOADED — for any not already covered via crm_activities)
INSERT INTO public.timeline_events (event_type, event_source, title, description, person_id, lead_id, deal_id, metadata, actor_id, source_ref_id, created_at)
SELECT 'DOCUMENT_UPLOADED', 'crm',
  'Uploaded ' || at.file_name,
  at.category_slug,
  l.person_id, at.lead_id, at.deal_id,
  jsonb_build_object('mime_type', at.mime_type, 'size_bytes', at.size_bytes),
  at.uploaded_by, at.id, at.created_at
FROM public.crm_attachments at
LEFT JOIN public.leads l ON l.id = at.lead_id
ON CONFLICT (event_type, source_ref_id) DO NOTHING;
