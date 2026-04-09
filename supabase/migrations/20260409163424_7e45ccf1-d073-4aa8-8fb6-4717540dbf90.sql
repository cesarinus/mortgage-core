
-- Blog sessions table for anonymous visitor tracking
CREATE TABLE public.blog_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL UNIQUE,
  total_score integer NOT NULL DEFAULT 0,
  posts_viewed integer NOT NULL DEFAULT 0,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymous tracking)
CREATE POLICY "Anyone can create sessions"
  ON public.blog_sessions FOR INSERT
  TO public
  WITH CHECK (true);

-- Anyone can read their own session by session_id (matched in app)
CREATE POLICY "Anyone can read sessions"
  ON public.blog_sessions FOR SELECT
  TO public
  USING (true);

-- Anyone can update their own session (score aggregation)
CREATE POLICY "Anyone can update sessions"
  ON public.blog_sessions FOR UPDATE
  TO public
  USING (true);

-- Admins full access
CREATE POLICY "Admins full access to sessions"
  ON public.blog_sessions FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Blog events table
CREATE TABLE public.blog_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  post_id uuid REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert events"
  ON public.blog_events FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can read events"
  ON public.blog_events FOR SELECT
  TO authenticated
  USING (is_admin());

-- Add lead_score to leads table
ALTER TABLE public.leads ADD COLUMN lead_score integer DEFAULT 0;

-- Index for fast session lookups
CREATE INDEX idx_blog_sessions_session_id ON public.blog_sessions(session_id);
CREATE INDEX idx_blog_events_session_id ON public.blog_events(session_id);

-- Trigger for updated_at on blog_sessions
CREATE TRIGGER update_blog_sessions_updated_at
  BEFORE UPDATE ON public.blog_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
