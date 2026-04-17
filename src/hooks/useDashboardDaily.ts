import { useEffect, useMemo, useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, subYears, endOfYear, differenceInCalendarDays, parse, isValid } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { PlatformKey, PlatformSummary, TimeSeriesPoint } from '@/types/dashboard';

export interface DashboardDailyRow {
  date: string;
  platform: string;
  campaign_id: string | null;
  campaign_name: string | null;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversion_value: number;
  reach: number;
  landing_page_views: number;
  video_views: number;
}

export interface DashboardTotals {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  reach: number;
  landingPageViews: number;
  videoViews: number;
  ctr: number;
  cpc: number;
  cpa: number;
  cpm: number;
  conversionRate: number;
  costPerLPV: number;
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
  if (k === 'x' || k.includes('twitter')) return 'x';
  if (k.includes('linkedin')) return 'linkedin';
  if (k.includes('programmatic') || k.includes('dv360') || k.includes('display')) return 'programmatic';
  return null;
}

const PLATFORM_LABELS: Record<PlatformKey, string> = {
  meta: 'Meta', google: 'Google Ads', tiktok: 'TikTok', snapchat: 'Snapchat',
  x: 'X', linkedin: 'LinkedIn', programmatic: 'Programmatic',
};

function safeDiv(n: number, d: number) { return d > 0 ? n / d : 0; }

function aggregate(rows: DashboardDailyRow[]): DashboardTotals {
  const t = rows.reduce((a, r) => {
    a.spend += +r.cost || 0;
    a.impressions += +r.impressions || 0;
    a.clicks += +r.clicks || 0;
    a.conversions += +r.conversions || 0;
    a.reach += +r.reach || 0;
    a.landingPageViews += +r.landing_page_views || 0;
    a.videoViews += +r.video_views || 0;
    return a;
  }, { spend: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0, landingPageViews: 0, videoViews: 0 });
  return {
    ...t,
    ctr: safeDiv(t.clicks, t.impressions) * 100,
    cpc: safeDiv(t.spend, t.clicks),
    cpa: safeDiv(t.spend, t.conversions),
    cpm: safeDiv(t.spend, t.impressions) * 1000,
    conversionRate: safeDiv(t.conversions, t.clicks) * 100,
    costPerLPV: safeDiv(t.spend, t.landingPageViews),
  };
}

function buildPlatformSummaries(rows: DashboardDailyRow[]): PlatformSummary[] {
  const totals = aggregate(rows);
  const byPlatform = new Map<PlatformKey, DashboardDailyRow[]>();
  for (const r of rows) {
    const p = normalizePlatform(r.platform);
    if (!p) continue;
    if (!byPlatform.has(p)) byPlatform.set(p, []);
    byPlatform.get(p)!.push(r);
  }
  const summaries: PlatformSummary[] = [];
  byPlatform.forEach((rs, platform) => {
    const a = aggregate(rs);
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
    });
  });
  return summaries.sort((x, y) => y.spend - x.spend);
}

function buildTimeSeries(rows: DashboardDailyRow[], picker: (r: DashboardDailyRow) => number): TimeSeriesPoint[] {
  const byDate = new Map<string, number>();
  for (const r of rows) byDate.set(r.date, (byDate.get(r.date) || 0) + (picker(r) || 0));
  return Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
}

