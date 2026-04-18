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
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-foreground truncate">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {action}
        {showMobileDatePicker && (
          <div className="lg:hidden flex items-center min-w-0 max-w-[180px]">
            <DateRangePicker compact />
          </div>
        )}
      </div>
    </div>
  );
}
