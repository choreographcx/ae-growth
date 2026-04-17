import { PlatformPageShell, moneyKpi, formatCompact } from '@/components/dashboard/PlatformPageShell';
import { DimensionBreakdownTable } from '@/components/dashboard/DimensionBreakdownTable';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { normalizePlatform, pctChange } from '@/hooks/useDashboardDaily';
import { KPIGroupData } from '@/types/dashboard';

export default function SnapchatPage() {
  const { data } = useDashboard();
  const scoped = useMemo(() => data.rows.filter(r => normalizePlatform(r.platform) === 'snapchat'), [data.rows]);

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
      title: 'Reach & Awareness', icon: 'Eye',
      tooltip: 'Snapchat is primarily awareness — measure on reach, not direct response.',
      primary: { label: 'Reach', value: cur.reach, formattedValue: formatCompact(cur.reach), change: pctChange(cur.reach, prev?.reach), trend: [] },
      supporting: [
        { label: 'Impressions', formattedValue: formatCompact(cur.impressions) },
        { label: 'Frequency', formattedValue: cur.frequency > 0 ? cur.frequency.toFixed(2) : '—' },
      ],
    },
    {
      title: 'Video Engagement', icon: 'Play',
      primary: { label: 'Video Views', value: cur.videoViews, formattedValue: formatCompact(cur.videoViews), change: pctChange(cur.videoViews, prev?.videoViews), trend: [] },
      supporting: [
        { label: 'Cost / View', formattedValue: moneyKpi(cur.costPerVideoView, currency, 3) },
        { label: 'Completion', formattedValue: `${cur.videoCompletionRate.toFixed(1)}%` },
      ],
    },
    {
      title: 'Lower-Funnel Conv.', icon: 'Target',
      tooltip: cur.spend >= 1000 && cur.conversionsLowerFunnel === 0 ? 'Significant spend with zero lower-funnel conversions — expected for awareness-led activity.' : undefined,
      primary: { label: 'LF Conversions', value: cur.conversionsLowerFunnel, formattedValue: formatCompact(cur.conversionsLowerFunnel), change: pctChange(cur.conversionsLowerFunnel, prev?.conversionsLowerFunnel), trend: [] },
      supporting: [
        { label: 'CPA (LF)', formattedValue: cur.cpaLowerFunnel > 0 ? moneyKpi(cur.cpaLowerFunnel, currency) : '—' },
        { label: 'CVR (LF)', formattedValue: `${cur.cvrLowerFunnel.toFixed(2)}%` },
      ],
    },
  ];

  return (
    <PlatformPageShell
      platformKey="snapchat"
      title="Snapchat Ads"
      buildKpiCards={buildKpis}
      warnOnWastedSpend
      midExtras={() => (
        <div className="space-y-6">
          <div className="space-y-3">
            <SectionHeader title="Campaign Objective" />
            <DimensionBreakdownTable
              rows={scoped}
              pick={r => r.campaign_objective}
              title="By Objective"
              hideIfAllUnspecified
            />
          </div>
          <div className="space-y-3">
            <SectionHeader title="Audience" />
            <DimensionBreakdownTable
              rows={scoped}
              pick={r => r.audience_type}
              title="By Audience Type"
              hideIfAllUnspecified
            />
          </div>
        </div>
      )}
    />
  );
}
