-- Per-user dashboard layout preferences
CREATE TABLE public.user_layouts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  layout_key text NOT NULL,
  section_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, layout_key)
);

ALTER TABLE public.user_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own layouts"
  ON public.user_layouts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own layouts"
  ON public.user_layouts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own layouts"
  ON public.user_layouts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own layouts"
  ON public.user_layouts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_layouts_updated_at
  BEFORE UPDATE ON public.user_layouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_user_layouts_user_key ON public.user_layouts (user_id, layout_key);