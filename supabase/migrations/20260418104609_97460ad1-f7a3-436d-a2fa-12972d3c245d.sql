-- Add per-platform conversion suppression to dashboard RPCs.
-- The new p_suppressed_conversions parameter accepts a JSON object like:
--   {"meta": ["omni_purchase","onsite_web_purchase"], "google": []}
-- Matched rows have their conversion columns treated as zero (daily) and
-- are excluded from the breakdown. Comparison is case-insensitive.

CREATE OR REPLACE FUNCTION public.get_dashboard_daily(
  p_start date,
  p_end date,
  p_platforms text[] DEFAULT NULL::text[],
  p_campaign_names text[] DEFAULT NULL::text[],
  p_suppressed_conversions jsonb DEFAULT NULL::jsonb
)
RETURNS TABLE(
  date date, platform text, publisher_platform text,
  campaign_id text, campaign_name text, campaign_type text,
  campaign_objective text, audience_type text,
  impressions numeric, clicks numeric, cost numeric,
  conversions numeric, conversions_all numeric,
  conversions_lower_funnel numeric, conversions_upper_funnel numeric,
  conversion_value numeric, reach numeric,
  landing_page_views numeric, outbound_clicks numeric,
  video_views numeric, video_p100 numeric
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
  with suppressed as (
    -- Flatten the JSON map into (platform_lower, conversion_name_lower) pairs.
    select
      lower(key)                  as platform_key,
      lower(value::text)          as conversion_name_lower
    from jsonb_each(coalesce(p_suppressed_conversions, '{}'::jsonb)) as map(key, val),
         lateral jsonb_array_elements_text(val) as value
  ),
  flagged as (
    select
      d.*,
      case when exists (
        select 1 from suppressed s
        where s.platform_key         = lower(coalesce(d.platform, ''))
          and s.conversion_name_lower = lower(coalesce(d.conversion_name, ''))
      ) then true else false end as is_suppressed
    from bq_fdw.aroya_dashboard_daily d
    where d.date between p_start and p_end
      and (p_platforms      is null or array_length(p_platforms, 1)      is null or d.platform      = any(p_platforms))
      and (p_campaign_names is null or array_length(p_campaign_names, 1) is null or d.campaign_name = any(p_campaign_names))
  )
  select
    f.date,
    f.platform,
    coalesce(f.publisher_platform, '')                                                  as publisher_platform,
    f.campaign_id,
    f.campaign_name,
    f.campaign_type,
    f.campaign_objective,
    f.audience_type,
    coalesce(sum(f.impressions), 0)::numeric                                            as impressions,
    coalesce(sum(f.clicks), 0)::numeric                                                 as clicks,
    coalesce(sum(f.cost_usd), 0)::numeric                                               as cost,
    coalesce(sum(case when f.is_suppressed then 0 else f.conversions               end), 0)::numeric as conversions,
    coalesce(sum(case when f.is_suppressed then 0 else f.conversions_all           end), 0)::numeric as conversions_all,
    coalesce(sum(case when f.is_suppressed then 0 else f.conversions_lower_funnel  end), 0)::numeric as conversions_lower_funnel,
    coalesce(sum(case when f.is_suppressed then 0 else f.conversions_upper_funnel  end), 0)::numeric as conversions_upper_funnel,
    coalesce(sum(case when f.is_suppressed then 0 else f.conversion_value          end), 0)::numeric as conversion_value,
    coalesce(sum(f.reach), 0)::numeric                                                  as reach,
    coalesce(sum(f.landing_page_views), 0)::numeric                                     as landing_page_views,
    coalesce(sum(f.outbound_clicks), 0)::numeric                                        as outbound_clicks,
    coalesce(sum(f.video_views), 0)::numeric                                            as video_views,
    coalesce(sum(f.video_p100), 0)::numeric                                             as video_p100
  from flagged f
  group by f.date, f.platform, f.publisher_platform, f.campaign_id, f.campaign_name,
           f.campaign_type, f.campaign_objective, f.audience_type
  order by f.date, f.platform, f.campaign_name;
end;
$function$;


CREATE OR REPLACE FUNCTION public.get_dashboard_conversion_breakdown(
  p_start date,
  p_end date,
  p_platforms text[] DEFAULT NULL::text[],
  p_campaign_names text[] DEFAULT NULL::text[],
  p_suppressed_conversions jsonb DEFAULT NULL::jsonb
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
  with suppressed as (
    select
      lower(key)         as platform_key,
      lower(value::text) as conversion_name_lower
    from jsonb_each(coalesce(p_suppressed_conversions, '{}'::jsonb)) as map(key, val),
         lateral jsonb_array_elements_text(val) as value
  )
  select
    d.platform,
    coalesce(d.conversion_name, '(unspecified)')         as conversion_name,
    coalesce(d.conversion_funnel_group, '(unspecified)') as conversion_funnel_group,
    coalesce(sum(d.conversions_all), 0)::numeric         as conversions_all
  from bq_fdw.aroya_dashboard_daily d
  where d.date between p_start and p_end
    and coalesce(d.is_conversion_row, false) = true
    and (p_platforms      is null or array_length(p_platforms, 1)      is null or d.platform      = any(p_platforms))
    and (p_campaign_names is null or array_length(p_campaign_names, 1) is null or d.campaign_name = any(p_campaign_names))
    and not exists (
      select 1 from suppressed s
      where s.platform_key         = lower(coalesce(d.platform, ''))
        and s.conversion_name_lower = lower(coalesce(d.conversion_name, ''))
    )
  group by d.platform, d.conversion_name, d.conversion_funnel_group
  order by d.platform, conversions_all desc;
end;
$function$;