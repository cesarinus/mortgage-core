
-- =====================================================
-- CRM RECORD WORKSPACE - extension-only migration
-- =====================================================

-- Helper: ownership check for a lead
CREATE OR REPLACE FUNCTION public.user_owns_lead(_lead_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leads
    WHERE id = _lead_id
      AND (assigned_to = auth.uid() OR created_by = auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.user_owns_contact(_contact_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contacts
    WHERE id = _contact_id AND created_by = auth.uid()
  )
$$;

-- =====================================================
-- crm_activities (unified timeline)
-- =====================================================
CREATE TABLE public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  activity_type text NOT NULL, -- note, task, call, meeting, email, attachment, system, status_change
  ref_id uuid,
  actor_id uuid,
  title text,
  body text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_activities_lead ON public.crm_activities(lead_id, created_at DESC);
CREATE INDEX idx_crm_activities_contact ON public.crm_activities(contact_id, created_at DESC);
CREATE INDEX idx_crm_activities_type ON public.crm_activities(activity_type);
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all activities" ON public.crm_activities FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "owners read activities" ON public.crm_activities FOR SELECT TO authenticated
  USING (
    (lead_id IS NOT NULL AND user_owns_lead(lead_id))
    OR (contact_id IS NOT NULL AND user_owns_contact(contact_id))
  );
CREATE POLICY "owners insert activities" ON public.crm_activities FOR INSERT TO authenticated
  WITH CHECK (
    (lead_id IS NOT NULL AND user_owns_lead(lead_id))
    OR (contact_id IS NOT NULL AND user_owns_contact(contact_id))
  );

-- =====================================================
-- crm_notes
-- =====================================================
CREATE TABLE public.crm_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  body_html text NOT NULL DEFAULT '',
  is_pinned boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_notes_lead ON public.crm_notes(lead_id);
CREATE INDEX idx_crm_notes_contact ON public.crm_notes(contact_id);
ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all notes" ON public.crm_notes FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "owners read notes" ON public.crm_notes FOR SELECT TO authenticated
  USING (
    (lead_id IS NOT NULL AND user_owns_lead(lead_id))
    OR (contact_id IS NOT NULL AND user_owns_contact(contact_id))
  );
CREATE POLICY "owners insert notes" ON public.crm_notes FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND ((lead_id IS NOT NULL AND user_owns_lead(lead_id))
         OR (contact_id IS NOT NULL AND user_owns_contact(contact_id)))
  );
CREATE POLICY "owners update notes" ON public.crm_notes FOR UPDATE TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY "owners delete notes" ON public.crm_notes FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE TRIGGER crm_notes_updated BEFORE UPDATE ON public.crm_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- crm_tasks
-- =====================================================
CREATE TABLE public.crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_at timestamptz,
  priority text NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  status text NOT NULL DEFAULT 'open', -- open, in_progress, completed, cancelled
  assignee_id uuid,
  created_by uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_tasks_lead ON public.crm_tasks(lead_id);
CREATE INDEX idx_crm_tasks_contact ON public.crm_tasks(contact_id);
CREATE INDEX idx_crm_tasks_due ON public.crm_tasks(due_at);
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all tasks" ON public.crm_tasks FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "owners read tasks" ON public.crm_tasks FOR SELECT TO authenticated
  USING (
    assignee_id = auth.uid() OR created_by = auth.uid()
    OR (lead_id IS NOT NULL AND user_owns_lead(lead_id))
    OR (contact_id IS NOT NULL AND user_owns_contact(contact_id))
  );
CREATE POLICY "owners insert tasks" ON public.crm_tasks FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "owners update tasks" ON public.crm_tasks FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR assignee_id = auth.uid());
CREATE POLICY "owners delete tasks" ON public.crm_tasks FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE TRIGGER crm_tasks_updated BEFORE UPDATE ON public.crm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- crm_calls
-- =====================================================
CREATE TABLE public.crm_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'outbound', -- inbound, outbound
  outcome text, -- connected, voicemail, no_answer, busy, scheduled_callback
  duration_sec integer DEFAULT 0,
  notes text,
  follow_up_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_calls_lead ON public.crm_calls(lead_id);
ALTER TABLE public.crm_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all calls" ON public.crm_calls FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "owners read calls" ON public.crm_calls FOR SELECT TO authenticated
  USING (
    (lead_id IS NOT NULL AND user_owns_lead(lead_id))
    OR (contact_id IS NOT NULL AND user_owns_contact(contact_id))
  );
