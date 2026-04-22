import { useDashboard } from '@/context/DashboardContext';
import { PlatformKey } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface FilterSummaryProps {
  /** Whether the Platforms filter is active in the surrounding header. */
  showPlatformsFilter?: boolean;
  /** When set, the active page is scoped to this platform (e.g. /meta) — shown as a fixed chip. */
  scopeToPlatform?: PlatformKey;
  className?: string;
  align?: 'start' | 'end';
}

/**
 * Compact one-line summary of the user's current Date + Filter selections,
 * intended to render directly under the Filter button so the active state is
 * always visible at a glance. Hides itself when nothing meaningful is set.
 */
export function FilterSummary({
  showPlatformsFilter = false,
  scopeToPlatform,
  className,
  align = 'end',
}: FilterSummaryProps) {
  const {
    data,
    selectedPlatforms,
    selectedMarkets,
    selectedChannels,
    selectedCampaigns,
    selectedObjectives,
  } = useDashboard();

  const platformLabel = scopeToPlatform
    ? data.availablePlatforms.find(p => p.key === scopeToPlatform)?.label ?? null
    : null;

  type Chip = { label: string; value: string };
  const chips: Chip[] = [];

  if (platformLabel) {
    chips.push({ label: 'Platform', value: platformLabel });
  } else if (showPlatformsFilter && selectedPlatforms.length > 0) {
    chips.push({ label: 'Platforms', value: summarize(selectedPlatforms) });
  }
  if (selectedMarkets.length > 0) chips.push({ label: 'Markets', value: summarize(selectedMarkets) });
  if (selectedChannels.length > 0) chips.push({ label: 'Channels', value: summarize(selectedChannels) });
  if (selectedCampaigns.length > 0) chips.push({ label: 'Campaigns', value: summarize(selectedCampaigns) });
  if (selectedObjectives.length > 0) chips.push({ label: 'Objectives', value: summarize(selectedObjectives) });

  if (chips.length === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground',
        align === 'end' ? 'justify-end' : 'justify-start',
        className,
      )}
    >
      {chips.map((c, i) => (
        <span
          key={`${c.label}-${i}`}
          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 max-w-[220px]"
          title={`${c.label}: ${c.value}`}
        >
          <span className="text-muted-foreground/70">{c.label}:</span>
          <span className="text-foreground font-medium truncate">{c.value}</span>
        </span>
      ))}
    </div>
  );
}

function summarize(values: string[]): string {
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]}, ${values[1]}`;
  return `${values[0]} +${values.length - 1}`;
}
