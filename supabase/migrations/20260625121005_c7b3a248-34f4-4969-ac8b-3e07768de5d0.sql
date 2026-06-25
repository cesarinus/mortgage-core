
ALTER TABLE public.pipeline_opportunities
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS archived_reason text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pipeline_opportunities_status_chk') THEN
    ALTER TABLE public.pipeline_opportunities
      ADD CONSTRAINT pipeline_opportunities_status_chk CHECK (status IN ('active','archived'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pipeline_opp_active ON public.pipeline_opportunities(updated_at DESC) WHERE status = 'active';

CREATE OR REPLACE FUNCTION public.opportunity_dependency_counts(_opp_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'tasks',           (SELECT count(*) FROM public.tasks WHERE opportunity_id = _opp_id),
    'activities',      (SELECT count(*) FROM public.crm_activities WHERE opportunity_id = _opp_id),
    'notes',           (SELECT count(*) FROM public.crm_notes n JOIN public.pipeline_opportunities p ON p.lead_id = n.lead_id WHERE p.id = _opp_id),
    'documents',       (SELECT count(*) FROM public.crm_attachments WHERE opportunity_id = _opp_id),
    'conditions',      (SELECT count(*) FROM public.loan_conditions WHERE pipeline_opportunity_id = _opp_id),
    'los_records',     (SELECT count(*) FROM public.los_loans WHERE deal_id = _opp_id),
    'timeline_events', (SELECT count(*) FROM public.timeline_events WHERE opportunity_id = _opp_id),
    'mortgage_snapshots', (SELECT count(*) FROM public.mortgage_snapshots WHERE opportunity_id = _opp_id),
    'custom_fields',   (SELECT count(*) FROM public.crm_field_values WHERE record_type='opportunity' AND record_id = _opp_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.archive_opportunity(_opp_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF NOT (public.has_role('admin'::app_role) OR public.has_role('loan_officer'::app_role)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.pipeline_opportunities
     SET status='archived', deleted_at=now(), deleted_by=_uid, archived_reason=_reason, updated_at=now()
   WHERE id=_opp_id;
  INSERT INTO public.opportunity_events(opportunity_id,event_type,payload,actor_id)
  VALUES (_opp_id,'archived',jsonb_build_object('reason',_reason),_uid);
  INSERT INTO public.timeline_events(opportunity_id,event_type,event_source,title,description,actor_id,metadata)
  VALUES (_opp_id,'OPPORTUNITY_ARCHIVED','opportunity','Opportunity archived',_reason,_uid,jsonb_build_object('reason',_reason));
  RETURN jsonb_build_object('ok',true,'opportunity_id',_opp_id,'status','archived');
END $$;

CREATE OR REPLACE FUNCTION public.restore_opportunity(_opp_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF NOT (public.has_role('admin'::app_role) OR public.has_role('loan_officer'::app_role)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.pipeline_opportunities
     SET status='active', deleted_at=NULL, deleted_by=NULL, archived_reason=NULL, updated_at=now()
   WHERE id=_opp_id;
  INSERT INTO public.opportunity_events(opportunity_id,event_type,payload,actor_id)
  VALUES (_opp_id,'restored','{}'::jsonb,_uid);
  RETURN jsonb_build_object('ok',true,'opportunity_id',_opp_id,'status','active');
END $$;

CREATE OR REPLACE FUNCTION public.hard_delete_opportunity(_opp_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _deps jsonb; _total int; _uid uuid := auth.uid();
BEGIN
  IF NOT public.has_role('admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin only' USING ERRCODE = '42501';
  END IF;
  _deps := public.opportunity_dependency_counts(_opp_id);
  SELECT COALESCE(SUM((value)::int),0) INTO _total FROM jsonb_each_text(_deps);
  IF _total > 0 THEN
    RETURN jsonb_build_object('ok',false,'reason','has_dependencies','dependencies',_deps);
  END IF;
  DELETE FROM public.pipeline_opportunities WHERE id=_opp_id;
  RETURN jsonb_build_object('ok',true,'deleted',true,'actor',_uid);
END $$;

CREATE OR REPLACE FUNCTION public.repair_opportunity_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _names int:=0; _amts int:=0; _contacts int:=0; _addrs int:=0;
BEGIN
  IF NOT (public.has_role('admin'::app_role) OR public.has_role('loan_officer'::app_role)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  WITH upd AS (
    UPDATE public.pipeline_opportunities po
       SET name = COALESCE(
         NULLIF(btrim(concat_ws(' ', l.first_name, l.last_name)),''),
         NULLIF(btrim(concat_ws(' ', c.first_name, c.last_name)),''),
         po.property_address
       ),
       updated_at = now()
      FROM (SELECT id FROM public.pipeline_opportunities WHERE name IS NULL OR name = '') t
      LEFT JOIN public.leads l ON l.id = (SELECT lead_id FROM public.pipeline_opportunities WHERE id = t.id)
      LEFT JOIN public.contacts c ON c.id = (SELECT COALESCE(primary_contact_id, contact_id) FROM public.pipeline_opportunities WHERE id = t.id)
     WHERE po.id = t.id
       AND COALESCE(
         NULLIF(btrim(concat_ws(' ', l.first_name, l.last_name)),''),
         NULLIF(btrim(concat_ws(' ', c.first_name, c.last_name)),''),
         po.property_address
       ) IS NOT NULL
    RETURNING 1
  ) SELECT count(*) INTO _names FROM upd;

  WITH upd AS (
    UPDATE public.pipeline_opportunities po
       SET loan_amount = l.loan_amount, updated_at = now()
      FROM public.leads l
     WHERE po.lead_id = l.id AND po.loan_amount IS NULL AND l.loan_amount IS NOT NULL
    RETURNING 1
  ) SELECT count(*) INTO _amts FROM upd;

  WITH upd AS (
    UPDATE public.pipeline_opportunities
       SET primary_contact_id = contact_id, updated_at = now()
     WHERE primary_contact_id IS NULL AND contact_id IS NOT NULL
    RETURNING 1
  ) SELECT count(*) INTO _contacts FROM upd;

  WITH upd AS (
    UPDATE public.pipeline_opportunities po
       SET property_address = l.property_address, updated_at = now()
      FROM public.leads l
     WHERE po.lead_id = l.id AND (po.property_address IS NULL OR po.property_address = '')
       AND l.property_address IS NOT NULL AND l.property_address <> ''
    RETURNING 1
  ) SELECT count(*) INTO _addrs FROM upd;

  RETURN jsonb_build_object(
    'names_backfilled',_names,
    'loan_amounts_backfilled',_amts,
    'primary_contacts_promoted',_contacts,
    'addresses_backfilled',_addrs
  );
END $$;

REVOKE ALL ON FUNCTION public.opportunity_dependency_counts(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.archive_opportunity(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_opportunity(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hard_delete_opportunity(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.repair_opportunity_data() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.opportunity_dependency_counts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_opportunity(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_opportunity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hard_delete_opportunity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.repair_opportunity_data() TO authenticated;
