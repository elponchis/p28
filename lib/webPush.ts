/**
 * Web Push registration.
 *
 * Expo push is native-only, so on web a closed tab never hears about a new message. This
 * registers the service worker in public/sw.js, asks for notification permission, subscribes to
 * the browser's push service and stores the subscription so the Edge Function can reach it.
 *
 * Everything here no-ops off web, and no-ops on a browser without the APIs — Safari on iOS only
 * grants push to an installed PWA, and a plain visit there should be quiet, not broken.
 */
import { Platform } from 'react-native';

import { api, isApiError } from '@/lib/api';

const SERVICE_WORKER_URL = '/sw.js';
const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export function isWebPushSupported(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function isWebPushConfigured(): boolean {
  return VAPID_PUBLIC_KEY.length > 0;
}

/** The subscribe call wants the key as bytes, and VAPID publishes it as base64url. */
function urlBase64ToUint8Array(base64: string): BufferSource {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function encodeKey(subscription: PushSubscription, name: 'p256dh' | 'auth'): string | null {
  const key = subscription.getKey(name);
  if (!key) return null;
  let binary = '';
  const bytes = new Uint8Array(key);
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Subscribes this browser and stores the result.
 *
 * Only ever called from a user gesture path: browsers reject a permission prompt that was not
 * asked for, and a page that prompts on load is a page people block. Returns false when push is
 * unavailable or the user declined, so the caller can leave the UI honest.
 */
export async function enableWebPush(userId: string): Promise<boolean> {
  if (!isWebPushSupported() || !isWebPushConfigured()) return false;

  try {
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL);
    await navigator.serviceWorker.ready;

    const permission =
      Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') return false;

    // An existing subscription is reused; subscribe() would return the same endpoint anyway, and
    // asking again on every launch is wasted work.
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));

    const p256dh = encodeKey(subscription, 'p256dh');
    const auth = encodeKey(subscription, 'auth');
    if (!p256dh || !auth) return false;

    const result = await api.data.saveWebPushSubscription(userId, {
      endpoint: subscription.endpoint,
      p256dh,
      auth,
      userAgent: navigator.userAgent,
    });
    if (isApiError(result)) {
      console.warn('[webPush] could not store subscription', result.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[webPush] registration failed', e);
    return false;
  }
}

/** Unsubscribes this browser and forgets the row. */
export async function disableWebPush(): Promise<void> {
  if (!isWebPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_URL);
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    const { endpoint } = subscription;
    await subscription.unsubscribe();
    await api.data.deleteWebPushSubscription(endpoint);
  } catch (e) {
    console.warn('[webPush] unsubscribe failed', e);
  }
}

/** True when this browser already has push switched on for the signed-in user. */
export async function isWebPushEnabled(): Promise<boolean> {
  if (!isWebPushSupported() || Notification.permission !== 'granted') return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_URL);
    return !!(await registration?.pushManager.getSubscription());
  } catch {
    return false;
  }
}
