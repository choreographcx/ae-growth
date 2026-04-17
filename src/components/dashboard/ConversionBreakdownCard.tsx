import { useMemo } from 'react';
import { useConversionBreakdown } from '@/hooks/useConversionBreakdown';
import { PlatformKey } from '@/types/dashboard';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.conversions_all - a.conversions_all),
    [rows]
  );
  const total = useMemo(() => sorted.reduce((s, r) => s + (r.conversions_all || 0), 0), [sorted]);

  return (
    <div className={cn('bg-card rounded-xl border border-border shadow-sm overflow-hidden', className)}>
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">Conversion Breakdown</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">All tracked conversion events for this platform.</p>
        </div>
        {!loading && !error && total > 0 && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-sm font-semibold tabular-nums">{total.toLocaleString()}</p>
          </div>
        )}
      </div>

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
      )}
    </div>
  );
}
