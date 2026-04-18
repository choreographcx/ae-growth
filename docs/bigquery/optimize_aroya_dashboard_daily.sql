-- ============================================================================
-- BigQuery optimization for `aroya_dashboard_daily`
--
-- Goal: eliminate "statement timeout" on long date ranges (This Year, Last Year)
-- by reducing the bytes BigQuery scans per dashboard query.
--
-- Strategy:
--   1. Recreate the base table partitioned by DATE and clustered by platform.
--   2. Add a thin "performance" rollup (no conversion rows) for the main daily RPC.
--   3. Add a "conversion breakdown" rollup for the breakdown RPC.
--
-- Run in the BigQuery console. Replace `<PROJECT>` and `<DATASET>` with the
-- real project + dataset names used by the Supabase FDW (`bq_fdw`).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Safety: keep a backup of the current table before recreating it.
-- ----------------------------------------------------------------------------
CREATE TABLE `<PROJECT>.<DATASET>.aroya_dashboard_daily_backup`
COPY `<PROJECT>.<DATASET>.aroya_dashboard_daily`;


-- ----------------------------------------------------------------------------
-- 1. Recreate the base table partitioned + clustered.
--    `partition_expiration_days` is omitted so history is retained forever.
--    Adjust column list to match the current schema exactly.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE TABLE `<PROJECT>.<DATASET>.aroya_dashboard_daily`
PARTITION BY date
CLUSTER BY platform, campaign_name
OPTIONS (
  description = "Daily ad-platform performance + conversion rows. Partitioned by date, clustered by platform/campaign_name."
)
AS
SELECT *
FROM `<PROJECT>.<DATASET>.aroya_dashboard_daily_backup`;

-- Optional: require partition filter so accidental full-table scans fail fast.
-- ALTER TABLE `<PROJECT>.<DATASET>.aroya_dashboard_daily`
-- SET OPTIONS (require_partition_filter = TRUE);


-- ----------------------------------------------------------------------------
-- 2. Performance rollup — used by `get_dashboard_daily`.
--    Excludes conversion-name rows so the main query scans ~10-50% of the data.
--    Materialized views auto-refresh as the base table changes.
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW `<PROJECT>.<DATASET>.mv_aroya_dashboard_daily_perf`
PARTITION BY date
CLUSTER BY platform, campaign_name
OPTIONS (
  enable_refresh = TRUE,
  refresh_interval_minutes = 60,
  description = "Pre-aggregated performance rows (no conversion-name rows). Source for get_dashboard_daily."
)
AS
SELECT
  date,
  platform,
  IFNULL(publisher_platform, '')             AS publisher_platform,
  campaign_id,
  campaign_name,
  campaign_type,
  campaign_objective,
  audience_type,
  SUM(impressions)                           AS impressions,
  SUM(clicks)                                AS clicks,
  SUM(cost_usd)                              AS cost_usd,
  SUM(conversions)                           AS conversions,
  SUM(conversions_all)                       AS conversions_all,
  SUM(conversions_lower_funnel)              AS conversions_lower_funnel,
  SUM(conversions_upper_funnel)              AS conversions_upper_funnel,
  SUM(conversion_value)                      AS conversion_value,
  SUM(reach)                                 AS reach,
  SUM(landing_page_views)                    AS landing_page_views,
  SUM(outbound_clicks)                       AS outbound_clicks,
  SUM(video_views)                           AS video_views,
  SUM(video_p100)                            AS video_p100
FROM `<PROJECT>.<DATASET>.aroya_dashboard_daily`
WHERE IFNULL(is_conversion_row, FALSE) = FALSE
GROUP BY
  date, platform, publisher_platform, campaign_id, campaign_name,
  campaign_type, campaign_objective, audience_type;


-- ----------------------------------------------------------------------------
-- 3. Conversion-breakdown rollup — used by `get_dashboard_conversion_breakdown`.
--    Only conversion-name rows, pre-aggregated by (date, platform, campaign, name).
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW `<PROJECT>.<DATASET>.mv_aroya_dashboard_conversions`
PARTITION BY date
CLUSTER BY platform, conversion_name
OPTIONS (
  enable_refresh = TRUE,
  refresh_interval_minutes = 60,
  description = "Pre-aggregated conversion-name rows. Source for get_dashboard_conversion_breakdown."
)
AS
SELECT
  date,
  platform,
  campaign_name,
  IFNULL(conversion_name,         '(unspecified)') AS conversion_name,
  IFNULL(conversion_funnel_group, '(unspecified)') AS conversion_funnel_group,
  SUM(conversions_all) AS conversions_all
FROM `<PROJECT>.<DATASET>.aroya_dashboard_daily`
WHERE IFNULL(is_conversion_row, FALSE) = TRUE
GROUP BY date, platform, campaign_name, conversion_name, conversion_funnel_group;


-- ----------------------------------------------------------------------------
-- 4. Verification — confirm partitioning + clustering took effect.
-- ----------------------------------------------------------------------------
SELECT table_name, partition_id, total_rows, total_logical_bytes
FROM `<PROJECT>.<DATASET>.INFORMATION_SCHEMA.PARTITIONS`
WHERE table_name IN (
  'aroya_dashboard_daily',
  'mv_aroya_dashboard_daily_perf',
  'mv_aroya_dashboard_conversions'
)
ORDER BY table_name, partition_id DESC
LIMIT 50;

SELECT table_name, column_name, is_partitioning_column, clustering_ordinal_position
FROM `<PROJECT>.<DATASET>.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name IN (
  'aroya_dashboard_daily',
  'mv_aroya_dashboard_daily_perf',
  'mv_aroya_dashboard_conversions'
)
  AND (is_partitioning_column = 'YES' OR clustering_ordinal_position IS NOT NULL)
ORDER BY table_name, clustering_ordinal_position;


-- ----------------------------------------------------------------------------
-- 5. After verification, drop the backup to reclaim storage.
-- ----------------------------------------------------------------------------
-- DROP TABLE `<PROJECT>.<DATASET>.aroya_dashboard_daily_backup`;


-- ============================================================================
-- Once the MVs exist, point the Postgres RPCs at them:
--   - get_dashboard_daily               → bq_fdw.mv_aroya_dashboard_daily_perf
--   - get_dashboard_conversion_breakdown → bq_fdw.mv_aroya_dashboard_conversions
--
-- The FDW will need a foreign-table mapping for each MV. Once that's in place
-- I can update both RPCs in a Supabase migration.
-- ============================================================================
