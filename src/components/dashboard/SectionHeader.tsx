import { ReactNode, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/layout/DashboardHeader';
import { MultiSelectFilter } from '@/components/dashboard/MultiSelectFilter';
import { useDashboard } from '@/context/DashboardContext';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  /** When true, render a compact mobile date-range picker on the right (mobile only). */
  showMobileDatePicker?: boolean;
  /** When true, render Platforms + Campaigns filters and the date range picker inline on desktop. */
  showFilters?: boolean;
}

export function SectionHeader({
  title, subtitle, action, className,
  showMobileDatePicker = false,
  showFilters = false,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2", className)}>
      <div className="flex items-start justify-between gap-2 lg:contents">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground truncate">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {showMobileDatePicker && (
          <div className="lg:hidden flex items-center min-w-0 max-w-[180px] shrink-0">
            <DateRangePicker compact />
          </div>
        )}
      </div>

      {showFilters ? (
        <DesktopInlineFilters extraAction={action} />
      ) : (
        action && (
          <div className="flex items-center gap-2 justify-end lg:justify-start lg:shrink-0 lg:order-last">
            {action}
          </div>
        )
      )}
    </div>
  );
}

/** Desktop-only inline filter cluster: Platforms + Campaigns on the left of the cluster, date picker on the far right. */
function DesktopInlineFilters({ extraAction }: { extraAction?: ReactNode }) {
  const {
    data,
    selectedPlatforms, setSelectedPlatforms,
    selectedCampaigns, setSelectedCampaigns,
  } = useDashboard();

  const platformOptions = useMemo(() => data.availablePlatforms.map(p => p.label), [data.availablePlatforms]);
  const campaignNames = useMemo(() => data.availableCampaigns, [data.availableCampaigns]);
  const hasFilters = selectedPlatforms.length > 0 || selectedCampaigns.length > 0;

  return (
    <div className="hidden lg:flex items-center gap-1.5 lg:shrink-0">
      {extraAction}
      <MultiSelectFilter label="Platforms" options={platformOptions} selected={selectedPlatforms} onChange={setSelectedPlatforms} />
      <MultiSelectFilter label="Campaigns" options={campaignNames} selected={selectedCampaigns} onChange={setSelectedCampaigns} />
      {hasFilters && (
        <button
          type="button"
          onClick={() => { setSelectedPlatforms([]); setSelectedCampaigns([]); }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
        >
          Clear
        </button>
      )}
      <div className="h-3.5 w-px bg-border mx-1" />
      <DateRangePicker />
    </div>
  );
}
