import { KPIGroupData } from '@/types/dashboard';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface KPIGroupCardProps {
  data: KPIGroupData;
  className?: string;
}

export function KPIGroupCard({ data, className }: KPIGroupCardProps) {
  const isMobile = useIsMobile();

  if (isMobile) return <MobileKPICard data={data} className={className} />;
  return <DesktopKPICard data={data} className={className} />;
}

/* ─── Desktop Card ─── */
function DesktopKPICard({ data, className }: KPIGroupCardProps) {
  const { primary, supporting } = data;

  return (
    <div className={cn(
      "bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col",
      className
    )}>
      <div className="mb-1">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{data.title}</p>
      </div>

      <p className="text-[26px] font-bold text-card-foreground tracking-tight leading-none">{primary.formattedValue}</p>
      <ChangeIndicator value={primary.change} />

      {supporting.length > 0 && (
        <div className="mt-auto pt-3.5 border-t border-border/50 mt-3.5">
          <div className={cn(
            "grid gap-x-4 gap-y-2",
            supporting.length === 1 ? "grid-cols-1" : "grid-cols-2"
          )}>
            {supporting.map((s, i) => (
              <div key={i} className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-1">{s.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[15px] font-semibold text-card-foreground leading-none">{s.formattedValue}</span>
                  {s.change !== undefined && <MiniChange value={s.change} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Mobile Card — compact, dense, scannable ─── */
function MobileKPICard({ data, className }: KPIGroupCardProps) {
  const { primary, supporting } = data;

  return (
    <div className={cn(
      "bg-card rounded-lg border border-border px-2.5 py-2 shadow-sm",
      className
    )}>
      <div className="flex items-baseline gap-1.5 min-w-0">
        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider leading-none">{data.title}</p>
        <MobileChange value={primary.change} />
      </div>
      <p className="text-lg font-bold text-card-foreground tracking-tight leading-none mt-0.5">{primary.formattedValue}</p>
      {supporting.length > 0 && (
        <div className="flex items-baseline gap-3 mt-1 pt-1 border-t border-border/30">
          {supporting.map((s, i) => (
            <div key={i} className="flex items-baseline gap-0.5">
              <span className="text-[9px] text-muted-foreground">{s.label}</span>
              <span className="text-[11px] font-semibold text-card-foreground">{s.formattedValue}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Shared sub-components ─── */

function ChangeIndicator({ value }: { value: number }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const Icon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown;
  return (
    <div className={cn(
      "flex items-center gap-1 mt-1.5 text-[11px]",
      isPositive ? 'text-kpi-positive' : isNeutral ? 'text-kpi-neutral' : 'text-kpi-negative'
    )}>
      <Icon size={11} />
      <span className="font-semibold">{isPositive ? '+' : ''}{value}%</span>
      <span className="text-muted-foreground font-normal">vs prev</span>
    </div>
  );
}

function MobileChange({ value }: { value: number }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  return (
    <span className={cn(
      "text-[11px] font-semibold leading-none",
      isPositive ? 'text-kpi-positive' : isNeutral ? 'text-kpi-neutral' : 'text-kpi-negative'
    )}>
      {isPositive ? '+' : ''}{value}%
    </span>
  );
}

function MiniChange({ value }: { value: number }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  return (
    <span className={cn(
      "text-[10px] font-semibold leading-none",
      isPositive ? 'text-kpi-positive' : isNeutral ? 'text-kpi-neutral' : 'text-kpi-negative'
    )}>
      {isPositive ? '↑' : isNeutral ? '–' : '↓'}{Math.abs(value)}%
    </span>
  );
}
