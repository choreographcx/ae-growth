import { useState, useMemo } from 'react';
import { KPIGroupCard } from '@/components/dashboard/KPIGroupCard';
import { TrendChartCard } from '@/components/dashboard/TrendChartCard';
import { PlatformComparison } from '@/components/dashboard/PlatformComparison';
import { FunnelCard } from '@/components/dashboard/FunnelCard';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { MultiSelectFilter } from '@/components/dashboard/MultiSelectFilter';
import { useDashboard } from '@/context/DashboardContext';
import { overviewKPIGroups, overviewKPIGroupsRow2, spendTimeSeries, conversionsTimeSeries, cpaTimeSeries, clicksTimeSeries, platformSummaries, alerts, generateCampaigns } from '@/data/mockData';
import { PlatformKey } from '@/types/dashboard';

const allKPICards = [...overviewKPIGroups, ...overviewKPIGroupsRow2];

const objectives = ['Awareness', 'Traffic', 'Conversions', 'Lead Gen', 'Engagement'];

export default function OverviewPage() {
  const { enabledPlatforms, client } = useDashboard();

  // Build campaign list from enabled platforms
  const allCampaigns = useMemo(() => {
    return enabledPlatforms.flatMap(p => generateCampaigns(p));
  }, [enabledPlatforms]);

  const campaignNames = useMemo(() => [...new Set(allCampaigns.map(c => c.name))], [allCampaigns]);

  const platformOptions = useMemo(
    () => enabledPlatforms.map(k => client.platforms[k].label),
    [enabledPlatforms, client.platforms]
  );

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);

  const hasFilters = selectedPlatforms.length > 0 || selectedCampaigns.length > 0 || selectedObjectives.length > 0;

  return (
    <div className="space-y-6 md:space-y-10">
      <SectionHeader title="Overview" subtitle="Cross-platform performance summary" />

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <MultiSelectFilter label="Platforms" options={platformOptions} selected={selectedPlatforms} onChange={setSelectedPlatforms} />
        <MultiSelectFilter label="Campaigns" options={campaignNames} selected={selectedCampaigns} onChange={setSelectedCampaigns} />
        <MultiSelectFilter label="Objectives" options={objectives} selected={selectedObjectives} onChange={setSelectedObjectives} />
        {hasFilters && (
          <button
            onClick={() => { setSelectedPlatforms([]); setSelectedCampaigns([]); setSelectedObjectives([]); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
          >
            Clear all
          </button>
        )}
      </div>

      {/* KPI Cards – 3 across, 2 rows */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-4">
        {allKPICards.map((group, i) => (
          <KPIGroupCard key={i} data={group} />
        ))}
      </div>

      {/* Conversion Funnel */}
      <FunnelCard />

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
