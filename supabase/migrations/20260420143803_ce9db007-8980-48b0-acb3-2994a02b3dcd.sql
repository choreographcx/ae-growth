-- 1) Restrict SELECT on client_data_sources to admins/superadmins only
DROP POLICY IF EXISTS "Authenticated can view data sources" ON public.client_data_sources;

CREATE POLICY "Admins can view data sources"
ON public.client_data_sources
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- 2) Lock down SECURITY DEFINER singleton client functions so anon cannot bypass
--    the column-level grants on public.clients via RPC.
REVOKE EXECUTE ON FUNCTION public.get_singleton_client() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_singleton_client() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_singleton_client_id() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_singleton_client_id() TO authenticated;
