import { useEffect, useMemo } from 'react';
import { PlatformKey, KPIGroupData } from '@/types/dashboard';
import { useDashboard } from '@/context/DashboardContext';
import { aggregateRows, normalizePlatform, pctChange, buildTimeSeries, buildCpaSeries } from '@/hooks/useDashboardDaily';
import { useConversionBreakdown } from '@/hooks/useConversionBreakdown';
import { CurrencySymbol, applyCurrencyToKPIGroups } from '@/lib/currency';
import { KPIGroupCard } from '@/components/dashboard/KPIGroupCard';
import { TrendChartCard } from '@/components/dashboard/TrendChartCard';
import { ConversionBreakdownCard } from '@/components/dashboard/ConversionBreakdownCard';
import { ConversionSplitCard } from '@/components/dashboard/ConversionSplitCard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { EmptyPlatformState } from '@/components/dashboard/EmptyPlatformState';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { EnhancedFunnelCard } from '@/components/dashboard/EnhancedFunnelCard';
import { PerformanceBreakdownCard } from '@/components/dashboard/PerformanceBreakdownCard';
import { generateInsights, sortInsights } from '@/lib/insights';
import { AlertTriangle } from 'lucide-react';
import { LoadingOverlay } from '@/components/layout/LoadingOverlay';

function formatCompact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

interface PlatformPageShellProps {
  platformKey: PlatformKey;
  title: string;
  /** Optional content rendered to the right of the title (e.g. sub-platform filter). */
  titleAction?: React.ReactNode;
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
  /** Optional row-level filter applied AFTER platform scoping (e.g. publisher_platform). */
  extraRowFilter?: (r: import('@/hooks/useDashboardDaily').DashboardDailyRow) => boolean;
}

/**
 * Shared shell for platform pages. Provides scoped data, KPIs, trends,
 * conversion split, conversion breakdown, and slots for bespoke sections.
 */
