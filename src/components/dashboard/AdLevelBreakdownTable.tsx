import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboard } from '@/context/DashboardContext';
import { CurrencySymbol } from '@/lib/currency';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import {
  DashboardDailyRow,
  normalizePlatform,
} from '@/hooks/useDashboardDaily';
import { PlatformKey } from '@/types/dashboard';
import { platformIconEntries } from '@/lib/platformIcons';

interface AdBreakdownRpcRow {
  platform: string;
  campaign_name: string | null;
  ad_group_id: string | null;
  ad_group_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  impressions: number;
  clicks: number;
  cost: number;
  conversions_lower_funnel: number;
  conversions_all: number;
}

const platformIconBg: Record<PlatformKey, string> = {
  meta:         'bg-blue-50 text-blue-600',
  google:       'bg-emerald-50 text-emerald-600',
  tiktok:       'bg-pink-50 text-pink-600',
  snapchat:     'bg-yellow-50 text-yellow-600',
  x:            'bg-slate-100 text-slate-700',
  linkedin:     'bg-sky-50 text-sky-600',
  programmatic: 'bg-violet-50 text-violet-600',
};

function PlatformIcon({ platform, size = 12 }: { platform: PlatformKey; size?: number }) {
  const entry = platformIconEntries[platform];
  if (entry.type === 'lucide') {
    const Icon = entry.icon;
    return <Icon size={size} />;
  }
  const Comp = entry.Component;
  return <Comp size={size} />;
}

/**
 * Strip redundant naming segments from ad / ad-group names. Since this dashboard
 * is fully scoped to AMEX KSA, segments matching "AMEX" or "KSA" are noise and
 * are removed from the display string. Matching is case-insensitive and only
 * exact segment matches (split by underscore) are dropped.
 */
/**
 * Segments that are redundant given the dashboard's fixed scope (AMEX KSA) or
 * already conveyed by the platform-icon badge to the left of the row name.
 * Matched case-insensitively against exact underscore-separated segments.
 */
const REDUNDANT_SEGMENTS = new Set([
  'amex', 'ksa',
  // platform aliases — already shown via the platform icon
  'tiktok', 'tt', 'sc', 'sc direct', 'snapchat', 'snap',
  'meta', 'fb', 'facebook', 'instagram', 'ig',
  'google', 'google ads', 'gads', 'youtube', 'yt',
  'linkedin', 'li', 'x', 'twitter', 'programmatic', 'dv360',
]);
function cleanAdName(name: string): string {
  if (!name) return name;
  const parts = name.split('_').map(p => p.trim());
  const kept = parts.filter(p => p.length > 0 && !REDUNDANT_SEGMENTS.has(p.toLowerCase()));
  return kept.length > 0 ? kept.join('_') : name;
}

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
  platform: PlatformKey;
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

export function AdLevelBreakdownTable({ rows: _rows, level, platformKey, className, limit = 50 }: Props) {
  const { client, data } = useDashboard();
  const currency = client.currency;
  const isMobile = useIsMobile();

  const start = data.range.start;
  const end = data.range.end;
  const startKey = format(start, 'yyyy-MM-dd');
  const endKey = format(end, 'yyyy-MM-dd');

  const rpcLevel = level === 'ad_group' ? 'ad_group' : 'ad';

  const { data: rpcRows, isLoading, error } = useQuery({
    queryKey: ['dashboard-ad-breakdown', startKey, endKey, rpcLevel, platformKey ?? 'all'],
    queryFn: async (): Promise<AdBreakdownRpcRow[]> => {
      const { data: resp, error: err } = await supabase.rpc('get_dashboard_ad_breakdown', {
        p_start: startKey,
        p_end: endKey,
        p_level: rpcLevel,
        p_platform: platformKey ?? null,
        p_limit: 200,
      });
      if (err) throw new Error(err.message);
      return (resp as AdBreakdownRpcRow[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const aggregated = useMemo<AggRow[]>(() => {
    if (!rpcRows) return [];
    const out: AggRow[] = rpcRows.map((r) => {
      const p = normalizePlatform(r.platform);
      const rawName = level === 'ad_group' ? (r.ad_group_name || '') : (r.ad_name || '');
      const id = level === 'ad_group' ? (r.ad_group_id || '') : (r.ad_id || '');
      const ctr = r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0;
      const cpc = r.clicks > 0 ? r.cost / r.clicks : 0;
      const cpa = r.conversions_lower_funnel > 0 ? r.cost / r.conversions_lower_funnel : 0;
      return {
        key: `${p}::${id}::${rawName.toLowerCase()}`,
        name: cleanAdName(rawName),
        campaignName: cleanAdName(r.campaign_name || '—'),
        platform: p,
        spend: +r.cost || 0,
        shareOfSpend: 0,
        impressions: +r.impressions || 0,
        clicks: +r.clicks || 0,
        ctr,
        cpc,
        conversionsLowerFunnel: +r.conversions_lower_funnel || 0,
        cpa,
      };
    });
    const totalSpend = out.reduce((s, r) => s + r.spend, 0);
    if (totalSpend > 0) for (const r of out) r.shareOfSpend = (r.spend / totalSpend) * 100;
    return out;
  }, [rpcRows, level]);

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

  if (isLoading) {
    return (
      <div className={cn("bg-card rounded-xl border border-border shadow-sm p-6 text-sm text-muted-foreground flex items-center gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin" /> Loading {level === 'ad_group' ? 'ad group' : 'ad'} performance…
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("bg-card rounded-xl border border-border shadow-sm p-6 text-sm text-destructive", className)}>
        Failed to load {level === 'ad_group' ? 'ad group' : 'ad'} data: {(error as Error).message}
      </div>
    );
  }

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
            <div className="flex items-start gap-2 mb-2">
              <span className={cn("flex items-center justify-center w-6 h-6 rounded shrink-0 mt-0.5", platformIconBg[row.platform])}>
                <PlatformIcon platform={row.platform} size={12} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-card-foreground leading-tight truncate" title={row.name}>{row.name}</p>
                <p className="text-[11px] text-muted-foreground leading-tight truncate">{row.campaignName}</p>
              </div>
            </div>
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
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("flex items-center justify-center w-6 h-6 rounded shrink-0", platformIconBg[row.platform])}>
            <PlatformIcon platform={row.platform} size={12} />
          </span>
          <div className="min-w-0">
            <div className="truncate font-semibold text-card-foreground" title={row.name}>{row.name}</div>
            <div className="truncate text-[10px] text-muted-foreground" title={row.campaignName}>{row.campaignName}</div>
          </div>
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
