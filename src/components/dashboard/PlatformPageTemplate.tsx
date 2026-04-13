import { PlatformKey } from '@/types/dashboard';
import { KPIPairCard } from '@/components/dashboard/KPIPairCard';
import { TrendChartCard } from '@/components/dashboard/TrendChartCard';
import { PerformanceTable } from '@/components/dashboard/PerformanceTable';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { getPlatformKPIs, generateCampaigns, alerts } from '@/data/mockData';
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
  const kpis = useMemo(() => getPlatformKPIs(platformKey), [platformKey]);
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
    <div className="space-y-8">
      <SectionHeader title={title} subtitle={`${client.name} · ${client.platforms[platformKey].accountIds.join(', ')}`} />

      {tabs && tabs.length > 1 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {tabs.map(t => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((pair, i) => <KPIPairCard key={i} pair={pair} />)}
      </div>

      {/* Trends */}
      <SectionHeader title="Trends" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TrendChartCard title="Spend" data={spendData} valuePrefix="$" color="hsl(var(--chart-1))" />
        <TrendChartCard title="Conversions" data={convData} color="hsl(var(--chart-3))" />
      </div>

      {/* Campaign Table */}
      <PerformanceTable data={campaigns} title="Campaign Performance" />

      {/* Extra sections */}
      {extraSections}

      {/* Diagnostics */}
      {platformAlerts.length > 0 && (
        <>
          <SectionHeader title="Diagnostics" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {platformAlerts.map(a => <AlertCard key={a.id} alert={a} />)}
          </div>
        </>
      )}
    </div>
  );
}
