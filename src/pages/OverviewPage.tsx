import { KPIGroupCard } from '@/components/dashboard/KPIGroupCard';
import { TrendChartCard } from '@/components/dashboard/TrendChartCard';
import { PlatformComparison } from '@/components/dashboard/PlatformComparison';
import { BudgetPacingCard } from '@/components/dashboard/BudgetPacingCard';
import { FunnelCard } from '@/components/dashboard/FunnelCard';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { overviewKPIGroups, overviewKPIGroupsRow2, spendTimeSeries, conversionsTimeSeries, cpaTimeSeries, clicksTimeSeries, platformSummaries, budgetPacing, alerts } from '@/data/mockData';

export default function OverviewPage() {
  return (
    <div className="space-y-10">
      <SectionHeader title="Overview" subtitle="Cross-platform performance summary" />

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {overviewKPIGroups.map((group, i) => (
          <KPIGroupCard key={i} data={group} />
        ))}
      </div>

      {/* Secondary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {overviewKPIGroupsRow2.map((group, i) => (
          <KPIGroupCard key={i} data={group} />
        ))}
      </div>

      {/* Trend Charts */}
      <div>
        <SectionHeader title="Trends" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TrendChartCard title="Spend Over Time" data={spendTimeSeries} valuePrefix="$" color="hsl(var(--chart-1))" />
          <TrendChartCard title="Conversions Over Time" data={conversionsTimeSeries} color="hsl(var(--chart-3))" />
          <TrendChartCard title="CPA Over Time" data={cpaTimeSeries} valuePrefix="$" color="hsl(var(--chart-4))" />
          <TrendChartCard title="Clicks Over Time" data={clicksTimeSeries} color="hsl(var(--chart-2))" />
        </div>
      </div>

      {/* Platform Comparison */}
      <div>
        <SectionHeader title="Platform Performance" />
        <PlatformComparison data={platformSummaries} />
      </div>

      {/* Budget Pacing */}
      <div>
        <SectionHeader title="Budget & Pacing" />
        <BudgetPacingCard data={budgetPacing} />
      </div>

      {/* Funnel */}
      <div>
        <SectionHeader title="Funnel" />
        <FunnelCard />
      </div>

      {/* Alerts */}
      <div>
        <SectionHeader title="Diagnostics & Alerts" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alerts.map(alert => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      </div>
    </div>
  );
}
