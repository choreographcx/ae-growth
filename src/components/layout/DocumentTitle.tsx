import { useEffect } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { applyClientNameToTitle, cacheClientName } from '@/lib/branding';

export function DocumentTitle() {
  const { client, configLoaded } = useDashboard();

  useEffect(() => {
    if (!configLoaded) return;
    const name = client?.name?.trim() || '';
    applyClientNameToTitle(name);
    cacheClientName(name);
  }, [client?.name, configLoaded]);

  return null;
}
