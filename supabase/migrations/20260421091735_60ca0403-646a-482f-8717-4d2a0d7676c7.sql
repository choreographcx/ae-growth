CREATE OR REPLACE FUNCTION public.internal_get_google_sa_json()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
DECLARE
  _secret text;
BEGIN
  SELECT decrypted_secret
    INTO _secret
  FROM vault.decrypted_secrets
  WHERE name = 'bq_aroya_sa_key_id'
  LIMIT 1;

  IF _secret IS NULL THEN
    SELECT decrypted_secret
      INTO _secret
    FROM vault.decrypted_secrets
    WHERE name = 'bigquery_sa_json'
    LIMIT 1;
  END IF;

  IF _secret IS NULL THEN
    RAISE EXCEPTION 'Service account secret not found in vault (looked for bq_aroya_sa_key_id, bigquery_sa_json)';
  END IF;

  RETURN _secret;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_google_service_account_json()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
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
  WHERE name = 'bq_aroya_sa_key_id'
  LIMIT 1;

  IF _secret IS NULL THEN
    SELECT decrypted_secret
      INTO _secret
    FROM vault.decrypted_secrets
    WHERE name = 'bigquery_sa_json'
    LIMIT 1;
  END IF;

  IF _secret IS NULL THEN
    RAISE EXCEPTION 'Service account secret not found in vault';
  END IF;

  RETURN _secret;
END;
$function$;