import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ClientProfile, PlatformKey } from '@/types/dashboard';
import { defaultClient, savedClients } from '@/data/mockData';

interface DashboardContextType {
  client: ClientProfile;
  setClient: (c: ClientProfile) => void;
  clients: ClientProfile[];
  dateRange: string;
  setDateRange: (d: string) => void;
  showPreviousPeriod: boolean;
  setShowPreviousPeriod: (v: boolean) => void;
  togglePlatform: (key: PlatformKey) => void;
  updateClient: (updates: Partial<ClientProfile>) => void;
  enabledPlatforms: PlatformKey[];
  lastRefresh: string;
  // Filters
  selectedPlatforms: string[];
  setSelectedPlatforms: (v: string[]) => void;
  selectedCampaigns: string[];
  setSelectedCampaigns: (v: string[]) => void;
  selectedObjectives: string[];
  setSelectedObjectives: (v: string[]) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ClientProfile>(defaultClient);
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [showPreviousPeriod, setShowPreviousPeriod] = useState(false);
  const lastRefresh = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Filters
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);

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
      dateRange, setDateRange,
      showPreviousPeriod, setShowPreviousPeriod,
      togglePlatform, updateClient, enabledPlatforms, lastRefresh,
      selectedPlatforms, setSelectedPlatforms,
      selectedCampaigns, setSelectedCampaigns,
      selectedObjectives, setSelectedObjectives,
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
