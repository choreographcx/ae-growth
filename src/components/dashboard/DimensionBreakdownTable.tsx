import { useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { CurrencySymbol } from '@/lib/currency';
import { aggregateRows, DashboardDailyRow } from '@/hooks/useDashboardDaily';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface Props {
  rows: DashboardDailyRow[];
  /** Picker for the dimension value (e.g. r => r.audience_type). Falsy values bucket as "Unspecified". */
  pick: (r: DashboardDailyRow) => string | null | undefined;
  title: string;
  subtitle?: string;
  /** When true, hide the row entirely if dimension is null/empty across all rows. */
  hideIfAllUnspecified?: boolean;
  className?: string;
}

const fmtInt = (v: number): string => Math.round(v).toLocaleString();
const fmtMoney = (v: number, decimals = 0): string =>
  v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/**
 * Generic dimension breakdown table. Aggregates spend, lower-funnel conversions,
 * and CPA (LF) by an arbitrary dimension extractor. Used to surface
 * audience_type, campaign_objective, campaign_type, etc.
 *
 * Desktop: dense table. Mobile: stacked cards (one per dimension value).
 */
export function DimensionBreakdownTable({ rows, pick, title, subtitle, hideIfAllUnspecified, className }: Props) {
  const { client } = useDashboard();
  const currency = client.currency;
  const isMobile = useIsMobile();

  const grouped = useMemo(() => {
    const m = new Map<string, DashboardDailyRow[]>();
    const includedRows: DashboardDailyRow[] = [];
    for (const r of rows) {
      const v = pick(r);
      // Explicit null from the picker means "exclude this row entirely"
      // (e.g. market dimension drops rows with no campaign_name).
      if (v === null) continue;
      const key = v && String(v).trim() ? String(v) : 'Unspecified';
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
      includedRows.push(r);
    }
    const totals = aggregateRows(includedRows, 'lower_funnel');
    return Array.from(m.entries()).map(([name, rs]) => {
      const a = aggregateRows(rs, 'lower_funnel');
      return {
        name,
        spend: a.spend,
        share: totals.spend > 0 ? (a.spend / totals.spend) * 100 : 0,
        impressions: a.impressions,
        clicks: a.clicks,
        ctr: a.ctr,
        lfConv: a.conversionsLowerFunnel,
        cpa: a.cpaLowerFunnel,
      };
    })
    .filter(g => g.spend > 0 || g.share > 0 || g.impressions > 0 || g.ctr > 0 || g.lfConv > 0 || g.cpa > 0)
    .sort((a, b) => b.spend - a.spend);
  }, [rows, pick]);

  const allUnspecified = grouped.length === 1 && grouped[0].name === 'Unspecified';
  if (hideIfAllUnspecified && allUnspecified) return null;
  if (!grouped.length) return null;

  const minCpa = Math.min(...grouped.filter(x => x.cpa > 0).map(x => x.cpa));

  return (
    <div className={cn('bg-card rounded-xl border border-border shadow-sm overflow-hidden', className)}>
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>

      {isMobile ? (
        <div className="p-3 space-y-2.5">
          {grouped.map((g) => {
            const winner = g.cpa > 0 && g.cpa === minCpa;
            return (
              <div key={g.name} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <p className="text-[14px] font-semibold text-card-foreground truncate">{g.name}</p>
                  <p className="text-[12px] text-muted-foreground tabular-nums shrink-0">{g.share.toFixed(1)}%</p>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-[12px] text-muted-foreground">Spend</span>
                  <span className="text-[18px] font-bold text-card-foreground tabular-nums inline-flex items-baseline ml-auto">
                    <CurrencySymbol currency={currency} />{fmtMoney(g.spend, 0)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2 border-t border-border/60">
                  <div className="flex justify-between">
                    <span className="text-[12px] text-muted-foreground">Impr.</span>
                    <span className="text-[13px] tabular-nums text-card-foreground">{fmtInt(g.impressions)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[12px] text-muted-foreground">CTR</span>
                    <span className="text-[13px] tabular-nums text-card-foreground">{g.ctr.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[12px] text-muted-foreground">LF Conv.</span>
                    <span className="text-[13px] tabular-nums text-card-foreground">{fmtInt(g.lfConv)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[12px] text-muted-foreground">CPA (LF)</span>
                    <span className={cn('text-[13px] tabular-nums text-card-foreground inline-flex items-baseline', winner && 'text-emerald-600 dark:text-emerald-400 font-semibold')}>
                      {g.cpa > 0 ? <><CurrencySymbol currency={currency} />{fmtMoney(g.cpa, 2)}</> : '—'}
                    </span>
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
              <tr className="border-b border-border bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Dimension</th>
                <th className="px-4 py-3 text-right">Spend</th>
                <th className="px-4 py-3 text-right">% Spend</th>
                <th className="px-4 py-3 text-right">Impr.</th>
                <th className="px-4 py-3 text-right">CTR</th>
                <th className="px-4 py-3 text-right">LF Conv.</th>
                <th className="px-4 py-3 text-right">CPA (LF)</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((g, i) => {
                const winner = g.cpa > 0 && g.cpa === minCpa;
                return (
                  <tr key={g.name} className={cn(
                    'border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors',
                    i % 2 === 1 && 'bg-muted/[0.04]'
                  )}>
                    <td className="px-4 py-3 font-semibold text-card-foreground text-xs">{g.name}</td>
                    <td className="px-4 py-3 text-right text-xs tabular-nums text-card-foreground">
                      <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{fmtMoney(g.spend, 0)}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs tabular-nums text-card-foreground">{g.share.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right text-xs tabular-nums text-card-foreground">{fmtInt(g.impressions)}</td>
                    <td className="px-4 py-3 text-right text-xs tabular-nums text-card-foreground">{g.ctr.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right text-xs tabular-nums text-card-foreground">{fmtInt(g.lfConv)}</td>
                    <td className={cn('px-4 py-3 text-right text-xs tabular-nums text-card-foreground', winner && 'bg-success/[0.08]')}>
                      {g.cpa > 0 ? <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{fmtMoney(g.cpa, 2)}</span> : '—'}
                    </td>
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
