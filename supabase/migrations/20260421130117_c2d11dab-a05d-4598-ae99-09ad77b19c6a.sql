
CREATE OR REPLACE FUNCTION public.get_dashboard_daily(p_start date, p_end date, p_platforms text[] DEFAULT NULL::text[], p_campaign_names text[] DEFAULT NULL::text[], p_suppressed_conversions jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(date date, platform text, publisher_platform text, campaign_id text, campaign_name text, campaign_type text, campaign_objective text, audience_type text, impressions numeric, clicks numeric, cost numeric, conversions numeric, conversions_all numeric, conversions_lower_funnel numeric, conversions_upper_funnel numeric, conversion_value numeric, reach numeric, frequency numeric, landing_page_views numeric, outbound_clicks numeric, video_views numeric, video_p100 numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'bq_fdw'
AS $function$
declare
  _suppressed_pairs text[] := ARRAY[]::text[];
  _platform_keys    text[] := NULL;
  _excluded_names   text[] := ARRAY[
    'page_engagement','post_engagement','video_view','photo_view','like','comment',
    'onsite_conversion.post_net_comment','viewcontent',
    'onsite_conversion.total_messaging_connection',
    'onsite_conversion.messaging_conversation_started_7d',
    'onsite_conversion.messaging_conversation_replied_7d',
    'onsite_conversion.messaging_first_reply',
    'onsite_conversion.messaging_welcome_message_view',
    'onsite_conversion.messaging_user_depth_2_message_send',
    'onsite_conversion.post_unsave',
    'onsite_conversion.messaging_block',
    'onsite_conversion.messaging_user_depth_3_message_send',
    'post_uncomment',
    'onsite_conversion.messaging_user_depth_5_message_send'
  ];
begin
  PERFORM set_config('statement_timeout', '540000', true);

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

  if p_platforms is not null and array_length(p_platforms, 1) is not null then
    select array_agg(distinct lower(trim(both from p_pl)))
      into _platform_keys
    from unnest(p_platforms) as p_pl
    where p_pl is not null and length(trim(both from p_pl)) > 0;
  end if;

  if p_suppressed_conversions is not null then
    select coalesce(array_agg(lower(key) || '|' || lower(value)), ARRAY[]::text[])
      into _suppressed_pairs
    from jsonb_each(p_suppressed_conversions) as map(key, val),
         lateral jsonb_array_elements_text(val) as value;
  end if;

  return query
  select
    d.date,
    d.platform,
    coalesce(d.publisher_platform, '')                                                   as publisher_platform,
    d.campaign_id,
    d.campaign_name,
    d.campaign_type,
    d.campaign_objective,
    d.audience_type,
    coalesce(sum(d.impressions), 0)::numeric                                             as impressions,
    coalesce(sum(d.clicks), 0)::numeric                                                  as clicks,
    coalesce(sum(d.cost_usd), 0)::numeric                                                as cost,
    coalesce(sum(case when (lower(coalesce(d.platform,'')) || '|' || lower(coalesce(d.conversion_name,''))) = ANY(_suppressed_pairs)
                      then 0 else d.conversions              end), 0)::numeric           as conversions,
    coalesce(sum(case when (lower(coalesce(d.platform,'')) || '|' || lower(coalesce(d.conversion_name,''))) = ANY(_suppressed_pairs)
                      then 0 else d.conversions_all          end), 0)::numeric           as conversions_all,
    -- Lower funnel: exclude both client-suppressed pairs AND globally-excluded conversion names.
    coalesce(sum(case
        when (lower(coalesce(d.platform,'')) || '|' || lower(coalesce(d.conversion_name,''))) = ANY(_suppressed_pairs) then 0
        when lower(coalesce(d.conversion_name,'')) = ANY(_excluded_names) then 0
        else d.conversions_lower_funnel end), 0)::numeric                                as conversions_lower_funnel,
    coalesce(sum(case
        when (lower(coalesce(d.platform,'')) || '|' || lower(coalesce(d.conversion_name,''))) = ANY(_suppressed_pairs) then 0
        when lower(coalesce(d.conversion_name,'')) = ANY(_excluded_names) then 0
        else d.conversions_upper_funnel end), 0)::numeric                                as conversions_upper_funnel,
    coalesce(sum(case when (lower(coalesce(d.platform,'')) || '|' || lower(coalesce(d.conversion_name,''))) = ANY(_suppressed_pairs)
                      then 0 else d.conversion_value         end), 0)::numeric           as conversion_value,
    coalesce(sum(d.reach), 0)::numeric                                                   as reach,
    case
      when coalesce(sum(case when d.frequency is not null then d.impressions else 0 end), 0) > 0
        then (coalesce(sum(case when d.frequency is not null then d.frequency * d.impressions else 0 end), 0)
              / nullif(sum(case when d.frequency is not null then d.impressions else 0 end), 0))::numeric
      else 0::numeric
    end                                                                                  as frequency,
    coalesce(sum(d.landing_page_views), 0)::numeric                                      as landing_page_views,
    coalesce(sum(d.outbound_clicks), 0)::numeric                                         as outbound_clicks,
    coalesce(sum(d.video_views), 0)::numeric                                             as video_views,
    coalesce(sum(d.video_p100), 0)::numeric                                              as video_p100
  from bq_aesa.aesa_dashboard_daily d
  where d.date between p_start and p_end
    and (
      _platform_keys is null
      or EXISTS (
        select 1 from unnest(_platform_keys) as pk
        where
          lower(coalesce(d.platform, '')) = pk
          or lower(coalesce(d.platform, '')) like '%' || pk || '%'
          or (pk = 'meta' and (
                lower(coalesce(d.platform, '')) like '%facebook%'
             or lower(coalesce(d.platform, '')) like '%instagram%'
          ))
          or (pk = 'x' and lower(coalesce(d.platform, '')) like '%twitter%')
          or (pk = 'snapchat' and lower(coalesce(d.platform, '')) like '%snap%')
          or (pk = 'programmatic' and (
                lower(coalesce(d.platform, '')) like '%dv360%'
             or lower(coalesce(d.platform, '')) like '%display%'
          ))
      )
    )
    and (p_campaign_names is null or array_length(p_campaign_names, 1) is null or d.campaign_name = any(p_campaign_names))
  group by d.date, d.platform, d.publisher_platform, d.campaign_id, d.campaign_name,
           d.campaign_type, d.campaign_objective, d.audience_type
  order by d.date, d.platform, d.campaign_name;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_conversion_breakdown(p_start date, p_end date, p_platforms text[] DEFAULT NULL::text[], p_campaign_names text[] DEFAULT NULL::text[], p_suppressed_conversions jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(platform text, conversion_name text, conversion_funnel_group text, conversions_all numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'bq_fdw'
AS $function$
declare
  _suppressed_pairs text[] := ARRAY[]::text[];
  _platform_keys    text[] := NULL;
  _excluded_names   text[] := ARRAY[
    'page_engagement','post_engagement','video_view','photo_view','like','comment',
    'onsite_conversion.post_net_comment','viewcontent',
    'onsite_conversion.total_messaging_connection',
    'onsite_conversion.messaging_conversation_started_7d',
    'onsite_conversion.messaging_conversation_replied_7d',
    'onsite_conversion.messaging_first_reply',
    'onsite_conversion.messaging_welcome_message_view',
    'onsite_conversion.messaging_user_depth_2_message_send',
    'onsite_conversion.post_unsave',
    'onsite_conversion.messaging_block',
    'onsite_conversion.messaging_user_depth_3_message_send',
    'post_uncomment',
    'onsite_conversion.messaging_user_depth_5_message_send'
  ];
begin
  PERFORM set_config('statement_timeout', '540000', true);

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

  if p_platforms is not null and array_length(p_platforms, 1) is not null then
    select array_agg(distinct lower(trim(both from p_pl)))
      into _platform_keys
    from unnest(p_platforms) as p_pl
    where p_pl is not null and length(trim(both from p_pl)) > 0;
  end if;

  if p_suppressed_conversions is not null then
    select coalesce(array_agg(lower(key) || '|' || lower(value)), ARRAY[]::text[])
      into _suppressed_pairs
    from jsonb_each(p_suppressed_conversions) as map(key, val),
         lateral jsonb_array_elements_text(val) as value;
  end if;

  return query
  select
    d.platform,
    coalesce(d.conversion_name, '(unspecified)')                            as conversion_name,
    case
      when lower(coalesce(d.conversion_name,'')) = ANY(_excluded_names) then 'excluded'
      else coalesce(d.conversion_funnel_group, '(unspecified)')
    end                                                                     as conversion_funnel_group,
    coalesce(sum(d.conversions_all), 0)::numeric                            as conversions_all
  from bq_aesa.aesa_dashboard_daily d
  where d.date between p_start and p_end
    and coalesce(d.is_conversion_row, false) = true
    and (
      _platform_keys is null
      or EXISTS (
        select 1 from unnest(_platform_keys) as pk
        where
          lower(coalesce(d.platform, '')) = pk
          or lower(coalesce(d.platform, '')) like '%' || pk || '%'
          or (pk = 'meta' and (
                lower(coalesce(d.platform, '')) like '%facebook%'
             or lower(coalesce(d.platform, '')) like '%instagram%'
          ))
          or (pk = 'x' and lower(coalesce(d.platform, '')) like '%twitter%')
          or (pk = 'snapchat' and lower(coalesce(d.platform, '')) like '%snap%')
          or (pk = 'programmatic' and (
                lower(coalesce(d.platform, '')) like '%dv360%'
             or lower(coalesce(d.platform, '')) like '%display%'
          ))
      )
    )
    and (p_campaign_names is null or array_length(p_campaign_names, 1) is null or d.campaign_name = any(p_campaign_names))
    and (lower(coalesce(d.platform,'')) || '|' || lower(coalesce(d.conversion_name,''))) <> ALL(_suppressed_pairs)
  group by d.platform, d.conversion_name, case
      when lower(coalesce(d.conversion_name,'')) = ANY(_excluded_names) then 'excluded'
      else coalesce(d.conversion_funnel_group, '(unspecified)')
    end
  order by d.platform, conversions_all desc;
end;
$function$;
