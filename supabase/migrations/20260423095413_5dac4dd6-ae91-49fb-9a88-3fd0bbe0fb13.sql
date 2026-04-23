-- Ensure one BigQuery source row per client so the admin UI can upsert by (client_id, source_type).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.client_data_sources'::regclass
      AND conname = 'client_data_sources_client_id_source_type_key'
  ) THEN
    ALTER TABLE public.client_data_sources
      ADD CONSTRAINT client_data_sources_client_id_source_type_key
      UNIQUE (client_id, source_type);
  END IF;
END$$;