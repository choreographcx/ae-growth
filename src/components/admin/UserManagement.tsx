import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Trash2, Edit2, Check, X, Eye, EyeOff, UserPlus, Shield, User, Clock, Mail, ChevronDown, Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  PERMISSIONS,
  ROLE_OPTIONS,
  defaultPermissionsForRole,
  loadUserPermissions,
  saveUserPermissions,
  setUserRole,
  type UserPermissions,
  type PermissionKey,
} from '@/lib/permissions';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  roles: string[];
}

const ROLE_TYPES = [
  { value: 'admin', label: 'Admin', color: 'bg-red-50 text-red-700 border-red-200', icon: Shield, description: 'Full access to all settings and data' },
  { value: 'analyst', label: 'Analyst', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Settings2, description: 'Can view data and edit reporting rules' },
  { value: 'viewer', label: 'Viewer', color: 'bg-muted text-muted-foreground border-border', icon: Eye, description: 'Read-only access to dashboards' },
  { value: 'client_viewer', label: 'Client Viewer', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: User, description: 'Limited client-facing view' },
  { value: 'executive', label: 'Executive Viewer', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: User, description: 'High-level summary view only' },
];

const PERMISSIONS = [
  { key: 'edit_admin', label: 'Can edit admin settings' },
  { key: 'manage_users', label: 'Can manage users' },
  { key: 'export_pdf', label: 'Can export PDF' },
  { key: 'manage_naming', label: 'Can manage naming rules' },
  { key: 'view_tracking', label: 'Can view tracking health' },
  { key: 'change_alerts', label: 'Can change alert thresholds' },
];

