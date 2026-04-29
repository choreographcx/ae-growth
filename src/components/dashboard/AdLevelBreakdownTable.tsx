import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboard } from '@/context/DashboardContext';
import { CurrencySymbol } from '@/lib/currency';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DashboardDailyRow,
  aggregateRows,
  normalizePlatform,
} from '@/hooks/useDashboardDaily';
import { PlatformKey } from '@/types/dashboard';

type Level = 'ad_group' | 'ad';

interface Props {
  rows: DashboardDailyRow[];
  level: Level;
  /** When set, only include rows for this normalized platform. */
  platformKey?: PlatformKey;
  className?: string;
  /** Top-N cap. Defaults to 50. */
  limit?: number;
}

interface AggRow {
  key: string;
  name: string;
  campaignName: string;
  spend: number;
  shareOfSpend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversionsLowerFunnel: number;
  cpa: number;
}

const fmtCompact = (v: number): string => {
  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (v >= 1e6) return `${fmt(v / 1e6)}M`;
  if (v >= 1e3) return `${fmt(v / 1e3)}K`;
  return Math.round(v).toLocaleString();
};

function CurrencyValue({ amount, decimals = 0, currency }: { amount: number; decimals?: number; currency: string }) {
  const formatted = decimals > 0 ? amount.toFixed(decimals) : Math.round(amount).toLocaleString();
  return <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{formatted}</span>;
}

