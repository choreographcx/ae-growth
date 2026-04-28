CREATE OR REPLACE FUNCTION public.diag_conv_events(p_start date, p_end date)
RETURNS TABLE(
  platform text,
  conversion_name text,
  conversion_funnel_group text,
  rows_count bigint,
  conv_all numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'bq_fdw'
AS $$
  SELECT
    d.platform,
    COALESCE(d.conversion_name, '(null)') AS conversion_name,
    COALESCE(d.conversion_funnel_group, '(null)') AS conversion_funnel_group,
    COUNT(*)::bigint,
    COALESCE(SUM(d.conversions_all), 0)::numeric
  FROM bq_aesa.aesa_dashboard_daily d
  WHERE d.date BETWEEN p_start AND p_end
  GROUP BY d.platform, d.conversion_name, d.conversion_funnel_group
  ORDER BY d.platform, 5 DESC NULLS LAST
  LIMIT 500;
$$;

REVOKE ALL ON FUNCTION public.diag_conv_events(date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.diag_conv_events(date, date) TO postgres, service_role;