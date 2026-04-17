import { PlatformPageShell, moneyKpi, formatCompact } from '@/components/dashboard/PlatformPageShell';
import { pctChange } from '@/hooks/useDashboardDaily';
import { KPIGroupData } from '@/types/dashboard';

export default function LinkedInPage() {
  const buildKpis = (cur: any, prev: any, currency: string): KPIGroupData[] => [
    {
      title: 'Spend', icon: 'DollarSign',
      primary: { label: 'Spend', value: cur.spend, formattedValue: moneyKpi(cur.spend, currency, 0), change: pctChange(cur.spend, prev?.spend), trend: [] },
      supporting: [{ label: 'CPM', formattedValue: moneyKpi(cur.cpm, currency) }, { label: 'CPC', formattedValue: moneyKpi(cur.cpc, currency) }],
    },
    {
      title: 'Reach', icon: 'Eye',
      primary: { label: 'Impressions', value: cur.impressions, formattedValue: formatCompact(cur.impressions), change: pctChange(cur.impressions, prev?.impressions), trend: [] },
      supporting: [{ label: 'Reach', formattedValue: formatCompact(cur.reach) }, { label: 'Frequency', formattedValue: cur.frequency > 0 ? cur.frequency.toFixed(2) : '—' }],
    },
    {
      title: 'Engagement', icon: 'MousePointerClick',
      primary: { label: 'Clicks', value: cur.clicks, formattedValue: formatCompact(cur.clicks), change: pctChange(cur.clicks, prev?.clicks), trend: [] },
      supporting: [{ label: 'CTR', formattedValue: `${cur.ctr.toFixed(2)}%`, change: pctChange(cur.ctr, prev?.ctr) }, { label: 'LPV Rate', formattedValue: `${cur.lpvRate.toFixed(1)}%` }],
    },
    {
      title: 'Lower-Funnel Conv.', icon: 'UserCheck',
      tooltip: 'LinkedIn typically drives B2B leads — measure on lower-funnel form fills.',
      primary: { label: 'LF Conversions', value: cur.conversionsLowerFunnel, formattedValue: formatCompact(cur.conversionsLowerFunnel), change: pctChange(cur.conversionsLowerFunnel, prev?.conversionsLowerFunnel), trend: [] },
      supporting: [{ label: 'CPA (LF)', formattedValue: cur.cpaLowerFunnel > 0 ? moneyKpi(cur.cpaLowerFunnel, currency) : '—' }, { label: 'CVR (LF)', formattedValue: `${cur.cvrLowerFunnel.toFixed(2)}%` }],
    },
  ];

  return <PlatformPageShell platformKey="linkedin" title="LinkedIn Ads" buildKpiCards={buildKpis} emptyOnZeroSpend warnOnWastedSpend />;
}
