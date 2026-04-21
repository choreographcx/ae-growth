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

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
  detail?: string;
}

interface ReportBody {
  propertyId?: string;
  startDate: string;
  endDate: string;
  dimensions?: string[];
  metrics?: string[];
  limit?: number;
  orderBys?: Array<{ metric?: string; dimension?: string; desc?: boolean }>;
}

const rsaImportAlgorithm: RsaHashedImportParams = {
  name: 'RSASSA-PKCS1-v1_5',
  hash: 'SHA-256',
};

// Cache the service account + token between invocations of the same isolate.
let cachedSA: ServiceAccount | null = null;
let cachedToken: { token: string; expiresAt: number } | null = null;

function respond<T>(payload: ApiResponse<T>): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function derLength(length: number): Uint8Array {
  if (length < 128) return Uint8Array.of(length);
  const bytes: number[] = [];
  let remaining = length;
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }
  return Uint8Array.of(0x80 | bytes.length, ...bytes);
}

function wrapPkcs1InPkcs8(pkcs1: Uint8Array): Uint8Array {
  const version = Uint8Array.of(0x02, 0x01, 0x00);
  const rsaAlgorithmIdentifier = Uint8Array.of(
    0x30, 0x0d,
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
    0x05, 0x00,
  );
  const privateKeyOctetString = concatBytes(Uint8Array.of(0x04), derLength(pkcs1.length), pkcs1);
  const body = concatBytes(version, rsaAlgorithmIdentifier, privateKeyOctetString);
  return concatBytes(Uint8Array.of(0x30), derLength(body.length), body);
}

function normalizePem(pem: string): string {
  return pem
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/^"+|"+$/g, '')
    .trim();
}

function pemToBytes(pem: string): Uint8Array {
  const normalized = normalizePem(pem);
  const b64 = normalized
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/[^A-Za-z0-9+/=]/g, '');

  if (!b64) throw new Error('PEM body empty after stripping headers');

  try {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch (e) {
    throw new Error(`PEM decode failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const normalized = normalizePem(pem);
  const rawBytes = pemToBytes(normalized);
  const prefersPkcs1 = /BEGIN RSA PRIVATE KEY/.test(normalized);
  const attempts: Array<{ label: string; bytes: Uint8Array }> = prefersPkcs1
    ? [
        { label: 'pkcs1-wrapped-as-pkcs8', bytes: wrapPkcs1InPkcs8(rawBytes) },
        { label: 'pkcs8-direct', bytes: rawBytes },
      ]
    : [
        { label: 'pkcs8-direct', bytes: rawBytes },
        { label: 'pkcs1-wrapped-as-pkcs8', bytes: wrapPkcs1InPkcs8(rawBytes) },
      ];

  const errors: string[] = [];
  for (const attempt of attempts) {
    try {
      return await crypto.subtle.importKey(
        'pkcs8',
        toArrayBuffer(attempt.bytes),
        rsaImportAlgorithm,
        false,
        ['sign'],
      );
    } catch (e) {
      errors.push(`${attempt.label}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  throw new Error(`Private key import failed (${errors.join(' | ')})`);
}

function parseServiceAccount(raw: string): ServiceAccount {
  let parsed: unknown = raw;

  for (let i = 0; i < 2 && typeof parsed === 'string'; i++) {
    const trimmed = parsed.trim();
    if (!trimmed) break;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      break;
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Vault secret is not valid service-account JSON');
  }

  const record = parsed as Record<string, unknown>;
  const client_email = typeof record.client_email === 'string' ? record.client_email : '';
  const private_key = typeof record.private_key === 'string' ? record.private_key : '';
  const token_uri = typeof record.token_uri === 'string' ? record.token_uri : undefined;

  const looksLikePlaceholder = [
    typeof record.project_id === 'string' ? record.project_id : '',
    typeof record.private_key_id === 'string' ? record.private_key_id : '',
    client_email,
    private_key,
    typeof record.client_id === 'string' ? record.client_id : '',
    typeof record.client_x509_cert_url === 'string' ? record.client_x509_cert_url : '',
  ].some((value) => value.includes('YOUR_'));

  if (looksLikePlaceholder) {
    throw new Error('Vault secret bigquery_sa_json contains Google sample placeholder values; replace it with the real service-account JSON key');
  }

  if (!client_email || !private_key) {
    throw new Error('Service account JSON missing client_email/private_key');
  }

  return { client_email, private_key, token_uri };
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
  const key = await importPrivateKey(sa.private_key);
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

function base64UrlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function loadServiceAccount(serviceClient: ReturnType<typeof createClient>): Promise<ServiceAccount> {
  if (cachedSA) return cachedSA;
  const { data, error } = await serviceClient.rpc('internal_get_google_sa_json');
  if (error) throw new Error(`Vault read failed: ${error.message}`);
  if (!data || typeof data !== 'string') throw new Error('Service account secret not found in vault');
  cachedSA = parseServiceAccount(data);
  return cachedSA;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return respond({ ok: false, error: 'Missing Authorization header', status: 401 });
    }

    const supaUrl = Deno.env.get('SUPABASE_URL')!;
    const supaAnon = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!;
    const supaService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(supaUrl, supaAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supaUrl, supaService);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return respond({ ok: false, error: 'Not authenticated', status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as ReportBody;
    if (!body.startDate || !body.endDate) {
      return respond({ ok: false, error: 'startDate and endDate are required (YYYY-MM-DD)', status: 400 });
    }

    // Always resolve the GA4 property ID server-side from the configured
    // singleton client. Caller-supplied `propertyId` values are ignored to
    // prevent users from probing other GA4 properties the SA can access.
    const { data: configuredPid, error: pidErr } = await serviceClient.rpc('get_active_ga4_property_id');
    if (pidErr) {
      return respond({ ok: false, error: `Failed to load GA4 property: ${pidErr.message}`, status: 500 });
    }
    const propertyId = typeof configuredPid === 'string' ? configuredPid.trim() : '';

    if (!propertyId) {
      return respond({ ok: false, error: 'No GA4 property configured', status: 400 });
    }

    // Defensive: GA4 property IDs are numeric. Reject anything else to prevent
    // path injection into the API URL even though we control the source.
    if (!/^\d+$/.test(propertyId)) {
      return respond({ ok: false, error: 'Configured GA4 property ID is not a numeric value', status: 400 });
    }

    const sa = await loadServiceAccount(serviceClient);
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
      return respond({ ok: false, error: 'GA4 API error', status: ga4Resp.status, detail: text });
    }

    return respond({ ok: true, data: JSON.parse(text) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('ga4-report error:', msg);
    return respond({ ok: false, error: msg, status: 500 });
  }
});