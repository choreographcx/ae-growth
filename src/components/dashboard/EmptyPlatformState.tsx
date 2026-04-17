import { Inbox } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { useDashboard } from '@/context/DashboardContext';
import { CurrencySymbol } from '@/lib/currency';

interface Props {
  title: string;
  spend?: number;
  impressions?: number;
  clicks?: number;
}

/**
 * Shown for platforms (X / LinkedIn) when there is no spend in the selected period.
 * Avoids building a noisy dashboard around zero data.
 */
export function EmptyPlatformState({ title, spend = 0, impressions = 0, clicks = 0 }: Props) {
  const { client } = useDashboard();
  return (
    <div className="space-y-6">
      <SectionHeader title={title} />
      <div className="bg-card rounded-xl border border-border p-10 shadow-sm flex flex-col items-center text-center max-w-2xl mx-auto">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
          <Inbox size={20} className="text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold text-card-foreground">No meaningful activity in selected period</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          {title} did not run any spend during this date range. Adjust the date filter or check campaign status.
        </p>
        {(spend > 0 || impressions > 0 || clicks > 0) && (
          <div className="mt-5 grid grid-cols-3 gap-px bg-border/40 rounded overflow-hidden w-full max-w-md">
            <Cell label="Spend" value={<span className="inline-flex items-baseline"><CurrencySymbol currency={client.currency} />{spend.toFixed(2)}</span>} />
            <Cell label="Impressions" value={impressions.toLocaleString()} />
            <Cell label="Clicks" value={clicks.toLocaleString()} />
          </div>
        )}
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-card px-3 py-2 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-card-foreground mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}