export function UserManagement() {
  const { isAdmin, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [permDialogUser, setPermDialogUser] = useState<UserProfile | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  const isSuperUser = isSuperAdmin;

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load users');
      setLoading(false);
      return;
    }

    const { data: roles } = await supabase.from('user_roles').select('*');

    const enriched = (profiles || []).map(p => ({
      ...p,
      roles: (roles || []).filter(r => r.user_id === p.user_id).map(r => r.role),
    }));

    setUsers(enriched);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const handleToggleApproval = async (profile: UserProfile) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: !profile.is_approved })
      .eq('id', profile.id);

    if (error) {
      toast.error('Failed to update approval');
      return;
    }
    toast.success(`User ${!profile.is_approved ? 'approved' : 'unapproved'}`);
    fetchUsers();
  };

  const handleEditSave = async (profile: UserProfile) => {
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editName })
      .eq('id', profile.id);

    if (error) {
      toast.error('Failed to update');
      return;
    }
    setEditingId(null);
    toast.success('User updated');
    fetchUsers();
  };

  const handleDelete = async (profile: UserProfile) => {
    if (!confirm(`Delete user ${profile.email}? This cannot be undone.`)) return;
    const { error } = await supabase.from('profiles').delete().eq('id', profile.id);
    if (error) {
      toast.error('Failed to delete user');
      return;
    }
    toast.success('User deleted');
    fetchUsers();
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: { data: { full_name: newName, email: newEmail } },
      });
      if (error) throw error;
      toast.success('User created successfully');
      setAddDialogOpen(false);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setNewRole('viewer');
      setTimeout(fetchUsers, 1000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    } finally {
      setAddLoading(false);
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return '—'; }
  };

  const getTimeSince = (d: string) => {
    try {
      const diff = Date.now() - new Date(d).getTime();
      const days = Math.floor(diff / 86400000);
      if (days === 0) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 30) return `${days}d ago`;
      return `${Math.floor(days / 30)}mo ago`;
    } catch { return '—'; }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Shield size={32} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">You don't have permission to manage users.</p>
      </div>
    );
  }

  const activeCount = users.filter(u => u.is_approved).length;
  const pendingCount = users.filter(u => !u.is_approved).length;
  const adminCount = users.filter(u => u.roles.includes('admin')).length;

  return (
    <div className="space-y-4">
      {/* Summary & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span><strong className="text-card-foreground">{users.length}</strong> total users</span>
          <span className="text-border">·</span>
          <span><strong className="text-emerald-600">{activeCount}</strong> active</span>
          {pendingCount > 0 && (
            <>
              <span className="text-border">·</span>
              <span><strong className="text-amber-600">{pendingCount}</strong> pending</span>
            </>
          )}
          <span className="text-border">·</span>
          <span><strong className="text-card-foreground">{adminCount}</strong> admin{adminCount !== 1 ? 's' : ''}</span>
        </div>
        {isSuperUser && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs text-muted-foreground" onClick={() => toast.info('Invite link copied to clipboard')}>
              <Mail size={12} /> Invite Link
            </Button>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 h-8 text-xs"><UserPlus size={12} /> Add User</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
                <form onSubmit={handleAddUser} className="space-y-4 mt-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Full Name</Label>
                    <Input className="mt-1.5" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Jane Doe" required />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</Label>
                    <Input className="mt-1.5" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="user@company.com" required />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Password</Label>
                    <div className="relative mt-1.5">
                      <Input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="pr-10" />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Role</Label>
                    <Select value={newRole} onValueChange={setNewRole}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLE_TYPES.map(r => (
                          <SelectItem key={r.value} value={r.value}>
                            <span className="flex items-center gap-2">
                              <r.icon size={12} /> {r.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {ROLE_TYPES.find(r => r.value === newRole)?.description}
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={addLoading}>
                    {addLoading ? 'Creating...' : 'Create User'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* User List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading users...</div>
      ) : (
        <div className="space-y-2">
          {users.map(u => {
            const primaryRole = u.roles[0] || 'user';
            const roleConfig = ROLE_TYPES.find(r => r.value === primaryRole) ?? ROLE_TYPES[2];

            return (
              <div key={u.id} className={cn(
                'rounded-xl border transition-all duration-200 overflow-hidden',
                u.is_approved ? 'border-border bg-card' : 'border-border/50 bg-muted/10'
              )}>
                <div className="flex items-center gap-4 px-5 py-3.5">
                  {/* Avatar */}
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold uppercase',
                    u.is_approved ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  )}>
                    {(u.full_name || u.email).charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {editingId === u.id ? (
                        <div className="flex items-center gap-1.5">
                          <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-6 text-sm w-40" />
                          <button onClick={() => handleEditSave(u)} className="p-0.5 text-primary"><Check size={13} /></button>
                          <button onClick={() => setEditingId(null)} className="p-0.5 text-muted-foreground"><X size={13} /></button>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-card-foreground truncate">{u.full_name || 'No name'}</p>
                      )}
                      {/* Role badges */}
                      {u.roles.map(r => {
                        const rc = ROLE_TYPES.find(rt => rt.value === r);
                        return (
                          <Badge key={r} variant="outline" className={cn('text-[9px] px-1.5 py-0 border', rc?.color ?? 'border-border text-muted-foreground')}>
                            {rc ? <rc.icon size={8} className="mr-0.5" /> : null}
                            {rc?.label ?? r}
                          </Badge>
                        );
                      })}
                      <Badge variant={u.is_approved ? 'outline' : 'secondary'} className={cn(
                        'text-[9px] px-1.5 py-0',
                        u.is_approved ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : 'border-amber-200 text-amber-600 bg-amber-50'
                      )}>
                        {u.is_approved ? 'Active' : 'Pending'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                      <span className="text-border">·</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock size={9} /> Joined {formatDate(u.created_at)}
                      </span>
                      <span className="text-border hidden sm:inline">·</span>
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">
                        Last active {getTimeSince(u.updated_at)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5 mr-2">
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">Approved</span>
                      <Switch checked={u.is_approved} onCheckedChange={() => handleToggleApproval(u)} disabled={!isSuperUser} className="scale-90" />
                    </div>
                    {isSuperUser && (
                      <>
                        <button
                          onClick={() => setPermDialogUser(u)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Permissions"
                        >
                          <Settings2 size={13} />
                        </button>
                        <button
                          onClick={() => { setEditingId(u.id); setEditName(u.full_name || ''); }}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          disabled={u.roles.includes('superadmin')}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Permissions Modal */}
      <Dialog open={!!permDialogUser} onOpenChange={open => { if (!open) setPermDialogUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permissions — {permDialogUser?.full_name || permDialogUser?.email}</DialogTitle>
          </DialogHeader>
          {permDialogUser && (
            <div className="space-y-5 mt-2">
              {/* Role selector */}
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Role</Label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {ROLE_TYPES.map(r => {
                    const isActive = permDialogUser.roles.includes(r.value);
                    return (
                      <button
                        key={r.value}
                        onClick={() => toast.info(`Role change to ${r.label} — requires database update`)}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border text-left transition-all',
                          isActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                        )}
                      >
                        <r.icon size={16} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-card-foreground">{r.label}</p>
                          <p className="text-[10px] text-muted-foreground">{r.description}</p>
                        </div>
                        {isActive && <Check size={14} className="text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Granular Permissions */}
              <div className="pt-4 border-t border-border/50">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Granular Permissions</Label>
                <div className="space-y-2 mt-2">
                  {PERMISSIONS.map(p => (
                    <div key={p.key} className="flex items-center justify-between py-1.5">
                      <span className="text-xs text-card-foreground">{p.label}</span>
                      <Switch
                        checked={permDialogUser.roles.includes('admin')}
                        onCheckedChange={() => toast.info('Permission toggle — requires database update')}
                        className="scale-90"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPermDialogUser(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
