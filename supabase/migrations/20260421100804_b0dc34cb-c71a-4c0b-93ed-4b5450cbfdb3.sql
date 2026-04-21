-- Replace the broad "Admins can view all profiles" policy with a superadmin-only one.
-- Regular admins (a larger group) no longer get full SELECT access to every user's email.
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Superadmins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::public.app_role));
