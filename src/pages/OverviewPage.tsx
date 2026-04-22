import { KPIGroupCard } from '@/components/dashboard/KPIGroupCard';
import { TrendChartCard } from '@/components/dashboard/TrendChartCard';
import { PlatformComparison } from '@/components/dashboard/PlatformComparison';
import { CampaignPerformance } from '@/components/dashboard/CampaignPerformance';
import { PlatformContributionCard } from '@/components/dashboard/PlatformContributionCard';
import { EnhancedFunnelCard } from '@/components/dashboard/EnhancedFunnelCard';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { SortableSection } from '@/components/dashboard/SortableSection';
import { BreakdownDimensionCard } from '@/components/dashboard/BreakdownDimensionCard';
import { ConversionBreakdownCard } from '@/components/dashboard/ConversionBreakdownCard';
import { Ga4OverviewTile } from '@/components/dashboard/Ga4OverviewTile';
import { useEffect, useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { KPIGroupData } from '@/types/dashboard';
import { CurrencySymbol, applyCurrencyToKPIGroups } from '@/lib/currency';
import { pctChange, aggregateRows, buildTimeSeries, buildCpaSeries } from '@/hooks/useDashboardDaily';
import { generateInsights, sortInsights } from '@/lib/insights';
import { useUserLayout } from '@/hooks/useUserLayout';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

function formatCompact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

// Default order of top-level Overview sections (ids must be stable across releases).
const DEFAULT_SECTION_ORDER = [
  'kpis',
  'ga4',
  'contribution',
  'trends',
  'funnel',
  'breakdowns',
  'conversionBreakdown',
  'platforms',
  'campaigns',
  'insights',
] as const;

export default function OverviewPage() {
  const { client, data, setLayoutEdit } = useDashboard();
  const currency = client.currency;
  const {
    loading, error, rows, previousRows, totals, previousTotals,
    platformSummaries, spendSeries, ctrSeries,
  } = data;

  // Overview always uses LOWER FUNNEL conversions for cross-platform comparability.
  const lf = useMemo(() => aggregateRows(rows, 'lower_funnel'), [rows]);
  const lfPrev = useMemo(() => previousRows.length ? aggregateRows(previousRows, 'lower_funnel') : null, [previousRows]);
  const lfConvSeries = useMemo(() => buildTimeSeries(rows, r => +r.conversions_lower_funnel || 0), [rows]);
  const lfCpaSeries  = useMemo(() => buildCpaSeries(rows, 'lower_funnel'), [rows]);

  // Insights derived from real data
  const insights = useMemo(
    () => sortInsights(generateInsights({ totals, previousTotals, platforms: platformSummaries })),
    [totals, previousTotals, platformSummaries]
  );

  const totalBudget = useMemo(() =>
    Object.values(client.platforms).filter(p => p.enabled).reduce((s, p) => s + (p.budget || 0), 0),
    [client.platforms]
  );

  const funnelSteps = useMemo(() => [
    { label: 'Impressions',        value: totals.impressions,       formattedValue: formatCompact(totals.impressions) },
    { label: 'Clicks',             value: totals.clicks,            formattedValue: formatCompact(totals.clicks),
      rateFromPrev: totals.ctr,    rateLabel: 'CTR' },
    { label: 'Landing Page Views', value: totals.landingPageViews,  formattedValue: formatCompact(totals.landingPageViews),
      rateFromPrev: totals.lpvRate, rateLabel: 'LPV Rate' },
    { label: 'Lower-Funnel Conversions', value: lf.conversions,     formattedValue: formatCompact(lf.conversions),
      rateFromPrev: totals.cvrLowerFunnel, rateLabel: 'CVR (LF)' },
  ].filter(s => s.value > 0 || s.label === 'Lower-Funnel Conversions'), [totals, lf]);

  // Insight flags for KPI cards
  const weakLpvRate  = totals.ctr >= 1.5 && totals.lpvRate > 0 && totals.lpvRate < 30;

  const kpiCards: KPIGroupData[] = useMemo(() => {
    const cur = totals;
    const prev = previousTotals;

    const money = (v: number, d = 2) => <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{v.toFixed(d)}</span>;
    const moneyCompact = (v: number) => <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{formatCompact(v)}</span>;

    const groups: KPIGroupData[] = [
      {
        title: 'Spend', icon: 'DollarSign',
        primary: {
          label: 'Total Spend', value: cur.spend,
          formattedValue: moneyCompact(cur.spend),
          change: pctChange(cur.spend, prev?.spend),
          trend: spendSeries.slice(-7).map(p => p.value),
        },
        supporting: totalBudget > 0 ? [
          { label: 'Budget', formattedValue: <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{totalBudget.toLocaleString()}</span> },
          { label: 'Pacing', formattedValue: `${Math.round((cur.spend / totalBudget) * 100)}%` },
        ] : [],
      },
      {
        title: 'Impressions', icon: 'Eye',
        primary: {
          label: 'Impressions', value: cur.impressions,
          formattedValue: formatCompact(cur.impressions),
          change: pctChange(cur.impressions, prev?.impressions),
          trend: [],
        },
        supporting: [
          { label: 'CPM', formattedValue: money(cur.cpm), change: pctChange(cur.cpm, prev?.cpm) },
        ],
      },
      {
        title: 'Clicks', icon: 'MousePointerClick',
        primary: {
          label: 'Clicks', value: cur.clicks,
          formattedValue: formatCompact(cur.clicks),
          change: pctChange(cur.clicks, prev?.clicks),
          trend: [],
        },
        supporting: [
          { label: 'CTR', formattedValue: `${cur.ctr.toFixed(2)}%`, change: pctChange(cur.ctr, prev?.ctr) },
          { label: 'CPC', formattedValue: money(cur.cpc), change: pctChange(cur.cpc, prev?.cpc) },
        ],
      },
      {
        title: 'Conversions', icon: 'Target',
        tooltip: 'Primary KPI uses lower-funnel actions — leads, purchases, sign-ups. Standardized across platforms.',
        primary: {
          label: 'Lower-Funnel Conversions', value: lf.conversions,
          formattedValue: formatCompact(lf.conversions),
          change: pctChange(lf.conversions, lfPrev?.conversions),
          trend: lfConvSeries.slice(-7).map(p => p.value),
        },
        supporting: [
          { label: 'CPA (LF)', formattedValue: money(lf.cpaLowerFunnel), change: pctChange(lf.cpaLowerFunnel, lfPrev?.cpaLowerFunnel) },
          { label: 'CVR (LF)', formattedValue: `${lf.cvrLowerFunnel.toFixed(2)}%` },
          { label: 'All Conv.', formattedValue: formatCompact(cur.conversionsAll) },
          { label: 'Upper Funnel', formattedValue: formatCompact(cur.conversionsUpperFunnel) },
        ],
      },
      {
        title: 'Landing Page Views', icon: 'FileText',
        primary: {
          label: 'LPV', value: cur.landingPageViews,
          formattedValue: formatCompact(cur.landingPageViews),
          change: pctChange(cur.landingPageViews, prev?.landingPageViews),
          trend: [],
        },
        supporting: [
          { label: 'Cost / LPV', formattedValue: money(cur.costPerLPV), change: pctChange(cur.costPerLPV, prev?.costPerLPV) },
          { label: 'LPV Rate', formattedValue: `${cur.lpvRate.toFixed(1)}%` },
        ],
        tooltip: weakLpvRate ? 'CTR is strong but LPV rate is weak — check page speed, redirects, or tracking.' : undefined,
      },
    ];

    return applyCurrencyToKPIGroups(groups, currency, 26);
  }, [totals, previousTotals, lf, lfPrev, lfConvSeries, currency, totalBudget, spendSeries, weakLpvRate]);

  // Layout persistence
  const defaultOrder = useMemo(() => [...DEFAULT_SECTION_ORDER], []);
  const { order, setOrder, resetLayout, isEditing, setEditing } = useUserLayout('overview', defaultOrder);

  // Expose layout-edit controls to the global header (so the toggle lives next
  // to Export PDF). Cleared when the page unmounts.
  useEffect(() => {
    setLayoutEdit({
      isEditing,
      onToggle: () => setEditing(!isEditing),
      onReset: resetLayout,
    });
    return () => setLayoutEdit(null);
  }, [isEditing, setEditing, resetLayout, setLayoutEdit]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setOrder(arrayMove(order, oldIndex, newIndex));
  };

  // Section content map — keyed by stable id used in DEFAULT_SECTION_ORDER.
  const sectionMap: Record<string, { label: string; node: JSX.Element } | null> = {
    kpis: {
      label: 'KPI cards',
      node: (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-4">
          {kpiCards.map((g, i) => <KPIGroupCard key={i} data={g} />)}
        </div>
      ),
    },
    contribution: {
      label: 'Platform Contribution',
      node: (
        <div className="space-y-2.5 md:space-y-3">
          <SectionHeader title="Platform Contribution" />
          <PlatformContributionCard platforms={platformSummaries} />
        </div>
      ),
    },
    ga4: {
      label: 'Web Analytics (GA4)',
      node: <Ga4OverviewTile />,
    },
    trends: {
      label: 'Trends',
      node: (
        <div className="space-y-2.5 md:space-y-3 print-break-before">
          <SectionHeader title="Trends" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
            <TrendChartCard title="Spend"                       data={spendSeries}    currency={currency} color="hsl(var(--chart-1))" />
            <TrendChartCard title="Lower-Funnel Conversions"    data={lfConvSeries}                          color="hsl(var(--chart-3))" />
            <TrendChartCard title="CPA (Lower Funnel)"          data={lfCpaSeries}    currency={currency} color="hsl(var(--chart-4))" />
            <TrendChartCard title="CTR"                         data={ctrSeries}      valueSuffix="%"     color="hsl(var(--chart-2))" />
          </div>
        </div>
      ),
    },
    funnel: {
      label: 'Funnel',
      node: <EnhancedFunnelCard steps={funnelSteps} />,
    },
    breakdowns: {
      label: 'Market / Channel / Objective Breakdown',
      node: (
        <div className="print-break-before">
          <BreakdownDimensionCard rows={rows} />
        </div>
      ),
    },
    conversionBreakdown: {
      label: 'Conversion Breakdown',
      node: (
        <div className="space-y-2.5 md:space-y-3 print-break-before">
          <SectionHeader title="Conversion Breakdown" subtitle="All tracked conversions, aggregated across platforms" />
          <ConversionBreakdownCard
            start={data.range.start}
            end={data.range.end}
            sourceRows={rows}
            aggregateAcrossPlatforms
          />
        </div>
      ),
    },
    platforms: {
      label: 'Platform Performance',
      node: (
        <div className="space-y-2.5 md:space-y-3 print-break-before">
          <SectionHeader title="Platform Performance" />
          <PlatformComparison data={platformSummaries} />
        </div>
      ),
    },
    campaigns: {
      label: 'Campaign Performance',
      node: (
        <div className="space-y-2.5 md:space-y-3">
          <SectionHeader title="Campaign Performance" subtitle="Top campaigns ranked by spend across all platforms" />
          <CampaignPerformance />
        </div>
      ),
    },
    insights: insights.length > 0 ? {
      label: 'Key Issues & Insights',
      node: (
        <div className="space-y-2.5 md:space-y-3">
          <SectionHeader title="Key Issues & Insights" subtitle="Auto-detected from current performance" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
            {insights.slice(0, 6).map(a => <AlertCard key={a.id} alert={a} />)}
          </div>
        </div>
      ),
    } : null,
  };

  const visibleOrder = order.filter(id => sectionMap[id] != null);

  return (
    <div className="space-y-5 md:space-y-7">
      <SectionHeader
        title="Overview"
        showMobileDatePicker
        showFilters
        showPlatformsFilter
      />

      {error && (
        <div className="text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded-md px-3 py-2">
          Failed to load data: {error}
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-5 md:space-y-7">
            {visibleOrder.map(id => {
              const section = sectionMap[id]!;
              return (
                <SortableSection key={id} id={id} isEditing={isEditing} label={section.label}>
                  {section.node}
                </SortableSection>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
