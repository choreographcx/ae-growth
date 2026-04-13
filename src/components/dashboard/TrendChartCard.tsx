import { TimeSeriesPoint } from '@/types/dashboard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { CurrencySymbol, getCurrencyPrefix } from '@/lib/currency';

interface TrendChartCardProps {
  title: string;
  data: TimeSeriesPoint[];
  color?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  currency?: string;
  className?: string;
}

interface CurrencyTickProps {
  x?: number;
  y?: number;
  payload?: { value: number | string };
  currency: string;
  valueSuffix?: string;
}

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number | string }>;
  label?: string | number;
  title: string;
  currency?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}

function formatCompactValue(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toLocaleString();
}

function CurrencyTick({ x = 0, y = 0, payload, currency, valueSuffix = '' }: CurrencyTickProps) {
  const value = Number(payload?.value ?? 0);
  const formattedValue = `${formatCompactValue(value)}${valueSuffix}`;

  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-56} y={-8} width={56} height={16} style={{ overflow: 'visible' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', fontSize: 10, color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap', lineHeight: 1 }}>
          <CurrencySymbol currency={currency} size={10} />
          <span>{formattedValue}</span>
        </div>
      </foreignObject>
    </g>
  );
}

function TrendTooltip({ active, payload, label, title, currency, valuePrefix = '', valueSuffix = '' }: TrendTooltipProps) {
  if (!active || !payload?.length) return null;

  const value = Number(payload[0]?.value ?? 0);
  const iconSrc = currency ? getCurrencyIconSrc(currency) : null;
  const prefix = currency ? getCurrencyPrefix(currency) : valuePrefix;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="text-muted-foreground">{label ? new Date(label).toLocaleDateString() : ''}</p>
      <div className="mt-1 flex items-center justify-between gap-4">
        <span className="text-card-foreground">{title}</span>
        <span className="inline-flex items-center gap-1 font-medium text-card-foreground">
          {iconSrc ? <img src={iconSrc} alt={currency ?? 'Currency'} width={11} height={11} className="inline-block align-baseline" /> : prefix ? <span>{prefix}</span> : null}
          <span>{value.toLocaleString()}{valueSuffix}</span>
        </span>
      </div>
    </div>
  );
}

export function TrendChartCard({ title, data, color = 'hsl(var(--chart-1))', valuePrefix = '', valueSuffix = '', currency, className }: TrendChartCardProps) {
  const currencyIcon = currency ? getCurrencyIconSrc(currency) : null;

  return (
    <div className={cn("bg-card rounded-xl border border-border p-5 shadow-sm", className)}>
      <h3 className="text-sm font-semibold text-card-foreground mb-4">{title}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`grad-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={(v: string) => { const d = new Date(v); return `${d.getMonth() + 1}/${d.getDate()}`; }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={currencyIcon ? 60 : 44}
              tick={currency ? <CurrencyTick currency={currency} valueSuffix={valueSuffix} /> : { fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={currency ? undefined : (v: number) => `${valuePrefix}${formatCompactValue(v)}${valueSuffix}`}
            />
            <Tooltip content={<TrendTooltip title={title} currency={currency} valuePrefix={valuePrefix} valueSuffix={valueSuffix} />} />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#grad-${title.replace(/\s/g, '')})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
