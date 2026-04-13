import { PlatformKey, ClientProfile, KPIGroupData, CampaignRow, PlatformSummary, BudgetPacing, AlertItem, TimeSeriesPoint, DataSourceStatus, NamingNormalization, MetricMapping } from '@/types/dashboard';

const defaultNaming: NamingNormalization = {
  campaign: 'Campaign',
  adSetOrAdGroup: 'Ad Set',
  adOrCreative: 'Ad',
  placement: 'Placement',
  audience: 'Audience',
  objective: 'Objective',
};

const defaultMetricMappings: MetricMapping[] = [
  { standardLabel: 'Primary Conversion', platformMetric: 'form_submit', platform: 'meta' },
  { standardLabel: 'Primary Conversion', platformMetric: 'conversions', platform: 'google' },
  { standardLabel: 'Landing Page View', platformMetric: 'landing_page_view', platform: 'meta' },
  { standardLabel: 'Lead Form Submission', platformMetric: 'lead_gen_form_submit', platform: 'linkedin' },
];

export const defaultClient: ClientProfile = {
  id: '1',
  name: 'Acme Corp',
  code: 'ACME',
  currency: 'USD',
  timezone: 'Asia/Dubai',
  defaultDateRange: 'last_30_days',
  weekStartDay: 'Monday',
  websiteDomain: 'acmecorp.com',
  ga4PropertyId: '123456789',
  ga4StreamId: '987654321',
  gtmContainerId: 'GTM-XXXXX',
  primaryConversion: 'form_submit',
  secondaryConversion: 'phone_call',
  microConversions: ['page_scroll', 'video_play', 'pdf_download'],
  conversionNotes: 'Primary = demo request form. Secondary = call tracking via CallRail.',
  platforms: {
    meta: { key: 'meta', label: 'Meta', enabled: true, color: 'hsl(214, 89%, 52%)', accountIds: ['act_123456'], budget: 55000 },
    google: { key: 'google', label: 'Google Ads', enabled: true, color: 'hsl(142, 71%, 45%)', accountIds: ['123-456-7890'], budget: 45000 },
    tiktok: { key: 'tiktok', label: 'TikTok', enabled: true, color: 'hsl(340, 82%, 52%)', accountIds: ['tt_789012'], budget: 20000 },
    snapchat: { key: 'snapchat', label: 'Snapchat', enabled: true, color: 'hsl(50, 100%, 50%)', accountIds: ['sc_345678'], budget: 10000 },
    x: { key: 'x', label: 'X', enabled: false, color: 'hsl(0, 0%, 20%)', accountIds: [], budget: 0 },
    linkedin: { key: 'linkedin', label: 'LinkedIn', enabled: true, color: 'hsl(199, 89%, 48%)', accountIds: ['li_901234'], budget: 20000 },
    programmatic: { key: 'programmatic', label: 'Programmatic', enabled: true, color: 'hsl(262, 80%, 65%)', accountIds: ['prog_567890'], budget: 15000 },
  },
  alertThresholds: { cpaSpike: 25, ctrDrop: 20, frequencyThreshold: 4, zeroConversionSpend: 500, viewabilityThreshold: 50 },
  metricMappings: defaultMetricMappings,
  namingNormalization: defaultNaming,
};

export const savedClients: ClientProfile[] = [
  defaultClient,
  { ...defaultClient, id: '2', name: 'Globex Industries', code: 'GLOB', websiteDomain: 'globex.com' },
  { ...defaultClient, id: '3', name: 'Initech Solutions', code: 'INIT', currency: 'EUR', websiteDomain: 'initech.io' },
];

function generateTrend(base: number, variance: number, points = 7): number[] {
  return Array.from({ length: points }, () => base + (Math.random() - 0.5) * variance * 2);
}

function generateTimeSeries(days: number, base: number, variance: number): TimeSeriesPoint[] {
  const now = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    return { date: d.toISOString().split('T')[0], value: Math.round(base + (Math.random() - 0.5) * variance * 2) };
  });
}

