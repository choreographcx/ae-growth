import { supabase } from '@/integrations/supabase/client';

export type PermissionKey =
  | 'edit_admin'
  | 'manage_users'
  | 'export_pdf'
  | 'manage_naming'
  | 'view_tracking'
  | 'change_alerts';

export const PERMISSIONS: { key: PermissionKey; label: string; description: string }[] = [
  { key: 'edit_admin',     label: 'Can edit admin settings',  description: 'Modify client, branding, and platform configuration' },
  { key: 'manage_users',   label: 'Can manage users',         description: 'Invite, approve, edit, or remove other users' },
  { key: 'export_pdf',     label: 'Can export PDF',           description: 'Generate and download PDF dashboard reports' },
  { key: 'manage_naming',  label: 'Can manage naming rules',  description: 'Edit campaign naming conventions and validation rules' },
  { key: 'view_tracking',  label: 'Can view tracking health', description: 'Access the tracking diagnostics page' },
  { key: 'change_alerts',  label: 'Can change alert thresholds', description: 'Edit anomaly and pacing alert thresholds' },
];

export type UserPermissions = Record<PermissionKey, boolean>;

// Sensible defaults per role (best-practice principle of least privilege).
export function defaultPermissionsForRole(role: string): UserPermissions {
  if (role === 'admin' || role === 'superadmin') {
    // Admins get every permission by default.
    return {
      edit_admin: true,
      manage_users: true,
      export_pdf: true,
      manage_naming: true,
      view_tracking: true,
      change_alerts: true,
    };
  }
  // Standard users (viewers): read-only + can export their reports.
  return {
    edit_admin: false,
    manage_users: false,
    export_pdf: true,
    manage_naming: false,
    view_tracking: false,
    change_alerts: false,
  };
}

// Granular permissions live alongside other client config under a single jsonb row
// keyed by the *admin's* user_id (the person managing them). We use a dedicated
// "global" config row keyed by a fixed UUID-like sentinel? Simpler: store them on
// the *target user's* own client_configs row under config.permissions so RLS
// (admin can read/write all configs) works cleanly.
export async function loadUserPermissions(userId: string, role: string): Promise<UserPermissions> {
  const { data } = await supabase
    .from('client_configs')
    .select('config')
    .eq('user_id', userId)
    .maybeSingle();

  const stored = (data?.config as any)?.permissions as Partial<UserPermissions> | undefined;
  const defaults = defaultPermissionsForRole(role);
  return { ...defaults, ...(stored ?? {}) };
}

export async function saveUserPermissions(userId: string, perms: UserPermissions): Promise<void> {
  const { data: existing } = await supabase
    .from('client_configs')
    .select('id, config')
    .eq('user_id', userId)
    .maybeSingle();

  const nextConfig = { ...((existing?.config as any) ?? {}), permissions: perms };

  if (existing?.id) {
    const { error } = await supabase
      .from('client_configs')
      .update({ config: nextConfig })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('client_configs')
      .insert({ user_id: userId, config: nextConfig });
    if (error) throw error;
  }
}

// Role helpers — only admin/user/superadmin exist in the DB enum.
export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin',  description: 'Full access to all settings, data, and user management' },
  { value: 'user',  label: 'Viewer', description: 'Read-only dashboard access (no admin or tracking pages)' },
] as const;

export async function setUserRole(userId: string, newRole: 'admin' | 'user'): Promise<void> {
  // Remove existing non-superadmin roles, then insert the new one.
  // Never touch superadmin — that's reserved for Rachel.
  const { error: delErr } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .in('role', ['admin', 'user']);
  if (delErr) throw delErr;

  const { error: insErr } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role: newRole });
  if (insErr) throw insErr;

  // Always keep the baseline 'user' role too, so admins can still query as users.
  if (newRole === 'admin') {
    await supabase.from('user_roles').insert({ user_id: userId, role: 'user' });
  }

  // Reset granular permissions to the role's defaults.
  await saveUserPermissions(userId, defaultPermissionsForRole(newRole));
}
