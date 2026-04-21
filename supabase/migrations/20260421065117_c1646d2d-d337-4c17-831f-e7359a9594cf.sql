-- RPC: per-platform currency integrity stats from BigQuery FDW.
-- Returns one row per platform with cost (native), cost_usd, and the implied
-- USD→native rate. The Admin UI uses this to flag mismatches against the
-- configured per-platform reporting currency.
create or replace function public.get_platform_currency_integrity(
  p_start date default (current_date - interval '30 days')::date,
  p_end   date default current_date
)
returns table (
  platform           text,
  total_cost         numeric,
  total_cost_usd     numeric,
  implied_rate       numeric,
  rows_scanned       bigint
)
language plpgsql
stable
security definer
set search_path = public, bq_fdw
as $$
begin
  perform set_config('statement_timeout', '120000', true);

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'superadmin'::public.app_role)
  ) then
    raise exception 'Insufficient privileges';
  end if;

  return query
  select
    coalesce(d.platform, '(unknown)')                          as platform,
    coalesce(sum(d.cost), 0)::numeric                          as total_cost,
    coalesce(sum(d.cost_usd), 0)::numeric                      as total_cost_usd,
    case
      when coalesce(sum(d.cost_usd), 0) > 0
        then (sum(d.cost) / nullif(sum(d.cost_usd), 0))::numeric
      else null
    end                                                        as implied_rate,
    count(*)::bigint                                           as rows_scanned
  from bq_fdw.aroya_dashboard_daily d
  where d.date between p_start and p_end
    and coalesce(d.is_conversion_row, false) = false
  group by d.platform
  order by total_cost_usd desc;
end;
$$;

revoke all on function public.get_platform_currency_integrity(date, date) from public;
grant execute on function public.get_platform_currency_integrity(date, date) to authenticated;