import { cn } from '@/lib/utils';

interface FunnelStep {
  label: string;
  value: number;
  formattedValue: string;
}

const defaultSteps: FunnelStep[] = [
  { label: 'Impressions', value: 12450000, formattedValue: '12.45M' },
  { label: 'Clicks', value: 186750, formattedValue: '186,750' },
  { label: 'Landing Page Views', value: 142300, formattedValue: '142,300' },
  { label: 'Conversions', value: 3842, formattedValue: '3,842' },
];

export function FunnelCard({ steps = defaultSteps }: { steps?: FunnelStep[] }) {
  const maxVal = steps[0]?.value || 1;
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-card-foreground mb-4">Conversion Funnel</h3>
      <div className="space-y-3">
        {steps.map((step, i) => {
          const width = Math.max(20, (step.value / maxVal) * 100);
          const rate = i > 0 ? ((step.value / steps[i - 1].value) * 100).toFixed(1) : null;
          return (
            <div key={step.label}>
              {rate && <p className="text-xs text-muted-foreground text-center mb-1">↓ {rate}%</p>}
              <div className="relative">
                <div className="h-12 rounded-lg bg-primary/10 flex items-center px-4 transition-all" style={{ width: `${width}%` }}>
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-medium text-card-foreground">{step.label}</span>
                    <span className="text-sm font-bold text-primary">{step.formattedValue}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