CREATE POLICY "owners insert calls" ON public.crm_calls FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "owners update calls" ON public.crm_calls FOR UPDATE TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY "owners delete calls" ON public.crm_calls FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- =====================================================
-- crm_meetings
-- =====================================================
CREATE TABLE public.crm_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  location text,
  video_link text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_meetings_lead ON public.crm_meetings(lead_id);
ALTER TABLE public.crm_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all meetings" ON public.crm_meetings FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "owners read meetings" ON public.crm_meetings FOR SELECT TO authenticated
  USING (
    (lead_id IS NOT NULL AND user_owns_lead(lead_id))
    OR (contact_id IS NOT NULL AND user_owns_contact(contact_id))
  );
CREATE POLICY "owners insert meetings" ON public.crm_meetings FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "owners update meetings" ON public.crm_meetings FOR UPDATE TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY "owners delete meetings" ON public.crm_meetings FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE TRIGGER crm_meetings_updated BEFORE UPDATE ON public.crm_meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- crm_document_categories
-- =====================================================
CREATE TABLE public.crm_document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_document_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read categories" ON public.crm_document_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage categories" ON public.crm_document_categories FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

INSERT INTO public.crm_document_categories (name, slug, sort_order) VALUES
  ('Tax Returns', 'tax-returns', 10),
  ('W-2s', 'w2', 20),
  ('Pay Stubs', 'pay-stubs', 30),
  ('Bank Statements', 'bank-statements', 40),
  ('IDs', 'ids', 50),
  ('Credit Documents', 'credit', 60),
  ('VOE', 'voe', 70),
  ('1099s', '1099', 80),
  ('Business Tax Returns', 'business-tax-returns', 90),
  ('Profit & Loss Statements', 'profit-and-loss', 100),
  ('Other', 'other', 999);

-- =====================================================
-- crm_attachments
-- =====================================================
CREATE TABLE public.crm_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  category_slug text,
  file_name text NOT NULL,
  file_path text NOT NULL,
  mime_type text,
  size_bytes bigint DEFAULT 0,
  expires_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_attachments_lead ON public.crm_attachments(lead_id);
ALTER TABLE public.crm_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all attachments" ON public.crm_attachments FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "owners read attachments" ON public.crm_attachments FOR SELECT TO authenticated
  USING (
    (lead_id IS NOT NULL AND user_owns_lead(lead_id))
    OR (contact_id IS NOT NULL AND user_owns_contact(contact_id))
  );
CREATE POLICY "owners insert attachments" ON public.crm_attachments FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "owners delete attachments" ON public.crm_attachments FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- =====================================================
-- crm_companies + link table
-- =====================================================
CREATE TABLE public.crm_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website text,
  industry text,
  employer_contact_name text,
  employer_contact_phone text,
  is_self_employed boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins all companies" ON public.crm_companies FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "auth read companies" ON public.crm_companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert companies" ON public.crm_companies FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "owners update companies" ON public.crm_companies FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE TRIGGER crm_companies_updated BEFORE UPDATE ON public.crm_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.crm_contact_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.crm_companies(id) ON DELETE CASCADE,
  role text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_cc_lead ON public.crm_contact_companies(lead_id);
CREATE INDEX idx_crm_cc_contact ON public.crm_contact_companies(contact_id);
ALTER TABLE public.crm_contact_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins all cc" ON public.crm_contact_companies FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "owners read cc" ON public.crm_contact_companies FOR SELECT TO authenticated
  USING (
    (lead_id IS NOT NULL AND user_owns_lead(lead_id))
    OR (contact_id IS NOT NULL AND user_owns_contact(contact_id))
  );
CREATE POLICY "owners insert cc" ON public.crm_contact_companies FOR INSERT TO authenticated
  WITH CHECK (
    (lead_id IS NOT NULL AND user_owns_lead(lead_id))
    OR (contact_id IS NOT NULL AND user_owns_contact(contact_id))
  );
CREATE POLICY "owners delete cc" ON public.crm_contact_companies FOR DELETE TO authenticated
  USING (
    (lead_id IS NOT NULL AND user_owns_lead(lead_id))
    OR (contact_id IS NOT NULL AND user_owns_contact(contact_id))
  );

-- =====================================================
-- mortgage_profiles
-- =====================================================
CREATE TABLE public.mortgage_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid UNIQUE REFERENCES public.leads(id) ON DELETE CASCADE,
  loan_program text,
  purchase_price numeric,
  down_payment numeric,
  occupancy_type text,
  property_type text,
  est_income numeric,
  est_dti numeric,
  est_monthly_payment numeric,
  pipeline_stage text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mortgage_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins all mp" ON public.mortgage_profiles FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "owners read mp" ON public.mortgage_profiles FOR SELECT TO authenticated
  USING (lead_id IS NOT NULL AND user_owns_lead(lead_id));
