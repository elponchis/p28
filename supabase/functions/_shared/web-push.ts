/**
 * Web Push, for browsers.
 *
 * Expo push does nothing on the web, so without this a closed tab hears about nothing at all.
 * It runs alongside the Expo send rather than instead of it: one person can have a phone and a
 * browser subscribed, and both should ring.
 *
 * Shared by every function that notifies. It lived inside send-chat-message, which meant chat was
 * the only thing a browser could ever be told about — an announcement to a congregation that
 * reads the app in a browser reached nobody.
 *
 * Silently does nothing when VAPID is unconfigured: a deployment without keys should behave like
 * one without web push, not fail the invocation and take the Expo notifications down with it.
 */
import webpush from 'npm:web-push@3.6.7';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';

export interface WebPushResult {
  sent: number;
  expired: number;
  /** Who was actually reached, so a caller that records deliveries can record these too. */
  sentUserIds: string[];
}

export interface WebPushPayload {
  title: string;
  body: string;
  /** Mirrors the Expo payload's data, and is what public/sw.js reads to route a click. */
  data: Record<string, string>;
}

export async function sendWebPushToUsers(
  supabase: SupabaseClient,
  userIds: string[],
  payload: WebPushPayload
): Promise<WebPushResult> {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com';
  const nothing: WebPushResult = { sent: 0, expired: 0, sentUserIds: [] };
  if (!publicKey || !privateKey || userIds.length === 0) return nothing;

  const { data: subs, error } = await supabase
    .from('web_push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', userIds);
  if (error || !subs || subs.length === 0) {
    if (error) console.error('web_push_subscriptions', error);
    return nothing;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const body = JSON.stringify(payload);
  let sent = 0;
  const expiredEndpoints: string[] = [];
  const reached = new Set<string>();

  for (const row of subs as {
    user_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }[]) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        body
      );
      sent += 1;
      reached.add(row.user_id);
    } catch (e) {
      // 404/410 is the push service saying this subscription is dead — the browser was
      // uninstalled, or the user revoked permission. Keeping it means retrying it forever.
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) expiredEndpoints.push(row.endpoint);
      else console.error('web push failed', row.endpoint, e);
    }
  }

  if (expiredEndpoints.length > 0) {
    await supabase.from('web_push_subscriptions').delete().in('endpoint', expiredEndpoints);
  }

  return { sent, expired: expiredEndpoints.length, sentUserIds: [...reached] };
}
