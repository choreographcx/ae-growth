import { PlatformPageShell, moneyKpi, formatCompact } from '@/components/dashboard/PlatformPageShell';
import { pctChange } from '@/hooks/useDashboardDaily';
import { KPIGroupData } from '@/types/dashboard';


export default function ProgrammaticPage() {
  const buildKpis = (cur: any, prev: any, currency: string): KPIGroupData[] => [
    {
      title: 'Spend', icon: 'DollarSign',
      primary: { label: 'Spend', value: cur.spend, formattedValue: moneyKpi(cur.spend, currency, 0), change: pctChange(cur.spend, prev?.spend), trend: [] },
      supporting: [],
    },
    {
      title: 'Impressions', icon: 'Eye',
      tooltip: 'Programmatic is primarily upper-funnel — focus on reach and viewable impressions.',
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
      title: 'Conversion Contribution', icon: 'Target',
      tooltip: 'Conversions assisted by programmatic — typically lower than direct-response platforms.',
      primary: { label: 'All Conversions', value: cur.conversionsAll, formattedValue: formatCompact(cur.conversionsAll), change: pctChange(cur.conversionsAll, prev?.conversionsAll), trend: [] },
      supporting: [
        { label: 'LF Conv.', formattedValue: formatCompact(cur.conversionsLowerFunnel) },
        { label: 'Upper Funnel', formattedValue: formatCompact(cur.conversionsUpperFunnel) },
        { label: 'CPA (LF)', formattedValue: cur.cpaLowerFunnel > 0 ? moneyKpi(cur.cpaLowerFunnel, currency) : '—' },
        { label: 'CVR (LF)', formattedValue: `${cur.cvrLowerFunnel.toFixed(2)}%` },
      ],
    },
    {
      title: 'Reach', icon: 'Users',
      primary: { label: 'Reach', value: cur.reach, formattedValue: formatCompact(cur.reach), change: pctChange(cur.reach, prev?.reach), trend: [] },
      supporting: [
        { label: 'Frequency', formattedValue: cur.frequency > 0 ? cur.frequency.toFixed(2) : '—', change: pctChange(cur.frequency, prev?.frequency) },
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
      platformKey="programmatic"
      title="Programmatic"
      buildKpiCards={buildKpis}
    />
  );
}
