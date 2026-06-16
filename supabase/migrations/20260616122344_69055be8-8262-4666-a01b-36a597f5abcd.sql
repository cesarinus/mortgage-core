
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN
  CREATE TYPE public.person_role_type AS ENUM (
    'Contact','Lead','Borrower','CoBorrower','Realtor',
    'ReferralPartner','Builder','Attorney','Vendor'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.normalize_email(_email text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(lower(btrim(_email)), '')
$$;

CREATE OR REPLACE FUNCTION public.normalize_phone(_phone text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(regexp_replace(COALESCE(_phone,''), '[^0-9]', '', 'g'), '')
$$;

CREATE TABLE public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL DEFAULT '',
  middle_name text,
  last_name text NOT NULL DEFAULT '',
  full_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  alternate_phone text,
  email_normalized text,
  phone_normalized text,
  company text,
  address text,
  city text,
  state text,
  zip text,
  date_of_birth date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.people TO authenticated;
GRANT ALL ON public.people TO service_role;

CREATE INDEX idx_people_email_normalized ON public.people(email_normalized);
CREATE INDEX idx_people_phone_normalized ON public.people(phone_normalized);
CREATE INDEX idx_people_full_name_trgm ON public.people USING gin (full_name gin_trgm_ops);
CREATE INDEX idx_people_created_by ON public.people(created_by);

CREATE OR REPLACE FUNCTION public.people_maintain_trigger()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.email_normalized := public.normalize_email(NEW.email);
  NEW.phone_normalized := public.normalize_phone(NEW.phone);
  NEW.full_name := btrim(concat_ws(' ',
    NULLIF(NEW.first_name,''),
    NULLIF(NEW.middle_name,''),
    NULLIF(NEW.last_name,'')
  ));
  RETURN NEW;
END $$;

CREATE TRIGGER trg_people_maintain
BEFORE INSERT OR UPDATE ON public.people
FOR EACH ROW EXECUTE FUNCTION public.people_maintain_trigger();

CREATE TRIGGER trg_people_updated_at
BEFORE UPDATE ON public.people
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "people_select_authenticated" ON public.people
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "people_insert_authenticated" ON public.people
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "people_update_owner_or_admin" ON public.people
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());
CREATE POLICY "people_delete_owner_or_admin" ON public.people
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

CREATE TABLE public.person_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  role_type public.person_role_type NOT NULL,
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (person_id, role_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_roles TO authenticated;
GRANT ALL ON public.person_roles TO service_role;

CREATE INDEX idx_person_roles_person ON public.person_roles(person_id);
CREATE INDEX idx_person_roles_role ON public.person_roles(role_type);

ALTER TABLE public.person_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "person_roles_select_authenticated" ON public.person_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "person_roles_insert_authenticated" ON public.person_roles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "person_roles_delete_owner_or_admin" ON public.person_roles
  FOR DELETE TO authenticated USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.people p WHERE p.id = person_id AND p.created_by = auth.uid()
    )
  );

CREATE TABLE public.person_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES public.people(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.person_audit_log TO authenticated;
GRANT ALL ON public.person_audit_log TO service_role;

CREATE INDEX idx_person_audit_person ON public.person_audit_log(person_id);
CREATE INDEX idx_person_audit_created_at ON public.person_audit_log(created_at DESC);

ALTER TABLE public.person_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select_authenticated" ON public.person_audit_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_insert_authenticated" ON public.person_audit_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "audit_delete_admin" ON public.person_audit_log
  FOR DELETE TO authenticated USING (public.is_admin());

ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES public.people(id) ON DELETE SET NULL;
ALTER TABLE public.leads    ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES public.people(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_person_id ON public.contacts(person_id);
CREATE INDEX IF NOT EXISTS idx_leads_person_id ON public.leads(person_id);

-- Backfill contacts
DO $$
DECLARE r record; v_pid uuid; v_e text; v_p text;
BEGIN
  FOR r IN SELECT * FROM public.contacts ORDER BY created_at ASC LOOP
    v_e := public.normalize_email(r.email);
    v_p := public.normalize_phone(r.phone);
    v_pid := NULL;
    IF v_e IS NOT NULL THEN SELECT id INTO v_pid FROM public.people WHERE email_normalized = v_e LIMIT 1; END IF;
    IF v_pid IS NULL AND v_p IS NOT NULL THEN SELECT id INTO v_pid FROM public.people WHERE phone_normalized = v_p LIMIT 1; END IF;
    IF v_pid IS NULL THEN
      INSERT INTO public.people (first_name, middle_name, last_name, email, phone, address, date_of_birth, created_by, created_at)
      VALUES (COALESCE(r.first_name,''), r.middle_name, COALESCE(r.last_name,''), r.email, r.phone, r.address, r.dob, r.created_by, r.created_at)
      RETURNING id INTO v_pid;
    END IF;
    UPDATE public.contacts SET person_id = v_pid WHERE id = r.id;
    INSERT INTO public.person_roles (person_id, role_type, assigned_by)
    VALUES (v_pid, 'Contact', r.created_by) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Backfill leads
DO $$
DECLARE r record; v_pid uuid; v_e text; v_p text;
BEGIN
  FOR r IN SELECT * FROM public.leads ORDER BY created_at ASC LOOP
    v_e := public.normalize_email(r.email);
    v_p := public.normalize_phone(r.phone);
    v_pid := NULL;
    IF v_e IS NOT NULL THEN SELECT id INTO v_pid FROM public.people WHERE email_normalized = v_e LIMIT 1; END IF;
    IF v_pid IS NULL AND v_p IS NOT NULL THEN SELECT id INTO v_pid FROM public.people WHERE phone_normalized = v_p LIMIT 1; END IF;
    IF v_pid IS NULL THEN
      INSERT INTO public.people (first_name, last_name, email, phone, address, created_by, created_at)
      VALUES (COALESCE(r.first_name,''), COALESCE(r.last_name,''), r.email, r.phone, r.property_address, r.created_by, r.created_at)
      RETURNING id INTO v_pid;
    END IF;
    UPDATE public.leads SET person_id = v_pid WHERE id = r.id;
    INSERT INTO public.person_roles (person_id, role_type, assigned_by)
    VALUES (v_pid, 'Lead', r.created_by) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Match RPC
CREATE OR REPLACE FUNCTION public.find_person_matches(
  _email text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _name  text DEFAULT NULL
)
RETURNS TABLE (
  person_id uuid, full_name text, email text, phone text,
  company text, city text, zip text,
  match_tier int, match_reason text, confidence text, similarity real
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH params AS (
    SELECT public.normalize_email(_email) AS email_n,
           public.normalize_phone(_phone) AS phone_n,
           NULLIF(btrim(_name),'') AS name_q
  ),
  tier1 AS (
    SELECT p.id, p.full_name, p.email, p.phone, p.company, p.city, p.zip,
           1 AS match_tier,
           CASE WHEN params.email_n IS NOT NULL AND p.email_normalized = params.email_n THEN 'email' ELSE 'phone' END AS match_reason,
           'High'::text AS confidence, 1.0::real AS similarity
    FROM public.people p, params
    WHERE (params.email_n IS NOT NULL AND p.email_normalized = params.email_n)
       OR (params.phone_n IS NOT NULL AND p.phone_normalized = params.phone_n)
  ),
  tier2 AS (
    SELECT p.id, p.full_name, p.email, p.phone, p.company, p.city, p.zip,
           2 AS match_tier, 'name_similarity' AS match_reason,
           'Medium'::text AS confidence,
           similarity(p.full_name, params.name_q) AS similarity
    FROM public.people p, params
    WHERE params.name_q IS NOT NULL
      AND p.full_name % params.name_q
      AND similarity(p.full_name, params.name_q) >= 0.85
      AND p.id NOT IN (SELECT id FROM tier1)
  )
  SELECT id, full_name, email, phone, company, city, zip, match_tier, match_reason, confidence, similarity FROM tier1
  UNION ALL
  SELECT id, full_name, email, phone, company, city, zip, match_tier, match_reason, confidence, similarity FROM tier2
  ORDER BY match_tier ASC, similarity DESC
  LIMIT 25;
$$;

GRANT EXECUTE ON FUNCTION public.find_person_matches(text,text,text) TO authenticated;

-- Convert RPC
CREATE OR REPLACE FUNCTION public.convert_person_to_lead(_person_id uuid)
RETURNS TABLE (lead_id uuid, was_existing boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_person public.people%ROWTYPE;
  v_existing uuid;
  v_new uuid;
  v_actor uuid := auth.uid();
BEGIN
  SELECT * INTO v_person FROM public.people WHERE id = _person_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Person not found'; END IF;

  SELECT id INTO v_existing FROM public.leads WHERE person_id = _person_id ORDER BY created_at LIMIT 1;
  IF v_existing IS NOT NULL THEN
    INSERT INTO public.person_audit_log (person_id, actor_id, action, details)
    VALUES (_person_id, v_actor, 'convert_to_lead.duplicate', jsonb_build_object('lead_id', v_existing));
    lead_id := v_existing; was_existing := true; RETURN NEXT; RETURN;
  END IF;

  INSERT INTO public.leads (person_id, first_name, last_name, email, phone, status, source, created_by, assigned_to)
  VALUES (_person_id, COALESCE(v_person.first_name,''), COALESCE(v_person.last_name,''),
          v_person.email, v_person.phone, 'new_lead'::lead_status, 'contact_conversion', v_actor, v_actor)
  RETURNING id INTO v_new;

  INSERT INTO public.person_roles (person_id, role_type, assigned_by)
  VALUES (_person_id, 'Lead', v_actor) ON CONFLICT DO NOTHING;

  INSERT INTO public.person_audit_log (person_id, actor_id, action, details)
  VALUES (_person_id, v_actor, 'convert_to_lead', jsonb_build_object('lead_id', v_new));

  lead_id := v_new; was_existing := false; RETURN NEXT; RETURN;
END $$;

GRANT EXECUTE ON FUNCTION public.convert_person_to_lead(uuid) TO authenticated;
