import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, subYears, endOfYear, differenceInCalendarDays, parse, isValid } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { PlatformKey, PlatformSummary, TimeSeriesPoint } from '@/types/dashboard';
import { parseCampaignName, UNKNOWN } from '@/lib/campaignNaming';

export type ConversionMode = 'all' | 'lower_funnel';

export interface DashboardDailyRow {
  date: string;
  platform: string;
  /** Sub-platform (e.g. "facebook" / "instagram" for Meta). May be empty. */
  publisher_platform?: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  /** Optional dimensions for breakdowns. */
  campaign_type?: string | null;
  campaign_objective?: string | null;
  audience_type?: string | null;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversions_all: number;
  conversions_lower_funnel: number;
  conversions_upper_funnel: number;
  conversion_value: number;
  reach: number;
  /** Platform-reported frequency (impressions / unique users), as returned by the source platform. */
  frequency?: number | null;
  landing_page_views: number;
  outbound_clicks?: number;
  video_views: number;
  video_p100?: number;
}

export interface DashboardTotals {
  spend: number;
  impressions: number;
  clicks: number;
  /** Conversions value selected by the active conversion mode. */
  conversions: number;
  conversionsAll: number;
  conversionsLowerFunnel: number;
  conversionsUpperFunnel: number;
  conversionValue: number;
  reach: number;
  landingPageViews: number;
  outboundClicks: number;
  videoViews: number;
  videoP100: number;
  // Derived rates (recomputed from sums, never averaged)
  ctr: number;
  cpc: number;
  cpa: number;
  cpaAll: number;
  cpaLowerFunnel: number;
  cpm: number;
  /**
   * Average frequency reported by the source platforms (impression-weighted),
   * NOT computed locally. Falls back to 0 when no rows report a frequency.
   */
  frequency: number;
  conversionRate: number;
  conversionRateLowerFunnel: number;
  costPerLPV: number;
  lpvRate: number;
  cvrLowerFunnel: number;
  roas: number;
  outboundCtr: number;
  costPerVideoView: number;
  videoCompletionRate: number;
}

interface DateBounds { start: Date; end: Date }

function resolveDateRange(label: string): DateBounds {
  const today = new Date();
  switch (label) {
    case 'Last 7 Days':   return { start: subDays(today, 7),  end: today };
    case 'Last 14 Days':  return { start: subDays(today, 14), end: today };
    case 'Last 30 Days':  return { start: subDays(today, 30), end: today };
    case 'Last 90 Days':  return { start: subDays(today, 90), end: today };
    case 'This Month':    return { start: startOfMonth(today), end: today };
    case 'Last Month':    return { start: startOfMonth(subMonths(today, 1)), end: endOfMonth(subMonths(today, 1)) };
    case 'This Year':     return { start: startOfYear(today), end: today };
    case 'Last Year':     return { start: startOfYear(subYears(today, 1)), end: endOfYear(subYears(today, 1)) };
  }
  const parts = label.split('–').map(s => s.trim());
  if (parts.length === 2) {
    const yearMatch = parts[1].match(/(\d{4})$/);
    const year = yearMatch ? +yearMatch[1] : today.getFullYear();
    const from = parse(`${parts[0]} ${year}`, 'MMM d yyyy', new Date());
    const toClean = parts[1].replace(/,?\s*\d{4}$/, '');
    const to = parse(`${toClean} ${year}`, 'MMM d yyyy', new Date());
    if (isValid(from) && isValid(to)) return { start: from, end: to };
  }
  return { start: subDays(today, 30), end: today };
}

export function normalizePlatform(raw: string): PlatformKey | null {
  const k = (raw || '').toLowerCase().replace(/[\s_-]/g, '');
  if (k.includes('meta') || k.includes('facebook') || k.includes('instagram')) return 'meta';
  if (k.includes('google')) return 'google';
  if (k.includes('tiktok')) return 'tiktok';
  if (k.includes('snap')) return 'snapchat';
  if (k === 'x' || k.includes('xads') || k.includes('twitter')) return 'x';
  if (k.includes('linkedin')) return 'linkedin';
  if (k.includes('programmatic') || k.includes('dv360') || k.includes('display')) return 'programmatic';
  return null;
}

