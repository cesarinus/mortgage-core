
-- Track distribution state per URL
CREATE TABLE public.content_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  content_hash text,
  last_title text,
  last_excerpt text,
  last_type text,
  last_triggered_at timestamptz,
  trigger_count integer NOT NULL DEFAULT 0,
  last_payload jsonb,
  last_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_change_log_url ON public.content_change_log(url);

ALTER TABLE public.content_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage content_change_log"
  ON public.content_change_log FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE TRIGGER trg_content_change_log_updated
  BEFORE UPDATE ON public.content_change_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger function: fire content-ping when published blog posts change meaningfully
CREATE OR REPLACE FUNCTION public.notify_blog_post_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text;
  v_event_type text;
  v_should_fire boolean := false;
  v_changed_fields text[] := ARRAY[]::text[];
  v_func_url text := 'https://hyskofjwotohgdtocsie.supabase.co/functions/v1/content-ping';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5c2tvZmp3b3RvaGdkdG9jc2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NjcxODUsImV4cCI6MjA4NjA0MzE4NX0.2M5GNKjxatuYJ2cG3kwHjcrwdK8CTRXwPerdv__J8vQ';
BEGIN
  -- Only care about published posts
  IF NEW.status::text <> 'published' THEN
    RETURN NEW;
  END IF;

  v_url := 'https://ngcapital.net/blog/' || NEW.slug;

  IF TG_OP = 'INSERT' THEN
    v_event_type := 'create';
    v_should_fire := true;
    v_changed_fields := ARRAY['title','content','excerpt'];
  ELSIF TG_OP = 'UPDATE' THEN
    -- Going from draft -> published counts as create
    IF OLD.status::text <> 'published' THEN
      v_event_type := 'create';
      v_should_fire := true;
      v_changed_fields := ARRAY['title','content','excerpt'];
    ELSE
      v_event_type := 'update';
      IF OLD.title IS DISTINCT FROM NEW.title THEN
        v_changed_fields := array_append(v_changed_fields, 'title');
      END IF;
      IF OLD.excerpt IS DISTINCT FROM NEW.excerpt THEN
        v_changed_fields := array_append(v_changed_fields, 'excerpt');
      END IF;
      IF OLD.content_html IS DISTINCT FROM NEW.content_html THEN
        v_changed_fields := array_append(v_changed_fields, 'content');
      END IF;
      IF OLD.meta_title IS DISTINCT FROM NEW.meta_title THEN
        v_changed_fields := array_append(v_changed_fields, 'meta_title');
      END IF;
      IF OLD.meta_description IS DISTINCT FROM NEW.meta_description THEN
        v_changed_fields := array_append(v_changed_fields, 'meta_description');
      END IF;
      v_should_fire := array_length(v_changed_fields, 1) > 0;
    END IF;
  END IF;

  IF NOT v_should_fire THEN
    RETURN NEW;
  END IF;

  PERFORM extensions.http_post(
    url := v_func_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon,
      'x-trigger-source', 'db-trigger'
    ),
    body := jsonb_build_object(
      'url', v_url,
      'type', v_event_type,
      'title', NEW.title,
      'excerpt', COALESCE(NEW.excerpt, NEW.meta_description, ''),
      'image', NEW.featured_image,
      'content', NEW.content_html,
      'changedFields', v_changed_fields,
      'postId', NEW.id,
      'tags', NEW.tags,
      'category', NEW.category
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_blog_post_distribute
  AFTER INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_blog_post_change();
