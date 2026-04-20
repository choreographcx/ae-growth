import { useEffect } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { useAuth } from '@/hooks/useAuth';
import { applyClientNameToTitle, cacheClientName, syncPublicBranding } from '@/lib/branding';

export function DocumentTitle() {
  const { client, configLoaded } = useDashboard();
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!configLoaded) return;
    const name = client?.name?.trim() || '';
    applyClientNameToTitle(name);
    cacheClientName(name);
    // Mirror the client name to the public branding row so the login/auth
    // screen reflects it for unauthenticated/incognito visitors.
    if (isAdmin) void syncPublicBranding({ clientName: name });
  }, [client?.name, configLoaded, isAdmin]);

  return null;
}
