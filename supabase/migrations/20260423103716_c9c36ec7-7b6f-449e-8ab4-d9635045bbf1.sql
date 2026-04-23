-- Replace the self-update policy with one that explicitly forbids users from
-- changing privileged columns (is_approved, email, user_id). The existing
-- enforce_is_approved_immutability trigger remains as defense in depth.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND is_approved = (SELECT p.is_approved FROM public.profiles p WHERE p.user_id = auth.uid())
  AND email       = (SELECT p.email       FROM public.profiles p WHERE p.user_id = auth.uid())
  AND user_id     = (SELECT p.user_id     FROM public.profiles p WHERE p.user_id = auth.uid())
);