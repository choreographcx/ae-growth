import { KPIGroupData } from '@/types/dashboard';
import { TrendingUp, TrendingDown, Minus, DollarSign, Eye, MousePointerClick, Target, Users, FileText, Play, UserCheck, type LucideIcon } from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { CurrencySymbol } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const iconMap: Record<string, LucideIcon> = {
  DollarSign,
  Eye,
  MousePointerClick,
  Target,
  Users,
  FileText,
  Play,
  UserCheck,
};

const iconColorMap: Record<string, string> = {
  DollarSign: 'text-emerald-600 bg-emerald-50',
  Eye: 'text-blue-600 bg-blue-50',
  MousePointerClick: 'text-violet-600 bg-violet-50',
  Target: 'text-orange-600 bg-orange-50',
  Users: 'text-cyan-600 bg-cyan-50',
  FileText: 'text-rose-600 bg-rose-50',
  Play: 'text-pink-600 bg-pink-50',
  UserCheck: 'text-teal-600 bg-teal-50',
};

interface KPIGroupCardProps {
  data: KPIGroupData;
  className?: string;
}

export function KPIGroupCard({ data, className }: KPIGroupCardProps) {
  return (
    <>
      <div className={cn("lg:hidden", className)}>
        <MobileKPICard data={data} />
      </div>
      <div className={cn("hidden lg:flex", className)}>
        <DesktopKPICard data={data} className="w-full" />
      </div>
    </>
  );
}

/* ─── Desktop Card ─── */
function DesktopKPICard({ data, className }: KPIGroupCardProps) {
  const { primary, supporting, icon } = data;
  const { client } = useDashboard();
  const isCurrencyIcon = icon === 'DollarSign';
  const IconComp = icon && !isCurrencyIcon ? iconMap[icon] : null;
  const colorClass = icon ? iconColorMap[icon] : '';

  return (
    <div className={cn(
      "bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col",
      className
    )}>
      <div className="flex items-start justify-between mb-1">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{data.title}</p>
        {isCurrencyIcon && (
          <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg", colorClass)}>
            <CurrencySymbol currency={client.currency} size={16} className="text-emerald-600" />
          </div>
        )}
        {IconComp && (
          <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg", colorClass)}>
            <IconComp size={16} />
          </div>
        )}
      </div>

      <p className="text-[26px] font-bold text-card-foreground tracking-tight leading-none">{primary.formattedValue}</p>
      <ChangeIndicator value={primary.change} />

      {supporting.length > 0 && (
        <div className="mt-auto pt-3.5 border-t border-border/50 mt-3.5">
          <div className={cn(
            "grid gap-x-3 gap-y-2",
            supporting.length === 1 ? "grid-cols-1" : "grid-cols-2"
          )}>
            {supporting.map((s, i) => (
              <div key={i} className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-1 truncate">{s.label}</p>
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className="text-[15px] font-semibold text-card-foreground leading-none truncate">{s.formattedValue}</span>
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
  const { primary, supporting, icon } = data;
  const { client } = useDashboard();
  const isCurrencyIcon = icon === 'DollarSign';
  const IconComp = icon && !isCurrencyIcon ? iconMap[icon] : null;
  const colorClass = icon ? iconColorMap[icon] : '';

  return (
    <div className={cn(
      "bg-card rounded-lg border border-border px-2.5 py-2 shadow-sm min-w-0 overflow-hidden",
      className
    )}>
      <div className="flex items-center gap-1.5 min-w-0">
        {isCurrencyIcon && (
          <div className={cn("flex items-center justify-center w-5 h-5 rounded shrink-0", colorClass)}>
            <CurrencySymbol currency={client.currency} size={11} className="text-emerald-600" />
          </div>
        )}
        {IconComp && (
          <div className={cn("flex items-center justify-center w-5 h-5 rounded shrink-0", colorClass)}>
            <IconComp size={11} />
          </div>
        )}
        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider leading-none truncate flex-1 min-w-0">{data.title}</p>
        <MobileChange value={primary.change} />
      </div>
      <p className="text-lg font-bold text-card-foreground tracking-tight leading-none mt-0.5 truncate">{primary.formattedValue}</p>
      {supporting.length > 0 && (
        <div className="flex items-baseline gap-2 mt-1 pt-1 border-t border-border/30 min-w-0 overflow-hidden">
          {supporting.map((s, i) => (
            <div key={i} className="flex items-baseline gap-0.5 min-w-0 truncate">
              <span className="text-[9px] text-muted-foreground shrink-0">{s.label}</span>
              <span className="text-[11px] font-semibold text-card-foreground truncate">{s.formattedValue}</span>
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
