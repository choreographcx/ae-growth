import { useDashboard } from '@/context/DashboardContext';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { PlatformIntegrityPanel } from '@/components/admin/PlatformIntegrityPanel';
import { PlatformSetupSection } from './_PlatformSetupSection';

export default function PlatformSetupPage() {
  const { client } = useDashboard();
  return (
    <SettingsPageShell
      title="Platform Setup"
      subtitle="Enable platforms, set budgets and reporting currencies"
    >
      <PlatformIntegrityPanel client={client} />
      <div className="mt-4">
        <PlatformSetupSection />
      </div>
    </SettingsPageShell>
  );
}
