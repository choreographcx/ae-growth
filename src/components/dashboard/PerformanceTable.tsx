import { CampaignRow } from '@/types/dashboard';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CurrencySymbol } from '@/lib/currency';
import { useDashboard } from '@/context/DashboardContext';

interface PerformanceTableProps {
  data: CampaignRow[];
  title?: string;
  className?: string;
}

const statusColors = {
  active: 'bg-success/10 text-success border-success/20',
  paused: 'bg-warning/10 text-warning border-warning/20',
  completed: 'bg-muted text-muted-foreground border-border',
};

function CurrencyValue({ amount, decimals = 0, currency }: { amount: number; decimals?: number; currency: string }) {
  const formatted = decimals > 0 ? amount.toFixed(decimals) : amount.toLocaleString();
  return (
    <span className="inline-flex items-baseline">
      <CurrencySymbol currency={currency} />
      {formatted}
    </span>
  );
}


export function PerformanceTable({ data, title, className }: PerformanceTableProps) {
  const isMobile = useIsMobile();
  const { client } = useDashboard();
  const currency = client.currency;
  const [sortKey, setSortKey] = useState<keyof CampaignRow>('spend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number);
  });


  const handleSort = (key: keyof CampaignRow) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  if (isMobile) return <MobileCards data={sorted} title={title} currency={currency} className={className} />;

  

  const columns: { key: keyof CampaignRow; label: string; format: (v: any) => React.ReactNode; align?: 'right' }[] = [
    { key: 'name', label: 'Campaign', format: v => v },
    { key: 'status', label: 'Status', format: v => v },
    { key: 'spend', label: 'Spend', format: v => <CurrencyValue amount={v} currency={currency} />, align: 'right' },
    { key: 'impressions', label: 'Impr.', format: v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v.toLocaleString(), align: 'right' },
    { key: 'clicks', label: 'Clicks', format: v => v.toLocaleString(), align: 'right' },
    { key: 'ctr', label: 'CTR', format: v => `${v}%`, align: 'right' },
    { key: 'cpc', label: 'CPC', format: v => <CurrencyValue amount={v} decimals={2} currency={currency} />, align: 'right' },
    { key: 'conversions', label: 'Conv.', format: v => v.toLocaleString(), align: 'right' },
    { key: 'cpa', label: 'CPA', format: v => v > 0 ? <CurrencyValue amount={v} decimals={2} currency={currency} /> : '—', align: 'right' },
    { key: 'conversionRate', label: 'Conv. Rate', format: v => `${v}%`, align: 'right' },
  ];

  return (
    <div className={cn("bg-card rounded-xl border border-border shadow-sm overflow-hidden", className)}>
      {title && <div className="px-5 py-3.5 border-b border-border"><h3 className="text-sm font-semibold text-card-foreground">{title}</h3></div>}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground select-none transition-colors",
                    col.align === 'right' ? 'text-right' : 'text-left'
                  )}
                  onClick={() => col.key !== 'name' && col.key !== 'status' && handleSort(col.key)}
                >
                  <div className={cn("flex items-center gap-1", col.align === 'right' && "justify-end")}>
                    {col.label}
                    {sortKey === col.key && (sortDir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, rowIdx) => (
              <tr key={row.id} className={cn(
                "border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors",
                rowIdx % 2 === 1 && "bg-muted/[0.04]"
              )}>
                {columns.map(col => (
                  <td key={col.key} className={cn(
                    "px-4 py-2.5 whitespace-nowrap",
                    col.align === 'right' && 'text-right'
                  )}>
                    {col.key === 'name' ? (
                      <span className="font-medium text-card-foreground text-xs">{row.name}</span>
                    ) : col.key === 'status' ? (
                      <Badge variant="outline" className={cn("text-[10px] capitalize px-1.5 py-0", statusColors[row.status])}>{row.status}</Badge>
                    ) : (
                      <span className={cn("text-card-foreground text-xs tabular-nums", col.key === 'spend' && "font-semibold")}>{col.format(row[col.key])}</span>
                    )}
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

/* ─── Mobile Card Layout ─── */

function MobileCards({ data, title, currency, className }: { data: CampaignRow[]; title?: string; currency: string; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {title && (
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
          <span className="text-[10px] text-muted-foreground">{data.length} items</span>
        </div>
      )}
      {data.map(row => <MobileRowCard key={row.id} row={row} currency={currency} />)}
    </div>
  );
}

function MobileRowCard({ row, currency }: { row: CampaignRow; currency: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
      <div className="px-3 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-card-foreground leading-snug truncate">{row.name}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wider">{row.objective}</p>
        </div>
        <Badge variant="outline" className={cn("text-[9px] capitalize shrink-0 px-1.5 py-0", statusColors[row.status])}>{row.status}</Badge>
      </div>
      <div className="px-3 pb-2">
        <div className="grid grid-cols-3 gap-px bg-border/30 rounded overflow-hidden">
          <MCell label="Spend" value={<CurrencyValue amount={row.spend} currency={currency} />} bold />
          <MCell label="Clicks" value={row.clicks.toLocaleString()} />
          <MCell label="Conv." value={row.conversions.toLocaleString()} />
        </div>
        <div className="grid grid-cols-3 gap-px bg-border/30 overflow-hidden mt-px">
          <MCell label="CTR" value={`${row.ctr}%`} />
          <MCell label="CPC" value={<CurrencyValue amount={row.cpc} decimals={2} currency={currency} />} />
          <MCell label="CPA" value={row.cpa > 0 ? <CurrencyValue amount={row.cpa} decimals={2} currency={currency} /> : '—'} />
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-2 pt-1.5 border-t border-border/40">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <DRow label="Impressions" value={row.impressions >= 1e6 ? `${(row.impressions / 1e6).toFixed(1)}M` : row.impressions.toLocaleString()} />
            <DRow label="Conv. Rate" value={`${row.conversionRate}%`} />
            {row.reach != null && <DRow label="Reach" value={row.reach >= 1e6 ? `${(row.reach / 1e6).toFixed(1)}M` : row.reach.toLocaleString()} />}
            {row.frequency != null && <DRow label="Frequency" value={`${row.frequency}`} />}
            {row.videoViews != null && <DRow label="Video Views" value={row.videoViews.toLocaleString()} />}
            {row.completionRate != null && <DRow label="Completion" value={`${row.completionRate}%`} />}
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

function MCell({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className="bg-card px-2 py-2 text-center">
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">{label}</p>
      <p className={cn("leading-none", bold ? "text-[13px] font-bold text-card-foreground" : "text-[12px] font-semibold text-card-foreground")}>{value}</p>
    </div>
  );
}

function DRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[11px] font-semibold text-card-foreground">{value}</span>
    </div>
  );
}
