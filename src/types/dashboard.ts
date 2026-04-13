export type PlatformKey = 'meta' | 'google' | 'tiktok' | 'snapchat' | 'linkedin' | 'x' | 'programmatic';

export interface PlatformConfig {
  key: PlatformKey;
  label: string;
  enabled: boolean;
  color: string;
  accountIds: string[];
}

export interface ClientProfile {
  id: string;
  name: string;
  code: string;
  currency: string;
  timezone: string;
  defaultDateRange: string;
  weekStartDay: string;
  websiteDomain: string;
  ga4PropertyId: string;
  ga4StreamId: string;
  gtmContainerId: string;
  primaryConversion: string;
  secondaryConversion: string;
  microConversions: string[];
  conversionNotes: string;
  platforms: Record<PlatformKey, PlatformConfig>;
  alertThresholds: AlertThresholds;
  metricMappings: MetricMapping[];
  namingNormalization: NamingNormalization;
}

export interface AlertThresholds {
  cpaSpike: number;
  ctrDrop: number;
  frequencyThreshold: number;
  zeroConversionSpend: number;
  viewabilityThreshold: number;
}

export interface MetricMapping {
  standardLabel: string;
  platformMetric: string;
  platform: PlatformKey;
}

export interface NamingNormalization {
  campaign: string;
  adSetOrAdGroup: string;
  adOrCreative: string;
  placement: string;
  audience: string;
  objective: string;
}

export interface KPIMetric {
  label: string;
  value: number;
  formattedValue: string;
  change: number;
  trend: number[];
}

export interface KPIPair {
  primary: KPIMetric;
  secondary: KPIMetric;
}

export interface KPIGroupData {
  title: string;
  primary: KPIMetric;
  supporting: { label: string; formattedValue: string; change?: number }[];
}

export interface CampaignRow {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  objective: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  cpa: number;
  conversionRate: number;
  reach?: number;
  frequency?: number;
  videoViews?: number;
  completionRate?: number;
  platform?: PlatformKey;
}

export interface PlatformSummary {
  platform: PlatformKey;
  label: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  cpa: number;
  conversionRate: number;
  shareOfSpend: number;
  shareOfConversions: number;
}

export interface BudgetPacing {
  totalBudget: number;
  spendToDate: number;
  pacingPercent: number;
  projectedSpend: number;
  variance: number;
  platformPacing: { platform: string; budget: number; spent: number; pacing: number }[];
}

export interface AlertItem {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  description: string;
  platform?: PlatformKey;
  timestamp: string;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
  value2?: number;
}

export interface DataSourceStatus {
  platform: string;
  status: 'healthy' | 'warning' | 'error' | 'inactive';
  lastSync: string;
  latency: string;
  recordCount: number;
  missingFields: string[];
  warnings: string[];
}
