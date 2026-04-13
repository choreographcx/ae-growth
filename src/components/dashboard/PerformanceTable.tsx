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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground select-none" onClick={() => col.key !== 'name' && col.key !== 'status' && handleSort(col.key)}>
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => (
              <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                    {col.key === 'name' ? (
                      <span className="font-medium text-card-foreground text-xs">{row.name}</span>
                    ) : col.key === 'status' ? (
                      <Badge variant="outline" className={cn("text-xs capitalize", statusColors[row.status])}>{row.status}</Badge>
                    ) : (
                      <span className="text-card-foreground">{col.format(row[col.key])}</span>
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

function MobileCards({ data, title, className }: { data: CampaignRow[]; title?: string; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
      {data.map(row => <MobileRowCard key={row.id} row={row} />)}
    </div>
  );
}

function MobileRowCard({ row }: { row: CampaignRow }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-card-foreground truncate">{row.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={cn("text-xs capitalize", statusColors[row.status])}>{row.status}</Badge>
            <span className="text-xs text-muted-foreground">{row.objective}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <MobileStat label="Spend" value={`$${row.spend.toLocaleString()}`} />
        <MobileStat label="Clicks" value={row.clicks.toLocaleString()} />
        <MobileStat label="Conv." value={row.conversions.toLocaleString()} />
      </div>
      <div className="grid grid-cols-3 gap-3 text-center mt-2">
        <MobileStat label="CTR" value={`${row.ctr}%`} />
        <MobileStat label="CPC" value={`$${row.cpc.toFixed(2)}`} />
        <MobileStat label="CPA" value={row.cpa > 0 ? `$${row.cpa.toFixed(2)}` : '—'} />
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2">
          <MobileStat label="Impressions" value={row.impressions.toLocaleString()} />
          <MobileStat label="Conv. Rate" value={`${row.conversionRate}%`} />
          {row.reach && <MobileStat label="Reach" value={row.reach.toLocaleString()} />}
          {row.frequency && <MobileStat label="Frequency" value={`${row.frequency}`} />}
          {row.videoViews && <MobileStat label="Video Views" value={row.videoViews.toLocaleString()} />}
          {row.completionRate && <MobileStat label="Completion" value={`${row.completionRate}%`} />}
        </div>
      )}
      <button onClick={() => setExpanded(!expanded)} className="mt-3 text-xs font-medium text-primary flex items-center gap-1 mx-auto">
        {expanded ? 'Show less' : 'Show more'}
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
    </div>
  );
}

function MobileStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-card-foreground">{value}</p>
    </div>
  );
}
