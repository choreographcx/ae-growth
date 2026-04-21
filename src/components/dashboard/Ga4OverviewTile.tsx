import { useMemo } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useDashboard } from '@/context/DashboardContext';
import { useGa4Report } from '@/hooks/useGa4Report';
import { Link } from 'react-router-dom';

function formatCompact(n: number): string {
  if (!isFinite(n)) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

/**
 * Compact GA4 strip for the Overview page — sessions, users, engaged sessions,
 * conversions. Renders nothing if no GA4 property is configured.
 */
export function Ga4OverviewTile() {
  const { client, data: dashData } = useDashboard();
  const { start, end } = dashData.range;

  // Only show if a GA4 property id is configured.
  const ga4PropertyId = (client as any)?.ga4PropertyId
    ?? (client as any)?.reporting?.ga4PropertyId
    ?? null;
  // We don't strictly need the id client-side (edge function resolves it),
  // but we hide the tile if the field is empty.
  const enabled = true; // always attempt; backend returns 400 if not configured.

  const q = useGa4Report({
    startDate: start, endDate: end,
    dimensions: [],
    metrics: ['sessions', 'totalUsers', 'engagedSessions', 'conversions'],
    enabled,
  });

  const totals = q.data?.totals ?? [];
  const headers = q.data?.metricHeaders ?? [];
  const get = (name: string) => {
    const i = headers.indexOf(name);
    return i >= 0 ? totals[i] ?? 0 : 0;
  };

  // Hide the strip entirely if backend says no property configured.
  if (q.error && /No GA4 property/i.test((q.error as Error).message)) return null;

  return (
    <Card className="border-border/60">
      <CardContent className="p-3 md:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Globe className="h-3.5 w-3.5" /> Web Analytics (GA4)
          </div>
          <Link to="/ga4" className="text-xs text-primary hover:underline">View details →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-3">
          <Stat label="Sessions"        value={formatCompact(get('sessions'))}        loading={q.isLoading} />
          <Stat label="Users"           value={formatCompact(get('totalUsers'))}      loading={q.isLoading} />
          <Stat label="Engaged"         value={formatCompact(get('engagedSessions'))} loading={q.isLoading} />
          <Stat label="Conversions"     value={formatCompact(get('conversions'))}     loading={q.isLoading} />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-lg font-semibold tabular-nums mt-0.5">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin inline" /> : value}
      </div>
    </div>
  );
}
