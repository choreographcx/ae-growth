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
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {cols.map(c => (
                <th key={c.key} className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground select-none transition-colors" onClick={() => c.key !== 'label' && handleSort(c.key)}>
                  <div className="flex items-center gap-1">
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
                  <td key={c.key} className={cn("px-4 py-3 whitespace-nowrap text-xs", c.key === 'label' ? 'font-semibold text-card-foreground' : 'text-card-foreground')}>
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

function MobilePlatformCards({ data, className }: { data: PlatformSummary[]; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[13px] font-semibold text-foreground">Platform Comparison</h3>
        <span className="text-[10px] text-muted-foreground">{data.length} platforms</span>
      </div>
      {data.map(p => <MobilePlatformCard key={p.platform} platform={p} />)}
    </div>
  );
}

function MobilePlatformCard({ platform: p }: { platform: PlatformSummary }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-semibold text-card-foreground">{p.label}</p>
          <p className="text-[12px] font-bold text-card-foreground">${p.spend.toLocaleString()}</p>
        </div>
        <div className="grid grid-cols-3 gap-px bg-border/30 rounded overflow-hidden">
          <div className="bg-card px-3 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-1">Conv.</p>
            <p className="text-[13px] font-semibold text-card-foreground leading-none">{p.conversions.toLocaleString()}</p>
          </div>
          <div className="bg-card px-3 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-1">CPA</p>
            <p className="text-[13px] font-semibold text-card-foreground leading-none">${p.cpa.toFixed(2)}</p>
          </div>
          <div className="bg-card px-3 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-1">CTR</p>
            <p className="text-[13px] font-semibold text-card-foreground leading-none">{p.ctr}%</p>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-border/50">
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">CPC</span>
              <span className="text-[12px] font-semibold text-card-foreground">${p.cpc.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Clicks</span>
              <span className="text-[12px] font-semibold text-card-foreground">{p.clicks.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Conv. Rate</span>
              <span className="text-[12px] font-semibold text-card-foreground">{p.conversionRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">% of Spend</span>
              <span className="text-[12px] font-semibold text-card-foreground">{p.shareOfSpend}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Impressions</span>
              <span className="text-[12px] font-semibold text-card-foreground">{p.impressions >= 1e6 ? `${(p.impressions / 1e6).toFixed(1)}M` : p.impressions.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">% of Conv.</span>
              <span className="text-[12px] font-semibold text-card-foreground">{p.shareOfConversions}%</span>
            </div>
          </div>
        </div>
      )}
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