const PLATFORM_LABELS: Record<PlatformKey, string> = {
  meta: 'Meta', google: 'Google Ads', tiktok: 'TikTok', snapchat: 'Snapchat',
  x: 'X', linkedin: 'LinkedIn', programmatic: 'Programmatic',
};

function safeDiv(n: number, d: number) { return d > 0 ? n / d : 0; }

/** Return the conversion count for a row under the chosen mode. */
export function pickConversions(r: DashboardDailyRow, mode: ConversionMode): number {
  if (mode === 'lower_funnel') {
    const v = +r.conversions_lower_funnel;
    if (v > 0) return v;
    return +r.conversions || 0;
  }
  const v = +r.conversions_all;
  if (v > 0) return v;
  return +r.conversions || 0;
}

function aggregate(rows: DashboardDailyRow[], mode: ConversionMode = 'all'): DashboardTotals {
  // Frequency accumulators: only include rows that have BOTH impressions and reach > 0.
  // Frequency is then derived as (sum impressions with reach) / (sum reach).
  let freqImpressionsWithReach = 0;
  let freqReach = 0;

  const t = rows.reduce((a, r) => {
    const imps = +r.impressions || 0;
    const rch = +r.reach || 0;
    a.spend += +r.cost || 0;
    a.impressions += imps;
    a.clicks += +r.clicks || 0;
    a.conversionsAll += +r.conversions_all || +r.conversions || 0;
    a.conversionsLowerFunnel += +r.conversions_lower_funnel || 0;
    a.conversionsUpperFunnel += +r.conversions_upper_funnel || 0;
    a.conversionValue += +r.conversion_value || 0;
    a.reach += rch;
    a.landingPageViews += +r.landing_page_views || 0;
    a.outboundClicks += +r.outbound_clicks || 0;
    a.videoViews += +r.video_views || 0;
    a.videoP100 += +r.video_p100 || 0;
    if (imps > 0 && rch > 0) {
      freqImpressionsWithReach += imps;
      freqReach += rch;
    }
    return a;
  }, {
    spend: 0, impressions: 0, clicks: 0,
    conversionsAll: 0, conversionsLowerFunnel: 0, conversionsUpperFunnel: 0,
    conversionValue: 0, reach: 0, landingPageViews: 0,
    outboundClicks: 0, videoViews: 0, videoP100: 0,
  });

  const conversions = mode === 'lower_funnel'
    ? (t.conversionsLowerFunnel > 0 ? t.conversionsLowerFunnel : t.conversionsAll)
    : t.conversionsAll;

  // Frequency = total impressions (from rows with reach) / total reach (from same rows).
  // Rows with impressions but no reach are excluded from BOTH sides of the calculation.
  const frequency = freqReach > 0 ? freqImpressionsWithReach / freqReach : 0;

  return {
    ...t,
    conversions,
    ctr: safeDiv(t.clicks, t.impressions) * 100,
    cpc: safeDiv(t.spend, t.clicks),
    cpa: safeDiv(t.spend, conversions),
    cpaAll: safeDiv(t.spend, t.conversionsAll),
    cpaLowerFunnel: safeDiv(t.spend, t.conversionsLowerFunnel),
    cpm: safeDiv(t.spend, t.impressions) * 1000,
    frequency,
    conversionRate: safeDiv(conversions, t.clicks) * 100,
    conversionRateLowerFunnel: safeDiv(t.conversionsLowerFunnel, t.clicks) * 100,
    costPerLPV: safeDiv(t.spend, t.landingPageViews),
    lpvRate: safeDiv(t.landingPageViews, t.clicks) * 100,
    cvrLowerFunnel: safeDiv(t.conversionsLowerFunnel, t.landingPageViews) * 100,
    roas: safeDiv(t.conversionValue, t.spend),
    outboundCtr: safeDiv(t.outboundClicks, t.impressions) * 100,
    costPerVideoView: safeDiv(t.spend, t.videoViews),
    videoCompletionRate: safeDiv(t.videoP100, t.videoViews) * 100,
  };
}

