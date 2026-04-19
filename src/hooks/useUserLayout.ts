import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

/**
 * Per-user dashboard section ordering, persisted to Supabase `user_layouts`.
 *
 * The returned `order` always contains the full set of `defaultOrder` ids:
 *   - saved ids (in saved order) first, filtered to those still in defaults
 *   - then any defaults not in saved order (so newly added sections appear at the end)
 */
export function useUserLayout(layoutKey: string, defaultOrder: string[]) {
  const { user } = useAuth();
  const [order, setOrderState] = useState<string[]>(defaultOrder);
  const [loading, setLoading] = useState(true);
  const [isEditing, setEditing] = useState(false);
  const hasSavedRef = useRef(false);
  const firstSaveToastShownRef = useRef(false);

  // Merge saved order with defaults to handle added/removed sections gracefully.
  const reconcile = useCallback((saved: string[] | null | undefined): string[] => {
    if (!saved || !Array.isArray(saved) || saved.length === 0) return defaultOrder;
    const allowed = new Set(defaultOrder);
    const seen = new Set<string>();
    const result: string[] = [];
    for (const id of saved) {
      if (allowed.has(id) && !seen.has(id)) {
        result.push(id);
        seen.add(id);
      }
    }
    for (const id of defaultOrder) {
      if (!seen.has(id)) result.push(id);
    }
    return result;
  }, [defaultOrder]);

  // Load saved layout on mount / user change.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) {
        setOrderState(defaultOrder);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('user_layouts')
        .select('section_order')
        .eq('user_id', user.id)
        .eq('layout_key', layoutKey)
        .maybeSingle();

      if (cancelled) return;

      if (!error && data?.section_order) {
        hasSavedRef.current = true;
        firstSaveToastShownRef.current = true;
        setOrderState(reconcile(data.section_order as string[]));
      } else {
        hasSavedRef.current = false;
        firstSaveToastShownRef.current = false;
        setOrderState(defaultOrder);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, layoutKey]);

  // Persist a new order. Optimistic update + upsert.
  const setOrder = useCallback(async (next: string[]) => {
    setOrderState(next);
    if (!user) return;
    const { error } = await supabase
      .from('user_layouts')
      .upsert(
        { user_id: user.id, layout_key: layoutKey, section_order: next },
        { onConflict: 'user_id,layout_key' }
      );
    if (error) {
      toast({ title: 'Could not save layout', description: error.message, variant: 'destructive' });
      return;
    }
    if (!firstSaveToastShownRef.current) {
      firstSaveToastShownRef.current = true;
      toast({ title: 'Layout saved', description: 'Your dashboard arrangement will be remembered.' });
    }
    hasSavedRef.current = true;
  }, [user, layoutKey]);

  const resetLayout = useCallback(async () => {
    setOrderState(defaultOrder);
    if (!user) return;
    const { error } = await supabase
      .from('user_layouts')
      .delete()
      .eq('user_id', user.id)
      .eq('layout_key', layoutKey);
    if (error) {
      toast({ title: 'Could not reset layout', description: error.message, variant: 'destructive' });
      return;
    }
    hasSavedRef.current = false;
    firstSaveToastShownRef.current = false;
    toast({ title: 'Layout reset', description: 'Default arrangement restored.' });
  }, [user, layoutKey, defaultOrder]);

  return { order, setOrder, resetLayout, loading, isEditing, setEditing, hasSaved: hasSavedRef.current };
}
