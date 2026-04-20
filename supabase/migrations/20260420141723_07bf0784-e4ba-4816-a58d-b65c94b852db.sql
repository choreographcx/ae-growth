-- ============================================================
-- PHASE 0: Loosen budget_type check so annual/monthly/campaign/custom all valid
-- ============================================================
ALTER TABLE public.client_platform_settings
  DROP CONSTRAINT IF EXISTS client_platform_settings_budget_type_check;

ALTER TABLE public.client_platform_settings
  ADD CONSTRAINT client_platform_settings_budget_type_check
  CHECK (budget_type IN ('annual', 'monthly', 'campaign', 'custom'));

-- ============================================================
-- PHASE 1: Schema additions + helper functions
-- ============================================================
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS is_singleton boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS clients_singleton_unique
  ON public.clients ((is_singleton)) WHERE is_singleton = true;

CREATE OR REPLACE FUNCTION public.get_singleton_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.clients WHERE is_singleton = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_singleton_client()
RETURNS SETOF public.clients
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.clients WHERE is_singleton = true LIMIT 1;
$$;

-- ============================================================
-- PHASE 2: Backfill from client_configs (admin's row wins)
-- ============================================================
DO $backfill$
DECLARE
  _src_user_id uuid;
  _cfg jsonb;
  _client_id uuid;
  _client_name text;
  _platforms jsonb;
  _branding jsonb;
  _alerts jsonb;
  _alert_rules jsonb;
  _platform_key text;
  _p jsonb;
  _r jsonb;
  _budget_type text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='client_configs') THEN
    RAISE NOTICE 'client_configs table not present — skipping backfill.';
    RETURN;
  END IF;

  SELECT cc.user_id, cc.config
    INTO _src_user_id, _cfg
  FROM public.client_configs cc
  JOIN public.user_roles ur ON ur.user_id = cc.user_id
  WHERE ur.role IN ('admin', 'superadmin')
  ORDER BY cc.updated_at DESC
  LIMIT 1;

  IF _cfg IS NULL THEN
    SELECT cc.user_id, cc.config INTO _src_user_id, _cfg
    FROM public.client_configs cc
    ORDER BY cc.updated_at DESC LIMIT 1;
  END IF;

  IF _cfg IS NULL THEN
    UPDATE public.clients
       SET is_singleton = true
     WHERE id = (SELECT id FROM public.clients ORDER BY created_at LIMIT 1)
       AND NOT EXISTS (SELECT 1 FROM public.clients WHERE is_singleton);
    RETURN;
  END IF;

  _client_name := COALESCE(NULLIF(_cfg->>'name', ''), 'Client');

  SELECT id INTO _client_id FROM public.clients WHERE is_singleton = true LIMIT 1;
  IF _client_id IS NULL THEN
    SELECT id INTO _client_id FROM public.clients WHERE owner_user_id = _src_user_id LIMIT 1;
  END IF;

  IF _client_id IS NULL THEN
    INSERT INTO public.clients (owner_user_id, name, slug, status, currency, timezone, is_singleton)
    VALUES (
      _src_user_id,
      _client_name,
      regexp_replace(lower(_client_name), '[^a-z0-9]+', '-', 'g'),
      'active',
      COALESCE(NULLIF(_cfg->>'currency', ''), 'USD'),
      COALESCE(NULLIF(_cfg->>'timezone', ''), 'Asia/Dubai'),
      true
    ) RETURNING id INTO _client_id;
  ELSE
    UPDATE public.clients
       SET is_singleton = true,
           name           = _client_name,
           currency       = COALESCE(NULLIF(_cfg->>'currency', ''), currency),
           timezone       = COALESCE(NULLIF(_cfg->>'timezone', ''), timezone),
           website_domain = COALESCE(NULLIF(_cfg->>'websiteDomain', ''), website_domain),
           code           = COALESCE(NULLIF(_cfg->>'code', ''), code)
     WHERE id = _client_id;
  END IF;

  -- ---- Branding ----------------------------------------------------------
  _branding := COALESCE(_cfg->'branding', '{}'::jsonb);
  INSERT INTO public.client_branding (
    client_id, logo_url, dark_logo_url, favicon_url,
    primary_hex, secondary_hex, accent_hex,
    font_family, theme_mode, sidebar_style, chart_palette, card_radius
  )
  VALUES (
    _client_id,
    NULLIF(_branding->>'logoUrl', ''),
    NULLIF(_branding->>'darkLogoUrl', ''),
    NULLIF(_branding->>'faviconUrl', ''),
    NULLIF(_branding->>'primaryColor', ''),
    NULLIF(_branding->>'secondaryColor', ''),
    NULLIF(_branding->>'accentColor', ''),
    NULLIF(_branding->>'fontFamily', ''),
    COALESCE(NULLIF(_branding->>'themeMode', ''), 'light'),
    COALESCE(NULLIF(_branding->>'sidebarStyle', ''), 'dark'),
    COALESCE(NULLIF(_branding->>'chartPalette', ''), 'vibrant'),
    COALESCE(NULLIF(_branding->>'cardRadius', ''), 'medium')
  )
  ON CONFLICT (client_id) DO UPDATE SET
    logo_url      = EXCLUDED.logo_url,
    dark_logo_url = EXCLUDED.dark_logo_url,
    favicon_url   = EXCLUDED.favicon_url,
    primary_hex   = EXCLUDED.primary_hex,
    secondary_hex = EXCLUDED.secondary_hex,
    accent_hex    = EXCLUDED.accent_hex,
    font_family   = EXCLUDED.font_family,
    theme_mode    = EXCLUDED.theme_mode,
    sidebar_style = EXCLUDED.sidebar_style,
    chart_palette = EXCLUDED.chart_palette,
    card_radius   = EXCLUDED.card_radius,
    updated_at    = now();

  -- ---- Platform Settings -------------------------------------------------
  _platforms := COALESCE(_cfg->'platforms', '{}'::jsonb);
  DELETE FROM public.client_platform_settings WHERE client_id = _client_id;

  FOR _platform_key IN SELECT jsonb_object_keys(_platforms) LOOP
    _p := _platforms->_platform_key;
    _budget_type := COALESCE(NULLIF(_p->>'budgetType', ''), 'annual');
    IF _budget_type NOT IN ('annual','monthly','campaign','custom') THEN
      _budget_type := 'annual';
    END IF;

    INSERT INTO public.client_platform_settings (
      client_id, platform_name, is_enabled,
      monthly_budget, budget_type, currency,
      primary_kpi, conversion_source,
      account_ids, naming_convention, source_label,
      excluded_campaign_filter, notes,
      include_in_overview, include_in_diagnostics,
      settings
    )
    VALUES (
      _client_id,
      _platform_key,
      COALESCE((_p->>'enabled')::boolean, false),
      NULLIF(_p->>'budget', '')::numeric,
      _budget_type,
      COALESCE(NULLIF(_cfg->>'currency', ''), 'USD'),
      COALESCE(NULLIF(_p->>'primaryKpi', ''), 'conversions'),
      COALESCE(NULLIF(_p->>'conversionSource', ''), 'pixel'),
      COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(_p->'accountIds') WHERE _p ? 'accountIds'),
        '{}'::text[]
      ),
      NULLIF(_p->>'namingConvention', ''),
      NULLIF(_p->>'sourceLabel', ''),
      NULLIF(_p->>'excludedCampaignFilter', ''),
      NULLIF(_p->>'notes', ''),
      COALESCE((_p->>'includeInOverview')::boolean, true),
      COALESCE((_p->>'includeInDiagnostics')::boolean, true),
      jsonb_build_object('color', _p->>'color', 'label', _p->>'label')
    );
  END LOOP;

  -- ---- Reporting Settings ------------------------------------------------
  INSERT INTO public.client_reporting_settings (
    client_id,
    reporting_currency, reporting_timezone, default_date_range, week_start_day,
    primary_conversion_label, secondary_conversion_label,
    micro_conversions, conversion_notes,
    ga4_property_id, ga4_stream_id, gtm_container_id,
    settings
  )
  VALUES (
    _client_id,
    COALESCE(NULLIF(_cfg->>'currency', ''), 'USD'),
    COALESCE(NULLIF(_cfg->>'timezone', ''), 'Asia/Dubai'),
    COALESCE(NULLIF(_cfg->>'defaultDateRange', ''), 'last_30_days'),
    COALESCE(NULLIF(_cfg->>'weekStartDay', ''), 'Monday'),
    NULLIF(_cfg->>'primaryConversion', ''),
    NULLIF(_cfg->>'secondaryConversion', ''),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(_cfg->'microConversions') WHERE _cfg ? 'microConversions'),
      '{}'::text[]
    ),
    NULLIF(_cfg->>'conversionNotes', ''),
    NULLIF(_cfg->>'ga4PropertyId', ''),
    NULLIF(_cfg->>'ga4StreamId', ''),
    NULLIF(_cfg->>'gtmContainerId', ''),
    jsonb_build_object(
      'metricMappings',       COALESCE(_cfg->'metricMappings', '[]'::jsonb),
      'namingNormalization',  COALESCE(_cfg->'namingNormalization', '{}'::jsonb),
      'alertRules',           COALESCE(_cfg->'alertRules', '[]'::jsonb)
    )
  )
  ON CONFLICT (client_id) DO UPDATE SET
    reporting_currency        = EXCLUDED.reporting_currency,
    reporting_timezone        = EXCLUDED.reporting_timezone,
    default_date_range        = EXCLUDED.default_date_range,
    week_start_day            = EXCLUDED.week_start_day,
    primary_conversion_label  = EXCLUDED.primary_conversion_label,
    secondary_conversion_label= EXCLUDED.secondary_conversion_label,
    micro_conversions         = EXCLUDED.micro_conversions,
    conversion_notes          = EXCLUDED.conversion_notes,
    ga4_property_id           = EXCLUDED.ga4_property_id,
    ga4_stream_id             = EXCLUDED.ga4_stream_id,
    gtm_container_id          = EXCLUDED.gtm_container_id,
    settings                  = EXCLUDED.settings,
    updated_at                = now();

  -- ---- Alert thresholds (built-in) --------------------------------------
  _alerts := COALESCE(_cfg->'alertThresholds', '{}'::jsonb);
  DELETE FROM public.client_kpi_thresholds WHERE client_id = _client_id;

  IF (_alerts ? 'cpaSpike') THEN
    INSERT INTO public.client_kpi_thresholds (client_id, metric_key, comparison_operator, threshold_value, unit, severity, is_default, name, description)
    VALUES (_client_id, 'cpa_spike', '>', COALESCE((_alerts->>'cpaSpike')::numeric, 25), '%', 'warning', true, 'CPA Spike', 'CPA increased beyond threshold vs prior period');
  END IF;
  IF (_alerts ? 'ctrDrop') THEN
    INSERT INTO public.client_kpi_thresholds (client_id, metric_key, comparison_operator, threshold_value, unit, severity, is_default, name, description)
    VALUES (_client_id, 'ctr_drop', '<', COALESCE((_alerts->>'ctrDrop')::numeric, 20), '%', 'warning', true, 'CTR Drop', 'CTR dropped beyond threshold vs prior period');
  END IF;
  IF (_alerts ? 'frequencyThreshold') THEN
    INSERT INTO public.client_kpi_thresholds (client_id, metric_key, comparison_operator, threshold_value, unit, severity, is_default, name, description)
    VALUES (_client_id, 'frequency', '>', COALESCE((_alerts->>'frequencyThreshold')::numeric, 4), 'count', 'warning', true, 'Frequency Cap', 'Average ad frequency exceeded');
  END IF;
  IF (_alerts ? 'zeroConversionSpend') THEN
    INSERT INTO public.client_kpi_thresholds (client_id, metric_key, comparison_operator, threshold_value, unit, severity, is_default, name, description)
    VALUES (_client_id, 'zero_conversion_spend', '>', COALESCE((_alerts->>'zeroConversionSpend')::numeric, 500), 'currency', 'critical', true, 'Zero Conversion Spend', 'Spend with no conversions exceeded threshold');
  END IF;
  IF (_alerts ? 'viewabilityThreshold') THEN
    INSERT INTO public.client_kpi_thresholds (client_id, metric_key, comparison_operator, threshold_value, unit, severity, is_default, name, description)
    VALUES (_client_id, 'viewability', '<', COALESCE((_alerts->>'viewabilityThreshold')::numeric, 50), '%', 'warning', true, 'Viewability', 'Viewability below threshold');
  END IF;

  -- ---- Custom alert rules ----------------------------------------------
  _alert_rules := COALESCE(_cfg->'alertRules', '[]'::jsonb);
  IF jsonb_typeof(_alert_rules) = 'array' THEN
    FOR _r IN SELECT * FROM jsonb_array_elements(_alert_rules) LOOP
      INSERT INTO public.client_kpi_thresholds (
        client_id, metric_key, comparison_operator, threshold_value,
        unit, severity, is_enabled, is_default, scope, name, description
      ) VALUES (
        _client_id,
        COALESCE(NULLIF(_r->>'metric', ''), 'custom'),
        COALESCE(NULLIF(_r->>'operator', ''), '>'),
        COALESCE((_r->>'value')::numeric, 0),
        COALESCE(NULLIF(_r->>'unit', ''), '%'),
        COALESCE(NULLIF(_r->>'severity', ''), 'warning'),
        COALESCE((_r->>'active')::boolean, true),
        false,
        COALESCE(NULLIF(_r->>'scope', ''), 'global'),
        NULLIF(_r->>'name', ''),
        NULLIF(_r->>'description', '')
      );
    END LOOP;
  END IF;
