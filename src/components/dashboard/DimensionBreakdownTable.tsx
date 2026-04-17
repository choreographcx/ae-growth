import { useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { CurrencySymbol } from '@/lib/currency';
import { aggregateRows, DashboardDailyRow } from '@/hooks/useDashboardDaily';
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

const fmtCompact = (v: number): string => {
  const f = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (v >= 1e6) return `${f(v / 1e6)}M`;
  if (v >= 1e3) return `${f(v / 1e3)}K`;
  return Math.round(v).toLocaleString();
};

/**
 * Generic dimension breakdown table. Aggregates spend, lower-funnel conversions,
 * CPA (LF) and ROAS by an arbitrary dimension extractor. Used to surface
 * audience_type, campaign_objective, campaign_type, etc.
 */
export function DimensionBreakdownTable({ rows, pick, title, subtitle, hideIfAllUnspecified, className }: Props) {
  const { client } = useDashboard();
  const currency = client.currency;

  const grouped = useMemo(() => {
    const m = new Map<string, DashboardDailyRow[]>();
    for (const r of rows) {
      const v = pick(r);
      const key = v && String(v).trim() ? String(v) : 'Unspecified';
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    const totals = aggregateRows(rows, 'lower_funnel');
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
        roas: a.roas,
      };
    }).sort((a, b) => b.spend - a.spend);
  }, [rows, pick]);

  const allUnspecified = grouped.length === 1 && grouped[0].name === 'Unspecified';
  if (hideIfAllUnspecified && allUnspecified) return null;
  if (!grouped.length) return null;

  return (
    <div className={cn('bg-card rounded-xl border border-border shadow-sm overflow-hidden', className)}>
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
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
              <th className="px-4 py-3 text-right">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((g, i) => {
              const wasted = g.spend > 0 && g.lfConv === 0 && g.share >= 5;
              const winner = g.cpa > 0 && g.cpa === Math.min(...grouped.filter(x => x.cpa > 0).map(x => x.cpa));
              return (
                <tr key={g.name} className={cn(
                  'border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors',
                  i % 2 === 1 && 'bg-muted/[0.04]'
                )}>
                  <td className="px-4 py-3 font-semibold text-card-foreground text-xs">{g.name}</td>
                  <td className={cn('px-4 py-3 text-right text-xs tabular-nums text-card-foreground', wasted && 'bg-destructive/[0.08]')}>
                    <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{fmtCompact(g.spend)}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums text-card-foreground">{g.share.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums text-card-foreground">{fmtCompact(g.impressions)}</td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums text-card-foreground">{g.ctr.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums text-card-foreground">{fmtCompact(g.lfConv)}</td>
                  <td className={cn('px-4 py-3 text-right text-xs tabular-nums text-card-foreground', winner && 'bg-success/[0.08]')}>
                    {g.cpa > 0 ? <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{g.cpa.toFixed(2)}</span> : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums text-card-foreground">{g.roas > 0 ? `${g.roas.toFixed(2)}x` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
