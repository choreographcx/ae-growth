import { KPIGroupCard } from '@/components/dashboard/KPIGroupCard';
import { TrendChartCard } from '@/components/dashboard/TrendChartCard';
import { PerformanceBreakdown } from '@/components/dashboard/PerformanceBreakdown';
import { PlatformContributionCard } from '@/components/dashboard/PlatformContributionCard';
import { EnhancedFunnelCard } from '@/components/dashboard/EnhancedFunnelCard';
import { ConversionSplitCard } from '@/components/dashboard/ConversionSplitCard';
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
import { useConversionBreakdown } from '@/hooks/useConversionBreakdown';
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
  'contribution',
  'trends',
  'breakdowns',
  'performance',
  'funnel',
  'conversionBreakdown',
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
  // Source the lower-funnel total from the same RPC that powers the Conversion
  // Breakdown card so the KPI value stays in lockstep with what's listed there.
  const breakdownCur = useConversionBreakdown({ start: data.range.start, end: data.range.end });
  const prevRange = useMemo(() => {
    if (!previousRows.length) return null;
    const dates = previousRows.map(r => r.date).sort();
    return { start: new Date(dates[0]), end: new Date(dates[dates.length - 1]) };
  }, [previousRows]);
  const breakdownPrev = useConversionBreakdown({
    start: prevRange?.start ?? data.range.start,
    end: prevRange?.end ?? data.range.end,
  });

  /** Sum lower-funnel rows from the breakdown RPC (matches Conversion Breakdown card). */
  const sumLowerFunnel = (rows: { conversion_funnel_group: string; conversions_all: number }[]) =>
    rows.reduce((sum, r) =>
      (r.conversion_funnel_group || '').toLowerCase().includes('lower')
        ? sum + (+r.conversions_all || 0)
        : sum, 0);

  const lfBreakdownTotal = useMemo(() => sumLowerFunnel(breakdownCur.rows), [breakdownCur.rows]);
  const lfBreakdownTotalPrev = useMemo(
    () => prevRange ? sumLowerFunnel(breakdownPrev.rows) : 0,
    [breakdownPrev.rows, prevRange]
  );

  // Use the breakdown total as the conversion count, but keep spend/clicks/LPV
  // from the daily aggregate to compute CPA / CVR / etc.
  const lfBase = useMemo(() => aggregateRows(rows, 'lower_funnel'), [rows]);
  const lfBasePrev = useMemo(() => previousRows.length ? aggregateRows(previousRows, 'lower_funnel') : null, [previousRows]);
  const lf = useMemo(() => {
    const conv = lfBreakdownTotal;
    return {
      ...lfBase,
      conversions: conv,
      conversionsLowerFunnel: conv,
      cpaLowerFunnel: lfBase.spend > 0 && conv > 0 ? lfBase.spend / conv : 0,
      cvrLowerFunnel: lfBase.landingPageViews > 0 ? (conv / lfBase.landingPageViews) * 100 : 0,
      conversionRateLowerFunnel: lfBase.clicks > 0 ? (conv / lfBase.clicks) * 100 : 0,
    };
  }, [lfBase, lfBreakdownTotal]);
  const lfPrev = useMemo(() => {
    if (!lfBasePrev) return null;
    const conv = lfBreakdownTotalPrev;
    return {
      ...lfBasePrev,
      conversions: conv,
      conversionsLowerFunnel: conv,
      cpaLowerFunnel: lfBasePrev.spend > 0 && conv > 0 ? lfBasePrev.spend / conv : 0,
      cvrLowerFunnel: lfBasePrev.landingPageViews > 0 ? (conv / lfBasePrev.landingPageViews) * 100 : 0,
    };
  }, [lfBasePrev, lfBreakdownTotalPrev]);

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
          <Ga4OverviewTile />
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
    trends: {
      label: 'Trends',
      node: (
        <div className="space-y-2.5 md:space-y-3 print-break-before">
          <SectionHeader title="Trends" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
            <TrendChartCard title="Spend"                       data={spendSeries}    currency={currency} color="hsl(var(--chart-1))" />
            <TrendChartCard title="Lower-Funnel Conversions"    data={lfConvSeries}                          color="hsl(var(--chart-3))" />
            <TrendChartCard title="CPA (Lower Funnel)"          data={lfCpaSeries}                        color="hsl(var(--chart-2))" />
            <TrendChartCard title="CTR"                         data={ctrSeries}      valueSuffix="%"     color="hsl(var(--chart-2))" />
          </div>
        </div>
      ),
    },
    funnel: {
      label: 'Conversion Mix & Funnel',
      node: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-stretch">
          {(totals.conversionsLowerFunnel + totals.conversionsUpperFunnel) > 0 && (
            <ConversionSplitCard
              lowerFunnel={totals.conversionsLowerFunnel}
              upperFunnel={totals.conversionsUpperFunnel}
              className="h-full"
            />
          )}
          <EnhancedFunnelCard steps={funnelSteps} className="h-full" />
        </div>
      ),
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
    performance: {
      label: 'Performance Breakdown',
      node: <PerformanceBreakdown platforms={platformSummaries} />,
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
