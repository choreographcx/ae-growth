import { KPIPairCard } from '@/components/dashboard/KPIPairCard';
import { TrendChartCard } from '@/components/dashboard/TrendChartCard';
import { PlatformComparison } from '@/components/dashboard/PlatformComparison';
import { BudgetPacingCard } from '@/components/dashboard/BudgetPacingCard';
import { FunnelCard } from '@/components/dashboard/FunnelCard';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { overviewKPIs, spendTimeSeries, conversionsTimeSeries, cpaTimeSeries, clicksTimeSeries, platformSummaries, budgetPacing, alerts } from '@/data/mockData';

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <SectionHeader title="Overview" subtitle="Cross-platform performance summary" />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {overviewKPIs.map((pair, i) => (
          <KPIPairCard key={i} pair={pair} />
        ))}
      </div>

      {/* Trend Charts */}
      <SectionHeader title="Trends" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TrendChartCard title="Spend Over Time" data={spendTimeSeries} valuePrefix="$" color="hsl(var(--chart-1))" />
        <TrendChartCard title="Conversions Over Time" data={conversionsTimeSeries} color="hsl(var(--chart-3))" />
        <TrendChartCard title="CPA Over Time" data={cpaTimeSeries} valuePrefix="$" color="hsl(var(--chart-4))" />
        <TrendChartCard title="Clicks Over Time" data={clicksTimeSeries} color="hsl(var(--chart-2))" />
      </div>

      {/* Platform Comparison */}
      <SectionHeader title="Platform Performance" />
      <PlatformComparison data={platformSummaries} />

      {/* Budget Pacing */}
      <SectionHeader title="Budget & Pacing" />
      <BudgetPacingCard data={budgetPacing} />

      {/* Funnel */}
      <SectionHeader title="Funnel" />
      <FunnelCard />

      {/* Alerts */}
      <SectionHeader title="Diagnostics & Alerts" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {alerts.map(alert => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  );
}
