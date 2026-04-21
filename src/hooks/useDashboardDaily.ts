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
  conversionRate: number;
  conversionRateLowerFunnel: number;
  costPerLPV: number;
  lpvRate: number;
  cvrLowerFunnel: number;
  frequency: number;
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
  const t = rows.reduce((a, r) => {
    a.spend += +r.cost || 0;
    a.impressions += +r.impressions || 0;
    a.clicks += +r.clicks || 0;
    a.conversionsAll += +r.conversions_all || +r.conversions || 0;
    a.conversionsLowerFunnel += +r.conversions_lower_funnel || 0;
    a.conversionsUpperFunnel += +r.conversions_upper_funnel || 0;
    a.conversionValue += +r.conversion_value || 0;
    a.reach += +r.reach || 0;
    a.landingPageViews += +r.landing_page_views || 0;
    a.outboundClicks += +r.outbound_clicks || 0;
    a.videoViews += +r.video_views || 0;
    a.videoP100 += +r.video_p100 || 0;
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

  return {
    ...t,
    conversions,
    ctr: safeDiv(t.clicks, t.impressions) * 100,
    cpc: safeDiv(t.spend, t.clicks),
    cpa: safeDiv(t.spend, conversions),
    cpaAll: safeDiv(t.spend, t.conversionsAll),
    cpaLowerFunnel: safeDiv(t.spend, t.conversionsLowerFunnel),
    cpm: safeDiv(t.spend, t.impressions) * 1000,
    conversionRate: safeDiv(conversions, t.clicks) * 100,
    conversionRateLowerFunnel: safeDiv(t.conversionsLowerFunnel, t.clicks) * 100,
    costPerLPV: safeDiv(t.spend, t.landingPageViews),
    lpvRate: safeDiv(t.landingPageViews, t.clicks) * 100,
    cvrLowerFunnel: safeDiv(t.conversionsLowerFunnel, t.landingPageViews) * 100,
    frequency: safeDiv(t.impressions, t.reach),
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

function buildFrequencySeries(rows: DashboardDailyRow[]): TimeSeriesPoint[] {
  const byDate = new Map<string, { imps: number; reach: number }>();
  for (const r of rows) {
    const cur = byDate.get(r.date) || { imps: 0, reach: 0 };
    cur.imps += +r.impressions || 0; cur.reach += +r.reach || 0;
    byDate.set(r.date, cur);
  }
  return Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { imps, reach }]) => ({ date, value: reach > 0 ? +(imps / reach).toFixed(2) : 0 }));
}

export interface PlatformOption { key: PlatformKey; label: string; raw: string; }

export interface UseDashboardDailyOptions {
  selectedPlatformLabels?: string[];
  selectedCampaigns?: string[];
  selectedObjectives?: string[];
  selectedMarkets?: string[];
  selectedChannels?: string[];
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
  buildTimeSeries, buildCpaSeries, buildCtrSeries, buildRoasSeries, buildFrequencySeries,
};

/**
 * Fetch the full unfiltered range from BigQuery via the supabase RPC.
 * Cached & deduped by react-query keyed on the date range.
 */
