CREATE OR REPLACE FUNCTION public.get_dashboard_conversion_breakdown(
  p_start date,
  p_end date,
  p_platforms text[] DEFAULT NULL::text[],
  p_campaign_names text[] DEFAULT NULL::text[],
  p_suppressed_conversions jsonb DEFAULT NULL::jsonb,
  p_publisher_platforms text[] DEFAULT NULL::text[]
)
RETURNS TABLE(
  platform text,
  conversion_name text,
  conversion_funnel_group text,
  conversion_type text,
  conversions_all numeric,
  lower_funnel_conversions numeric,
  upper_funnel_conversions numeric,
  conversion_value numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  _platform_keys text[] := NULL;
  _pub_keys text[] := NULL;
begin
  PERFORM set_config('statement_timeout', '540000', true);
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.get_profile_is_approved(auth.uid()) then raise exception 'Account pending approval'; end if;
  if p_start is null or p_end is null then raise exception 'p_start and p_end are required'; end if;
  if p_end < p_start then raise exception 'p_end must be on or after p_start'; end if;
  if (p_end - p_start) > 366 then raise exception 'Date range cannot exceed 366 days'; end if;

  if p_platforms is not null and array_length(p_platforms, 1) is not null then
    select array_agg(distinct lower(trim(both from p))) into _platform_keys
    from unnest(p_platforms) as p
    where p is not null and length(trim(both from p)) > 0;
  end if;

  if p_publisher_platforms is not null and array_length(p_publisher_platforms, 1) is not null then
    select array_agg(distinct lower(trim(both from p))) into _pub_keys
    from unnest(p_publisher_platforms) as p
    where p is not null and length(trim(both from p)) > 0;
  end if;

  return query
  select
    coalesce(d.platform, d.source_platform, '(unknown)') as platform,
    coalesce(d.conversion_name, '(unspecified)') as conversion_name,
    coalesce(d.conversion_funnel_group, '(unspecified)') as conversion_funnel_group,
    coalesce(d.conversion_type, '(unspecified)') as conversion_type,
    coalesce(sum(coalesce(d.conversions_all, d.all_conversions)), 0)::numeric as conversions_all,
    coalesce(sum(coalesce(d.conversions_lower_funnel, d.lower_funnel_conversions)), 0)::numeric as lower_funnel_conversions,
    coalesce(sum(coalesce(d.conversions_upper_funnel, d.upper_funnel_conversions)), 0)::numeric as upper_funnel_conversions,
    coalesce(sum(d.conversion_value), 0)::numeric as conversion_value
  from public.bq_lovable_conversions d
  where d.date between p_start and p_end
    and (_platform_keys is null or EXISTS (
      select 1 from unnest(_platform_keys) as pk where
        lower(coalesce(d.platform, d.source_platform,'')) = pk
        or lower(coalesce(d.platform, d.source_platform,'')) like '%' || pk || '%'
        or (pk = 'meta' and (lower(coalesce(d.platform, d.source_platform,'')) like '%facebook%' or lower(coalesce(d.platform, d.source_platform,'')) like '%instagram%'))
        or (pk = 'x' and lower(coalesce(d.platform, d.source_platform,'')) like '%twitter%')
        or (pk = 'snapchat' and lower(coalesce(d.platform, d.source_platform,'')) like '%snap%')
        or (pk = 'programmatic' and (lower(coalesce(d.platform, d.source_platform,'')) like '%dv360%' or lower(coalesce(d.platform, d.source_platform,'')) like '%display%'))
    ))
    and (_pub_keys is null or lower(coalesce(d.publisher_platform, '')) = ANY(_pub_keys))
    and (p_campaign_names is null or array_length(p_campaign_names, 1) is null or d.campaign_name = any(p_campaign_names))
  group by
    coalesce(d.platform, d.source_platform, '(unknown)'),
    coalesce(d.conversion_name, '(unspecified)'),
    coalesce(d.conversion_funnel_group, '(unspecified)'),
    coalesce(d.conversion_type, '(unspecified)')
  order by 5 desc;
end;
$function$;