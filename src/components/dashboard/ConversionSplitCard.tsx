import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useConversionBreakdown } from '@/hooks/useConversionBreakdown';
import { PlatformKey } from '@/types/dashboard';

interface Props {
  /** Restrict to a single platform. Omit to aggregate across all platforms. */
  platform?: PlatformKey;
  start: Date;
  end: Date;
  campaigns?: string[];
  /** Fallback values used while the breakdown RPC is loading or empty. */
  fallbackLowerFunnel?: number;
  fallbackUpperFunnel?: number;
  className?: string;
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}

/**
 * Side-by-side split of Lower-Funnel vs Upper-Funnel conversions.
 * Sources data from the same breakdown RPC as ConversionBreakdownCard so
 * the two cards always agree on totals.
 */
export function ConversionSplitCard({
  platform,
  start,
  end,
  campaigns,
  fallbackLowerFunnel = 0,
  fallbackUpperFunnel = 0,
  className,
}: Props) {
  const { rows } = useConversionBreakdown({ start, end, platform, campaigns });

  const { lowerFunnel, upperFunnel } = useMemo(() => {
    if (!rows.length) {
      return { lowerFunnel: fallbackLowerFunnel, upperFunnel: fallbackUpperFunnel };
    }
    let lower = 0;
    let upper = 0;
    for (const r of rows) {
      const g = (r.conversion_funnel_group || '').toLowerCase();
      const v = r.conversions_all || 0;
      if (g.includes('lower')) lower += v;
      else if (g.includes('upper')) upper += v;
    }
    return { lowerFunnel: lower, upperFunnel: upper };
  }, [rows, fallbackLowerFunnel, fallbackUpperFunnel]);

  const total = lowerFunnel + upperFunnel;
  const lfPct = total > 0 ? (lowerFunnel / total) * 100 : 0;
  const ufPct = total > 0 ? (upperFunnel / total) * 100 : 0;

  return (
    <div className={cn('bg-card rounded-xl border border-border p-5 shadow-sm', className)}>
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-semibold text-card-foreground">Conversion Mix</h3>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4">
        <div className="rounded-lg bg-blue-500/[0.06] border border-blue-500/20 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-blue-700 dark:text-blue-400">Upper Funnel</p>
          <p className="text-2xl font-bold text-card-foreground tabular-nums mt-1">{fmt(upperFunnel)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{ufPct.toFixed(1)}% of tracked conversions</p>
        </div>
        <div className="rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700 dark:text-emerald-400">Lower Funnel</p>
          <p className="text-2xl font-bold text-card-foreground tabular-nums mt-1">{fmt(lowerFunnel)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{lfPct.toFixed(1)}% of tracked conversions</p>
        </div>
      </div>

      {total > 0 ? (
        <div className="h-2 rounded-full bg-muted/40 overflow-hidden flex">
          <div className="h-full bg-emerald-500/80" style={{ width: `${lfPct}%` }} />
          <div className="h-full bg-blue-500/80"    style={{ width: `${ufPct}%` }} />
        </div>
      ) : (
        <div className="h-2 rounded-full bg-muted/40" />
      )}
    </div>
  );
}
