import { useDashboard } from '@/context/DashboardContext';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { Badge } from '@/components/ui/badge';

/**
 * Taxonomy is currently embedded inside ReportingRulesSection. We expose it as
 * a dedicated landing page so super-admins can access it directly from the
 * sidebar; the underlying editor can be split out in a follow-up pass.
 */
export default function TaxonomyPage() {
  const { isSuperAdmin } = useAuth();
  if (!isSuperAdmin) return <Navigate to="/" replace />;

  return (
    <SettingsPageShell title="Taxonomy" subtitle="Naming conventions and dimension taxonomy">
      <div className="text-sm text-muted-foreground">
        Taxonomy is managed inside <a href="/settings/reporting-rules" className="text-primary hover:underline">Reporting Rules</a>.
        <Badge variant="outline" className="ml-2 text-[10px]">Standalone editor coming soon</Badge>
      </div>
    </SettingsPageShell>
  );
}
