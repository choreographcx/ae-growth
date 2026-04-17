import { useEffect } from 'react';
import { useDashboard } from '@/context/DashboardContext';

export function DocumentTitle() {
  const { client, configLoaded } = useDashboard();

  useEffect(() => {
    if (!configLoaded) return;
    const name = client?.name?.trim() || 'Client Name';
    document.title = `${name} Paid Media Dashboard`;
  }, [client?.name, configLoaded]);

  return null;
}
