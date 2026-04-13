import { KPIGroupCard } from '@/components/dashboard/KPIGroupCard';
import { TrendChartCard } from '@/components/dashboard/TrendChartCard';
import { PlatformComparison } from '@/components/dashboard/PlatformComparison';

import { FunnelCard } from '@/components/dashboard/FunnelCard';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { overviewKPIGroups, overviewKPIGroupsRow2, spendTimeSeries, conversionsTimeSeries, cpaTimeSeries, clicksTimeSeries, platformSummaries, alerts } from '@/data/mockData';

export default function OverviewPage() {
  return (
    <div className="space-y-6 md:space-y-10">
      <SectionHeader title="Overview" subtitle="Cross-platform performance summary" />

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-4">
        {overviewKPIGroups.map((group, i) => (
          <KPIGroupCard key={i} data={group} />
        ))}
      </div>

      {/* Secondary KPI Row + Funnel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-4">
        <div>
          {overviewKPIGroupsRow2.map((group, i) => (
            <KPIGroupCard key={i} data={group} />
          ))}
        </div>
        <FunnelCard />
      </div>

      {/* Trend Charts */}
      <div className="space-y-3 md:space-y-4">
        <SectionHeader title="Trends" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <TrendChartCard title="Spend Over Time" data={spendTimeSeries} valuePrefix="$" color="hsl(var(--chart-1))" />
          <TrendChartCard title="Conversions Over Time" data={conversionsTimeSeries} color="hsl(var(--chart-3))" />
          <TrendChartCard title="CPA Over Time" data={cpaTimeSeries} valuePrefix="$" color="hsl(var(--chart-4))" />
          <TrendChartCard title="Clicks Over Time" data={clicksTimeSeries} color="hsl(var(--chart-2))" />
        </div>
      </div>

      {/* Platform Comparison */}
      <div className="space-y-3 md:space-y-4">
        <SectionHeader title="Platform Performance" />
        <PlatformComparison data={platformSummaries} />
      </div>

      {/* Diagnostics & Alerts */}
      <div className="space-y-3 md:space-y-4">
        <SectionHeader title="Diagnostics & Alerts" />
        <div className="space-y-2.5 md:space-y-3">
          {alerts.map(alert => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      </div>
    </div>
  );
}
