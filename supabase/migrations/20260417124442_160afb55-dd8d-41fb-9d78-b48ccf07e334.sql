-- Drop the old signature so we can change the return shape & params
drop function if exists public.get_dashboard_daily(date, date);

create or replace function public.get_dashboard_daily(
  p_start          date,
  p_end            date,
  p_platforms      text[] default null,
  p_campaign_names text[] default null
)
returns table (
  date               date,
  platform           text,
  campaign_id        text,
  campaign_name      text,
  impressions        numeric,
  clicks             numeric,
  cost               numeric,
  conversions        numeric,
  conversion_value   numeric,
  reach              numeric,
  landing_page_views numeric,
  video_views        numeric
)
language plpgsql
stable
security definer
set search_path = public, bq_fdw
as $$
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
    coalesce(sum(d.impressions), 0)::numeric        as impressions,
    coalesce(sum(d.clicks), 0)::numeric             as clicks,
    coalesce(sum(d.cost), 0)::numeric               as cost,
    coalesce(sum(d.conversions), 0)::numeric        as conversions,
    coalesce(sum(d.conversion_value), 0)::numeric   as conversion_value,
    coalesce(sum(d.reach), 0)::numeric              as reach,
    coalesce(sum(d.landing_page_views), 0)::numeric as landing_page_views,
    coalesce(sum(d.video_views), 0)::numeric        as video_views
  from bq_fdw.aroya_dashboard_daily d
  where d.date between p_start and p_end
    and (p_platforms is null      or array_length(p_platforms, 1)      is null or d.platform      = any(p_platforms))
    and (p_campaign_names is null or array_length(p_campaign_names, 1) is null or d.campaign_name = any(p_campaign_names))
  group by d.date, d.platform, d.campaign_id, d.campaign_name
  order by d.date, d.platform, d.campaign_name;
end;
$$;

revoke all on function public.get_dashboard_daily(date, date, text[], text[]) from public;
revoke all on function public.get_dashboard_daily(date, date, text[], text[]) from anon;
grant execute on function public.get_dashboard_daily(date, date, text[], text[]) to authenticated;