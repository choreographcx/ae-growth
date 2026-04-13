import { CampaignRow } from '@/types/dashboard';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

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

export function PerformanceTable({ data, title, className }: PerformanceTableProps) {
  const isMobile = useIsMobile();
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

  if (isMobile) return <MobileCards data={sorted} title={title} className={className} />;

  const columns: { key: keyof CampaignRow; label: string; format: (v: any) => string }[] = [
    { key: 'name', label: 'Campaign', format: v => v },
    { key: 'status', label: 'Status', format: v => v },
    { key: 'spend', label: 'Spend', format: v => `$${v.toLocaleString()}` },
    { key: 'impressions', label: 'Impr.', format: v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v.toLocaleString() },
    { key: 'clicks', label: 'Clicks', format: v => v.toLocaleString() },
    { key: 'ctr', label: 'CTR', format: v => `${v}%` },
    { key: 'cpc', label: 'CPC', format: v => `$${v.toFixed(2)}` },
    { key: 'conversions', label: 'Conv.', format: v => v.toLocaleString() },
    { key: 'cpa', label: 'CPA', format: v => v > 0 ? `$${v.toFixed(2)}` : '—' },
    { key: 'conversionRate', label: 'Conv. Rate', format: v => `${v}%` },
  ];

  return (
    <div className={cn("bg-card rounded-xl border border-border shadow-sm overflow-hidden", className)}>
      {title && <div className="px-5 py-4 border-b border-border"><h3 className="text-sm font-semibold text-card-foreground">{title}</h3></div>}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground select-none transition-colors" onClick={() => col.key !== 'name' && col.key !== 'status' && handleSort(col.key)}>
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (sortDir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => (
              <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                    {col.key === 'name' ? (
                      <span className="font-medium text-card-foreground text-xs">{row.name}</span>
                    ) : col.key === 'status' ? (
                      <Badge variant="outline" className={cn("text-[10px] capitalize px-1.5 py-0", statusColors[row.status])}>{row.status}</Badge>
                    ) : (
                      <span className="text-card-foreground text-xs">{col.format(row[col.key])}</span>
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

function MobileCards({ data, title, className }: { data: CampaignRow[]; title?: string; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="text-[10px] text-muted-foreground">{data.length} items</span>
        </div>
      )}
      {data.map(row => <MobileRowCard key={row.id} row={row} />)}
    </div>
  );
}

function MobileRowCard({ row }: { row: CampaignRow }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-semibold text-card-foreground leading-tight flex-1 min-w-0">{row.name}</p>
          <Badge variant="outline" className={cn("text-[10px] capitalize shrink-0 px-1.5 py-0", statusColors[row.status])}>{row.status}</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{row.objective}</p>
      </div>

      {/* Primary metrics grid */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-3 gap-px bg-border/40 rounded-lg overflow-hidden">
          <MetricCell label="Spend" value={`$${row.spend.toLocaleString()}`} emphasis />
          <MetricCell label="Clicks" value={row.clicks.toLocaleString()} />
          <MetricCell label="Conv." value={row.conversions.toLocaleString()} />
        </div>
        <div className="grid grid-cols-3 gap-px bg-border/40 overflow-hidden mt-px rounded-b-lg">
          <MetricCell label="CTR" value={`${row.ctr}%`} />
          <MetricCell label="CPC" value={`$${row.cpc.toFixed(2)}`} />
          <MetricCell label="CPA" value={row.cpa > 0 ? `$${row.cpa.toFixed(2)}` : '—'} />
        </div>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-border/50">
          <div className="grid grid-cols-2 gap-3 py-2">
            <DetailRow label="Impressions" value={row.impressions >= 1e6 ? `${(row.impressions / 1e6).toFixed(1)}M` : row.impressions.toLocaleString()} />
            <DetailRow label="Conv. Rate" value={`${row.conversionRate}%`} />
            {row.reach != null && <DetailRow label="Reach" value={row.reach >= 1e6 ? `${(row.reach / 1e6).toFixed(1)}M` : row.reach.toLocaleString()} />}
            {row.frequency != null && <DetailRow label="Frequency" value={`${row.frequency}`} />}
            {row.videoViews != null && <DetailRow label="Video Views" value={row.videoViews.toLocaleString()} />}
            {row.completionRate != null && <DetailRow label="Completion" value={`${row.completionRate}%`} />}
          </div>
        </div>
      )}

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground hover:text-primary border-t border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors"
      >
        {expanded ? 'Less' : 'More details'}
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
    </div>
  );
}

function MetricCell({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="bg-card px-3 py-2.5 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-1">{label}</p>
      <p className={cn("leading-none", emphasis ? "text-[15px] font-bold text-card-foreground" : "text-[13px] font-semibold text-card-foreground")}>{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-[12px] font-semibold text-card-foreground">{value}</span>
    </div>
  );
}
