import { PlatformSummary } from '@/types/dashboard';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboard } from '@/context/DashboardContext';
import { CurrencySymbol } from '@/lib/currency';

interface PlatformComparisonProps {
  data: PlatformSummary[];
  className?: string;
}

function CurrencyValue({ amount, decimals = 0, currency }: { amount: number; decimals?: number; currency: string }) {
  const formatted = decimals > 0 ? amount.toFixed(decimals) : amount.toLocaleString();
  return <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{formatted}</span>;
}

const fmtCompact = (v: number): string => {
  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (v >= 1e6) return `${fmt(v / 1e6)}M`;
  if (v >= 1e3) return `${fmt(v / 1e3)}K`;
  return Math.round(v).toLocaleString();
};

/* ─── Conditional formatting tints (soft semantic backgrounds) ───
   Applied per-cell based on simple performance heuristics. */

function spendVsConvTone(row: PlatformSummary, allSpend: number): 'positive' | 'negative' | undefined {
  if (allSpend === 0 || row.spend === 0) return undefined;
  const lf = row.conversionsLowerFunnel ?? 0;
  // High spend + zero LF conversions = wasted spend
  if (lf === 0 && row.spend / allSpend >= 0.05) return 'negative';
  return undefined;
}
function roasTone(roas?: number): 'positive' | 'negative' | undefined {
  if (roas == null || roas === 0) return undefined;
  if (roas >= 2) return 'positive';
  if (roas < 1) return 'negative';
  return undefined;
}
function cpaTone(cpa: number, all: number[]): 'positive' | 'negative' | undefined {
  const valid = all.filter(v => v > 0);
  if (!valid.length || cpa === 0) return undefined;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (cpa === min) return 'positive';
  if (cpa === max && cpa > min * 1.5) return 'negative';
  return undefined;
}
const toneClass: Record<'positive' | 'negative', string> = {
  positive: 'bg-success/[0.08]',
  negative: 'bg-destructive/[0.08]',
};

