import { PlatformPageShell, moneyKpi, formatCompact } from '@/components/dashboard/PlatformPageShell';
import { useCallback, useMemo, useState } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { normalizePlatform, pctChange, DashboardDailyRow } from '@/hooks/useDashboardDaily';
import { KPIGroupData } from '@/types/dashboard';

import { Checkbox } from '@/components/ui/checkbox';
import { Facebook, Instagram } from 'lucide-react';

type SubPlatform = 'facebook' | 'instagram';

function matchSub(raw: string | null | undefined, sub: SubPlatform): boolean {
  const v = (raw || '').toLowerCase();
  if (sub === 'facebook') return v.includes('facebook') || v === 'fb';
  return v.includes('instagram') || v === 'ig';
}

export default function MetaPage() {
  const { data } = useDashboard();
  const [enabled, setEnabled] = useState<Record<SubPlatform, boolean>>({ facebook: true, instagram: true });

  const toggle = (key: SubPlatform) => setEnabled(prev => {
    const next = { ...prev, [key]: !prev[key] };
    // Prevent both being unchecked — re-enable the other one.
    if (!next.facebook && !next.instagram) return prev;
    return next;
  });

  const bothActive = enabled.facebook && enabled.instagram;

  const extraRowFilter = useCallback((r: DashboardDailyRow) => {
    if (bothActive) return true;
    const sub = (r.publisher_platform || '').toLowerCase();
    // If publisher_platform is missing on a row, only include it when both are on.
    if (!sub) return false;
    if (enabled.facebook && matchSub(sub, 'facebook')) return true;
    if (enabled.instagram && matchSub(sub, 'instagram')) return true;
    return false;
  }, [bothActive, enabled.facebook, enabled.instagram]);

  const buildKpis = (cur: any, prev: any, currency: string): KPIGroupData[] => [
    {
      title: 'Spend', icon: 'DollarSign',
      primary: { label: 'Spend', value: cur.spend, formattedValue: moneyKpi(cur.spend, currency, 0), change: pctChange(cur.spend, prev?.spend), trend: [] },
      supporting: [],
    },
    {
      title: 'Impressions', icon: 'Eye',
      primary: { label: 'Impressions', value: cur.impressions, formattedValue: formatCompact(cur.impressions), change: pctChange(cur.impressions, prev?.impressions), trend: [] },
      supporting: [
        { label: 'CPM', formattedValue: moneyKpi(cur.cpm, currency), change: pctChange(cur.cpm, prev?.cpm) },
      ],
    },
    {
      title: 'Clicks', icon: 'MousePointerClick',
      primary: { label: 'Clicks', value: cur.clicks, formattedValue: formatCompact(cur.clicks), change: pctChange(cur.clicks, prev?.clicks), trend: [] },
      supporting: [
        { label: 'CTR', formattedValue: `${cur.ctr.toFixed(2)}%`, change: pctChange(cur.ctr, prev?.ctr) },
        { label: 'CPC', formattedValue: moneyKpi(cur.cpc, currency), change: pctChange(cur.cpc, prev?.cpc) },
      ],
    },
    {
      title: 'Conversions', icon: 'Target',
      tooltip: 'Lower-funnel conversions are the primary outcome metric for Meta.',
      primary: { label: 'LF Conversions', value: cur.conversionsLowerFunnel, formattedValue: formatCompact(cur.conversionsLowerFunnel), change: pctChange(cur.conversionsLowerFunnel, prev?.conversionsLowerFunnel), trend: [] },
      supporting: [
        { label: 'CPA (LF)', formattedValue: cur.cpaLowerFunnel > 0 ? moneyKpi(cur.cpaLowerFunnel, currency) : '—', change: pctChange(cur.cpaLowerFunnel, prev?.cpaLowerFunnel) },
        { label: 'CVR (LF)', formattedValue: `${cur.cvrLowerFunnel.toFixed(2)}%` },
        { label: 'All Conv.', formattedValue: formatCompact(cur.conversionsAll) },
        { label: 'Upper Funnel', formattedValue: formatCompact(cur.conversionsUpperFunnel) },
      ],
    },
    {
      title: 'Reach', icon: 'Users',
      tooltip: cur.frequency >= 4 ? 'High frequency (≥4) — refresh creative or expand audience to avoid fatigue.' : undefined,
      primary: { label: 'Reach', value: cur.reach, formattedValue: formatCompact(cur.reach), change: pctChange(cur.reach, prev?.reach), trend: [] },
      supporting: [
        { label: 'Frequency', formattedValue: cur.frequency > 0 ? cur.frequency.toFixed(2) : '—', change: pctChange(cur.frequency, prev?.frequency) },
      ],
    },
    {
      title: 'Landing Page Views', icon: 'FileText',
      primary: { label: 'LPV', value: cur.landingPageViews, formattedValue: formatCompact(cur.landingPageViews), change: pctChange(cur.landingPageViews, prev?.landingPageViews), trend: [] },
      supporting: [
        { label: 'Cost / LPV', formattedValue: moneyKpi(cur.costPerLPV, currency), change: pctChange(cur.costPerLPV, prev?.costPerLPV) },
        { label: 'LPV Rate', formattedValue: `${cur.lpvRate.toFixed(1)}%` },
      ],
    },
  ];

  return (
    <PlatformPageShell
      platformKey="meta"
      title="Meta Ads"
      buildKpiCards={buildKpis}
      warnOnWastedSpend
      extraRowFilter={extraRowFilter}
      titleAction={
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-1.5 shadow-sm">
          <label className="flex items-center gap-1.5 text-sm font-medium text-card-foreground cursor-pointer select-none">
            <Checkbox
              checked={enabled.facebook}
              onCheckedChange={() => toggle('facebook')}
              aria-label="Show Facebook"
            />
            <Facebook className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            Facebook
          </label>
          <label className="flex items-center gap-1.5 text-sm font-medium text-card-foreground cursor-pointer select-none">
            <Checkbox
              checked={enabled.instagram}
              onCheckedChange={() => toggle('instagram')}
              aria-label="Show Instagram"
            />
            <Instagram className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            Instagram
          </label>
        </div>
      }
    />
  );
}
