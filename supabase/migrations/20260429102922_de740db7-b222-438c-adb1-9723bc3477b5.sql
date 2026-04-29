-- Drop old single-row-per-source-type uniqueness
ALTER TABLE public.client_data_sources
  DROP CONSTRAINT IF EXISTS client_data_sources_client_id_source_type_key;
DROP INDEX IF EXISTS public.client_data_sources_client_source_unique;
DROP INDEX IF EXISTS public.client_data_sources_client_id_source_type_key;

-- For GA4: unique per (client_id, ga4_property_id)
CREATE UNIQUE INDEX client_data_sources_client_ga4_property_unique
  ON public.client_data_sources (client_id, ga4_property_id)
  WHERE source_type = 'ga4' AND ga4_property_id IS NOT NULL;

-- For all other source types: keep one row per (client_id, source_type)
CREATE UNIQUE INDEX client_data_sources_client_source_non_ga4_unique
  ON public.client_data_sources (client_id, source_type)
  WHERE source_type <> 'ga4';
