import { KPIPair } from '@/types/dashboard';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface KPIPairCardProps {
  pair: KPIPair;
  className?: string;
}

export function KPIPairCard({ pair, className }: KPIPairCardProps) {
  const { primary, secondary } = pair;

  return (
    <div className={cn("bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow duration-300", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{primary.label}</p>
          <p className="text-2xl font-bold text-card-foreground tracking-tight">{primary.formattedValue}</p>
          <ChangeIndicator value={primary.change} />
        </div>
        <div className="w-20 h-10 mt-1">
          <MiniSparkline data={primary.trend} positive={primary.change >= 0} />
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{secondary.label}</p>
            <p className="text-base font-semibold text-card-foreground">{secondary.formattedValue}</p>
          </div>
          <ChangeIndicator value={secondary.change} size="sm" />
        </div>
      </div>
    </div>
  );
}

function ChangeIndicator({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const Icon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown;
  return (
    <div className={cn(
      "flex items-center gap-1 mt-1",
      size === 'sm' ? 'text-xs' : 'text-sm',
      isPositive ? 'text-kpi-positive' : isNeutral ? 'text-kpi-neutral' : 'text-kpi-negative'
    )}>
      <Icon size={size === 'sm' ? 12 : 14} />
      <span className="font-medium">{isPositive ? '+' : ''}{value}%</span>
    </div>
  );
}

function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const chartData = data.map((v, i) => ({ x: i, y: v }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id={positive ? 'sparkPos' : 'sparkNeg'} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={positive ? 'hsl(var(--kpi-positive))' : 'hsl(var(--kpi-negative))'} stopOpacity={0.3} />
            <stop offset="100%" stopColor={positive ? 'hsl(var(--kpi-positive))' : 'hsl(var(--kpi-negative))'} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="y" stroke={positive ? 'hsl(var(--kpi-positive))' : 'hsl(var(--kpi-negative))'} strokeWidth={1.5} fill={`url(#${positive ? 'sparkPos' : 'sparkNeg'})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
