-- 1. Attach the existing enforce_is_approved_immutability function as a trigger
-- on the profiles table so non-superadmins cannot self-approve.
DROP TRIGGER IF EXISTS enforce_is_approved_immutability_trigger ON public.profiles;

CREATE TRIGGER enforce_is_approved_immutability_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_is_approved_immutability();

-- 2. Tighten the singleton client SELECT policy to require approval
-- (matching the pattern used by other client_* tables).
DROP POLICY IF EXISTS "Authenticated can view singleton client" ON public.clients;

CREATE POLICY "Approved users can view singleton client"
ON public.clients
FOR SELECT
TO authenticated
USING (
  is_singleton = true
  AND (
    public.get_profile_is_approved(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  )
);