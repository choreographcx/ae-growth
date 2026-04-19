import { useMemo, useState } from 'react';
import { useConversionBreakdown } from '@/hooks/useConversionBreakdown';
import { PlatformKey } from '@/types/dashboard';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

type FunnelKey = 'lower' | 'upper';

interface Props {
  platform: PlatformKey;
  start: Date;
  end: Date;
  campaigns?: string[];
  className?: string;
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

export function ConversionBreakdownCard({ platform, start, end, campaigns, className }: Props) {
  const { loading, error, rows } = useConversionBreakdown({ start, end, platform, campaigns });
  const isMobile = useIsMobile();
  const [funnelFilter, setFunnelFilter] = useState<FunnelFilter>('both');

  const filtered = useMemo(() => {
    if (funnelFilter === 'both') return rows;
    return rows.filter(r => {
      const g = (r.conversion_funnel_group || '').toLowerCase();
      return funnelFilter === 'lower' ? g.includes('lower') : g.includes('upper');
    });
  }, [rows, funnelFilter]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.conversions_all - a.conversions_all),
    [filtered]
  );
  const total = useMemo(() => sorted.reduce((s, r) => s + (r.conversions_all || 0), 0), [sorted]);

  const showHeader = !loading && !error;

  return (
    <div className={cn('bg-card rounded-xl border border-border shadow-sm overflow-hidden', className)}>
      {showHeader && (
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-sm font-semibold tabular-nums">{Math.round(total).toLocaleString()}</p>
          </div>
          <Select value={funnelFilter} onValueChange={(v) => setFunnelFilter(v as FunnelFilter)}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="Funnel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Both funnels</SelectItem>
              <SelectItem value="lower">Lower funnel</SelectItem>
              <SelectItem value="upper">Upper funnel</SelectItem>
            </SelectContent>
          </Select>
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
          No conversion events recorded for this platform in the selected period.
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
