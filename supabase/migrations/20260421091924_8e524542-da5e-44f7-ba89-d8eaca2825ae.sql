-- ============================================================
-- 1) client_data_sources: admin/superadmin SELECT only
-- ============================================================
-- The "Authenticated can view data sources" policy previously did not exist
-- in the live policy list, but the security report flagged a broad policy.
-- Drop any broad policy if present, then ensure only the admin policy remains.
DROP POLICY IF EXISTS "Authenticated can view data sources" ON public.client_data_sources;

-- The existing "Admins can view data sources" policy already covers admin SELECT.
-- (Kept as-is.)

-- ============================================================
-- 2) client_reporting_settings: hide GA4/GTM infra fields from non-admins
-- ============================================================
-- Replace the broad authenticated SELECT policy with one that excludes the
-- sensitive infra columns, and add an admin-only policy that exposes everything.
DROP POLICY IF EXISTS "Authenticated can view reporting settings"
  ON public.client_reporting_settings;

-- Column-level grants: revoke the three sensitive columns from authenticated,
-- then grant the rest. Admins use a SECURITY DEFINER path (RPC + service role).
REVOKE SELECT ON public.client_reporting_settings FROM authenticated;

GRANT SELECT (
  id, client_id, reporting_currency, reporting_timezone, default_date_range,
  week_start_day, attribution_model, primary_conversion_label,
  secondary_conversion_label, enable_pacing_alerts, enable_anomaly_alerts,
  settings, created_at, updated_at, lookback_window, counting_method,
  conversion_notes, micro_conversions
) ON public.client_reporting_settings TO authenticated;

-- Re-add a row-level SELECT policy that allows authenticated users to read
-- the (now column-restricted) row for the singleton client.
CREATE POLICY "Authenticated can view reporting settings (limited cols)"
  ON public.client_reporting_settings
  FOR SELECT
  TO authenticated
  USING (client_id = public.get_singleton_client_id());

-- Admins/superadmins keep full column access via an explicit policy.
CREATE POLICY "Admins can view all reporting settings columns"
  ON public.client_reporting_settings
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  );

-- Admin-only RPC that returns the active GA4 property ID for the singleton client.
-- Used by the ga4-report edge function so it never trusts a caller-supplied ID.
CREATE OR REPLACE FUNCTION public.get_active_ga4_property_id()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _pid text;
BEGIN
  SELECT crs.ga4_property_id
    INTO _pid
  FROM public.client_reporting_settings crs
  JOIN public.clients c ON c.id = crs.client_id
  WHERE c.is_singleton = true
  LIMIT 1;
  RETURN _pid;
END;
$$;

REVOKE ALL ON FUNCTION public.get_active_ga4_property_id() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 3) profiles.is_approved: enforce immutability via trigger
-- ============================================================
-- Drop the brittle WITH CHECK and replace with a BEFORE UPDATE trigger.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enforce_is_approved_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
    IF NOT public.has_role(auth.uid(), 'superadmin'::public.app_role) THEN
      RAISE EXCEPTION 'Only superadmins can change approval status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_enforce_is_approved ON public.profiles;
CREATE TRIGGER profiles_enforce_is_approved
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_is_approved_immutability();