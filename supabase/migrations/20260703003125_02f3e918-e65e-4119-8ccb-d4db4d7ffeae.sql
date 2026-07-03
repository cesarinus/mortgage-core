CREATE OR REPLACE FUNCTION public.auto_progress_lead_pipeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.leads
  SET last_activity_at = now(), is_stuck = false
  WHERE id = NEW.lead_id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auto_pipeline_progression ON public.lead_events;
CREATE TRIGGER trg_auto_pipeline_progression
AFTER INSERT ON public.lead_events
FOR EACH ROW
EXECUTE FUNCTION public.auto_progress_lead_pipeline();