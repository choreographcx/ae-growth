import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function DebugSnapchat() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    (async () => {
      const r = await (supabase.rpc as any)('debug_snapchat_reach', { p_start: '2026-03-01', p_end: '2026-04-21' });
      setData(r);
    })();
  }, []);
  return <pre style={{ padding: 16, fontSize: 11, whiteSpace: 'pre-wrap' }}>{JSON.stringify(data, null, 2)}</pre>;
}
