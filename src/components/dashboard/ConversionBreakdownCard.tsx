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
  /** publisher_platform filter (e.g. ['facebook'] for Meta sub-platform toggle). */
  publisherPlatforms?: string[];
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
  const g = (group || '').toLowerCase();
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

function titleCaseWord(w: string): string {
  if (!w) return w;
  const upper = w.toUpperCase();
  if (['CTA', 'CTR', 'CPA', 'CPM', 'CPC', 'ROI', 'ROAS', 'GA4', 'UTM', 'URL', 'API', 'ID', 'IP', 'SMS'].includes(upper)) return upper;
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

function normalizeConversionName(raw: string | null | undefined): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return 'Unspecified';
  const lower = trimmed.toLowerCase();
  const aliases: Record<string, string> = {
    'purchase': 'Purchase', 'purchases': 'Purchase', 'complete_payment': 'Purchase',
    'onsite_conversion.lead': 'Lead', 'onsite_conversion.leaad': 'Lead',
    'lead': 'Lead', 'leads': 'Lead',
    'add_to_cart': 'Add To Cart', 'initiate_checkout': 'Initiate Checkout',
    'view_content': 'View Content', 'sign_up': 'Sign Up', 'complete_registration': 'Complete Registration',
  };
  if (aliases[lower]) return aliases[lower];
  const withoutPrefix = lower
    .replace(/^onsite_conversion\./, '')
    .replace(/^offsite_conversion\.fb_pixel_/, '')
    .replace(/^offsite_conversion\./, '');
  if (aliases[withoutPrefix]) return aliases[withoutPrefix];
  return withoutPrefix.split(/[_.\s]+/).filter(Boolean).map(titleCaseWord).join(' ');
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
  const make = (name: string, group: string, lower: number, upper: number, all: number): ConversionBreakdownRow => ({
    platform, conversion_name: name, conversion_funnel_group: group, conversion_type: '(unspecified)',
    conversions_all: all, lower_funnel_conversions: lower, upper_funnel_conversions: upper, conversion_value: 0,
  });
  return [
    totals.lower > 0 ? make('Lower Funnel', 'lower_funnel', totals.lower, 0, totals.lower) : null,
    totals.upper > 0 ? make('Upper Funnel', 'upper_funnel', 0, totals.upper, totals.upper) : null,
    excluded > 0 ? make('Excluded', 'excluded', 0, 0, excluded) : null,
  ].filter((r): r is ConversionBreakdownRow => r !== null);
}

function fmtNum(n: number) { return Math.round(n || 0).toLocaleString(); }
function fmtVal(n: number) {
  if (!n) return '—';
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

export function ConversionBreakdownCard({
  platform, start, end, campaigns, publisherPlatforms, className, sourceRows, aggregateAcrossPlatforms = false,
}: Props) {
  const { loading, error, rows } = useConversionBreakdown({ start, end, platform, campaigns, publisherPlatforms });
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
      if (g.includes('lower')) return enabled.lower;
      if (g.includes('upper')) return enabled.upper;
      return enabled.excluded;
    });
  }, [effectiveRows, enabled.lower, enabled.upper, enabled.excluded]);

  const aggregated = useMemo(() => {
    const map = new Map<string, ConversionBreakdownRow>();
    for (const r of filtered) {
      const canonicalName = normalizeConversionName(r.conversion_name);
      const platformKey = aggregateAcrossPlatforms ? '*' : (r.platform || '');
      const key = `${platformKey}::${canonicalName}::${r.conversion_funnel_group}::${r.conversion_type}`;
      const existing = map.get(key);
      if (existing) {
        existing.conversions_all += r.conversions_all || 0;
        existing.lower_funnel_conversions += r.lower_funnel_conversions || 0;
        existing.upper_funnel_conversions += r.upper_funnel_conversions || 0;
        existing.conversion_value += r.conversion_value || 0;
      } else {
        map.set(key, {
          ...r,
          conversion_name: canonicalName,
          conversions_all: r.conversions_all || 0,
          lower_funnel_conversions: r.lower_funnel_conversions || 0,
          upper_funnel_conversions: r.upper_funnel_conversions || 0,
          conversion_value: r.conversion_value || 0,
        });
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
            <p className="text-sm font-semibold tabular-nums">{fmtNum(total)}</p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-1.5 shadow-sm">
            <label className="flex items-center gap-1.5 text-sm font-medium text-card-foreground cursor-pointer select-none">
              <Checkbox checked={enabled.lower} onCheckedChange={() => toggle('lower')} aria-label="Show Lower Funnel" /> Lower Funnel
            </label>
            <label className="flex items-center gap-1.5 text-sm font-medium text-card-foreground cursor-pointer select-none">
              <Checkbox checked={enabled.upper} onCheckedChange={() => toggle('upper')} aria-label="Show Upper Funnel" /> Upper Funnel
            </label>
            <label className="flex items-center gap-1.5 text-sm font-medium text-card-foreground cursor-pointer select-none">
              <Checkbox checked={enabled.excluded} onCheckedChange={() => toggle('excluded')} aria-label="Show Excluded" /> Excluded
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
            {sorted.map((r, i) => (
              <div key={`${r.conversion_name}::${r.conversion_funnel_group}::${r.conversion_type}::${i}`} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <p className="text-[14px] font-semibold text-card-foreground truncate">{r.conversion_name}</p>
                  <span className={cn('inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded border shrink-0', badgeClass(r.conversion_funnel_group))}>
                    {funnelLabel(r.conversion_funnel_group)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-2">{r.conversion_type || '—'}</p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-[12px]">
                  <div><p className="text-muted-foreground">All Conv.</p><p className="font-semibold tabular-nums">{fmtNum(r.conversions_all)}</p></div>
                  <div><p className="text-muted-foreground">Value</p><p className="font-semibold tabular-nums">{fmtVal(r.conversion_value)}</p></div>
                  <div><p className="text-muted-foreground">LF</p><p className="font-semibold tabular-nums">{fmtNum(r.lower_funnel_conversions)}</p></div>
                  <div><p className="text-muted-foreground">UF</p><p className="font-semibold tabular-nums">{fmtNum(r.upper_funnel_conversions)}</p></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Conversion Name</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Funnel</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider">All Conv.</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider">LF Conv.</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider">UF Conv.</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Value</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={`${r.conversion_name}::${r.conversion_funnel_group}::${r.conversion_type}::${i}`} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 text-xs font-medium text-card-foreground">{r.conversion_name}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn('inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded border', badgeClass(r.conversion_funnel_group))}>
                        {funnelLabel(r.conversion_funnel_group)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.conversion_type || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-right tabular-nums font-semibold">{fmtNum(r.conversions_all)}</td>
                    <td className="px-4 py-2.5 text-xs text-right tabular-nums">{fmtNum(r.lower_funnel_conversions)}</td>
                    <td className="px-4 py-2.5 text-xs text-right tabular-nums">{fmtNum(r.upper_funnel_conversions)}</td>
                    <td className="px-4 py-2.5 text-xs text-right tabular-nums text-muted-foreground">{fmtVal(r.conversion_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
