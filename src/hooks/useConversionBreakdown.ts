import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { PlatformKey } from '@/types/dashboard';
import { normalizePlatform } from './useDashboardDaily';

export interface ConversionBreakdownRow {
  platform: string;
  conversion_name: string;
  conversion_funnel_group: string;
  conversions_all: number;
}

interface Options {
  start: Date;
  end: Date;
  platform?: PlatformKey | null;
  campaigns?: string[];
}

interface Result {
  loading: boolean;
  error: string | null;
  rows: ConversionBreakdownRow[];
}

async function fetchBreakdown(start: Date, end: Date, campaigns?: string[]): Promise<ConversionBreakdownRow[]> {
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  const startDate = fmt(start);
  const endDate = fmt(end);
  // The AESA BigQuery FDW requires a date partition filter on EVERY query,
  // so `.gte('date', startDate).lte('date', endDate)` is mandatory.
  const PAGE = 1000;
  const raw: any[] = [];
  let from = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let q = (supabase as any)
      .from('dashboard_conversions')
      .select('platform, conversion_name, conversion_funnel_group, conversions_all')
      .gte('date', startDate)
      .lte('date', endDate);
    if (campaigns && campaigns.length) q = q.in('campaign_name', campaigns);
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data as any[]) || [];
    raw.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  // Aggregate per (platform, conversion_name, conversion_funnel_group).
  const map = new Map<string, ConversionBreakdownRow>();
  for (const r of raw) {
    const platform = r.platform ?? '';
    const conversion_name = r.conversion_name ?? '';
    const conversion_funnel_group = r.conversion_funnel_group ?? '';
    const key = `${platform}\u0001${conversion_name}\u0001${conversion_funnel_group}`;
    const cur = map.get(key);
    const v = +r.conversions_all || 0;
    if (cur) cur.conversions_all += v;
    else map.set(key, { platform, conversion_name, conversion_funnel_group, conversions_all: v });
  }
  return Array.from(map.values());
}

/**
 * Fetches per-conversion-name breakdown for a given platform + date range.
 * Cached + deduped via react-query so multiple platform pages sharing the
 * same date range only trigger ONE BigQuery scan.
 */
export function useConversionBreakdown({ start, end, platform, campaigns }: Options): Result {
  const startKey = format(start, 'yyyy-MM-dd');
  const endKey = format(end, 'yyyy-MM-dd');
  const campaignKey = campaigns?.length ? [...campaigns].sort().join('|') : '';

  const q = useQuery({
    queryKey: ['conversion-breakdown', startKey, endKey, campaignKey],
    queryFn: () => fetchBreakdown(start, end, campaigns),
  });

  const rows = useMemo(() => {
    const all = q.data ?? [];
    return platform ? all.filter(r => normalizePlatform(r.platform) === platform) : all;
  }, [q.data, platform]);

  return {
    loading: q.isLoading,
    error: q.error ? (q.error as Error).message : null,
    rows,
  };
}