export function PlatformPageShell({
  platformKey, title, titleAction, emptyOnZeroSpend, buildKpiCards,
  topExtras, midExtras, bottomExtras,
  hideConversionBreakdown, warnOnWastedSpend, extraRowFilter,
}: PlatformPageShellProps) {
  const {
    client, data,
    selectedPlatforms, setSelectedPlatforms,
    selectedCampaigns, setSelectedCampaigns,
    selectedObjectives, setSelectedObjectives,
    selectedMarkets, setSelectedMarkets,
    selectedChannels, setSelectedChannels,
  } = useDashboard();
  const currency = client.currency;
  const { loading, error, rows, previousRows, range, platformSummaries } = data;

  // When landing on a platform page, clear any active filters that would hide
  // or restrict this platform's data — e.g. a Platforms filter excluding this
  // platform, or per-dimension selections (Markets/Channels/Campaigns/Objectives)
  // that were chosen on a different platform's page and don't apply here.
  const platformLabel = client.platforms?.[platformKey]?.label;
  useEffect(() => {
    if (platformLabel && selectedPlatforms.length > 0 && !selectedPlatforms.includes(platformLabel)) {
      setSelectedPlatforms([]);
    }
    if (selectedCampaigns.length > 0) {
      const allowed = new Set(data.campaignsByPlatform[platformKey] ?? []);
      const next = selectedCampaigns.filter(v => allowed.has(v));
      if (next.length !== selectedCampaigns.length) setSelectedCampaigns(next);
    }
    if (selectedObjectives.length > 0) {
      const allowed = new Set(data.objectivesByPlatform[platformKey] ?? []);
      const next = selectedObjectives.filter(v => allowed.has(v));
      if (next.length !== selectedObjectives.length) setSelectedObjectives(next);
    }
    if (selectedMarkets.length > 0) {
      const allowed = new Set(data.marketsByPlatform[platformKey] ?? []);
      const next = selectedMarkets.filter(v => allowed.has(v));
      if (next.length !== selectedMarkets.length) setSelectedMarkets(next);
    }
    if (selectedChannels.length > 0) {
      const allowed = new Set(data.channelsByPlatform[platformKey] ?? []);
      const next = selectedChannels.filter(v => allowed.has(v));
      if (next.length !== selectedChannels.length) setSelectedChannels(next);
    }
    // Re-evaluate when route/platform changes or when option lists become available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformKey, platformLabel, data.campaignsByPlatform, data.objectivesByPlatform, data.marketsByPlatform, data.channelsByPlatform]);

  const scoped     = useMemo(() => {
    const base = rows.filter(r => normalizePlatform(r.platform) === platformKey);
    return extraRowFilter ? base.filter(extraRowFilter) : base;
  }, [rows, platformKey, extraRowFilter]);
  const scopedPrev = useMemo(() => {
    const base = previousRows.filter(r => normalizePlatform(r.platform) === platformKey);
    return extraRowFilter ? base.filter(extraRowFilter) : base;
  }, [previousRows, platformKey, extraRowFilter]);

  const baseTotals     = useMemo(() => aggregateRows(scoped, 'all'), [scoped]);
  const basePrevTotals = useMemo(() => scopedPrev.length ? aggregateRows(scopedPrev, 'all') : null, [scopedPrev]);

  // Source the lower-funnel conversion total from the same RPC that powers the
  // Conversion Breakdown card so the KPI value stays in lockstep with what's listed there.
  const breakdownCur = useConversionBreakdown({ start: range.start, end: range.end, platform: platformKey });
  const prevRange = useMemo(() => {
    if (!scopedPrev.length) return null;
    const dates = scopedPrev.map(r => r.date).sort();
    return { start: new Date(dates[0]), end: new Date(dates[dates.length - 1]) };
  }, [scopedPrev]);
  const breakdownPrev = useConversionBreakdown({
    start: prevRange?.start ?? range.start,
    end: prevRange?.end ?? range.end,
    platform: platformKey,
  });

  const sumLowerFunnel = (rs: { conversion_funnel_group: string; conversions_all: number }[]) =>
    rs.reduce((sum, r) =>
      (r.conversion_funnel_group || '').toLowerCase().includes('lower')
        ? sum + (+r.conversions_all || 0)
        : sum, 0);

  const lfBreakdownTotal     = useMemo(() => sumLowerFunnel(breakdownCur.rows), [breakdownCur.rows]);
  const lfBreakdownTotalPrev = useMemo(() => prevRange ? sumLowerFunnel(breakdownPrev.rows) : 0, [breakdownPrev.rows, prevRange]);

  /** Override lower-funnel-derived metrics on a totals object using the breakdown total. */
  const withBreakdownLF = (t: ReturnType<typeof aggregateRows>, lfConv: number) => ({
    ...t,
    conversionsLowerFunnel: lfConv,
    cpaLowerFunnel: t.spend > 0 && lfConv > 0 ? t.spend / lfConv : 0,
    cvrLowerFunnel: t.landingPageViews > 0 ? (lfConv / t.landingPageViews) * 100 : 0,
    conversionRateLowerFunnel: t.clicks > 0 ? (lfConv / t.clicks) * 100 : 0,
  });

  const totals     = useMemo(() => withBreakdownLF(baseTotals, lfBreakdownTotal), [baseTotals, lfBreakdownTotal]);
  const prevTotals = useMemo(
    () => basePrevTotals ? withBreakdownLF(basePrevTotals, lfBreakdownTotalPrev) : null,
    [basePrevTotals, lfBreakdownTotalPrev]
  );

  const spendSeries  = useMemo(() => buildTimeSeries(scoped, r => +r.cost || 0), [scoped]);
  const lfConvSeries = useMemo(() => buildTimeSeries(scoped, r => +r.conversions_lower_funnel || 0), [scoped]);
  const lfCpaSeries  = useMemo(() => buildCpaSeries(scoped, 'lower_funnel'), [scoped]);
  const ctrSeries    = useMemo(() => buildTimeSeries(scoped, r => +r.clicks || 0).map((p, i, arr) => p), [scoped]);

  const wastedSpend = warnOnWastedSpend && totals.spend >= 1000 && totals.conversionsLowerFunnel === 0;

  // Empty state for inactive platforms (X / LinkedIn).
  // Only show when there is genuinely no activity at all — some platforms (e.g. X organic/earned)
  // report impressions, reach, and clicks without paid spend, and we still want to display them.
  const hasAnyActivity = totals.spend > 0 || totals.impressions > 0 || totals.clicks > 0 || totals.reach > 0;
  if (emptyOnZeroSpend && !loading && !error && !hasAnyActivity) {
    return <EmptyPlatformState title={title} spend={totals.spend} impressions={totals.impressions} clicks={totals.clicks} />;
  }

  const hasConversions = (totals.conversionsLowerFunnel + totals.conversionsUpperFunnel + totals.conversionsAll) > 0;
  const hasLPV = totals.landingPageViews > 0;
  const hasReach = totals.reach > 0;
  const hasVideo = totals.videoViews > 0;

  const rawCards = buildKpiCards(totals, prevTotals, currency).filter(c => {
    const t = c.title.toLowerCase();
    if (!hasConversions && t.includes('conversion')) return false;
    if (!hasLPV && t.includes('landing page')) return false;
    if (!hasReach && t === 'reach') return false;
    if (!hasVideo && (t.includes('video'))) return false;
    return true;
  });

  // Inject Budget & Pacing into the Spend card based on platform settings + active date range.
  const platformCfg = client.platforms?.[platformKey];
  const cardsWithPacing = (() => {
    if (!platformCfg || !platformCfg.budget || platformCfg.budget <= 0) return rawCards;

    const rangeDays = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / 86400000) + 1);
    const budgetForRange = (() => {
      switch (platformCfg.budgetType) {
        case 'annual':  return platformCfg.budget * (rangeDays / 365);
        case 'monthly': return platformCfg.budget * (rangeDays / 30);
        case 'campaign':
        case 'custom':
        default:        return platformCfg.budget;
      }
    })();
    const pacing = budgetForRange > 0 ? (totals.spend / budgetForRange) * 100 : 0;
    const budgetTypeLabel = platformCfg.budgetType === 'annual'
      ? 'Annual Budget'
      : platformCfg.budgetType === 'monthly'
      ? 'Monthly Budget'
      : 'Budget';

    return rawCards.map(c => {
      if (c.title.toLowerCase() !== 'spend') return c;
      const supporting = [
        {
          label: budgetTypeLabel,
          formattedValue: moneyKpi(platformCfg.budget, currency, 0),
        },
        {
          label: `Pacing${platformCfg.budgetType === 'annual' || platformCfg.budgetType === 'monthly' ? ' (period)' : ''}`,
          formattedValue: budgetForRange > 0 ? `${pacing.toFixed(0)}%` : '—',
        },
        ...(c.supporting ?? []),
      ];
      return { ...c, supporting };
    });
  })();

  const kpiCards = applyCurrencyToKPIGroups(cardsWithPacing, currency, 26);

  return (
    <div className="space-y-6 md:space-y-8">
      <SectionHeader title={title} action={titleAction} showMobileDatePicker showFilters scopeToPlatform={platformKey} actionBelow />

      {error && (
        <div className="text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded-md px-3 py-2">
          Failed to load data: {error}
        </div>
      )}
      {loading && <LoadingOverlay fixed message={`Loading ${title} data…`} />}

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

      {/* KPIs — single column on mobile, 3-col on desktop (matches Overview) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-4">
        {kpiCards.map((g, i) => <KPIGroupCard key={i} data={g} />)}
      </div>

      {topExtras}

      {/* Trends */}
      <div className="space-y-3 md:space-y-4 print-break-before">
        <SectionHeader title="Trends" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <TrendChartCard title="Spend"                    data={spendSeries}  currency={currency} color="hsl(var(--chart-1))" />
          {hasConversions && (
            <TrendChartCard title="Lower-Funnel Conversions" data={lfConvSeries}                       color="hsl(var(--chart-3))" />
          )}
          {hasConversions && (
            <TrendChartCard title="CPA (Lower Funnel)"       data={lfCpaSeries}                       color="hsl(var(--chart-2))" />
          )}
          <TrendChartCard title="Clicks"                   data={ctrSeries}                          color="hsl(var(--chart-2))" />
        </div>
      </div>

      {/* Breakdowns by Market / Channel / Objective (parsed from campaign names) */}
      {scoped.length > 0 && (
        <div className="print-break-before">
          <BreakdownDimensionCard rows={scoped} platformKey={platformKey} />
        </div>
      )}

      {midExtras?.({ totals })}

      {/* Campaign Performance — moved above Conversion Mix / Funnel */}
      {scoped.length > 0 && (
        <div className="space-y-2.5 md:space-y-3 print-break-before">
          <SectionHeader title="Campaign Performance" subtitle="Top campaigns ranked by spend" />
          <CampaignPerformance platformFilter={platformKey} hidePlatformColumn />
        </div>
      )}

      {/* Conversion Mix + Funnel — side by side on desktop */}
      {(hasConversions || totals.impressions > 0 || totals.clicks > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-stretch">
          {hasConversions && (
            <ConversionSplitCard
              platform={platformKey}
              start={range.start}
              end={range.end}
              fallbackLowerFunnel={totals.conversionsLowerFunnel}
              fallbackUpperFunnel={totals.conversionsUpperFunnel}
              className="h-full"
            />
          )}
          {(totals.impressions > 0 || totals.clicks > 0) && (
            <EnhancedFunnelCard
              steps={[
                { label: 'Impressions', value: totals.impressions, formattedValue: formatCompact(totals.impressions) },
                { label: 'Clicks',      value: totals.clicks,      formattedValue: formatCompact(totals.clicks),
                  rateFromPrev: totals.ctr, rateLabel: 'CTR' },
                ...(hasLPV ? [{ label: 'Landing Page Views', value: totals.landingPageViews, formattedValue: formatCompact(totals.landingPageViews),
                  rateFromPrev: totals.lpvRate, rateLabel: 'LPV Rate' }] : []),
                { label: 'Lower-Funnel Conversions', value: totals.conversionsLowerFunnel,
                  formattedValue: formatCompact(totals.conversionsLowerFunnel),
                  rateFromPrev: totals.cvrLowerFunnel, rateLabel: 'CVR (LF)' },
              ].filter(s => s.value > 0 || s.label === 'Lower-Funnel Conversions')}
              className="h-full"
            />
          )}
        </div>
      )}

      {!hideConversionBreakdown && hasConversions && (
        <div className="space-y-3 md:space-y-4">
          <SectionHeader title="Conversion Breakdown" />
          <ConversionBreakdownCard
            platform={platformKey}
            start={range.start}
            end={range.end}
            sourceRows={scoped}
          />
        </div>
      )}

      {bottomExtras}

      {/* Insights — bottom of page */}
      <PlatformInsights platformKey={platformKey} totals={totals} prevTotals={prevTotals} platformSummaries={platformSummaries} />
    </div>
  );
}

