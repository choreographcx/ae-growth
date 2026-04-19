import { KPIGroupCard } from '@/components/dashboard/KPIGroupCard';
import { TrendChartCard } from '@/components/dashboard/TrendChartCard';
import { PlatformComparison } from '@/components/dashboard/PlatformComparison';
import { PlatformContributionCard } from '@/components/dashboard/PlatformContributionCard';
import { EnhancedFunnelCard } from '@/components/dashboard/EnhancedFunnelCard';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { KPIGroupData } from '@/types/dashboard';
import { CurrencySymbol, applyCurrencyToKPIGroups } from '@/lib/currency';
import { pctChange, aggregateRows, buildTimeSeries, buildCpaSeries } from '@/hooks/useDashboardDaily';
import { generateInsights, sortInsights } from '@/lib/insights';
import { Loader2 } from 'lucide-react';

function formatCompact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

export default function OverviewPage() {
  const { client, data } = useDashboard();
  const currency = client.currency;
  const {
    loading, error, rows, previousRows, totals, previousTotals,
    platformSummaries, spendSeries, ctrSeries,
  } = data;

  // Overview always uses LOWER FUNNEL conversions for cross-platform comparability.
  const lf = useMemo(() => aggregateRows(rows, 'lower_funnel'), [rows]);
  const lfPrev = useMemo(() => previousRows.length ? aggregateRows(previousRows, 'lower_funnel') : null, [previousRows]);
  const lfConvSeries = useMemo(() => buildTimeSeries(rows, r => +r.conversions_lower_funnel || 0), [rows]);
  const lfCpaSeries  = useMemo(() => buildCpaSeries(rows, 'lower_funnel'), [rows]);

  // Insights derived from real data
  const insights = useMemo(
    () => sortInsights(generateInsights({ totals, previousTotals, platforms: platformSummaries })),
    [totals, previousTotals, platformSummaries]
  );

  const totalBudget = useMemo(() =>
    Object.values(client.platforms).filter(p => p.enabled).reduce((s, p) => s + (p.budget || 0), 0),
    [client.platforms]
  );

  const funnelSteps = useMemo(() => [
    { label: 'Impressions',        value: totals.impressions,       formattedValue: formatCompact(totals.impressions) },
    { label: 'Clicks',             value: totals.clicks,            formattedValue: formatCompact(totals.clicks),
      rateFromPrev: totals.ctr,    rateLabel: 'CTR' },
    { label: 'Landing Page Views', value: totals.landingPageViews,  formattedValue: formatCompact(totals.landingPageViews),
      rateFromPrev: totals.lpvRate, rateLabel: 'LPV Rate' },
    { label: 'Lower-Funnel Conversions', value: lf.conversions,     formattedValue: formatCompact(lf.conversions),
      rateFromPrev: totals.cvrLowerFunnel, rateLabel: 'CVR (LF)' },
  ].filter(s => s.value > 0 || s.label === 'Lower-Funnel Conversions'), [totals, lf]);

  // Insight flags for KPI cards
  const highFreq     = totals.frequency >= 4;
  const ctrFalling   = previousTotals && totals.ctr < previousTotals.ctr;
  const weakLpvRate  = totals.ctr >= 1.5 && totals.lpvRate > 0 && totals.lpvRate < 30;
  const reachUpConvFlat = previousTotals && totals.reach > previousTotals.reach * 1.1 && lf.conversions <= (lfPrev?.conversions ?? 0);

  const kpiCards: KPIGroupData[] = useMemo(() => {
    const cur = totals;
    const prev = previousTotals;

    const money = (v: number, d = 2) => <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{v.toFixed(d)}</span>;
    const moneyCompact = (v: number) => <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{formatCompact(v)}</span>;

    const groups: KPIGroupData[] = [
      // 1. SPEND — Budget + Pacing (or just spend if no budget configured)
      {
        title: 'Spend', icon: 'DollarSign',
        primary: {
          label: 'Total Spend', value: cur.spend,
          formattedValue: moneyCompact(cur.spend),
          change: pctChange(cur.spend, prev?.spend),
          trend: spendSeries.slice(-7).map(p => p.value),
        },
        supporting: totalBudget > 0 ? [
          { label: 'Budget', formattedValue: <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{totalBudget.toLocaleString()}</span> },
          { label: 'Pacing', formattedValue: `${Math.round((cur.spend / totalBudget) * 100)}%` },
        ] : [],
      },
      // 2. IMPRESSIONS — CPM only (Reach lives in its own card)
      {
        title: 'Impressions', icon: 'Eye',
        primary: {
          label: 'Impressions', value: cur.impressions,
          formattedValue: formatCompact(cur.impressions),
          change: pctChange(cur.impressions, prev?.impressions),
          trend: [],
        },
        supporting: [
          { label: 'CPM', formattedValue: money(cur.cpm), change: pctChange(cur.cpm, prev?.cpm) },
        ],
      },
      // 3. CLICKS — CTR + CPC
      {
        title: 'Clicks', icon: 'MousePointerClick',
        primary: {
          label: 'Clicks', value: cur.clicks,
          formattedValue: formatCompact(cur.clicks),
          change: pctChange(cur.clicks, prev?.clicks),
          trend: [],
        },
        supporting: [
          { label: 'CTR', formattedValue: `${cur.ctr.toFixed(2)}%`, change: pctChange(cur.ctr, prev?.ctr) },
          { label: 'CPC', formattedValue: money(cur.cpc), change: pctChange(cur.cpc, prev?.cpc) },
        ],
      },
      // 4. CONVERSIONS — primary KPI; CPA + CVR + LF/UF breakdown
      {
        title: 'Conversions', icon: 'Target',
        tooltip: 'Primary KPI uses lower-funnel actions — leads, purchases, sign-ups. Standardized across platforms.',
        primary: {
          label: 'Lower-Funnel Conversions', value: lf.conversions,
          formattedValue: formatCompact(lf.conversions),
          change: pctChange(lf.conversions, lfPrev?.conversions),
          trend: lfConvSeries.slice(-7).map(p => p.value),
        },
        supporting: [
          { label: 'CPA (LF)', formattedValue: money(lf.cpaLowerFunnel), change: pctChange(lf.cpaLowerFunnel, lfPrev?.cpaLowerFunnel) },
          { label: 'CVR (LF)', formattedValue: `${lf.cvrLowerFunnel.toFixed(2)}%` },
          { label: 'All Conv.', formattedValue: formatCompact(cur.conversionsAll) },
          { label: 'Upper Funnel', formattedValue: formatCompact(cur.conversionsUpperFunnel) },
        ],
      },
      // 5. REACH — Frequency
      {
        title: 'Reach', icon: 'Users',
        primary: {
          label: 'Reach', value: cur.reach,
          formattedValue: formatCompact(cur.reach),
          change: pctChange(cur.reach, prev?.reach),
          trend: [],
        },
        supporting: [
          { label: 'Frequency', formattedValue: cur.frequency > 0 ? cur.frequency.toFixed(2) : '—' },
        ],
        tooltip: (highFreq && ctrFalling) ? 'Frequency is high (≥4) while CTR is declining — possible audience fatigue.'
          : reachUpConvFlat ? 'Reach is growing but lower-funnel conversions are flat — efficiency may be weakening.' : undefined,
      },
      // 6. LANDING PAGE VIEWS — Cost per LPV + LPV Rate
      {
        title: 'Landing Page Views', icon: 'FileText',
        primary: {
          label: 'LPV', value: cur.landingPageViews,
          formattedValue: formatCompact(cur.landingPageViews),
          change: pctChange(cur.landingPageViews, prev?.landingPageViews),
          trend: [],
        },
        supporting: [
          { label: 'Cost / LPV', formattedValue: money(cur.costPerLPV), change: pctChange(cur.costPerLPV, prev?.costPerLPV) },
          { label: 'LPV Rate', formattedValue: `${cur.lpvRate.toFixed(1)}%` },
        ],
        tooltip: weakLpvRate ? 'CTR is strong but LPV rate is weak — check page speed, redirects, or tracking.' : undefined,
      },
    ];

    return applyCurrencyToKPIGroups(groups, currency, 26);
  }, [totals, previousTotals, lf, lfPrev, lfConvSeries, currency, totalBudget, spendSeries, highFreq, ctrFalling, weakLpvRate, reachUpConvFlat]);



  return (
    <div className="space-y-5 md:space-y-7">
      <SectionHeader title="Overview" showMobileDatePicker showFilters showPlatformsFilter />

      {error && (
        <div className="text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded-md px-3 py-2">
          Failed to load data: {error}
        </div>
      )}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard data…
        </div>
      )}

      {/* Primary KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-4">
        {kpiCards.map((g, i) => <KPIGroupCard key={i} data={g} />)}
      </div>

      {/* Platform Contribution */}
      <div className="space-y-2.5 md:space-y-3">
        <SectionHeader title="Platform Contribution" />
        <PlatformContributionCard platforms={platformSummaries} />
      </div>

      {/* Trend Charts — fixed to lower-funnel by default */}
      <div className="space-y-2.5 md:space-y-3 print-break-before">
        <SectionHeader title="Trends" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
          <TrendChartCard title="Spend"                       data={spendSeries}    currency={currency} color="hsl(var(--chart-1))" />
          <TrendChartCard title="Lower-Funnel Conversions"    data={lfConvSeries}                          color="hsl(var(--chart-3))" />
          <TrendChartCard title="CPA (Lower Funnel)"          data={lfCpaSeries}    currency={currency} color="hsl(var(--chart-4))" />
          <TrendChartCard title="CTR"                         data={ctrSeries}      valueSuffix="%"     color="hsl(var(--chart-2))" />
        </div>
      </div>

      {/* Funnel — pre-computed rates from sums */}
      <EnhancedFunnelCard steps={funnelSteps} />

      {/* Platform performance table */}
      <div className="space-y-2.5 md:space-y-3 print-break-before">
        <SectionHeader title="Platform Performance" />
        <PlatformComparison data={platformSummaries} />
      </div>

      {/* Diagnostics & Insights — bottom of page */}
      {insights.length > 0 && (
        <div className="space-y-2.5 md:space-y-3">
          <SectionHeader title="Key Issues & Insights" subtitle="Auto-detected from current performance" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
            {insights.slice(0, 6).map(a => <AlertCard key={a.id} alert={a} />)}
          </div>
        </div>
      )}
    </div>
  );
}
