
-- Foreign table for view_clarity_unified
DROP FOREIGN TABLE IF EXISTS public.view_clarity_unified CASCADE;

CREATE FOREIGN TABLE public.view_clarity_unified (
  metric_date         date,
  clarity_project_key text,
  subdomain           text,
  source_type         text,
  metric_name         text,
  metric_key          text,
  dimension_name      text,
  dimension_value     text,
  metric_value        double precision,
  metric_percentage   double precision,
  window_start_date   date,
  window_end_date     date,
  lookback_days       bigint,
  inserted_at         timestamptz
)
SERVER "AESA_dashboard_server"
OPTIONS (
  table 'view_clarity_unified',
  location 'US'
);

REVOKE ALL ON public.view_clarity_unified FROM anon, authenticated;

-- Filters: distinct projects/subdomains/source types within range
CREATE OR REPLACE FUNCTION public.get_clarity_filters(
  p_start date,
  p_end date
)
RETURNS TABLE(
  clarity_project_keys text[],
  subdomains text[],
  source_types text[]
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.get_profile_is_approved(auth.uid()) then raise exception 'Account pending approval'; end if;
  if p_start is null or p_end is null then raise exception 'p_start and p_end are required'; end if;

  return query
  select
    coalesce(array_agg(distinct v.clarity_project_key) filter (where v.clarity_project_key is not null), ARRAY[]::text[]),
    coalesce(array_agg(distinct v.subdomain) filter (where v.subdomain is not null), ARRAY[]::text[]),
    coalesce(array_agg(distinct v.source_type) filter (where v.source_type is not null), ARRAY[]::text[])
  from public.view_clarity_unified v
  where v.metric_date between p_start and p_end;
end;
$function$;

-- KPI totals
CREATE OR REPLACE FUNCTION public.get_clarity_kpis(
  p_start date,
  p_end date,
  p_projects text[] DEFAULT NULL,
  p_subdomains text[] DEFAULT NULL,
  p_source_type text DEFAULT NULL
)
RETURNS TABLE(
  metric_name text,
  metric_value numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  PERFORM set_config('statement_timeout', '540000', true);
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.get_profile_is_approved(auth.uid()) then raise exception 'Account pending approval'; end if;
  if p_start is null or p_end is null then raise exception 'p_start and p_end are required'; end if;
  if (p_end - p_start) > 366 then raise exception 'Date range cannot exceed 366 days'; end if;

  return query
  select
    v.metric_name,
    coalesce(sum(v.metric_value), 0)::numeric
  from public.view_clarity_unified v
  where v.metric_date between p_start and p_end
    and (v.dimension_name is null or v.dimension_name = '' or lower(v.dimension_name) = 'total')
    and (p_projects   is null or array_length(p_projects, 1)   is null or v.clarity_project_key = ANY(p_projects))
    and (p_subdomains is null or array_length(p_subdomains, 1) is null or v.subdomain = ANY(p_subdomains))
    and (p_source_type is null or v.source_type = p_source_type)
  group by v.metric_name;
end;
$function$;

-- Time series of a given metric (defaults to traffic/sessions)
CREATE OR REPLACE FUNCTION public.get_clarity_timeseries(
  p_start date,
  p_end date,
  p_metric_names text[] DEFAULT ARRAY['Traffic','Total sessions']::text[],
  p_projects text[] DEFAULT NULL,
  p_subdomains text[] DEFAULT NULL,
  p_source_type text DEFAULT NULL
)
RETURNS TABLE(
  metric_date date,
  metric_value numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  PERFORM set_config('statement_timeout', '540000', true);
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.get_profile_is_approved(auth.uid()) then raise exception 'Account pending approval'; end if;
  if p_start is null or p_end is null then raise exception 'p_start and p_end are required'; end if;
  if (p_end - p_start) > 366 then raise exception 'Date range cannot exceed 366 days'; end if;

  return query
  select
    v.metric_date,
    coalesce(sum(v.metric_value), 0)::numeric
  from public.view_clarity_unified v
  where v.metric_date between p_start and p_end
    and v.metric_name = ANY(p_metric_names)
    and (v.dimension_name is null or v.dimension_name = '' or lower(v.dimension_name) = 'total')
    and (p_projects   is null or array_length(p_projects, 1)   is null or v.clarity_project_key = ANY(p_projects))
    and (p_subdomains is null or array_length(p_subdomains, 1) is null or v.subdomain = ANY(p_subdomains))
    and (p_source_type is null or v.source_type = p_source_type)
  group by v.metric_date
  order by v.metric_date;
end;
$function$;

-- Breakdown by dimension_value for a given metric (PageTitle, Country, Browser, Device, Referrer, etc.)
CREATE OR REPLACE FUNCTION public.get_clarity_breakdown(
  p_start date,
  p_end date,
  p_metric_name text,
  p_projects text[] DEFAULT NULL,
  p_subdomains text[] DEFAULT NULL,
  p_source_type text DEFAULT NULL,
  p_limit integer DEFAULT 25
)
RETURNS TABLE(
  dimension_value text,
  metric_value numeric,
  metric_percentage numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  PERFORM set_config('statement_timeout', '540000', true);
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.get_profile_is_approved(auth.uid()) then raise exception 'Account pending approval'; end if;
  if p_start is null or p_end is null then raise exception 'p_start and p_end are required'; end if;
  if (p_end - p_start) > 366 then raise exception 'Date range cannot exceed 366 days'; end if;
  if p_metric_name is null then raise exception 'p_metric_name is required'; end if;

  return query
  select
    coalesce(v.dimension_value, '(unknown)') as dimension_value,
    coalesce(sum(v.metric_value), 0)::numeric as metric_value,
    coalesce(avg(v.metric_percentage), 0)::numeric as metric_percentage
  from public.view_clarity_unified v
  where v.metric_date between p_start and p_end
    and v.metric_name = p_metric_name
    and v.dimension_value is not null
    and (p_projects   is null or array_length(p_projects, 1)   is null or v.clarity_project_key = ANY(p_projects))
    and (p_subdomains is null or array_length(p_subdomains, 1) is null or v.subdomain = ANY(p_subdomains))
    and (p_source_type is null or v.source_type = p_source_type)
  group by coalesce(v.dimension_value, '(unknown)')
  order by 2 desc
  limit greatest(coalesce(p_limit, 25), 1);
end;
$function$;
