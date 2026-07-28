import { useEffect } from 'react';

import {
  type NotificationRouterLike,
  handleInitialNotificationResponse,
  registerForPushNotificationsAsync,
  subscribeToNotificationResponses,
} from '@/lib/push';

/**
 * Registers for Expo push when `userId` is set, and wires notification tap → router (cold start + foreground).
 */
export function useExpoPushRouting(options: {
  userId: string | undefined;
  router: NotificationRouterLike;
}): void {
  const { userId, router } = options;

  useEffect(() => {
    if (!userId) return;
    void registerForPushNotificationsAsync(userId);
  }, [userId]);

  useEffect(() => {
    void handleInitialNotificationResponse(router);
    const sub = subscribeToNotificationResponses(router);
    return () => sub.remove();
  }, [router]);
}
