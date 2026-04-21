// GA4 Data API proxy edge function.
// Pulls a service account JSON from the Supabase vault (via an admin-only RPC),
// mints a short-lived OAuth access token, and runs reports against the GA4
// Data API for the property configured on the active client.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

// Cache the service account + token between invocations of the same isolate.
let cachedSA: ServiceAccount | null = null;
let cachedToken: { token: string; expiresAt: number } | null = null;

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function base64UrlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function mintAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.token;

  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)),
  );
  const jwt = `${unsigned}.${base64UrlEncode(sig)}`;

  const tokenResp = await fetch(claim.aud, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!tokenResp.ok) {
    throw new Error(`Token exchange failed: ${tokenResp.status} ${await tokenResp.text()}`);
  }
  const json = await tokenResp.json();
  cachedToken = { token: json.access_token, expiresAt: now + (json.expires_in ?? 3600) };
  return cachedToken.token;
}

async function loadServiceAccount(authedClient: ReturnType<typeof createClient>): Promise<ServiceAccount> {
  if (cachedSA) return cachedSA;
  const { data, error } = await authedClient.rpc('get_google_service_account_json');
  if (error) throw new Error(`Vault read failed: ${error.message}`);
  if (!data || typeof data !== 'string') throw new Error('Vault returned empty service account');
  const parsed = JSON.parse(data) as ServiceAccount;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('Service account JSON missing client_email/private_key');
  }
  cachedSA = parsed;
  return parsed;
}

interface ReportBody {
  propertyId?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  dimensions?: string[];
  metrics?: string[];
  limit?: number;
  orderBys?: Array<{ metric?: string; dimension?: string; desc?: boolean }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supaUrl = Deno.env.get('SUPABASE_URL')!;
    const supaAnon = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supaUrl, supaAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json().catch(() => ({}))) as ReportBody;
    if (!body.startDate || !body.endDate) {
      return new Response(JSON.stringify({ error: 'startDate and endDate are required (YYYY-MM-DD)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve the GA4 property id: explicit override or active client setting.
    let propertyId = body.propertyId;
    if (!propertyId) {
      const { data: settings } = await userClient
        .from('client_reporting_settings')
        .select('ga4_property_id')
        .limit(1)
        .maybeSingle();
      propertyId = settings?.ga4_property_id ?? undefined;
    }
    if (!propertyId) {
      return new Response(JSON.stringify({ error: 'No GA4 property configured' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sa = await loadServiceAccount(userClient);
    const accessToken = await mintAccessToken(sa);

    const ga4Body: Record<string, unknown> = {
      dateRanges: [{ startDate: body.startDate, endDate: body.endDate }],
      dimensions: (body.dimensions ?? ['date']).map((name) => ({ name })),
      metrics: (body.metrics ?? [
        'sessions', 'totalUsers', 'newUsers', 'engagedSessions',
        'engagementRate', 'averageSessionDuration', 'bounceRate',
        'screenPageViews', 'conversions', 'totalRevenue',
      ]).map((name) => ({ name })),
      limit: body.limit ?? 10000,
    };
    if (body.orderBys?.length) {
      ga4Body.orderBys = body.orderBys.map((o) => ({
        desc: o.desc ?? true,
        ...(o.metric ? { metric: { metricName: o.metric } } : {}),
        ...(o.dimension ? { dimension: { dimensionName: o.dimension } } : {}),
      }));
    }

    const ga4Resp = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ga4Body),
      },
    );
    const text = await ga4Resp.text();
    if (!ga4Resp.ok) {
      return new Response(JSON.stringify({ error: 'GA4 API error', status: ga4Resp.status, detail: text }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(text, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('ga4-report error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
