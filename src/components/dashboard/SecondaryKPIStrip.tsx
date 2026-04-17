import { useDashboard } from '@/context/DashboardContext';
import { CurrencySymbol } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface Stat {
  label: string;
  value: React.ReactNode;
  /** Soft semantic tint: positive (green), negative (red), neutral (none). */
  tone?: 'positive' | 'negative' | 'neutral';
  tooltip?: string;
}

interface Props {
  stats: Stat[];
  className?: string;
}

/**
 * Compact KPI strip used below the main KPI grid for business-performance metrics.
 * Visually lighter than KPIGroupCard.
 */
export function SecondaryKPIStrip({ stats, className }: Props) {
  return (
    <div className={cn(
      'bg-card rounded-xl border border-border shadow-sm grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-border/60',
      className
    )}>
      {stats.map((s, i) => (
        <div
          key={i}
          className={cn(
            'px-4 py-3.5 flex flex-col gap-1',
            s.tone === 'positive' && 'bg-success/[0.04]',
            s.tone === 'negative' && 'bg-destructive/[0.04]',
          )}
        >
          <div className="flex items-center gap-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-none">{s.label}</p>
            {s.tooltip && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="More info" className="text-muted-foreground/70 hover:text-foreground shrink-0">
                      <Info size={10} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-xs leading-relaxed">{s.tooltip}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="text-base font-bold text-card-foreground tabular-nums leading-tight">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

/** Helper to render a USD value with the currency symbol. */
export function MoneyValue({ amount, decimals = 2 }: { amount: number; decimals?: number }) {
  const { client } = useDashboard();
  return (
    <span className="inline-flex items-baseline">
      <CurrencySymbol currency={client.currency} />
      {amount.toFixed(decimals)}
    </span>
  );
}
