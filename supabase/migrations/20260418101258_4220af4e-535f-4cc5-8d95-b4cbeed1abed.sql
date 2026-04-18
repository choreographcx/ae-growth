DROP FUNCTION IF EXISTS public.get_dashboard_daily(date, date, text[], text[]);

CREATE OR REPLACE FUNCTION public.get_dashboard_daily(
  p_start date,
  p_end date,
  p_platforms text[] DEFAULT NULL,
  p_campaign_names text[] DEFAULT NULL
)
RETURNS TABLE(
  date date,
  platform text,
  publisher_platform text,
  campaign_id text,
  campaign_name text,
  campaign_type text,
  campaign_objective text,
  audience_type text,
  impressions numeric,
  clicks numeric,
  cost numeric,
  conversions numeric,
  conversions_all numeric,
  conversions_lower_funnel numeric,
  conversions_upper_funnel numeric,
  conversion_value numeric,
  reach numeric,
  landing_page_views numeric,
  outbound_clicks numeric,
  video_views numeric,
  video_p100 numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'bq_fdw'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_start is null or p_end is null then
    raise exception 'p_start and p_end are required';
  end if;
  if p_end < p_start then
    raise exception 'p_end must be on or after p_start';
  end if;
  if (p_end - p_start) > 366 then
    raise exception 'Date range cannot exceed 366 days';
  end if;

  return query
  select
    d.date,
    d.platform,
    coalesce(d.publisher_platform, '')                      as publisher_platform,
    d.campaign_id,
    d.campaign_name,
    d.campaign_type,
    d.campaign_objective,
    d.audience_type,
    coalesce(sum(d.impressions), 0)::numeric                as impressions,
    coalesce(sum(d.clicks), 0)::numeric                     as clicks,
    coalesce(sum(d.cost_usd), 0)::numeric                   as cost,
    coalesce(sum(d.conversions), 0)::numeric                as conversions,
    coalesce(sum(d.conversions_all), 0)::numeric            as conversions_all,
    coalesce(sum(d.conversions_lower_funnel), 0)::numeric   as conversions_lower_funnel,
    coalesce(sum(d.conversions_upper_funnel), 0)::numeric   as conversions_upper_funnel,
    coalesce(sum(d.conversion_value), 0)::numeric           as conversion_value,
    coalesce(sum(d.reach), 0)::numeric                      as reach,
    coalesce(sum(d.landing_page_views), 0)::numeric         as landing_page_views,
    coalesce(sum(d.outbound_clicks), 0)::numeric            as outbound_clicks,
    coalesce(sum(d.video_views), 0)::numeric                as video_views,
    coalesce(sum(d.video_p100), 0)::numeric                 as video_p100
  from bq_fdw.aroya_dashboard_daily d
  where d.date between p_start and p_end
    and (p_platforms is null      or array_length(p_platforms, 1)      is null or d.platform      = any(p_platforms))
    and (p_campaign_names is null or array_length(p_campaign_names, 1) is null or d.campaign_name = any(p_campaign_names))
  group by d.date, d.platform, d.publisher_platform, d.campaign_id, d.campaign_name, d.campaign_type, d.campaign_objective, d.audience_type
  order by d.date, d.platform, d.campaign_name;
end;
$function$;