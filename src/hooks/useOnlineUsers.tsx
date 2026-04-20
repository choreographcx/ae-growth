import { useAuth } from '@/hooks/useAuth';

/**
 * Read online users from the single shared presence subscription owned by
 * AuthProvider. This avoids duplicate subscriptions to the same realtime topic.
 */
export function useOnlineUsers(): Set<string> {
  return useAuth().onlineUserIds;
}
