DROP FOREIGN TABLE IF EXISTS bq_fdw.aroya_dashboard_daily CASCADE;

CREATE FOREIGN TABLE bq_fdw.aesa_dashboard_daily (
  platform                       text,
  date                           date,
  account_id                     text,
  account_name                   text,
  campaign_id                    text,
  campaign_name                  text,
  ad_group_id                    text,
  ad_group_name                  text,
  ad_id                          text,
  ad_name                        text,
  publisher_platform             text,
  data_source_name               text,
  campaign_type                  text,
  campaign_objective             text,
  audience_type                  text,
  conversion_name                text,
  conversion_funnel_group        text,
  conversion_type                text,
  is_conversion_row              boolean,

  impressions                    double precision,
  reach                          double precision,
  clicks                         double precision,
  landing_page_views             double precision,
  outbound_clicks                double precision,
  outbound_ctr                   double precision,

  cost                           double precision,
  cost_usd                       double precision,

  video_views                    double precision,
  video_p25                      double precision,
  video_p50                      double precision,
  video_p75                      double precision,
  video_p100                     double precision,

  conversions_all                double precision,
  conversions_lower_funnel       double precision,
  conversions_upper_funnel       double precision,
  conversions_primary            double precision,
  conversions                    double precision,
  conversion_value               double precision,

  cpc                            double precision,
  cpm                            double precision,
  ctr                            double precision,
  frequency                      double precision,
  roas                           double precision,

  cpa_lower_funnel               double precision,
  cpa_all_conversions            double precision,

  lpv_rate                       double precision,
  cvr_lower_funnel               double precision,
  conversion_rate_all            double precision,
  conversion_rate_lower_funnel   double precision,

  cost_per_video_view            double precision,
  cost_per_lpv                   double precision,

  is_wasted_spend                boolean
)
SERVER bq_aroya_server
OPTIONS (
  table 'Aroya_Dashboard_Daily',
  location 'US'
);

CREATE OR REPLACE FUNCTION public.get_dashboard_daily(
  p_start date,
  p_end date,
  p_platforms text[] DEFAULT NULL,
  p_campaign_names text[] DEFAULT NULL
)
RETURNS TABLE(
  date date,
  platform text,
  campaign_id text,
  campaign_name text,
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
  video_views numeric
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
    d.campaign_id,
    d.campaign_name,
    coalesce(sum(d.impressions), 0)::numeric                as impressions,
    coalesce(sum(d.clicks), 0)::numeric                     as clicks,
    coalesce(sum(d.cost), 0)::numeric                       as cost,
    coalesce(sum(d.conversions), 0)::numeric                as conversions,
    coalesce(sum(d.conversions_all), 0)::numeric            as conversions_all,
    coalesce(sum(d.conversions_lower_funnel), 0)::numeric   as conversions_lower_funnel,
    coalesce(sum(d.conversions_upper_funnel), 0)::numeric   as conversions_upper_funnel,
    coalesce(sum(d.conversion_value), 0)::numeric           as conversion_value,
    coalesce(sum(d.reach), 0)::numeric                      as reach,
    coalesce(sum(d.landing_page_views), 0)::numeric         as landing_page_views,
    coalesce(sum(d.video_views), 0)::numeric                as video_views
  from bq_fdw.aroya_dashboard_daily d
  where d.date between p_start and p_end
    and (p_platforms is null      or array_length(p_platforms, 1)      is null or d.platform      = any(p_platforms))
    and (p_campaign_names is null or array_length(p_campaign_names, 1) is null or d.campaign_name = any(p_campaign_names))
  group by d.date, d.platform, d.campaign_id, d.campaign_name
  order by d.date, d.platform, d.campaign_name;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_conversion_breakdown(
  p_start date,
  p_end date,
  p_platforms text[] DEFAULT NULL,
  p_campaign_names text[] DEFAULT NULL
)
RETURNS TABLE(
  platform text,
  conversion_name text,
  conversion_funnel_group text,
  conversions_all numeric
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
    d.platform,
    coalesce(d.conversion_name, '(unspecified)')         as conversion_name,
    coalesce(d.conversion_funnel_group, '(unspecified)') as conversion_funnel_group,
    coalesce(sum(d.conversions_all), 0)::numeric         as conversions_all
  from bq_fdw.aroya_dashboard_daily d
  where d.date between p_start and p_end
    and coalesce(d.is_conversion_row, false) = true
    and (p_platforms is null      or array_length(p_platforms, 1)      is null or d.platform      = any(p_platforms))
    and (p_campaign_names is null or array_length(p_campaign_names, 1) is null or d.campaign_name = any(p_campaign_names))
  group by d.platform, d.conversion_name, d.conversion_funnel_group
  order by d.platform, conversions_all desc;
end;
$function$;