async function fetchDashboardRange(start: Date, end: Date): Promise<DashboardDailyRow[]> {
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  const { data, error } = await (supabase.rpc as any)('get_dashboard_daily', {
    p_start: fmt(start), p_end: fmt(end),
  });
  if (error) throw new Error(error.message);
  return (data as DashboardDailyRow[]) || [];
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
  } = options;
  const range = useMemo(() => resolveDateRange(dateRangeLabel), [dateRangeLabel]);

  const days = differenceInCalendarDays(range.end, range.start) + 1;
  const prevEnd = useMemo(() => subDays(range.start, 1), [range.start.getTime()]);
  const prevStart = useMemo(() => subDays(prevEnd, Math.max(0, days - 1)), [prevEnd.getTime(), days]);

  const startKey = format(range.start, 'yyyy-MM-dd');
  const endKey   = format(range.end, 'yyyy-MM-dd');
  const pStartKey = format(prevStart, 'yyyy-MM-dd');
  const pEndKey   = format(prevEnd, 'yyyy-MM-dd');

  // Current period — blocks first paint.
  const currentQ = useQuery({
    queryKey: ['dashboard-daily', startKey, endKey],
    queryFn: () => fetchDashboardRange(range.start, range.end),
  });

  // Previous period — fired in parallel but does NOT gate the loading flag.
  // We don't need it for the first paint of charts/KPIs.
  const previousQ = useQuery({
    queryKey: ['dashboard-daily', pStartKey, pEndKey],
    queryFn: () => fetchDashboardRange(prevStart, prevEnd),
    enabled: !currentQ.isLoading,
  });

  const allRows = currentQ.data ?? [];
  const prevRows = previousQ.data ?? [];
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

  // Client-side filtering — avoids an extra BigQuery round-trip whenever the
  // unfiltered superset is already in memory.
  const rows = useMemo(() => {
    if (!platformRawSet && !campaignSet && !objectiveSet) return allRows;
    return allRows.filter(r =>
      (!platformRawSet || platformRawSet.has(r.platform)) &&
      (!campaignSet    || (r.campaign_name && campaignSet.has(r.campaign_name))) &&
      (!objectiveSet   || (r.campaign_objective && objectiveSet.has(r.campaign_objective)))
    );
  }, [allRows, platformRawSet, campaignSet, objectiveSet]);

  const filteredPrevRows = useMemo(() => {
    if (!platformRawSet && !campaignSet && !objectiveSet) return prevRows;
    return prevRows.filter(r =>
      (!platformRawSet || platformRawSet.has(r.platform)) &&
      (!campaignSet    || (r.campaign_name && campaignSet.has(r.campaign_name))) &&
      (!objectiveSet   || (r.campaign_objective && objectiveSet.has(r.campaign_objective)))
    );
  }, [prevRows, platformRawSet, campaignSet, objectiveSet]);

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

  const availableCampaigns = useMemo(() => {
    const set = new Set<string>();
    for (const r of allRows) {
      if (!r.campaign_name) continue;
      if (platformRawSet && !platformRawSet.has(r.platform)) continue;
      set.add(r.campaign_name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allRows, platformRawSet]);

  const campaignsByPlatform = useMemo<Partial<Record<PlatformKey, string[]>>>(() => {
    const buckets = new Map<PlatformKey, Set<string>>();
    for (const r of allRows) {
      if (!r.campaign_name) continue;
      const k = normalizePlatform(r.platform);
      if (!k) continue;
      let s = buckets.get(k);
      if (!s) { s = new Set<string>(); buckets.set(k, s); }
      s.add(r.campaign_name);
    }
    const out: Partial<Record<PlatformKey, string[]>> = {};
    buckets.forEach((set, k) => {
      out[k] = Array.from(set).sort((a, b) => a.localeCompare(b));
    });
    return out;
  }, [allRows]);

  const availableObjectives = useMemo(() => {
    const set = new Set<string>();
    for (const r of allRows) {
      if (!r.campaign_objective) continue;
      if (platformRawSet && !platformRawSet.has(r.platform)) continue;
      set.add(r.campaign_objective);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allRows, platformRawSet]);

  const objectivesByPlatform = useMemo<Partial<Record<PlatformKey, string[]>>>(() => {
    const buckets = new Map<PlatformKey, Set<string>>();
    for (const r of allRows) {
      if (!r.campaign_objective) continue;
      const k = normalizePlatform(r.platform);
      if (!k) continue;
      let s = buckets.get(k);
      if (!s) { s = new Set<string>(); buckets.set(k, s); }
      s.add(r.campaign_objective);
    }
    const out: Partial<Record<PlatformKey, string[]>> = {};
    buckets.forEach((set, k) => {
      out[k] = Array.from(set).sort((a, b) => a.localeCompare(b));
    });
    return out;
  }, [allRows]);

  return {
    loading, error, rows, previousRows: filteredPrevRows, totals, previousTotals,
    platformSummaries, spendSeries, conversionsSeries, cpaSeries, ctrSeries, range,
    availablePlatforms, availableCampaigns, campaignsByPlatform,
    availableObjectives, objectivesByPlatform,
  };
}

export function pctChange(current: number, previous: number | null | undefined): number {
  if (previous == null || previous === 0) return 0;
  return +(((current - previous) / previous) * 100).toFixed(1);
}
