/**
 * Client settings repository.
 *
 * Single source of truth for reading & writing the canonical client's
 * configuration. All settings live in normalized Supabase tables:
 *
 *   clients                       — name, currency, timezone, code, domain
 *   client_branding               — logo, favicon, colors, theme/sidebar/chart
 *   client_platform_settings      — one row per ad platform (budget, KPI, etc.)
 *   client_reporting_settings     — GA4/GTM, conversions, metric mappings…
 *   client_kpi_thresholds         — built-in + custom alert thresholds
 *
 * The dashboard is single-tenant: there is exactly one "singleton" client
 * row that everyone reads, and only admins/superadmins can write.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  ClientProfile,
  PlatformConfig,
  PlatformKey,
  PLATFORM_ORDER,
  AlertThresholds,
  MetricMapping,
  NamingNormalization,
  BudgetType,
} from '@/types/dashboard';
import { defaultClient } from '@/data/mockData';

const PLATFORM_LABELS: Record<PlatformKey, string> = {
  meta: 'Meta',
  google: 'Google Ads',
  tiktok: 'TikTok',
  snapchat: 'Snapchat',
  x: 'X',
  linkedin: 'LinkedIn',
  programmatic: 'Programmatic',
};

const ALERT_METRIC_TO_FIELD: Record<string, keyof AlertThresholds> = {
  cpa_spike: 'cpaSpike',
  ctr_drop: 'ctrDrop',
  zero_conversion_spend: 'zeroConversionSpend',
  viewability: 'viewabilityThreshold',
};

const FIELD_TO_ALERT_METRIC: Record<keyof AlertThresholds, { metric: string; op: string; unit: string; severity: string; name: string }> = {
  cpaSpike:             { metric: 'cpa_spike',             op: '>', unit: '%',        severity: 'warning',  name: 'CPA Spike' },
  ctrDrop:              { metric: 'ctr_drop',              op: '<', unit: '%',        severity: 'warning',  name: 'CTR Drop' },
  zeroConversionSpend:  { metric: 'zero_conversion_spend', op: '>', unit: 'currency', severity: 'critical', name: 'Zero Conversion Spend' },
  viewabilityThreshold: { metric: 'viewability',           op: '<', unit: '%',        severity: 'warning',  name: 'Viewability' },
};

export interface LoadedSettings {
  client: ClientProfile;
  /** Tracks the underlying clients.id so we know what to write back to. */
  clientRowId: string | null;
  updatedAt: string | null;
  /** Optional admin-only branding extras (e.g. dark logo, font) preserved on the ClientProfile. */
}

/* ───────────────────────────── Load ───────────────────────────── */

/**
 * Read the singleton client's settings from the normalized tables and shape
 * them into the `ClientProfile` the React app expects.
 *
 * If no singleton exists (fresh project), returns the in-memory `defaultClient`
 * so the UI still renders without errors.
 */
