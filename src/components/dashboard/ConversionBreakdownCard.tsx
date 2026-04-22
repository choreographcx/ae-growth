import { useMemo, useState } from 'react';
import { useConversionBreakdown, type ConversionBreakdownRow } from '@/hooks/useConversionBreakdown';
import { PlatformKey } from '@/types/dashboard';
import type { DashboardDailyRow } from '@/hooks/useDashboardDaily';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

type FunnelKey = 'lower' | 'upper' | 'excluded';

interface Props {
  /** Restrict to a single platform. Omit to show all platforms (Overview). */
  platform?: PlatformKey;
  start: Date;
  end: Date;
  campaigns?: string[];
  className?: string;
  /** Already-loaded dashboard rows used as a fallback if the breakdown RPC returns empty. */
  sourceRows?: DashboardDailyRow[];
  /**
   * When true, aggregate identical conversion names across platforms into a
   * single row. Used on Overview where rows from Meta/Google/etc. should roll
   * up. When false (default), each platform's rows are shown verbatim.
   */
  aggregateAcrossPlatforms?: boolean;
}

const FUNNEL_BADGE: Record<string, string> = {
  lower: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  upper: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  excluded: 'bg-muted text-muted-foreground border-border',
};

function badgeClass(group: string) {
  const g = group.toLowerCase();
  if (g.includes('lower')) return FUNNEL_BADGE.lower;
  if (g.includes('upper')) return FUNNEL_BADGE.upper;
  return FUNNEL_BADGE.excluded;
}

function funnelLabel(group: string) {
  const g = (group || '').toLowerCase();
  if (g.includes('lower')) return 'Lower Funnel';
  if (g.includes('upper')) return 'Upper Funnel';
  return 'Excluded';
}

/** Title-case a single token, preserving common acronyms. */
function titleCaseWord(w: string): string {
  if (!w) return w;
  const upper = w.toUpperCase();
  if (['CTA', 'CTR', 'CPA', 'CPM', 'CPC', 'ROI', 'ROAS', 'GA4', 'UTM', 'URL', 'API', 'ID', 'IP', 'SMS'].includes(upper)) return upper;
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

/**
 * Normalize a raw conversion event name into a clean, title-cased display label.
 * Handles platform-specific aliases so duplicates (e.g. "Purchase" and "purchase",
 * or "onsite_conversion.lead" and "Lead") collapse into a single canonical row.
 */
function normalizeConversionName(raw: string | null | undefined): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return 'Unspecified';
  const lower = trimmed.toLowerCase();

  // Platform-specific aliases → canonical label.
  const aliases: Record<string, string> = {
    'purchase': 'Purchase',
    'purchases': 'Purchase',
    'complete_payment': 'Complete Payment',
    'onsite_conversion.lead': 'Lead',
    'onsite_conversion.leaad': 'Lead',
    'lead': 'Lead',
    'leads': 'Lead',
    'add_to_cart': 'Add To Cart',
    'initiate_checkout': 'Initiate Checkout',
    'view_content': 'View Content',
    'sign_up': 'Sign Up',
    'complete_registration': 'Complete Registration',
  };
  if (aliases[lower]) return aliases[lower];

  // Strip common platform prefixes like "onsite_conversion." or "offsite_conversion.fb_pixel_".
  const withoutPrefix = lower
    .replace(/^onsite_conversion\./, '')
    .replace(/^offsite_conversion\.fb_pixel_/, '')
    .replace(/^offsite_conversion\./, '');
  if (aliases[withoutPrefix]) return aliases[withoutPrefix];

  // Generic title-case across underscores / dots / spaces.
  return withoutPrefix
    .split(/[_.\s]+/)
    .filter(Boolean)
    .map(titleCaseWord)
    .join(' ');
}

function buildFallbackRows(sourceRows: DashboardDailyRow[]): ConversionBreakdownRow[] {
  if (!sourceRows.length) return [];

  const totals = sourceRows.reduce((acc, row) => {
    acc.all += +row.conversions_all || +row.conversions || 0;
    acc.lower += +row.conversions_lower_funnel || 0;
    acc.upper += +row.conversions_upper_funnel || 0;
    return acc;
  }, { all: 0, lower: 0, upper: 0 });

  const excluded = Math.max(0, totals.all - totals.lower - totals.upper);
  const platform = sourceRows[0]?.platform || 'All Platforms';

  return [
    totals.lower > 0 ? {
      platform,
      conversion_name: 'Lower Funnel',
      conversion_funnel_group: 'lower_funnel',
      conversions_all: totals.lower,
    } : null,
    totals.upper > 0 ? {
      platform,
      conversion_name: 'Upper Funnel',
      conversion_funnel_group: 'upper_funnel',
      conversions_all: totals.upper,
    } : null,
    excluded > 0 ? {
      platform,
      conversion_name: 'Excluded',
      conversion_funnel_group: 'excluded',
      conversions_all: excluded,
    } : null,
  ].filter((row): row is ConversionBreakdownRow => row !== null);
}

