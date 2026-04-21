import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/layout/DashboardHeader';
import { MobileFilterSheet } from '@/components/dashboard/MobileFilterSheet';
import { PlatformKey } from '@/types/dashboard';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  /** When true, render a compact mobile date-range picker on the right (mobile only). */
  showMobileDatePicker?: boolean;
  /** When true, render filter button + date range picker inline on desktop. */
  showFilters?: boolean;
  /** When true (and showFilters), include the Platforms multi-select. Defaults to false (Overview only). */
  showPlatformsFilter?: boolean;
  /** When set, the Campaigns filter is restricted to campaigns belonging to this platform. */
  scopeToPlatform?: PlatformKey;
  /** When true, suppress the filters button (keeps date picker). */
  hideFiltersButton?: boolean;
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
  hideFiltersButton = false,
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
              {showFilters && !hideFiltersButton && (
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
          <div className="hidden lg:flex items-center gap-1.5 lg:shrink-0">
            {inlineAction}
            {!hideFiltersButton && (
              <>
                <MobileFilterSheet
                  showPlatformsFilter={showPlatformsFilter}
                  scopeToPlatform={scopeToPlatform}
                />
                <div className="h-3.5 w-px bg-border mx-1" />
              </>
            )}
            <DateRangePicker />
          </div>
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
