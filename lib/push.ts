/**
 * Expo push registration and notification response handling (announcements, group events).
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { api, isApiError } from '@/lib/api';

/** EAS / app.json extra; also populated in some dev manifests via expo-updates shape. */
function getEasProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  const fromExtra = extra?.eas?.projectId;
  const fromEasConfig = Constants.easConfig?.projectId;
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  return fromExtra ?? fromEasConfig ?? fromEnv;
}

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/**
 * Expo documents that remote push is not available in Expo Go on Android from SDK 53+.
 * @see https://docs.expo.dev/versions/latest/sdk/notifications/
 */
function isRemotePushUnsupportedInExpoGo(): boolean {
  return Platform.OS === 'android' && isExpoGo();
}

/** Configure how notifications are shown while the app is foregrounded. */
export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      // Client owns badge while JS runs (`useAppIconBadgeSync`); remote `badge` updates icon when app is killed.
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('announcements', {
    name: 'Announcements',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  await Notifications.setNotificationChannelAsync('events', {
    name: 'Events',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Requests permission, obtains Expo push token, and registers with Supabase.
 * No-ops on web/simulator when push is unavailable.
 */
export async function registerForPushNotificationsAsync(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!Device.isDevice) {
    return;
  }

  if (isRemotePushUnsupportedInExpoGo()) {
    console.warn(
      '[push] Remote push is not supported in Expo Go on Android (Expo SDK 53+). ' +
        'Use a development build (`npx expo run:android` or EAS Build) to test announcement pushes. ' +
        'https://docs.expo.dev/versions/latest/sdk/notifications/'
    );
    return;
  }

  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    if (__DEV__) {
      console.warn(
        '[push] Notification permission not granted; skipping Expo push token registration.'
      );
    }
    return;
  }

  const projectId = getEasProjectId();
  if (__DEV__ && !projectId) {
    console.warn(
      '[push] No EAS projectId in app config (extra.eas.projectId) or EXPO_PUBLIC_EAS_PROJECT_ID. ' +
        'getExpoPushTokenAsync may fail; run `eas init` and add projectId, or set EXPO_PUBLIC_EAS_PROJECT_ID.'
    );
  }

  let tokenData: Notifications.ExpoPushToken | undefined;
  try {
    tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : {});
  } catch (e) {
    console.warn('[push] getExpoPushTokenAsync failed', e);
    return;
  }

  const token = tokenData.data;
  if (!token) return;

  const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';
  const result = await api.data.registerPushToken(userId, token, platform);
  if (isApiError(result)) {
    console.warn('[push] registerPushToken failed', result.message);
  } else if (__DEV__) {
    console.log('[push] Registered Expo push token with backend');
  }
}

export interface NotificationRouterLike {
  push: (href: string) => void;
}

function navigateFromNotificationData(
  router: NotificationRouterLike,
  data: Record<string, unknown> | undefined
): void {
  // Remote payloads often stringify `data` values (especially on Android).
  const typeStr = data?.type != null ? String(data.type) : '';
  const eventIdVal = data?.eventId;
  const eventId =
    typeof eventIdVal === 'string' ? eventIdVal : eventIdVal != null ? String(eventIdVal) : '';
  if (typeStr === 'group_event' && eventId.length > 0) {
    router.push(`/group/event/${eventId}`);
    return;
  }

  const meetingLink = data?.meetingLink;
  if (typeof meetingLink === 'string' && meetingLink.trim().length > 0) {
    void WebBrowser.openBrowserAsync(meetingLink.trim());
  }
  const groupId = data?.groupId;
  if (typeof groupId === 'string' && groupId.length > 0) {
    router.push(`/group/${groupId}`);
  }
}

/** Handle cold start: user opened app from a notification. */
export async function handleInitialNotificationResponse(
  router: NotificationRouterLike
): Promise<void> {
  const last = await Notifications.getLastNotificationResponseAsync();
  if (!last) return;
  const data = last.notification.request.content.data as Record<string, unknown> | undefined;
  navigateFromNotificationData(router, data);
}

/**
 * Subscribe to notification taps while app is running or in background.
 * Returns a subscription with `remove()` for cleanup.
 */
export function subscribeToNotificationResponses(
  router: NotificationRouterLike
): ReturnType<typeof Notifications.addNotificationResponseReceivedListener> {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown> | undefined;
    navigateFromNotificationData(router, data);
  });
}
