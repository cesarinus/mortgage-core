
-- Lead events table for tracking all lead interactions
CREATE TABLE public.lead_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_events_lead_id ON public.lead_events(lead_id);
CREATE INDEX idx_lead_events_type ON public.lead_events(event_type);
CREATE INDEX idx_lead_events_created ON public.lead_events(created_at DESC);

ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for own leads"
ON public.lead_events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_events.lead_id
    AND (leads.assigned_to = auth.uid() OR leads.created_by = auth.uid())
  )
);

CREATE POLICY "Admins full access to lead events"
ON public.lead_events FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Service can insert events"
ON public.lead_events FOR INSERT TO public
WITH CHECK (true);

-- Lead tags table for dynamic labels
CREATE TABLE public.lead_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(lead_id, tag)
);

CREATE INDEX idx_lead_tags_lead_id ON public.lead_tags(lead_id);
CREATE INDEX idx_lead_tags_tag ON public.lead_tags(tag);

ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tags for own leads"
ON public.lead_tags FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_tags.lead_id
    AND (leads.assigned_to = auth.uid() OR leads.created_by = auth.uid())
  )
);

CREATE POLICY "Users can manage tags for own leads"
ON public.lead_tags FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_tags.lead_id
    AND (leads.assigned_to = auth.uid() OR leads.created_by = auth.uid())
  )
);

CREATE POLICY "Users can delete tags for own leads"
ON public.lead_tags FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_tags.lead_id
    AND (leads.assigned_to = auth.uid() OR leads.created_by = auth.uid())
  )
);

CREATE POLICY "Admins full access to lead tags"
ON public.lead_tags FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Trigger function: auto-update lead_score when event is inserted
CREATE OR REPLACE FUNCTION public.update_lead_score_on_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.leads
  SET lead_score = COALESCE(lead_score, 0) + NEW.points
  WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_lead_score
AFTER INSERT ON public.lead_events
FOR EACH ROW
EXECUTE FUNCTION public.update_lead_score_on_event();
