
-- 1. Link leads to portal account
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS portal_user_id uuid;
CREATE INDEX IF NOT EXISTS idx_leads_portal_user_id ON public.leads(portal_user_id);

-- Backfill from existing portal_users bindings
UPDATE public.leads l
SET portal_user_id = pu.user_id
FROM public.portal_users pu
WHERE pu.lead_id = l.id AND l.portal_user_id IS NULL;

-- 2. Search portal applicants
CREATE OR REPLACE FUNCTION public.search_portal_applicants(
  _email text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _name text DEFAULT NULL
)
RETURNS TABLE(
  portal_user_id uuid,
  deal_id uuid,
  lead_id uuid,
  person_id uuid,
  email text,
  full_name text,
  phone text,
  property_address text,
  loan_amount numeric,
  loan_type text,
  stage text,
  invite_accepted_at timestamptz,
  last_login_at timestamptz,
  started_at timestamptz,
  completion_pct integer,
  documents_uploaded integer,
  documents_required integer,
  match_reason text,
  confidence text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (
    SELECT public.normalize_email(_email) AS email_n,
           public.normalize_phone(_phone) AS phone_n,
           NULLIF(btrim(_name),'') AS name_q
  ),
  base AS (
    SELECT pu.user_id, pu.deal_id, pu.lead_id, pu.invite_id,
           pu.created_at AS bound_at,
           d.property_address, d.loan_amount, d.loan_type, d.stage::text AS stage,
           l.email AS lead_email, l.phone AS lead_phone, l.person_id,
           btrim(concat_ws(' ', l.first_name, l.last_name)) AS lead_name,
           pi.email AS invite_email, pi.accepted_at, pi.created_at AS invite_created_at,
           au.last_sign_in_at, au.created_at AS user_created_at
    FROM public.portal_users pu
    LEFT JOIN public.deals d ON d.id = pu.deal_id
    LEFT JOIN public.leads l ON l.id = pu.lead_id
    LEFT JOIN public.portal_invites pi ON pi.id = pu.invite_id
    LEFT JOIN auth.users au ON au.id = pu.user_id
    WHERE public.is_admin()
       OR (l.id IS NOT NULL AND public.user_owns_lead(l.id))
       OR (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid())
  ),
  scored AS (
    SELECT b.*,
      CASE
        WHEN (SELECT email_n FROM params) IS NOT NULL
          AND public.normalize_email(COALESCE(b.lead_email, b.invite_email)) = (SELECT email_n FROM params)
          THEN 'email'
        WHEN (SELECT phone_n FROM params) IS NOT NULL
          AND public.normalize_phone(b.lead_phone) = (SELECT phone_n FROM params)
          THEN 'phone'
        WHEN (SELECT name_q FROM params) IS NOT NULL
          AND b.lead_name ILIKE '%' || (SELECT name_q FROM params) || '%'
          THEN 'name'
        ELSE NULL
      END AS reason
    FROM base b
  ),
  matched AS (
    SELECT s.* FROM scored s WHERE s.reason IS NOT NULL
  ),
  doc_stats AS (
    SELECT dd.deal_id,
      COUNT(*) FILTER (WHERE dd.status::text <> 'missing') AS uploaded,
      COUNT(*) AS total
    FROM public.deal_documents dd
    GROUP BY dd.deal_id
  )
  SELECT
    m.user_id AS portal_user_id,
    m.deal_id,
    m.lead_id,
    m.person_id,
    COALESCE(m.lead_email, m.invite_email) AS email,
    COALESCE(NULLIF(m.lead_name,''), m.invite_email) AS full_name,
    m.lead_phone AS phone,
    m.property_address,
    m.loan_amount,
    m.loan_type,
    m.stage,
    m.accepted_at AS invite_accepted_at,
    m.last_sign_in_at AS last_login_at,
    COALESCE(m.accepted_at, m.invite_created_at, m.user_created_at) AS started_at,
    CASE
      WHEN ds.total IS NULL OR ds.total = 0 THEN 0
      ELSE (ds.uploaded * 100 / ds.total)::int
    END AS completion_pct,
    COALESCE(ds.uploaded, 0)::int AS documents_uploaded,
    COALESCE(ds.total, 0)::int AS documents_required,
    m.reason AS match_reason,
    CASE WHEN m.reason IN ('email','phone') THEN 'High' ELSE 'Medium' END AS confidence
  FROM matched m
  LEFT JOIN doc_stats ds ON ds.deal_id = m.deal_id
  ORDER BY (CASE WHEN m.reason IN ('email','phone') THEN 0 ELSE 1 END), m.bound_at DESC
  LIMIT 25;
$$;

-- 3. Detailed summary for a single lead's portal binding
CREATE OR REPLACE FUNCTION public.get_portal_applicant_summary(_lead_id uuid)
RETURNS TABLE(
  portal_user_id uuid,
  deal_id uuid,
  email text,
  last_login_at timestamptz,
  invite_sent_at timestamptz,
  invite_accepted_at timestamptz,
  stage text,
  completion_pct integer,
  documents_uploaded integer,
  documents_required integer,
  missing_items text[]
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH pu AS (
    SELECT pu.user_id, pu.deal_id, pu.invite_id
    FROM public.portal_users pu
    JOIN public.leads l ON l.id = pu.lead_id
    WHERE pu.lead_id = _lead_id
      AND (public.is_admin() OR public.user_owns_lead(_lead_id))
    LIMIT 1
  ),
  inv AS (
    SELECT pi.email, pi.created_at AS invite_sent_at, pi.accepted_at
    FROM public.portal_invites pi
    JOIN pu ON pu.invite_id = pi.id
  ),
  au AS (
    SELECT u.last_sign_in_at FROM auth.users u JOIN pu ON pu.user_id = u.id
  ),
  d AS (
    SELECT dd.deal_id,
      COUNT(*) FILTER (WHERE dd.status::text <> 'missing') AS uploaded,
      COUNT(*) AS total,
      array_agg(sd.label) FILTER (WHERE dd.status::text = 'missing') AS missing
    FROM public.deal_documents dd
    JOIN public.stage_documents sd ON sd.id = dd.stage_document_id
    JOIN pu ON pu.deal_id = dd.deal_id
    GROUP BY dd.deal_id
  ),
  dl AS (
    SELECT dl.stage::text AS stage FROM public.deals dl JOIN pu ON pu.deal_id = dl.id
  )
  SELECT
    pu.user_id,
    pu.deal_id,
    inv.email,
    au.last_sign_in_at,
    inv.invite_sent_at,
    inv.accepted_at,
    dl.stage,
    CASE WHEN d.total IS NULL OR d.total = 0 THEN 0
         ELSE (d.uploaded * 100 / d.total)::int END,
    COALESCE(d.uploaded, 0)::int,
    COALESCE(d.total, 0)::int,
    COALESCE(d.missing, ARRAY[]::text[])
  FROM pu
  LEFT JOIN inv ON true
  LEFT JOIN au ON true
  LEFT JOIN d ON true
  LEFT JOIN dl ON true;
$$;

-- 4. Convert a portal applicant to a lead (reuses person & lead)
CREATE OR REPLACE FUNCTION public.convert_portal_applicant_to_lead(_portal_user_id uuid)
RETURNS TABLE(lead_id uuid, person_id uuid, was_existing boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_pu public.portal_users%ROWTYPE;
  v_deal public.deals%ROWTYPE;
  v_invite public.portal_invites%ROWTYPE;
  v_email text;
  v_phone text;
  v_first text := '';
  v_last text := '';
  v_person_id uuid;
  v_lead_id uuid;
  v_existing boolean := false;
  v_match record;
BEGIN
  SELECT * INTO v_pu FROM public.portal_users WHERE user_id = _portal_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Portal user not found'; END IF;

  -- Authorization: admin or lead/deal owner
  SELECT * INTO v_deal FROM public.deals WHERE id = v_pu.deal_id;
  IF NOT public.is_admin()
     AND (v_pu.lead_id IS NULL OR NOT public.user_owns_lead(v_pu.lead_id))
     AND (v_deal.loan_officer_id IS DISTINCT FROM v_actor AND v_deal.created_by IS DISTINCT FROM v_actor) THEN
    RAISE EXCEPTION 'Not authorized to convert this portal applicant';
  END IF;

  -- If lead already linked, reuse
  IF v_pu.lead_id IS NOT NULL THEN
    SELECT id, person_id INTO v_lead_id, v_person_id FROM public.leads WHERE id = v_pu.lead_id;
    IF v_lead_id IS NOT NULL THEN
      UPDATE public.leads SET portal_user_id = _portal_user_id WHERE id = v_lead_id AND portal_user_id IS NULL;
      lead_id := v_lead_id; person_id := v_person_id; was_existing := true;
      RETURN NEXT; RETURN;
    END IF;
  END IF;

  -- Resolve identity from invite + auth.users
  SELECT * INTO v_invite FROM public.portal_invites WHERE id = v_pu.invite_id;
  SELECT au.email INTO v_email FROM auth.users au WHERE au.id = _portal_user_id;
  v_email := COALESCE(v_email, v_invite.email);

  -- Find or create person
  SELECT m.person_id INTO v_person_id
  FROM public.find_person_matches(v_email, v_phone, NULL) m
  WHERE m.match_tier = 1
  ORDER BY m.similarity DESC LIMIT 1;

  IF v_person_id IS NULL THEN
    -- Split name from invite email if needed
    INSERT INTO public.people (first_name, last_name, email, phone, created_by)
    VALUES (COALESCE(NULLIF(v_first,''),''), COALESCE(NULLIF(v_last,''),''), v_email, v_phone, v_actor)
    RETURNING id INTO v_person_id;
  END IF;

  -- Reuse existing lead for this person if any
  SELECT id INTO v_lead_id FROM public.leads
   WHERE person_id = v_person_id ORDER BY created_at LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    v_existing := true;
    UPDATE public.leads SET portal_user_id = _portal_user_id WHERE id = v_lead_id AND portal_user_id IS NULL;
  ELSE
    INSERT INTO public.leads (
      first_name, last_name, email, phone, status, source,
      person_id, portal_user_id, created_by, assigned_to,
      property_address, loan_amount, loan_purpose
    ) VALUES (
      COALESCE(NULLIF(v_first,''),''), COALESCE(NULLIF(v_last,''),''),
      v_email, v_phone, 'new_lead'::lead_status, 'portal_conversion',
      v_person_id, _portal_user_id, v_actor, COALESCE(v_deal.loan_officer_id, v_actor),
      v_deal.property_address, v_deal.loan_amount, NULL
    ) RETURNING id INTO v_lead_id;
  END IF;

  -- Link portal_users back to lead if missing
  UPDATE public.portal_users SET lead_id = v_lead_id WHERE user_id = _portal_user_id AND lead_id IS NULL;

  -- Person role + audit
  INSERT INTO public.person_roles (person_id, role_type, assigned_by)
  VALUES (v_person_id, 'Lead', v_actor) ON CONFLICT DO NOTHING;

  INSERT INTO public.person_audit_log (person_id, actor_id, action, details)
  VALUES (v_person_id, v_actor, 'portal_applicant_converted',
          jsonb_build_object('lead_id', v_lead_id, 'portal_user_id', _portal_user_id, 'was_existing', v_existing));

  lead_id := v_lead_id; person_id := v_person_id; was_existing := v_existing;
  RETURN NEXT; RETURN;
END
$$;

GRANT EXECUTE ON FUNCTION public.search_portal_applicants(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_portal_applicant_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_portal_applicant_to_lead(uuid) TO authenticated;