export function AdLevelBreakdownTable({ rows, level, platformKey, className, limit = 50 }: Props) {
  const { client } = useDashboard();
  const currency = client.currency;
  const isMobile = useIsMobile();

  const aggregated = useMemo<AggRow[]>(() => {
    const buckets = new Map<string, DashboardDailyRow[]>();
    for (const r of rows) {
      if (platformKey) {
        const p = normalizePlatform(r.platform);
        if (p !== platformKey) continue;
      }
      const name = level === 'ad_group'
        ? (r.ad_group_name || '').trim()
        : (r.ad_name || '').trim();
      if (!name) continue;
      const id = level === 'ad_group' ? (r.ad_group_id || '') : (r.ad_id || '');
      const key = `${id}::${name.toLowerCase()}`;
      let arr = buckets.get(key);
      if (!arr) { arr = []; buckets.set(key, arr); }
      arr.push(r);
    }
    const out: AggRow[] = [];
    buckets.forEach((rs, key) => {
      const a = aggregateRows(rs, 'all');
      const name = level === 'ad_group'
        ? (rs[0].ad_group_name || '').trim()
        : (rs[0].ad_name || '').trim();
      const campaignNames = Array.from(new Set(rs.map(r => r.campaign_name).filter(Boolean))) as string[];
      out.push({
        key,
        name,
        campaignName: campaignNames.length > 1 ? `${campaignNames.length} campaigns` : (campaignNames[0] || '—'),
        spend: a.spend,
        shareOfSpend: 0,
        impressions: a.impressions,
        clicks: a.clicks,
        ctr: a.ctr,
        cpc: a.cpc,
        conversionsLowerFunnel: a.conversionsLowerFunnel,
        cpa: a.cpaLowerFunnel,
      });
    });
    const filtered = out.filter(r =>
      r.spend > 0 || r.impressions > 0 || r.clicks > 0 || r.conversionsLowerFunnel > 0
    );
    const totalSpend = filtered.reduce((s, r) => s + r.spend, 0);
    if (totalSpend > 0) for (const r of filtered) r.shareOfSpend = (r.spend / totalSpend) * 100;
    return filtered;
  }, [rows, platformKey, level]);

  const [sortKey, setSortKey] = useState<keyof AggRow>('spend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    const list = [...aggregated];
    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' || typeof bv === 'string') {
        const cmp = String(av ?? '').localeCompare(String(bv ?? ''));
        return sortDir === 'desc' ? -cmp : cmp;
      }
      const an = (av as number) ?? 0;
      const bn = (bv as number) ?? 0;
      return sortDir === 'desc' ? bn - an : an - bn;
    });
    return list.slice(0, limit);
  }, [aggregated, sortKey, sortDir, limit]);

  const handleSort = (key: keyof AggRow) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir(typeof aggregated[0]?.[key] === 'string' ? 'asc' : 'desc'); }
  };

  if (aggregated.length === 0) {
    return (
      <div className={cn("bg-card rounded-xl border border-border shadow-sm p-6 text-sm text-muted-foreground", className)}>
        No {level === 'ad_group' ? 'ad group' : 'ad'} data available for the current selection.
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className={cn("space-y-2.5", className)}>
        {sorted.map(row => (
          <div key={row.key} className="bg-card rounded-lg border border-border shadow-sm overflow-hidden p-3">
            <p className="text-[14px] font-semibold text-card-foreground leading-tight truncate" title={row.name}>{row.name}</p>
            <p className="text-[11px] text-muted-foreground leading-tight truncate mb-2">{row.campaignName}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-1">Spend</p>
            <p className="text-[24px] font-bold text-card-foreground tracking-tight leading-none mb-3">
              <CurrencyValue amount={row.spend} currency={currency} />
            </p>
            <div className="grid grid-cols-2 gap-px bg-border/30 rounded overflow-hidden">
              <Tile label="LF Conv." value={Math.round(row.conversionsLowerFunnel).toLocaleString()} />
              <Tile label="CPA (LF)" value={row.cpa > 0 ? <CurrencyValue amount={row.cpa} decimals={2} currency={currency} /> : '—'} />
              <Tile label="CTR" value={`${row.ctr.toFixed(2)}%`} />
              <Tile label="CPC" value={<CurrencyValue amount={row.cpc} decimals={2} currency={currency} />} />
              <Tile label="Impr." value={fmtCompact(row.impressions)} />
              <Tile label="Clicks" value={fmtCompact(row.clicks)} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  type Col = { key: keyof AggRow; label: string; align?: 'right'; format: (row: AggRow) => React.ReactNode };
  const cols: Col[] = [
    { key: 'name', label: level === 'ad_group' ? 'Ad Group' : 'Ad', format: row => (
        <div className="min-w-0">
          <div className="truncate font-semibold text-card-foreground" title={row.name}>{row.name}</div>
          <div className="truncate text-[10px] text-muted-foreground" title={row.campaignName}>{row.campaignName}</div>
        </div>
      ) },
    { key: 'spend',                   label: 'Spend',     align: 'right', format: row => <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{fmtCompact(row.spend)}</span> },
    { key: 'shareOfSpend',            label: '% Spend',   align: 'right', format: row => `${row.shareOfSpend.toFixed(1)}%` },
    { key: 'impressions',             label: 'Impr.',     align: 'right', format: row => fmtCompact(row.impressions) },
    { key: 'clicks',                  label: 'Clicks',    align: 'right', format: row => fmtCompact(row.clicks) },
    { key: 'ctr',                     label: 'CTR',       align: 'right', format: row => `${row.ctr.toFixed(2)}%` },
    { key: 'cpc',                     label: 'CPC',       align: 'right', format: row => <CurrencyValue amount={row.cpc} decimals={2} currency={currency} /> },
    { key: 'conversionsLowerFunnel',  label: 'LF Conv.',  align: 'right', format: row => Math.round(row.conversionsLowerFunnel).toLocaleString() },
    { key: 'cpa',                     label: 'CPA (LF)',  align: 'right', format: row => row.cpa > 0 ? <CurrencyValue amount={row.cpa} decimals={2} currency={currency} /> : '—' },
  ];

  const titleText = level === 'ad_group' ? 'Ad Group Performance' : 'Ad Performance';

  return (
    <div className={cn("bg-card rounded-xl border border-border shadow-sm overflow-hidden", className)}>
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-card-foreground">{titleText}</h3>
        <p className="text-xs text-muted-foreground">
          Top {Math.min(sorted.length, limit)} of {aggregated.length}
        </p>
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
                  onClick={() => handleSort(c.key)}
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
              <tr key={row.key} className={cn(
                "border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors",
                rowIdx % 2 === 1 && "bg-muted/[0.04]"
              )}>
                {cols.map(c => (
                  <td
                    key={c.key as string}
                    className={cn(
                      "px-4 py-3 text-xs tabular-nums",
                      c.key === 'name'
                        ? 'text-left max-w-[320px]'
                        : 'text-card-foreground whitespace-nowrap',
                      c.align === 'right' ? 'text-right' : 'text-left',
                    )}
                  >
                    {c.format(row)}
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

function Tile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-card px-2.5 py-2">
      <p className="text-[12px] text-muted-foreground uppercase tracking-wider leading-tight mb-1">{label}</p>
      <p className="text-[14px] font-semibold text-card-foreground leading-none">{value}</p>
    </div>
  );
}