function buildPlatformSummaries(rows: DashboardDailyRow[], mode: ConversionMode): PlatformSummary[] {
  const totals = aggregate(rows, mode);
  const byPlatform = new Map<PlatformKey, DashboardDailyRow[]>();
  for (const r of rows) {
    const p = normalizePlatform(r.platform);
    if (!p) continue;
    if (!byPlatform.has(p)) byPlatform.set(p, []);
    byPlatform.get(p)!.push(r);
  }
  const summaries: PlatformSummary[] = [];
  byPlatform.forEach((rs, platform) => {
    const a = aggregate(rs, mode);
    summaries.push({
      platform,
      label: PLATFORM_LABELS[platform],
      spend: a.spend,
      impressions: a.impressions,
      clicks: a.clicks,
      ctr: a.ctr,
      cpc: a.cpc,
      conversions: a.conversions,
      cpa: a.cpa,
      conversionRate: a.conversionRate,
      shareOfSpend: safeDiv(a.spend, totals.spend) * 100,
      shareOfConversions: safeDiv(a.conversions, totals.conversions) * 100,
      roas: a.roas,
      conversionsAll: a.conversionsAll,
      conversionsLowerFunnel: a.conversionsLowerFunnel,
    });
  });
  return summaries.sort((x, y) => y.spend - x.spend);
}

function buildTimeSeries(rows: DashboardDailyRow[], picker: (r: DashboardDailyRow) => number): TimeSeriesPoint[] {
  const byDate = new Map<string, number>();
  for (const r of rows) byDate.set(r.date, (byDate.get(r.date) || 0) + (picker(r) || 0));
  return Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
}

function buildCpaSeries(rows: DashboardDailyRow[], mode: ConversionMode = 'all'): TimeSeriesPoint[] {
  const byDate = new Map<string, { spend: number; conv: number }>();
  for (const r of rows) {
    const cur = byDate.get(r.date) || { spend: 0, conv: 0 };
    cur.spend += +r.cost || 0;
    cur.conv += pickConversions(r, mode);
    byDate.set(r.date, cur);
  }
  return Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { spend, conv }]) => ({ date, value: conv > 0 ? +(spend / conv).toFixed(2) : 0 }));
}

function buildCtrSeries(rows: DashboardDailyRow[]): TimeSeriesPoint[] {
  const byDate = new Map<string, { clicks: number; imps: number }>();
  for (const r of rows) {
    const cur = byDate.get(r.date) || { clicks: 0, imps: 0 };
    cur.clicks += +r.clicks || 0; cur.imps += +r.impressions || 0;
    byDate.set(r.date, cur);
  }
  return Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { clicks, imps }]) => ({ date, value: imps > 0 ? +((clicks / imps) * 100).toFixed(2) : 0 }));
}

function buildRoasSeries(rows: DashboardDailyRow[]): TimeSeriesPoint[] {
  const byDate = new Map<string, { spend: number; value: number }>();
  for (const r of rows) {
    const cur = byDate.get(r.date) || { spend: 0, value: 0 };
    cur.spend += +r.cost || 0; cur.value += +r.conversion_value || 0;
    byDate.set(r.date, cur);
  }
  return Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { spend, value }]) => ({ date, value: spend > 0 ? +(value / spend).toFixed(2) : 0 }));
}


export interface PlatformOption { key: PlatformKey; label: string; raw: string; }

