
-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function: notifies edge function when a lead's status changes
CREATE OR REPLACE FUNCTION public.notify_lead_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text := 'https://hyskofjwotohgdtocsie.supabase.co/functions/v1/notify-lead-event';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5c2tvZmp3b3RvaGdkdG9jc2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NjcxODUsImV4cCI6MjA4NjA0MzE4NX0.2M5GNKjxatuYJ2cG3kwHjcrwdK8CTRXwPerdv__J8vQ';
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM extensions.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon
      ),
      body := jsonb_build_object(
        'event', 'status_change',
        'lead_id', NEW.id,
        'first_name', NEW.first_name,
        'last_name', NEW.last_name,
        'email', NEW.email,
        'phone', NEW.phone,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'loan_purpose', NEW.loan_purpose,
        'property_value', NEW.property_value,
        'lead_score', NEW.lead_score,
        'source', NEW.source
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_lead_status_change ON public.leads;
CREATE TRIGGER trg_notify_lead_status_change
AFTER UPDATE OF status ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_lead_status_change();
