import { useMemo } from 'react';
import { Loader2, Globe } from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { useGa4Report } from '@/hooks/useGa4Report';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { TrendChartCard } from '@/components/dashboard/TrendChartCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parse } from 'date-fns';

function formatCompact(n: number): string {
  if (!isFinite(n)) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds - m * 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function Tile({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}

export default function Ga4Page() {
  const { data: dashData } = useDashboard();
  const { start, end } = dashData.range;

  const totalsQ = useGa4Report({
    startDate: start, endDate: end,
    dimensions: ['date'],
    metrics: [
      'sessions', 'totalUsers', 'newUsers', 'engagedSessions',
      'engagementRate', 'averageSessionDuration', 'bounceRate',
      'screenPageViews', 'conversions', 'totalRevenue',
    ],
  });

  const channelsQ = useGa4Report({
    startDate: start, endDate: end,
    dimensions: ['sessionDefaultChannelGroup'],
    metrics: ['sessions', 'totalUsers', 'engagedSessions', 'conversions', 'totalRevenue'],
    orderBys: [{ metric: 'sessions', desc: true }],
    limit: 20,
  });

  const sourcesQ = useGa4Report({
    startDate: start, endDate: end,
    dimensions: ['sessionSource', 'sessionMedium'],
    metrics: ['sessions', 'totalUsers', 'engagementRate', 'conversions'],
    orderBys: [{ metric: 'sessions', desc: true }],
    limit: 20,
  });

  const pagesQ = useGa4Report({
    startDate: start, endDate: end,
    dimensions: ['pagePath'],
    metrics: ['screenPageViews', 'totalUsers', 'averageSessionDuration', 'bounceRate'],
    orderBys: [{ metric: 'screenPageViews', desc: true }],
    limit: 20,
  });

  const totals = totalsQ.data?.totals ?? [];
  const headers = totalsQ.data?.metricHeaders ?? [];
  const t = (name: string) => {
    const i = headers.indexOf(name);
    return i >= 0 ? totals[i] ?? 0 : 0;
  };

  const sessionSeries = useMemo(() => {
    const rows = totalsQ.data?.rows ?? [];
    const sIdx = (totalsQ.data?.metricHeaders ?? []).indexOf('sessions');
    return rows
      .map(r => ({
        date: r.dimensions[0],
        value: sIdx >= 0 ? r.metrics[sIdx] : 0,
      }))
      .filter(p => p.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(p => {
        // GA4 returns YYYYMMDD
        const d = parse(p.date, 'yyyyMMdd', new Date());
        return { date: format(d, 'MMM d'), value: p.value };
      });
  }, [totalsQ.data]);

  const usersSeries = useMemo(() => {
    const rows = totalsQ.data?.rows ?? [];
    const uIdx = (totalsQ.data?.metricHeaders ?? []).indexOf('totalUsers');
    return rows
      .map(r => ({ date: r.dimensions[0], value: uIdx >= 0 ? r.metrics[uIdx] : 0 }))
      .filter(p => p.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(p => {
        const d = parse(p.date, 'yyyyMMdd', new Date());
        return { date: format(d, 'MMM d'), value: p.value };
      });
  }, [totalsQ.data]);

  const anyError = totalsQ.error || channelsQ.error || sourcesQ.error || pagesQ.error;
  const loading = totalsQ.isLoading;

  return (
    <div className="space-y-5 md:space-y-7">
      <SectionHeader title="Web Analytics (GA4)" subtitle="Live data from the GA4 Data API" showMobileDatePicker />

      {anyError && (
        <div className="text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded-md px-3 py-2">
          Failed to load GA4 data: {(anyError as Error).message}
        </div>
      )}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading GA4 data…
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-3">
        <Tile label="Sessions"          value={formatCompact(t('sessions'))} />
        <Tile label="Users"             value={formatCompact(t('totalUsers'))} subtitle={`New: ${formatCompact(t('newUsers'))}`} />
        <Tile label="Engaged Sessions"  value={formatCompact(t('engagedSessions'))} subtitle={`${(t('engagementRate') * 100).toFixed(1)}% rate`} />
        <Tile label="Avg Session"       value={formatDuration(t('averageSessionDuration'))} subtitle={`${(t('bounceRate') * 100).toFixed(1)}% bounce`} />
        <Tile label="Page Views"        value={formatCompact(t('screenPageViews'))} />
        <Tile label="Conversions"       value={formatCompact(t('conversions'))} />
        <Tile label="Revenue"           value={formatCompact(t('totalRevenue'))} />
      </div>

      {/* Trends */}
      <div className="space-y-2.5 md:space-y-3">
        <SectionHeader title="Trends" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
          <TrendChartCard title="Sessions" data={sessionSeries} color="hsl(var(--chart-1))" />
          <TrendChartCard title="Users"    data={usersSeries}   color="hsl(var(--chart-2))" />
        </div>
      </div>

      {/* Channels */}
      <div className="space-y-2.5 md:space-y-3">
        <SectionHeader title="Channel Groups" subtitle="Default channel grouping reported by GA4" />
        <Ga4Table
          query={channelsQ}
          columns={[
            { header: 'Channel',   render: r => r.dimensions[0] || '(unassigned)' },
            { header: 'Sessions',  render: r => formatCompact(r.metrics[0]), align: 'right' },
            { header: 'Users',     render: r => formatCompact(r.metrics[1]), align: 'right' },
            { header: 'Engaged',   render: r => formatCompact(r.metrics[2]), align: 'right' },
            { header: 'Conv.',     render: r => formatCompact(r.metrics[3]), align: 'right' },
            { header: 'Revenue',   render: r => formatCompact(r.metrics[4]), align: 'right' },
          ]}
        />
      </div>

      {/* Source / Medium */}
      <div className="space-y-2.5 md:space-y-3">
        <SectionHeader title="Source / Medium" subtitle="Top traffic sources" />
        <Ga4Table
          query={sourcesQ}
          columns={[
            { header: 'Source',      render: r => r.dimensions[0] || '(direct)' },
            { header: 'Medium',      render: r => r.dimensions[1] || '(none)' },
            { header: 'Sessions',    render: r => formatCompact(r.metrics[0]), align: 'right' },
            { header: 'Users',       render: r => formatCompact(r.metrics[1]), align: 'right' },
            { header: 'Engagement',  render: r => `${(r.metrics[2] * 100).toFixed(1)}%`, align: 'right' },
            { header: 'Conv.',       render: r => formatCompact(r.metrics[3]), align: 'right' },
          ]}
        />
      </div>

      {/* Top pages */}
      <div className="space-y-2.5 md:space-y-3">
        <SectionHeader title="Top Pages" subtitle="Most viewed paths in the selected range" />
        <Ga4Table
          query={pagesQ}
          columns={[
            { header: 'Page',         render: r => r.dimensions[0] },
            { header: 'Views',        render: r => formatCompact(r.metrics[0]), align: 'right' },
            { header: 'Users',        render: r => formatCompact(r.metrics[1]), align: 'right' },
            { header: 'Avg Time',     render: r => formatDuration(r.metrics[2]), align: 'right' },
            { header: 'Bounce',       render: r => `${(r.metrics[3] * 100).toFixed(1)}%`, align: 'right' },
          ]}
        />
      </div>
    </div>
  );
}

interface Ga4Column {
  header: string;
  render: (row: { dimensions: string[]; metrics: number[] }) => React.ReactNode;
  align?: 'left' | 'right';
}

function Ga4Table({
  query, columns,
}: {
  query: ReturnType<typeof useGa4Report>;
  columns: Ga4Column[];
}) {
  const rows = query.data?.rows ?? [];
  if (query.isLoading) {
    return (
      <Card><CardContent className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </CardContent></Card>
    );
  }
  if (rows.length === 0) {
    return (
      <Card><CardContent className="p-6 text-sm text-muted-foreground flex items-center gap-2">
        <Globe className="h-4 w-4" /> No data for this range.
      </CardContent></Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead className="text-xs text-muted-foreground uppercase tracking-wide">
            <tr className="border-b border-border">
              {columns.map((c, i) => (
                <th key={i} className={`px-3 py-2 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={i % 2 ? 'bg-muted/[0.04]' : ''}>
                {columns.map((c, j) => (
                  <td key={j} className={`px-3 py-2 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
