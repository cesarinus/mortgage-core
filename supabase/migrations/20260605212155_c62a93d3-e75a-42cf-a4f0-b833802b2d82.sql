
CREATE OR REPLACE FUNCTION public.run_document_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','net'
AS $function$
DECLARE
  v_url text := 'https://hyskofjwotohgdtocsie.supabase.co/functions/v1/send-email';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5c2tvZmp3b3RvaGdkdG9jc2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NjcxODUsImV4cCI6MjA4NjA0MzE4NX0.2M5GNKjxatuYJ2cG3kwHjcrwdK8CTRXwPerdv__J8vQ';
  r record;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT l.id, l.email, l.first_name
    FROM public.leads l
    WHERE l.status::text = 'qualified'
      AND l.email IS NOT NULL
      AND COALESCE(l.last_activity_at, l.created_at) < now() - interval '3 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.crm_attachments a WHERE a.lead_id = l.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.email_logs el
        WHERE el.lead_id = l.id
          AND el.template_alias = 'document-reminder'
          AND el.sent_at > now() - interval '7 days'
      )
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'Authorization','Bearer ' || v_anon
        ),
        body := jsonb_build_object(
          'template_alias','document-reminder',
          'to', r.email,
          'lead_id', r.id,
          'vars', jsonb_build_object(
            'first_name', COALESCE(r.first_name,''),
            'portal_link','https://ngcapital.net/portal/login'
          )
        )
      );
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'doc reminder failed for %: %', r.id, SQLERRM;
    END;
  END LOOP;
  RETURN v_count;
END;
$function$;
