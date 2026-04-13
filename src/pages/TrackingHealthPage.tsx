import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { dataSourceStatuses } from '@/data/mockData';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { CheckCircle, AlertTriangle, XCircle, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';

const statusConfig = {
  healthy: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', label: 'Healthy' },
  warning: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10', label: 'Warning' },
  error: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Error' },
  inactive: { icon: MinusCircle, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Inactive' },
};

export default function TrackingHealthPage() {
  const isMobile = useIsMobile();

  const statusAlerts = dataSourceStatuses
    .filter(d => d.warnings.length > 0 || d.missingFields.length > 0)
    .flatMap(d => [
      ...d.warnings.map((w, i) => ({ id: `${d.platform}-w-${i}`, type: 'warning' as const, title: `${d.platform}: ${w}`, description: `Latency: ${d.latency}`, timestamp: d.lastSync })),
      ...d.missingFields.map((f, i) => ({ id: `${d.platform}-m-${i}`, type: 'error' as const, title: `${d.platform}: Missing field`, description: `Field "${f}" is not being reported`, timestamp: d.lastSync })),
    ]);

  return (
    <div className="space-y-8">
      <SectionHeader title="Tracking Health" subtitle="Data quality and source status monitoring" />

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['healthy', 'warning', 'error', 'inactive'] as const).map(status => {
          const count = dataSourceStatuses.filter(d => d.status === status).length;
          const config = statusConfig[status];
          const Icon = config.icon;
          return (
            <div key={status} className={cn("bg-card rounded-xl border border-border p-5 shadow-sm flex items-center gap-3")}>
              <div className={cn("p-2 rounded-lg", config.bg)}><Icon size={20} className={config.color} /></div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">{count}</p>
                <p className="text-xs text-muted-foreground">{config.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Source health table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-card-foreground">Data Source Status</h3>
        </div>
        {isMobile ? (
          <div className="p-4 space-y-3">
            {dataSourceStatuses.map(d => {
              const config = statusConfig[d.status];
              const Icon = config.icon;
              return (
                <div key={d.platform} className="bg-background rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-card-foreground">{d.platform}</span>
                    <Badge variant="outline" className={cn("text-xs", config.color)}><Icon size={12} className="mr-1" />{config.label}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Last Sync:</span> <span className="text-card-foreground">{d.lastSync}</span></div>
                    <div><span className="text-muted-foreground">Latency:</span> <span className="text-card-foreground">{d.latency}</span></div>
                    <div><span className="text-muted-foreground">Records:</span> <span className="text-card-foreground">{d.recordCount.toLocaleString()}</span></div>
                    {d.missingFields.length > 0 && <div className="col-span-2"><span className="text-destructive">Missing: {d.missingFields.join(', ')}</span></div>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Last Sync</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Latency</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Records</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Issues</th>
                </tr>
              </thead>
              <tbody>
                {dataSourceStatuses.map(d => {
                  const config = statusConfig[d.status];
                  const Icon = config.icon;
                  return (
                    <tr key={d.platform} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-card-foreground">{d.platform}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className={cn("text-xs", config.color)}><Icon size={12} className="mr-1" />{config.label}</Badge></td>
                      <td className="px-4 py-3 text-card-foreground">{d.lastSync}</td>
                      <td className="px-4 py-3 text-card-foreground">{d.latency}</td>
                      <td className="px-4 py-3 text-card-foreground">{d.recordCount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {d.missingFields.length > 0 && <span className="text-xs text-destructive">Missing: {d.missingFields.join(', ')}</span>}
                        {d.warnings.length > 0 && <span className="text-xs text-warning ml-2">{d.warnings.join(', ')}</span>}
                        {d.missingFields.length === 0 && d.warnings.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alerts */}
      {statusAlerts.length > 0 && (
        <>
          <SectionHeader title="Active Issues" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {statusAlerts.map(a => <AlertCard key={a.id} alert={a} />)}
          </div>
        </>
      )}
    </div>
  );
}
