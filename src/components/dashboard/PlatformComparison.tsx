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
  return (
    <span className="inline-flex items-baseline">
      <CurrencySymbol currency={currency} />
      {formatted}
    </span>
  );
}

export function PlatformComparison({ data, className }: PlatformComparisonProps) {
  const isMobile = useIsMobile();
  const { client } = useDashboard();
  const currency = client.currency;
  const [sortKey, setSortKey] = useState<keyof PlatformSummary>('spend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = [...data].sort((a, b) => sortDir === 'desc' ? (b[sortKey] as number) - (a[sortKey] as number) : (a[sortKey] as number) - (b[sortKey] as number));

  const handleSort = (key: keyof PlatformSummary) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  if (isMobile) return <MobilePlatformCards data={sorted} currency={currency} className={className} />;

  const cols: { key: keyof PlatformSummary; label: string; format: (v: any) => React.ReactNode }[] = [
    { key: 'label', label: 'Platform', format: v => v },
    { key: 'spend', label: 'Spend', format: v => <CurrencyValue amount={v} currency={currency} /> },
    { key: 'impressions', label: 'Impr.', format: v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v.toLocaleString() },
    { key: 'clicks', label: 'Clicks', format: v => v.toLocaleString() },
    { key: 'ctr', label: 'CTR', format: v => `${v}%` },
    { key: 'cpc', label: 'CPC', format: v => <CurrencyValue amount={v} decimals={2} currency={currency} /> },
    { key: 'conversions', label: 'Conv.', format: v => v.toLocaleString() },
    { key: 'cpa', label: 'CPA', format: v => <CurrencyValue amount={v} decimals={2} currency={currency} /> },
    { key: 'conversionRate', label: 'Conv. Rate', format: v => `${v}%` },
    { key: 'shareOfSpend', label: '% Spend', format: v => `${v}%` },
    { key: 'shareOfConversions', label: '% Conv.', format: v => `${v}%` },
  ];

  return (
    <div className={cn("bg-card rounded-xl border border-border shadow-sm overflow-hidden", className)}>
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground">Platform Comparison</h3>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {cols.map(c => (
                <th
                  key={c.key}
                  className={cn(
                    "px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground select-none transition-colors",
                    c.key === 'label' ? 'text-left' : 'text-right'
                  )}
                  onClick={() => c.key !== 'label' && handleSort(c.key)}
                >
                  <div className={cn("flex items-center gap-1", c.key !== 'label' && 'justify-end')}>
                    {c.label}
                    {sortKey === c.key && (sortDir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => (
              <tr key={row.platform} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                {cols.map(c => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-4 py-3 whitespace-nowrap text-xs tabular-nums",
                      c.key === 'label' ? 'font-semibold text-card-foreground text-left' : 'text-card-foreground text-right'
                    )}
                  >
                    {c.format(row[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Mobile Platform Cards ─── */

function MobilePlatformCards({ data, currency, className }: { data: PlatformSummary[]; currency: string; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[13px] font-semibold text-foreground">Platform Comparison</h3>
        <span className="text-[10px] text-muted-foreground">{data.length} platforms</span>
      </div>
      {data.map(p => <MobilePlatformCard key={p.platform} platform={p} currency={currency} />)}
    </div>
  );
}

function MobilePlatformCard({ platform: p, currency }: { platform: PlatformSummary; currency: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-semibold text-card-foreground">{p.label}</p>
          <p className="text-[12px] font-bold text-card-foreground"><CurrencyValue amount={p.spend} currency={currency} /></p>
        </div>
        <div className="grid grid-cols-3 gap-px bg-border/30 rounded overflow-hidden">
          <div className="bg-card px-2 py-2 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">Conv.</p>
            <p className="text-[12px] font-semibold text-card-foreground leading-none">{p.conversions.toLocaleString()}</p>
          </div>
          <div className="bg-card px-2 py-2 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">CPA</p>
            <p className="text-[12px] font-semibold text-card-foreground leading-none"><CurrencyValue amount={p.cpa} decimals={2} currency={currency} /></p>
          </div>
          <div className="bg-card px-2 py-2 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">CTR</p>
            <p className="text-[12px] font-semibold text-card-foreground leading-none">{p.ctr}%</p>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-2 pt-1.5 border-t border-border/40">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">CPC</span>
              <span className="text-[11px] font-semibold text-card-foreground"><CurrencyValue amount={p.cpc} decimals={2} currency={currency} /></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Clicks</span>
              <span className="text-[11px] font-semibold text-card-foreground">{p.clicks.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Conv. Rate</span>
              <span className="text-[11px] font-semibold text-card-foreground">{p.conversionRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">% Spend</span>
              <span className="text-[11px] font-semibold text-card-foreground">{p.shareOfSpend}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Impr.</span>
              <span className="text-[11px] font-semibold text-card-foreground">{p.impressions >= 1e6 ? `${(p.impressions / 1e6).toFixed(1)}M` : p.impressions.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">% Conv.</span>
              <span className="text-[11px] font-semibold text-card-foreground">{p.shareOfConversions}%</span>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground hover:text-primary border-t border-border/30 bg-muted/15 transition-colors"
      >
        {expanded ? 'Less' : 'More'}
        {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>
    </div>
  );
}
