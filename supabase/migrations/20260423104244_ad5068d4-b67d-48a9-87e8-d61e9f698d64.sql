ALTER TABLE public.client_data_sources
  DROP CONSTRAINT IF EXISTS client_data_sources_source_type_check;

ALTER TABLE public.client_data_sources
  ADD CONSTRAINT client_data_sources_source_type_check
  CHECK (source_type = ANY (ARRAY[
    'bigquery'::text,
    'google_ads'::text,
    'meta'::text,
    'ga4'::text,
    'tiktok'::text,
    'snapchat'::text,
    'linkedin'::text,
    'x'::text,
    'programmatic'::text,
    'youtube'::text,
    'search_ads_360'::text,
    'dv360'::text,
    'other'::text
  ]));