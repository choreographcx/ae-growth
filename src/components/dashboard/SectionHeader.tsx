import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/layout/DashboardHeader';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  /** When true, render a compact mobile date-range picker on the right (mobile only). */
  showMobileDatePicker?: boolean;
}

export function SectionHeader({
  title, subtitle, action, className, showMobileDatePicker = false,
}: SectionHeaderProps) {
  // On mobile, when both an action (extra filters) and the date picker are present,
  // stack the action below the date picker. On desktop they sit inline.
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
      {action && (
        <div className="flex items-center gap-2 justify-end lg:justify-start lg:shrink-0 lg:order-last">
          {action}
        </div>
      )}
    </div>
  );
}
