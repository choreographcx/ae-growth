import { PlatformPageShell, moneyKpi, formatCompact } from '@/components/dashboard/PlatformPageShell';
import { DimensionBreakdownTable } from '@/components/dashboard/DimensionBreakdownTable';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { normalizePlatform, pctChange } from '@/hooks/useDashboardDaily';
import { KPIGroupData } from '@/types/dashboard';

export default function GoogleAdsPage() {
  const { data } = useDashboard();
  const scoped = useMemo(() => data.rows.filter(r => normalizePlatform(r.platform) === 'google'), [data.rows]);

  const buildKpis = (cur: any, prev: any, currency: string): KPIGroupData[] => [
    {
      title: 'Spend', icon: 'DollarSign',
      primary: { label: 'Spend', value: cur.spend, formattedValue: moneyKpi(cur.spend, currency, 0), change: pctChange(cur.spend, prev?.spend), trend: [] },
      supporting: [],
    },
    {
      title: 'Impressions', icon: 'Eye',
      primary: { label: 'Impressions', value: cur.impressions, formattedValue: formatCompact(cur.impressions), change: pctChange(cur.impressions, prev?.impressions), trend: [] },
      supporting: [
        { label: 'CPM', formattedValue: moneyKpi(cur.cpm, currency), change: pctChange(cur.cpm, prev?.cpm) },
      ],
    },
    {
      title: 'Clicks', icon: 'MousePointerClick',
      primary: { label: 'Clicks', value: cur.clicks, formattedValue: formatCompact(cur.clicks), change: pctChange(cur.clicks, prev?.clicks), trend: [] },
      supporting: [
        { label: 'CTR', formattedValue: `${cur.ctr.toFixed(2)}%`, change: pctChange(cur.ctr, prev?.ctr) },
        { label: 'CPC', formattedValue: moneyKpi(cur.cpc, currency), change: pctChange(cur.cpc, prev?.cpc) },
      ],
    },
    {
      title: 'Conversions', icon: 'Target',
      tooltip: 'Google Ads is expected to drive direct response — focus on lower-funnel actions.',
      primary: { label: 'LF Conversions', value: cur.conversionsLowerFunnel, formattedValue: formatCompact(cur.conversionsLowerFunnel), change: pctChange(cur.conversionsLowerFunnel, prev?.conversionsLowerFunnel), trend: [] },
      supporting: [
        { label: 'CPA (LF)', formattedValue: cur.cpaLowerFunnel > 0 ? moneyKpi(cur.cpaLowerFunnel, currency) : '—', change: pctChange(cur.cpaLowerFunnel, prev?.cpaLowerFunnel) },
        { label: 'CVR (LF)', formattedValue: `${cur.cvrLowerFunnel.toFixed(2)}%` },
        { label: 'All Conv.', formattedValue: formatCompact(cur.conversionsAll) },
        { label: 'Upper Funnel', formattedValue: formatCompact(cur.conversionsUpperFunnel) },
      ],
    },
    {
      title: 'Reach', icon: 'Users',
      primary: { label: 'Reach', value: cur.reach, formattedValue: formatCompact(cur.reach), change: pctChange(cur.reach, prev?.reach), trend: [] },
      supporting: [
        { label: 'Frequency', formattedValue: cur.frequency > 0 ? cur.frequency.toFixed(2) : '—' },
      ],
    },
    {
      title: 'Landing Page Views', icon: 'FileText',
      primary: { label: 'LPV', value: cur.landingPageViews, formattedValue: formatCompact(cur.landingPageViews), change: pctChange(cur.landingPageViews, prev?.landingPageViews), trend: [] },
      supporting: [
        { label: 'Cost / LPV', formattedValue: moneyKpi(cur.costPerLPV, currency), change: pctChange(cur.costPerLPV, prev?.costPerLPV) },
        { label: 'LPV Rate', formattedValue: `${cur.lpvRate.toFixed(1)}%` },
      ],
    },
  ];

  return (
    <PlatformPageShell
      platformKey="google"
      title="Google Ads"
      buildKpiCards={buildKpis}
      warnOnWastedSpend
      midExtras={() => (
        <div className="space-y-6">
          <div className="space-y-3">
            <SectionHeader title="Campaign Type" subtitle="Search vs Performance Max vs Display vs Video." />
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
