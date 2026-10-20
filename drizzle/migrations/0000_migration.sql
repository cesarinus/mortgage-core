CREATE TABLE public.website_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL UNIQUE,
  lead_id uuid,
  site text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  visit_count integer NOT NULL DEFAULT 1,
  pageview_count integer NOT NULL DEFAULT 0,
  intent_score integer NOT NULL DEFAULT 0,
  utm_source text, utm_medium text, utm_campaign text,
  first_referrer text,
  device text,
  last_alert_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_website_visitors_lead ON public.website_visitors(lead_id);
CREATE INDEX idx_website_visitors_last_seen ON public.website_visitors(last_seen_at DESC);

CREATE TABLE public.website_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  lead_id uuid,
  site text,
  event_type text NOT NULL,
  path text,
  points integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_website_events_visitor ON public.website_events(visitor_id, created_at DESC);
CREATE INDEX idx_website_events_lead ON public.website_events(lead_id, created_at DESC);

GRANT SELECT ON public.website_visitors TO authenticated;
GRANT SELECT ON public.website_events TO authenticated;
GRANT ALL ON public.website_visitors TO service_role;
GRANT ALL ON public.website_events TO service_role;

ALTER TABLE public.website_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view visitors" ON public.website_visitors FOR SELECT TO authenticated
USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = website_visitors.lead_id AND (l.assigned_to = auth.uid() OR l.created_by = auth.uid())));
CREATE POLICY "Staff view web events" ON public.website_events FOR SELECT TO authenticated
USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = website_events.lead_id AND (l.assigned_to = auth.uid() OR l.created_by = auth.uid())));