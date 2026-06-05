
-- Unify lead/opportunity stage model.
-- Renames keep existing rows intact (enum OIDs unchanged).
ALTER TYPE lead_status RENAME VALUE 'new' TO 'new_lead';
ALTER TYPE lead_status RENAME VALUE 'pre_qualified' TO 'prequalified';
ALTER TYPE lead_status RENAME VALUE 'application_started' TO 'application_sent';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'clear_to_close';

-- Map deprecated statuses to canonical ones.
UPDATE public.leads SET status = 'lost'   WHERE status::text = 'unqualified';
UPDATE public.leads SET status = 'closed' WHERE status::text = 'converted';

-- Update default to match new canonical "new_lead".
ALTER TABLE public.leads ALTER COLUMN status SET DEFAULT 'new_lead'::lead_status;

-- LOS sync staging columns on leads (additive only).
DO $$ BEGIN
  CREATE TYPE public.los_sync_status_enum AS ENUM ('pending','synced','error','skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS los_sync_status public.los_sync_status_enum NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS los_application_id text,
  ADD COLUMN IF NOT EXISTS property_address text,
  ADD COLUMN IF NOT EXISTS loan_amount numeric;

-- LOS sync queue (additive table).
CREATE TABLE IF NOT EXISTS public.los_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  los_application_id text,
  sync_status text NOT NULL DEFAULT 'pending',
  last_error text,
  retry_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.los_sync_queue TO authenticated;
GRANT ALL ON public.los_sync_queue TO service_role;

ALTER TABLE public.los_sync_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins all los_sync_queue" ON public.los_sync_queue;
CREATE POLICY "admins all los_sync_queue"
  ON public.los_sync_queue
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "lead owners read los_sync_queue" ON public.los_sync_queue;
CREATE POLICY "lead owners read los_sync_queue"
  ON public.los_sync_queue
  FOR SELECT
  TO authenticated
  USING (public.user_owns_lead(opportunity_id));

DROP POLICY IF EXISTS "lead owners insert los_sync_queue" ON public.los_sync_queue;
CREATE POLICY "lead owners insert los_sync_queue"
  ON public.los_sync_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_owns_lead(opportunity_id));

DROP POLICY IF EXISTS "lead owners update los_sync_queue" ON public.los_sync_queue;
CREATE POLICY "lead owners update los_sync_queue"
  ON public.los_sync_queue
  FOR UPDATE
  TO authenticated
  USING (public.user_owns_lead(opportunity_id));

CREATE INDEX IF NOT EXISTS los_sync_queue_status_idx
  ON public.los_sync_queue (sync_status);
CREATE INDEX IF NOT EXISTS los_sync_queue_opportunity_idx
  ON public.los_sync_queue (opportunity_id);

DROP TRIGGER IF EXISTS los_sync_queue_set_updated_at ON public.los_sync_queue;
CREATE TRIGGER los_sync_queue_set_updated_at
  BEFORE UPDATE ON public.los_sync_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Refresh the lead auto-progress function to use the unified stage names.
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
        new_status := 'prequalified';
      ELSE
        new_status := NULL;
      END IF;
    WHEN 'application_started' THEN new_status := 'application_sent';
    WHEN 'documents_uploaded' THEN new_status := 'underwriting';
    WHEN 'application_approved' THEN new_status := 'approved';
    WHEN 'loan_closed' THEN new_status := 'closed';
    ELSE new_status := NULL;
  END CASE;

  IF new_status IS NULL OR new_status = current_status THEN RETURN NEW; END IF;

  current_order := CASE current_status
    WHEN 'new_lead' THEN 1
    WHEN 'contacted' THEN 2
    WHEN 'prequalified' THEN 3
    WHEN 'qualified' THEN 4
    WHEN 'application_sent' THEN 5
    WHEN 'underwriting' THEN 6
    WHEN 'approved' THEN 7
    WHEN 'clear_to_close' THEN 8
    WHEN 'closed' THEN 9
    WHEN 'lost' THEN 0
    ELSE 0
  END;

  new_order := CASE new_status
    WHEN 'new_lead' THEN 1
    WHEN 'contacted' THEN 2
    WHEN 'prequalified' THEN 3
    WHEN 'qualified' THEN 4
    WHEN 'application_sent' THEN 5
    WHEN 'underwriting' THEN 6
    WHEN 'approved' THEN 7
    WHEN 'clear_to_close' THEN 8
    WHEN 'closed' THEN 9
    ELSE 0
  END;

  IF new_order <= current_order THEN RETURN NEW; END IF;

  UPDATE public.leads SET status = new_status::lead_status WHERE id = NEW.lead_id;

  INSERT INTO public.lead_stage_history (lead_id, old_status, new_status, trigger_event, trigger_event_id)
  VALUES (NEW.lead_id, current_status, new_status, NEW.event_type, NEW.id);

  RETURN NEW;
END;
$function$;
