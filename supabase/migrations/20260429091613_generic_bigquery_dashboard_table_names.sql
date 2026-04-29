-- Rename Supabase BigQuery foreign table references from AESA-prefixed names
-- to generic dashboard names.
--
-- BigQuery dataset remains:
-- essencemediacom-mena-groupm.AESA_dashboard
--
-- BigQuery tables are now:
-- Dashboard_Daily
-- Dashboard_Conversions
-- Master_Wide

DO $$
BEGIN
  IF to_regclass('bq_aesa.aesa_dashboard_daily') IS NOT NULL THEN
    ALTER FOREIGN TABLE bq_aesa.aesa_dashboard_daily
      OPTIONS (SET "table" 'Dashboard_Daily');

    ALTER FOREIGN TABLE bq_aesa.aesa_dashboard_daily
      RENAME TO dashboard_daily;
  END IF;

  IF to_regclass('bq_fdw.aesa_dashboard_daily') IS NOT NULL THEN
    ALTER FOREIGN TABLE bq_fdw.aesa_dashboard_daily
      OPTIONS (SET "table" 'Dashboard_Daily');

    ALTER FOREIGN TABLE bq_fdw.aesa_dashboard_daily
      RENAME TO dashboard_daily;
  END IF;

  IF to_regclass('bq_aesa.aesa_dashboard_conversions') IS NOT NULL THEN
    ALTER FOREIGN TABLE bq_aesa.aesa_dashboard_conversions
      OPTIONS (SET "table" 'Dashboard_Conversions');

    ALTER FOREIGN TABLE bq_aesa.aesa_dashboard_conversions
      RENAME TO dashboard_conversions;
  END IF;

  IF to_regclass('bq_fdw.aesa_dashboard_conversions') IS NOT NULL THEN
    ALTER FOREIGN TABLE bq_fdw.aesa_dashboard_conversions
      OPTIONS (SET "table" 'Dashboard_Conversions');

    ALTER FOREIGN TABLE bq_fdw.aesa_dashboard_conversions
      RENAME TO dashboard_conversions;
  END IF;
END $$;

-- Remove old market override foreign tables if they exist.
-- AESA no longer uses market overrides.
DROP FOREIGN TABLE IF EXISTS bq_aesa.aesa_market_overrides CASCADE;
DROP FOREIGN TABLE IF EXISTS bq_fdw.aesa_market_overrides CASCADE;
DROP FOREIGN TABLE IF EXISTS bq_aesa.market_overrides CASCADE;
DROP FOREIGN TABLE IF EXISTS bq_fdw.market_overrides CASCADE;

-- Rename public views from AESA-prefixed names to generic names if they exist.
DO $$
BEGIN
  IF to_regclass('public.aesa_dashboard_daily') IS NOT NULL THEN
    ALTER VIEW public.aesa_dashboard_daily RENAME TO dashboard_daily;
  END IF;

  IF to_regclass('public.aesa_dashboard_conversions') IS NOT NULL THEN
    ALTER VIEW public.aesa_dashboard_conversions RENAME TO dashboard_conversions;
  END IF;
END $$;
