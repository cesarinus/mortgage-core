-- Many-to-many junction between leads and contacts
CREATE TABLE IF NOT EXISTS public.lead_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  role text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_contacts_lead ON public.lead_contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_contacts_contact ON public.lead_contacts(contact_id);

ALTER TABLE public.lead_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all lead_contacts"
  ON public.lead_contacts FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "owners read lead_contacts"
  ON public.lead_contacts FOR SELECT TO authenticated
  USING (user_owns_lead(lead_id));

CREATE POLICY "owners insert lead_contacts"
  ON public.lead_contacts FOR INSERT TO authenticated
  WITH CHECK (user_owns_lead(lead_id) AND created_by = auth.uid());

CREATE POLICY "owners delete lead_contacts"
  ON public.lead_contacts FOR DELETE TO authenticated
  USING (user_owns_lead(lead_id) OR created_by = auth.uid());

CREATE POLICY "owners update lead_contacts"
  ON public.lead_contacts FOR UPDATE TO authenticated
  USING (user_owns_lead(lead_id));

-- Backfill from contacts.lead_id legacy single FK
INSERT INTO public.lead_contacts (lead_id, contact_id, created_by)
SELECT c.lead_id, c.id, c.created_by
FROM public.contacts c
WHERE c.lead_id IS NOT NULL
ON CONFLICT DO NOTHING;