END
$backfill$;

-- ============================================================
-- PHASE 3: Tighten RLS for single-tenant shared model
-- ============================================================

-- clients ----------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Anyone can view singleton client" ON public.clients;
DROP POLICY IF EXISTS "Admins can write clients" ON public.clients;

CREATE POLICY "Anyone can view singleton client"
  ON public.clients FOR SELECT
  USING (is_singleton = true);

CREATE POLICY "Admins can write clients"
  ON public.clients FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- client_branding --------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage client branding" ON public.client_branding;
DROP POLICY IF EXISTS "Users can manage own client branding" ON public.client_branding;
DROP POLICY IF EXISTS "Anyone can view client branding" ON public.client_branding;
DROP POLICY IF EXISTS "Admins can write branding" ON public.client_branding;

CREATE POLICY "Anyone can view client branding"
  ON public.client_branding FOR SELECT
  USING (client_id = public.get_singleton_client_id());

CREATE POLICY "Admins can write branding"
  ON public.client_branding FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- client_platform_settings ----------------------------------------------
DROP POLICY IF EXISTS "Admins can manage client platform settings" ON public.client_platform_settings;
DROP POLICY IF EXISTS "Users can manage own client platform settings" ON public.client_platform_settings;
DROP POLICY IF EXISTS "Authenticated can view platform settings" ON public.client_platform_settings;
DROP POLICY IF EXISTS "Admins can write platform settings" ON public.client_platform_settings;

