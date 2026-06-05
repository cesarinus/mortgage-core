
-- 1) New pipeline_opportunities table
CREATE TABLE public.pipeline_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL UNIQUE REFERENCES public.leads(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'application_sent',
  loan_amount numeric,
  property_address text,
  primary_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  title_company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  lender_company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  close_date timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pipeline_opportunities_stage_chk CHECK (stage IN
    ('application_sent','underwriting','approved','clear_to_close','closed','lost'))
);

CREATE INDEX pipeline_opportunities_stage_idx ON public.pipeline_opportunities(stage);
CREATE INDEX pipeline_opportunities_lead_idx ON public.pipeline_opportunities(lead_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_opportunities TO authenticated;
GRANT ALL ON public.pipeline_opportunities TO service_role;

ALTER TABLE public.pipeline_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins all opportunities" ON public.pipeline_opportunities
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Lead owners read opportunities" ON public.pipeline_opportunities
  FOR SELECT USING (user_owns_lead(lead_id));
CREATE POLICY "Lead owners insert opportunities" ON public.pipeline_opportunities
  FOR INSERT WITH CHECK (user_owns_lead(lead_id) AND created_by = auth.uid());
CREATE POLICY "Lead owners update opportunities" ON public.pipeline_opportunities
  FOR UPDATE USING (user_owns_lead(lead_id));
CREATE POLICY "Lead owners delete opportunities" ON public.pipeline_opportunities
  FOR DELETE USING (user_owns_lead(lead_id));

CREATE TRIGGER pipeline_opportunities_set_updated_at
  BEFORE UPDATE ON public.pipeline_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Backfill: any lead currently in a pipeline-only stage gets an opportunity row,
--    and the lead is moved back to 'unqualified' in the lead enum.
WITH stage_map AS (
  SELECT id, status::text AS old_stage,
    CASE status::text
      WHEN 'application_sent' THEN 'application_sent'
      WHEN 'underwriting'    THEN 'underwriting'
      WHEN 'approved'        THEN 'approved'
      WHEN 'clear_to_close'  THEN 'clear_to_close'
      WHEN 'closed'          THEN 'closed'
      WHEN 'lost'            THEN 'lost'
      ELSE NULL
    END AS new_stage,
    loan_amount, property_value, property_address
  FROM public.leads
  WHERE status::text IN ('application_sent','underwriting','approved','clear_to_close','closed','lost')
)
INSERT INTO public.pipeline_opportunities (lead_id, stage, loan_amount, property_address)
SELECT id, new_stage, COALESCE(loan_amount, property_value), property_address
FROM stage_map
WHERE new_stage IS NOT NULL
ON CONFLICT (lead_id) DO NOTHING;

-- Lost stays as lost on the lead too? Per spec leads enum is New/Contacted/Qualified/Unqualified.
-- Map every migrated lead's status to 'unqualified' so it disappears from the active Leads list.
UPDATE public.leads
SET status = 'unqualified'::lead_status
WHERE status::text IN ('application_sent','underwriting','approved','clear_to_close','closed','lost');

-- Map prequalified back to qualified (treat the unified intermediate as qualified).
UPDATE public.leads
SET status = 'qualified'::lead_status
WHERE status::text = 'prequalified';

-- 3) Repoint los_sync_queue.opportunity_id from leads.id to pipeline_opportunities.id
ALTER TABLE public.los_sync_queue DROP CONSTRAINT IF EXISTS los_sync_queue_opportunity_id_fkey;

UPDATE public.los_sync_queue q
SET opportunity_id = po.id
FROM public.pipeline_opportunities po
WHERE po.lead_id = q.opportunity_id;

-- Any queue row without a matching opportunity is now stale; drop it.
DELETE FROM public.los_sync_queue
WHERE opportunity_id NOT IN (SELECT id FROM public.pipeline_opportunities);

ALTER TABLE public.los_sync_queue
  ADD CONSTRAINT los_sync_queue_opportunity_id_fkey
  FOREIGN KEY (opportunity_id) REFERENCES public.pipeline_opportunities(id) ON DELETE CASCADE;

-- Update LOS queue RLS: replace user_owns_lead with an opportunity-aware check.
DROP POLICY IF EXISTS "lead owners insert los_sync_queue" ON public.los_sync_queue;
DROP POLICY IF EXISTS "lead owners read los_sync_queue" ON public.los_sync_queue;
DROP POLICY IF EXISTS "lead owners update los_sync_queue" ON public.los_sync_queue;

CREATE POLICY "Lead owners read los_sync_queue" ON public.los_sync_queue
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.pipeline_opportunities po
    WHERE po.id = los_sync_queue.opportunity_id AND user_owns_lead(po.lead_id)
  ));
CREATE POLICY "Lead owners insert los_sync_queue" ON public.los_sync_queue
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.pipeline_opportunities po
    WHERE po.id = los_sync_queue.opportunity_id AND user_owns_lead(po.lead_id)
  ));
CREATE POLICY "Lead owners update los_sync_queue" ON public.los_sync_queue
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.pipeline_opportunities po
    WHERE po.id = los_sync_queue.opportunity_id AND user_owns_lead(po.lead_id)
  ));

-- 4) Revert auto-progress trigger: only advance through lead stages, never into pipeline.
CREATE OR REPLACE FUNCTION public.auto_progress_lead_pipeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_status text;
  new_status text;
  current_score integer;
  current_order integer;
  new_order integer;
BEGIN
  UPDATE public.leads SET last_activity_at = now(), is_stuck = false WHERE id = NEW.lead_id;

  SELECT status::text, COALESCE(lead_score, 0) INTO current_status, current_score
  FROM public.leads WHERE id = NEW.lead_id;

  IF current_status IS NULL THEN RETURN NEW; END IF;

  CASE NEW.event_type
    WHEN 'form_submit' THEN new_status := 'new_lead';
    WHEN 'contact_made' THEN new_status := 'contacted';
    WHEN 'calculator_used', 'multiple_visits', 'cta_click' THEN
      IF (current_score + NEW.points) >= 60 THEN
        new_status := 'qualified';
      ELSE
        new_status := NULL;
      END IF;
    ELSE new_status := NULL;
  END CASE;

  IF new_status IS NULL OR new_status = current_status THEN RETURN NEW; END IF;

  current_order := CASE current_status
    WHEN 'new_lead' THEN 1
    WHEN 'contacted' THEN 2
    WHEN 'qualified' THEN 3
    WHEN 'unqualified' THEN 0
    ELSE 0
  END;

  new_order := CASE new_status
    WHEN 'new_lead' THEN 1
    WHEN 'contacted' THEN 2
    WHEN 'qualified' THEN 3
    ELSE 0
  END;

  IF new_order <= current_order THEN RETURN NEW; END IF;

  UPDATE public.leads SET status = new_status::lead_status WHERE id = NEW.lead_id;

  INSERT INTO public.lead_stage_history (lead_id, old_status, new_status, trigger_event, trigger_event_id)
  VALUES (NEW.lead_id, current_status, new_status, NEW.event_type, NEW.id);

  RETURN NEW;
END;
$function$;
