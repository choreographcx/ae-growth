import { useDashboard } from '@/context/DashboardContext';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { ReportingRulesSection } from '@/components/admin/ReportingRulesSection';
import { AlertRulesSection } from '@/components/admin/AlertRulesSection';

export default function ReportingRulesPage() {
  const { isSuperAdmin } = useAuth();
  const { client, updateClient } = useDashboard();
  if (!isSuperAdmin) return <Navigate to="/" replace />;

  return (
    <SettingsPageShell title="Reporting Rules" subtitle="Metric mapping, naming normalization, alerts and aliases">
      <ReportingRulesSection client={client} updateClient={updateClient} />
      <div className="mt-8 pt-6 border-t border-border">
        <h3 className="text-sm font-semibold text-card-foreground mb-3">Alert Rules</h3>
        <AlertRulesSection
          alertRules={(client as any).alertRules}
          onChange={rules => updateClient({ alertRules: rules } as any)}
        />
      </div>
    </SettingsPageShell>
  );
}
