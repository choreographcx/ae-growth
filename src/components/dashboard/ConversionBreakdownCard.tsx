import { useMemo, useState } from 'react';
import { useConversionBreakdown } from '@/hooks/useConversionBreakdown';
import { PlatformKey } from '@/types/dashboard';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDashboard } from '@/context/DashboardContext';
import { DEFAULT_CONVERSION_SUPPRESSION } from '@/components/admin/ReportingRulesSection';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface Props {
  platform: PlatformKey;
  start: Date;
  end: Date;
  campaigns?: string[];
  className?: string;
  /** Conversion event names to hide (e.g. duplicates of other events). Case-insensitive. */
  suppressNames?: string[];
}

const FUNNEL_BADGE: Record<string, string> = {
  lower: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  upper: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
};

function badgeClass(group: string) {
  const g = group.toLowerCase();
  if (g.includes('lower')) return FUNNEL_BADGE.lower;
  if (g.includes('upper')) return FUNNEL_BADGE.upper;
  return 'bg-muted text-muted-foreground border-border';
}

function funnelKind(group: string): 'lower' | 'upper' | 'other' {
  const g = (group || '').toLowerCase();
  if (g.includes('lower')) return 'lower';
  if (g.includes('upper')) return 'upper';
  return 'other';
}

export function ConversionBreakdownCard({ platform, start, end, campaigns, className, suppressNames }: Props) {
  const { client } = useDashboard();
  const suppressedConversions = useMemo(() => {
    const reporting = (client as any)?.reporting ?? {};
    const configured = reporting.conversionSuppression as Partial<Record<PlatformKey, string[]>> | undefined;
    return { ...DEFAULT_CONVERSION_SUPPRESSION, ...(configured ?? {}) };
  }, [client]);
  const { loading, error, rows } = useConversionBreakdown({ start, end, platform, campaigns, suppressedConversions });
  const isMobile = useIsMobile();

  const [showLower, setShowLower] = useState(true);
  const [showUpper, setShowUpper] = useState(true);

  const platformCampaigns = useMemo(() => {
    if (!campaigns?.length) return undefined;
    return campaigns;
  }, [campaigns]);

  const suppressSet = useMemo(
    () => new Set((suppressNames || []).map(n => n.trim().toLowerCase())),
    [suppressNames]
  );

  const filtered = useMemo(() => rows.filter(r => {
    if (suppressSet.has((r.conversion_name || '').trim().toLowerCase())) return false;
    const k = funnelKind(r.conversion_funnel_group);
    if (k === 'lower') return showLower;
    if (k === 'upper') return showUpper;
    return showLower || showUpper;
  }), [rows, showLower, showUpper, suppressSet]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.conversions_all - a.conversions_all),
    [filtered]
  );
  const total = useMemo(() => sorted.reduce((s, r) => s + (r.conversions_all || 0), 0), [sorted]);

  return (
    <div className={cn('bg-card rounded-xl border border-border shadow-sm overflow-hidden', className)}>
      {!loading && !error && rows.length > 0 && (
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-sm font-semibold tabular-nums">{Math.round(total).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
              <Checkbox
                checked={showUpper}
                onCheckedChange={(v) => setShowUpper(!!v)}
                disabled={!showLower}
              />
              Upper Funnel
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
              <Checkbox
                checked={showLower}
                onCheckedChange={(v) => setShowLower(!!v)}
                disabled={!showUpper}
              />
              Lower Funnel
            </label>
          </div>
        </div>
      )}

      {error && (
        <div className="px-5 py-4 text-xs text-destructive">Failed to load breakdown: {error}</div>
      )}
      {loading && (
        <div className="px-5 py-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading breakdown…
        </div>
      )}
      {!loading && !error && sorted.length === 0 && (
        <div className="px-5 py-6 text-xs text-muted-foreground">
          No conversion events to display for the selected funnel filter.
        </div>
      )}

      {!loading && !error && sorted.length > 0 && (
        isMobile ? (
          <div className="p-3 space-y-2.5">
            {sorted.map((r, i) => {
              const pct = total > 0 ? (r.conversions_all / total) * 100 : 0;
              return (
                <div key={`${r.conversion_name}::${r.conversion_funnel_group}::${i}`} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <p className="text-[14px] font-semibold text-card-foreground truncate">{r.conversion_name}</p>
                    <span className={cn('inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded border shrink-0', badgeClass(r.conversion_funnel_group))}>
                      {r.conversion_funnel_group}
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
                          {r.conversion_funnel_group}
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
