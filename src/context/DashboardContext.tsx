import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClientProfile, PlatformKey, PLATFORM_ORDER } from '@/types/dashboard';
import { defaultClient, savedClients } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { applyBrandingToRoot, cacheBranding, cacheClientName, applyClientNameToTitle } from '@/lib/branding';
import { useDashboardDaily } from '@/hooks/useDashboardDaily';
import { loadClientSettings, saveClientSettings } from '@/lib/clientSettings';
import { platformConvertRate } from '@/lib/currencyConvert';

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
  selectedMarkets: string[];
  setSelectedMarkets: (v: string[]) => void;
  selectedChannels: string[];
  setSelectedChannels: (v: string[]) => void;
  saveConfig: () => Promise<void>;
  isSaving: boolean;
  configLoaded: boolean;
  lastSavedAt: string | null;
  /** Live BigQuery dashboard data, filtered by date + platform + campaign selections. */
  data: DashboardData;
  /** Layout-edit controls registered by the current page (e.g. Overview). */
  layoutEdit: LayoutEditControls | null;
  setLayoutEdit: (c: LayoutEditControls | null) => void;
}

export interface LayoutEditControls {
  isEditing: boolean;
  onToggle: () => void;
  onReset: () => void;
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
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [layoutEdit, setLayoutEdit] = useState<LayoutEditControls | null>(null);

  // Per-platform USD→reporting-currency multipliers, recomputed when client
  // currency, rates, or any platform's reportingCurrency changes.
  const costMultiplierByPlatform = useMemo(() => {
    const out: Partial<Record<PlatformKey, number>> = {};
    for (const k of PLATFORM_ORDER) out[k] = platformConvertRate(client, k);
    return out;
  }, [
    client.currency,
    client.usdToSarRate,
    client.usdToAedRate,
    ...PLATFORM_ORDER.map(k => client.platforms[k]?.reportingCurrency),
  ]);

  // Single source of truth for dashboard data — shared with header and pages
  const data = useDashboardDaily(dateRange, {
    selectedPlatformLabels: selectedPlatforms,
    selectedCampaigns,
    selectedObjectives,
    selectedMarkets,
    selectedChannels,
    costMultiplierByPlatform,
  });

  // Client settings cached so navigating between pages never refetches them.
  const settingsQ = useQuery({
    queryKey: ['client-settings'],
    queryFn: loadClientSettings,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
  const configLoaded = !settingsQ.isLoading;

  useEffect(() => {
    if (!settingsQ.data) return;
    setClient(settingsQ.data.client);
    if (settingsQ.data.updatedAt) {
      setLastSavedAt(new Date(settingsQ.data.updatedAt).toLocaleString([], {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      }));
    }
  }, [settingsQ.data]);

  // Whenever the in-memory client's branding changes (admin live-edit, etc.),
  // mirror it to the document root and the localStorage cache so unauth pages
  // can render with it on next load.
  useEffect(() => {
    const branding = (client as any).branding;
    if (branding) {
      applyBrandingToRoot(branding);
      cacheBranding(branding);
    }
    if (client.name) {
      applyClientNameToTitle(client.name);
      cacheClientName(client.name);
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

      const { updatedAt } = await saveClientSettings(client, user.id);
      setLastSavedAt(new Date(updatedAt).toLocaleString([], {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      }));
      // Refresh the cached settings so any other consumers see the latest values.
      settingsQ.refetch();
      toast.success('Configuration saved');
    } catch (err: any) {
      console.error('Save error:', err);
      const msg = err?.message || 'Failed to save configuration';
      toast.error(msg.includes('row-level security') ? 'Only admins can save settings' : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  }, [client, settingsQ]);

  const enabledPlatforms = useMemo(() => {
    const withData = new Set(data.availablePlatforms.map(p => p.key));
    return PLATFORM_ORDER.filter(k => client.platforms[k]?.enabled || withData.has(k));
  }, [client.platforms, data.availablePlatforms]);

  return (
    <DashboardContext.Provider value={{
      client, setClient, clients: savedClients,
      dateRange, setDateRange,
      showPreviousPeriod, setShowPreviousPeriod,
      togglePlatform, updateClient, enabledPlatforms, lastRefresh,
      selectedPlatforms, setSelectedPlatforms,
      selectedCampaigns, setSelectedCampaigns,
      selectedObjectives, setSelectedObjectives,
      selectedMarkets, setSelectedMarkets,
      selectedChannels, setSelectedChannels,
      saveConfig, isSaving, configLoaded, lastSavedAt,
      data,
      layoutEdit, setLayoutEdit,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

const emptyTotals = {
  spend: 0, impressions: 0, clicks: 0,
  conversions: 0, conversionsAll: 0, conversionsLowerFunnel: 0, conversionsUpperFunnel: 0,
  conversionValue: 0, reach: 0, landingPageViews: 0, outboundClicks: 0,
  videoViews: 0, videoP100: 0,
  ctr: 0, cpc: 0, cpa: 0, cpaAll: 0, cpaLowerFunnel: 0, cpm: 0,
  conversionRate: 0, conversionRateLowerFunnel: 0,
  costPerLPV: 0, lpvRate: 0, cvrLowerFunnel: 0,
  frequency: 0, roas: 0, outboundCtr: 0,
  costPerVideoView: 0, videoCompletionRate: 0,
};

const fallbackData: DashboardData = {
  loading: false, error: null, rows: [], previousRows: [],
  totals: emptyTotals,
  previousTotals: null,
  platformSummaries: [],
  spendSeries: [], conversionsSeries: [], cpaSeries: [], ctrSeries: [],
  range: { start: new Date(), end: new Date() },
  availablePlatforms: [], availableCampaigns: [], campaignsByPlatform: {},
  availableObjectives: [], objectivesByPlatform: {},
  availableMarkets: [], marketsByPlatform: {},
  availableChannels: [], channelsByPlatform: {},
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
  selectedMarkets: [],
  setSelectedMarkets: () => {},
  selectedChannels: [],
  setSelectedChannels: () => {},
  saveConfig: async () => {},
  isSaving: false,
  configLoaded: false,
  lastSavedAt: null,
  data: fallbackData,
  layoutEdit: null,
  setLayoutEdit: () => {},
};

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  return ctx ?? fallback;
}
