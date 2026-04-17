import { useEffect, useState } from 'react';
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

/**
 * Fetches per-conversion-name breakdown for a given platform + date range.
 * Powers the "Conversion Breakdown" section on platform pages.
 */
export function useConversionBreakdown({ start, end, platform, campaigns }: Options): Result {
  const [rows, setRows] = useState<ConversionBreakdownRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
      const { data, error: err } = await supabase.rpc('get_dashboard_conversion_breakdown', {
        p_start: fmt(start),
        p_end: fmt(end),
        p_platforms: null,
        p_campaign_names: campaigns?.length ? campaigns : null,
      });
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setRows([]);
      } else {
        const all = (data as ConversionBreakdownRow[]) || [];
        const filtered = platform
          ? all.filter(r => normalizePlatform(r.platform) === platform)
          : all;
        setRows(filtered);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [start.getTime(), end.getTime(), platform, JSON.stringify(campaigns || [])]);

  return { loading, error, rows };
}
