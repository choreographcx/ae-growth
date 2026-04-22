import { PlatformKey, KPIGroupData, CampaignRow } from '@/types/dashboard';
import { KPIGroupCard } from '@/components/dashboard/KPIGroupCard';
import { TrendChartCard } from '@/components/dashboard/TrendChartCard';
import { PerformanceTable } from '@/components/dashboard/PerformanceTable';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { ConversionBreakdownCard } from '@/components/dashboard/ConversionBreakdownCard';
import { alerts } from '@/data/mockData';
import { useDashboard } from '@/context/DashboardContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useMemo } from 'react';
import { CurrencySymbol, applyCurrencyToKPIGroups } from '@/lib/currency';
import {
  aggregateRows, buildTimeSeries, buildCpaSeries, buildCtrSeries,
  normalizePlatform, pctChange, pickConversions, DashboardDailyRow, ConversionMode,
} from '@/hooks/useDashboardDaily';
import { LoadingOverlay } from '@/components/layout/LoadingOverlay';

interface PlatformPageTemplateProps {
  platformKey: PlatformKey;
  title: string;
  tabs?: { key: string; label: string }[];
  extraFilters?: React.ReactNode;
  extraSections?: React.ReactNode;
}

function formatCompact(n: number): string {
  const fmt = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1e9) return `${fmt(n / 1e9)}B`;
  if (n >= 1e6) return `${fmt(n / 1e6)}M`;
  if (n >= 1e3) return `${fmt(n / 1e3)}K`;
  return Math.round(n).toLocaleString();
}

/** Build platform-scoped campaign rows from raw daily rows. */
function buildCampaigns(rows: DashboardDailyRow[], platform: PlatformKey, mode: ConversionMode): CampaignRow[] {
  const byCampaign = new Map<string, DashboardDailyRow[]>();
  for (const r of rows) {
    const name = r.campaign_name || '(unnamed)';
    const key = `${r.campaign_id || ''}::${name}`;
    if (!byCampaign.has(key)) byCampaign.set(key, []);
    byCampaign.get(key)!.push(r);
  }
  const out: CampaignRow[] = [];
  byCampaign.forEach((rs, key) => {
    const a = aggregateRows(rs, mode);
    const name = rs[0].campaign_name || '(unnamed)';
    const id = rs[0].campaign_id || key;
    out.push({
      id,
      name,
      status: 'active',
      objective: '',
      spend: a.spend,
      impressions: a.impressions,
      clicks: a.clicks,
      ctr: +a.ctr.toFixed(2),
      cpc: +a.cpc.toFixed(2),
      conversions: a.conversions,
      cpa: +a.cpa.toFixed(2),
      conversionRate: +a.conversionRate.toFixed(2),
      reach: a.reach || undefined,
      videoViews: a.videoViews || undefined,
      platform,
    });
  });
  return out.sort((x, y) => y.spend - x.spend);
}

