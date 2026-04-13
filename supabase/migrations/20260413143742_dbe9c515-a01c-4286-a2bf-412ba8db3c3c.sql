
CREATE POLICY "Users can delete their own config"
ON public.client_configs
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete all configs"
ON public.client_configs
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
