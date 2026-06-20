CREATE OR REPLACE FUNCTION public.crm_log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_type text := TG_ARGV[0];
  v_title text;
  v_body text;
  v_actor uuid;
BEGIN
  IF v_type = 'note' THEN
    v_title := 'Note added';
    v_body := left(regexp_replace(NEW.body_html, '<[^>]+>', '', 'g'), 280);
    v_actor := NEW.created_by;
  ELSIF v_type = 'task' THEN
    v_title := NEW.title;
    v_body := COALESCE(NEW.description, '');
    v_actor := NEW.created_by;
  ELSIF v_type = 'call' THEN
    v_title := COALESCE('Call - ' || NEW.outcome, 'Call logged');
    v_body := COALESCE(NEW.notes, '');
    v_actor := NEW.created_by;
  ELSIF v_type = 'meeting' THEN
    v_title := NEW.title;
    v_body := COALESCE(NEW.notes, '');
    v_actor := NEW.created_by;
  ELSIF v_type = 'attachment' THEN
    v_title := 'Uploaded ' || NEW.file_name;
    v_body := COALESCE(NEW.category_slug, '');
    v_actor := NEW.uploaded_by;
  END IF;

  INSERT INTO public.crm_activities (lead_id, contact_id, activity_type, ref_id, actor_id, title, body)
  VALUES (NEW.lead_id, NEW.contact_id, v_type, NEW.id,
          COALESCE(v_actor, auth.uid()), v_title, v_body);
  RETURN NEW;
END;
$function$;