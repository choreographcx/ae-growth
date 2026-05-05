import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

export interface ClarityFilters {
  start: Date;
  end: Date;
  projects?: string[];
  subdomains?: string[];
  sourceType?: 'api' | 'dashboard_export' | null;
}

function nullish<T>(arr?: T[]) {
  return arr && arr.length > 0 ? arr : null;
}

export function useClarityFilterOptions(start: Date, end: Date) {
  return useQuery({
    queryKey: ['clarity', 'filters', fmt(start), fmt(end)],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_clarity_filters', {
        p_start: fmt(start),
        p_end: fmt(end),
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        projects: (row?.clarity_project_keys ?? []) as string[],
        subdomains: (row?.subdomains ?? []) as string[],
        sourceTypes: (row?.source_types ?? []) as string[],
      };
    },
  });
}

export function useClarityKpis(f: ClarityFilters) {
  return useQuery({
    queryKey: ['clarity', 'kpis', fmt(f.start), fmt(f.end), f.projects, f.subdomains, f.sourceType],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_clarity_kpis', {
        p_start: fmt(f.start),
        p_end: fmt(f.end),
        p_projects: nullish(f.projects),
        p_subdomains: nullish(f.subdomains),
        p_source_type: f.sourceType ?? null,
      });
      if (error) throw error;
      const map = new Map<string, number>();
      for (const r of (data ?? []) as Array<{ metric_name: string; metric_value: number }>) {
        map.set(r.metric_name, Number(r.metric_value) || 0);
      }
      return map;
    },
  });
}

export function useClarityTimeseries(f: ClarityFilters, metricNames: string[] = ['Traffic', 'Total sessions']) {
  return useQuery({
    queryKey: ['clarity', 'series', fmt(f.start), fmt(f.end), metricNames, f.projects, f.subdomains, f.sourceType],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_clarity_timeseries', {
        p_start: fmt(f.start),
        p_end: fmt(f.end),
        p_metric_names: metricNames,
        p_projects: nullish(f.projects),
        p_subdomains: nullish(f.subdomains),
        p_source_type: f.sourceType ?? null,
      });
      if (error) throw error;
      return (data ?? []) as Array<{ metric_date: string; metric_value: number }>;
    },
  });
}

export function useClarityBreakdown(f: ClarityFilters, metricName: string, limit = 25) {
  return useQuery({
    queryKey: ['clarity', 'breakdown', metricName, fmt(f.start), fmt(f.end), f.projects, f.subdomains, f.sourceType, limit],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_clarity_breakdown', {
        p_start: fmt(f.start),
        p_end: fmt(f.end),
        p_metric_name: metricName,
        p_projects: nullish(f.projects),
        p_subdomains: nullish(f.subdomains),
        p_source_type: f.sourceType ?? null,
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as Array<{ dimension_value: string; metric_value: number; metric_percentage: number }>;
    },
  });
}

/** Pick the first matching metric across known aliases. */
export function pickMetric(map: Map<string, number>, names: string[]): number {
  for (const n of names) {
    const v = map.get(n);
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
  }
  return 0;
}
