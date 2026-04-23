import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PlatformSummary } from '@/types/dashboard';
import { PlatformComparison } from './PlatformComparison';
import { CampaignPerformance } from './CampaignPerformance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SectionHeader } from './SectionHeader';

type View = 'platform' | 'campaign';

interface PerformanceBreakdownProps {
  platforms: PlatformSummary[];
  className?: string;
}

export function PerformanceBreakdown({ platforms, className }: PerformanceBreakdownProps) {
  const [view, setView] = useState<View>('platform');

  const subtitle =
    view === 'platform'
      ? undefined
      : 'Top campaigns ranked by spend, with metrics aggregated across the date range';

  return (
    <div className={cn('space-y-2.5 md:space-y-3 print-break-before', className)}>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <SectionHeader title="Performance Breakdown" subtitle={subtitle} />
        <Select value={view} onValueChange={(v) => setView(v as View)}>
          <SelectTrigger className="w-[200px] h-9 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="platform">By Platform</SelectItem>
            <SelectItem value="campaign">By Campaign</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {view === 'platform' ? (
        <PlatformComparison data={platforms} />
      ) : (
        <CampaignPerformance hidePlatformColumn />
      )}
    </div>
  );
}
