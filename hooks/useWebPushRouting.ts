import { useEffect } from 'react';
import { Platform } from 'react-native';
import type { Href } from 'expo-router';

import type { NotificationRouterLike } from '@/lib/push';

/**
 * Clicking a browser notification should open the thing it is about.
 *
 * The service worker cannot navigate the page itself; all it can do is focus a tab and post it a
 * message. Nothing was listening, so a click focused the app and left the reader wherever they
 * were — which reads as a notification that does nothing.
 *
 * Off the web this hook does nothing: Expo's own response listener handles native taps.
 */
export function useWebPushRouting(router: NotificationRouterLike): void {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | undefined;
      if (data?.type !== 'notification-click') return;
      if (typeof data.url !== 'string' || !data.url.startsWith('/')) return;
      router.push(data.url as Href);
    };

    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [router]);
}
