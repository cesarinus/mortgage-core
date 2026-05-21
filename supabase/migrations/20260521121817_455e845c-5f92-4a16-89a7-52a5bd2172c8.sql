
-- Allow self_employed_profiles and financial_statements to attach to a lead (not just a deal)
ALTER TABLE public.self_employed_profiles ADD COLUMN IF NOT EXISTS lead_id uuid;
ALTER TABLE public.self_employed_profiles ALTER COLUMN deal_id DROP NOT NULL;
-- Replace unique on deal_id with a partial-unique per scope
ALTER TABLE public.self_employed_profiles DROP CONSTRAINT IF EXISTS self_employed_profiles_deal_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sep_deal ON public.self_employed_profiles(deal_id) WHERE deal_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sep_lead ON public.self_employed_profiles(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sep_lead_id ON public.self_employed_profiles(lead_id);
ALTER TABLE public.self_employed_profiles ADD CONSTRAINT sep_scope_chk CHECK (deal_id IS NOT NULL OR lead_id IS NOT NULL);

ALTER TABLE public.financial_statements ADD COLUMN IF NOT EXISTS lead_id uuid;
ALTER TABLE public.financial_statements ALTER COLUMN deal_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fs_lead_id ON public.financial_statements(lead_id);
ALTER TABLE public.financial_statements ADD CONSTRAINT fs_scope_chk CHECK (deal_id IS NOT NULL OR lead_id IS NOT NULL);

-- Add lead-owner RLS policies (admins + deal-owner policies already exist)
CREATE POLICY "lead owners read self_employed_profiles"
  ON public.self_employed_profiles FOR SELECT TO authenticated
  USING (lead_id IS NOT NULL AND public.user_owns_lead(lead_id));

CREATE POLICY "lead owners insert self_employed_profiles"
  ON public.self_employed_profiles FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND lead_id IS NOT NULL AND public.user_owns_lead(lead_id));

CREATE POLICY "lead owners update self_employed_profiles"
  ON public.self_employed_profiles FOR UPDATE TO authenticated
  USING (lead_id IS NOT NULL AND public.user_owns_lead(lead_id));

CREATE POLICY "lead owners delete self_employed_profiles"
  ON public.self_employed_profiles FOR DELETE TO authenticated
  USING (lead_id IS NOT NULL AND public.user_owns_lead(lead_id));

CREATE POLICY "lead owners read financial_statements"
  ON public.financial_statements FOR SELECT TO authenticated
  USING (lead_id IS NOT NULL AND public.user_owns_lead(lead_id));

CREATE POLICY "lead owners insert financial_statements"
  ON public.financial_statements FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND lead_id IS NOT NULL AND public.user_owns_lead(lead_id));

CREATE POLICY "lead owners delete financial_statements"
  ON public.financial_statements FOR DELETE TO authenticated
  USING (lead_id IS NOT NULL AND public.user_owns_lead(lead_id));
