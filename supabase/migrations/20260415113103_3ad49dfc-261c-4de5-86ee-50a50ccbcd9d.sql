-- Drop the existing permissive self-update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a security-definer helper to get current is_approved value
CREATE OR REPLACE FUNCTION public.get_profile_is_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_approved FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- Recreate the policy with a WITH CHECK that prevents self-modification of is_approved
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND is_approved = public.get_profile_is_approved(auth.uid())
  );