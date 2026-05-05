import { useDashboard } from '@/context/DashboardContext';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { BrandingThemeSection } from '@/components/admin/BrandingThemeSection';

export default function BrandThemePage() {
  const { isSuperAdmin } = useAuth();
  const { client, updateClient } = useDashboard();
  if (!isSuperAdmin) return <Navigate to="/" replace />;

  return (
    <SettingsPageShell title="Brand & Theme" subtitle="Logo, colors, and visual customization">
      <BrandingThemeSection
        branding={(client as any).branding}
        onChange={b => updateClient({ branding: b } as any)}
      />
    </SettingsPageShell>
  );
}
