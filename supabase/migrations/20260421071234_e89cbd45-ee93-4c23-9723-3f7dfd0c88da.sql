
-- 1) Remove anonymous SELECT policy from clients table
DROP POLICY IF EXISTS "Public can view singleton client (safe cols only)" ON public.clients;

-- 2) Tighten the public_singleton_client view to expose only id + name
DROP VIEW IF EXISTS public.public_singleton_client CASCADE;
CREATE VIEW public.public_singleton_client
WITH (security_invoker = true) AS
SELECT id, name
FROM public.clients
WHERE is_singleton = true;

-- Re-grant safe access to the slimmed view
GRANT SELECT ON public.public_singleton_client TO anon, authenticated;

-- 3) Remove anonymous policy on client_branding (currently public role)
DROP POLICY IF EXISTS "Anyone can view client branding" ON public.client_branding;

-- Re-add an authenticated-only SELECT policy so logged-in users still see branding
CREATE POLICY "Authenticated can view client branding"
ON public.client_branding
FOR SELECT
TO authenticated
USING (client_id = public.get_singleton_client_id());

-- 4) Create a safe public branding view that omits client_id and other internal ids
CREATE OR REPLACE VIEW public.public_singleton_branding
WITH (security_invoker = false) AS
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
WHERE c.is_singleton = true;

-- security_invoker=false (definer) so anon can read via the view even though
-- the underlying table policy is restricted to authenticated users.
GRANT SELECT ON public.public_singleton_branding TO anon, authenticated;
