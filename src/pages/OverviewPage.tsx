import { KPIGroupCard } from '@/components/dashboard/KPIGroupCard';
import { TrendChartCard } from '@/components/dashboard/TrendChartCard';
import { PlatformComparison } from '@/components/dashboard/PlatformComparison';
import { FunnelCard } from '@/components/dashboard/FunnelCard';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { alerts } from '@/data/mockData';
import { useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { KPIGroupData } from '@/types/dashboard';
import { CurrencySymbol, applyCurrencyToKPIGroups } from '@/lib/currency';
import { pctChange, aggregateRows, buildTimeSeries, buildCpaSeries } from '@/hooks/useDashboardDaily';
import { Loader2 } from 'lucide-react';

const severityOrder = { error: 0, warning: 1, success: 2, info: 3 };

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
    platformSummaries, spendSeries, cpaSeries: _ignoredCpa, ctrSeries,
  } = data;

  // Overview is locked to LOWER FUNNEL conversions for cross-platform comparability.
  const lfTotals = useMemo(() => aggregateRows(rows, 'lower_funnel'), [rows]);
  const lfPrev = useMemo(() => previousRows.length ? aggregateRows(previousRows, 'lower_funnel') : null, [previousRows]);
  const lfConversionsSeries = useMemo(
    () => buildTimeSeries(rows, r => +r.conversions_lower_funnel || 0),
    [rows]
  );
  const lfCpaSeries = useMemo(() => buildCpaSeries(rows, 'lower_funnel'), [rows]);

  const sortedAlerts = useMemo(() =>
    [...alerts].sort((a, b) => severityOrder[a.type] - severityOrder[b.type]),
    []
  );

  const totalBudget = useMemo(() =>
    Object.values(client.platforms).filter(p => p.enabled).reduce((s, p) => s + (p.budget || 0), 0),
    [client.platforms]
  );

  const funnelSteps = useMemo(() => {
    const lpv = lfTotals.landingPageViews || totals.landingPageViews;
    return [
      { label: 'Impressions',        value: totals.impressions, formattedValue: formatCompact(totals.impressions) },
      { label: 'Clicks',             value: totals.clicks,      formattedValue: formatCompact(totals.clicks) },
      { label: 'Landing Page Views', value: lpv,                formattedValue: formatCompact(lpv) },
      { label: 'Conversions',        value: lfTotals.conversions, formattedValue: formatCompact(lfTotals.conversions) },
    ].filter(s => s.value > 0 || s.label !== 'Landing Page Views');
  }, [totals, lfTotals]);

  const allKPICards: KPIGroupData[] = useMemo(() => {
    const cur = totals;
    const prev = previousTotals;

    const groups: KPIGroupData[] = [
      {
        title: 'Spend',
        icon: 'DollarSign',
        primary: {
          label: 'Total Spend',
          value: cur.spend,
          formattedValue: <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{formatCompact(cur.spend)}</span>,
          change: pctChange(cur.spend, prev?.spend),
          trend: spendSeries.slice(-7).map(p => p.value),
        },
        supporting: [
          { label: 'Budget', formattedValue: <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{totalBudget.toLocaleString()}</span> },
          { label: 'Pacing', formattedValue: totalBudget > 0 ? `${Math.round((cur.spend / totalBudget) * 100)}%` : '—' },
        ],
      },
      {
        title: 'Impressions',
        icon: 'Eye',
        primary: {
          label: 'Impressions', value: cur.impressions,
          formattedValue: formatCompact(cur.impressions),
          change: pctChange(cur.impressions, prev?.impressions),
          trend: [],
        },
        supporting: [
          { label: 'CPM', formattedValue: <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{cur.cpm.toFixed(2)}</span>, change: pctChange(cur.cpm, prev?.cpm) },
        ],
      },
      {
        title: 'Clicks',
        icon: 'MousePointerClick',
        primary: {
          label: 'Clicks', value: cur.clicks,
          formattedValue: formatCompact(cur.clicks),
          change: pctChange(cur.clicks, prev?.clicks),
          trend: [],
        },
        supporting: [
          { label: 'CTR', formattedValue: `${cur.ctr.toFixed(2)}%`, change: pctChange(cur.ctr, prev?.ctr) },
          { label: 'CPC', formattedValue: <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{cur.cpc.toFixed(2)}</span>, change: pctChange(cur.cpc, prev?.cpc) },
        ],
      },
      {
        title: 'Conversions',
        icon: 'Target',
        tooltip: 'Includes only lower-funnel actions such as leads, purchases, bookings, and form submissions. Standardized across platforms.',
        primary: {
          label: 'Conversions', value: lfTotals.conversions,
          formattedValue: formatCompact(lfTotals.conversions),
          change: pctChange(lfTotals.conversions, lfPrev?.conversions),
          trend: lfConversionsSeries.slice(-7).map(p => p.value),
        },
        supporting: [
          { label: 'CPA', formattedValue: <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{lfTotals.cpa.toFixed(2)}</span>, change: pctChange(lfTotals.cpa, lfPrev?.cpa) },
          { label: 'Conv. Rate', formattedValue: `${lfTotals.conversionRate.toFixed(2)}%`, change: pctChange(lfTotals.conversionRate, lfPrev?.conversionRate) },
        ],
      },
      {
        title: 'Reach',
        icon: 'Users',
        primary: {
          label: 'Reach', value: cur.reach,
          formattedValue: formatCompact(cur.reach),
          change: pctChange(cur.reach, prev?.reach),
          trend: [],
        },
        supporting: [
          { label: 'Frequency', formattedValue: cur.reach > 0 ? (cur.impressions / cur.reach).toFixed(2) : '—' },
        ],
      },
      {
        title: 'Landing Page Views',
        icon: 'FileText',
        primary: {
          label: 'LPV', value: cur.landingPageViews,
          formattedValue: formatCompact(cur.landingPageViews),
          change: pctChange(cur.landingPageViews, prev?.landingPageViews),
          trend: [],
        },
        supporting: [
          { label: 'Cost per LPV', formattedValue: <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{cur.costPerLPV.toFixed(2)}</span>, change: pctChange(cur.costPerLPV, prev?.costPerLPV) },
        ],
      },
    ];

    return applyCurrencyToKPIGroups(groups, currency, 26);
  }, [totals, previousTotals, lfTotals, lfPrev, lfConversionsSeries, currency, totalBudget, spendSeries]);

  return (
    <div className="space-y-5 md:space-y-7">
      <SectionHeader title="Overview" subtitle="Cross-platform performance summary" />

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

      {/* KPI Cards – 3 across, 2 rows */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-4">
        {allKPICards.map((group, i) => (
          <KPIGroupCard key={i} data={group} />
        ))}
      </div>

      {/* Trend Charts */}
      <div className="space-y-2.5 md:space-y-3 print-break-before">
        <SectionHeader title="Trends" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
          <TrendChartCard title="Spend Over Time" data={spendSeries} currency={currency} color="hsl(var(--chart-1))" />
          <TrendChartCard title="Conversions Over Time" data={lfConversionsSeries} color="hsl(var(--chart-3))" />
          <TrendChartCard title="CPA Over Time" data={lfCpaSeries} currency={currency} color="hsl(var(--chart-4))" />
          <TrendChartCard title="CTR Over Time" data={ctrSeries} valueSuffix="%" color="hsl(var(--chart-2))" />
        </div>
      </div>

      {/* Conversion Funnel — uses lower-funnel conversions for the final step */}
      <FunnelCard steps={funnelSteps} />

      {/* Platform Comparison */}
      <div className="space-y-2.5 md:space-y-3 print-break-before">
        <SectionHeader title="Platform Performance" />
        <PlatformComparison data={platformSummaries} />
      </div>

      {/* Diagnostics & Alerts */}
      <div className="space-y-2.5 md:space-y-3">
        <SectionHeader title="Diagnostics & Alerts" />
        <div className="space-y-2">
          {sortedAlerts.map(alert => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      </div>
    </div>
  );
}
