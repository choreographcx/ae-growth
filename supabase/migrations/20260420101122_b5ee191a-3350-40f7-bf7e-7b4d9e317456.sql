-- Public-readable branding row used by the login/auth screen.
-- Single-row table by convention (id = 'singleton').
CREATE TABLE IF NOT EXISTS public.public_branding (
  id text PRIMARY KEY DEFAULT 'singleton',
  client_name text,
  logo_url text,
  favicon_url text,
  primary_hex text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.public_branding ENABLE ROW LEVEL SECURITY;

-- Public can read (anonymous + authenticated)
CREATE POLICY "Anyone can view public branding"
  ON public.public_branding
  FOR SELECT
  USING (true);

-- Only admins can write
CREATE POLICY "Admins can insert public branding"
  ON public.public_branding
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update public branding"
  ON public.public_branding
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete public branding"
  ON public.public_branding
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Seed singleton row
INSERT INTO public.public_branding (id) VALUES ('singleton')
ON CONFLICT (id) DO NOTHING;

-- Auto-update updated_at
CREATE TRIGGER public_branding_set_updated_at
  BEFORE UPDATE ON public.public_branding
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();