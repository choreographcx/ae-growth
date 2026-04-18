import { PlatformSummary, PlatformKey, PLATFORM_ORDER } from '@/types/dashboard';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboard } from '@/context/DashboardContext';
import { CurrencySymbol } from '@/lib/currency';
import { platformIconEntries } from '@/lib/platformIcons';

interface PlatformComparisonProps {
  data: PlatformSummary[];
  className?: string;
}

function CurrencyValue({ amount, decimals = 0, currency }: { amount: number; decimals?: number; currency: string }) {
  const formatted = decimals > 0 ? amount.toFixed(decimals) : Math.round(amount).toLocaleString();
  return <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{formatted}</span>;
}

const fmtCompact = (v: number): string => {
  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (v >= 1e6) return `${fmt(v / 1e6)}M`;
  if (v >= 1e3) return `${fmt(v / 1e3)}K`;
  return Math.round(v).toLocaleString();
};

/* ─── Platform tile color tokens (match Overview KPI icon style) ─── */
const platformIconBg: Record<PlatformKey, string> = {
  meta:         'bg-blue-50 text-blue-600',
  google:       'bg-emerald-50 text-emerald-600',
  tiktok:       'bg-pink-50 text-pink-600',
  snapchat:     'bg-yellow-50 text-yellow-600',
  x:            'bg-slate-100 text-slate-700',
  linkedin:     'bg-sky-50 text-sky-600',
  programmatic: 'bg-violet-50 text-violet-600',
};

function PlatformIcon({ platform, size = 16 }: { platform: PlatformKey; size?: number }) {
  const entry = platformIconEntries[platform];
  if (entry.type === 'lucide') {
    const Icon = entry.icon;
    return <Icon size={size} />;
  }
  const Comp = entry.Component;
  return <Comp size={size} />;
}

/* ─── Conditional formatting tints (soft semantic backgrounds) ─── */
function spendVsConvTone(row: PlatformSummary, allSpend: number): 'positive' | 'negative' | undefined {
  if (allSpend === 0 || row.spend === 0) return undefined;
  const lf = row.conversionsLowerFunnel ?? 0;
  if (lf === 0 && row.spend / allSpend >= 0.05) return 'negative';
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
    { key: 'conversionsLowerFunnel', label: 'LF Conv.',     align: 'right', format: v => Math.round(Number(v) || 0).toLocaleString() },
    { key: 'cpa',                    label: 'CPA (LF)',     align: 'right', format: v => v > 0 ? <CurrencyValue amount={v} decimals={2} currency={currency} /> : '—', tone: row => cpaTone(row.cpa, cpaList) },
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

/* ─── Mobile cards — Overview-style KPI tiles, expanded by default ─── */

function MobilePlatformCards({ data, currency, className }: { data: PlatformSummary[]; currency: string; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {data.map(p => <MobilePlatformCard key={p.platform} platform={p} currency={currency} />)}
    </div>
  );
}

function MobilePlatformCard({ platform: p, currency }: { platform: PlatformSummary; currency: string }) {
  const lf = p.conversionsLowerFunnel ?? p.conversions;
  return (
    <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
      <div className="px-3 pt-3 pb-3">
        {/* Header row: icon + platform name */}
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("flex items-center justify-center w-7 h-7 rounded shrink-0", platformIconBg[p.platform])}>
            <PlatformIcon platform={p.platform} size={14} />
          </div>
          <p className="text-[15px] font-semibold text-card-foreground leading-tight truncate flex-1">{p.label}</p>
        </div>

        {/* Spend label + primary value (matches Overview top card style) */}
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-1">Spend</p>
        <p className="text-[28px] font-bold text-card-foreground tracking-tight leading-none mb-3">
          <CurrencyValue amount={p.spend} currency={currency} />
        </p>

        {/* Always-expanded supporting grid */}
        <div className="grid grid-cols-2 gap-px bg-border/30 rounded overflow-hidden">
          <KpiTile label="LF Conv." value={Math.round(lf).toLocaleString()} />
          <KpiTile label="CPA (LF)" value={p.cpa > 0 ? <CurrencyValue amount={p.cpa} decimals={2} currency={currency} /> : '—'} />
          <KpiTile label="CTR" value={`${p.ctr.toFixed(2)}%`} />
          <KpiTile label="CPC" value={<CurrencyValue amount={p.cpc} decimals={2} currency={currency} />} />
          <KpiTile label="Impr." value={fmtCompact(p.impressions)} />
          <KpiTile label="Clicks" value={fmtCompact(p.clicks)} />
          <KpiTile label="% Spend" value={`${p.shareOfSpend.toFixed(1)}%`} />
          <KpiTile label="% LF Conv." value={`${p.shareOfConversions.toFixed(1)}%`} />
        </div>
      </div>
    </div>
  );
}

function KpiTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-card px-2.5 py-2">
      <p className="text-[12px] text-muted-foreground uppercase tracking-wider leading-tight mb-1">{label}</p>
      <p className="text-[14px] font-semibold text-card-foreground leading-none">{value}</p>
    </div>
  );
}
