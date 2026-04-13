import { AlertItem } from '@/types/dashboard';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap = {
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
  success: CheckCircle,
};

const colorMap = {
  warning: 'text-warning border-warning/20 bg-warning/5',
  error: 'text-destructive border-destructive/20 bg-destructive/5',
  info: 'text-info border-info/20 bg-info/5',
  success: 'text-success border-success/20 bg-success/5',
};

export function AlertCard({ alert }: { alert: AlertItem }) {
  const Icon = iconMap[alert.type];
  return (
    <div className={cn("flex gap-3 p-4 rounded-lg border", colorMap[alert.type])}>
      <Icon size={18} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-card-foreground">{alert.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
        <p className="text-xs text-muted-foreground mt-1">{alert.timestamp}</p>
      </div>
    </div>
  );
}
