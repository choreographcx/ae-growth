-- Resolve overload ambiguity by dropping the 4-arg version of get_dashboard_daily.
-- The 5-arg version (with optional p_suppressed_conversions) is a superset and handles all callers.
DROP FUNCTION IF EXISTS public.get_dashboard_daily(date, date, text[], text[]);

-- Same fix for the conversion breakdown overload pair.
DROP FUNCTION IF EXISTS public.get_dashboard_conversion_breakdown(date, date, text[], text[]);