
## Where the data lives today

The BigQuery foreign table `bq_fdw.aesa_dashboard_daily` already includes:
`campaign_id, campaign_name, ad_group_id, ad_group_name, ad_id, ad_name` plus all metrics (spend, impressions, clicks, conversions, video, etc.).

But the Postgres RPC `get_dashboard_daily` only returns campaign-level columns — `ad_group_id` / `ad_group_name` are dropped during aggregation. So:
- Campaign data is already usable in the app (the `CampaignPerformance` table on Overview + `PerformanceBreakdownCard` on each platform page render it).
- Ad group data is currently invisible to the frontend even though it's in BQ.

## What "campaign data" already shows

On Overview: `CampaignPerformance` shows top campaigns across all platforms (Spend, Share, Impr, Clicks, CTR, CPC, Conversions, CPA).
On each platform page: same component scoped via `platformFilter` inside `PerformanceBreakdownCard`.

So for campaigns, the question is mostly: do you want **more depth** (e.g. drill-in, more columns, sortable, exportable), or are you happy with what's there?

## Options for ad group data

Three approaches, can be combined.

### Option A — Drill-down inside the existing campaign table (recommended)

Each campaign row becomes expandable. Clicking a campaign opens a nested ad-group sub-table underneath it, showing the same metric columns aggregated by `ad_group_name`.

- Overview: drill is available on the existing top-campaigns table.
- Platform pages: same component, scoped to that platform.
- Keeps the page tidy — ad groups only appear on demand.

Backend: extend `get_dashboard_daily` RPC to also return `ad_group_id` / `ad_group_name`, and switch the GROUP BY to include them. Row count grows ~3–10× (depends on account), still well within RPC limits for typical date ranges.

### Option B — Dedicated "Ad Groups" tab on each platform page

Add a tab next to the existing campaign breakdown:
`Campaigns | Ad Groups` (and optionally `Ads`).

Same column set, just one level deeper. Easier to scan when an analyst specifically wants ad-group performance without expanding row by row. No drill UI to build.

On Overview we'd skip this (Overview should stay high level — too many ad groups across all platforms is noise).

### Option C — Ad group filter (multi-select)

Add an "Ad Group" filter to the existing platform/campaign filter row. Selecting one or many ad groups re-scopes every KPI, chart and table on the page.

Useful when an analyst already knows the ad groups they care about. Cheapest to build but doesn't surface ad-group-level rows by itself — best paired with A or B.

## Recommendation

- **Overview**: Option A only — keep the high-level campaign table, allow expanding a row to see ad groups underneath. No ad-group filter, no separate tab.
- **Platform pages**: Option A + Option B — drill-down on the campaign table AND a dedicated "Ad Groups" tab. Optionally add Option C (ad-group filter) later if users ask for it.

## Technical changes (for the option set above)

1. **Migration**: update `public.get_dashboard_daily` RPC
   - Add `ad_group_id`, `ad_group_name` to the SELECT and GROUP BY.
   - Optionally add an `p_ad_group_names text[]` filter argument (for Option C).
2. **Hook**: extend `DashboardDailyRow` in `src/hooks/useDashboardDaily.ts` with the two new fields. Existing aggregations stay unchanged (they still sum across all rows).
3. **Campaign table** (`CampaignPerformance.tsx`):
   - Add a chevron column; clicking expands a nested table grouped by `ad_group_name` for that campaign.
   - Reuse the same metric formatters and column widths.
4. **Platform pages** (`PlatformPageTemplate.tsx` / `PerformanceBreakdownCard.tsx`):
   - Add an "Ad Groups" tab rendering a flat ad-group table (group rows by `ad_group_id::ad_group_name`, scoped to the platform).
5. **Filters** (only if Option C is approved): extend `MultiSelectFilter` row + `useDashboardDaily` options with `selectedAdGroups`.

No new tables, no new edge functions — purely an RPC + frontend extension.

## Questions for you

1. Confirm the recommendation (Overview = drill-down only; Platform pages = drill-down + Ad Groups tab)?
2. Do you also want an **Ads** level (one deeper than ad groups), or stop at ad group?
3. Add the ad-group **filter** (Option C) now, or defer until requested?
