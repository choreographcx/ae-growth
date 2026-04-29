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

const PERSIST_PREFIX = 'dashboard.filters.';
function persistKey(k: string) { return PERSIST_PREFIX + k; }
function hasPersisted(k: string): boolean {
  try { return typeof window !== 'undefined' && window.localStorage.getItem(persistKey(k)) !== null; }
  catch { return false; }
}
function loadPersisted<T>(k: string, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(persistKey(k));
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}
function savePersisted(k: string, v: unknown): void {
  try { if (typeof window !== 'undefined') window.localStorage.setItem(persistKey(k), JSON.stringify(v)); }
  catch { /* ignore quota / private mode errors */ }
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ClientProfile>(defaultClient);
  const [dateRange, setDateRange] = useState<string>(() => loadPersisted('dateRange', 'Last 30 Days'));
  const [showPreviousPeriod, setShowPreviousPeriod] = useState<boolean>(() => loadPersisted('showPreviousPeriod', false));
  /** Once we've applied the saved client.defaultDateRange to the dateRange
   *  state we lock it in so subsequent settings refetches don't snap the
   *  user back to it after they've manually picked a different range.
   *  Also pre-applied when we restored a persisted dateRange from a prior session. */
  const [defaultRangeApplied, setDefaultRangeApplied] = useState<boolean>(() => hasPersisted('dateRange'));
  // Stable per-mount timestamp; recomputed only when underlying data refetches.
  const lastRefresh = useMemo(
    () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    []
  );

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(() => loadPersisted('selectedPlatforms', [] as string[]));
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>(() => loadPersisted('selectedCampaigns', [] as string[]));
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>(() => loadPersisted('selectedObjectives', [] as string[]));
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(() => loadPersisted('selectedMarkets', [] as string[]));
  const [selectedChannels, setSelectedChannels] = useState<string[]>(() => loadPersisted('selectedChannels', [] as string[]));

  // Persist filter + date selections so they survive reload / re-entry.
  useEffect(() => { savePersisted('dateRange', dateRange); }, [dateRange]);
  useEffect(() => { savePersisted('showPreviousPeriod', showPreviousPeriod); }, [showPreviousPeriod]);
  useEffect(() => { savePersisted('selectedPlatforms', selectedPlatforms); }, [selectedPlatforms]);
  useEffect(() => { savePersisted('selectedCampaigns', selectedCampaigns); }, [selectedCampaigns]);
  useEffect(() => { savePersisted('selectedObjectives', selectedObjectives); }, [selectedObjectives]);
  useEffect(() => { savePersisted('selectedMarkets', selectedMarkets); }, [selectedMarkets]);
  useEffect(() => { savePersisted('selectedChannels', selectedChannels); }, [selectedChannels]);

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

  // Per-platform excluded-campaign tokens, parsed from the admin-configured
  // comma/whitespace-separated string on each PlatformConfig.
  const excludedCampaignTokensByPlatform = useMemo(() => {
    const out: Partial<Record<PlatformKey, string[]>> = {};
    for (const k of PLATFORM_ORDER) {
      const raw = client.platforms[k]?.excludedCampaignFilter ?? '';
      const tokens = raw.split(/[,\s]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
      if (tokens.length) out[k] = tokens;
    }
    return out;
  }, [
    ...PLATFORM_ORDER.map(k => client.platforms[k]?.excludedCampaignFilter),
  ]);

  // Single source of truth for dashboard data — shared with header and pages
  const data = useDashboardDaily(dateRange, {
    selectedPlatformLabels: selectedPlatforms,
    selectedCampaigns,
    selectedObjectives,
    selectedMarkets,
    selectedChannels,
    costMultiplierByPlatform,
    excludedCampaignTokensByPlatform,
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
    // Apply the admin-configured Default Date Range — only on the first load
    // so the user's manual picks aren't reverted on subsequent settings refetches.
    if (!defaultRangeApplied) {
      const mapped = mapDefaultDateRange(settingsQ.data.client.defaultDateRange);
      if (mapped) setDateRange(mapped);
      setDefaultRangeApplied(true);
    }
  }, [settingsQ.data, defaultRangeApplied]);

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

/**
 * Convert the admin Default Date Range value (e.g. `last_30_days`) to the
 * label used by the date picker / `resolveDateRange` (e.g. `Last 30 Days`).
 * Returns null if the value isn't a known preset — caller keeps current state.
 */
function mapDefaultDateRange(v: string | undefined | null): string | null {
  switch (v) {
    case 'last_7_days':  return 'Last 7 Days';
    case 'last_14_days': return 'Last 14 Days';
    case 'last_30_days': return 'Last 30 Days';
    case 'last_90_days': return 'Last 90 Days';
    case 'this_month':   return 'This Month';
    case 'last_month':   return 'Last Month';
    case 'this_year':    return 'This Year';
    case 'last_year':    return 'Last Year';
    default:             return null;
  }
}

const emptyTotals = {
  spend: 0, impressions: 0, clicks: 0,
  conversions: 0, conversionsAll: 0, conversionsLowerFunnel: 0, conversionsUpperFunnel: 0,
  conversionValue: 0, reach: 0, landingPageViews: 0, outboundClicks: 0,
  videoViews: 0, videoP100: 0,
  ctr: 0, cpc: 0, cpa: 0, cpaAll: 0, cpaLowerFunnel: 0, cpm: 0, frequency: 0,
  conversionRate: 0, conversionRateLowerFunnel: 0,
  costPerLPV: 0, lpvRate: 0, cvrLowerFunnel: 0,
  roas: 0, outboundCtr: 0,
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
