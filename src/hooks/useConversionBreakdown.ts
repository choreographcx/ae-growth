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
  const { data, error } = await supabase.rpc('get_dashboard_conversion_breakdown', {
    p_start: fmt(start),
    p_end: fmt(end),
    p_platforms: null,
    p_campaign_names: campaigns?.length ? campaigns : null,
  });
  if (error) throw new Error(error.message);
  return (data as ConversionBreakdownRow[]) || [];
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
