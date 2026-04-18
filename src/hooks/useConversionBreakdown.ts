import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { PlatformKey } from '@/types/dashboard';
import { normalizePlatform, buildSuppressionPayload } from './useDashboardDaily';

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
  /** Per-platform-key list of conversion event names to exclude. */
  suppressedConversions?: Partial<Record<PlatformKey, string[]>>;
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
export function useConversionBreakdown({ start, end, platform, campaigns, suppressedConversions }: Options): Result {
  const [rows, setRows] = useState<ConversionBreakdownRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Build a stable payload — we don't know the raw platform values here, so we
  // pass canonical keys; the SQL match is case-insensitive and most ad sources
  // use the canonical key as the raw value.
  const suppressionPayload = useMemo(
    () => buildSuppressionPayload(suppressedConversions, []),
    [suppressedConversions]
  );
  const suppressionKey = useMemo(
    () => (suppressionPayload ? JSON.stringify(suppressionPayload) : ''),
    [suppressionPayload]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
      const { data, error: err } = await (supabase.rpc as any)('get_dashboard_conversion_breakdown', {
        p_start: fmt(start),
        p_end: fmt(end),
        p_platforms: null,
        p_campaign_names: campaigns?.length ? campaigns : null,
        p_suppressed_conversions: suppressionPayload,
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
  }, [start.getTime(), end.getTime(), platform, JSON.stringify(campaigns || []), suppressionKey]);

  return { loading, error, rows };
}