export function PlatformComparison({ data, className }: PlatformComparisonProps) {
  const isMobile = useIsMobile();
  const { client } = useDashboard();
  const currency = client.currency;
  const [sortKey, setSortKey] = useState<keyof PlatformSummary>('spend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = [...data].sort((a, b) => {
    const av = (a[sortKey] as number) ?? 0;
    const bv = (b[sortKey] as number) ?? 0;
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  const totalSpend = data.reduce((s, p) => s + p.spend, 0);
  const cpaList    = data.map(p => p.cpa).filter(v => v > 0);

  const handleSort = (key: keyof PlatformSummary) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  if (isMobile) return <MobilePlatformCards data={sorted} currency={currency} className={className} />;

  type Col = {
    key: keyof PlatformSummary;
    label: string;
    format: (v: any, row: PlatformSummary) => React.ReactNode;
    align?: 'right';
    tone?: (row: PlatformSummary) => 'positive' | 'negative' | undefined;
  };

  const cols: Col[] = [
    { key: 'label',                  label: 'Platform',     format: v => v },
    { key: 'spend',                  label: 'Spend',        align: 'right', format: v => <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{fmtCompact(v)}</span>, tone: row => spendVsConvTone(row, totalSpend) },
    { key: 'impressions',            label: 'Impr.',        align: 'right', format: v => fmtCompact(v) },
    { key: 'clicks',                 label: 'Clicks',       align: 'right', format: v => fmtCompact(v) },
    { key: 'ctr',                    label: 'CTR',          align: 'right', format: v => `${Number(v).toFixed(2)}%` },
    { key: 'cpc',                    label: 'CPC',          align: 'right', format: v => <CurrencyValue amount={v} decimals={2} currency={currency} /> },
    { key: 'conversionsLowerFunnel', label: 'LF Conv.',     align: 'right', format: v => fmtCompact(Number(v) || 0) },
    { key: 'cpa',                    label: 'CPA (LF)',     align: 'right', format: v => v > 0 ? <CurrencyValue amount={v} decimals={2} currency={currency} /> : '—', tone: row => cpaTone(row.cpa, cpaList) },
    { key: 'roas',                   label: 'ROAS',         align: 'right', format: v => v != null && v > 0 ? `${Number(v).toFixed(2)}x` : '—', tone: row => roasTone(row.roas) },
    { key: 'shareOfSpend',           label: '% Spend',      align: 'right', format: v => `${Number(v).toFixed(1)}%` },
    { key: 'shareOfConversions',     label: '% LF Conv.',   align: 'right', format: v => `${Number(v).toFixed(1)}%` },
  ];

  return (
    <div className={cn("bg-card rounded-xl border border-border shadow-sm overflow-hidden", className)}>
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground">Platform Performance</h3>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {cols.map(c => (
                <th
                  key={c.key as string}
                  className={cn(
                    "px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground select-none transition-colors",
                    c.align === 'right' ? 'text-right' : 'text-left'
                  )}
                  onClick={() => c.key !== 'label' && handleSort(c.key)}
                >
                  <div className={cn("flex items-center gap-1", c.align === 'right' && 'justify-end')}>
                    {c.label}
                    {sortKey === c.key && (sortDir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, rowIdx) => (
              <tr key={row.platform} className={cn(
                "border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors",
                rowIdx % 2 === 1 && "bg-muted/[0.04]"
              )}>
                {cols.map(c => {
                  const tone = c.tone?.(row);
                  return (
                    <td
                      key={c.key as string}
                      className={cn(
                        "px-4 py-3 whitespace-nowrap text-xs tabular-nums",
                        c.key === 'label' ? 'font-semibold text-card-foreground text-left' : 'text-card-foreground text-right',
                        tone && toneClass[tone],
                      )}
                    >
                      {c.format((row as any)[c.key], row)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Mobile cards (compact summary) ─── */

function MobilePlatformCards({ data, currency, className }: { data: PlatformSummary[]; currency: string; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {data.map(p => <MobilePlatformCard key={p.platform} platform={p} currency={currency} />)}
    </div>
  );
}

function MobilePlatformCard({ platform: p, currency }: { platform: PlatformSummary; currency: string }) {
  const [expanded, setExpanded] = useState(false);
  const lf = p.conversionsLowerFunnel ?? p.conversions;
  return (
    <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
      <div className="px-3 pt-3 pb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[15px] font-semibold text-card-foreground">{p.label}</p>
        </div>
        <p className="text-[28px] font-bold text-card-foreground tracking-tight leading-none mb-3"><CurrencyValue amount={p.spend} currency={currency} /></p>
        <div className="grid grid-cols-3 gap-px bg-border/30 rounded overflow-hidden">
          <div className="bg-card px-2 py-2 text-center">
            <p className="text-[12px] text-muted-foreground uppercase tracking-wider leading-tight mb-1">LF Conv.</p>
            <p className="text-[14px] font-semibold text-card-foreground leading-none">{lf.toLocaleString()}</p>
          </div>
          <div className="bg-card px-2 py-2 text-center">
            <p className="text-[12px] text-muted-foreground uppercase tracking-wider leading-tight mb-1">CPA</p>
            <p className="text-[14px] font-semibold text-card-foreground leading-none">{p.cpa > 0 ? <CurrencyValue amount={p.cpa} decimals={2} currency={currency} /> : '—'}</p>
          </div>
          <div className="bg-card px-2 py-2 text-center">
            <p className="text-[12px] text-muted-foreground uppercase tracking-wider leading-tight mb-1">ROAS</p>
            <p className="text-[14px] font-semibold text-card-foreground leading-none">{p.roas != null && p.roas > 0 ? `${p.roas.toFixed(2)}x` : '—'}</p>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-2 pt-2 border-t border-border/40">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <DRow label="CTR" value={`${p.ctr.toFixed(2)}%`} />
            <DRow label="CPC" value={<CurrencyValue amount={p.cpc} decimals={2} currency={currency} />} />
            <DRow label="Impr." value={fmtCompact(p.impressions)} />
            <DRow label="Clicks" value={fmtCompact(p.clicks)} />
            <DRow label="% Spend" value={`${p.shareOfSpend.toFixed(1)}%`} />
            <DRow label="% LF Conv." value={`${p.shareOfConversions.toFixed(1)}%`} />
          </div>
        </div>
      )}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-0.5 py-2 text-[12px] font-medium text-muted-foreground hover:text-primary border-t border-border/30 bg-muted/15 transition-colors"
      >
        {expanded ? 'Less' : 'More'}
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
    </div>
  );
}

function DRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-semibold text-card-foreground">{value}</span>
    </div>
  );
}
