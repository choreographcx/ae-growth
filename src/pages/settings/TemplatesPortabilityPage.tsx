import { useDashboard } from '@/context/DashboardContext';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { TemplatesPortabilitySection } from '@/components/admin/TemplatesPortabilitySection';

export default function TemplatesPortabilityPage() {
  const { isSuperAdmin } = useAuth();
  const { client } = useDashboard();
  if (!isSuperAdmin) return <Navigate to="/" replace />;

  return (
    <SettingsPageShell title="Templates & Portability" subtitle="Export, import, and reuse dashboard configurations">
      <TemplatesPortabilitySection client={client} />
    </SettingsPageShell>
  );
}
