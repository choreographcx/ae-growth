import { KPIGroupCard } from '@/components/dashboard/KPIGroupCard';
import { TrendChartCard } from '@/components/dashboard/TrendChartCard';
import { PlatformComparison } from '@/components/dashboard/PlatformComparison';
import { FunnelCard } from '@/components/dashboard/FunnelCard';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { overviewKPIGroups, overviewKPIGroupsRow2, spendTimeSeries, conversionsTimeSeries, cpaTimeSeries, platformSummaries, alerts } from '@/data/mockData';
import { useMemo } from 'react';

const allKPICards = [...overviewKPIGroups, ...overviewKPIGroupsRow2];

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
  const ctrTimeSeries = useMemo(() => generateCTRTimeSeries(), []);
  const sortedAlerts = useMemo(() =>
    [...alerts].sort((a, b) => severityOrder[a.type] - severityOrder[b.type]),
    []
  );

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
          <TrendChartCard title="Spend Over Time" data={spendTimeSeries} valuePrefix="$" color="hsl(var(--chart-1))" />
          <TrendChartCard title="Conversions Over Time" data={conversionsTimeSeries} color="hsl(var(--chart-3))" />
          <TrendChartCard title="CPA Over Time" data={cpaTimeSeries} valuePrefix="$" color="hsl(var(--chart-4))" />
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
