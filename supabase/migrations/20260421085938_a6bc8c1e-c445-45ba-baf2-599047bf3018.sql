-- Admin-only accessor for the bigquery_sa_json vault secret.
-- Used by the GA4 edge function to authenticate against the
-- Google Analytics Data API (the same service account already
-- has access to the GA4 property).
CREATE OR REPLACE FUNCTION public.get_google_service_account_json()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'vault'
AS $$
DECLARE
  _secret text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  SELECT decrypted_secret
    INTO _secret
  FROM vault.decrypted_secrets
  WHERE name = 'bigquery_sa_json'
  LIMIT 1;

  IF _secret IS NULL THEN
    RAISE EXCEPTION 'Service account secret not found in vault';
  END IF;

  RETURN _secret;
END;
$$;

REVOKE ALL ON FUNCTION public.get_google_service_account_json() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_google_service_account_json() TO authenticated;