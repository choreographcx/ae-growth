-- Add USD→SAR and USD→AED conversion rates to the singleton client.
-- Stored as numeric so 0 disables conversion (treated as identity = no display).
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS usd_to_sar_rate numeric NOT NULL DEFAULT 3.75,
  ADD COLUMN IF NOT EXISTS usd_to_aed_rate numeric NOT NULL DEFAULT 3.67;
