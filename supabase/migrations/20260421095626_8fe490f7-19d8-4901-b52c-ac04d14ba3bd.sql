-- 1) Replace INSERT policy: superadmins can insert any role EXCEPT 'superadmin'.
DROP POLICY IF EXISTS "Superadmins can insert roles" ON public.user_roles;

CREATE POLICY "Superadmins can insert non-superadmin roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'superadmin'::public.app_role)
    AND role <> 'superadmin'::public.app_role
  );

-- 2) Replace UPDATE policy: superadmins can change roles, but not TO 'superadmin'.
DROP POLICY IF EXISTS "Superadmins can update roles" ON public.user_roles;

CREATE POLICY "Superadmins can update non-superadmin roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin'::public.app_role)
    AND role <> 'superadmin'::public.app_role
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'superadmin'::public.app_role)
    AND role <> 'superadmin'::public.app_role
  );

-- 3) Replace DELETE policy: superadmins cannot delete a 'superadmin' row via the API.
DROP POLICY IF EXISTS "Superadmins can delete roles" ON public.user_roles;

CREATE POLICY "Superadmins can delete non-superadmin roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin'::public.app_role)
    AND role <> 'superadmin'::public.app_role
  );

-- 4) Internal helper for promoting/demoting superadmins. Not exposed to anon/authenticated:
--    must be called from server-side (service_role) or another SECURITY DEFINER function.
CREATE OR REPLACE FUNCTION public.internal_grant_superadmin(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _target_user_id IS NULL THEN
    RAISE EXCEPTION 'target user id required';
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user_id, 'superadmin')
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.internal_revoke_superadmin(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _target_user_id IS NULL THEN
    RAISE EXCEPTION 'target user id required';
  END IF;
  DELETE FROM public.user_roles
   WHERE user_id = _target_user_id
     AND role = 'superadmin';
END;
$$;

-- Lock down execute privileges on the internal helpers.
REVOKE ALL ON FUNCTION public.internal_grant_superadmin(uuid)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.internal_grant_superadmin(uuid)  FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.internal_revoke_superadmin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.internal_revoke_superadmin(uuid) FROM anon, authenticated;