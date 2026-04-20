-- Remove the public policy that exposed owner_user_id
DROP POLICY IF EXISTS "Anyone can view singleton client" ON public.clients;

-- Allow authenticated users to read the singleton client row (for app use)
CREATE POLICY "Authenticated can view singleton client"
ON public.clients
FOR SELECT
TO authenticated
USING (is_singleton = true);

-- Public view exposing ONLY safe, non-sensitive fields of the singleton client.
-- This is what unauthenticated visitors (login page, incognito) read to render
-- branding (client name, etc.) — owner_user_id is intentionally excluded.
CREATE OR REPLACE VIEW public.public_singleton_client
WITH (security_invoker = true) AS
SELECT
  id,
  name,
  code,
  slug,
  status,
  currency,
  timezone,
  website_domain,
  created_at,
  updated_at
FROM public.clients
WHERE is_singleton = true;

-- A view inherits the RLS of its base table when security_invoker=true.
-- We need the public to read this view, so add a permissive SELECT policy
-- on clients that ONLY allows reading when the request is going through the
-- view (via column-level grants). Simplest: add a public SELECT policy on
-- the singleton row, then revoke the sensitive column from anon/public.
CREATE POLICY "Public can view singleton client (safe cols only)"
ON public.clients
FOR SELECT
TO anon
USING (is_singleton = true);

-- Revoke direct table access to owner_user_id from anon so even if a client
-- queries the table directly, the sensitive UUID is not returned.
REVOKE SELECT ON public.clients FROM anon;
GRANT SELECT (id, name, code, slug, status, currency, timezone, website_domain, is_singleton, created_at, updated_at)
  ON public.clients TO anon;

-- Grant view access
GRANT SELECT ON public.public_singleton_client TO anon, authenticated;