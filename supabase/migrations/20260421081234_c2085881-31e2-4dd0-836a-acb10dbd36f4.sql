CREATE TABLE IF NOT EXISTS public._debug_rpc_snap (
  id serial primary key,
  date date,
  platform text,
  publisher_platform text,
  campaign_id text,
  campaign_name text,
  reach numeric,
  impressions numeric,
  clicks numeric,
  cost numeric
);

CREATE OR REPLACE FUNCTION public._debug_rpc_snap_capture()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'bq_fdw'
AS $function$
declare r record;
begin
  perform set_config('statement_timeout', '120000', true);
  delete from public._debug_rpc_snap;
  for r in
    select
      d.date,
      d.platform,
      coalesce(d.publisher_platform, '')  as publisher_platform,
      d.campaign_id,
      d.campaign_name,
      coalesce(sum(d.reach), 0)::numeric  as reach,
      coalesce(sum(d.impressions), 0)::numeric  as impressions,
      coalesce(sum(d.clicks), 0)::numeric  as clicks,
      coalesce(sum(d.cost_usd), 0)::numeric  as cost
    from bq_aesa.aesa_dashboard_daily d
    where d.date between '2026-04-20'::date and '2026-04-21'::date
      and lower(coalesce(d.platform,'')) like '%snap%'
    group by d.date, d.platform, d.publisher_platform, d.campaign_id, d.campaign_name,
             d.campaign_type, d.campaign_objective, d.audience_type
  loop
    insert into public._debug_rpc_snap (date, platform, publisher_platform, campaign_id, campaign_name, reach, impressions, clicks, cost)
    values (r.date, r.platform, r.publisher_platform, r.campaign_id, r.campaign_name, r.reach, r.impressions, r.clicks, r.cost);
  end loop;
end;
$function$;

SELECT public._debug_rpc_snap_capture();