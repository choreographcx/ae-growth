-- client_branding: require approved user (or admin/superadmin)
DROP POLICY IF EXISTS "Authenticated can view client branding" ON public.client_branding;
CREATE POLICY "Approved users can view client branding"
  ON public.client_branding
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

-- client_platform_settings: require approved user (or admin/superadmin)
DROP POLICY IF EXISTS "Authenticated can view platform settings" ON public.client_platform_settings;
CREATE POLICY "Approved users can view platform settings"
  ON public.client_platform_settings
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

-- client_kpi_thresholds: require approved user (or admin/superadmin)
DROP POLICY IF EXISTS "Authenticated can view kpi thresholds" ON public.client_kpi_thresholds;
CREATE POLICY "Approved users can view kpi thresholds"
  ON public.client_kpi_thresholds
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