// New grouped KPI data for Overview
export const overviewKPIGroups: KPIGroupData[] = [
  {
    title: 'Spend',
    icon: 'DollarSign',
    primary: { label: 'Total Spend', value: 142580, formattedValue: '$142,580', change: 8.2, trend: generateTrend(142000, 10000) },
    supporting: [
      { label: 'Budget', formattedValue: '$165,000' },
      { label: 'Pacing', formattedValue: '87%', change: 3.1 },
    ],
  },
  {
    title: 'Impressions',
    icon: 'Eye',
    primary: { label: 'Impressions', value: 12450000, formattedValue: '12.45M', change: 12.4, trend: generateTrend(12000000, 2000000) },
    supporting: [
      { label: 'CPM', formattedValue: '$11.45', change: -3.8 },
    ],
  },
  {
    title: 'Clicks',
    icon: 'MousePointerClick',
    primary: { label: 'Clicks', value: 186750, formattedValue: '186,750', change: 9.1, trend: generateTrend(180000, 20000) },
    supporting: [
      { label: 'CTR', formattedValue: '1.50%', change: -2.3 },
      { label: 'CPC', formattedValue: '$0.76', change: -1.2 },
    ],
  },
  {
    title: 'Conversions',
    icon: 'Target',
    primary: { label: 'Conversions', value: 3842, formattedValue: '3,842', change: 15.3, trend: generateTrend(3500, 500) },
    supporting: [
      { label: 'CPA', formattedValue: '$37.10', change: -5.8 },
      { label: 'Conv. Rate', formattedValue: '2.06%', change: 5.7 },
    ],
  },
  {
    title: 'Reach',
    icon: 'Users',
    primary: { label: 'Reach', value: 8920000, formattedValue: '8.92M', change: 10.1, trend: generateTrend(8500000, 1000000) },
    supporting: [
      { label: 'Frequency', formattedValue: '1.40', change: 2.1 },
    ],
  },
];

export const overviewKPIGroupsRow2: KPIGroupData[] = [
  {
    title: 'Landing Page Views',
    icon: 'FileText',
    primary: { label: 'LPV', value: 142300, formattedValue: '142,300', change: 7.5, trend: generateTrend(140000, 15000) },
    supporting: [
      { label: 'Cost per LPV', formattedValue: '$1.00', change: -2.1 },
    ],
  },
];

// Legacy KPIPair export for backward compat
export const overviewKPIs = overviewKPIGroups;

export const spendTimeSeries = generateTimeSeries(30, 4800, 1200);
export const conversionsTimeSeries = generateTimeSeries(30, 130, 40);
export const cpaTimeSeries = generateTimeSeries(30, 37, 8);
export const clicksTimeSeries = generateTimeSeries(30, 6200, 1500);

export const platformSummaries: PlatformSummary[] = [
  { platform: 'meta', label: 'Meta', spend: 52400, impressions: 4800000, clicks: 72000, ctr: 1.5, cpc: 0.73, conversions: 1520, cpa: 34.47, conversionRate: 2.11, shareOfSpend: 36.8, shareOfConversions: 39.6 },
  { platform: 'google', label: 'Google Ads', spend: 41200, impressions: 3200000, clicks: 54000, ctr: 1.69, cpc: 0.76, conversions: 1180, cpa: 34.92, conversionRate: 2.19, shareOfSpend: 28.9, shareOfConversions: 30.7 },
  { platform: 'tiktok', label: 'TikTok', spend: 18500, impressions: 2100000, clicks: 28000, ctr: 1.33, cpc: 0.66, conversions: 420, cpa: 44.05, conversionRate: 1.5, shareOfSpend: 13.0, shareOfConversions: 10.9 },
  { platform: 'snapchat', label: 'Snapchat', spend: 8200, impressions: 950000, clicks: 11200, ctr: 1.18, cpc: 0.73, conversions: 215, cpa: 38.14, conversionRate: 1.92, shareOfSpend: 5.8, shareOfConversions: 5.6 },
  { platform: 'linkedin', label: 'LinkedIn', spend: 15800, impressions: 890000, clicks: 12400, ctr: 1.39, cpc: 1.27, conversions: 310, cpa: 50.97, conversionRate: 2.5, shareOfSpend: 11.1, shareOfConversions: 8.1 },
  { platform: 'programmatic', label: 'Programmatic', spend: 6480, impressions: 510000, clicks: 9150, ctr: 1.79, cpc: 0.71, conversions: 197, cpa: 32.89, conversionRate: 2.15, shareOfSpend: 4.5, shareOfConversions: 5.1 },
  { platform: 'x', label: 'X', spend: 9800, impressions: 1200000, clicks: 15600, ctr: 1.30, cpc: 0.63, conversions: 280, cpa: 35.00, conversionRate: 1.79, shareOfSpend: 6.9, shareOfConversions: 7.3 },
];

