
CREATE OR REPLACE FUNCTION public.get_dashboard_daily(
  p_start date, p_end date,
  p_platforms text[] DEFAULT NULL,
  p_campaign_names text[] DEFAULT NULL,
  p_suppressed_conversions jsonb DEFAULT NULL
)
RETURNS TABLE(
  date date, platform text, publisher_platform text,
  campaign_id text, campaign_name text, campaign_type text,
  campaign_objective text, audience_type text,
  impressions numeric, clicks numeric, cost numeric,
  conversions numeric, conversions_all numeric,
  conversions_lower_funnel numeric, conversions_upper_funnel numeric,
  conversion_value numeric, reach numeric, frequency numeric,
  landing_page_views numeric, outbound_clicks numeric,
  video_views numeric, video_p100 numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  _platform_keys text[] := NULL;
begin
  PERFORM set_config('statement_timeout', '540000', true);
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.get_profile_is_approved(auth.uid()) then raise exception 'Account pending approval'; end if;
  if p_start is null or p_end is null then raise exception 'p_start and p_end are required'; end if;
  if p_end < p_start then raise exception 'p_end must be on or after p_start'; end if;
  if (p_end - p_start) > 366 then raise exception 'Date range cannot exceed 366 days'; end if;

  if p_platforms is not null and array_length(p_platforms, 1) is not null then
    select array_agg(distinct lower(trim(both from p_pl))) into _platform_keys
    from unnest(p_platforms) as p_pl
    where p_pl is not null and length(trim(both from p_pl)) > 0;
  end if;

  return query
  select
    d.date,
    coalesce(d.platform, d.source_platform, '(unknown)') as platform,
    coalesce(d.publisher_platform, '')::text as publisher_platform,
    NULL::text as campaign_id,
    d.campaign_name,
    max(d.campaign_type)      as campaign_type,
    max(d.campaign_objective) as campaign_objective,
    max(d.audience_type)      as audience_type,
    coalesce(sum(d.impressions), 0)::numeric,
    coalesce(sum(d.clicks), 0)::numeric,
    coalesce(sum(d.spend), 0)::numeric,
    coalesce(sum(d.conversions_lower_funnel), 0)::numeric,
    coalesce(sum(d.conversions_all), 0)::numeric,
    coalesce(sum(d.conversions_lower_funnel), 0)::numeric,
    coalesce(sum(d.conversions_upper_funnel), 0)::numeric,
    coalesce(sum(d.conversion_value), 0)::numeric,
    coalesce(sum(d.reach), 0)::numeric,
    0::numeric,
    coalesce(sum(d.landing_page_views), 0)::numeric,
    coalesce(sum(d.outbound_clicks), 0)::numeric,
    coalesce(sum(d.video_views), 0)::numeric,
    coalesce(sum(d.video_p100), 0)::numeric
  from public.bq_lovable_overview d
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
    and (p_campaign_names is null or array_length(p_campaign_names, 1) is null or d.campaign_name = any(p_campaign_names))
  group by d.date, coalesce(d.platform, d.source_platform, '(unknown)'),
           d.publisher_platform, d.campaign_name
  order by d.date;
end;
$function$;
