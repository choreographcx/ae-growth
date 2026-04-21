CREATE OR REPLACE FUNCTION public.debug_snapchat_reach(p_start date, p_end date)
RETURNS TABLE(
  date date,
  platform text,
  is_conversion_row boolean,
  reach numeric,
  impressions numeric,
  campaign_name text,
  conversion_name text,
  row_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'bq_fdw'
AS $function$
begin
  perform set_config('statement_timeout', '120000', true);
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not (public.has_role(auth.uid(), 'admin'::public.app_role) or public.has_role(auth.uid(), 'superadmin'::public.app_role)) then
    raise exception 'Insufficient privileges';
  end if;
  return query
  select
    d.date,
    d.platform,
    coalesce(d.is_conversion_row, false) as is_conversion_row,
    coalesce(sum(d.reach), 0)::numeric as reach,
    coalesce(sum(d.impressions), 0)::numeric as impressions,
    coalesce(d.campaign_name, '') as campaign_name,
    coalesce(d.conversion_name, '') as conversion_name,
    count(*)::bigint as row_count
  from bq_fdw.aroya_dashboard_daily d
  where d.date between p_start and p_end
    and lower(coalesce(d.platform,'')) like '%snap%'
    and coalesce(d.reach, 0) > 0
  group by d.date, d.platform, d.is_conversion_row, d.campaign_name, d.conversion_name
  order by reach desc
  limit 50;
end;
$function$;