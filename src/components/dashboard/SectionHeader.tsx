import { ReactNode, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/layout/DashboardHeader';
import { MultiSelectFilter } from '@/components/dashboard/MultiSelectFilter';
import { useDashboard } from '@/context/DashboardContext';
import { PlatformKey } from '@/types/dashboard';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  /** When true, render a compact mobile date-range picker on the right (mobile only). */
  showMobileDatePicker?: boolean;
  /** When true, render filter cluster + date range picker inline on desktop. */
  showFilters?: boolean;
  /** When true (and showFilters), include the Platforms multi-select. Defaults to false (Overview only). */
  showPlatformsFilter?: boolean;
  /** When set, the Campaigns filter is restricted to campaigns belonging to this platform. */
  scopeToPlatform?: PlatformKey;
  /**
   * When true, render `action` on its own row below the title/filters (desktop).
   * Useful for page-specific filters (e.g. Facebook/Instagram toggles on Meta).
   */
  actionBelow?: boolean;
}

export function SectionHeader({
  title, subtitle, action, className,
  showMobileDatePicker = false,
  showFilters = false,
  showPlatformsFilter = false,
  scopeToPlatform,
  actionBelow = false,
}: SectionHeaderProps) {
  const inlineAction = !actionBelow ? action : undefined;
  const belowAction = actionBelow ? action : undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
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
          <DesktopInlineFilters
            extraAction={inlineAction}
            showPlatformsFilter={showPlatformsFilter}
            scopeToPlatform={scopeToPlatform}
          />
        ) : (
          inlineAction && (
            <div className="flex items-center gap-2 justify-end lg:justify-start lg:shrink-0 lg:order-last">
              {inlineAction}
            </div>
          )
        )}
      </div>

      {belowAction && (
        <div className="flex items-center gap-2 justify-end">
          {belowAction}
        </div>
      )}
    </div>
  );
}

/** Desktop-only inline filter cluster: optional Platforms + Campaigns on the left, date picker on the far right. */
function DesktopInlineFilters({
  extraAction,
  showPlatformsFilter,
  scopeToPlatform,
}: {
  extraAction?: ReactNode;
  showPlatformsFilter: boolean;
  scopeToPlatform?: PlatformKey;
}) {
  const {
    data,
    selectedPlatforms, setSelectedPlatforms,
    selectedCampaigns, setSelectedCampaigns,
  } = useDashboard();

  const platformOptions = useMemo(() => data.availablePlatforms.map(p => p.label), [data.availablePlatforms]);

  // On platform pages, restrict campaign options to campaigns belonging to that platform.
  const campaignNames = useMemo(() => {
    if (scopeToPlatform) return data.campaignsByPlatform[scopeToPlatform] ?? [];
    return data.availableCampaigns;
  }, [scopeToPlatform, data.campaignsByPlatform, data.availableCampaigns]);

  // Drop any selected campaigns no longer in scope (e.g. when navigating between platform pages).
  useEffect(() => {
    if (!scopeToPlatform || selectedCampaigns.length === 0) return;
    const allowed = new Set(campaignNames);
    const filtered = selectedCampaigns.filter(c => allowed.has(c));
    if (filtered.length !== selectedCampaigns.length) setSelectedCampaigns(filtered);
  }, [scopeToPlatform, campaignNames, selectedCampaigns, setSelectedCampaigns]);

  // When the Platforms filter is hidden (platform pages), the platform selection is
  // implicit and shouldn't influence the visible "Clear" affordance.
  const hasFilters = (showPlatformsFilter && selectedPlatforms.length > 0) || selectedCampaigns.length > 0;

  const clearAll = () => {
    if (showPlatformsFilter) setSelectedPlatforms([]);
    setSelectedCampaigns([]);
  };

  return (
    <div className="hidden lg:flex items-center gap-1.5 lg:shrink-0">
      {extraAction}
      {showPlatformsFilter && (
        <MultiSelectFilter label="Platforms" options={platformOptions} selected={selectedPlatforms} onChange={setSelectedPlatforms} />
      )}
      <MultiSelectFilter label="Campaigns" options={campaignNames} selected={selectedCampaigns} onChange={setSelectedCampaigns} />
      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
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
