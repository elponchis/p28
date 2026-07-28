import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useAppBadgeCountQuery } from '@/hooks/useApiQueries';

/**
 * Keeps the OS app icon badge in sync with `get_app_badge_count` while the app runs.
 * Push payloads set `badge` when the app is killed (see Edge Functions).
 */
export function useAppIconBadgeSync(userId: string | undefined): void {
  const { data, refetch, isSuccess } = useAppBadgeCountQuery(userId, { enabled: !!userId });
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active' && userId) {
        void refetch();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [userId, refetch]);

  useEffect(() => {
    const apply = async (n: number) => {
      try {
        await Notifications.setBadgeCountAsync(Math.max(0, n));
      } catch (e) {
        if (__DEV__) {
          console.warn('[useAppIconBadgeSync] setBadgeCountAsync failed', e);
        }
      }
    };

    if (!userId) {
      void apply(0);
      return;
    }
    if (!isSuccess || data === undefined) return;
    void apply(data);
  }, [userId, data, isSuccess]);
}
