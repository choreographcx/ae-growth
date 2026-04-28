-- Temporary diagnostic function to inspect BQ conversion breakdown source data
CREATE OR REPLACE FUNCTION public.diag_conversion_breakdown_source(p_start date, p_end date)
RETURNS TABLE(
  platform text,
  conversion_name text,
  conversion_funnel_group text,
  rows_count bigint,
  conv_all numeric,
  conv_lower numeric,
  conv_upper numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'bq_fdw'
AS $$
  SELECT
    d.platform,
    d.conversion_name,
    d.conversion_funnel_group,
    COUNT(*)::bigint,
    COALESCE(SUM(d.conversions_all), 0)::numeric,
    COALESCE(SUM(d.conversions_lower_funnel), 0)::numeric,
    COALESCE(SUM(d.conversions_upper_funnel), 0)::numeric
  FROM bq_aesa.aesa_dashboard_daily d
  WHERE d.date BETWEEN p_start AND p_end
  GROUP BY d.platform, d.conversion_name, d.conversion_funnel_group
  ORDER BY 5 DESC NULLS LAST
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.diag_conversion_breakdown_source(date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.diag_conversion_breakdown_source(date, date) TO postgres, service_role;