
CREATE OR REPLACE FUNCTION public.get_platform_currency_integrity(
  p_start date DEFAULT (CURRENT_DATE - INTERVAL '30 days')::date,
  p_end   date DEFAULT CURRENT_DATE
)
RETURNS TABLE(platform text, total_cost numeric, total_cost_usd numeric, implied_rate numeric, rows_scanned bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  perform set_config('statement_timeout', '120000', true);
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not (public.has_role(auth.uid(), 'admin'::public.app_role) or public.has_role(auth.uid(), 'superadmin'::public.app_role)) then
    raise exception 'Insufficient privileges';
  end if;
  return query
  select coalesce(d.platform, '(unknown)'),
         coalesce(sum(d.cost), 0)::numeric,
         coalesce(sum(d.cost_usd), 0)::numeric,
         case when coalesce(sum(d.cost_usd), 0) > 0 then (sum(d.cost) / nullif(sum(d.cost_usd), 0))::numeric else null end,
         count(*)::bigint
  from bq_aesa.dashboard_daily d
  where d.date between p_start and p_end and coalesce(d.is_conversion_row, false) = false
  group by d.platform
  order by 3 desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.diag_frequency_signal(
  p_start date DEFAULT (CURRENT_DATE - 30),
  p_end   date DEFAULT CURRENT_DATE
)
RETURNS TABLE(platform text, rows_total bigint, freq_nonnull bigint, freq_positive bigint, reach_positive bigint, max_frequency numeric, max_reach numeric, sample_frequency numeric, sample_reach numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  perform set_config('statement_timeout', '120000', true);
  if auth.uid() is not null and not (public.has_role(auth.uid(), 'admin'::public.app_role) or public.has_role(auth.uid(), 'superadmin'::public.app_role)) then
    raise exception 'Insufficient privileges';
  end if;
  return query
  select coalesce(d.platform, '(unknown)'),
         count(*)::bigint,
         count(*) filter (where d.frequency is not null)::bigint,
         count(*) filter (where d.frequency > 0)::bigint,
         count(*) filter (where d.reach > 0)::bigint,
         max(d.frequency)::numeric,
         max(d.reach)::numeric,
         max(d.frequency) filter (where d.frequency > 0)::numeric,
         max(d.reach) filter (where d.reach > 0)::numeric
  from bq_aesa.dashboard_daily d
  where d.date between p_start and p_end and coalesce(d.is_conversion_row, false) = false
  group by d.platform
  order by d.platform;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_platform_currency_integrity(date, date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.diag_frequency_signal(date, date) FROM anon, authenticated, public;
