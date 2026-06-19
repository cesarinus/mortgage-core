
CREATE TABLE IF NOT EXISTS public.mortgage_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid UNIQUE REFERENCES public.people(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES public.pipeline_opportunities(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  -- Borrower
  borrower_name text,
  borrower_email text,
  borrower_phone text,
  -- Loan
  loan_purpose text,
  occupancy text,
  property_type text,
  loan_program text,
  loan_amount numeric,
  interest_rate numeric,
  loan_term_years integer,
  -- Property
  property_address text,
  purchase_price numeric,
  estimated_value numeric,
  -- Financial
  down_payment numeric,
  down_payment_pct numeric,
  ltv numeric,
  dti numeric,
  monthly_income numeric,
  monthly_payment numeric,
  -- Application progress
  completion_pct integer DEFAULT 0,
  documents_uploaded integer DEFAULT 0,
  documents_required integer DEFAULT 0,
  application_started_at timestamptz,
  application_updated_at timestamptz,
  assigned_lo_id uuid,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ms_lead ON public.mortgage_snapshots(lead_id);
CREATE INDEX IF NOT EXISTS idx_ms_opp ON public.mortgage_snapshots(opportunity_id);

GRANT SELECT ON public.mortgage_snapshots TO authenticated;
GRANT ALL ON public.mortgage_snapshots TO service_role;

ALTER TABLE public.mortgage_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ms_admins_all" ON public.mortgage_snapshots
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "ms_lead_owners_read" ON public.mortgage_snapshots
  FOR SELECT TO authenticated
  USING (lead_id IS NOT NULL AND public.user_owns_lead(lead_id));

CREATE TRIGGER trg_ms_updated_at BEFORE UPDATE ON public.mortgage_snapshots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Generator
CREATE OR REPLACE FUNCTION public.generate_mortgage_snapshot(_person_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person public.people%ROWTYPE;
  v_lead public.leads%ROWTYPE;
  v_mp public.mortgage_profiles%ROWTYPE;
  v_scn public.loan_scenarios%ROWTYPE;
  v_deal_id uuid;
  v_docs_total int := 0;
  v_docs_done int := 0;
  v_completion int := 0;
  v_started timestamptz;
  v_purchase numeric;
  v_down numeric;
  v_loan numeric;
  v_ltv numeric;
  v_down_pct numeric;
  v_id uuid;
BEGIN
  SELECT * INTO v_person FROM public.people WHERE id = _person_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_lead FROM public.leads WHERE person_id = _person_id ORDER BY created_at LIMIT 1;
  IF v_lead.id IS NOT NULL THEN
    SELECT * INTO v_mp FROM public.mortgage_profiles WHERE lead_id = v_lead.id;
    SELECT * INTO v_scn FROM public.loan_scenarios WHERE lead_id = v_lead.id ORDER BY updated_at DESC LIMIT 1;
    SELECT pu.deal_id INTO v_deal_id FROM public.portal_users pu WHERE pu.lead_id = v_lead.id LIMIT 1;
    IF v_deal_id IS NOT NULL THEN
      SELECT COUNT(*) FILTER (WHERE status::text <> 'missing'), COUNT(*)
        INTO v_docs_done, v_docs_total
      FROM public.deal_documents WHERE deal_id = v_deal_id;
      v_completion := CASE WHEN v_docs_total = 0 THEN 0 ELSE (v_docs_done * 100 / v_docs_total) END;
    END IF;
    v_started := v_lead.created_at;
  END IF;

  v_purchase := COALESCE(v_scn.purchase_price, v_mp.purchase_price, v_lead.property_value);
  v_down     := COALESCE(v_scn.down_payment_amt, v_mp.down_payment);
  v_loan     := COALESCE(v_scn.loan_amount, v_lead.loan_amount,
                          CASE WHEN v_purchase IS NOT NULL AND v_down IS NOT NULL THEN v_purchase - v_down END);
  v_ltv      := COALESCE(v_scn.ltv,
                          CASE WHEN v_purchase IS NOT NULL AND v_purchase > 0 AND v_loan IS NOT NULL THEN (v_loan / v_purchase) * 100 END);
  v_down_pct := COALESCE(v_scn.down_payment_pct,
                          CASE WHEN v_purchase IS NOT NULL AND v_purchase > 0 AND v_down IS NOT NULL THEN (v_down / v_purchase) * 100 END);

  INSERT INTO public.mortgage_snapshots (
    person_id, lead_id, deal_id,
    borrower_name, borrower_email, borrower_phone,
    loan_purpose, occupancy, property_type, loan_program, loan_amount,
    interest_rate, loan_term_years,
    property_address, purchase_price, estimated_value,
    down_payment, down_payment_pct, ltv, dti, monthly_income, monthly_payment,
    completion_pct, documents_uploaded, documents_required,
    application_started_at, application_updated_at, assigned_lo_id, generated_at
  ) VALUES (
    _person_id, v_lead.id, v_deal_id,
    v_person.full_name, v_person.email, v_person.phone,
    v_lead.loan_purpose, v_mp.occupancy_type, COALESCE(v_lead.property_type, v_mp.property_type),
    COALESCE(v_mp.loan_program, v_scn.mortgage_type), v_loan,
    v_scn.interest_rate, COALESCE(v_scn.loan_term_years, 30),
    COALESCE(v_scn.property_address, v_lead.property_address), v_purchase, v_lead.property_value,
    v_down, v_down_pct, v_ltv, v_mp.est_dti, NULLIF(v_mp.est_income,0) / 12.0, v_mp.est_monthly_payment,
    v_completion, v_docs_done, v_docs_total,
    v_started, now(), v_lead.assigned_to, now()
  )
  ON CONFLICT (person_id) DO UPDATE SET
    lead_id = EXCLUDED.lead_id,
    deal_id = EXCLUDED.deal_id,
    borrower_name = EXCLUDED.borrower_name,
    borrower_email = EXCLUDED.borrower_email,
    borrower_phone = EXCLUDED.borrower_phone,
    loan_purpose = EXCLUDED.loan_purpose,
    occupancy = EXCLUDED.occupancy,
    property_type = EXCLUDED.property_type,
    loan_program = EXCLUDED.loan_program,
    loan_amount = EXCLUDED.loan_amount,
    interest_rate = EXCLUDED.interest_rate,
    loan_term_years = EXCLUDED.loan_term_years,
    property_address = EXCLUDED.property_address,
    purchase_price = EXCLUDED.purchase_price,
    estimated_value = EXCLUDED.estimated_value,
    down_payment = EXCLUDED.down_payment,
    down_payment_pct = EXCLUDED.down_payment_pct,
    ltv = EXCLUDED.ltv,
    dti = EXCLUDED.dti,
    monthly_income = EXCLUDED.monthly_income,
    monthly_payment = EXCLUDED.monthly_payment,
    completion_pct = EXCLUDED.completion_pct,
    documents_uploaded = EXCLUDED.documents_uploaded,
    documents_required = EXCLUDED.documents_required,
    application_updated_at = EXCLUDED.application_updated_at,
    assigned_lo_id = EXCLUDED.assigned_lo_id,
    generated_at = now()
  RETURNING id INTO v_id;

  PERFORM public.timeline_log(
    'SNAPSHOT_GENERATED', 'mortgage',
    'Mortgage snapshot refreshed',
    NULL,
    _person_id, v_lead.id, NULL, v_deal_id, NULL,
    jsonb_build_object('completion_pct', v_completion, 'loan_amount', v_loan),
    auth.uid(), v_id, now()
  );

  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION public.generate_mortgage_snapshot(uuid) TO authenticated;

-- Auto-regenerate on key changes
CREATE OR REPLACE FUNCTION public.trg_snapshot_from_lead() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.person_id IS NOT NULL THEN
    PERFORM public.generate_mortgage_snapshot(NEW.person_id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_ms_from_lead ON public.leads;
CREATE TRIGGER trg_ms_from_lead AFTER INSERT OR UPDATE OF person_id, loan_purpose, property_type, property_value,
  loan_amount, property_address, assigned_to ON public.leads
FOR EACH ROW WHEN (NEW.person_id IS NOT NULL)
EXECUTE FUNCTION public.trg_snapshot_from_lead();

CREATE OR REPLACE FUNCTION public.trg_snapshot_from_mp() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pid uuid;
BEGIN
  SELECT person_id INTO v_pid FROM public.leads WHERE id = NEW.lead_id;
  IF v_pid IS NOT NULL THEN PERFORM public.generate_mortgage_snapshot(v_pid); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_ms_from_mp ON public.mortgage_profiles;
CREATE TRIGGER trg_ms_from_mp AFTER INSERT OR UPDATE ON public.mortgage_profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_snapshot_from_mp();

CREATE OR REPLACE FUNCTION public.trg_snapshot_from_scenario() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pid uuid;
BEGIN
  SELECT person_id INTO v_pid FROM public.leads WHERE id = NEW.lead_id;
  IF v_pid IS NOT NULL THEN PERFORM public.generate_mortgage_snapshot(v_pid); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_ms_from_scenario ON public.loan_scenarios;
CREATE TRIGGER trg_ms_from_scenario AFTER INSERT OR UPDATE ON public.loan_scenarios
FOR EACH ROW EXECUTE FUNCTION public.trg_snapshot_from_scenario();

-- Backfill snapshots for existing persons with leads
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT person_id FROM public.leads WHERE person_id IS NOT NULL LOOP
    PERFORM public.generate_mortgage_snapshot(r.person_id);
  END LOOP;
END $$;