export interface UseDashboardDailyOptions {
  selectedPlatformLabels?: string[];
  selectedCampaigns?: string[];
  selectedObjectives?: string[];
  selectedMarkets?: string[];
  selectedChannels?: string[];
  /**
   * Optional per-platform multiplier applied to USD `cost` and `conversion_value`
   * before any aggregation. Keys are the normalized PlatformKey (e.g. `meta`).
   * When omitted or 1, no conversion is applied for that platform.
   */
  costMultiplierByPlatform?: Partial<Record<PlatformKey, number>>;
  /**
   * Per-platform list of case-insensitive substrings. Any row whose
   * `campaign_name` contains one of its platform's tokens is dropped from
   * every aggregation, table and chart. Configured in Admin → Platform →
   * Excluded Campaign Filter.
   */
  excludedCampaignTokensByPlatform?: Partial<Record<PlatformKey, string[]>>;
}

interface UseDashboardDailyResult {
  loading: boolean;
  error: string | null;
  rows: DashboardDailyRow[];
  previousRows: DashboardDailyRow[];
  totals: DashboardTotals;
  previousTotals: DashboardTotals | null;
  platformSummaries: PlatformSummary[];
  spendSeries: TimeSeriesPoint[];
  conversionsSeries: TimeSeriesPoint[];
  cpaSeries: TimeSeriesPoint[];
  ctrSeries: TimeSeriesPoint[];
  range: DateBounds;
  availablePlatforms: PlatformOption[];
  availableCampaigns: string[];
  /** Campaign names grouped by normalized platform key (used to scope the campaign filter on platform pages). */
  campaignsByPlatform: Partial<Record<PlatformKey, string[]>>;
  /** Distinct campaign objectives present in the data (after platform scoping). */
  availableObjectives: string[];
  /** Objectives grouped by normalized platform key (used to scope the objective filter on platform pages). */
  objectivesByPlatform: Partial<Record<PlatformKey, string[]>>;
  /** Distinct markets parsed from campaign names. */
  availableMarkets: string[];
  /** Markets grouped by normalized platform key. */
  marketsByPlatform: Partial<Record<PlatformKey, string[]>>;
  /** Distinct channels parsed from campaign names. */
  availableChannels: string[];
  /** Channels grouped by normalized platform key. */
  channelsByPlatform: Partial<Record<PlatformKey, string[]>>;
}

export {
  aggregate as aggregateRows,
  buildTimeSeries, buildCpaSeries, buildCtrSeries, buildRoasSeries,
};

/**
 * Fetch the full unfiltered range from BigQuery via the supabase RPC.
 * Cached & deduped by react-query keyed on the date range.
 */
/**
 * Fetch the unfiltered range directly from the AESA wrapper view
 * `public.dashboard_daily`. The underlying BigQuery FDW requires a date
 * partition filter on EVERY query, so `.gte('date', start)` and
 * `.lte('date', end)` are mandatory and intentionally non-optional.
 */
async function fetchDashboardRange(start: Date, end: Date): Promise<DashboardDailyRow[]> {
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  const startDate = fmt(start);
  const endDate = fmt(end);
  // Page through the view to bypass the default 1000-row PostgREST limit
  // without hardcoding a ceiling we can outgrow.
  const PAGE = 1000;
  const out: DashboardDailyRow[] = [];
  let from = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await (supabase as any)
      .from('dashboard_daily')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data as DashboardDailyRow[]) || [];
    out.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

