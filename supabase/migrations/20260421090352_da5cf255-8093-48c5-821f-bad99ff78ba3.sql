-- Internal helper meant to be called from the GA4 edge function using the
-- service role. Has no auth.uid() check because the service role context has
-- no user; access is gated by the service_role grant below.
CREATE OR REPLACE FUNCTION public.internal_get_google_sa_json()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'vault'
AS $$
DECLARE
  _secret text;
BEGIN
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

REVOKE ALL ON FUNCTION public.internal_get_google_sa_json() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.internal_get_google_sa_json() FROM authenticated;
REVOKE ALL ON FUNCTION public.internal_get_google_sa_json() FROM anon;
GRANT EXECUTE ON FUNCTION public.internal_get_google_sa_json() TO service_role;