CREATE POLICY "Authenticated can view platform settings"
  ON public.client_platform_settings FOR SELECT
  TO authenticated
  USING (client_id = public.get_singleton_client_id());

CREATE POLICY "Admins can write platform settings"
  ON public.client_platform_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- client_reporting_settings ---------------------------------------------
DROP POLICY IF EXISTS "Admins can manage client reporting settings" ON public.client_reporting_settings;
DROP POLICY IF EXISTS "Users can manage own client reporting settings" ON public.client_reporting_settings;
DROP POLICY IF EXISTS "Authenticated can view reporting settings" ON public.client_reporting_settings;
DROP POLICY IF EXISTS "Admins can write reporting settings" ON public.client_reporting_settings;

CREATE POLICY "Authenticated can view reporting settings"
  ON public.client_reporting_settings FOR SELECT
  TO authenticated
  USING (client_id = public.get_singleton_client_id());

CREATE POLICY "Admins can write reporting settings"
  ON public.client_reporting_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- client_kpi_thresholds -------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage client kpi thresholds" ON public.client_kpi_thresholds;
DROP POLICY IF EXISTS "Users can manage own client kpi thresholds" ON public.client_kpi_thresholds;
DROP POLICY IF EXISTS "Authenticated can view kpi thresholds" ON public.client_kpi_thresholds;
DROP POLICY IF EXISTS "Admins can write kpi thresholds" ON public.client_kpi_thresholds;

CREATE POLICY "Authenticated can view kpi thresholds"
  ON public.client_kpi_thresholds FOR SELECT
  TO authenticated
  USING (client_id = public.get_singleton_client_id());

CREATE POLICY "Admins can write kpi thresholds"
  ON public.client_kpi_thresholds FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- client_data_sources ---------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage client data sources" ON public.client_data_sources;
DROP POLICY IF EXISTS "Users can manage own client data sources" ON public.client_data_sources;
DROP POLICY IF EXISTS "Authenticated can view data sources" ON public.client_data_sources;
DROP POLICY IF EXISTS "Admins can write data sources" ON public.client_data_sources;

CREATE POLICY "Authenticated can view data sources"
  ON public.client_data_sources FOR SELECT
  TO authenticated
  USING (client_id = public.get_singleton_client_id());

CREATE POLICY "Admins can write data sources"
  ON public.client_data_sources FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- ============================================================
-- PHASE 4: Drop legacy tables now that backfill is complete
-- ============================================================
DROP TABLE IF EXISTS public.public_branding;
DROP TABLE IF EXISTS public.client_configs;
