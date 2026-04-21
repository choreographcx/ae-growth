CREATE TABLE IF NOT EXISTS public._debug_snap_stats (
  id serial primary key,
  platform text,
  total_rows bigint,
  total_reach numeric,
  total_imp numeric,
  rows_with_reach bigint,
  conv_rows bigint,
  noconv_rows bigint,
  conv_rows_with_reach bigint,
  noconv_rows_with_reach bigint,
  captured_at timestamptz default now()
);

CREATE OR REPLACE FUNCTION public._debug_snap_capture()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'bq_fdw'
AS $function$
begin
  perform set_config('statement_timeout', '120000', true);
  delete from public._debug_snap_stats;
  insert into public._debug_snap_stats (platform, total_rows, total_reach, total_imp, rows_with_reach, conv_rows, noconv_rows, conv_rows_with_reach, noconv_rows_with_reach)
  select
    d.platform,
    count(*)::bigint,
    coalesce(sum(d.reach),0)::numeric,
    coalesce(sum(d.impressions),0)::numeric,
    count(*) filter (where coalesce(d.reach,0) > 0)::bigint,
    count(*) filter (where coalesce(d.is_conversion_row, false))::bigint,
    count(*) filter (where not coalesce(d.is_conversion_row, false))::bigint,
    count(*) filter (where coalesce(d.is_conversion_row, false) and coalesce(d.reach,0) > 0)::bigint,
    count(*) filter (where not coalesce(d.is_conversion_row, false) and coalesce(d.reach,0) > 0)::bigint
  from bq_fdw.aroya_dashboard_daily d
  where d.date between '2026-03-22'::date and '2026-04-21'::date
    and lower(coalesce(d.platform,'')) like '%snap%'
  group by d.platform;
end;
$function$;

SELECT public._debug_snap_capture();