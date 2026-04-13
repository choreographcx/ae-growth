import { PlatformSummary } from '@/types/dashboard';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlatformComparisonProps {
  data: PlatformSummary[];
  className?: string;
}

export function PlatformComparison({ data, className }: PlatformComparisonProps) {
  const isMobile = useIsMobile();
  const [sortKey, setSortKey] = useState<keyof PlatformSummary>('spend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = [...data].sort((a, b) => sortDir === 'desc' ? (b[sortKey] as number) - (a[sortKey] as number) : (a[sortKey] as number) - (b[sortKey] as number));

  const handleSort = (key: keyof PlatformSummary) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  if (isMobile) return <MobilePlatformCards data={sorted} className={className} />;

  const cols: { key: keyof PlatformSummary; label: string; format: (v: any) => string }[] = [
    { key: 'label', label: 'Platform', format: v => v },
    { key: 'spend', label: 'Spend', format: v => `$${v.toLocaleString()}` },
    { key: 'impressions', label: 'Impr.', format: v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v.toLocaleString() },
    { key: 'clicks', label: 'Clicks', format: v => v.toLocaleString() },
    { key: 'ctr', label: 'CTR', format: v => `${v}%` },
    { key: 'cpc', label: 'CPC', format: v => `$${v.toFixed(2)}` },
    { key: 'conversions', label: 'Conv.', format: v => v.toLocaleString() },
    { key: 'cpa', label: 'CPA', format: v => `$${v.toFixed(2)}` },
    { key: 'conversionRate', label: 'Conv. Rate', format: v => `${v}%` },
    { key: 'shareOfSpend', label: '% Spend', format: v => `${v}%` },
    { key: 'shareOfConversions', label: '% Conv.', format: v => `${v}%` },
  ];

  return (
    <div className={cn("bg-card rounded-xl border border-border shadow-sm overflow-hidden", className)}>
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground">Platform Comparison</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {cols.map(c => (
                <th key={c.key} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground select-none" onClick={() => c.key !== 'label' && handleSort(c.key)}>
                  <div className="flex items-center gap-1">
                    {c.label}
                    {sortKey === c.key && (sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => (
              <tr key={row.platform} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                {cols.map(c => (
                  <td key={c.key} className={cn("px-4 py-3 whitespace-nowrap", c.key === 'label' ? 'font-medium text-card-foreground' : 'text-card-foreground')}>
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

function MobilePlatformCards({ data, className }: { data: PlatformSummary[]; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-sm font-semibold text-foreground">Platform Comparison</h3>
      {data.map(p => (
        <MobilePlatformCard key={p.platform} platform={p} />
      ))}
    </div>
  );
}

function MobilePlatformCard({ platform: p }: { platform: PlatformSummary }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
      <p className="text-sm font-semibold text-card-foreground mb-2">{p.label}</p>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div><p className="text-xs text-muted-foreground">Spend</p><p className="text-sm font-bold text-card-foreground">${p.spend.toLocaleString()}</p></div>
        <div><p className="text-xs text-muted-foreground">Conv.</p><p className="text-sm font-bold text-card-foreground">{p.conversions.toLocaleString()}</p></div>
        <div><p className="text-xs text-muted-foreground">CPA</p><p className="text-sm font-bold text-card-foreground">${p.cpa.toFixed(2)}</p></div>
      </div>
      {expanded && (
        <div className="grid grid-cols-3 gap-3 text-center mt-2 pt-2 border-t border-border">
          <div><p className="text-xs text-muted-foreground">CTR</p><p className="text-sm font-semibold text-card-foreground">{p.ctr}%</p></div>
          <div><p className="text-xs text-muted-foreground">CPC</p><p className="text-sm font-semibold text-card-foreground">${p.cpc.toFixed(2)}</p></div>
          <div><p className="text-xs text-muted-foreground">% Spend</p><p className="text-sm font-semibold text-card-foreground">{p.shareOfSpend}%</p></div>
        </div>
      )}
      <button onClick={() => setExpanded(!expanded)} className="mt-2 text-xs font-medium text-primary flex items-center gap-1 mx-auto">
        {expanded ? 'Less' : 'More'} {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
    </div>
  );
}
