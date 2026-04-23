-- Replace the self-referential WITH CHECK subquery with a simpler policy.
-- The enforce_is_approved_immutability trigger already prevents non-superadmins
-- from modifying is_approved, so the policy only needs to scope updates to the
-- user's own row.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure the immutability trigger is attached (idempotent).
DROP TRIGGER IF EXISTS enforce_profiles_is_approved_immutable ON public.profiles;
CREATE TRIGGER enforce_profiles_is_approved_immutable
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_is_approved_immutability();