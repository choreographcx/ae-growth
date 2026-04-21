import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export interface Ga4ReportRequest {
  /** Optional override; otherwise resolved server-side from client_reporting_settings. */
  propertyId?: string;
  startDate: Date;
  endDate: Date;
  dimensions?: string[];
  metrics?: string[];
  limit?: number;
  orderBys?: Array<{ metric?: string; dimension?: string; desc?: boolean }>;
  /** Disable the query entirely (e.g. when no GA4 property is configured). */
  enabled?: boolean;
}

export interface Ga4Row {
  dimensions: string[];
  metrics: number[];
}

export interface Ga4ReportResult {
  dimensionHeaders: string[];
  metricHeaders: string[];
  rows: Ga4Row[];
  totals: number[];
  rowCount: number;
}

function fmt(d: Date) { return format(d, 'yyyy-MM-dd'); }

function parseResponse(json: any): Ga4ReportResult {
  const dimensionHeaders = (json?.dimensionHeaders ?? []).map((h: any) => h.name);
  const metricHeaders = (json?.metricHeaders ?? []).map((h: any) => h.name);
  const rows: Ga4Row[] = (json?.rows ?? []).map((r: any) => ({
    dimensions: (r.dimensionValues ?? []).map((v: any) => v.value ?? ''),
    metrics: (r.metricValues ?? []).map((v: any) => Number(v.value ?? 0)),
  }));
  const totals: number[] = (json?.totals?.[0]?.metricValues ?? []).map((v: any) => Number(v.value ?? 0));
  return { dimensionHeaders, metricHeaders, rows, totals, rowCount: json?.rowCount ?? rows.length };
}

export function useGa4Report(req: Ga4ReportRequest) {
  const key = useMemo(() => [
    'ga4-report',
    req.propertyId ?? 'default',
    fmt(req.startDate), fmt(req.endDate),
    (req.dimensions ?? ['date']).join(','),
    (req.metrics ?? []).join(','),
    req.limit ?? 10000,
    JSON.stringify(req.orderBys ?? []),
  ], [req]);

  return useQuery<Ga4ReportResult>({
    queryKey: key,
    enabled: req.enabled !== false,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ga4-report', {
        body: {
          propertyId: req.propertyId,
          startDate: fmt(req.startDate),
          endDate: fmt(req.endDate),
          dimensions: req.dimensions,
          metrics: req.metrics,
          limit: req.limit,
          orderBys: req.orderBys,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return parseResponse(data);
    },
  });
}
