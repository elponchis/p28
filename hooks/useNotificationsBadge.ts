import {
  useInAppUnreadNotificationCountQuery,
  usePendingFriendRequestCountQuery,
} from '@/hooks/useApiQueries';
import { useInAppBadgeClearTimestamp } from '@/hooks/useInAppBadgeClearTimestamp';

/**
 * How many things are waiting on the notifications screen: friend requests plus unread in-app
 * rows newer than the last time the tab was opened.
 *
 * Two places show this number now — the header bell on a phone and the sidebar entry on desktop —
 * and a count that disagreed between them would be worse than no count at all.
 */
export function useNotificationsBadge(userId: string | undefined): number | undefined {
  const { data: pendingCount } = usePendingFriendRequestCountQuery(userId);
  const { badgeClearedAt, hydrated } = useInAppBadgeClearTimestamp(userId);
  const { data: inAppUnread = 0 } = useInAppUnreadNotificationCountQuery(userId, badgeClearedAt, {
    enabled: !!userId && hydrated,
  });

  const total = (pendingCount ?? 0) + inAppUnread;
  return total > 0 ? total : undefined;
}
