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
      supporting: [
        { label: 'CPC', formattedValue: moneyKpi(cur.cpc, currency) },
        { label: 'CPM', formattedValue: moneyKpi(cur.cpm, currency) },
      ],
    },
    {
      title: 'Clicks & CTR', icon: 'MousePointerClick',
      primary: { label: 'Clicks', value: cur.clicks, formattedValue: formatCompact(cur.clicks), change: pctChange(cur.clicks, prev?.clicks), trend: [] },
      supporting: [
        { label: 'CTR', formattedValue: `${cur.ctr.toFixed(2)}%`, change: pctChange(cur.ctr, prev?.ctr) },
        { label: 'Impressions', formattedValue: formatCompact(cur.impressions) },
      ],
    },
    {
      title: 'Lower-Funnel Conv.', icon: 'Target',
      tooltip: 'Primary KPI — Google Ads is expected to drive direct response.',
      primary: { label: 'LF Conversions', value: cur.conversionsLowerFunnel, formattedValue: formatCompact(cur.conversionsLowerFunnel), change: pctChange(cur.conversionsLowerFunnel, prev?.conversionsLowerFunnel), trend: [] },
      supporting: [
        { label: 'CPA (LF)', formattedValue: moneyKpi(cur.cpaLowerFunnel, currency), change: pctChange(cur.cpaLowerFunnel, prev?.cpaLowerFunnel) },
        { label: 'CVR (LF)', formattedValue: `${cur.cvrLowerFunnel.toFixed(2)}%` },
      ],
    },
    {
      title: 'Return', icon: 'TrendingUp',
      tooltip: cur.roas > 0 && cur.roas < 1 ? 'ROAS below 1x — campaigns spending more than they return in tracked value.' : undefined,
      primary: { label: 'ROAS', value: cur.roas, formattedValue: cur.roas > 0 ? `${cur.roas.toFixed(2)}x` : '—', change: pctChange(cur.roas, prev?.roas), trend: [] },
      supporting: [
        { label: 'Conv. Value', formattedValue: moneyKpi(cur.conversionValue, currency, 0) },
        { label: 'Cost / LPV', formattedValue: moneyKpi(cur.costPerLPV, currency) },
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
