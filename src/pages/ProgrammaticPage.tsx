import { PlatformPageShell, moneyKpi, formatCompact } from '@/components/dashboard/PlatformPageShell';
import { DimensionBreakdownTable } from '@/components/dashboard/DimensionBreakdownTable';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { normalizePlatform, pctChange } from '@/hooks/useDashboardDaily';
import { KPIGroupData } from '@/types/dashboard';

export default function ProgrammaticPage() {
  const { data } = useDashboard();
  const scoped = useMemo(() => data.rows.filter(r => normalizePlatform(r.platform) === 'programmatic'), [data.rows]);

  const buildKpis = (cur: any, prev: any, currency: string): KPIGroupData[] => [
    {
      title: 'Spend', icon: 'DollarSign',
      primary: { label: 'Spend', value: cur.spend, formattedValue: moneyKpi(cur.spend, currency, 0), change: pctChange(cur.spend, prev?.spend), trend: [] },
      supporting: [
        { label: 'CPM', formattedValue: moneyKpi(cur.cpm, currency) },
        { label: 'CPC', formattedValue: moneyKpi(cur.cpc, currency) },
      ],
    },
    {
      title: 'Upper-Funnel Reach', icon: 'Eye',
      tooltip: 'Programmatic is primarily upper-funnel — focus on reach efficiency and viewable impressions.',
      primary: { label: 'Reach', value: cur.reach, formattedValue: formatCompact(cur.reach), change: pctChange(cur.reach, prev?.reach), trend: [] },
      supporting: [
        { label: 'Impressions', formattedValue: formatCompact(cur.impressions) },
        { label: 'Frequency', formattedValue: cur.frequency > 0 ? cur.frequency.toFixed(2) : '—' },
      ],
    },
    {
      title: 'Video Performance', icon: 'Play',
      primary: { label: 'Video Views', value: cur.videoViews, formattedValue: formatCompact(cur.videoViews), change: pctChange(cur.videoViews, prev?.videoViews), trend: [] },
      supporting: [
        { label: 'Completion', formattedValue: `${cur.videoCompletionRate.toFixed(1)}%` },
        { label: 'Cost / View', formattedValue: moneyKpi(cur.costPerVideoView, currency, 3) },
      ],
    },
    {
      title: 'Conversion Contribution', icon: 'Target',
      tooltip: 'Conversions assisted by programmatic — typically lower than direct response platforms.',
      primary: { label: 'All Conversions', value: cur.conversionsAll, formattedValue: formatCompact(cur.conversionsAll), change: pctChange(cur.conversionsAll, prev?.conversionsAll), trend: [] },
      supporting: [
        { label: 'LF Conv.', formattedValue: formatCompact(cur.conversionsLowerFunnel) },
        { label: 'Upper Funnel', formattedValue: formatCompact(cur.conversionsUpperFunnel) },
      ],
    },
  ];

  return (
    <PlatformPageShell
      platformKey="programmatic"
      title="Programmatic"
      buildKpiCards={buildKpis}
      midExtras={() => (
        <div className="space-y-6">
          <div className="space-y-3">
            <SectionHeader title="Campaign Type" subtitle="Display, Video, CTV, Audio breakdown via campaign_type." />
            <DimensionBreakdownTable
              rows={scoped}
              pick={r => r.campaign_type}
              title="By Campaign Type"
              hideIfAllUnspecified
            />
          </div>
          <div className="space-y-3">
            <SectionHeader title="Campaign Objective" />
            <DimensionBreakdownTable
              rows={scoped}
              pick={r => r.campaign_objective}
              title="By Objective"
              hideIfAllUnspecified
            />
          </div>
        </div>
      )}
    />
  );
}