export async function loadClientSettings(): Promise<LoadedSettings> {
  // Step 1 — singleton client (anyone can read)
  const { data: clientRow } = await supabase
    .from('clients')
    .select('id, name, code, currency, timezone, website_domain, updated_at, usd_to_sar_rate, usd_to_aed_rate')
    .eq('is_singleton', true)
    .maybeSingle();

  if (!clientRow) {
    return { client: { ...defaultClient }, clientRowId: null, updatedAt: null };
  }

  const clientId = clientRow.id;

  // Step 2 — parallel fetch of all per-client settings
  const [brandingRes, platformsRes, reportingRes, alertsRes, dataSourcesRes] = await Promise.all([
    supabase.from('client_branding').select('*').eq('client_id', clientId).maybeSingle(),
    supabase.from('client_platform_settings').select('*').eq('client_id', clientId),
    supabase.from('client_reporting_settings').select('*').eq('client_id', clientId).maybeSingle(),
    supabase.from('client_kpi_thresholds').select('*').eq('client_id', clientId),
    supabase.from('client_data_sources').select('*').eq('client_id', clientId).eq('source_type', 'bigquery').maybeSingle(),
  ]);

  // Reduce platforms into the keyed map the UI expects.
  const platforms: ClientProfile['platforms'] = { ...defaultClient.platforms };
  for (const key of PLATFORM_ORDER) {
    platforms[key] = { ...defaultClient.platforms[key], enabled: false, accountIds: [], budget: 0 };
  }
  for (const row of platformsRes.data ?? []) {
    const key = row.platform_name as PlatformKey;
    if (!PLATFORM_ORDER.includes(key)) continue;
    const settings = (row.settings ?? {}) as Record<string, any>;
    platforms[key] = {
      key,
      label: settings.label ?? PLATFORM_LABELS[key],
      enabled: row.is_enabled,
      color: settings.color ?? defaultClient.platforms[key].color,
      accountIds: row.account_ids ?? [],
      budget: Number(row.monthly_budget ?? 0),
      budgetType: (row.budget_type as BudgetType) ?? 'annual',
      primaryKpi: row.primary_kpi ?? 'conversions',
      reportingCurrency: row.currency ?? 'USD',
      namingConvention: row.naming_convention ?? '',
      excludedCampaignFilter: row.excluded_campaign_filter ?? '',
      notes: row.notes ?? '',
    } satisfies PlatformConfig;
  }

  // Reporting settings
  const reporting = reportingRes.data;
  const reportingExtras = (reporting?.settings ?? {}) as Record<string, any>;
  const metricMappings: MetricMapping[] = Array.isArray(reportingExtras.metricMappings)
    ? reportingExtras.metricMappings
    : defaultClient.metricMappings;
  const namingNormalization: NamingNormalization = reportingExtras.namingNormalization ?? defaultClient.namingNormalization;
  const alertRules = Array.isArray(reportingExtras.alertRules) ? reportingExtras.alertRules : [];

  // Built-in alert thresholds
  const alertThresholds: AlertThresholds = { ...defaultClient.alertThresholds };
  for (const row of alertsRes.data ?? []) {
    if (!row.is_default) continue;
    const field = ALERT_METRIC_TO_FIELD[row.metric_key];
    if (field) (alertThresholds as any)[field] = Number(row.threshold_value);
  }

  // Branding (kept on ClientProfile under `branding` so existing UI works)
  const b = brandingRes.data;
  const branding = b
    ? {
        logoUrl: b.logo_url ?? '',
        darkLogoUrl: b.dark_logo_url ?? '',
        faviconUrl: b.favicon_url ?? '',
        primaryColor: b.primary_hex ?? '',
        secondaryColor: b.secondary_hex ?? '',
        accentColor: b.accent_hex ?? '',
        fontFamily: b.font_family ?? '',
        themeMode: b.theme_mode ?? 'light',
        sidebarStyle: b.sidebar_style ?? 'dark',
        chartPalette: b.chart_palette ?? 'vibrant',
        cardRadius: b.card_radius ?? 'medium',
      }
    : null;

  const client: ClientProfile = {
    ...defaultClient,
    id: clientRow.id,
    name: clientRow.name,
    code: clientRow.code ?? defaultClient.code,
    currency: clientRow.currency,
    usdToSarRate: Number((clientRow as any).usd_to_sar_rate ?? defaultClient.usdToSarRate),
    usdToAedRate: Number((clientRow as any).usd_to_aed_rate ?? defaultClient.usdToAedRate),
    timezone: clientRow.timezone,
    websiteDomain: clientRow.website_domain ?? '',
    defaultDateRange: reporting?.default_date_range ?? defaultClient.defaultDateRange,
    weekStartDay: reporting?.week_start_day ?? defaultClient.weekStartDay,
    ga4PropertyId: reporting?.ga4_property_id ?? '',
    ga4StreamId: reporting?.ga4_stream_id ?? '',
    gtmContainerId: reporting?.gtm_container_id ?? '',
    bigqueryProject: dataSourcesRes.data?.gcp_project_id ?? '',
    bigqueryDataset: dataSourcesRes.data?.bq_dataset ?? '',
    primaryConversion: reporting?.primary_conversion_label ?? '',
    secondaryConversion: reporting?.secondary_conversion_label ?? '',
    microConversions: reporting?.micro_conversions ?? [],
    conversionNotes: reporting?.conversion_notes ?? '',
    platforms,
    alertThresholds,
    metricMappings,
    namingNormalization,
  };

  // Attach extra fields used by some components (branding, alertRules) without
  // adding them to the strict type — kept under `as any` to preserve back-compat.
  (client as any).branding = branding;
  (client as any).alertRules = alertRules;

  return {
    client,
    clientRowId: clientRow.id,
    updatedAt: clientRow.updated_at ?? null,
  };
}

/* ───────────────────────────── Save ───────────────────────────── */

/**
 * Persist a `ClientProfile` to the normalized tables. Admin-only at the DB
 * level (RLS will reject non-admin writes).
 *
 * If no singleton client exists yet, the caller's userId is used as the
 * `owner_user_id` of a freshly-created singleton row.
 */
