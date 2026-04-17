import { useMemo } from 'react';
import { PlatformKey, KPIGroupData } from '@/types/dashboard';
import { useDashboard } from '@/context/DashboardContext';
import { aggregateRows, normalizePlatform, pctChange, buildTimeSeries, buildCpaSeries } from '@/hooks/useDashboardDaily';
import { CurrencySymbol, applyCurrencyToKPIGroups } from '@/lib/currency';
import { KPIGroupCard } from '@/components/dashboard/KPIGroupCard';
import { TrendChartCard } from '@/components/dashboard/TrendChartCard';
import { ConversionBreakdownCard } from '@/components/dashboard/ConversionBreakdownCard';
import { ConversionSplitCard } from '@/components/dashboard/ConversionSplitCard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { EmptyPlatformState } from '@/components/dashboard/EmptyPlatformState';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

function formatCompact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

interface PlatformPageShellProps {
  platformKey: PlatformKey;
  title: string;
  /** When true, render the full-empty state on zero spend. */
  emptyOnZeroSpend?: boolean;
  /** Build the KPI cards for this platform from its scoped totals. */
  buildKpiCards: (cur: ReturnType<typeof aggregateRows>, prev: ReturnType<typeof aggregateRows> | null, currency: string) => KPIGroupData[];
  /** Sections rendered between KPIs and Trends. */
  topExtras?: React.ReactNode;
  /** Sections rendered after Trends, before Conversion Breakdown. */
  midExtras?: (ctx: { totals: ReturnType<typeof aggregateRows> }) => React.ReactNode;
  /** Sections rendered after Conversion Breakdown. */
  bottomExtras?: React.ReactNode;
  /** If true, hide the conversion breakdown table. */
  hideConversionBreakdown?: boolean;
  /** If true, show wasted-spend warning when applicable. */
  warnOnWastedSpend?: boolean;
}

/**
 * Shared shell for platform pages. Provides scoped data, KPIs, trends,
 * conversion split, conversion breakdown, and slots for bespoke sections.
 */
export function PlatformPageShell({
  platformKey, title, emptyOnZeroSpend, buildKpiCards,
  topExtras, midExtras, bottomExtras,
  hideConversionBreakdown, warnOnWastedSpend,
}: PlatformPageShellProps) {
  const { client, data } = useDashboard();
  const currency = client.currency;
  const { loading, error, rows, previousRows, range } = data;

  const scoped     = useMemo(() => rows.filter(r => normalizePlatform(r.platform) === platformKey), [rows, platformKey]);
  const scopedPrev = useMemo(() => previousRows.filter(r => normalizePlatform(r.platform) === platformKey), [previousRows, platformKey]);

  const totals     = useMemo(() => aggregateRows(scoped, 'all'), [scoped]);
  const prevTotals = useMemo(() => scopedPrev.length ? aggregateRows(scopedPrev, 'all') : null, [scopedPrev]);

  const spendSeries  = useMemo(() => buildTimeSeries(scoped, r => +r.cost || 0), [scoped]);
  const lfConvSeries = useMemo(() => buildTimeSeries(scoped, r => +r.conversions_lower_funnel || 0), [scoped]);
  const lfCpaSeries  = useMemo(() => buildCpaSeries(scoped, 'lower_funnel'), [scoped]);
  const ctrSeries    = useMemo(() => buildTimeSeries(scoped, r => +r.clicks || 0).map((p, i, arr) => p), [scoped]);

  const wastedSpend = warnOnWastedSpend && totals.spend >= 1000 && totals.conversionsLowerFunnel === 0;

  // Empty state for inactive platforms (X / LinkedIn).
  if (emptyOnZeroSpend && !loading && !error && totals.spend === 0) {
    return <EmptyPlatformState title={title} spend={totals.spend} impressions={totals.impressions} clicks={totals.clicks} />;
  }

  const kpiCards = applyCurrencyToKPIGroups(buildKpiCards(totals, prevTotals, currency), currency, 26);

  return (
    <div className="space-y-6 md:space-y-8">
      <SectionHeader title={title} subtitle="Platform-level performance with all conversion layers visible." />

      {error && (
        <div className="text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded-md px-3 py-2">
          Failed to load data: {error}
        </div>
      )}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading {title} data…
        </div>
      )}

      {wastedSpend && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/[0.04] p-5 flex gap-3">
          <AlertTriangle className="text-destructive shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-semibold text-card-foreground text-sm">Significant spend with no lower-funnel conversion output</p>
            <p className="text-xs text-muted-foreground mt-1">
              {title} spent <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{Math.round(totals.spend).toLocaleString()}</span> with zero lower-funnel actions in this period. Performance may be awareness-led, or tracking may need review.
            </p>
          </div>
        </div>
      )}

      {/* KPIs — 3-col grid matches the Overview layout (Impressions+CPM together, Reach+Frequency together, etc.) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-4">
        {kpiCards.map((g, i) => <KPIGroupCard key={i} data={g} />)}
      </div>

      {topExtras}

      {/* Conversion split */}
      <ConversionSplitCard
        lowerFunnel={totals.conversionsLowerFunnel}
        upperFunnel={totals.conversionsUpperFunnel}
      />

      {/* Trends */}
      <div className="space-y-3 md:space-y-4 print-break-before">
        <SectionHeader title="Trends" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <TrendChartCard title="Spend"                    data={spendSeries}  currency={currency} color="hsl(var(--chart-1))" />
          <TrendChartCard title="Lower-Funnel Conversions" data={lfConvSeries}                       color="hsl(var(--chart-3))" />
          <TrendChartCard title="CPA (Lower Funnel)"       data={lfCpaSeries}  currency={currency} color="hsl(var(--chart-4))" />
          <TrendChartCard title="Clicks"                   data={ctrSeries}                          color="hsl(var(--chart-2))" />
        </div>
      </div>

      {midExtras?.({ totals })}

      {!hideConversionBreakdown && (
        <div className="space-y-3 md:space-y-4">
          <SectionHeader title="Conversion Breakdown" subtitle="Grouped by tracked conversion event and funnel stage." />
          <ConversionBreakdownCard platform={platformKey} start={range.start} end={range.end} />
        </div>
      )}

      {bottomExtras}
    </div>
  );
}

/** Helper to build a USD KPI value with the symbol. */
export function moneyKpi(amount: number, currency: string, decimals = 2) {
  return <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{amount.toFixed(decimals)}</span>;
}

export { formatCompact };
