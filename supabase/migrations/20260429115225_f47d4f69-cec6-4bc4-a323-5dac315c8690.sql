CREATE OR REPLACE FUNCTION public.diag_platform_monthly(p_platform_key text, p_start date DEFAULT '2025-01-01', p_end date DEFAULT '2026-12-31')
RETURNS TABLE(
  month date,
  platform text,
  is_conversion_row boolean,
  rows_count bigint,
  total_cost numeric,
  total_cost_usd numeric,
  total_impressions numeric,
  total_clicks numeric,
  total_conversions_all numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'bq_aesa'
AS $function$
declare
  _pk text := lower(coalesce(p_platform_key, ''));
begin
  perform set_config('statement_timeout', '180000', true);
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not (public.has_role(auth.uid(), 'admin'::public.app_role) or public.has_role(auth.uid(), 'superadmin'::public.app_role)) then
    raise exception 'Insufficient privileges';
  end if;

  return query
  select date_trunc('month', d.date)::date as month,
         coalesce(d.platform, '(unknown)') as platform,
         coalesce(d.is_conversion_row, false) as is_conversion_row,
         count(*)::bigint,
         coalesce(sum(d.cost), 0)::numeric,
         coalesce(sum(d.cost_usd), 0)::numeric,
         coalesce(sum(d.impressions), 0)::numeric,
         coalesce(sum(d.clicks), 0)::numeric,
         coalesce(sum(d.conversions_all), 0)::numeric
  from bq_aesa.dashboard_daily d
  where d.date between p_start and p_end
    and (
      lower(coalesce(d.platform,'')) = _pk
      or lower(coalesce(d.platform,'')) like '%' || _pk || '%'
      or (_pk = 'meta' and (lower(coalesce(d.platform,'')) like '%facebook%' or lower(coalesce(d.platform,'')) like '%instagram%'))
      or (_pk = 'google' and lower(coalesce(d.platform,'')) like '%google%')
      or (_pk = 'google_ads' and lower(coalesce(d.platform,'')) like '%google%')
      or (_pk = 'x' and lower(coalesce(d.platform,'')) like '%twitter%')
      or (_pk = 'snapchat' and lower(coalesce(d.platform,'')) like '%snap%')
      or (_pk = 'programmatic' and (lower(coalesce(d.platform,'')) like '%dv360%' or lower(coalesce(d.platform,'')) like '%display%'))
    )
  group by 1, 2, 3
  order by 1, 2, 3;
end;
$function$;

REVOKE ALL ON FUNCTION public.diag_platform_monthly(text, date, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.diag_platform_monthly(text, date, date) TO authenticated;