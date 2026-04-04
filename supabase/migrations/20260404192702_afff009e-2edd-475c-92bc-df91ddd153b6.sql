
-- Step 1: Create new caller-scoped functions that always use auth.uid()
CREATE OR REPLACE FUNCTION public.has_role(_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.has_role('admin'::app_role)
$$;

-- Step 2: Update all RLS policies to use new single-arg functions

-- contacts: Admins can do anything
DROP POLICY IF EXISTS "Admins can do anything with contacts" ON public.contacts;
CREATE POLICY "Admins can do anything with contacts" ON public.contacts FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- deals: Admins can do anything
DROP POLICY IF EXISTS "Admins can do anything with deals" ON public.deals;
CREATE POLICY "Admins can do anything with deals" ON public.deals FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- deals: LO can create deals
DROP POLICY IF EXISTS "LO can create deals" ON public.deals;
CREATE POLICY "LO can create deals" ON public.deals FOR INSERT TO authenticated WITH CHECK (has_role('loan_officer'::app_role) OR is_admin());

-- deal_stage_history: Admins can do anything
DROP POLICY IF EXISTS "Admins can do anything with history" ON public.deal_stage_history;
CREATE POLICY "Admins can do anything with history" ON public.deal_stage_history FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- user_roles: Admin policies
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (is_admin());

-- profiles: Admin policies
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (is_admin());

-- lead_sources: Admin policy
DROP POLICY IF EXISTS "Admins can manage lead sources" ON public.lead_sources;
CREATE POLICY "Admins can manage lead sources" ON public.lead_sources FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- leads: Admin policy
DROP POLICY IF EXISTS "Admins can do anything with leads" ON public.leads;
CREATE POLICY "Admins can do anything with leads" ON public.leads FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Step 3: Revoke EXECUTE on old two-arg functions from authenticated and anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
