
-- Add new lead_status enum values
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'pre_qualified';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'application_started';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'underwriting';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'closed';

-- Add last_activity_at and is_stuck to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_activity_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_stuck boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_leads_last_activity ON public.leads(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_leads_is_stuck ON public.leads(is_stuck) WHERE is_stuck = true;

-- Lead stage history / audit log
CREATE TABLE public.lead_stage_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  trigger_event text,
  trigger_event_id uuid,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_stage_history_lead ON public.lead_stage_history(lead_id);
ALTER TABLE public.lead_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history for own leads"
ON public.lead_stage_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_stage_history.lead_id
    AND (leads.assigned_to = auth.uid() OR leads.created_by = auth.uid())
  )
);

CREATE POLICY "Admins full access to stage history"
ON public.lead_stage_history FOR ALL TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Service can insert stage history"
ON public.lead_stage_history FOR INSERT TO public
WITH CHECK (true);

-- Pipeline progression trigger function
CREATE OR REPLACE FUNCTION public.auto_progress_lead_pipeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status text;
  new_status text;
  current_score integer;
  stage_order integer[];
  current_order integer;
  new_order integer;
  -- Stage ordering: higher = further in pipeline
  -- new=1, contacted=2, pre_qualified=3, qualified=3, application_started=4, underwriting=5, approved=6, closed=7, converted=7
BEGIN
  -- Update last_activity_at
  UPDATE public.leads SET last_activity_at = now(), is_stuck = false WHERE id = NEW.lead_id;

  -- Get current status and score
  SELECT status::text, COALESCE(lead_score, 0) INTO current_status, current_score
  FROM public.leads WHERE id = NEW.lead_id;

  IF current_status IS NULL THEN RETURN NEW; END IF;

  -- Determine new status based on event
  CASE NEW.event_type
    WHEN 'form_submit' THEN new_status := 'new';
    WHEN 'contact_made' THEN new_status := 'contacted';
    WHEN 'calculator_used', 'multiple_visits', 'cta_click' THEN
      IF (current_score + NEW.points) >= 60 THEN
        new_status := 'pre_qualified';
      ELSE
        new_status := NULL;
      END IF;
    WHEN 'application_started' THEN new_status := 'application_started';
    WHEN 'documents_uploaded' THEN new_status := 'underwriting';
    WHEN 'application_approved' THEN new_status := 'approved';
    WHEN 'loan_closed' THEN new_status := 'closed';
    ELSE new_status := NULL;
  END CASE;

  IF new_status IS NULL OR new_status = current_status THEN RETURN NEW; END IF;

  -- Get stage order for forward-only check
  current_order := CASE current_status
    WHEN 'new' THEN 1
    WHEN 'contacted' THEN 2
    WHEN 'qualified' THEN 3
    WHEN 'pre_qualified' THEN 3
    WHEN 'application_started' THEN 4
    WHEN 'underwriting' THEN 5
    WHEN 'approved' THEN 6
    WHEN 'converted' THEN 7
    WHEN 'closed' THEN 7
    WHEN 'lost' THEN 0
    WHEN 'unqualified' THEN 0
    ELSE 0
  END;

  new_order := CASE new_status
    WHEN 'new' THEN 1
    WHEN 'contacted' THEN 2
    WHEN 'qualified' THEN 3
    WHEN 'pre_qualified' THEN 3
    WHEN 'application_started' THEN 4
    WHEN 'underwriting' THEN 5
    WHEN 'approved' THEN 6
    WHEN 'converted' THEN 7
    WHEN 'closed' THEN 7
    ELSE 0
  END;

  -- Only allow forward progression
  IF new_order <= current_order THEN RETURN NEW; END IF;

  -- Update lead status
  UPDATE public.leads SET status = new_status::lead_status WHERE id = NEW.lead_id;

  -- Log stage change
  INSERT INTO public.lead_stage_history (lead_id, old_status, new_status, trigger_event, trigger_event_id)
  VALUES (NEW.lead_id, current_status, new_status, NEW.event_type, NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_pipeline_progression
AFTER INSERT ON public.lead_events
FOR EACH ROW
EXECUTE FUNCTION public.auto_progress_lead_pipeline();
