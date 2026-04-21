-- Replace the broad authenticated SELECT policy on client_reporting_settings
-- with one that also verifies the user is approved (or is an admin/superadmin).
DROP POLICY IF EXISTS "Authenticated can view reporting settings" ON public.client_reporting_settings;

CREATE POLICY "Approved users can view reporting settings"
  ON public.client_reporting_settings
  FOR SELECT
  TO authenticated
  USING (
    client_id = public.get_singleton_client_id()
    AND (
      public.get_profile_is_approved(auth.uid())
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    )
  );