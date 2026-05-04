-- Add approval gate to GA4 config RPCs.
-- Service-role calls (auth.uid() is null) bypass the check so the ga4-report
-- edge function continues to work; it enforces its own approval check.

CREATE OR REPLACE FUNCTION public.list_ga4_sources()
 RETURNS TABLE(id uuid, property_id text, label text, is_enabled boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null and not public.get_profile_is_approved(auth.uid()) then
    raise exception 'Account pending approval';
  end if;
  return query
  select ds.id,
         ds.ga4_property_id as property_id,
         coalesce(ds.additional_config->>'label', '') as label,
         ds.is_enabled,
         ds.created_at
  from public.client_data_sources ds
  join public.clients c on c.id = ds.client_id
  where c.is_singleton = true
    and ds.source_type = 'ga4'
  order by ds.created_at;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_active_ga4_property_ids()
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null and not public.get_profile_is_approved(auth.uid()) then
    raise exception 'Account pending approval';
  end if;
  return (
    select coalesce(array_agg(ds.ga4_property_id order by ds.created_at), ARRAY[]::text[])
    from public.client_data_sources ds
    join public.clients c on c.id = ds.client_id
    where c.is_singleton = true
      and ds.source_type = 'ga4'
      and ds.is_enabled = true
      and ds.ga4_property_id is not null
      and length(trim(ds.ga4_property_id)) > 0
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_active_ga4_property_id()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null and not public.get_profile_is_approved(auth.uid()) then
    raise exception 'Account pending approval';
  end if;
  return (
    select ds.ga4_property_id
    from public.client_data_sources ds
    join public.clients c on c.id = ds.client_id
    where c.is_singleton = true
      and ds.source_type = 'ga4'
      and ds.is_enabled = true
      and ds.ga4_property_id is not null
      and length(trim(ds.ga4_property_id)) > 0
    order by ds.created_at
    limit 1
  );
end;
$function$;