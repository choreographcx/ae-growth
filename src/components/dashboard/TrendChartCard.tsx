import { ReactNode } from 'react';
import { TimeSeriesPoint } from '@/types/dashboard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface TrendChartCardProps {
  title: string;
  data: TimeSeriesPoint[];
  color?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  className?: string;
}

export function TrendChartCard({ title, data, color = 'hsl(var(--chart-1))', valuePrefix = '', valueSuffix = '', className }: TrendChartCardProps) {
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
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => `${valuePrefix}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}${valueSuffix}`} />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
              formatter={(v: number) => [`${valuePrefix}${v.toLocaleString()}${valueSuffix}`, title]}
              labelFormatter={(l: string) => new Date(l).toLocaleDateString()}
            />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#grad-${title.replace(/\s/g, '')})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
