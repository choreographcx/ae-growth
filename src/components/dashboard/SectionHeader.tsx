import { ReactNode, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/layout/DashboardHeader';
import { MultiSelectFilter } from '@/components/dashboard/MultiSelectFilter';
import { MobileFilterSheet } from '@/components/dashboard/MobileFilterSheet';
import { FilterClearIcon } from '@/components/icons/FilterClearIcon';
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
            <div className="lg:hidden flex items-center gap-1.5 shrink-0">
              {showFilters && (
                <MobileFilterSheet
                  showPlatformsFilter={showPlatformsFilter}
                  scopeToPlatform={scopeToPlatform}
                />
              )}
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
    selectedObjectives, setSelectedObjectives,
    selectedMarkets, setSelectedMarkets,
    selectedChannels, setSelectedChannels,
  } = useDashboard();

  const platformOptions = useMemo(() => data.availablePlatforms.map(p => p.label), [data.availablePlatforms]);

  // On platform pages, restrict campaign options to campaigns belonging to that platform.
  const campaignNames = useMemo(() => {
    if (scopeToPlatform) return data.campaignsByPlatform[scopeToPlatform] ?? [];
    return data.availableCampaigns;
  }, [scopeToPlatform, data.campaignsByPlatform, data.availableCampaigns]);

  // Objectives, optionally scoped to the current platform page.
  const objectiveOptions = useMemo(() => {
    if (scopeToPlatform) return data.objectivesByPlatform[scopeToPlatform] ?? [];
    return data.availableObjectives;
  }, [scopeToPlatform, data.objectivesByPlatform, data.availableObjectives]);

  const marketOptions = useMemo(() => {
    if (scopeToPlatform) return data.marketsByPlatform[scopeToPlatform] ?? [];
    return data.availableMarkets;
  }, [scopeToPlatform, data.marketsByPlatform, data.availableMarkets]);

  const channelOptions = useMemo(() => {
    if (scopeToPlatform) return data.channelsByPlatform[scopeToPlatform] ?? [];
    return data.availableChannels;
  }, [scopeToPlatform, data.channelsByPlatform, data.availableChannels]);

  // On platform pages, force the hidden global platform filter to match the current page.
  // Without this, a stale selection from Overview (e.g. Meta only) can silently blank the X page.
  useEffect(() => {
    if (!scopeToPlatform) return;
    const scopedLabel = platformOptions.find(p => p === (scopeToPlatform === 'google' ? 'Google Ads' : scopeToPlatform === 'linkedin' ? 'LinkedIn' : scopeToPlatform === 'programmatic' ? 'Programmatic' : scopeToPlatform === 'snapchat' ? 'Snapchat' : scopeToPlatform === 'tiktok' ? 'TikTok' : scopeToPlatform === 'meta' ? 'Meta' : 'X'));
    if (!scopedLabel) return;
    if (selectedPlatforms.length === 1 && selectedPlatforms[0] === scopedLabel) return;
    setSelectedPlatforms([scopedLabel]);
  }, [scopeToPlatform, platformOptions, selectedPlatforms, setSelectedPlatforms]);

  // Drop any selected campaigns no longer in scope (e.g. when navigating between platform pages).
  useEffect(() => {
    if (!scopeToPlatform || selectedCampaigns.length === 0) return;
    const allowed = new Set(campaignNames);
    const filtered = selectedCampaigns.filter(c => allowed.has(c));
    if (filtered.length !== selectedCampaigns.length) setSelectedCampaigns(filtered);
  }, [scopeToPlatform, campaignNames, selectedCampaigns, setSelectedCampaigns]);

  // Drop any selected objectives no longer in scope.
  useEffect(() => {
    if (!scopeToPlatform || selectedObjectives.length === 0) return;
    const allowed = new Set(objectiveOptions);
    const filtered = selectedObjectives.filter(o => allowed.has(o));
    if (filtered.length !== selectedObjectives.length) setSelectedObjectives(filtered);
  }, [scopeToPlatform, objectiveOptions, selectedObjectives, setSelectedObjectives]);

  // Drop any selected markets no longer in scope.
  useEffect(() => {
    if (!scopeToPlatform || selectedMarkets.length === 0) return;
    const allowed = new Set(marketOptions);
    const filtered = selectedMarkets.filter(o => allowed.has(o));
    if (filtered.length !== selectedMarkets.length) setSelectedMarkets(filtered);
  }, [scopeToPlatform, marketOptions, selectedMarkets, setSelectedMarkets]);

  // Drop any selected channels no longer in scope.
  useEffect(() => {
    if (!scopeToPlatform || selectedChannels.length === 0) return;
    const allowed = new Set(channelOptions);
    const filtered = selectedChannels.filter(o => allowed.has(o));
    if (filtered.length !== selectedChannels.length) setSelectedChannels(filtered);
  }, [scopeToPlatform, channelOptions, selectedChannels, setSelectedChannels]);

  // When the Platforms filter is hidden (platform pages), the platform selection is
  // implicit and shouldn't influence the visible "Clear" affordance.
  const hasFilters =
    (showPlatformsFilter && selectedPlatforms.length > 0) ||
    selectedCampaigns.length > 0 ||
    selectedObjectives.length > 0 ||
    selectedMarkets.length > 0 ||
    selectedChannels.length > 0;

  const clearAll = () => {
    setSelectedPlatforms(scopeToPlatform ? [scopeToPlatform === 'google' ? 'Google Ads' : scopeToPlatform === 'linkedin' ? 'LinkedIn' : scopeToPlatform === 'programmatic' ? 'Programmatic' : scopeToPlatform === 'snapchat' ? 'Snapchat' : scopeToPlatform === 'tiktok' ? 'TikTok' : scopeToPlatform === 'meta' ? 'Meta' : 'X'] : []);
    setSelectedCampaigns([]);
    setSelectedObjectives([]);
    setSelectedMarkets([]);
    setSelectedChannels([]);
  };

  return (
    <div className="hidden lg:flex items-center gap-1.5 lg:shrink-0">
      {extraAction}
      {showPlatformsFilter && (
        <MultiSelectFilter label="Platforms" options={platformOptions} selected={selectedPlatforms} onChange={setSelectedPlatforms} />
      )}
      {marketOptions.length > 0 && (
        <MultiSelectFilter label="Markets" options={marketOptions} selected={selectedMarkets} onChange={setSelectedMarkets} />
      )}
      {channelOptions.length > 0 && (
        <MultiSelectFilter label="Channels" options={channelOptions} selected={selectedChannels} onChange={setSelectedChannels} />
      )}
      <MultiSelectFilter label="Campaigns" options={campaignNames} selected={selectedCampaigns} onChange={setSelectedCampaigns} />
      {objectiveOptions.length > 0 && (
        <MultiSelectFilter label="Objectives" options={objectiveOptions} selected={selectedObjectives} onChange={setSelectedObjectives} />
      )}
      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          aria-label="Clear filters"
          title="Clear filters"
          className="inline-flex h-8 items-center justify-center px-3 rounded-md border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
        >
          <FilterClearIcon size={14} />
        </button>
      )}
      <div className="h-3.5 w-px bg-border mx-1" />
      <DateRangePicker />
    </div>
  );
}
