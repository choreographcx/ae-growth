-- Ad-platforms (BigQuery) service account: prefer bq_essencemediacom_sa_json, fall back to bigquery_sa_json
CREATE OR REPLACE FUNCTION public.internal_get_google_sa_json()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $function$
declare
  _secret text;
begin
  select decrypted_secret into _secret
  from vault.decrypted_secrets
  where name = 'bq_essencemediacom_sa_json'
  limit 1;

  if _secret is null then
    select decrypted_secret into _secret
    from vault.decrypted_secrets
    where name = 'bigquery_sa_json'
    limit 1;
  end if;

  if _secret is null then
    raise exception 'Ad-platforms service account secret not found in vault (looked for bq_essencemediacom_sa_json, bigquery_sa_json)';
  end if;

  if _secret like '%your-project-id%' or _secret like '%PRIVATE_KEY_HERE%' then
    raise exception 'Ad-platforms vault secret contains Google sample placeholder values; replace it with the real service-account JSON key';
  end if;

  return _secret;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.internal_get_google_sa_json() FROM anon, authenticated, public;

-- GA4 service account: ga4_sa_json only
CREATE OR REPLACE FUNCTION public.internal_get_ga4_sa_json()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $function$
declare
  _secret text;
begin
  select decrypted_secret into _secret
  from vault.decrypted_secrets
  where name = 'ga4_sa_json'
  limit 1;

  if _secret is null then
    raise exception 'GA4 service account secret not found in vault (expected name: ga4_sa_json)';
  end if;

  if _secret like '%your-project-id%' or _secret like '%PRIVATE_KEY_HERE%' then
    raise exception 'Vault secret ga4_sa_json contains Google sample placeholder values; replace it with the real GA4 service-account JSON key';
  end if;

  return _secret;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.internal_get_ga4_sa_json() FROM anon, authenticated, public;