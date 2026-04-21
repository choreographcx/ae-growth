-- Restore default privileges on client_reporting_settings.
-- Column-level REVOKE/GRANT broke writes because INSERT/UPDATE need full table
-- privileges and the upsert's RETURNING clause needs SELECT on the row.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_reporting_settings TO authenticated;

-- Drop the redundant admin SELECT policy we added (RLS still enforces row access).
DROP POLICY IF EXISTS "Admins can view all reporting settings columns"
  ON public.client_reporting_settings;

-- Drop the limited-cols policy and replace with the original broad one so reads work.
DROP POLICY IF EXISTS "Authenticated can view reporting settings (limited cols)"
  ON public.client_reporting_settings;

CREATE POLICY "Authenticated can view reporting settings"
  ON public.client_reporting_settings
  FOR SELECT
  TO authenticated
  USING (client_id = public.get_singleton_client_id());