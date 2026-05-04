
-- =========================================================================
-- get_dashboard_daily: read from public.bq_all_platform_deep_dive
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_daily(
  p_start date,
  p_end date,
  p_platforms text[] DEFAULT NULL::text[],
  p_campaign_names text[] DEFAULT NULL::text[],
  p_suppressed_conversions jsonb DEFAULT NULL::jsonb
)
RETURNS TABLE(
  date date, platform text, publisher_platform text,
  campaign_id text, campaign_name text,
  campaign_type text, campaign_objective text, audience_type text,
  impressions numeric, clicks numeric, cost numeric,
  conversions numeric, conversions_all numeric,
  conversions_lower_funnel numeric, conversions_upper_funnel numeric,
  conversion_value numeric, reach numeric, frequency numeric,
  landing_page_views numeric, outbound_clicks numeric,
  video_views numeric, video_p100 numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
    coalesce(d.source_platform, '(unknown)') as platform,
    ''::text as publisher_platform,
    NULL::text as campaign_id,
    d.campaign_name,
    NULL::text as campaign_type,
    NULL::text as campaign_objective,
    NULL::text as audience_type,
    coalesce(sum(d.impressions), 0)::numeric as impressions,
    coalesce(sum(d.clicks), 0)::numeric as clicks,
    coalesce(sum(d.spend), 0)::numeric as cost,
    coalesce(sum(d.leads), 0)::numeric as conversions,
    coalesce(sum(d.leads), 0)::numeric as conversions_all,
    coalesce(sum(d.leads), 0)::numeric as conversions_lower_funnel,
    0::numeric as conversions_upper_funnel,
    0::numeric as conversion_value,
    coalesce(sum(d.reach), 0)::numeric as reach,
    0::numeric as frequency,
    0::numeric as landing_page_views,
    0::numeric as outbound_clicks,
    coalesce(sum(d.video_views_15s), 0)::numeric as video_views,
    0::numeric as video_p100
  from public.bq_all_platform_deep_dive d
  where d.date between p_start and p_end
    and (_platform_keys is null or EXISTS (
      select 1 from unnest(_platform_keys) as pk where
        lower(coalesce(d.source_platform,'')) = pk
        or lower(coalesce(d.source_platform,'')) like '%' || pk || '%'
        or (pk = 'meta' and (lower(coalesce(d.source_platform,'')) like '%facebook%' or lower(coalesce(d.source_platform,'')) like '%instagram%'))
        or (pk = 'x' and lower(coalesce(d.source_platform,'')) like '%twitter%')
        or (pk = 'snapchat' and lower(coalesce(d.source_platform,'')) like '%snap%')
        or (pk = 'programmatic' and (lower(coalesce(d.source_platform,'')) like '%dv360%' or lower(coalesce(d.source_platform,'')) like '%display%'))
    ))
    and (p_campaign_names is null or array_length(p_campaign_names, 1) is null or d.campaign_name = any(p_campaign_names))
  group by d.date, d.source_platform, d.campaign_name
  order by d.date, d.source_platform, d.campaign_name;
end;
$function$;

-- =========================================================================
-- get_dashboard_conversion_breakdown: synthesize one "leads" row per platform
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_conversion_breakdown(
  p_start date,
  p_end date,
  p_platforms text[] DEFAULT NULL::text[],
  p_campaign_names text[] DEFAULT NULL::text[],
  p_suppressed_conversions jsonb DEFAULT NULL::jsonb
)
RETURNS TABLE(
  platform text, conversion_name text,
  conversion_funnel_group text, conversions_all numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
    coalesce(d.source_platform, '(unknown)') as platform,
    'leads'::text as conversion_name,
    'lower'::text as conversion_funnel_group,
    coalesce(sum(d.leads), 0)::numeric as conversions_all
  from public.bq_all_platform_deep_dive d
  where d.date between p_start and p_end
    and coalesce(d.leads, 0) > 0
    and (_platform_keys is null or EXISTS (
      select 1 from unnest(_platform_keys) as pk where
        lower(coalesce(d.source_platform,'')) = pk
        or lower(coalesce(d.source_platform,'')) like '%' || pk || '%'
        or (pk = 'meta' and (lower(coalesce(d.source_platform,'')) like '%facebook%' or lower(coalesce(d.source_platform,'')) like '%instagram%'))
        or (pk = 'x' and lower(coalesce(d.source_platform,'')) like '%twitter%')
        or (pk = 'snapchat' and lower(coalesce(d.source_platform,'')) like '%snap%')
        or (pk = 'programmatic' and (lower(coalesce(d.source_platform,'')) like '%dv360%' or lower(coalesce(d.source_platform,'')) like '%display%'))
    ))
    and (p_campaign_names is null or array_length(p_campaign_names, 1) is null or d.campaign_name = any(p_campaign_names))
  group by d.source_platform
  order by 4 desc;
end;
$function$;

-- =========================================================================
-- get_dashboard_ad_breakdown: aggregate from new source
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_ad_breakdown(
  p_start date,
  p_end date,
  p_level text DEFAULT 'ad'::text,
  p_platform text DEFAULT NULL::text,
  p_limit integer DEFAULT 200
)
RETURNS TABLE(
  platform text, campaign_name text,
  ad_group_id text, ad_group_name text,
  ad_id text, ad_name text,
  impressions numeric, clicks numeric, cost numeric,
  conversions_lower_funnel numeric, conversions_all numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  _pk text := NULLIF(lower(trim(coalesce(p_platform, ''))), '');
  _is_ad_group boolean := lower(coalesce(p_level, 'ad')) = 'ad_group';
begin
  PERFORM set_config('statement_timeout', '540000', true);
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.get_profile_is_approved(auth.uid()) then raise exception 'Account pending approval'; end if;
  if p_start is null or p_end is null then raise exception 'p_start and p_end are required'; end if;
  if p_end < p_start then raise exception 'p_end must be on or after p_start'; end if;
  if (p_end - p_start) > 366 then raise exception 'Date range cannot exceed 366 days'; end if;

  return query
  with base as (
    select
      coalesce(d.source_platform, '(unknown)') as platform,
      d.campaign_name,
      NULL::text as ad_group_id,
      d.adset_name as ad_group_name,
      NULL::text as ad_id,
      case when _is_ad_group then NULL else d.ad_name end as ad_name,
      d.impressions, d.clicks, d.spend, d.leads
    from public.bq_all_platform_deep_dive d
    where d.date between p_start and p_end
      and (
        _pk is null
        or lower(coalesce(d.source_platform,'')) = _pk
        or lower(coalesce(d.source_platform,'')) like '%' || _pk || '%'
        or (_pk = 'meta' and (lower(coalesce(d.source_platform,'')) like '%facebook%' or lower(coalesce(d.source_platform,'')) like '%instagram%'))
        or (_pk = 'x' and lower(coalesce(d.source_platform,'')) like '%twitter%')
        or (_pk = 'snapchat' and lower(coalesce(d.source_platform,'')) like '%snap%')
        or (_pk = 'programmatic' and (lower(coalesce(d.source_platform,'')) like '%dv360%' or lower(coalesce(d.source_platform,'')) like '%display%'))
      )
      and (
        (_is_ad_group and d.adset_name is not null and length(trim(d.adset_name)) > 0)
        or (not _is_ad_group and d.ad_name is not null and length(trim(d.ad_name)) > 0)
      )
  )
  select
    b.platform,
    (array_agg(distinct b.campaign_name))[1] as campaign_name,
    b.ad_group_id,
    b.ad_group_name,
    b.ad_id,
    b.ad_name,
    coalesce(sum(b.impressions), 0)::numeric,
    coalesce(sum(b.clicks), 0)::numeric,
    coalesce(sum(b.spend), 0)::numeric,
    coalesce(sum(b.leads), 0)::numeric as conversions_lower_funnel,
    coalesce(sum(b.leads), 0)::numeric as conversions_all
  from base b
  group by b.platform, b.ad_group_id, b.ad_group_name, b.ad_id, b.ad_name
  having coalesce(sum(b.spend), 0) > 0
      or coalesce(sum(b.impressions), 0) > 0
      or coalesce(sum(b.clicks), 0) > 0
  order by coalesce(sum(b.spend), 0) desc
  limit greatest(coalesce(p_limit, 200), 1);
end;
$function$;

-- =========================================================================
-- Diagnostic / integrity functions: return empty (legacy columns gone)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_platform_currency_integrity(
  p_start date DEFAULT ((CURRENT_DATE - '30 days'::interval))::date,
  p_end date DEFAULT CURRENT_DATE
)
RETURNS TABLE(platform text, total_cost numeric, total_cost_usd numeric, implied_rate numeric, rows_scanned bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not (public.has_role(auth.uid(), 'admin'::public.app_role) or public.has_role(auth.uid(), 'superadmin'::public.app_role)) then
    raise exception 'Insufficient privileges';
  end if;
  -- New source has no cost/cost_usd split.
  return;
end;
$function$;

CREATE OR REPLACE FUNCTION public.diag_conv_events(p_start date, p_end date)
RETURNS TABLE(platform text, conversion_name text, conversion_funnel_group text, rows_count bigint, conv_all numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  return;
end;
$function$;

CREATE OR REPLACE FUNCTION public.diag_meta_monthly(
  p_start date DEFAULT '2025-01-01'::date,
  p_end date DEFAULT '2026-12-31'::date
)
RETURNS TABLE(month date, platform text, is_conversion_row boolean, rows_count bigint, total_cost numeric, total_cost_usd numeric, total_impressions numeric, total_clicks numeric, total_conversions_all numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null and not (public.has_role(auth.uid(), 'admin'::public.app_role) or public.has_role(auth.uid(), 'superadmin'::public.app_role)) then
    raise exception 'Insufficient privileges';
  end if;
  return;
end;
$function$;

CREATE OR REPLACE FUNCTION public.diag_platform_monthly(
  p_platform_key text,
  p_start date DEFAULT '2025-01-01'::date,
  p_end date DEFAULT '2026-12-31'::date
)
RETURNS TABLE(month date, platform text, is_conversion_row boolean, rows_count bigint, total_cost numeric, total_cost_usd numeric, total_impressions numeric, total_clicks numeric, total_conversions_all numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null and not (public.has_role(auth.uid(), 'admin'::public.app_role) or public.has_role(auth.uid(), 'superadmin'::public.app_role)) then
    raise exception 'Insufficient privileges';
  end if;
  return;
end;
$function$;

CREATE OR REPLACE FUNCTION public.diag_meta_publisher_split(
  p_start date DEFAULT '2025-01-01'::date,
  p_end date DEFAULT '2026-12-31'::date
)
RETURNS TABLE(month date, publisher_platform text, rows_count bigint, total_cost_usd numeric, total_impressions numeric, total_clicks numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null and not (public.has_role(auth.uid(), 'admin'::public.app_role) or public.has_role(auth.uid(), 'superadmin'::public.app_role)) then
    raise exception 'Insufficient privileges';
  end if;
  return;
end;
$function$;

CREATE OR REPLACE FUNCTION public.diag_frequency_signal(
  p_start date DEFAULT (CURRENT_DATE - 30),
  p_end date DEFAULT CURRENT_DATE
)
RETURNS TABLE(platform text, rows_total bigint, freq_nonnull bigint, freq_positive bigint, reach_positive bigint, max_frequency numeric, max_reach numeric, sample_frequency numeric, sample_reach numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null and not (public.has_role(auth.uid(), 'admin'::public.app_role) or public.has_role(auth.uid(), 'superadmin'::public.app_role)) then
    raise exception 'Insufficient privileges';
  end if;
  return;
end;
$function$;