export function useDashboardDaily(
  dateRangeLabel: string,
  options: UseDashboardDailyOptions = {}
): UseDashboardDailyResult {
  const {
    selectedPlatformLabels = [],
    selectedCampaigns = [],
    selectedObjectives = [],
    selectedMarkets = [],
    selectedChannels = [],
    costMultiplierByPlatform,
    excludedCampaignTokensByPlatform,
  } = options;
  // Stable hash of the multiplier map so memo deps don't churn on every render.
  const multiplierKey = useMemo(
    () => costMultiplierByPlatform
      ? Object.entries(costMultiplierByPlatform).map(([k, v]) => `${k}:${v}`).sort().join('|')
      : '',
    [costMultiplierByPlatform]
  );
  // Stable hash of the per-platform exclusion-token map.
  const exclusionKey = useMemo(
    () => excludedCampaignTokensByPlatform
      ? Object.entries(excludedCampaignTokensByPlatform).map(([k, v]) => `${k}:${(v || []).join(',')}`).sort().join('|')
      : '',
    [excludedCampaignTokensByPlatform]
  );
  const range = useMemo(() => resolveDateRange(dateRangeLabel), [dateRangeLabel]);

  const days = differenceInCalendarDays(range.end, range.start) + 1;
  const prevEnd = useMemo(() => subDays(range.start, 1), [range.start.getTime()]);
  const prevStart = useMemo(() => subDays(prevEnd, Math.max(0, days - 1)), [prevEnd.getTime(), days]);

  const startKey = format(range.start, 'yyyy-MM-dd');
  const endKey   = format(range.end, 'yyyy-MM-dd');
  const pStartKey = format(prevStart, 'yyyy-MM-dd');
  const pEndKey   = format(prevEnd, 'yyyy-MM-dd');

  // Current period — blocks first paint.
  // NOTE: queryKey version "v2" was bumped after the BigQuery fix that made
  // `campaign_name` reflect the latest canonical name per
  // (platform, account_id, campaign_id). Bumping the key invalidates any
  // cached rows that still carried older raw historical names, so Market
  // (and other parsed dimensions) is always derived from the current
  // canonical name and never from stale parsed values.
  const currentQ = useQuery({
    queryKey: ['dashboard-daily', 'v2', startKey, endKey],
    queryFn: () => fetchDashboardRange(range.start, range.end),
  });

  // Previous period — fired in parallel but does NOT gate the loading flag.
  // We don't need it for the first paint of charts/KPIs.
  const previousQ = useQuery({
    queryKey: ['dashboard-daily', 'v2', pStartKey, pEndKey],
    queryFn: () => fetchDashboardRange(prevStart, prevEnd),
    enabled: !currentQ.isLoading,
  });

  // Apply per-platform USD→reporting-currency conversion before any aggregation.
  // Skipped (and short-circuited to identity) when no multiplier is set.
  const applyMultiplier = (rawRows: DashboardDailyRow[]): DashboardDailyRow[] => {
    if (!costMultiplierByPlatform) return rawRows;
    return rawRows.map(r => {
      const k = normalizePlatform(r.platform);
      const m = (k && costMultiplierByPlatform[k]) || 1;
      if (m === 1) return r;
      return {
        ...r,
        cost: (+r.cost || 0) * m,
        conversion_value: (+r.conversion_value || 0) * m,
      };
    });
  };

  // Drop rows whose campaign name matches any of the per-platform exclusion
  // tokens configured in Admin. Substring match is case-insensitive.
  const applyExclusions = (rawRows: DashboardDailyRow[]): DashboardDailyRow[] => {
    if (!excludedCampaignTokensByPlatform) return rawRows;
    const hasAny = Object.values(excludedCampaignTokensByPlatform).some(arr => (arr?.length ?? 0) > 0);
    if (!hasAny) return rawRows;
    return rawRows.filter(r => {
      const k = normalizePlatform(r.platform);
      if (!k) return true;
      const tokens = excludedCampaignTokensByPlatform[k];
      if (!tokens || tokens.length === 0) return true;
      const name = (r.campaign_name || '').toLowerCase();
      for (const t of tokens) {
        if (t && name.includes(t)) return false;
      }
      return true;
    });
  };

  const allRows  = useMemo(() => applyExclusions(applyMultiplier(currentQ.data ?? [])),  [currentQ.data, multiplierKey, exclusionKey]);
  const prevRows = useMemo(() => applyExclusions(applyMultiplier(previousQ.data ?? [])), [previousQ.data, multiplierKey, exclusionKey]);
  
  const loading = currentQ.isLoading;
  const error = currentQ.error ? (currentQ.error as Error).message : null;

  const labelToRawPlatforms = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of allRows) {
      const k = normalizePlatform(r.platform);
      if (!k) continue;
      const lbl = PLATFORM_LABELS[k];
      const arr = m.get(lbl) || [];
      if (!arr.includes(r.platform)) arr.push(r.platform);
      m.set(lbl, arr);
    }
    return m;
  }, [allRows]);

  const platformRawSet = useMemo(() => {
    if (!selectedPlatformLabels.length) return null;
    const set = new Set<string>();
    for (const lbl of selectedPlatformLabels) {
      const arr = labelToRawPlatforms.get(lbl);
      if (arr) for (const r of arr) set.add(r);
    }
    return set;
  }, [selectedPlatformLabels, labelToRawPlatforms]);

  const campaignSet = useMemo(
    () => (selectedCampaigns.length ? new Set(selectedCampaigns) : null),
    [selectedCampaigns]
  );

  const objectiveSet = useMemo(
    () => (selectedObjectives.length ? new Set(selectedObjectives) : null),
    [selectedObjectives]
  );

  const marketSet = useMemo(
    () => (selectedMarkets.length ? new Set(selectedMarkets) : null),
    [selectedMarkets]
  );

  const channelSet = useMemo(
    () => (selectedChannels.length ? new Set(selectedChannels) : null),
    [selectedChannels]
  );

  // Parsed segments cached per row to avoid re-splitting on every filter pass.
  const parsedByName = useMemo(() => {
    const m = new Map<string, ReturnType<typeof parseCampaignName>>();
    for (const r of allRows) {
      const name = r.campaign_name || '';
      if (m.has(name)) continue;
      m.set(name, parseCampaignName(name));
    }
    for (const r of prevRows) {
      const name = r.campaign_name || '';
      if (m.has(name)) continue;
      m.set(name, parseCampaignName(name));
    }
    return m;
  }, [allRows, prevRows]);

  const matchesDimensionFilters = (r: DashboardDailyRow) => {
    if (!objectiveSet && !marketSet && !channelSet && !campaignSet) return true;
    const p = parsedByName.get(r.campaign_name || '') ?? parseCampaignName(r.campaign_name);
    if (campaignSet  && !campaignSet.has(p.campaign)) return false;
    if (objectiveSet && !objectiveSet.has(p.objective)) return false;
    if (marketSet    && !marketSet.has(p.market)) return false;
    if (channelSet   && !channelSet.has(p.channel)) return false;
    return true;
  };

  // Client-side filtering — avoids an extra BigQuery round-trip whenever the
  // unfiltered superset is already in memory.
  const rows = useMemo(() => {
    if (!platformRawSet && !campaignSet && !objectiveSet && !marketSet && !channelSet) return allRows;
    return allRows.filter(r =>
      (!platformRawSet || platformRawSet.has(r.platform)) &&
      matchesDimensionFilters(r)
    );
  }, [allRows, platformRawSet, campaignSet, objectiveSet, marketSet, channelSet, parsedByName]);

  const filteredPrevRows = useMemo(() => {
    if (!platformRawSet && !campaignSet && !objectiveSet && !marketSet && !channelSet) return prevRows;
    return prevRows.filter(r =>
      (!platformRawSet || platformRawSet.has(r.platform)) &&
      matchesDimensionFilters(r)
    );
  }, [prevRows, platformRawSet, campaignSet, objectiveSet, marketSet, channelSet, parsedByName]);

  const totals = useMemo(() => aggregate(rows, 'all'), [rows]);
  const previousTotals = useMemo(
    () => filteredPrevRows.length ? aggregate(filteredPrevRows, 'all') : null,
    [filteredPrevRows]
  );
  const platformSummaries = useMemo(() => buildPlatformSummaries(rows, 'lower_funnel'), [rows]);
  const spendSeries = useMemo(() => buildTimeSeries(rows, r => +r.cost || 0), [rows]);
  const conversionsSeries = useMemo(() => buildTimeSeries(rows, r => pickConversions(r, 'all')), [rows]);
  const cpaSeries = useMemo(() => buildCpaSeries(rows, 'all'), [rows]);
  const ctrSeries = useMemo(() => buildCtrSeries(rows), [rows]);

  const availablePlatforms = useMemo<PlatformOption[]>(() => {
    const seen = new Map<PlatformKey, PlatformOption>();
    for (const r of allRows) {
      const k = normalizePlatform(r.platform);
      if (!k || seen.has(k)) continue;
      seen.set(k, { key: k, label: PLATFORM_LABELS[k], raw: r.platform });
    }
    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [allRows]);

  // Helpers to build dimension option lists from parsed campaign names.
  // 'Unknown' is sorted last so the most informative buckets surface first.
  const sortDim = (arr: string[]) =>
    arr.sort((a, b) => {
      if (a === UNKNOWN && b !== UNKNOWN) return 1;
      if (b === UNKNOWN && a !== UNKNOWN) return -1;
      return a.localeCompare(b);
    });

  const buildDimensionOptions = (extract: (p: ReturnType<typeof parseCampaignName>) => string) => {
    const set = new Set<string>();
    for (const r of allRows) {
      if (platformRawSet && !platformRawSet.has(r.platform)) continue;
      const p = parsedByName.get(r.campaign_name || '') ?? parseCampaignName(r.campaign_name);
      set.add(extract(p));
    }
    return sortDim(Array.from(set));
  };

  const buildDimensionByPlatform = (extract: (p: ReturnType<typeof parseCampaignName>) => string) => {
    const buckets = new Map<PlatformKey, Set<string>>();
    for (const r of allRows) {
      const k = normalizePlatform(r.platform);
      if (!k) continue;
      let s = buckets.get(k);
      if (!s) { s = new Set<string>(); buckets.set(k, s); }
      const p = parsedByName.get(r.campaign_name || '') ?? parseCampaignName(r.campaign_name);
      s.add(extract(p));
    }
    const out: Partial<Record<PlatformKey, string[]>> = {};
    buckets.forEach((set, k) => { out[k] = sortDim(Array.from(set)); });
    return out;
  };

  // Campaigns dropdown shows ONLY the 3rd segment (Campaign) from the naming
  // convention, de-duplicated. Selecting a label filters all raw campaign
  // rows whose parsed `campaign` matches.
  const availableCampaigns  = useMemo(() => buildDimensionOptions(p => p.campaign), [allRows, platformRawSet, parsedByName]);
  const campaignsByPlatform = useMemo(() => buildDimensionByPlatform(p => p.campaign), [allRows, parsedByName]);

  const availableObjectives  = useMemo(() => buildDimensionOptions(p => p.objective), [allRows, platformRawSet, parsedByName]);
  const objectivesByPlatform = useMemo(() => buildDimensionByPlatform(p => p.objective), [allRows, parsedByName]);
  const availableMarkets     = useMemo(() => buildDimensionOptions(p => p.market), [allRows, platformRawSet, parsedByName]);
  const marketsByPlatform    = useMemo(() => buildDimensionByPlatform(p => p.market), [allRows, parsedByName]);
  const availableChannels    = useMemo(() => buildDimensionOptions(p => p.channel), [allRows, platformRawSet, parsedByName]);
  const channelsByPlatform   = useMemo(() => buildDimensionByPlatform(p => p.channel), [allRows, parsedByName]);

  return {
    loading, error, rows, previousRows: filteredPrevRows, totals, previousTotals,
    platformSummaries, spendSeries, conversionsSeries, cpaSeries, ctrSeries, range,
    availablePlatforms, availableCampaigns, campaignsByPlatform,
    availableObjectives, objectivesByPlatform,
    availableMarkets, marketsByPlatform,
    availableChannels, channelsByPlatform,
  };
}

export function pctChange(current: number, previous: number | null | undefined): number {
  if (previous == null || previous === 0) return 0;
  return +(((current - previous) / previous) * 100).toFixed(1);
}