export function PlatformPageTemplate({ platformKey, title, tabs, extraSections }: PlatformPageTemplateProps) {
  const { client, data } = useDashboard();
  const platformCfg = client.platforms[platformKey];
  const budget = platformCfg?.budget || 0;
  const currency = client.currency;
  const { loading, error, rows, previousRows, range } = data;

  // Default platform pages to ALL conversions; user can toggle to lower-funnel only.
  const [conversionMode, setConversionMode] = useState<ConversionMode>('all');

  // Restrict to this platform
  const scopedRows = useMemo(
    () => rows.filter(r => normalizePlatform(r.platform) === platformKey),
    [rows, platformKey]
  );
  const scopedPrevRows = useMemo(
    () => previousRows.filter(r => normalizePlatform(r.platform) === platformKey),
    [previousRows, platformKey]
  );

  const totals = useMemo(() => aggregateRows(scopedRows, conversionMode), [scopedRows, conversionMode]);
  const prevTotals = useMemo(
    () => scopedPrevRows.length ? aggregateRows(scopedPrevRows, conversionMode) : null,
    [scopedPrevRows, conversionMode]
  );

  const spendSeries = useMemo(() => buildTimeSeries(scopedRows, r => +r.cost || 0), [scopedRows]);
  const convSeries = useMemo(
    () => buildTimeSeries(scopedRows, r => pickConversions(r, conversionMode)),
    [scopedRows, conversionMode]
  );
  const cpaSeries = useMemo(() => buildCpaSeries(scopedRows, conversionMode), [scopedRows, conversionMode]);
  const ctrSeries = useMemo(() => buildCtrSeries(scopedRows), [scopedRows]);

  const campaigns = useMemo(
    () => buildCampaigns(scopedRows, platformKey, conversionMode),
    [scopedRows, platformKey, conversionMode]
  );

  const conversionsTooltip = conversionMode === 'all'
    ? 'Includes all tracked conversion events for this platform (both upper and lower funnel).'
    : 'Lower-funnel actions only — leads, purchases, bookings, and form submissions.';

  const kpiGroups = useMemo<KPIGroupData[]>(() => {
    const cur = totals;
    const prev = prevTotals;
    const pacing = budget > 0 ? Math.round((cur.spend / budget) * 100) : null;
    const groups: KPIGroupData[] = [
      {
        title: 'Spend',
        icon: 'DollarSign',
        primary: {
          label: 'Total Spend', value: cur.spend,
          formattedValue: <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{formatCompact(cur.spend)}</span>,
          change: pctChange(cur.spend, prev?.spend),
          trend: spendSeries.slice(-7).map(p => p.value),
        },
        supporting: budget > 0 ? [
          { label: 'Budget', formattedValue: <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{budget.toLocaleString()}</span> },
          { label: 'Pacing', formattedValue: pacing != null ? `${pacing}%` : '—' },
        ] : [
          { label: 'CPM', formattedValue: <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{cur.cpm.toFixed(2)}</span>, change: pctChange(cur.cpm, prev?.cpm) },
        ],
      },
      {
        title: 'Impressions',
        icon: 'Eye',
        primary: {
          label: 'Impressions', value: cur.impressions,
          formattedValue: formatCompact(cur.impressions),
          change: pctChange(cur.impressions, prev?.impressions),
          trend: [],
        },
        supporting: [
          { label: 'CPM', formattedValue: <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{cur.cpm.toFixed(2)}</span>, change: pctChange(cur.cpm, prev?.cpm) },
        ],
      },
      {
        title: 'Clicks',
        icon: 'MousePointerClick',
        primary: {
          label: 'Clicks', value: cur.clicks,
          formattedValue: formatCompact(cur.clicks),
          change: pctChange(cur.clicks, prev?.clicks),
          trend: [],
        },
        supporting: [
          { label: 'CTR', formattedValue: `${cur.ctr.toFixed(2)}%`, change: pctChange(cur.ctr, prev?.ctr) },
          { label: 'CPC', formattedValue: <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{cur.cpc.toFixed(2)}</span>, change: pctChange(cur.cpc, prev?.cpc) },
        ],
      },
      {
        title: 'Conversions',
        icon: 'Target',
        tooltip: conversionsTooltip,
        primary: {
          label: 'Conversions', value: cur.conversions,
          formattedValue: formatCompact(cur.conversions),
          change: pctChange(cur.conversions, prev?.conversions),
          trend: convSeries.slice(-7).map(p => p.value),
        },
        supporting: [
          { label: 'CPA', formattedValue: <span className="inline-flex items-baseline"><CurrencySymbol currency={currency} />{cur.cpa.toFixed(2)}</span>, change: pctChange(cur.cpa, prev?.cpa) },
          { label: 'Conv. Rate', formattedValue: `${cur.conversionRate.toFixed(2)}%`, change: pctChange(cur.conversionRate, prev?.conversionRate) },
        ],
      },
    ];
    return applyCurrencyToKPIGroups(groups, currency, 26);
  }, [totals, prevTotals, currency, budget, spendSeries, convSeries, conversionsTooltip]);

  const platformAlerts = alerts.filter(a => a.platform === platformKey);
  const [activeTab, setActiveTab] = useState(tabs?.[0]?.key || 'all');

  return (
    <div className="space-y-6 md:space-y-10">
      <SectionHeader
        title={title}
        action={
          <div className="flex items-center gap-2">
            <Tabs value={conversionMode} onValueChange={v => setConversionMode(v as ConversionMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-3">All Conversions</TabsTrigger>
                <TabsTrigger value="lower_funnel" className="text-xs px-3">Lower Funnel</TabsTrigger>
              </TabsList>
            </Tabs>
            {tabs && tabs.length > 1 && (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  {tabs.map(t => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
                </TabsList>
              </Tabs>
            )}
          </div>
        }
      />

      {error && (
        <div className="text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded-md px-3 py-2">
          Failed to load data: {error}
        </div>
      )}
      {loading && <LoadingOverlay fixed message={`Loading ${title} data…`} />}
      {!loading && !error && scopedRows.length === 0 && (
        <div className="text-sm text-muted-foreground border border-border bg-muted/20 rounded-md px-3 py-2">
          No {title} data for the selected period{client.platforms[platformKey]?.enabled === false ? ' — platform is disabled in Admin' : ''}.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
        {kpiGroups.map((group, i) => <KPIGroupCard key={i} data={group} />)}
      </div>

      {/* Trends */}
      <div className="space-y-3 md:space-y-4 print-break-before">
        <SectionHeader title="Trends" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <TrendChartCard title="Spend" data={spendSeries} currency={currency} color="hsl(var(--chart-1))" />
          <TrendChartCard title="Conversions" data={convSeries} color="hsl(var(--chart-3))" />
          <TrendChartCard title="CPA" data={cpaSeries} currency={currency} color="hsl(var(--chart-4))" />
          <TrendChartCard title="CTR" data={ctrSeries} valueSuffix="%" color="hsl(var(--chart-2))" />
        </div>
      </div>

      {/* Conversion Breakdown */}
      <div className="space-y-3 md:space-y-4">
        <SectionHeader title="Conversion Breakdown" />
        <ConversionBreakdownCard
          platform={platformKey}
          start={range.start}
          end={range.end}
        />
      </div>

      {/* Campaign Table */}
      <div className="print-break-before">
        <PerformanceTable data={campaigns} title="Campaign Performance" />
      </div>

      {/* Extra sections */}
      {extraSections}

      {/* Diagnostics */}
      {platformAlerts.length > 0 && (
        <div className="space-y-3 md:space-y-4">
          <SectionHeader title="Diagnostics" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
            {platformAlerts.map(a => <AlertCard key={a.id} alert={a} />)}
          </div>
        </div>
      )}
    </div>
  );
}
