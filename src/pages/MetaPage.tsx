import { PlatformPageShell, moneyKpi, formatCompact } from '@/components/dashboard/PlatformPageShell';
import { DimensionBreakdownTable } from '@/components/dashboard/DimensionBreakdownTable';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { normalizePlatform, pctChange } from '@/hooks/useDashboardDaily';
import { KPIGroupData } from '@/types/dashboard';

export default function MetaPage() {
  const { data } = useDashboard();
  const scoped = useMemo(() => data.rows.filter(r => normalizePlatform(r.platform) === 'meta'), [data.rows]);

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
      title: 'Reach & Frequency', icon: 'Users',
      tooltip: cur.frequency >= 4 ? 'High frequency (≥4) — refresh creative or expand audience to avoid fatigue.' : undefined,
      primary: { label: 'Reach', value: cur.reach, formattedValue: formatCompact(cur.reach), change: pctChange(cur.reach, prev?.reach), trend: [] },
      supporting: [
        { label: 'Impressions', formattedValue: formatCompact(cur.impressions) },
        { label: 'Frequency', formattedValue: cur.frequency > 0 ? cur.frequency.toFixed(2) : '—' },
      ],
    },
    {
      title: 'Engagement', icon: 'MousePointerClick',
      primary: { label: 'Clicks', value: cur.clicks, formattedValue: formatCompact(cur.clicks), change: pctChange(cur.clicks, prev?.clicks), trend: [] },
      supporting: [
        { label: 'CTR', formattedValue: `${cur.ctr.toFixed(2)}%`, change: pctChange(cur.ctr, prev?.ctr) },
        { label: 'LPV Rate', formattedValue: `${cur.lpvRate.toFixed(1)}%` },
      ],
    },
    {
      title: 'Lower-Funnel Conv.', icon: 'Target',
      tooltip: 'Primary outcome metric for Meta — leads, purchases, sign-ups.',
      primary: { label: 'LF Conversions', value: cur.conversionsLowerFunnel, formattedValue: formatCompact(cur.conversionsLowerFunnel), change: pctChange(cur.conversionsLowerFunnel, prev?.conversionsLowerFunnel), trend: [] },
      supporting: [
        { label: 'CPA (LF)', formattedValue: moneyKpi(cur.cpaLowerFunnel, currency), change: pctChange(cur.cpaLowerFunnel, prev?.cpaLowerFunnel) },
        { label: 'CVR (LF)', formattedValue: `${cur.cvrLowerFunnel.toFixed(2)}%` },
      ],
    },
  ];

  return (
    <PlatformPageShell
      platformKey="meta"
      title="Meta Ads"
      buildKpiCards={buildKpis}
      warnOnWastedSpend
      midExtras={() => (
        <div className="space-y-6">
          <div className="space-y-3">
            <SectionHeader title="Audience Breakdown" subtitle="Raw audience_type from campaign data." />
            <DimensionBreakdownTable
              rows={scoped}
              pick={r => r.audience_type}
              title="By Audience Type"
              hideIfAllUnspecified
            />
          </div>
          <div className="space-y-3">
            <SectionHeader title="Campaign Objective" subtitle="Performance by Meta campaign objective." />
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
