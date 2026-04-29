# Card-type split (Platinum / Al Fursan Infinity / Other / Unknown)

Tag every row in the dashboard by **card type** based on substring matches against `campaign_name`, then expose a global filter and per-page breakdown widgets that respect it everywhere (Overview, Meta, Google Ads, TikTok, Snapchat, X, LinkedIn, Programmatic, PDF export).

## Buckets & matching rules

Pure client-side classification — no DB schema changes.

```text
1. Platinum            campaign_name ~ /\bplatinum\b/i
2. Al Fursan Infinity  campaign_name ~ /\b(al[\s_-]?fursan[\s_-]+infinity|fursan[\s_-]+infinity)\b/i
3. Other               campaign_name matched a known card token (Gold, Green, Centurion, Reserve, Cashback, Fursan w/o Infinity, etc.) but not Platinum / Fursan Infinity
4. Unknown / Unmapped  no card-type token detected at all
```

Matching is case-insensitive, runs on the raw `campaign_name`, and is centralised so the keyword lists can be tuned in one place. Rules priority: Al Fursan Infinity → Platinum → Other (token list) → Unknown. We can expand the Other-token list as we discover more campaigns.

## New files

- **`src/lib/cardType.ts`** — single source of truth.
  - `CardType = 'platinum' | 'fursan_infinity' | 'other' | 'unknown'`
  - `classifyCardType(campaignName): CardType`
  - `CARD_TYPE_LABELS`, `CARD_TYPE_ORDER`, `CARD_TYPE_COLORS` (using the existing chart palette)
  - Unit-tested with sample names so the rule list is easy to evolve.

- **`src/components/dashboard/CardTypeBreakdownCard.tsx`** — reusable widget that takes the current rows + KPI builder and renders a 4-column comparison (Spend / Impressions / Clicks / Conversions) split by card type. Used on Overview and each platform page.

## Filter wiring (global)

- **`src/context/DashboardContext.tsx`** — add `cardTypes: CardType[]` (default = all four selected) and `setCardTypes`. Persist to `localStorage` like the existing platform filter.
- **`src/hooks/useDashboardDaily.ts`** — when assembling `filteredRows`, drop rows whose `classifyCardType(campaign_name)` is not in the selected set. This single change makes every KPI, chart, table, funnel, and the PDF respect the filter automatically (they all derive from `filteredRows`).
- **`src/components/dashboard/MobileFilterSheet.tsx`** + **`src/components/layout/DashboardHeader.tsx`** — add a "Card Type" multi-select chip group next to the existing Platforms filter (mobile sheet + desktop filter popover). Same component pattern as `MultiSelectFilter`.
- The selector shows live counts per bucket for the active date range so users can spot where "Unknown" volume is coming from.

## Breakdown widgets (per page)

Add `<CardTypeBreakdownCard />` as a new sortable section on:
- `OverviewPage` — under the platform contribution card.
- Each platform page (`MetaPage`, `GoogleAdsPage`, `TikTokPage`, `SnapchatPage`, `XPage`, `LinkedInPage`, `ProgrammaticPage`) — under the trend chart.

The widget always shows all four buckets regardless of the global filter selection so users can compare without changing filters; the global filter only shrinks the page-level KPIs.

## PDF export

`src/components/pdf/PDFReport.tsx` — append a "Card-type performance" section (one table per platform) using the same classifier. Reuses existing print styles.

## Admin: tuning the keyword list

Add a small read-only panel in `AdminPage` ("Card-type rules") that lists the current keyword sets and shows top 20 unmatched campaign names from the active date range, so the admin can spot gaps and request rule additions. No DB persistence in v1 — rules stay in `cardType.ts` so they're reviewable in code. We can promote to a Supabase table later if the list grows.

## Why this approach

- **No migration, no BQ schema change.** Pure derived field.
- **One classifier, one filter source.** Every existing chart/table/PDF inherits the split for free because they all consume `filteredRows`.
- **Easy to evolve.** When a new card product launches, edit one keyword list. The Admin panel surfaces unmatched campaigns so we know when to update it.
- **Safe default.** Filter starts with all buckets selected → existing dashboards look unchanged on first load.

## Out of scope (v1)

- Server-side filtering inside `get_dashboard_daily` — not needed since classification is cheap on the client and we already pull all rows for the date range.
- Persisting per-user card-type selections to Supabase (uses `localStorage` like other filters).
- Editing the keyword list from the UI — code-managed for now.
