import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { UserManagement } from '@/components/admin/UserManagement';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

export default function UsersAccessPage() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return (
    <SettingsPageShell title="Users & Access" subtitle="Manage team members, roles, and permissions" hideSave>
      <UserManagement />
    </SettingsPageShell>
  );
}
