import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ClientProfile, PlatformKey, PLATFORM_ORDER } from '@/types/dashboard';
import { defaultClient, savedClients } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { applyBrandingToRoot, cacheBranding } from '@/lib/branding';
import { useDashboardDaily, UseDashboardDailyOptions } from '@/hooks/useDashboardDaily';

type DashboardData = ReturnType<typeof useDashboardDaily>;

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
  selectedPlatforms: string[];
  setSelectedPlatforms: (v: string[]) => void;
  selectedCampaigns: string[];
  setSelectedCampaigns: (v: string[]) => void;
  selectedObjectives: string[];
  setSelectedObjectives: (v: string[]) => void;
  saveConfig: () => Promise<void>;
  isSaving: boolean;
  configLoaded: boolean;
  lastSavedAt: string | null;
  /** Live BigQuery dashboard data, filtered by date + platform + campaign selections. */
  data: DashboardData;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ClientProfile>(defaultClient);
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [showPreviousPeriod, setShowPreviousPeriod] = useState(false);
  const lastRefresh = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Single source of truth for dashboard data — shared with header and pages
  const data = useDashboardDaily(dateRange, {
    selectedPlatformLabels: selectedPlatforms,
    selectedCampaigns,
  });

  useEffect(() => {
    const loadConfig = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setConfigLoaded(true);
        return;
      }

      const { data, error } = await supabase
        .from('client_configs')
        .select('config, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.config) {
        const saved = data.config as Record<string, any>;
        setClient(prev => ({ ...prev, ...saved }));
        if (data.updated_at) {
          setLastSavedAt(new Date(data.updated_at).toLocaleString([], { 
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
          }));
        }
      }
      setConfigLoaded(true);
    };

    loadConfig();
  }, []);

  useEffect(() => {
    const branding = (client as any).branding;
    if (branding) {
      applyBrandingToRoot(branding);
      cacheBranding(branding);
    }
  }, [client]);

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

  const saveConfig = useCallback(async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be signed in to save');
        return;
      }

      const { error } = await supabase
        .from('client_configs')
        .upsert(
          { user_id: user.id, config: client as any },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('Save error:', error);
        toast.error('Failed to save configuration');
      } else {
        const now = new Date().toLocaleString([], { 
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
        setLastSavedAt(now);
        toast.success('Configuration saved');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  }, [client]);

  const enabledPlatforms = PLATFORM_ORDER.filter(k => client.platforms[k]?.enabled);

  return (
    <DashboardContext.Provider value={{
      client, setClient, clients: savedClients,
      dateRange, setDateRange,
      showPreviousPeriod, setShowPreviousPeriod,
      togglePlatform, updateClient, enabledPlatforms, lastRefresh,
      selectedPlatforms, setSelectedPlatforms,
      selectedCampaigns, setSelectedCampaigns,
      selectedObjectives, setSelectedObjectives,
      saveConfig, isSaving, configLoaded, lastSavedAt,
      data,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

const fallbackData: DashboardData = {
  loading: false, error: null, rows: [], previousRows: [],
  totals: { spend: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0, landingPageViews: 0, videoViews: 0, ctr: 0, cpc: 0, cpa: 0, cpm: 0, conversionRate: 0, costPerLPV: 0 },
  previousTotals: null,
  platformSummaries: [],
  spendSeries: [], conversionsSeries: [], cpaSeries: [], ctrSeries: [],
  range: { start: new Date(), end: new Date() },
  availablePlatforms: [], availableCampaigns: [],
};

const fallback: DashboardContextType = {
  client: defaultClient,
  setClient: () => {},
  clients: savedClients,
  dateRange: 'Last 30 Days',
  setDateRange: () => {},
  showPreviousPeriod: false,
  setShowPreviousPeriod: () => {},
  togglePlatform: () => {},
  updateClient: () => {},
  enabledPlatforms: [],
  lastRefresh: '',
  selectedPlatforms: [],
  setSelectedPlatforms: () => {},
  selectedCampaigns: [],
  setSelectedCampaigns: () => {},
  selectedObjectives: [],
  setSelectedObjectives: () => {},
  saveConfig: async () => {},
  isSaving: false,
  configLoaded: false,
  lastSavedAt: null,
  data: fallbackData,
};

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  return ctx ?? fallback;
}
