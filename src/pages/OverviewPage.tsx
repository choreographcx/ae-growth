import { KPIGroupCard } from '@/components/dashboard/KPIGroupCard';
import { TrendChartCard } from '@/components/dashboard/TrendChartCard';
import { PlatformComparison } from '@/components/dashboard/PlatformComparison';
import { FunnelCard } from '@/components/dashboard/FunnelCard';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { overviewKPIGroups, overviewKPIGroupsRow2, spendTimeSeries, conversionsTimeSeries, cpaTimeSeries, platformSummaries, alerts } from '@/data/mockData';
import { useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { KPIGroupData } from '@/types/dashboard';
import { CurrencySymbol, applyCurrencyToKPIGroups } from '@/lib/currency';

// CTR time series derived from clicks/impressions mock pattern
function generateCTRTimeSeries() {
  const now = new Date();
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (29 - i));
    return { date: d.toISOString().split('T')[0], value: +(1.2 + Math.random() * 0.8).toFixed(2) };
  });
}

const severityOrder = { error: 0, warning: 1, success: 2, info: 3 };

export default function OverviewPage() {
  const { client } = useDashboard();
  const ctrTimeSeries = useMemo(() => generateCTRTimeSeries(), []);
  const sortedAlerts = useMemo(() =>
    [...alerts].sort((a, b) => severityOrder[a.type] - severityOrder[b.type]),
    []
  );

  const currency = client.currency;

  // Derive total budget from platform configs
  const totalBudget = useMemo(() =>
    Object.values(client.platforms).filter(p => p.enabled).reduce((s, p) => s + (p.budget || 0), 0),
    [client.platforms]
  );

  const allKPICards: KPIGroupData[] = useMemo(() => {
    const spendCard = overviewKPIGroups.find(g => g.title === 'Spend');
    const others = overviewKPIGroups.filter(g => g.title !== 'Spend');
    const updatedSpend: KPIGroupData | undefined = spendCard ? {
      ...spendCard,
      supporting: [
        { label: 'Budget', formattedValue: <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{totalBudget.toLocaleString()}</span> },
        { label: 'Pacing', formattedValue: totalBudget > 0 ? `${Math.round((spendCard.primary.value / totalBudget) * 100)}%` : '—', change: spendCard.supporting.find(s => s.label === 'Pacing')?.change },
      ],
    } : undefined;
    const merged = [...(updatedSpend ? [updatedSpend] : []), ...others, ...overviewKPIGroupsRow2];
    return applyCurrencyToKPIGroups(merged, currency);
  }, [totalBudget, currency]);

  return (
    <div className="space-y-5 md:space-y-7">
      <SectionHeader title="Overview" subtitle="Cross-platform performance summary" />

      {/* KPI Cards – 3 across, 2 rows */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-4">
        {allKPICards.map((group, i) => (
          <KPIGroupCard key={i} data={group} />
        ))}
      </div>

      {/* Trend Charts */}
      <div className="space-y-2.5 md:space-y-3">
        <SectionHeader title="Trends" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
          <TrendChartCard title="Spend Over Time" data={spendTimeSeries} currency={currency} color="hsl(var(--chart-1))" />
          <TrendChartCard title="Conversions Over Time" data={conversionsTimeSeries} color="hsl(var(--chart-3))" />
          <TrendChartCard title="CPA Over Time" data={cpaTimeSeries} currency={currency} color="hsl(var(--chart-4))" />
          <TrendChartCard title="CTR Over Time" data={ctrTimeSeries} valueSuffix="%" color="hsl(var(--chart-2))" />
        </div>
      </div>

      {/* Conversion Funnel */}
      <FunnelCard />

      {/* Platform Comparison */}
      <div className="space-y-2.5 md:space-y-3">
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
