
-- I6: health score
CREATE OR REPLACE FUNCTION public.recalc_opportunity_health(_opp_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opp public.pipeline_opportunities%ROWTYPE;
  v_score int := 0;
  v_complete int := 0;
  v_doc_total int := 0;
  v_doc_filled int := 0;
  v_critical_issues int := 0;
  v_los_fresh int := 0;
  v_app_submitted boolean := false;
BEGIN
  SELECT * INTO v_opp FROM public.pipeline_opportunities WHERE id = _opp_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Completeness (40 pts max)
  IF v_opp.contact_id IS NOT NULL OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = v_opp.lead_id AND l.person_id IS NOT NULL) THEN v_complete := v_complete + 15; END IF;
  IF v_opp.property_address IS NOT NULL AND v_opp.property_address <> '' THEN v_complete := v_complete + 10; END IF;
  IF v_opp.loan_amount IS NOT NULL AND v_opp.loan_amount > 0 THEN v_complete := v_complete + 8; END IF;
  IF v_opp.loan_program IS NOT NULL OR v_opp.loan_type IS NOT NULL THEN v_complete := v_complete + 7; END IF;

  -- Document fill (25 pts max)
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status::text <> 'missing')
    INTO v_doc_total, v_doc_filled
    FROM public.deal_documents dd
   WHERE dd.deal_id IN (SELECT id FROM public.deals_legacy WHERE id = v_opp.legacy_deal_id)
      OR dd.deal_id = v_opp.id;
  IF v_doc_total > 0 THEN
    v_score := v_score + LEAST(25, (v_doc_filled * 25 / v_doc_total));
  ELSE
    v_score := v_score + 15; -- partial credit when no docs required yet
  END IF;

  -- Stage consistency (15 pts)
  IF v_opp.lifecycle_stage IN ('processing','underwriting','clear_to_close','funded') THEN
    SELECT EXISTS (SELECT 1 FROM public.opportunity_events e
                   WHERE e.opportunity_id = v_opp.id
                     AND (e.payload->>'to') = 'application_submitted')
      INTO v_app_submitted;
    IF v_app_submitted OR v_opp.lifecycle_stage IS NULL THEN v_score := v_score + 15; END IF;
  ELSE
    v_score := v_score + 15;
  END IF;

  -- LOS freshness (10 pts) — funded but stale LOS loses points
  IF v_opp.los_last_synced_at IS NULL THEN v_los_fresh := 5;
  ELSIF v_opp.los_last_synced_at > now() - interval '7 days' THEN v_los_fresh := 10;
  ELSE v_los_fresh := 3; END IF;
  v_score := v_score + v_los_fresh;

  v_score := v_score + v_complete;

  -- Open critical integrity issues (−20 each, capped)
  SELECT COUNT(*) INTO v_critical_issues
    FROM public.entity_health_report
   WHERE entity_key = 'opportunity'
     AND status = 'fail'
     AND scan_run_id = (SELECT scan_run_id FROM public.entity_health_report WHERE entity_key='opportunity' ORDER BY scanned_at DESC LIMIT 1)
     AND (details->>'opportunity_id')::uuid IS NOT DISTINCT FROM _opp_id;
  v_score := v_score - LEAST(40, v_critical_issues * 20);

  v_score := GREATEST(0, LEAST(100, v_score));

  UPDATE public.pipeline_opportunities
     SET health_score = v_score,
         health_calculated_at = now()
   WHERE id = _opp_id;

  RETURN v_score;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalc_all_opportunity_health()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT id FROM public.pipeline_opportunities LOOP
    PERFORM public.recalc_opportunity_health(r.id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- K1: AI-ready context view
CREATE OR REPLACE VIEW public.opportunity_context_view
WITH (security_invoker = true)
AS
SELECT
  po.id AS opportunity_id,
  po.lifecycle_stage,
  po.stage AS legacy_stage,
  po.loan_amount,
  po.loan_type,
  po.loan_program,
  po.transaction_type,
  po.property_address,
  po.property_type,
  po.occupancy_type,
  po.purchase_price,
  po.down_payment,
  po.ltv, po.cltv, po.dti,
  po.lock_status, po.lock_expires_at,
  po.los_loan_number, po.los_status, po.los_last_synced_at,
  po.funded_at, po.lost_reason, po.lost_at,
  po.health_score, po.health_calculated_at,
  po.loan_officer_id,
  po.created_at, po.updated_at,
  -- Lead
  l.id AS lead_id,
  l.first_name AS lead_first_name,
  l.last_name AS lead_last_name,
  l.email AS lead_email,
  l.phone AS lead_phone,
  l.status AS lead_status,
  l.lead_score,
  -- Primary borrower (contact)
  c.id AS borrower_contact_id,
  c.first_name AS borrower_first_name,
  c.last_name AS borrower_last_name,
  c.email AS borrower_email,
  c.phone AS borrower_phone,
  -- Aggregates
  (SELECT COUNT(*) FROM public.tasks t WHERE t.opportunity_id = po.id AND t.status <> 'completed') AS open_tasks_count,
  (SELECT COUNT(*) FROM public.loan_conditions lc WHERE lc.pipeline_opportunity_id = po.id AND lc.status <> 'received') AS pending_conditions_count,
  (SELECT COUNT(*) FROM public.deal_documents dd WHERE dd.deal_id = po.legacy_deal_id AND dd.status::text = 'missing') AS missing_documents_count,
  (SELECT COUNT(*) FROM public.opportunity_events e WHERE e.opportunity_id = po.id) AS event_count
FROM public.pipeline_opportunities po
LEFT JOIN public.leads l ON l.id = po.lead_id
LEFT JOIN public.contacts c ON c.id = po.contact_id;

GRANT SELECT ON public.opportunity_context_view TO authenticated;
GRANT SELECT ON public.opportunity_context_view TO service_role;

-- K2: opportunity_summary RPC
CREATE OR REPLACE FUNCTION public.opportunity_summary(_opp_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  SELECT jsonb_build_object(
    'opportunity_id', po.id,
    'stage', po.lifecycle_stage,
    'legacy_stage', po.stage,
    'health_score', po.health_score,
    'los_status', po.los_status,
    'los_last_synced_at', po.los_last_synced_at,
    'open_tasks', (SELECT COUNT(*) FROM public.tasks t WHERE t.opportunity_id = po.id AND t.status <> 'completed'),
    'pending_conditions', (SELECT COUNT(*) FROM public.loan_conditions lc WHERE lc.pipeline_opportunity_id = po.id AND lc.status <> 'received'),
    'missing_documents', (SELECT COUNT(*) FROM public.deal_documents dd WHERE dd.deal_id = po.legacy_deal_id AND dd.status::text = 'missing'),
    'recent_activity', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('type', e.event_type, 'payload', e.payload, 'at', e.created_at) ORDER BY e.created_at DESC)
      FROM (SELECT * FROM public.opportunity_events WHERE opportunity_id = po.id ORDER BY created_at DESC LIMIT 10) e
    ), '[]'::jsonb)
  ) INTO v
  FROM public.pipeline_opportunities po
  WHERE po.id = _opp_id;
  RETURN v;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalc_opportunity_health(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_all_opportunity_health() TO service_role;
GRANT EXECUTE ON FUNCTION public.opportunity_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_lifecycle_transition(uuid, text, text, text) TO authenticated;
