import { useEffect, useMemo, useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { LoadingOverlay } from '@/components/layout/LoadingOverlay';
import { useDashboard } from '@/context/DashboardContext';
import { useGa4Report } from '@/hooks/useGa4Report';
import { useGa4Sources } from '@/hooks/useGa4Sources';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { TrendChartCard } from '@/components/dashboard/TrendChartCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { CurrencySymbol } from '@/lib/currency';
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

function Money({ amount, currency }: { amount: number; currency: string }) {
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <CurrencySymbol currency={currency} />
      {formatCompact(amount)}
    </span>
  );
}

function Tile({ label, value, subtitle }: { label: string; value: React.ReactNode; subtitle?: string }) {
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
  const { client, data: dashData } = useDashboard();
  const { start, end } = dashData.range;
  const currency = client.currency || 'USD';

  // Aggregate across configured GA4 properties (or a user-selected subset).
  const { sources, loading: sourcesLoading } = useGa4Sources();
  const activeSources = useMemo(() => sources.filter((s) => s.is_enabled), [sources]);
  const enabled = !sourcesLoading && activeSources.length > 0;

  // Selection state: which property IDs are currently shown. Default to all.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  useEffect(() => {
    // Initialise / reconcile when the configured set changes.
    setSelectedIds((prev) => {
      const validIds = activeSources.map((s) => s.property_id);
      const validSet = new Set(validIds);
      const kept = prev.filter((id) => validSet.has(id));
      // First load (or all properties were removed/re-added): default to all selected.
      if (kept.length === 0) return validIds;
      return kept;
    });
  }, [activeSources]);

  const toggleProperty = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        // Don't allow deselecting the last one — must keep at least one active.
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  // Only send propertyIds when it's a strict subset; otherwise let edge function aggregate all.
  const propertyIdsForQuery = selectedIds.length === activeSources.length ? undefined : selectedIds;
  const queryEnabled = enabled && (propertyIdsForQuery === undefined || propertyIdsForQuery.length > 0);

  const totalsQ = useGa4Report({
    startDate: start, endDate: end,
    propertyIds: propertyIdsForQuery,
    dimensions: ['date'],
    metrics: [
      'sessions', 'totalUsers', 'newUsers', 'engagedSessions',
      'engagementRate', 'averageSessionDuration', 'bounceRate',
      'screenPageViews', 'conversions', 'totalRevenue',
    ],
    enabled: queryEnabled,
  });

  const channelsQ = useGa4Report({
    startDate: start, endDate: end,
    propertyIds: propertyIdsForQuery,
    dimensions: ['sessionDefaultChannelGroup'],
    metrics: ['sessions', 'totalUsers', 'engagedSessions', 'conversions', 'totalRevenue'],
    orderBys: [{ metric: 'sessions', desc: true }],
    limit: 20,
    enabled: queryEnabled,
  });

  const sourcesQ = useGa4Report({
    startDate: start, endDate: end,
    propertyIds: propertyIdsForQuery,
    dimensions: ['sessionSource', 'sessionMedium'],
    metrics: ['sessions', 'totalUsers', 'engagementRate', 'conversions', 'totalRevenue'],
    orderBys: [{ metric: 'sessions', desc: true }],
    limit: 20,
    enabled: queryEnabled,
  });

  const pagesQ = useGa4Report({
    startDate: start, endDate: end,
    propertyIds: propertyIdsForQuery,
    dimensions: ['pagePath'],
    metrics: ['screenPageViews', 'totalUsers', 'averageSessionDuration', 'bounceRate'],
    orderBys: [{ metric: 'screenPageViews', desc: true }],
    limit: 20,
    enabled: queryEnabled,
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

  if (!enabled) {
    return (
      <div className="space-y-5 md:space-y-7">
        <SectionHeader title="Web Analytics (GA4)" />
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground flex items-center gap-2">
            <Globe className="h-4 w-4" />
            No GA4 property configured. Add a GA4 Property ID in Admin → Measurement Setup to enable this page.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Only show the toggle if there are 2+ properties — with 1 it's pointless.
  const showPropertyToggle = activeSources.length > 1;
  const propertyToggle = showPropertyToggle ? (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-1.5 shadow-sm">
      {activeSources.map((s) => {
        const checked = selectedIds.includes(s.property_id);
        const isLastChecked = checked && selectedIds.length === 1;
        const display = (s.label?.trim() || `Property ${s.property_id}`);
        return (
          <label
            key={s.id}
            className={`flex items-center gap-1.5 text-sm font-medium text-card-foreground select-none ${
              isLastChecked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
            }`}
            title={isLastChecked ? 'At least one property must be selected' : `Toggle ${display}`}
          >
            <Checkbox
              checked={checked}
              disabled={isLastChecked}
              onCheckedChange={() => toggleProperty(s.property_id)}
              aria-label={`Show ${display}`}
            />
            <Globe className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            {display}
          </label>
        );
      })}
    </div>
  ) : null;

  return (
    <div className="space-y-5 md:space-y-7">
      <SectionHeader
        title="Web Analytics (GA4)"
        subtitle={`Live data from the GA4 Data API · ${activeSources.length} ${activeSources.length === 1 ? 'property' : 'properties'}`}
        showMobileDatePicker
        showFilters
        hideFiltersButton
        action={propertyToggle}
        actionBelow
      />

      {anyError && (
        <div className="text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded-md px-3 py-2">
          Failed to load GA4 data: {(anyError as Error).message}
        </div>
      )}
      {loading && <LoadingOverlay fixed message="Loading GA4 data…" />}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-3">
        <Tile label="Sessions"          value={formatCompact(t('sessions'))} />
        <Tile label="Users"             value={formatCompact(t('totalUsers'))} subtitle={`New: ${formatCompact(t('newUsers'))}`} />
        <Tile label="Engaged Sessions"  value={formatCompact(t('engagedSessions'))} subtitle={`${(t('engagementRate') * 100).toFixed(1)}% rate`} />
        <Tile label="Avg Session"       value={formatDuration(t('averageSessionDuration'))} subtitle={`${(t('bounceRate') * 100).toFixed(1)}% bounce`} />
        <Tile label="Page Views"        value={formatCompact(t('screenPageViews'))} />
        <Tile label="Conversions"       value={formatCompact(t('conversions'))} />
        <Tile label="Revenue"           value={<Money amount={t('totalRevenue')} currency={currency} />} />
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
            { header: 'Revenue',   render: r => <Money amount={r.metrics[4]} currency={currency} />, align: 'right' },
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
            { header: 'Revenue',     render: r => <Money amount={r.metrics[4]} currency={currency} />, align: 'right' },
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
