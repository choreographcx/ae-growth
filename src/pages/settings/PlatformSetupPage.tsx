import { useDashboard } from '@/context/DashboardContext';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { PlatformIntegrityPanel } from '@/components/admin/PlatformIntegrityPanel';
import AdminPage from '../AdminPage';

// We re-export the existing modular platform card via a thin wrapper page so
// behaviour stays identical — the platform UI itself is complex enough that
// duplicating it here would be wasteful. We render only the Platform Setup
// section by inlining it.
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
