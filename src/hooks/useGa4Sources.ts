import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Ga4Source {
  id: string;
  property_id: string;
  label: string;
  is_enabled: boolean;
  created_at: string;
}

/**
 * Manages the list of GA4 properties stored as rows in `client_data_sources`
 * (source_type = 'ga4'). The dashboard's GA4 page and edge function aggregate
 * across every enabled source, so admins can add 1..N properties.
 */
export function useGa4Sources() {
  const [sources, setSources] = useState<Ga4Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('list_ga4_sources');
    if (error) {
      toast.error(`Failed to load GA4 properties: ${error.message}`);
      setSources([]);
    } else {
      setSources((data ?? []) as Ga4Source[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addSource = useCallback(async (propertyId: string, label: string) => {
    const trimmedId = propertyId.trim();
    const trimmedLabel = label.trim();
    if (!/^\d+$/.test(trimmedId)) {
      toast.error('GA4 Property ID must be numeric (e.g. 123456789)');
      return false;
    }
    setSaving(true);
    const { data: clientRow, error: clientErr } = await supabase
      .rpc('get_singleton_client_id');
    if (clientErr || !clientRow) {
      toast.error('Could not resolve client');
      setSaving(false);
      return false;
    }
    const { error } = await supabase.from('client_data_sources').insert({
      client_id: clientRow as string,
      source_type: 'ga4',
      ga4_property_id: trimmedId,
      additional_config: { label: trimmedLabel },
      is_enabled: true,
    });
    setSaving(false);
    if (error) {
      toast.error(`Could not add GA4 property: ${error.message}`);
      return false;
    }
    toast.success('GA4 property added');
    await refresh();
    return true;
  }, [refresh]);

  const updateSource = useCallback(async (
    id: string,
    patch: { property_id?: string; label?: string; is_enabled?: boolean },
  ) => {
    setSaving(true);
    const updates: Record<string, unknown> = {};
    if (patch.property_id !== undefined) {
      const trimmed = patch.property_id.trim();
      if (!/^\d+$/.test(trimmed)) {
        toast.error('GA4 Property ID must be numeric');
        setSaving(false);
        return false;
      }
      updates.ga4_property_id = trimmed;
    }
    if (patch.is_enabled !== undefined) updates.is_enabled = patch.is_enabled;
    if (patch.label !== undefined) {
      // Read existing additional_config to merge label
      const existing = sources.find((s) => s.id === id);
      updates.additional_config = { ...(existing ? { label: existing.label } : {}), label: patch.label };
    }
    const { error } = await supabase.from('client_data_sources').update(updates).eq('id', id);
    setSaving(false);
    if (error) {
      toast.error(`Could not update GA4 property: ${error.message}`);
      return false;
    }
    await refresh();
    return true;
  }, [refresh, sources]);

  const removeSource = useCallback(async (id: string) => {
    setSaving(true);
    const { error } = await supabase.from('client_data_sources').delete().eq('id', id);
    setSaving(false);
    if (error) {
      toast.error(`Could not remove GA4 property: ${error.message}`);
      return false;
    }
    toast.success('GA4 property removed');
    await refresh();
    return true;
  }, [refresh]);

  return { sources, loading, saving, addSource, updateSource, removeSource, refresh };
}
