import { useDashboard } from '@/context/DashboardContext';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { MeasurementSetupSection } from '@/components/admin/MeasurementSetupSection';

export default function MeasurementSettingsPage() {
  const { isSuperAdmin } = useAuth();
  const { client, updateClient } = useDashboard();
  if (!isSuperAdmin) return <Navigate to="/" replace />;

  return (
    <SettingsPageShell title="Measurement Settings" subtitle="Analytics, tracking, and conversion configuration">
      <MeasurementSetupSection client={client} updateClient={updateClient} />
    </SettingsPageShell>
  );
}
