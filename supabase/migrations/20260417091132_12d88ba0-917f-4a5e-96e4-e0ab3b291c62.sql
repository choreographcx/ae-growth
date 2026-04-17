-- ============================================================
-- Extend normalized schema to fully replace client_configs.config
-- ============================================================

-- 1) clients: add fields previously living in client_configs JSON
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Dubai',
  ADD COLUMN IF NOT EXISTS website_domain text;

-- Enforce one client per user (matches the chosen "auto-create one client per user" model).
CREATE UNIQUE INDEX IF NOT EXISTS clients_owner_user_id_unique
  ON public.clients(owner_user_id);

-- 2) client_branding: extra typed columns
ALTER TABLE public.client_branding
  ADD COLUMN IF NOT EXISTS dark_logo_url text,
  ADD COLUMN IF NOT EXISTS favicon_url text,
  ADD COLUMN IF NOT EXISTS sidebar_style text NOT NULL DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS chart_palette text NOT NULL DEFAULT 'vibrant',
  ADD COLUMN IF NOT EXISTS card_radius text NOT NULL DEFAULT 'medium';

-- Validate enum-like values
DO $$ BEGIN
  ALTER TABLE public.client_branding
    ADD CONSTRAINT client_branding_sidebar_style_check
    CHECK (sidebar_style IN ('dark','light','brand'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.client_branding
    ADD CONSTRAINT client_branding_chart_palette_check
    CHECK (chart_palette IN ('vibrant','muted','monochrome','brand'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.client_branding
    ADD CONSTRAINT client_branding_card_radius_check
    CHECK (card_radius IN ('small','medium','large'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) client_reporting_settings: typed columns for measurement + reporting
ALTER TABLE public.client_reporting_settings
  ADD COLUMN IF NOT EXISTS ga4_property_id text,
  ADD COLUMN IF NOT EXISTS ga4_stream_id text,
  ADD COLUMN IF NOT EXISTS gtm_container_id text,
  ADD COLUMN IF NOT EXISTS lookback_window text NOT NULL DEFAULT '30 days',
  ADD COLUMN IF NOT EXISTS counting_method text NOT NULL DEFAULT 'every',
  ADD COLUMN IF NOT EXISTS conversion_notes text,
  ADD COLUMN IF NOT EXISTS micro_conversions text[] NOT NULL DEFAULT '{}'::text[];

-- 4) client_platform_settings: typed columns + multi-account support
ALTER TABLE public.client_platform_settings
  ADD COLUMN IF NOT EXISTS account_ids text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS primary_kpi text NOT NULL DEFAULT 'conversions',
  ADD COLUMN IF NOT EXISTS conversion_source text NOT NULL DEFAULT 'pixel',
  ADD COLUMN IF NOT EXISTS budget_type text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS include_in_overview boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS include_in_diagnostics boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS source_label text,
  ADD COLUMN IF NOT EXISTS excluded_campaign_filter text,
  ADD COLUMN IF NOT EXISTS notes text;

DO $$ BEGIN
  ALTER TABLE public.client_platform_settings
    ADD CONSTRAINT client_platform_settings_budget_type_check
    CHECK (budget_type IN ('monthly','campaign','custom'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- One row per (client, platform)
CREATE UNIQUE INDEX IF NOT EXISTS client_platform_settings_client_platform_unique
  ON public.client_platform_settings(client_id, platform_name);

-- 5) client_kpi_thresholds: extend to model the rich AlertRule shape
ALTER TABLE public.client_kpi_thresholds
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT '%',
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE public.client_kpi_thresholds
    ADD CONSTRAINT client_kpi_thresholds_scope_check
    CHECK (scope IN ('global','platform','campaign_type'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.client_kpi_thresholds
    ADD CONSTRAINT client_kpi_thresholds_severity_check
    CHECK (severity IN ('info','warning','critical'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- One row per (client, metric_key)
CREATE UNIQUE INDEX IF NOT EXISTS client_kpi_thresholds_client_metric_unique
  ON public.client_kpi_thresholds(client_id, metric_key);

-- 6) client_data_sources: ensure one row per (client, source_type)
CREATE UNIQUE INDEX IF NOT EXISTS client_data_sources_client_source_unique
  ON public.client_data_sources(client_id, source_type);

-- 7) updated_at triggers on all extended tables
DROP TRIGGER IF EXISTS set_clients_updated_at ON public.clients;
CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_client_branding_updated_at ON public.client_branding;
CREATE TRIGGER set_client_branding_updated_at
  BEFORE UPDATE ON public.client_branding
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_client_reporting_updated_at ON public.client_reporting_settings;
CREATE TRIGGER set_client_reporting_updated_at
  BEFORE UPDATE ON public.client_reporting_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_client_platform_updated_at ON public.client_platform_settings;
CREATE TRIGGER set_client_platform_updated_at
  BEFORE UPDATE ON public.client_platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_client_kpi_updated_at ON public.client_kpi_thresholds;
CREATE TRIGGER set_client_kpi_updated_at
  BEFORE UPDATE ON public.client_kpi_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_client_data_sources_updated_at ON public.client_data_sources;
CREATE TRIGGER set_client_data_sources_updated_at
  BEFORE UPDATE ON public.client_data_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8) Helper function: get-or-create the active client for a user.
-- Uses SECURITY INVOKER so it respects the caller's RLS (and unique index
-- prevents duplicates if two requests race).
CREATE OR REPLACE FUNCTION public.get_or_create_active_client()
RETURNS public.clients
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _email text;
  _name text;
  _slug text;
  _client public.clients;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _client
  FROM public.clients
  WHERE owner_user_id = _user_id
  LIMIT 1;

  IF FOUND THEN
    RETURN _client;
  END IF;

  SELECT email, COALESCE(full_name, split_part(email, '@', 1))
    INTO _email, _name
  FROM public.profiles
  WHERE user_id = _user_id;

  IF _email IS NULL THEN _email := 'user@example.com'; END IF;
  IF _name  IS NULL OR _name = '' THEN _name := 'My Client'; END IF;

  _slug := regexp_replace(lower(_email), '[^a-z0-9]+', '-', 'g')
           || '-' || substr(_user_id::text, 1, 8);

  INSERT INTO public.clients (owner_user_id, name, slug, status, currency, timezone)
  VALUES (_user_id, _name, _slug, 'active', 'USD', 'Asia/Dubai')
  RETURNING * INTO _client;

  RETURN _client;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_active_client() TO authenticated;

-- 9) Auto-create a client row when a new user signs up so the app has a
-- target for upserts on first login. Extend handle_new_user.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email TEXT;
  _name  TEXT;
  _slug  TEXT;
  _auto_approve BOOLEAN;
BEGIN
  _email := NEW.raw_user_meta_data ->> 'email';
  IF _email IS NULL THEN _email := NEW.email; END IF;

  _name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(_email, '@', 1));
  _auto_approve := (_email ILIKE '%@wppmedia.com');

  INSERT INTO public.profiles (user_id, email, full_name, is_approved)
  VALUES (NEW.id, _email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''), _auto_approve);

  -- Roles: only 'admin' and 'user'. No 'member'.
  IF _email = 'rachel.montague@wppmedia.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  -- Auto-create one client per user
  _slug := regexp_replace(lower(_email), '[^a-z0-9]+', '-', 'g')
           || '-' || substr(NEW.id::text, 1, 8);

  INSERT INTO public.clients (owner_user_id, name, slug, status, currency, timezone)
  VALUES (NEW.id, _name, _slug, 'active', 'USD', 'Asia/Dubai')
  ON CONFLICT (owner_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
