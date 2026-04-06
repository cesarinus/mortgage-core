-- Drop the two-argument overloads that allow privilege enumeration
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.is_admin(uuid);

-- Restrict profiles SELECT: users see own profile, admins see all
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR is_admin());

-- Also allow admins to see all profiles (for team management)
-- Already covered by the OR is_admin() above