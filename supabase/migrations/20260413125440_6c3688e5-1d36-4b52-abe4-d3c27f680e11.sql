
CREATE TABLE public.client_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Only one config per user
CREATE UNIQUE INDEX idx_client_configs_user_id ON public.client_configs (user_id);

ALTER TABLE public.client_configs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own config
CREATE POLICY "Users can view their own config"
ON public.client_configs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Authenticated users can insert their own config
CREATE POLICY "Users can insert their own config"
ON public.client_configs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update their own config
CREATE POLICY "Users can update their own config"
ON public.client_configs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all configs
CREATE POLICY "Admins can view all configs"
ON public.client_configs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all configs
CREATE POLICY "Admins can update all configs"
ON public.client_configs FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert configs
CREATE POLICY "Admins can insert configs"
ON public.client_configs FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update timestamp
CREATE TRIGGER update_client_configs_updated_at
BEFORE UPDATE ON public.client_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