CREATE POLICY "owners upsert mp" ON public.mortgage_profiles FOR INSERT TO authenticated
  WITH CHECK (lead_id IS NOT NULL AND user_owns_lead(lead_id));
CREATE POLICY "owners update mp" ON public.mortgage_profiles FOR UPDATE TO authenticated
  USING (lead_id IS NOT NULL AND user_owns_lead(lead_id));

CREATE TRIGGER mortgage_profiles_updated BEFORE UPDATE ON public.mortgage_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- lead_sentiment
-- =====================================================
CREATE TABLE public.lead_sentiment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid UNIQUE REFERENCES public.leads(id) ON DELETE CASCADE,
  temperature text NOT NULL DEFAULT 'warm', -- hot, warm, cold, unresponsive, ready
  summary text,
  recommendations jsonb DEFAULT '[]'::jsonb,
  challenges jsonb DEFAULT '[]'::jsonb,
  positives jsonb DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_sentiment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins all sentiment" ON public.lead_sentiment FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "owners read sentiment" ON public.lead_sentiment FOR SELECT TO authenticated
  USING (lead_id IS NOT NULL AND user_owns_lead(lead_id));
CREATE POLICY "owners upsert sentiment" ON public.lead_sentiment FOR INSERT TO authenticated
  WITH CHECK (lead_id IS NOT NULL AND user_owns_lead(lead_id));
CREATE POLICY "owners update sentiment" ON public.lead_sentiment FOR UPDATE TO authenticated
  USING (lead_id IS NOT NULL AND user_owns_lead(lead_id));

-- =====================================================
-- Activity-fan-out triggers
-- =====================================================
CREATE OR REPLACE FUNCTION public.crm_log_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_type text := TG_ARGV[0];
  v_title text;
  v_body text;
BEGIN
  IF v_type = 'note' THEN
    v_title := 'Note added';
    v_body := left(regexp_replace(NEW.body_html, '<[^>]+>', '', 'g'), 280);
  ELSIF v_type = 'task' THEN
    v_title := NEW.title;
    v_body := COALESCE(NEW.description, '');
  ELSIF v_type = 'call' THEN
    v_title := COALESCE('Call - ' || NEW.outcome, 'Call logged');
    v_body := COALESCE(NEW.notes, '');
  ELSIF v_type = 'meeting' THEN
    v_title := NEW.title;
    v_body := COALESCE(NEW.notes, '');
  ELSIF v_type = 'attachment' THEN
    v_title := 'Uploaded ' || NEW.file_name;
    v_body := COALESCE(NEW.category_slug, '');
  END IF;

  INSERT INTO public.crm_activities (lead_id, contact_id, activity_type, ref_id, actor_id, title, body)
  VALUES (NEW.lead_id, NEW.contact_id, v_type, NEW.id,
          COALESCE(NEW.created_by, NEW.uploaded_by), v_title, v_body);
  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_notes_activity AFTER INSERT ON public.crm_notes
  FOR EACH ROW EXECUTE FUNCTION public.crm_log_activity('note');
CREATE TRIGGER crm_tasks_activity AFTER INSERT ON public.crm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.crm_log_activity('task');
CREATE TRIGGER crm_calls_activity AFTER INSERT ON public.crm_calls
  FOR EACH ROW EXECUTE FUNCTION public.crm_log_activity('call');
CREATE TRIGGER crm_meetings_activity AFTER INSERT ON public.crm_meetings
  FOR EACH ROW EXECUTE FUNCTION public.crm_log_activity('meeting');
CREATE TRIGGER crm_attachments_activity AFTER INSERT ON public.crm_attachments
  FOR EACH ROW EXECUTE FUNCTION public.crm_log_activity('attachment');

-- =====================================================
-- Storage bucket: crm-documents (private)
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('crm-documents', 'crm-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "crm docs admin all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'crm-documents' AND is_admin())
  WITH CHECK (bucket_id = 'crm-documents' AND is_admin());

CREATE POLICY "crm docs owners read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'crm-documents'
    AND user_owns_lead( ((storage.foldername(name))[1])::uuid )
  );

CREATE POLICY "crm docs owners insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'crm-documents'
    AND user_owns_lead( ((storage.foldername(name))[1])::uuid )
  );

CREATE POLICY "crm docs owners delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'crm-documents'
    AND user_owns_lead( ((storage.foldername(name))[1])::uuid )
  );
