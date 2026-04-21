
-- Drop the views we just created (they triggered the SECURITY DEFINER VIEW lint)
DROP VIEW IF EXISTS public.public_singleton_branding;
DROP VIEW IF EXISTS public.public_singleton_client CASCADE;

-- Replacement: SECURITY DEFINER function for client info (id + name only)
CREATE OR REPLACE FUNCTION public.get_public_client_info()
RETURNS TABLE (id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name
  FROM public.clients c
  WHERE c.is_singleton = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_client_info() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_client_info() TO anon, authenticated;

-- Replacement: SECURITY DEFINER function for safe branding (no client_id)
CREATE OR REPLACE FUNCTION public.get_public_branding()
RETURNS TABLE (
  logo_url       text,
  dark_logo_url  text,
  favicon_url    text,
  primary_hex    text,
  secondary_hex  text,
  accent_hex     text,
  font_family    text,
  theme_mode     text,
  sidebar_style  text,
  chart_palette  text,
  card_radius    text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.logo_url,
    b.dark_logo_url,
    b.favicon_url,
    b.primary_hex,
    b.secondary_hex,
    b.accent_hex,
    b.font_family,
    b.theme_mode,
    b.sidebar_style,
    b.chart_palette,
    b.card_radius
  FROM public.client_branding b
  JOIN public.clients c ON c.id = b.client_id
  WHERE c.is_singleton = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_branding() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_branding() TO anon, authenticated;
