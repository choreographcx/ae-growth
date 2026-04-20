import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribes (read-only) to the shared "online-users" presence channel that
 * `useAuth` writes to whenever a user is signed in. Returns a Set of user_ids
 * currently online. Safe to call from any admin view.
 */
export function useOnlineUsers(): Set<string> {
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Each consumer creates its own channel instance with the shared topic
    // "online-users". Handlers are registered BEFORE subscribe() to avoid the
    // "cannot add presence callbacks after subscribe()" runtime error.
    const channel = supabase.channel(`online-users-reader-${Math.random().toString(36).slice(2)}`, {
      config: { presence: { key: 'observer' } },
    });

    const sync = () => {
      const state = channel.presenceState() as Record<string, Array<{ user_id?: string }>>;
      const ids = new Set<string>();
      Object.entries(state).forEach(([key, metas]) => {
        ids.add(key);
        metas.forEach(m => m.user_id && ids.add(m.user_id));
      });
      setOnline(ids);
    };

    channel
      .on('presence', { event: 'sync' }, sync)
      .on('presence', { event: 'join' }, sync)
      .on('presence', { event: 'leave' }, sync)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return online;
}
