import { useEffect } from 'react';
import { useDashboard } from '@/context/DashboardContext';

export function DocumentTitle() {
  const { client } = useDashboard();

  useEffect(() => {
    const name = client?.name?.trim() || 'Client Name';
    document.title = `${name} Paid Media Dashboard`;
  }, [client?.name]);

  return null;
}
