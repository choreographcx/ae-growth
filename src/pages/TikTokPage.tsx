import { PlatformPageShell, moneyKpi, formatCompact } from '@/components/dashboard/PlatformPageShell';
import { DimensionBreakdownTable } from '@/components/dashboard/DimensionBreakdownTable';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { normalizePlatform, pctChange } from '@/hooks/useDashboardDaily';
import { KPIGroupData } from '@/types/dashboard';
import { resolveCampaignObjective } from '@/lib/campaignNaming';

export default function TikTokPage() {
  const { data } = useDashboard();
  const scoped = useMemo(() => data.rows.filter(r => normalizePlatform(r.platform) === 'tiktok'), [data.rows]);

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
      tooltip: cur.spend >= 1000 && cur.conversionsLowerFunnel === 0 ? 'Significant spend with zero lower-funnel conversions — likely awareness-driven.' : undefined,
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
      tooltip: 'TikTok is awareness-led by default — reach matters as much as clicks.',
      primary: { label: 'Reach', value: cur.reach, formattedValue: formatCompact(cur.reach), change: pctChange(cur.reach, prev?.reach), trend: [] },
      supporting: [
        { label: 'Frequency', formattedValue: cur.frequency > 0 ? cur.frequency.toFixed(2) : '—', change: pctChange(cur.frequency, prev?.frequency) },
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
      platformKey="tiktok"
      title="TikTok Ads"
      buildKpiCards={buildKpis}
      midExtras={() => (
        <div className="space-y-6">
          <div className="space-y-3">
            <SectionHeader title="Campaign Objective" subtitle="Awareness vs traffic vs conversion-led campaigns." />
            <DimensionBreakdownTable
              rows={scoped}
              pick={r => resolveCampaignObjective(r.campaign_objective, r.campaign_name)}
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
