import { PlatformKey, KPIGroupData } from '@/types/dashboard';
import { KPIGroupCard } from '@/components/dashboard/KPIGroupCard';
import { TrendChartCard } from '@/components/dashboard/TrendChartCard';
import { PerformanceTable } from '@/components/dashboard/PerformanceTable';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { getPlatformKPIGroups, generateCampaigns, alerts } from '@/data/mockData';
import { useDashboard } from '@/context/DashboardContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useMemo } from 'react';

interface PlatformPageTemplateProps {
  platformKey: PlatformKey;
  title: string;
  tabs?: { key: string; label: string }[];
  extraFilters?: React.ReactNode;
  extraSections?: React.ReactNode;
}

export function PlatformPageTemplate({ platformKey, title, tabs, extraSections }: PlatformPageTemplateProps) {
  const { client } = useDashboard();
  const platformCfg = client.platforms[platformKey];
  const budget = platformCfg?.budget || 0;
  const currencyPrefix = client.currency === 'USD' ? '$' : client.currency === 'AED' ? 'د.إ' : client.currency === 'SAR' ? '﷼' : client.currency + ' ';

  const kpiGroups = useMemo(() => {
    const base = getPlatformKPIGroups(platformKey);
    // Inject budget + pacing into the Spend card
    return base.map(g => {
      if (g.title !== 'Spend' || !budget) return g;
      const pacing = Math.round((g.primary.value / budget) * 100);
      return {
        ...g,
        supporting: [
          { label: 'Budget', formattedValue: `${currencyPrefix}${budget.toLocaleString()}` },
          { label: 'Pacing', formattedValue: `${pacing}%` },
        ],
      } as KPIGroupData;
    });
  }, [platformKey, budget, currencyPrefix]);

  const campaigns = useMemo(() => generateCampaigns(platformKey), [platformKey]);
  const platformAlerts = alerts.filter(a => a.platform === platformKey);
  const [activeTab, setActiveTab] = useState(tabs?.[0]?.key || 'all');

  const spendData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (29 - i));
      return { date: d.toISOString().split('T')[0], value: Math.round(1200 + Math.random() * 800) };
    });
  }, []);

  const convData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (29 - i));
      return { date: d.toISOString().split('T')[0], value: Math.round(30 + Math.random() * 30) };
    });
  }, []);

  return (
    <div className="space-y-6 md:space-y-10">
      <SectionHeader title={title} subtitle={client.platforms[platformKey].accountIds.join(', ')} />

      {tabs && tabs.length > 1 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {tabs.map(t => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
        {kpiGroups.map((group, i) => <KPIGroupCard key={i} data={group} />)}
      </div>

      {/* Trends */}
      <div className="space-y-3 md:space-y-4">
        <SectionHeader title="Trends" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <TrendChartCard title="Spend" data={spendData} valuePrefix="$" color="hsl(var(--chart-1))" />
          <TrendChartCard title="Conversions" data={convData} color="hsl(var(--chart-3))" />
        </div>
      </div>

      {/* Campaign Table */}
      <div>
        <PerformanceTable data={campaigns} title="Campaign Performance" />
      </div>

      {/* Extra sections */}
      {extraSections}

      {/* Diagnostics */}
      {platformAlerts.length > 0 && (
        <div className="space-y-3 md:space-y-4">
          <SectionHeader title="Diagnostics" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
            {platformAlerts.map(a => <AlertCard key={a.id} alert={a} />)}
          </div>
        </div>
      )}
    </div>
  );
}
