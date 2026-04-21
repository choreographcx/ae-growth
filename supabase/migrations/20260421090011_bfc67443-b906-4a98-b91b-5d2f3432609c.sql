UPDATE public.client_reporting_settings
SET ga4_property_id = '421118129',
    updated_at = now()
WHERE client_id = (SELECT id FROM public.clients WHERE is_singleton = true);