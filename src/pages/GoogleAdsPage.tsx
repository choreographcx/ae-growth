import { PlatformPageShell, moneyKpi, formatCompact } from '@/components/dashboard/PlatformPageShell';
import { DimensionBreakdownTable } from '@/components/dashboard/DimensionBreakdownTable';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { MultiSelectFilter } from '@/components/dashboard/MultiSelectFilter';
import { useMemo, useState, useCallback } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { normalizePlatform, pctChange, DashboardDailyRow } from '@/hooks/useDashboardDaily';
import { KPIGroupData } from '@/types/dashboard';

export default function GoogleAdsPage() {
  const { data } = useDashboard();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // All Google rows (unfiltered) — used to build the available campaign-type options.
  const googleRows = useMemo(
    () => data.rows.filter(r => normalizePlatform(r.platform) === 'google'),
    [data.rows]
  );

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    for (const r of googleRows) {
      const v = (r.campaign_type || '').trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [googleRows]);

  // Filter applied to BOTH the KPI/trend data (via PlatformPageShell) and the breakdown tables below.
  const typeFilter = useCallback((r: DashboardDailyRow) => {
    if (!selectedTypes.length) return true;
    return selectedTypes.includes((r.campaign_type || '').trim());
  }, [selectedTypes]);

  const scoped = useMemo(() => googleRows.filter(typeFilter), [googleRows, typeFilter]);

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
      extraRowFilter={typeFilter}
      titleAction={
        availableTypes.length > 0 ? (
          <MultiSelectFilter
            label="Campaign Type"
            options={availableTypes}
            selected={selectedTypes}
            onChange={setSelectedTypes}
          />
        ) : null
      }
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
