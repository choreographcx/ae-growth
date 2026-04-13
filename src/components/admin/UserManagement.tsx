import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Check, X, Eye, EyeOff, UserPlus, Shield, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  is_approved: boolean;
  created_at: string;
  roles: string[];
}

export function UserManagement() {
  const { isAdmin, user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  const isSuperUser = user?.email === 'rachel.montague@wppmedia.com';

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

    // Delete from profiles (cascade will handle user_roles)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profile.id);

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
      // Sign up new user via auth
      const { error } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          data: { full_name: newName, email: newEmail },
        },
      });

      if (error) throw error;

      toast.success('User created successfully');
      setAddDialogOpen(false);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setTimeout(fetchUsers, 1000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    } finally {
      setAddLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Shield size={32} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">You don't have permission to manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">User Accounts</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{users.length} user{users.length !== 1 ? 's' : ''} total</p>
        </div>
        {isSuperUser && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 h-8 text-xs">
                <UserPlus size={12} /> Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddUser} className="space-y-4 mt-2">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Full Name</Label>
                  <Input className="mt-1.5" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Jane Doe" required />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
                  <Input className="mt-1.5" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="user@company.com" required />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={addLoading}>
                  {addLoading ? 'Creating...' : 'Create User'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading users...</div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 transition-colors">
              <div className="flex-1 min-w-0">
                {editingId === u.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="h-7 text-sm max-w-[200px]"
                    />
                    <button onClick={() => handleEditSave(u)} className="p-1 text-success hover:text-success/80">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground hover:text-foreground">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-card-foreground truncate">{u.full_name || 'No name'}</p>
                )}
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {u.roles.map(r => (
                    <Badge key={r} variant={r === 'admin' ? 'default' : 'secondary'} className="text-[9px] px-1.5 py-0">
                      {r === 'admin' ? <Shield size={8} className="mr-0.5" /> : <User size={8} className="mr-0.5" />}
                      {r}
                    </Badge>
                  ))}
                  <Badge variant={u.is_approved ? 'default' : 'outline'} className="text-[9px] px-1.5 py-0">
                    {u.is_approved ? 'Approved' : 'Pending'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">Approved</span>
                  <Switch
                    checked={u.is_approved}
                    onCheckedChange={() => handleToggleApproval(u)}
                    disabled={!isSuperUser}
                  />
                </div>

                {isSuperUser && (
                  <>
                    <button
                      onClick={() => { setEditingId(u.id); setEditName(u.full_name || ''); }}
                      className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      disabled={u.email === 'rachel.montague@wppmedia.com'}
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
