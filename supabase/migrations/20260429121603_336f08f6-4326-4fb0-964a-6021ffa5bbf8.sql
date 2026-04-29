create or replace function public.diag_meta_publisher_split(
  p_start date default '2025-01-01',
  p_end   date default '2026-12-31'
)
returns table (
  month date,
  publisher_platform text,
  rows_count bigint,
  total_cost_usd numeric,
  total_impressions numeric,
  total_clicks numeric
)
language plpgsql
stable
security definer
set search_path = public, bq_aesa
as $$
begin
  perform set_config('statement_timeout', '180000', true);
  if auth.uid() is not null and not (public.has_role(auth.uid(), 'admin'::public.app_role) or public.has_role(auth.uid(), 'superadmin'::public.app_role)) then
    raise exception 'Insufficient privileges';
  end if;

  return query
  select date_trunc('month', d.date)::date as month,
         coalesce(nullif(d.publisher_platform, ''), '(null)') as publisher_platform,
         count(*)::bigint,
         coalesce(sum(d.cost_usd), 0)::numeric,
         coalesce(sum(d.impressions), 0)::numeric,
         coalesce(sum(d.clicks), 0)::numeric
  from bq_aesa.dashboard_daily d
  where d.date between p_start and p_end
    and coalesce(d.is_conversion_row, false) = false
    and (lower(coalesce(d.platform,'')) like '%meta%'
      or lower(coalesce(d.platform,'')) like '%facebook%'
      or lower(coalesce(d.platform,'')) like '%instagram%')
  group by 1, 2
  order by 1, 2;
end;
$$;

revoke all on function public.diag_meta_publisher_split(date, date) from public, anon;
grant execute on function public.diag_meta_publisher_split(date, date) to authenticated;