export const budgetPacing: BudgetPacing = {
  totalBudget: 165000,
  spendToDate: 142580,
  pacingPercent: 87,
  projectedSpend: 161200,
  variance: -3800,
  platformPacing: [
    { platform: 'Meta', budget: 60000, spent: 52400, pacing: 87 },
    { platform: 'Google Ads', budget: 48000, spent: 41200, pacing: 86 },
    { platform: 'TikTok', budget: 22000, spent: 18500, pacing: 84 },
    { platform: 'LinkedIn', budget: 18000, spent: 15800, pacing: 88 },
    { platform: 'Snapchat', budget: 10000, spent: 8200, pacing: 82 },
    { platform: 'Programmatic', budget: 7000, spent: 6480, pacing: 93 },
  ],
};

export const alerts: AlertItem[] = [
  { id: '2', type: 'error', title: 'Meta tracking gap detected', description: '12% drop in attributed conversions. Check pixel and CAPI.', platform: 'meta', timestamp: '4h ago' },
  { id: '6', type: 'error', title: 'Snapchat zero conversions', description: '3 campaigns spent $420 with 0 conversions in past 48 hours.', platform: 'snapchat', timestamp: '1d ago' },
  { id: '1', type: 'warning', title: 'Rising CPA on TikTok', description: 'CPA increased 18% over the past 7 days. Review creative performance.', platform: 'tiktok', timestamp: '2h ago' },
  { id: '4', type: 'warning', title: 'High frequency on Meta retargeting', description: 'Frequency hit 4.2 on retargeting campaigns. Rotate creative.', platform: 'meta', timestamp: '8h ago' },
  { id: '5', type: 'success', title: 'Google Search CPA improved', description: 'Non-brand CPA decreased 12% week over week.', platform: 'google', timestamp: '12h ago' },
  { id: '3', type: 'info', title: 'LinkedIn pacing ahead', description: 'Projected to overspend by 5%. Consider reducing bids.', platform: 'linkedin', timestamp: '6h ago' },
];

export function generateCampaigns(platform: PlatformKey, count = 8): CampaignRow[] {
  const objectives = ['Awareness', 'Traffic', 'Conversions', 'Lead Gen', 'Engagement'];
  const statuses: CampaignRow['status'][] = ['active', 'active', 'active', 'paused', 'completed'];
  const prefixes: Record<PlatformKey, string> = { meta: 'META', google: 'GADS', tiktok: 'TT', snapchat: 'SNAP', linkedin: 'LI', x: 'X', programmatic: 'PROG' };
  return Array.from({ length: count }, (_, i) => {
    const spend = Math.round(1500 + Math.random() * 12000);
    const impressions = Math.round(spend * (80 + Math.random() * 40));
    const clicks = Math.round(impressions * (0.008 + Math.random() * 0.02));
    const conversions = Math.round(clicks * (0.01 + Math.random() * 0.03));
    return {
      id: `${platform}-${i}`,
      name: `${prefixes[platform]} | ${objectives[i % objectives.length]} | Campaign ${i + 1}`,
      status: statuses[i % statuses.length],
      objective: objectives[i % objectives.length],
      platform,
      spend,
      impressions,
      clicks,
      ctr: +((clicks / impressions) * 100).toFixed(2),
      cpc: +(spend / clicks).toFixed(2),
      conversions,
      cpa: conversions > 0 ? +(spend / conversions).toFixed(2) : 0,
      conversionRate: +((conversions / clicks) * 100).toFixed(2),
      reach: Math.round(impressions * 0.7),
      frequency: +(impressions / (impressions * 0.7)).toFixed(1),
      videoViews: platform === 'tiktok' || platform === 'snapchat' ? Math.round(impressions * 0.3) : undefined,
      completionRate: platform === 'tiktok' || platform === 'snapchat' ? +(20 + Math.random() * 40).toFixed(1) : undefined,
    };
  });
}

