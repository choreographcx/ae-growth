import { cn } from '@/lib/utils';

export interface FunnelStep {
  label: string;
  value: number;
  formattedValue: string;
  /** Conversion rate from previous step (in %) — pre-computed from sums for accuracy. */
  rateFromPrev?: number;
  /** Optional label for the rate (e.g. "CTR", "LPV Rate", "CVR Lower Funnel"). */
  rateLabel?: string;
}

interface Props {
  steps: FunnelStep[];
  title?: string;
  className?: string;
}

/**
 * Conversion funnel with explicit, accurately-named rate labels between steps.
 * Rates must be pre-computed from summed numerators and denominators (never row averages).
 */
export function EnhancedFunnelCard({ steps, title = 'Conversion Funnel', className }: Props) {
  const count = steps.length;
  const getWidth = (i: number) => {
    const maxW = 100, minW = 50;
    return count > 1 ? maxW - ((maxW - minW) / (count - 1)) * i : maxW;
  };

  return (
    <div className={cn('bg-card rounded-xl border border-border p-5 shadow-sm', className)}>
      <h3 className="text-sm font-semibold text-card-foreground mb-4">{title}</h3>
      <div className="space-y-3">
        {steps.map((step, i) => {
          const width = getWidth(i);
          const showRate = i > 0 && step.rateFromPrev !== undefined;
          return (
            <div key={step.label} className="flex flex-col items-center">
              {showRate && (
                <p className="text-[11px] text-muted-foreground mb-1">
                  ↓ <span className="font-semibold text-card-foreground tabular-nums">{step.rateFromPrev!.toFixed(2)}%</span>
                  {step.rateLabel && <span className="text-muted-foreground/80 ml-1">{step.rateLabel}</span>}
                </p>
              )}
              <div
                className="h-12 rounded-lg bg-primary/10 flex items-center px-4 transition-all mx-auto"
                style={{ width: `${width}%` }}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-medium text-card-foreground">{step.label}</span>
                  <span className="text-sm font-bold text-primary tabular-nums">{step.formattedValue}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
