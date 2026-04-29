import { useRef, useState, useEffect, useCallback } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Package,
  ChevronDown,
} from 'lucide-react';

interface StatusPillProps {
  label: string;
  status: 'complete' | 'warning' | 'missing' | 'default' | 'info';
  detail?: string;
}

function StatusPill({ label, status, detail }: StatusPillProps) {
  const styles = {
    complete: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    missing: 'bg-red-50 text-red-700 border-red-200',
    default: 'bg-muted text-muted-foreground border-border',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  const icons = {
    complete: <CheckCircle2 size={11} />,
    warning: <AlertCircle size={11} />,
    missing: <AlertCircle size={11} />,
    default: <Clock size={11} />,
    info: <Clock size={11} />,
  };

  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium', styles[status])}>
      {icons[status]}
      <span>{label}</span>
      {detail && <span className="opacity-70">· {detail}</span>}
    </div>
  );
}

export function SetupStatusSummary() {
  const { client } = useDashboard();

  const enabledCount = Object.values(client.platforms).filter(p => p.enabled).length;

  const hasBranding = !!(client as any).branding?.primaryColor;
  const hasMeasurement = !!(client.ga4PropertyId && client.primaryConversion);
  const hasReporting = client.metricMappings.length > 0;
  const alertsConfigured = ((client as any).alertRules ?? []).some((r: any) => r?.active) ||
    Object.values(client.alertThresholds).some(v => v > 0);

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-card-foreground uppercase tracking-wider">Setup Status</h3>
        <div className="flex items-center gap-2">
          <button className="text-[11px] text-primary hover:text-primary/80 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm">
            Validate Setup
          </button>
          <span className="text-border">·</span>
          <button className="text-[11px] text-primary hover:text-primary/80 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm">
            Export Config
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <StatusPill label="Branding" status={hasBranding ? 'complete' : 'missing'} detail={hasBranding ? 'Complete' : 'Missing'} />
        <StatusPill
          label="Platforms"
          status={enabledCount > 0 ? 'complete' : 'missing'}
          detail={`${enabledCount} enabled`}
        />
        <StatusPill label="Measurement" status={hasMeasurement ? 'complete' : 'warning'} detail={hasMeasurement ? 'Complete' : 'Incomplete'} />
        <StatusPill label="Reporting" status={hasReporting ? 'complete' : 'default'} detail={hasReporting ? 'Configured' : 'Needs Review'} />
        <StatusPill label="Alerts" status={alertsConfigured ? 'complete' : 'default'} detail={alertsConfigured ? 'Configured' : 'Default'} />
        <StatusPill label="Users" status="info" detail="Active" />
      </div>
    </div>
  );
}

interface AdminSectionProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function AdminSection({ id, icon, title, subtitle, badge, children, defaultOpen = false }: AdminSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0);

  const updateHeight = useCallback(() => {
    if (!contentRef.current) return;
    if (open) {
      setHeight(contentRef.current.scrollHeight);
      // After transition completes, set to auto so content can resize naturally
      const timeout = setTimeout(() => setHeight(undefined), 250);
      return () => clearTimeout(timeout);
    } else {
      // First set explicit height so transition can animate from it
      setHeight(contentRef.current.scrollHeight);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setHeight(0));
      });
    }
  }, [open]);

  useEffect(() => {
    updateHeight();
  }, [updateHeight]);

  return (
    <div
      className={cn(
        'bg-card rounded-xl border border-border shadow-sm overflow-hidden transition-shadow duration-200',
        open && 'shadow-md'
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(!open);
          }
        }}
        aria-expanded={open}
        aria-controls={`section-${id}`}
        className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-inset rounded-xl"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
            {badge}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <ChevronDown
          size={16}
          className={cn(
            'text-muted-foreground transition-transform duration-250 shrink-0',
            open && 'rotate-180'
          )}
        />
      </button>
      <div
        id={`section-${id}`}
        ref={contentRef}
        role="region"
        aria-labelledby={`section-trigger-${id}`}
        style={{ height: height === undefined ? 'auto' : height }}
        className={cn(
          'transition-[height,opacity] duration-250 ease-in-out overflow-hidden',
          !open && 'opacity-0',
          open && 'opacity-100'
        )}
      >
        <div className="px-6 pb-6 border-t border-border/50">
          {children}
        </div>
      </div>
    </div>
  );
}

// Placeholder skeleton for sections not yet built
export function SectionPlaceholder({ description }: { description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
        <Package size={20} className="text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <p className="text-xs text-muted-foreground/60 mt-1">Coming in a future phase</p>
    </div>
  );
}
