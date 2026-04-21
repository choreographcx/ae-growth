CREATE TABLE IF NOT EXISTS public._debug_snap_rows (
  id serial primary key,
  date date,
  platform text,
  publisher_platform text,
  campaign_id text,
  campaign_name text,
  campaign_objective text,
  audience_type text,
  is_conversion_row boolean,
  reach numeric,
  impressions numeric,
  clicks numeric,
  cost numeric
);

CREATE OR REPLACE FUNCTION public._debug_snap_rows_capture()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'bq_fdw'
AS $function$
begin
  perform set_config('statement_timeout', '120000', true);
  delete from public._debug_snap_rows;
  insert into public._debug_snap_rows (date, platform, publisher_platform, campaign_id, campaign_name, campaign_objective, audience_type, is_conversion_row, reach, impressions, clicks, cost)
  select
    d.date, d.platform, d.publisher_platform, d.campaign_id, d.campaign_name,
    d.campaign_objective, d.audience_type, coalesce(d.is_conversion_row, false),
    d.reach, d.impressions, d.clicks, d.cost
  from bq_fdw.aroya_dashboard_daily d
  where d.date between '2026-03-22'::date and '2026-04-21'::date
    and lower(coalesce(d.platform,'')) like '%snap%'
    and coalesce(d.reach, 0) > 0
  order by d.reach desc
  limit 30;
end;
$function$;

SELECT public._debug_snap_rows_capture();