function buildCpaSeries(rows: DashboardDailyRow[]): TimeSeriesPoint[] {
  const byDate = new Map<string, { spend: number; conv: number }>();
  for (const r of rows) {
    const cur = byDate.get(r.date) || { spend: 0, conv: 0 };
    cur.spend += +r.cost || 0; cur.conv += +r.conversions || 0;
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

export interface PlatformOption { key: PlatformKey; label: string; raw: string; }

export interface UseDashboardDailyOptions {
  selectedPlatformLabels?: string[];   // display labels from header filter
  selectedCampaigns?: string[];        // raw campaign_name strings
}

interface UseDashboardDailyResult {
  loading: boolean;
  error: string | null;
  rows: DashboardDailyRow[];
  totals: DashboardTotals;
  previousTotals: DashboardTotals | null;
  platformSummaries: PlatformSummary[];
  spendSeries: TimeSeriesPoint[];
  conversionsSeries: TimeSeriesPoint[];
  cpaSeries: TimeSeriesPoint[];
  ctrSeries: TimeSeriesPoint[];
  range: DateBounds;
  // Filter options derived from unfiltered current-period data
  availablePlatforms: PlatformOption[];
  availableCampaigns: string[];
}

export function useDashboardDaily(
  dateRangeLabel: string,
  options: UseDashboardDailyOptions = {}
): UseDashboardDailyResult {
  const { selectedPlatformLabels = [], selectedCampaigns = [] } = options;
  const range = useMemo(() => resolveDateRange(dateRangeLabel), [dateRangeLabel]);

  // Unfiltered data drives BOTH the filter option lists AND any unfiltered request
  const [allRows, setAllRows] = useState<DashboardDailyRow[]>([]);
  const [filteredRows, setFilteredRows] = useState<DashboardDailyRow[]>([]);
  const [prevRows, setPrevRows] = useState<DashboardDailyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map UI labels -> raw BQ platform strings using whatever raw values appear in allRows
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

  const platformsParam = useMemo(() => {
    if (!selectedPlatformLabels.length) return null;
    const raws: string[] = [];
    for (const lbl of selectedPlatformLabels) {
      const arr = labelToRawPlatforms.get(lbl);
      if (arr) raws.push(...arr);
    }
    return raws.length ? raws : ['__no_match__'];
  }, [selectedPlatformLabels, labelToRawPlatforms]);

  const campaignsParam = useMemo(
    () => (selectedCampaigns.length ? selectedCampaigns : null),
    [selectedCampaigns]
  );

  const filtersActive = !!(platformsParam || campaignsParam);

  // 1) Always fetch unfiltered current period (for filter options + unfiltered render)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
      const days = Math.max(1, differenceInCalendarDays(range.end, range.start) + 1);
      const prevEnd = subDays(range.start, 1);
      const prevStart = subDays(prevEnd, days - 1);

      const [current, previous] = await Promise.all([
        supabase.rpc('get_dashboard_daily', { p_start: fmt(range.start), p_end: fmt(range.end) }),
        supabase.rpc('get_dashboard_daily', { p_start: fmt(prevStart),   p_end: fmt(prevEnd)   }),
      ]);
      if (cancelled) return;
      if (current.error) {
        setError(current.error.message);
        setAllRows([]); setPrevRows([]); setLoading(false);
        return;
      }
      setAllRows((current.data as DashboardDailyRow[]) || []);
      setPrevRows(previous.error ? [] : ((previous.data as DashboardDailyRow[]) || []));
      setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [range.start.getTime(), range.end.getTime()]);

  // 2) When filters active, fetch a filtered slice; otherwise reuse allRows
  useEffect(() => {
    if (!filtersActive) { setFilteredRows([]); return; }
    let cancelled = false;
    const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
    (async () => {
      const { data, error: err } = await supabase.rpc('get_dashboard_daily', {
        p_start: fmt(range.start),
        p_end: fmt(range.end),
        p_platforms: platformsParam,
        p_campaign_names: campaignsParam,
      });
      if (cancelled) return;
      if (err) { setError(err.message); setFilteredRows([]); return; }
      setFilteredRows((data as DashboardDailyRow[]) || []);
    })();
    return () => { cancelled = true; };
  }, [filtersActive, range.start.getTime(), range.end.getTime(), platformsParam, campaignsParam]);

  const rows = filtersActive ? filteredRows : allRows;

  // Previous-period totals: when filters active we approximate by filtering prevRows in-memory
  // (BQ scan already paid for unfiltered prev period; saves a 4th RPC call)
  const filteredPrevRows = useMemo(() => {
    if (!filtersActive) return prevRows;
    const platSet = platformsParam ? new Set(platformsParam) : null;
    const campSet = campaignsParam ? new Set(campaignsParam) : null;
    return prevRows.filter(r =>
      (!platSet || platSet.has(r.platform)) &&
      (!campSet || (r.campaign_name && campSet.has(r.campaign_name)))
    );
  }, [filtersActive, prevRows, platformsParam, campaignsParam]);

  const totals = useMemo(() => aggregate(rows), [rows]);
  const previousTotals = useMemo(
    () => filteredPrevRows.length ? aggregate(filteredPrevRows) : null,
    [filteredPrevRows]
  );
  const platformSummaries = useMemo(() => buildPlatformSummaries(rows), [rows]);
  const spendSeries = useMemo(() => buildTimeSeries(rows, r => +r.cost || 0), [rows]);
  const conversionsSeries = useMemo(() => buildTimeSeries(rows, r => +r.conversions || 0), [rows]);
  const cpaSeries = useMemo(() => buildCpaSeries(rows), [rows]);
  const ctrSeries = useMemo(() => buildCtrSeries(rows), [rows]);

  // Filter option lists — derived from unfiltered current-period data so users can always
  // see the full universe of platforms/campaigns regardless of current selection.
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
    // Honour platform filter when listing campaigns so the campaign list narrows naturally
    const platSet = platformsParam ? new Set(platformsParam) : null;
    const set = new Set<string>();
    for (const r of allRows) {
      if (!r.campaign_name) continue;
      if (platSet && !platSet.has(r.platform)) continue;
      set.add(r.campaign_name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allRows, platformsParam]);

  return {
    loading, error, rows, totals, previousTotals,
    platformSummaries, spendSeries, conversionsSeries, cpaSeries, ctrSeries, range,
    availablePlatforms, availableCampaigns,
  };
}

export function pctChange(current: number, previous: number | null | undefined): number {
  if (previous == null || previous === 0) return 0;
  return +(((current - previous) / previous) * 100).toFixed(1);
}
