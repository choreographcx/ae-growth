// Temporary diagnostic to inspect Google Ads conversion event names in BQ source
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey);

  const u = new URL(req.url);
  const start = u.searchParams.get('start') ?? '2026-03-22';
  const end = u.searchParams.get('end') ?? '2026-04-21';

  const { data, error } = await admin.rpc('diag_conv_events', {
    p_start: start,
    p_end: end,
  });

  return new Response(JSON.stringify({ start, end, error, count: data?.length ?? 0, data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
