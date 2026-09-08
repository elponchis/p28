import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { queryKeys } from '@/lib/api/queryKeys';

/**
 * Keeps the bell current while the app is open.
 *
 * Both notification queries were fetched once and never refreshed: nothing polled them and the
 * table was not published for realtime, so a notification arriving while someone sat on the home
 * screen showed up only after the next navigation or reload. A bell that lights up a page later
 * is a bell that does not work.
 *
 * The subscription is per user, and row level security decides what it delivers, so this hears
 * about its own notifications and nothing else.
 */
export function useInAppNotificationsRealtime(userId: string | undefined): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const channelId = `notifications:user:${userId}`;

    void api.realtime.subscribe(channelId, {
      onMessage: () => {
        // Everything that counts or lists notifications, plus the icon badge that sums them.
        // The unread count is keyed by the badge-cleared timestamp as well as the user, hence the
        // prefix key rather than an exact one.
        void queryClient.invalidateQueries({ queryKey: queryKeys.inAppNotifications(userId) });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.inAppUnreadNotificationCountRoot(userId),
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.appBadgeCount(userId) });
      },
    });

    return () => {
      void api.realtime.unsubscribe(channelId);
    };
  }, [userId, queryClient]);
}
