import { Globe, Loader2 } from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { useGa4Report } from '@/hooks/useGa4Report';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

function formatCompact(n: number): string {
  if (!isFinite(n)) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

/**
 * GA4 web-analytics tile shaped to drop into the Overview KPI grid as a
 * single cell — visually matches KPIGroupCard.
 */
export function Ga4OverviewTile() {
  const { client, data: dashData } = useDashboard();
  const { start, end } = dashData.range;

  const propertyId = (client.ga4PropertyId || '').trim();
  const enabled = propertyId.length > 0;

  const q = useGa4Report({
    propertyId: propertyId || undefined,
    startDate: start, endDate: end,
    dimensions: [],
    metrics: ['sessions', 'totalUsers', 'engagedSessions', 'conversions'],
    enabled,
  });

  if (!enabled) return null;
  if (q.error && /No GA4 property/i.test((q.error as Error).message)) return null;

  const totals = q.data?.totals ?? [];
  const headers = q.data?.metricHeaders ?? [];
  const get = (name: string) => {
    const i = headers.indexOf(name);
    return i >= 0 ? totals[i] ?? 0 : 0;
  };

  const sessions = get('sessions');
  const users = get('totalUsers');
  const engaged = get('engagedSessions');
  const conversions = get('conversions');

  return (
    <>
      {/* Desktop card — matches DesktopKPICard layout */}
      <div className="hidden lg:flex bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-all duration-300 flex-col">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-1 min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Web Analytics (GA4)</p>
          </div>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg text-sky-600 bg-sky-50">
            <Globe size={16} />
          </div>
        </div>

        <p className="text-[26px] font-bold text-card-foreground tracking-tight leading-none">
          {q.isLoading ? <Loader2 className="h-5 w-5 animate-spin inline" /> : formatCompact(users)}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1.5">Users</p>

        <div className="mt-auto pt-3.5 border-t border-border/50 mt-3.5">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <Stat label="Sessions"    value={formatCompact(sessions)}    loading={q.isLoading} />
            <Stat label="Engaged"     value={formatCompact(engaged)}     loading={q.isLoading} />
            <Stat label="Conversions" value={formatCompact(conversions)} loading={q.isLoading} />
            <div className="flex items-end justify-end">
              <Link to="/ga4" className="text-[11px] text-primary hover:underline">Details →</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile card — matches MobileKPICard layout */}
      <div className="lg:hidden bg-card rounded-lg border border-border px-3 py-3 shadow-sm min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center w-7 h-7 rounded shrink-0 text-sky-600 bg-sky-50">
            <Globe size={14} />
          </div>
          <p className="text-[14px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight truncate flex-1 min-w-0">Web Analytics (GA4)</p>
          <Link to="/ga4" className="text-[11px] text-primary hover:underline shrink-0">Details →</Link>
        </div>
        <p className="text-[30px] font-bold text-card-foreground tracking-tight leading-none mt-2 truncate">
          {q.isLoading ? <Loader2 className="h-6 w-6 animate-spin inline" /> : formatCompact(users)}
        </p>
        <p className="text-[12px] text-muted-foreground mt-1">Users</p>
        <div className="mt-2.5 pt-2 border-t border-border/30 grid gap-x-3 gap-y-1.5 grid-cols-2 min-w-0">
          <StatMobile label="Sessions"    value={formatCompact(sessions)} />
          <StatMobile label="Engaged"     value={formatCompact(engaged)} />
          <StatMobile label="Conversions" value={formatCompact(conversions)} />
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-1 truncate">{label}</p>
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className="text-[15px] font-semibold text-card-foreground leading-none truncate">
          {loading ? <Loader2 className="h-3 w-3 animate-spin inline" /> : value}
        </span>
      </div>
    </div>
  );
}

function StatMobile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex flex-col leading-tight gap-0.5">
      <span className="text-[14px] text-muted-foreground tracking-wide truncate">{label}</span>
      <span className="text-[14px] font-semibold text-card-foreground truncate">{value}</span>
    </div>
  );
}
