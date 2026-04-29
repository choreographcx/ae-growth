import { useMemo, useState } from 'react';
import { DimensionBreakdownTable } from './DimensionBreakdownTable';
import { CampaignPerformance } from './CampaignPerformance';
import { PlatformComparison } from './PlatformComparison';
import { SectionHeader } from './SectionHeader';
import { DashboardDailyRow } from '@/hooks/useDashboardDaily';
import { resolveCampaignObjective } from '@/lib/campaignNaming';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlatformKey, PlatformSummary } from '@/types/dashboard';

/**
 * Unified performance breakdown surface. One dropdown selects the level
 * (Audience Type, Objective, Campaign Type, Placement, Platform, Campaign,
 * Ad Group, Ad Level) and the body switches between dimension-aggregated
 * tables, the campaign performance table, and the platform comparison table.
 *
 * Ad Group and Ad Level are exposed in the dropdown for forward-compatibility
 * but currently render an empty state — the data feed is campaign-level only.
 */

type Level =
  | 'audienceType'
  | 'objective'
  | 'campaignType'
  | 'placement'
  | 'platform'
  | 'campaign'
  | 'adGroup'
  | 'adLevel';

interface PerformanceBreakdownCardProps {
  /** Raw dashboard rows in the active range (already platform-scoped where applicable). */
  rows: DashboardDailyRow[];
  /** When set, the table is scoped to this platform (Campaign view) and the dropdown adapts. */
  platformKey?: PlatformKey;
  /** When provided, the "By Platform" option is enabled (Overview only). */
  platforms?: PlatformSummary[];
  className?: string;
}

const DIMENSION_PICKERS: Record<
  'audienceType' | 'objective' | 'campaignType' | 'placement',
  { title: string; pick: (r: DashboardDailyRow) => string | null | undefined }
> = {
  audienceType: { title: 'By Audience Type', pick: r => r.audience_type },
  objective:    { title: 'By Objective',     pick: r => resolveCampaignObjective(r.campaign_objective, r.campaign_name) },
  campaignType: { title: 'By Campaign Type', pick: r => r.campaign_type },
  placement: {
    title: 'By Placement',
    pick: r => {
      const v = (r.publisher_platform || '').toLowerCase();
      if (!v) return null;
      if (v.includes('facebook') || v === 'fb') return 'Facebook';
      if (v.includes('instagram') || v === 'ig') return 'Instagram';
      return null;
    },
  },
};

export function PerformanceBreakdownCard({ rows, platformKey, platforms, className }: PerformanceBreakdownCardProps) {
  const isMeta = platformKey === 'meta';
  const isGoogle = platformKey === 'google';
  const isTikTok = platformKey === 'tiktok';
  const isSnapchat = platformKey === 'snapchat';
  const hasAudience = isMeta || isTikTok || isSnapchat;
  const showPlatformOption = !platformKey && (platforms?.length ?? 0) > 0;

  // Build the option list (in the order they appear in the dropdown).
  const options = useMemo(() => {
    const list: { value: Level; label: string }[] = [];
    if (showPlatformOption) list.push({ value: 'platform', label: 'By Platform' });
    if (hasAudience) list.push({ value: 'audienceType', label: 'By Audience Type' });
    list.push({ value: 'objective', label: 'By Objective' });
    if (isGoogle) list.push({ value: 'campaignType', label: 'By Campaign Type' });
    if (isMeta) list.push({ value: 'placement', label: 'By Placement' });
    list.push({ value: 'campaign', label: 'By Campaign' });
    list.push({ value: 'adGroup',  label: 'By Ad Group' });
    list.push({ value: 'adLevel',  label: 'By Ad Level' });
    return list;
  }, [showPlatformOption, hasAudience, isGoogle, isMeta]);

  // Default selection: prefer Platform on Overview, else the most-specific available dimension.
  const defaultLevel: Level = showPlatformOption
    ? 'platform'
    : isMeta ? 'placement'
    : isGoogle ? 'campaignType'
    : hasAudience ? 'audienceType'
    : 'objective';

  const [level, setLevel] = useState<Level>(defaultLevel);

  // If the platform changes (e.g. dropdown options shrink), keep the selection valid.
  const validValues = options.map(o => o.value);
  const activeLevel: Level = validValues.includes(level) ? level : defaultLevel;

  const subtitle =
    activeLevel === 'campaign'
      ? 'Top campaigns ranked by spend, with metrics aggregated across the date range'
      : undefined;

  return (
    <div className={`space-y-2.5 md:space-y-3 print-break-before ${className ?? ''}`}>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <SectionHeader title="Performance Breakdown" subtitle={subtitle} />
        <Select value={activeLevel} onValueChange={(v) => setLevel(v as Level)}>
          <SelectTrigger className="w-[200px] h-9 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activeLevel === 'platform' && platforms && (
        <PlatformComparison data={platforms} />
      )}

      {activeLevel === 'campaign' && (
        <CampaignPerformance platformFilter={platformKey} hidePlatformColumn={!!platformKey} />
      )}

      {(activeLevel === 'adGroup' || activeLevel === 'adLevel') && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 text-sm text-muted-foreground">
          {activeLevel === 'adGroup' ? 'Ad Group' : 'Ad Level'} data isn’t wired up yet for this client. Once the
          data feed includes ad group / ad level rows, this view will populate automatically.
        </div>
      )}

      {(activeLevel === 'audienceType' ||
        activeLevel === 'objective' ||
        activeLevel === 'campaignType' ||
        activeLevel === 'placement') && (
        <DimensionBreakdownTable
          rows={rows}
          pick={DIMENSION_PICKERS[activeLevel].pick}
          title={DIMENSION_PICKERS[activeLevel].title}
        />
      )}
    </div>
  );
}
