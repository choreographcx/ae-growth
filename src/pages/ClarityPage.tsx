import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, MousePointerClick, Users, Clock, Eye } from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LoadingOverlay } from '@/components/layout/LoadingOverlay';
import {
  ClarityFilters,
  pickMetric,
  useClarityBreakdown,
  useClarityFilterOptions,
  useClarityKpis,
  useClarityTimeseries,
} from '@/hooks/useClarity';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';

function compact(n: number): string {
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

function Tile({
  label,
  value,
  icon: Icon,
  tone = 'default',
  subtitle,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'warn' | 'danger';
  subtitle?: string;
}) {
  const toneClass =
    tone === 'danger'
      ? 'bg-destructive/10 text-destructive'
      : tone === 'warn'
      ? 'bg-amber-500/10 text-amber-600'
      : 'bg-primary/10 text-primary';
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`size-10 rounded-lg flex items-center justify-center ${toneClass}`}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold tabular-nums mt-0.5">{value}</div>
          {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownTable({
  title,
  metricName,
  filters,
  limit = 10,
  valueLabel = 'Sessions',
  truncate = 60,
}: {
  title: string;
  metricName: string;
  filters: ClarityFilters;
  limit?: number;
  valueLabel?: string;
  truncate?: number;
}) {
  const { data, isLoading } = useClarityBreakdown(filters, metricName, limit);
  const rows = data ?? [];
  const total = rows.reduce((acc, r) => acc + Number(r.metric_value || 0), 0) || 1;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="text-xs text-muted-foreground py-6 text-center">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-xs text-muted-foreground py-6 text-center">No data</div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center text-[11px] uppercase tracking-wide text-muted-foreground border-b pb-1.5">
              <span className="flex-1">Name</span>
              <span className="w-20 text-right">{valueLabel}</span>
              <span className="w-14 text-right">Share</span>
            </div>
            {rows.map((r, i) => {
              const v = Number(r.metric_value || 0);
              const pct = (v / total) * 100;
              const label = (r.dimension_value || '(unknown)').slice(0, truncate);
              return (
                <div key={`${r.dimension_value}-${i}`} className="flex items-center text-sm py-1 border-b last:border-0 border-border/40">
                  <span className="flex-1 truncate" title={r.dimension_value}>
                    {label}
                  </span>
                  <span className="w-20 text-right tabular-nums">{compact(v)}</span>
                  <span className="w-14 text-right tabular-nums text-muted-foreground">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClarityPage() {
  const { data: dashData } = useDashboard();
  const { start, end } = dashData.range;

  const [sourceType, setSourceType] = useState<'all' | 'api' | 'dashboard_export'>('all');
  const [subdomain, setSubdomain] = useState<string>('all');

  const filterOptionsQ = useClarityFilterOptions(start, end);
  const subdomains = filterOptionsQ.data?.subdomains ?? [];

  const filters: ClarityFilters = useMemo(
    () => ({
      start,
      end,
      subdomains: subdomain === 'all' ? undefined : [subdomain],
      sourceType: sourceType === 'all' ? null : sourceType,
    }),
    [start, end, subdomain, sourceType],
  );

  const kpisQ = useClarityKpis(filters);
  const seriesQ = useClarityTimeseries(filters);

  const m = kpisQ.data ?? new Map<string, number>();
  const sessions = pickMetric(m, ['Traffic', 'Total sessions', 'Sessions']);
  const distinctUsers = pickMetric(m, ['Distinct users', 'Users', 'DistinctUsers']);
  const engagementSec = pickMetric(m, ['EngagementTime', 'Engagement time', 'Average engagement time']);
  const rageClicks = pickMetric(m, ['RageClicks', 'Rage clicks']);
  const deadClicks = pickMetric(m, ['DeadClicks', 'Dead clicks']);
  const errors = pickMetric(m, ['JsErrors', 'Errors', 'Script errors']);
  const pageViews = pickMetric(m, ['PageViews', 'Page views']);

  const seriesData = useMemo(() => {
    return (seriesQ.data ?? []).map((r) => ({
      date: r.metric_date,
      value: Number(r.metric_value) || 0,
    }));
  }, [seriesQ.data]);

  // Insights
  const topPagesQ = useClarityBreakdown(filters, 'PageTitle', 5);
  const insights: string[] = [];
  if (rageClicks > 0) insights.push(`${compact(rageClicks)} rage clicks detected — review affected pages.`);
  if (deadClicks > 0) insights.push(`${compact(deadClicks)} dead clicks may indicate broken interactions.`);
  if (errors > 0) insights.push(`${compact(errors)} script errors recorded — check the console for affected paths.`);
  if (topPagesQ.data && topPagesQ.data.length > 0) {
    insights.push(`Top page: ${topPagesQ.data[0].dimension_value} (${compact(topPagesQ.data[0].metric_value)} sessions).`);
  }

  const loading = filterOptionsQ.isLoading || kpisQ.isLoading;

  return (
    <div className="space-y-6 relative">
      {loading && <LoadingOverlay message="Loading Clarity data…" />}

      <SectionHeader
        title="Clarity Analytics"
        subtitle="Microsoft Clarity behavioural insights"
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Source</span>
            <Select value={sourceType} onValueChange={(v) => setSourceType(v as any)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="api">API (3-day window)</SelectItem>
                <SelectItem value="dashboard_export">Dashboard export (daily)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Subdomain</span>
            <Select value={subdomain} onValueChange={setSubdomain}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subdomains</SelectItem>
                {subdomains.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="font-normal">
              {format(start, 'MMM d')} – {format(end, 'MMM d, yyyy')}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Tile label="Sessions" value={compact(sessions)} icon={Activity} />
        <Tile label="Distinct users" value={compact(distinctUsers)} icon={Users} />
        <Tile label="Page views" value={compact(pageViews)} icon={Eye} />
        <Tile label="Engagement time" value={formatDuration(engagementSec)} icon={Clock} />
        <Tile label="Rage clicks" value={compact(rageClicks)} icon={AlertTriangle} tone={rageClicks > 0 ? 'warn' : 'default'} />
        <Tile label="Dead clicks" value={compact(deadClicks)} icon={MousePointerClick} tone={deadClicks > 0 ? 'danger' : 'default'} />
      </div>

      {/* Time series */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Sessions over time</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 h-[300px]">
          {seriesData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No time-series data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={seriesData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="clarityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) => {
                    try { return format(parseISO(d), 'MMM d'); } catch { return d; }
                  }}
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={compact} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(d: string) => { try { return format(parseISO(d), 'PP'); } catch { return d; } }}
                  formatter={(v: number) => [compact(v), 'Sessions']}
                />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#clarityFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BreakdownTable title="Top pages" metricName="PageTitle" filters={filters} limit={10} />
        <BreakdownTable title="Top referrers" metricName="Referrer" filters={filters} limit={10} />
        <BreakdownTable title="Devices" metricName="Device" filters={filters} limit={8} />
        <BreakdownTable title="Browsers" metricName="Browser" filters={filters} limit={8} />
        <BreakdownTable title="Countries" metricName="Country" filters={filters} limit={10} />
        <BreakdownTable title="Operating systems" metricName="OS" filters={filters} limit={8} />
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Insights</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {insights.map((i, idx) => (
              <div key={idx} className="text-sm flex items-start gap-2">
                <span className="size-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span>{i}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
