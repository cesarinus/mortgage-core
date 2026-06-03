
-- Extend deal_stage enum (additive only; keep existing values)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'application_sent' AND enumtypid = 'public.deal_stage'::regtype) THEN
    ALTER TYPE public.deal_stage ADD VALUE 'application_sent';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'clear_to_close' AND enumtypid = 'public.deal_stage'::regtype) THEN
    ALTER TYPE public.deal_stage ADD VALUE 'clear_to_close';
  END IF;
END$$;

-- deal_document_status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deal_document_status') THEN
    CREATE TYPE public.deal_document_status AS ENUM ('missing','uploaded','verified');
  END IF;
END$$;

-- status_transitions
CREATE TABLE IF NOT EXISTS public.status_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead','deal')),
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, from_status, to_status)
);

GRANT SELECT ON public.status_transitions TO authenticated;
GRANT ALL ON public.status_transitions TO service_role;

ALTER TABLE public.status_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read transitions" ON public.status_transitions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage transitions" ON public.status_transitions
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Seed allowed transitions
INSERT INTO public.status_transitions (entity_type, from_status, to_status) VALUES
  ('lead','new','contacted'),
  ('lead','contacted','qualified'),
  ('lead','contacted','unqualified'),
  ('lead','qualified','unqualified'),
  ('deal','new_lead','contacted'),
  ('deal','contacted','application_sent'),
  ('deal','application_sent','underwriting'),
  ('deal','underwriting','approved'),
  ('deal','approved','clear_to_close'),
  ('deal','clear_to_close','closed'),
  ('deal','contacted','lost'),
  ('deal','application_sent','lost'),
  ('deal','underwriting','lost'),
  ('deal','approved','lost'),
  ('deal','clear_to_close','lost')
ON CONFLICT DO NOTHING;

-- stage_documents
CREATE TABLE IF NOT EXISTS public.stage_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage TEXT NOT NULL,
  label TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stage, label)
);

GRANT SELECT ON public.stage_documents TO authenticated;
GRANT ALL ON public.stage_documents TO service_role;

ALTER TABLE public.stage_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read stage_documents" ON public.stage_documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage stage_documents" ON public.stage_documents
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER update_stage_documents_updated_at
  BEFORE UPDATE ON public.stage_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed stage documents
INSERT INTO public.stage_documents (stage, label, required, sort_order) VALUES
  ('application_sent','W-9',true,10),
  ('application_sent','Pay stubs',true,20),
  ('application_sent','Bank statements',true,30),
  ('underwriting','Appraisal',true,10),
  ('underwriting','Credit authorization',true,20),
  ('underwriting','Purchase agreement',true,30),
  ('approved','Closing Disclosure',true,10),
  ('approved','Title insurance',true,20),
  ('approved','Homeowners insurance',true,30),
  ('clear_to_close','Final walk-through',true,10),
  ('clear_to_close','Closing funds confirmation',true,20)
ON CONFLICT (stage, label) DO NOTHING;

-- deal_documents
CREATE TABLE IF NOT EXISTS public.deal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL,
  stage_document_id UUID NOT NULL REFERENCES public.stage_documents(id) ON DELETE CASCADE,
  status public.deal_document_status NOT NULL DEFAULT 'missing',
  url TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (deal_id, stage_document_id)
);

CREATE INDEX IF NOT EXISTS idx_deal_documents_deal ON public.deal_documents(deal_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_documents TO authenticated;
GRANT ALL ON public.deal_documents TO service_role;

ALTER TABLE public.deal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins all deal_documents" ON public.deal_documents
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Deal owners read deal_documents" ON public.deal_documents
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_documents.deal_id
            AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid()))
  );

CREATE POLICY "Deal owners insert deal_documents" ON public.deal_documents
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_documents.deal_id
            AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid()))
  );

CREATE POLICY "Deal owners update deal_documents" ON public.deal_documents
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_documents.deal_id
            AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid()))
  );

CREATE POLICY "Deal owners delete deal_documents" ON public.deal_documents
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_documents.deal_id
            AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid()))
  );

CREATE POLICY "Borrower reads own deal_documents" ON public.deal_documents
  FOR SELECT TO authenticated USING (is_portal_user_for_deal(deal_id));

CREATE TRIGGER update_deal_documents_updated_at
  BEFORE UPDATE ON public.deal_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- deal_events (parallel to lead_events for deal stage transitions)
CREATE TABLE IF NOT EXISTS public.deal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  actor_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_events_deal ON public.deal_events(deal_id);

GRANT SELECT, INSERT ON public.deal_events TO authenticated;
GRANT ALL ON public.deal_events TO service_role;

ALTER TABLE public.deal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins all deal_events" ON public.deal_events
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Deal owners read deal_events" ON public.deal_events
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_events.deal_id
            AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid()))
  );

CREATE POLICY "Deal owners insert deal_events" ON public.deal_events
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_events.deal_id
            AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid()))
  );
