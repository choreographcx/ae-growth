/**
 * Hook: fetches per-platform cost-vs-cost_usd integrity stats from BigQuery.
 *
 * Used by the Admin platform settings page to flag two data-quality issues:
 *   1. `cost` and `cost_usd` differ materially → the platform is NOT actually
 *      reporting in USD even though our dashboard assumes USD throughout.
 *   2. The implied native currency (derived from cost / cost_usd ratio) does
 *      not match the per-platform Reporting Currency configured in Admin.
 *
 * Admin-only (RLS enforced via the `get_platform_currency_integrity` RPC).
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PlatformKey } from '@/types/dashboard';

export interface PlatformIntegrityRow {
  /** Raw platform string from BigQuery (Facebook, Google Ads, TikTok, etc.) */
  platform: string;
  totalCost: number;
  totalCostUsd: number;
  /** cost / cost_usd. ≈1 means platform reports in USD. */
  impliedRate: number | null;
  rowsScanned: number;
}

/** Maps raw BigQuery platform strings to our normalized PlatformKey. */
export function normalizePlatformKey(raw: string | null | undefined): PlatformKey | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes('facebook') || s.includes('instagram') || s === 'meta') return 'meta';
  if (s.includes('google')) return 'google';
  if (s.includes('tiktok')) return 'tiktok';
  if (s.includes('snap')) return 'snapchat';
  if (s.includes('twitter') || s === 'x') return 'x';
  if (s.includes('linkedin')) return 'linkedin';
  if (s.includes('dv360') || s.includes('display') || s.includes('programmatic')) return 'programmatic';
  return null;
}

/** Implied native currency from the cost/cost_usd ratio against client SAR/AED rates. */
export function inferCurrency(impliedRate: number | null, sarRate: number, aedRate: number): 'USD' | 'SAR' | 'AED' | 'UNKNOWN' {
  if (impliedRate == null || !Number.isFinite(impliedRate)) return 'UNKNOWN';
  // ±2% tolerance on each known rate.
  const within = (rate: number, target: number) => Math.abs(rate - target) / target <= 0.02;
  if (within(impliedRate, 1)) return 'USD';
  if (sarRate > 0 && within(impliedRate, sarRate)) return 'SAR';
  if (aedRate > 0 && within(impliedRate, aedRate)) return 'AED';
  return 'UNKNOWN';
}

export function useePlatformCurrencyIntegrity(enabled: boolean) {
  return usePlatformCurrencyIntegrity(enabled);
}

export function usePlatformCurrencyIntegrity(enabled: boolean) {
  const [rows, setRows] = useState<PlatformIntegrityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const { data, error } = await (supabase as any).rpc('get_platform_currency_integrity', {});
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows(
          (data as any[] || []).map(r => ({
            platform: r.platform,
            totalCost: Number(r.total_cost) || 0,
            totalCostUsd: Number(r.total_cost_usd) || 0,
            impliedRate: r.implied_rate == null ? null : Number(r.implied_rate),
            rowsScanned: Number(r.rows_scanned) || 0,
          }))
        );
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [enabled]);

  return { rows, loading, error };
}
