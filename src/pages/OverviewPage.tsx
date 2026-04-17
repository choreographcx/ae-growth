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
import { pctChange } from '@/hooks/useDashboardDaily';
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
    loading, error, totals, previousTotals,
    platformSummaries, spendSeries, conversionsSeries, cpaSeries, ctrSeries,
  } = data;

  const sortedAlerts = useMemo(() =>
    [...alerts].sort((a, b) => severityOrder[a.type] - severityOrder[b.type]),
    []
  );

  const totalBudget = useMemo(() =>
    Object.values(client.platforms).filter(p => p.enabled).reduce((s, p) => s + (p.budget || 0), 0),
    [client.platforms]
  );

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
        primary: {
          label: 'Conversions', value: cur.conversions,
          formattedValue: formatCompact(cur.conversions),
          change: pctChange(cur.conversions, prev?.conversions),
          trend: conversionsSeries.slice(-7).map(p => p.value),
        },
        supporting: [
          { label: 'CPA', formattedValue: <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{cur.cpa.toFixed(2)}</span>, change: pctChange(cur.cpa, prev?.cpa) },
          { label: 'Conv. Rate', formattedValue: `${cur.conversionRate.toFixed(2)}%`, change: pctChange(cur.conversionRate, prev?.conversionRate) },
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
  }, [totals, previousTotals, currency, totalBudget, spendSeries, conversionsSeries]);

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
          <TrendChartCard title="Conversions Over Time" data={conversionsSeries} color="hsl(var(--chart-3))" />
          <TrendChartCard title="CPA Over Time" data={cpaSeries} currency={currency} color="hsl(var(--chart-4))" />
          <TrendChartCard title="CTR Over Time" data={ctrSeries} valueSuffix="%" color="hsl(var(--chart-2))" />
        </div>
      </div>

      {/* Conversion Funnel */}
      <FunnelCard />

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
