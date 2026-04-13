import { BudgetPacing as BudgetPacingType } from '@/types/dashboard';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export function BudgetPacingCard({ data }: { data: BudgetPacingType }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-card-foreground mb-4">Budget Pacing</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <PacingStat label="Total Budget" value={`$${data.totalBudget.toLocaleString()}`} />
        <PacingStat label="Spend to Date" value={`$${data.spendToDate.toLocaleString()}`} />
        <PacingStat label="Pacing" value={`${data.pacingPercent}%`} highlight={data.pacingPercent > 95 || data.pacingPercent < 75} />
        <PacingStat label="Projected Spend" value={`$${data.projectedSpend.toLocaleString()}`} />
      </div>
      <div className="space-y-3">
        {data.platformPacing.map(p => (
          <div key={p.platform}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-card-foreground">{p.platform}</span>
              <span className="text-xs text-muted-foreground">${p.spent.toLocaleString()} / ${p.budget.toLocaleString()} ({p.pacing}%)</span>
            </div>
            <Progress value={p.pacing} className="h-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PacingStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold", highlight ? "text-warning" : "text-card-foreground")}>{value}</p>
    </div>
  );
}
