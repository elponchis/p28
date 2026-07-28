import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useProfileQuery, useSetNotificationsBadgeClearedAtMutation } from '@/hooks/useApiQueries';

const storageKey = (userId: string) => `@p28/in_app_notification_badge_cleared_at:${userId}`;

function maxIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a) > new Date(b) ? a : b;
}

/**
 * Persists when the user last focused the Notifications tab so the tab badge can
 * ignore older unread in-app rows (badge clears) while `read_at` stays null until
 * the user opens each notification. Syncs to `profiles.notifications_badge_cleared_at`
 * for server-side badge counts (push when app is killed).
 */
export function useInAppBadgeClearTimestamp(userId: string | undefined) {
  const [storageAt, setStorageAt] = useState<string | null>(null);
  const [storageHydrated, setStorageHydrated] = useState(false);
  const { mutate } = useSetNotificationsBadgeClearedAtMutation();
  const lastPushedMergedRef = useRef<string | null>(null);

  const { data: profile } = useProfileQuery(userId, { enabled: !!userId });
  const serverClearedAt = profile?.notificationsBadgeClearedAt ?? null;

  useEffect(() => {
    lastPushedMergedRef.current = null;
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setStorageAt(null);
      setStorageHydrated(true);
      return;
    }
    setStorageHydrated(false);
    setStorageAt(null);
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey(userId));
        if (!cancelled) {
          setStorageAt(raw);
        }
      } finally {
        if (!cancelled) {
          setStorageHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const badgeClearedAt = useMemo(() => {
    if (!storageHydrated) return null;
    return maxIso(storageAt, serverClearedAt);
  }, [storageHydrated, storageAt, serverClearedAt]);

  useEffect(() => {
    if (!userId || !storageHydrated || profile == null) return;
    const merged = maxIso(storageAt, serverClearedAt);
    if (!merged) return;

    if (merged !== storageAt) {
      void AsyncStorage.setItem(storageKey(userId), merged);
      setStorageAt(merged);
    }

    const serverBehind =
      serverClearedAt == null ||
      serverClearedAt === '' ||
      new Date(merged) > new Date(serverClearedAt);
    const shouldPush = serverBehind && lastPushedMergedRef.current !== merged;
    if (shouldPush) {
      lastPushedMergedRef.current = merged;
      mutate({ userId, clearedAtIso: merged });
    }
    if (serverClearedAt && merged === serverClearedAt) {
      lastPushedMergedRef.current = merged;
    }
  }, [userId, storageHydrated, storageAt, serverClearedAt, profile, mutate]);

  const recordNotificationsTabVisited = useCallback(async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    try {
      await AsyncStorage.setItem(storageKey(userId), now);
    } catch {
      // Still update in-memory so the badge reacts; persistence can retry next visit.
    }
    setStorageAt(now);
    lastPushedMergedRef.current = now;
    mutate({ userId, clearedAtIso: now });
  }, [userId, mutate]);

  return {
    badgeClearedAt,
    recordNotificationsTabVisited,
    hydrated: storageHydrated,
  };
}
