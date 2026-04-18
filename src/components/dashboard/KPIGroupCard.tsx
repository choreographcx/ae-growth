import { KPIGroupData } from '@/types/dashboard';
import { TrendingUp, TrendingDown, Minus, DollarSign, Eye, MousePointerClick, Target, Users, FileText, Play, UserCheck, Info, type LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDashboard } from '@/context/DashboardContext';
import { CurrencySymbol } from '@/lib/currency';
import { cn } from '@/lib/utils';


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
        <div className="flex items-center gap-1 min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{data.title}</p>
          {data.tooltip && <InfoTooltip text={data.tooltip} />}
        </div>
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
      "bg-card rounded-lg border border-border px-3 py-3 shadow-sm min-w-0 overflow-hidden",
      className
    )}>
      <div className="flex items-center gap-2 min-w-0">
        {isCurrencyIcon && (
          <div className={cn("flex items-center justify-center w-7 h-7 rounded shrink-0", colorClass)}>
            <CurrencySymbol currency={client.currency} size={14} className="text-emerald-600" />
          </div>
        )}
        {IconComp && (
          <div className={cn("flex items-center justify-center w-7 h-7 rounded shrink-0", colorClass)}>
            <IconComp size={14} />
          </div>
        )}
        <p className="text-[14px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight truncate flex-1 min-w-0">{data.title}</p>
        {data.tooltip && <InfoTooltip text={data.tooltip} compact />}
        <MobileChange value={primary.change} />
      </div>
      <p className="text-[30px] font-bold text-card-foreground tracking-tight leading-none mt-2 truncate">{primary.formattedValue}</p>
      {supporting.length > 0 && (
        <div className={cn(
          "mt-2.5 pt-2 border-t border-border/30 grid gap-x-3 gap-y-1.5 min-w-0",
          supporting.length === 1 ? "grid-cols-1" : "grid-cols-2"
        )}>
          {supporting.map((s, i) => (
            <div key={i} className="min-w-0 flex flex-col leading-tight gap-0.5">
              <span className="text-[14px] text-muted-foreground tracking-wide truncate">{s.label}</span>
              <span className="text-[14px] font-semibold text-card-foreground truncate">{s.formattedValue}</span>
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
      "flex items-center gap-1 mt-1.5 text-[14px]",
      isPositive ? 'text-kpi-positive' : isNeutral ? 'text-kpi-neutral' : 'text-kpi-negative'
    )}>
      <Icon size={14} />
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
      "text-[14px] font-semibold leading-none",
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

function InfoTooltip({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="More info"
            className="text-muted-foreground/70 hover:text-foreground transition-colors shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <Info size={compact ? 10 : 12} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
