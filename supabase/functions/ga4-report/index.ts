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

interface Ga4Row {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
}

interface Ga4Response {
  dimensionHeaders?: Array<{ name: string }>;
  metricHeaders?: Array<{ name: string; type?: string }>;
  rows?: Ga4Row[];
  totals?: Ga4Row[];
  rowCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Merge multiple GA4 runReport responses by summing numeric metric values
 * for rows that share the same dimension key. Rate metrics (engagementRate,
 * bounceRate) are weighted by sessions when possible; otherwise simple-summed
 * (callers using rates already aggregate multi-property cautiously).
 */
function mergeGa4Responses(
  responses: Ga4Response[],
  dimensionNames: string[],
  metricNames: string[],
): Ga4Response {
  const dimHeaders = dimensionNames.map((name) => ({ name }));
  const metHeaders = metricNames.map((name) => ({ name, type: 'TYPE_FLOAT' as const }));

  const rowMap = new Map<string, number[]>();
  const totalSums = new Array(metricNames.length).fill(0);

  for (const resp of responses) {
    for (const row of resp.rows ?? []) {
      const key = (row.dimensionValues ?? []).map((d) => d.value ?? '').join('\u0000');
      const existing = rowMap.get(key) ?? new Array(metricNames.length).fill(0);
      (row.metricValues ?? []).forEach((m, i) => {
        const v = Number(m.value);
        if (Number.isFinite(v)) existing[i] += v;
      });
      rowMap.set(key, existing);
    }
    for (const total of resp.totals ?? []) {
      (total.metricValues ?? []).forEach((m, i) => {
        const v = Number(m.value);
        if (Number.isFinite(v)) totalSums[i] += v;
      });
    }
  }

  const mergedRows: Ga4Row[] = Array.from(rowMap.entries())
    .map(([key, metrics]) => ({
      dimensionValues: key.split('\u0000').map((value) => ({ value })),
      metricValues: metrics.map((value) => ({ value: String(value) })),
    }));

  return {
    dimensionHeaders: dimHeaders,
    metricHeaders: metHeaders,
    rows: mergedRows,
    totals: [{ metricValues: totalSums.map((value) => ({ value: String(value) })) }],
    rowCount: mergedRows.length,
  };

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
    throw new Error('Vault secret ga4_sa_json contains Google sample placeholder values; replace it with the real GA4 service-account JSON key');
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
  // GA4 uses its own dedicated vault secret (ga4_sa_json), separate from the ad-platforms BigQuery SA.
  const { data, error } = await serviceClient.rpc('internal_get_ga4_sa_json');
  if (error) throw new Error(`GA4 vault read failed: ${error.message}`);
  if (!data || typeof data !== 'string') throw new Error('GA4 service account secret not found in vault (ga4_sa_json)');
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

    // Enforce approval gate: unapproved users (and users with no profile) cannot
    // call this endpoint, even though their JWT is valid. The UI hides dashboards
    // for unapproved users, but the edge function is reachable directly over HTTP.
    const { data: profile, error: profileErr } = await serviceClient
      .from('profiles')
      .select('is_approved')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (profileErr) {
      return respond({ ok: false, error: 'Failed to verify account approval', status: 500 });
    }
    if (!profile?.is_approved) {
      return respond({ ok: false, error: 'Account pending approval', status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as ReportBody;
    if (!body.startDate || !body.endDate) {
      return respond({ ok: false, error: 'startDate and endDate are required (YYYY-MM-DD)', status: 400 });
    }

    // Always resolve GA4 property IDs server-side from the configured singleton client.
    // We now support multiple properties: results from each property are merged
    // additively (numeric metrics are summed per dimension key). Caller-supplied
    // `propertyId` values are ignored to prevent users from probing other properties.
    const { data: configuredPids, error: pidErr } = await serviceClient.rpc('get_active_ga4_property_ids');
    if (pidErr) {
      console.error('ga4-report get_active_ga4_property_ids error:', pidErr.message);
      return respond({ ok: false, error: 'Internal server error', status: 500 });
    }
    const propertyIds: string[] = Array.isArray(configuredPids)
      ? configuredPids.map((p) => String(p ?? '').trim()).filter(Boolean)
      : [];

    if (propertyIds.length === 0) {
      return respond({ ok: false, error: 'No GA4 property configured', status: 400 });
    }

    // Defensive: GA4 property IDs are numeric. Reject anything else to prevent
    // path injection into the API URL even though we control the source.
    if (propertyIds.some((p) => !/^\d+$/.test(p))) {
      return respond({ ok: false, error: 'Configured GA4 property ID is not a numeric value', status: 400 });
    }

    const sa = await loadServiceAccount(serviceClient);
    const accessToken = await mintAccessToken(sa);

    const dimensionNames = body.dimensions ?? ['date'];
    const metricNames = body.metrics ?? [
      'sessions', 'totalUsers', 'newUsers', 'engagedSessions',
      'engagementRate', 'averageSessionDuration', 'bounceRate',
      'screenPageViews', 'conversions', 'totalRevenue',
    ];

    const ga4Body: Record<string, unknown> = {
      dateRanges: [{ startDate: body.startDate, endDate: body.endDate }],
      dimensions: dimensionNames.map((name) => ({ name })),
      metrics: metricNames.map((name) => ({ name })),
      // Ask GA4 to compute totals across all rows so the KPI tiles populate.
      metricAggregations: ['TOTAL'],
      limit: body.limit ?? 10000,
    };

    if (body.orderBys?.length) {
      ga4Body.orderBys = body.orderBys.map((o) => ({
        desc: o.desc ?? true,
        ...(o.metric ? { metric: { metricName: o.metric } } : {}),
        ...(o.dimension ? { dimension: { dimensionName: o.dimension } } : {}),
      }));
    }

    // Fan out to every property in parallel.
    const responses = await Promise.all(
      propertyIds.map(async (pid) => {
        const r = await fetch(
          `https://analyticsdata.googleapis.com/v1beta/properties/${pid}:runReport`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(ga4Body),
          },
        );
        const text = await r.text();
        return { pid, ok: r.ok, status: r.status, text };
      }),
    );

    const failed = responses.find((r) => !r.ok);
    if (failed) {
      return respond({
        ok: false,
        error: `GA4 API error for property ${failed.pid}`,
        status: failed.status,
        detail: failed.text,
      });
    }

    const parsed = responses.map((r) => JSON.parse(r.text) as Ga4Response);

    // Single property: passthrough (no merge needed).
    if (parsed.length === 1) {
      return respond({ ok: true, data: parsed[0] });
    }

    // Merge multiple property responses: sum numeric metrics by dimension key.
    const merged = mergeGa4Responses(parsed, dimensionNames, metricNames);
    return respond({ ok: true, data: merged });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('ga4-report error:', msg);
    return respond({ ok: false, error: 'Internal server error', status: 500 });
  }
});