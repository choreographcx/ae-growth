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
  const count = steps.length;
  // Fixed funnel widths: widest at top, narrowest at bottom, but still generous
  const getWidth = (index: number) => {
    const maxW = 100;
    const minW = 50;
    const step = count > 1 ? (maxW - minW) / (count - 1) : 0;
    return maxW - step * index;
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-card-foreground mb-4">Conversion Funnel</h3>
      <div className="space-y-3">
        {steps.map((step, i) => {
          const width = getWidth(i);
          const rate = i > 0 ? ((step.value / steps[i - 1].value) * 100).toFixed(1) : null;
          return (
            <div key={step.label} className="flex flex-col items-center">
              {rate && <p className="text-xs text-muted-foreground mb-1">↓ {rate}%</p>}
              <div className="h-12 rounded-lg bg-primary/10 flex items-center px-4 transition-all mx-auto" style={{ width: `${width}%` }}>
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-medium text-card-foreground">{step.label}</span>
                  <span className="text-sm font-bold text-primary">{step.formattedValue}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