export function getPlatformKPIGroups(platform: PlatformKey): KPIGroupData[] {
  const summary = platformSummaries.find(p => p.platform === platform);
  if (!summary) return [];

  const base: KPIGroupData[] = [
    {
      title: 'Spend',
      icon: 'DollarSign',
      primary: { label: 'Spend', value: summary.spend, formattedValue: `$${summary.spend.toLocaleString()}`, change: +(Math.random() * 20 - 5).toFixed(1), trend: generateTrend(summary.spend, summary.spend * 0.1) },
      supporting: [],
    },
    {
      title: 'Impressions',
      icon: 'Eye',
      primary: { label: 'Impressions', value: summary.impressions, formattedValue: `${(summary.impressions / 1e6).toFixed(2)}M`, change: +(Math.random() * 20 - 5).toFixed(1), trend: generateTrend(summary.impressions, summary.impressions * 0.15) },
      supporting: [{ label: 'CPM', formattedValue: `$${(summary.spend / summary.impressions * 1000).toFixed(2)}`, change: +(Math.random() * 10 - 5).toFixed(1) }],
    },
    {
      title: 'Clicks',
      icon: 'MousePointerClick',
      primary: { label: 'Clicks', value: summary.clicks, formattedValue: summary.clicks.toLocaleString(), change: +(Math.random() * 15 - 3).toFixed(1), trend: generateTrend(summary.clicks, summary.clicks * 0.1) },
      supporting: [
        { label: 'CTR', formattedValue: `${summary.ctr.toFixed(2)}%`, change: +(Math.random() * 10 - 5).toFixed(1) },
        { label: 'CPC', formattedValue: `$${summary.cpc.toFixed(2)}`, change: +(Math.random() * 10 - 5).toFixed(1) },
      ],
    },
    {
      title: 'Conversions',
      icon: 'Target',
      primary: { label: 'Conversions', value: summary.conversions, formattedValue: summary.conversions.toLocaleString(), change: +(Math.random() * 20 - 3).toFixed(1), trend: generateTrend(summary.conversions, summary.conversions * 0.15) },
      supporting: [
        { label: 'CPA', formattedValue: `$${summary.cpa.toFixed(2)}`, change: +(Math.random() * 15 - 8).toFixed(1) },
        { label: 'Conv. Rate', formattedValue: `${summary.conversionRate.toFixed(2)}%`, change: +(Math.random() * 10 - 3).toFixed(1) },
      ],
    },
  ];

  if (platform === 'tiktok' || platform === 'snapchat') {
    base.push({
      title: 'Video',
      icon: 'Play',
      primary: { label: 'Video Views', value: Math.round(summary.impressions * 0.3), formattedValue: `${(summary.impressions * 0.3 / 1e6).toFixed(2)}M`, change: +(Math.random() * 15 - 3).toFixed(1), trend: generateTrend(summary.impressions * 0.3, summary.impressions * 0.05) },
      supporting: [{ label: 'Completion', formattedValue: `${(30 + Math.random() * 25).toFixed(1)}%` }],
    });
  }

  if (platform === 'linkedin') {
    base.push({
      title: 'Leads',
      icon: 'UserCheck',
      primary: { label: 'Leads', value: summary.conversions, formattedValue: summary.conversions.toLocaleString(), change: +(Math.random() * 15 - 3).toFixed(1), trend: generateTrend(summary.conversions, summary.conversions * 0.1) },
      supporting: [
        { label: 'CPL', formattedValue: `$${summary.cpa.toFixed(2)}` },
        { label: 'Form Rate', formattedValue: `${(12 + Math.random() * 8).toFixed(1)}%` },
      ],
    });
  }

  return base;
}

// Keep legacy export for backward compat
export function getPlatformKPIs(platform: PlatformKey) {
  return getPlatformKPIGroups(platform);
}

export const dataSourceStatuses: DataSourceStatus[] = [
  { platform: 'Meta Ads', status: 'healthy', lastSync: '15 min ago', latency: '< 1h', recordCount: 24850, missingFields: [], warnings: [] },
  { platform: 'Google Ads', status: 'healthy', lastSync: '22 min ago', latency: '< 1h', recordCount: 18420, missingFields: [], warnings: [] },
  { platform: 'TikTok Ads', status: 'warning', lastSync: '2h ago', latency: '2h', recordCount: 8900, missingFields: ['video_completion_rate'], warnings: ['Delayed sync detected'] },
  { platform: 'LinkedIn Ads', status: 'healthy', lastSync: '45 min ago', latency: '< 1h', recordCount: 5200, missingFields: [], warnings: [] },
  { platform: 'Snapchat Ads', status: 'error', lastSync: '6h ago', latency: '6h+', recordCount: 3100, missingFields: ['swipe_ups', 'conversions'], warnings: ['API rate limit exceeded', 'Missing conversion data'] },
  { platform: 'Programmatic (DV360)', status: 'healthy', lastSync: '30 min ago', latency: '< 1h', recordCount: 12300, missingFields: [], warnings: [] },
  { platform: 'GA4', status: 'warning', lastSync: '1h ago', latency: '1-2h', recordCount: 156000, missingFields: [], warnings: ['Data processing delay'] },
];