export function ConversionBreakdownCard({
  platform,
  start,
  end,
  campaigns,
  className,
  sourceRows,
  aggregateAcrossPlatforms = false,
}: Props) {
  const { loading, error, rows } = useConversionBreakdown({ start, end, platform, campaigns });
  const isMobile = useIsMobile();
  const [enabled, setEnabled] = useState<Record<FunnelKey, boolean>>({ lower: true, upper: true, excluded: true });

  const fallbackRows = useMemo(() => buildFallbackRows(sourceRows ?? []), [sourceRows]);
  const effectiveRows = rows.length > 0 ? rows : fallbackRows;
  const effectiveError = effectiveRows.length > 0 ? null : error;
  const showLoading = loading && effectiveRows.length === 0;

  const toggle = (key: FunnelKey) => setEnabled(prev => {
    const next = { ...prev, [key]: !prev[key] };
    if (!next.lower && !next.upper && !next.excluded) return prev;
    return next;
  });

  const filtered = useMemo(() => {
    return effectiveRows.filter(r => {
      const g = (r.conversion_funnel_group || '').toLowerCase();
      const isLower = g.includes('lower');
      const isUpper = g.includes('upper');
      if (isLower) return enabled.lower;
      if (isUpper) return enabled.upper;
      return enabled.excluded;
    });
  }, [effectiveRows, enabled.lower, enabled.upper, enabled.excluded]);

  const aggregated = useMemo(() => {
    // Always normalize names so duplicates like "Purchase"/"purchase" or
    // "onsite_conversion.lead"/"Lead" collapse into a single row. When
    // aggregateAcrossPlatforms is false we still merge per-platform duplicates.
    const map = new Map<string, typeof filtered[number]>();
    for (const r of filtered) {
      const canonicalName = normalizeConversionName(r.conversion_name);
      const platformKey = aggregateAcrossPlatforms ? '*' : (r.platform || '');
      const key = `${platformKey}::${canonicalName}::${r.conversion_funnel_group}`;
      const existing = map.get(key);
      if (existing) {
        existing.conversions_all += r.conversions_all || 0;
      } else {
        map.set(key, { ...r, conversion_name: canonicalName, conversions_all: r.conversions_all || 0 });
      }
    }
    return Array.from(map.values());
  }, [filtered, aggregateAcrossPlatforms]);

  const sorted = useMemo(
    () => [...aggregated].sort((a, b) => b.conversions_all - a.conversions_all),
    [aggregated]
  );
  const total = useMemo(() => sorted.reduce((s, r) => s + (r.conversions_all || 0), 0), [sorted]);

  const showHeader = !showLoading && !effectiveError;

  return (
    <div className={cn('bg-card rounded-xl border border-border shadow-sm overflow-hidden', className)}>
      {showHeader && (
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-sm font-semibold tabular-nums">{Math.round(total).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-1.5 shadow-sm">
            <label className="flex items-center gap-1.5 text-sm font-medium text-card-foreground cursor-pointer select-none">
              <Checkbox
                checked={enabled.lower}
                onCheckedChange={() => toggle('lower')}
                aria-label="Show Lower Funnel"
              />
              Lower Funnel
            </label>
            <label className="flex items-center gap-1.5 text-sm font-medium text-card-foreground cursor-pointer select-none">
              <Checkbox
                checked={enabled.upper}
                onCheckedChange={() => toggle('upper')}
                aria-label="Show Upper Funnel"
              />
              Upper Funnel
            </label>
            <label className="flex items-center gap-1.5 text-sm font-medium text-card-foreground cursor-pointer select-none">
              <Checkbox
                checked={enabled.excluded}
                onCheckedChange={() => toggle('excluded')}
                aria-label="Show Excluded"
              />
              Excluded
            </label>
          </div>
        </div>
      )}

      {effectiveError && (
        <div className="px-5 py-4 text-xs text-destructive">Failed to load breakdown: {effectiveError}</div>
      )}
      {showLoading && (
        <div className="px-5 py-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading breakdown…
        </div>
      )}
      {!showLoading && !effectiveError && sorted.length === 0 && (
        <div className="px-5 py-6 text-xs text-muted-foreground">
          No conversion events recorded {platform ? 'for this platform' : 'across platforms'} in the selected period.
        </div>
      )}

      {!showLoading && !effectiveError && sorted.length > 0 && (
        isMobile ? (
          <div className="p-3 space-y-2.5">
            {sorted.map((r, i) => {
              const pct = total > 0 ? (r.conversions_all / total) * 100 : 0;
              return (
                <div key={`${r.conversion_name}::${r.conversion_funnel_group}::${i}`} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <p className="text-[14px] font-semibold text-card-foreground truncate">{r.conversion_name}</p>
                    <span className={cn('inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded border shrink-0', badgeClass(r.conversion_funnel_group))}>
                      {funnelLabel(r.conversion_funnel_group)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-2 border-t border-border/60">
                    <p className="text-[18px] font-bold text-card-foreground tabular-nums">{Math.round(r.conversions_all).toLocaleString()}</p>
                    <div className="text-right">
                      <p className="text-[12px] text-muted-foreground">% of Total</p>
                      <p className="text-[14px] font-semibold tabular-nums text-card-foreground">{pct.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Conversion Name</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Funnel</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Conversions</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => {
                  const pct = total > 0 ? (r.conversions_all / total) * 100 : 0;
                  return (
                    <tr key={`${r.conversion_name}::${r.conversion_funnel_group}::${i}`} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 text-xs font-medium text-card-foreground">{r.conversion_name}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn('inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded border', badgeClass(r.conversion_funnel_group))}>
                          {funnelLabel(r.conversion_funnel_group)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-right tabular-nums font-semibold">{Math.round(r.conversions_all).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-xs text-right tabular-nums text-muted-foreground">{pct.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
