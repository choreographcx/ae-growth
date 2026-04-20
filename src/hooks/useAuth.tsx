import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { applyBrandingToRoot, cacheBranding, syncPublicBranding } from '@/lib/branding';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isApproved: boolean;
  profile: { email: string; full_name: string; is_approved: boolean } | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  isApproved: false,
  profile: null,
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

  const fetchUserData = async (userId: string) => {
    const [profileRes, rolesRes, configRes] = await Promise.all([
      supabase.from('profiles').select('email, full_name, is_approved').eq('user_id', userId).single(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.from('client_configs').select('config').eq('user_id', userId).maybeSingle(),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data);
      setIsApproved(profileRes.data.is_approved);
    }

    let userIsAdmin = false;
    if (rolesRes.data) {
      const roles = rolesRes.data.map((r: any) => r.role);
      setIsSuperAdmin(roles.includes('superadmin'));
      userIsAdmin = roles.includes('admin') || roles.includes('superadmin');
      setIsAdmin(userIsAdmin);
    }

    // Apply saved branding immediately so login/loading/pending screens
    // and the dashboard all use the user's configured theme — never defaults.
    const branding = (configRes.data?.config as any)?.branding;
    if (branding) {
      applyBrandingToRoot(branding);
      cacheBranding(branding);
      // Mirror branding to the public row so logged-out / incognito visitors
      // see it on the auth screen. Only admins are allowed to write.
      if (userIsAdmin) {
        void syncPublicBranding({
          branding: {
            logoUrl: branding.logoUrl,
            faviconUrl: branding.faviconUrl,
            primaryColor: branding.primaryColor,
          },
        });
      }
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
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Broadcast presence on a shared channel so admins can see who is currently online.
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('online-users', {
      config: { presence: { key: user.id } },
    });
    // No-op presence handler attached BEFORE subscribe so the channel is
    // presence-aware and other consumers (useOnlineUsers) can read state.
    channel.on('presence', { event: 'sync' }, () => {});
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
      }
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isSuperAdmin, isApproved, profile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
