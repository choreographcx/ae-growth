-- Diagnostic helper: returns frequency/reach signal from the BQ table.
-- Restricted to admins/superadmins; SECURITY DEFINER so vault decryption works.
CREATE OR REPLACE FUNCTION public.diag_frequency_signal(
  p_start date DEFAULT (CURRENT_DATE - 30)::date,
  p_end   date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  platform text,
  rows_total bigint,
  freq_nonnull bigint,
  freq_positive bigint,
  reach_positive bigint,
  max_frequency numeric,
  max_reach numeric,
  sample_frequency numeric,
  sample_reach numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'bq_fdw'
AS $$
BEGIN
  PERFORM set_config('statement_timeout', '120000', true);
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  RETURN QUERY
  SELECT
    coalesce(d.platform, '(unknown)')                              AS platform,
    count(*)::bigint                                               AS rows_total,
    count(*) FILTER (WHERE d.frequency IS NOT NULL)::bigint        AS freq_nonnull,
    count(*) FILTER (WHERE d.frequency > 0)::bigint                AS freq_positive,
    count(*) FILTER (WHERE d.reach > 0)::bigint                    AS reach_positive,
    max(d.frequency)::numeric                                      AS max_frequency,
    max(d.reach)::numeric                                          AS max_reach,
    max(d.frequency) FILTER (WHERE d.frequency > 0)::numeric       AS sample_frequency,
    max(d.reach) FILTER (WHERE d.reach > 0)::numeric               AS sample_reach
  FROM bq_fdw.aroya_dashboard_daily d
  WHERE d.date BETWEEN p_start AND p_end
  GROUP BY d.platform
  ORDER BY d.platform;
END;
$$;

GRANT EXECUTE ON FUNCTION public.diag_frequency_signal(date, date) TO authenticated;