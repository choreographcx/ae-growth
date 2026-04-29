
-- 1. Convert SECURITY DEFINER views to security_invoker views so RLS of the
--    underlying source applies to the calling user instead of the view owner.
ALTER VIEW public.dashboard_daily SET (security_invoker = true);
ALTER VIEW public.dashboard_conversions SET (security_invoker = true);

-- 2. Lock down internal/diagnostic SECURITY DEFINER functions: revoke EXECUTE
--    from anon and authenticated. Service role retains access (used by edge fns).
REVOKE EXECUTE ON FUNCTION public.internal_get_google_sa_json() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.internal_grant_superadmin(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.internal_revoke_superadmin(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.diag_conv_events(date, date) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.diag_frequency_signal(date, date) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_platform_currency_integrity(date, date) FROM anon, public;
-- get_platform_currency_integrity keeps authenticated grant since it does its
-- own admin/superadmin role check, so legitimate admins can still call it.

-- Also revoke from anon (not authenticated) for functions that must remain
-- callable by signed-in users but should never be hit anonymously.
REVOKE EXECUTE ON FUNCTION public.get_dashboard_daily(date, date, text[], text[], jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_conversion_breakdown(date, date, text[], text[], jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_active_ga4_property_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_singleton_client() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_singleton_client_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_profile_is_approved(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_public_client_info() FROM public;
REVOKE EXECUTE ON FUNCTION public.get_public_branding() FROM public;
-- get_public_client_info / get_public_branding intentionally remain callable by
-- anon for the login screen branding/name display.

-- 3. Tighten clients table policies: admins should only be able to read/write
--    the singleton client row, matching the actual product design (single-client
--    dashboard). Prevents creation of additional client rows or access to any
--    non-singleton row that could appear.
DROP POLICY IF EXISTS "Admins can write clients" ON public.clients;

CREATE POLICY "Admins can update singleton client"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  is_singleton = true
  AND (public.has_role(auth.uid(), 'admin'::public.app_role)
       OR public.has_role(auth.uid(), 'superadmin'::public.app_role))
)
WITH CHECK (
  is_singleton = true
  AND (public.has_role(auth.uid(), 'admin'::public.app_role)
       OR public.has_role(auth.uid(), 'superadmin'::public.app_role))
);

CREATE POLICY "Admins can view singleton client"
ON public.clients
FOR SELECT
TO authenticated
USING (
  is_singleton = true
  AND (public.has_role(auth.uid(), 'admin'::public.app_role)
       OR public.has_role(auth.uid(), 'superadmin'::public.app_role))
);

CREATE POLICY "Superadmins can insert singleton client"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  is_singleton = true
  AND public.has_role(auth.uid(), 'superadmin'::public.app_role)
);

CREATE POLICY "Superadmins can delete singleton client"
ON public.clients
FOR DELETE
TO authenticated
USING (
  is_singleton = true
  AND public.has_role(auth.uid(), 'superadmin'::public.app_role)
);
