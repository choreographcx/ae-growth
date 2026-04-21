import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
// Branding now flows through the public client_branding table (read by anon
// users via RLS), so AuthProvider no longer needs to mirror it itself.

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isApproved: boolean;
  profileLoading: boolean;
  profile: { email: string; full_name: string; is_approved: boolean } | null;
  onlineUserIds: Set<string>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  isApproved: false,
  profileLoading: true,
  profile: null,
  onlineUserIds: new Set(),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [profileLoading, setProfileLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    setProfileLoading(true);
    try {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('email, full_name, is_approved').eq('user_id', userId).single(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        setIsApproved(profileRes.data.is_approved);
      }

      if (rolesRes.data) {
        const roles = rolesRes.data.map((r: any) => r.role);
        setIsSuperAdmin(roles.includes('superadmin'));
        setIsAdmin(roles.includes('admin') || roles.includes('superadmin'));
      }
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => fetchUserData(session.user.id), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsApproved(false);
        setProfileLoading(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setProfileLoading(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Own the realtime presence subscription in one place to avoid duplicate
  // subscriptions to the same topic, which causes Supabase to throw when a
  // second hook tries to add presence callbacks after subscribe().
  useEffect(() => {
    if (!user) {
      setOnlineUserIds(new Set());
      return;
    }

    const channel = supabase.channel('online-users', {
      config: { presence: { key: user.id } },
    });

    const syncPresence = () => {
      const state = channel.presenceState() as Record<string, Array<{ user_id?: string }>>;
      const ids = new Set<string>();
      Object.entries(state).forEach(([key, metas]) => {
        ids.add(key);
        metas.forEach((meta) => {
          if (meta.user_id) ids.add(meta.user_id);
        });
      });
      setOnlineUserIds(ids);
    };

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, syncPresence)
      .on('presence', { event: 'leave' }, syncPresence)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });

    return () => {
      setOnlineUserIds(new Set());
      supabase.removeChannel(channel);
    };
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isSuperAdmin, isApproved, profileLoading, profile, onlineUserIds, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
