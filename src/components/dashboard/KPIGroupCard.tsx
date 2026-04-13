import { KPIGroupData } from '@/types/dashboard';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface KPIGroupCardProps {
  data: KPIGroupData;
  className?: string;
}

export function KPIGroupCard({ data, className }: KPIGroupCardProps) {
  const { primary, supporting } = data;
  const chartData = primary.trend.map((v, i) => ({ x: i, y: v }));
  const isPositive = primary.change >= 0;

  return (
    <div className={cn(
      "bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col justify-between",
      className
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{data.title}</p>
          <p className="text-[28px] font-bold text-card-foreground tracking-tight leading-none">{primary.formattedValue}</p>
          <ChangeIndicator value={primary.change} />
        </div>
        <div className="w-[72px] h-9 mt-1 opacity-70">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`spark-${data.title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isPositive ? 'hsl(var(--kpi-positive))' : 'hsl(var(--kpi-negative))'} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={isPositive ? 'hsl(var(--kpi-positive))' : 'hsl(var(--kpi-negative))'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="y" stroke={isPositive ? 'hsl(var(--kpi-positive))' : 'hsl(var(--kpi-negative))'} strokeWidth={1.5} fill={`url(#spark-${data.title.replace(/\s/g, '')})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      {supporting.length > 0 && (
        <div className="mt-3.5 pt-3 border-t border-border/60 flex items-center gap-4 flex-wrap">
          {supporting.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">{s.label}</span>
              <span className="text-sm font-semibold text-card-foreground">{s.formattedValue}</span>
              {s.change !== undefined && <MiniChange value={s.change} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChangeIndicator({ value }: { value: number }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const Icon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown;
  return (
    <div className={cn(
      "flex items-center gap-1 mt-1.5 text-xs",
      isPositive ? 'text-kpi-positive' : isNeutral ? 'text-kpi-neutral' : 'text-kpi-negative'
    )}>
      <Icon size={12} />
      <span className="font-medium">{isPositive ? '+' : ''}{value}%</span>
      <span className="text-muted-foreground font-normal ml-0.5">vs prev</span>
    </div>
  );
}

function MiniChange({ value }: { value: number }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  return (
    <span className={cn(
      "text-[10px] font-medium",
      isPositive ? 'text-kpi-positive' : isNeutral ? 'text-kpi-neutral' : 'text-kpi-negative'
    )}>
      {isPositive ? '↑' : isNeutral ? '→' : '↓'}{Math.abs(value)}%
    </span>
  );
}
