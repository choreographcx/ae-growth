-- 1) Grant superadmin role to the designated user (idempotent)
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'superadmin'::public.app_role
FROM public.profiles p
WHERE p.email = 'rachel.montague@wppmedia.com'
ON CONFLICT DO NOTHING;

-- 2) Update handle_new_user so future signups by that email also get superadmin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  IF _email = 'rachel.montague@wppmedia.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'superadmin');
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  _slug := regexp_replace(lower(_email), '[^a-z0-9]+', '-', 'g')
           || '-' || substr(NEW.id::text, 1, 8);

  INSERT INTO public.clients (owner_user_id, name, slug, status, currency, timezone)
  VALUES (NEW.id, _name, _slug, 'active', 'USD', 'Asia/Dubai')
  ON CONFLICT (owner_user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 3) Tighten profiles RLS: only superadmin can update/delete arbitrary profiles
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete all profiles" ON public.profiles;

CREATE POLICY "Superadmins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'::public.app_role));

CREATE POLICY "Superadmins can delete all profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::public.app_role));

-- 4) Tighten user_roles RLS: only superadmin can write roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can write roles" ON public.user_roles;

CREATE POLICY "Superadmins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'superadmin'::public.app_role));

CREATE POLICY "Superadmins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'::public.app_role));

CREATE POLICY "Superadmins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::public.app_role));