
-- ============================================================
-- BORROWER PORTAL
-- ============================================================

-- 1. portal_invites -------------------------------------------------
CREATE TABLE public.portal_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  lead_id uuid,
  contact_id uuid,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_portal_invites_deal ON public.portal_invites(deal_id);
CREATE INDEX idx_portal_invites_email ON public.portal_invites(lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_invites TO authenticated;
GRANT ALL ON public.portal_invites TO service_role;

ALTER TABLE public.portal_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage invites" ON public.portal_invites
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "LOs manage own deal invites" ON public.portal_invites
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = portal_invites.deal_id
      AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid())
  ))
  WITH CHECK (created_by = auth.uid() AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = portal_invites.deal_id
      AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid())
  ));

-- 2. portal_users ---------------------------------------------------
CREATE TABLE public.portal_users (
  user_id uuid PRIMARY KEY,
  deal_id uuid NOT NULL,
  lead_id uuid,
  contact_id uuid,
  invite_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_portal_users_deal ON public.portal_users(deal_id);

GRANT SELECT ON public.portal_users TO authenticated;
GRANT ALL ON public.portal_users TO service_role;

ALTER TABLE public.portal_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "borrower reads own binding" ON public.portal_users
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "admins manage portal_users" ON public.portal_users
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "LO reads bindings for own deals" ON public.portal_users
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = portal_users.deal_id
      AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid())
  ));

-- 3. Helper functions ----------------------------------------------
CREATE OR REPLACE FUNCTION public.current_portal_user_deal()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT deal_id FROM public.portal_users WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_portal_user_for_deal(_deal_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portal_users
    WHERE user_id = auth.uid() AND deal_id = _deal_id
  )
$$;

-- 4. portal_messages -----------------------------------------------
CREATE TABLE public.portal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  sender_user_id uuid NOT NULL DEFAULT auth.uid(),
  sender_role text NOT NULL CHECK (sender_role IN ('borrower','officer')),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_portal_messages_deal_time ON public.portal_messages(deal_id, created_at);

GRANT SELECT, INSERT, UPDATE ON public.portal_messages TO authenticated;
GRANT ALL ON public.portal_messages TO service_role;

ALTER TABLE public.portal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all messages" ON public.portal_messages
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "deal participants read messages" ON public.portal_messages
  FOR SELECT TO authenticated USING (
    is_portal_user_for_deal(deal_id) OR EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = portal_messages.deal_id
        AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid())
    )
  );

CREATE POLICY "borrower sends own messages" ON public.portal_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_user_id = auth.uid() AND sender_role = 'borrower'
      AND is_portal_user_for_deal(deal_id)
  );

CREATE POLICY "officer sends own messages" ON public.portal_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_user_id = auth.uid() AND sender_role = 'officer'
      AND EXISTS (
        SELECT 1 FROM public.deals d
        WHERE d.id = portal_messages.deal_id
          AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid())
      )
  );

CREATE POLICY "participants mark read" ON public.portal_messages
  FOR UPDATE TO authenticated USING (
    is_portal_user_for_deal(deal_id) OR EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = portal_messages.deal_id
        AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid())
    )
  );

-- 5. loan_scenario_acknowledgements --------------------------------
CREATE TABLE public.loan_scenario_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL,
  deal_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  ip text,
  user_agent text
);
CREATE INDEX idx_lsa_scenario ON public.loan_scenario_acknowledgements(scenario_id);

GRANT SELECT, INSERT ON public.loan_scenario_acknowledgements TO authenticated;
GRANT ALL ON public.loan_scenario_acknowledgements TO service_role;

ALTER TABLE public.loan_scenario_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all acks" ON public.loan_scenario_acknowledgements
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "borrower inserts own ack" ON public.loan_scenario_acknowledgements
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND is_portal_user_for_deal(deal_id)
  );

CREATE POLICY "borrower reads own acks" ON public.loan_scenario_acknowledgements
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "LO reads acks for own deals" ON public.loan_scenario_acknowledgements
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = loan_scenario_acknowledgements.deal_id
      AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid())
  ));

-- 6. Borrower-scoped read policies on existing CRM tables ----------
-- deals: let bound borrower read their own deal
CREATE POLICY "borrower reads own deal" ON public.deals
  FOR SELECT TO authenticated USING (is_portal_user_for_deal(id));

-- deal_stage_history
CREATE POLICY "borrower reads own deal history" ON public.deal_stage_history
  FOR SELECT TO authenticated USING (is_portal_user_for_deal(deal_id));

-- loan_scenarios: borrower reads scenarios for their lead
CREATE POLICY "borrower reads own scenarios" ON public.loan_scenarios
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.portal_users pu
    WHERE pu.user_id = auth.uid() AND pu.lead_id = loan_scenarios.lead_id
  ));

-- crm_attachments: borrower reads + inserts their own deal's docs
CREATE POLICY "borrower reads own attachments" ON public.crm_attachments
  FOR SELECT TO authenticated USING (
    deal_id IS NOT NULL AND is_portal_user_for_deal(deal_id)
  );

CREATE POLICY "borrower uploads own attachments" ON public.crm_attachments
  FOR INSERT TO authenticated WITH CHECK (
    uploaded_by = auth.uid()
      AND deal_id IS NOT NULL
      AND is_portal_user_for_deal(deal_id)
  );

-- crm_document_categories: already readable by authenticated via existing policy

-- 7. Storage policies on crm-documents -----------------------------
-- Borrower files live under: portal/<deal_id>/<filename>
CREATE POLICY "borrower reads own portal files" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'crm-documents'
    AND (storage.foldername(name))[1] = 'portal'
    AND public.is_portal_user_for_deal(((storage.foldername(name))[2])::uuid)
  );

CREATE POLICY "borrower uploads own portal files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'crm-documents'
    AND (storage.foldername(name))[1] = 'portal'
    AND public.is_portal_user_for_deal(((storage.foldername(name))[2])::uuid)
  );

CREATE POLICY "LO reads portal files for own deals" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'crm-documents'
    AND (storage.foldername(name))[1] = 'portal'
    AND EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = ((storage.foldername(name))[2])::uuid
        AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid())
    )
  );