export async function saveClientSettings(client: ClientProfile, ownerUserId: string): Promise<{ clientId: string; updatedAt: string }> {
  // 1) Upsert the singleton clients row -----------------------------------
  let { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('is_singleton', true)
    .maybeSingle();

  let clientId: string;
  if (existing) {
    clientId = existing.id;
    const { error } = await supabase
      .from('clients')
      .update({
        name: client.name,
        code: client.code,
        currency: client.currency,
        timezone: client.timezone,
        website_domain: client.websiteDomain || null,
        usd_to_sar_rate: Number(client.usdToSarRate ?? 0) || 0,
        usd_to_aed_rate: Number(client.usdToAedRate ?? 0) || 0,
      } as any)
      .eq('id', clientId);
    if (error) throw error;
  } else {
    const slug = (client.name || 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-singleton';
    const { data: inserted, error } = await supabase
      .from('clients')
      .insert({
        owner_user_id: ownerUserId,
        name: client.name || 'Client',
        slug,
        status: 'active',
        currency: client.currency,
        timezone: client.timezone,
        website_domain: client.websiteDomain || null,
        is_singleton: true,
        usd_to_sar_rate: Number(client.usdToSarRate ?? 0) || 0,
        usd_to_aed_rate: Number(client.usdToAedRate ?? 0) || 0,
      } as any)
      .select('id')
      .single();
    if (error) throw error;
    clientId = inserted.id;
  }

  // 2) Branding ----------------------------------------------------------
  const branding = (client as any).branding as Record<string, any> | null | undefined;
  if (branding) {
    const { error } = await supabase
      .from('client_branding')
      .upsert(
        {
          client_id: clientId,
          logo_url: branding.logoUrl || null,
          dark_logo_url: branding.darkLogoUrl || null,
          favicon_url: branding.faviconUrl || null,
          primary_hex: branding.primaryColor || null,
          secondary_hex: branding.secondaryColor || null,
          accent_hex: branding.accentColor || null,
          font_family: branding.fontFamily || null,
          theme_mode: branding.themeMode || 'light',
          sidebar_style: branding.sidebarStyle || 'dark',
          chart_palette: branding.chartPalette || 'vibrant',
          card_radius: branding.cardRadius || 'medium',
        },
        { onConflict: 'client_id' }
      );
    if (error) throw error;
  }

  // 3) Platform settings — replace strategy ------------------------------
  await supabase.from('client_platform_settings').delete().eq('client_id', clientId);
  const platformRows = PLATFORM_ORDER.map(key => {
    const cfg = client.platforms[key];
    if (!cfg) return null;
    return {
      client_id: clientId,
      platform_name: key,
      is_enabled: cfg.enabled,
      monthly_budget: cfg.budget || null,
      budget_type: cfg.budgetType || 'annual',
      currency: cfg.reportingCurrency || client.currency,
      primary_kpi: cfg.primaryKpi || 'conversions',
      account_ids: cfg.accountIds ?? [],
      naming_convention: cfg.namingConvention || null,
      excluded_campaign_filter: cfg.excludedCampaignFilter || null,
      notes: cfg.notes || null,
      settings: { color: cfg.color, label: cfg.label },
    };
  }).filter(Boolean) as any[];

  if (platformRows.length > 0) {
    const { error } = await supabase.from('client_platform_settings').insert(platformRows);
    if (error) throw error;
  }

  // 4) Reporting settings ------------------------------------------------
  const reportingExtras = {
    metricMappings: client.metricMappings,
    namingNormalization: client.namingNormalization,
    alertRules: (client as any).alertRules ?? [],
  };
  {
    const { error } = await supabase
      .from('client_reporting_settings')
      .upsert(
        {
          client_id: clientId,
          reporting_currency: client.currency,
          reporting_timezone: client.timezone,
          default_date_range: client.defaultDateRange,
          week_start_day: client.weekStartDay,
          primary_conversion_label: client.primaryConversion || null,
          secondary_conversion_label: client.secondaryConversion || null,
          micro_conversions: client.microConversions ?? [],
          conversion_notes: client.conversionNotes || null,
          ga4_property_id: client.ga4PropertyId || null,
          ga4_stream_id: client.ga4StreamId || null,
          gtm_container_id: client.gtmContainerId || null,
          settings: reportingExtras as any,
        } as any,
        { onConflict: 'client_id' }
      );
    if (error) throw error;
  }

  // 5) BigQuery data source --------------------------------------------
  {
    const { data: existingBq } = await supabase
      .from('client_data_sources')
      .select('id')
      .eq('client_id', clientId)
      .eq('source_type', 'bigquery')
      .maybeSingle();

    const payload = {
      client_id: clientId,
      source_type: 'bigquery',
      gcp_project_id: client.bigqueryProject || null,
      bq_dataset: client.bigqueryDataset || null,
      is_enabled: true,
    } as any;

    if (existingBq) {
      const { error } = await supabase
        .from('client_data_sources')
        .update(payload)
        .eq('id', existingBq.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('client_data_sources')
        .insert(payload);
      if (error) throw error;
    }
  }

  // 6) Built-in alert thresholds (replace the defaults) ------------------
  await supabase
    .from('client_kpi_thresholds')
    .delete()
    .eq('client_id', clientId)
    .eq('is_default', true);

  const thresholdRows = (Object.keys(client.alertThresholds) as Array<keyof AlertThresholds>)
    .map(field => {
      const meta = FIELD_TO_ALERT_METRIC[field];
      if (!meta) return null;
      return {
        client_id: clientId,
        metric_key: meta.metric,
        comparison_operator: meta.op,
        threshold_value: client.alertThresholds[field],
        unit: meta.unit,
        severity: meta.severity,
        is_default: true,
        is_enabled: true,
        scope: 'global',
        name: meta.name,
      };
    })
    .filter(Boolean) as any[];

  if (thresholdRows.length > 0) {
    const { error } = await supabase.from('client_kpi_thresholds').insert(thresholdRows);
    if (error) throw error;
  }

  // 6) Stamp & return ----------------------------------------------------
  const { data: stamped } = await supabase
    .from('clients')
    .select('updated_at')
    .eq('id', clientId)
    .maybeSingle();

  return {
    clientId,
    updatedAt: stamped?.updated_at ?? new Date().toISOString(),
  };
}
