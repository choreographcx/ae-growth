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
import { platformIconEntries } from '@/lib/platformIcons';

const PLATFORM_LABELS: Record<PlatformKey, string> = {
  meta: 'Meta', google: 'Google Ads', tiktok: 'TikTok', snapchat: 'Snapchat',
  x: 'X', linkedin: 'LinkedIn', programmatic: 'Programmatic',
};

interface CampaignRow {
  key: string;
  campaignName: string;
  platform: PlatformKey | null;
  platformLabel: string;
  spend: number;
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

const platformIconBg: Record<PlatformKey, string> = {
  meta:         'bg-blue-50 text-blue-600',
  google:       'bg-emerald-50 text-emerald-600',
  tiktok:       'bg-pink-50 text-pink-600',
  snapchat:     'bg-yellow-50 text-yellow-600',
  x:            'bg-slate-100 text-slate-700',
  linkedin:     'bg-sky-50 text-sky-600',
  programmatic: 'bg-violet-50 text-violet-600',
};

function PlatformIcon({ platform, size = 14 }: { platform: PlatformKey; size?: number }) {
  const entry = platformIconEntries[platform];
  if (entry.type === 'lucide') {
    const Icon = entry.icon;
    return <Icon size={size} />;
  }
  const Comp = entry.Component;
  return <Comp size={size} />;
}

interface CampaignPerformanceProps {
  /** Optional limit for the number of campaigns shown. Defaults to 25. */
  limit?: number;
  className?: string;
}

export function CampaignPerformance({ limit = 25, className }: CampaignPerformanceProps) {
  const { client, data } = useDashboard();
  const currency = client.currency;
  const isMobile = useIsMobile();

  const campaigns = useMemo<CampaignRow[]>(() => {
    const buckets = new Map<string, DashboardDailyRow[]>();
    for (const r of data.rows) {
      const name = r.campaign_name?.trim();
      if (!name) continue;
      const platformKey = normalizePlatform(r.platform);
      const key = `${platformKey ?? 'other'}::${name}`;
      let arr = buckets.get(key);
      if (!arr) { arr = []; buckets.set(key, arr); }
      arr.push(r);
    }

    const out: CampaignRow[] = [];
    buckets.forEach((rows, key) => {
      const a = aggregateRows(rows, 'all');
      const platformKey = normalizePlatform(rows[0].platform);
      out.push({
        key,
        campaignName: rows[0].campaign_name || '—',
        platform: platformKey,
        platformLabel: platformKey ? PLATFORM_LABELS[platformKey] : (rows[0].platform || '—'),
        spend: a.spend,
        impressions: a.impressions,
        clicks: a.clicks,
        ctr: a.ctr,
        cpc: a.cpc,
        conversionsLowerFunnel: a.conversionsLowerFunnel,
        cpa: a.cpaLowerFunnel,
      });
    });
    return out;
  }, [data.rows]);

  const [sortKey, setSortKey] = useState<keyof CampaignRow>('spend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    const list = [...campaigns];
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
  }, [campaigns, sortKey, sortDir, limit]);

  const handleSort = (key: keyof CampaignRow) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir(typeof campaigns[0]?.[key] === 'string' ? 'asc' : 'desc'); }
  };

  if (campaigns.length === 0) {
    return (
      <div className={cn("bg-card rounded-xl border border-border shadow-sm p-6 text-sm text-muted-foreground", className)}>
        No campaign data available for the current selection.
      </div>
    );
  }

  if (isMobile) {
    return <MobileCampaignCards data={sorted} currency={currency} className={className} />;
  }

  type Col = {
    key: keyof CampaignRow;
    label: string;
    align?: 'right';
    format: (row: CampaignRow) => React.ReactNode;
  };

  const cols: Col[] = [
    {
      key: 'campaignName', label: 'Campaign', format: row => (
        <div className="flex items-center gap-2 min-w-0">
          {row.platform && (
            <span className={cn("flex items-center justify-center w-6 h-6 rounded shrink-0", platformIconBg[row.platform])}>
              <PlatformIcon platform={row.platform} size={12} />
            </span>
          )}
          <span className="truncate" title={row.campaignName}>{row.campaignName}</span>
        </div>
      ),
    },
    { key: 'platformLabel',           label: 'Platform',  format: row => row.platformLabel },
    { key: 'spend',                   label: 'Spend',     align: 'right', format: row => <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{fmtCompact(row.spend)}</span> },
    { key: 'impressions',             label: 'Impr.',     align: 'right', format: row => fmtCompact(row.impressions) },
    { key: 'clicks',                  label: 'Clicks',    align: 'right', format: row => fmtCompact(row.clicks) },
    { key: 'ctr',                     label: 'CTR',       align: 'right', format: row => `${row.ctr.toFixed(2)}%` },
    { key: 'cpc',                     label: 'CPC',       align: 'right', format: row => <CurrencyValue amount={row.cpc} decimals={2} currency={currency} /> },
    { key: 'conversionsLowerFunnel',  label: 'LF Conv.',  align: 'right', format: row => Math.round(row.conversionsLowerFunnel).toLocaleString() },
    { key: 'cpa',                     label: 'CPA (LF)',  align: 'right', format: row => row.cpa > 0 ? <CurrencyValue amount={row.cpa} decimals={2} currency={currency} /> : '—' },
  ];

  return (
    <div className={cn("bg-card rounded-xl border border-border shadow-sm overflow-hidden", className)}>
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-card-foreground">Campaign Performance</h3>
        <p className="text-xs text-muted-foreground">
          Top {Math.min(sorted.length, limit)} of {campaigns.length} campaigns
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
                      c.key === 'campaignName'
                        ? 'font-semibold text-card-foreground text-left max-w-[320px]'
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

/* ─── Mobile cards ─── */

function MobileCampaignCards({ data, currency, className }: { data: CampaignRow[]; currency: string; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {data.map(row => (
        <div key={row.key} className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="px-3 pt-3 pb-3">
            <div className="flex items-center gap-2 mb-2">
              {row.platform && (
                <div className={cn("flex items-center justify-center w-7 h-7 rounded shrink-0", platformIconBg[row.platform])}>
                  <PlatformIcon platform={row.platform} size={14} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-card-foreground leading-tight truncate" title={row.campaignName}>{row.campaignName}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{row.platformLabel}</p>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-1">Spend</p>
            <p className="text-[24px] font-bold text-card-foreground tracking-tight leading-none mb-3">
              <CurrencyValue amount={row.spend} currency={currency} />
            </p>

            <div className="grid grid-cols-2 gap-px bg-border/30 rounded overflow-hidden">
              <KpiTile label="LF Conv." value={Math.round(row.conversionsLowerFunnel).toLocaleString()} />
              <KpiTile label="CPA (LF)" value={row.cpa > 0 ? <CurrencyValue amount={row.cpa} decimals={2} currency={currency} /> : '—'} />
              <KpiTile label="CTR" value={`${row.ctr.toFixed(2)}%`} />
              <KpiTile label="CPC" value={<CurrencyValue amount={row.cpc} decimals={2} currency={currency} />} />
              <KpiTile label="Impr." value={fmtCompact(row.impressions)} />
              <KpiTile label="Clicks" value={fmtCompact(row.clicks)} />
            </div>
          </div>
        </div>
      ))}
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