function PlatformInsights({ platformKey, totals, prevTotals, platformSummaries }: {
  platformKey: PlatformKey;
  totals: ReturnType<typeof aggregateRows>;
  prevTotals: ReturnType<typeof aggregateRows> | null;
  platformSummaries: ReturnType<typeof useDashboard>['data']['platformSummaries'];
}) {
  const insights = useMemo(() => {
    const scoped = platformSummaries.filter(p => p.platform === platformKey);
    const label = scoped[0]?.label;
    const raw = sortInsights(generateInsights({
      totals: totals as any,
      previousTotals: prevTotals as any,
      platforms: scoped,
    }));
    // Strip the "<Platform>: " prefix from titles since context is implicit on a platform page.
    if (!label) return raw;
    const prefix = `${label}: `;
    return raw.map(a => a.title.startsWith(prefix)
      ? { ...a, title: a.title.slice(prefix.length).replace(/^./, c => c.toUpperCase()) }
      : a
    );
  }, [platformKey, totals, prevTotals, platformSummaries]);

  if (!insights.length) return null;

  return (
    <div className="space-y-2.5 md:space-y-3">
      <SectionHeader title="Key Issues & Insights" subtitle="Auto-detected from current performance" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
        {insights.slice(0, 6).map(a => <AlertCard key={a.id} alert={a} />)}
      </div>
    </div>
  );
}

/** Helper to build a currency-aware KPI value with the symbol and thousand separators. */
export function moneyKpi(amount: number, currency: string, decimals = 2) {
  const formatted = amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{formatted}</span>;
}

export { formatCompact };
