-- 1. Replace the profiles self-update policy with one that forbids
--    users from changing is_approved (defense-in-depth alongside the
--    existing enforce_is_approved_immutability trigger).
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND is_approved = (SELECT p.is_approved FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- 2. Explicitly deny all client access to x_oauth_tokens.
--    This table holds app-level OAuth credentials and is only accessed
--    by edge functions via the service role (which bypasses RLS).
--    Adding explicit restrictive-style deny policies makes intent clear
--    and ensures no future permissive policy accidentally opens access.
DROP POLICY IF EXISTS "Deny all client access to oauth tokens" ON public.x_oauth_tokens;

CREATE POLICY "Deny all client access to oauth tokens"
ON public.x_oauth_tokens
AS RESTRICTIVE
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);
