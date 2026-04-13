import { AlertItem } from '@/types/dashboard';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap = {
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
  success: CheckCircle,
};

const styleMap = {
  error: 'border-l-destructive/60 bg-destructive/[0.03]',
  warning: 'border-l-warning/60 bg-warning/[0.03]',
  success: 'border-l-success/60 bg-success/[0.03]',
  info: 'border-l-info/60 bg-info/[0.03]',
};

const iconColorMap = {
  error: 'text-destructive',
  warning: 'text-warning',
  success: 'text-success',
  info: 'text-info',
};

const severityLabel: Record<string, string> = {
  error: 'Critical',
  warning: 'Warning',
  success: 'Positive',
  info: 'Info',
};

export function AlertCard({ alert }: { alert: AlertItem }) {
  const Icon = iconMap[alert.type];
  return (
    <div className={cn(
      "flex gap-3 px-4 py-3.5 rounded-lg border border-border/60 border-l-[3px] transition-colors",
      styleMap[alert.type]
    )}>
      <Icon size={16} className={cn("shrink-0 mt-0.5", iconColorMap[alert.type])} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium text-card-foreground leading-snug">{alert.title}</p>
          <span className={cn(
            "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
            alert.type === 'error' && 'bg-destructive/10 text-destructive',
            alert.type === 'warning' && 'bg-warning/10 text-warning',
            alert.type === 'success' && 'bg-success/10 text-success',
            alert.type === 'info' && 'bg-info/10 text-info',
          )}>{severityLabel[alert.type]}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{alert.description}</p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">{alert.timestamp}</p>
      </div>
    </div>
  );
}
