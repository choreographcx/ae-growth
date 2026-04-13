import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ClientProfile, PlatformKey } from '@/types/dashboard';
import { defaultClient, savedClients } from '@/data/mockData';

interface DashboardContextType {
  client: ClientProfile;
  setClient: (c: ClientProfile) => void;
  clients: ClientProfile[];
  dateRange: string;
  setDateRange: (d: string) => void;
  comparePeriod: string;
  setComparePeriod: (c: string) => void;
  togglePlatform: (key: PlatformKey) => void;
  updateClient: (updates: Partial<ClientProfile>) => void;
  enabledPlatforms: PlatformKey[];
  lastRefresh: string;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ClientProfile>(defaultClient);
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [comparePeriod, setComparePeriod] = useState('Previous Period');
  const lastRefresh = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const togglePlatform = (key: PlatformKey) => {
    setClient(prev => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [key]: { ...prev.platforms[key], enabled: !prev.platforms[key].enabled },
      },
    }));
  };

  const updateClient = (updates: Partial<ClientProfile>) => {
    setClient(prev => ({ ...prev, ...updates }));
  };

  const enabledPlatforms = (Object.keys(client.platforms) as PlatformKey[]).filter(k => client.platforms[k].enabled);

  return (
    <DashboardContext.Provider value={{
      client, setClient, clients: savedClients,
      dateRange, setDateRange, comparePeriod, setComparePeriod,
      togglePlatform, updateClient, enabledPlatforms, lastRefresh,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}
