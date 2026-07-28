import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';

/**
 * App icon badge total (unread chats + pending friend requests + in-app unread).
 * Uses service-role client; RPC allows auth.uid() IS NULL.
 */
export async function getAppBadgeCountForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data, error } = await supabase.rpc('get_app_badge_count', { p_user_id: userId });
  if (error) {
    console.error('get_app_badge_count', userId, error);
    return 0;
  }
  if (typeof data === 'number' && Number.isFinite(data)) {
    return Math.max(0, data);
  }
  if (typeof data === 'string') {
    const n = parseInt(data, 10);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  return 0;
}
