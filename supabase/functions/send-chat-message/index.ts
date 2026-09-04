/**
 * Sends Expo push notifications to the other members of a chat when a message is posted.
 *
 * Invoke (user JWT): POST { messageId }. Only the message author may trigger it, which is the
 * whole authorization story here: the caller cannot make the app notify anyone they could not
 * already have messaged, because the message row had to pass chat RLS to exist at all.
 *
 * Recipients are the chat's other members, minus:
 *  - anyone who turned messages off (notification_preferences.messages_enabled),
 *  - anyone who declined the conversation (chat_members.request_state = 'declined'),
 *  - anyone whose last_read_at is already past the message, i.e. they are sitting in the thread
 *    reading it right now.
 *
 * A pending request DOES notify: an unanswered message request the recipient never hears about
 * is the same as no message at all.
 *
 * Both transports run: Expo push for phones, Web Push for browsers, since one person can have
 * both. Web Push is skipped silently when VAPID is unconfigured.
 *
 * Only the FIRST unread message in a chat notifies a given recipient. A burst of messages
 * produces one push, not one per message; the next arrives once they have caught up and fallen
 * behind again. The badge count is unaffected -- it keeps counting regardless.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';

import webpush from 'npm:web-push@3.6.7';

import { getAppBadgeCountForUser } from '../_shared/app-badge.ts';
import {
  json,
  optionsResponse,
  sendExpoPushInChunks,
  verifyUserFromAuthorizationHeader,
} from '../_shared/push-gateway.ts';

type MessageRow = {
  id: string;
  chat_id: string;
  user_id: string;
  body: string | null;
  created_at: string;
  attachments: unknown;
  deleted_at: string | null;
};

type MemberRow = {
  user_id: string;
  request_state: string | null;
  last_read_at: string | null;
  joined_at: string | null;
};

type ChatMessageExpoMessage = {
  to: string;
  userId: string;
  sound: 'default';
  title: string;
  body: string;
  priority: 'high';
  data: { type: string; chatId: string; messageId: string };
  badge: number;
};

/** What the notification says when the message is an attachment with no text. */
function attachmentSummary(attachments: unknown): string {
  if (!Array.isArray(attachments) || attachments.length === 0) return 'Sent a message';
  const kinds = attachments
    .map((a) => (a && typeof a === 'object' ? (a as { kind?: unknown }).kind : undefined))
    .filter((k): k is string => typeof k === 'string');
  if (kinds.length > 1) return `Sent ${kinds.length} attachments`;
  const first = kinds[0];
  if (first === 'image') return 'Sent a photo';
  if (first === 'video') return 'Sent a video';
  if (first === 'audio') return 'Sent a voice message';
  if (first === 'file') return 'Sent a file';
  return 'Sent a message';
}

function displayNameFrom(profile: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}): string {
  const explicit = profile.display_name?.trim();
  if (explicit) return explicit;
  const derived = [profile.first_name, profile.last_name]
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .join(' ')
    .trim();
  return derived.length > 0 ? derived : 'New message';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'Missing Supabase configuration' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const messageId = typeof body.messageId === 'string' ? body.messageId : undefined;
    if (!messageId) {
      return json({ error: 'messageId required' }, 400);
    }

    const verified = await verifyUserFromAuthorizationHeader({
      supabaseUrl,
      anonKey: anonKey ?? serviceKey,
      serviceKey,
      authHeader: req.headers.get('Authorization'),
    });
    if (!verified.ok) return verified.response;

    const result = await sendChatMessagePushes(supabase, messageId, verified.userId);
    if ('error' in result) return json({ error: result.error }, result.status ?? 400);
    return json({ ok: true, ...result.stats });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

async function sendChatMessagePushes(
  supabase: SupabaseClient,
  messageId: string,
  callerUserId: string
): Promise<{ error: string; status?: number } | { stats: Record<string, unknown> }> {
  const { data: row, error: msgErr } = await supabase
    .from('chat_messages')
    .select('id, chat_id, user_id, body, created_at, attachments, deleted_at')
    .eq('id', messageId)
    .maybeSingle();
  if (msgErr) return { error: msgErr.message };
  if (!row) return { error: 'Message not found', status: 404 };

  const msg = row as MessageRow;
  if (msg.user_id !== callerUserId) return { error: 'Forbidden', status: 403 };
  if (msg.deleted_at) return { stats: { recipients: 0, messagesQueued: 0, ticketsOk: 0 } };

  const { data: memberRows, error: memErr } = await supabase
    .from('chat_members')
    .select('user_id, request_state, last_read_at, joined_at')
    .eq('chat_id', msg.chat_id);
  if (memErr) return { error: memErr.message };

  const sentAt = new Date(msg.created_at).getTime();
  const candidates = (memberRows ?? [])
    .map((m) => m as MemberRow)
    .filter((m) => m.user_id !== msg.user_id)
    .filter((m) => m.request_state !== 'declined')
    .filter((m) => {
      if (!m.last_read_at) return true;
      const readAt = new Date(m.last_read_at).getTime();
      return !(Number.isFinite(readAt) && Number.isFinite(sentAt) && readAt >= sentAt);
    });

  /**
   * Only the first unread message in a chat notifies.
   *
   * Ten people writing in a group produced ten pushes, which is how a chat app teaches people to
   * turn notifications off. A recipient who already has something unread here has already been
   * told; the badge keeps counting, and the next push waits until they have read and fallen
   * behind again.
   *
   * "Unread" is measured from last_read_at, or from joined_at for someone who has never opened
   * the chat -- otherwise a new member's entire backlog would count as prior unread and they
   * would never be notified at all.
   */
  const earliestThreshold = candidates
    .map((m) => m.last_read_at ?? m.joined_at)
    .filter((v): v is string => !!v)
    .sort()[0];

  let priorMessages: { user_id: string; created_at: string }[] = [];
  if (candidates.length > 0) {
    let query = supabase
      .from('chat_messages')
      .select('user_id, created_at')
      .eq('chat_id', msg.chat_id)
      .neq('id', msg.id)
      .lt('created_at', msg.created_at)
      .order('created_at', { ascending: false })
      .limit(200);
    if (earliestThreshold) query = query.gt('created_at', earliestThreshold);
    const { data: priorRows, error: priorErr } = await query;
    if (priorErr) return { error: priorErr.message };
    priorMessages = (priorRows ?? []) as { user_id: string; created_at: string }[];
  }

  const recipients = candidates
    .filter((m) => {
      const threshold = m.last_read_at ?? m.joined_at;
      const thresholdAt = threshold ? new Date(threshold).getTime() : 0;
      const hasPriorUnread = priorMessages.some(
        (row) => row.user_id !== m.user_id && new Date(row.created_at).getTime() > thresholdAt
      );
      return !hasPriorUnread;
    })
    .map((m) => m.user_id);

  if (recipients.length === 0) {
    return { stats: { recipients: 0, messagesQueued: 0, ticketsOk: 0, ticketErrors: [] } };
  }

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('user_id, messages_enabled')
    .in('user_id', recipients);

  const messagesOff: { [uid: string]: true } = {};
  for (const p of prefs ?? []) {
    const pref = p as { user_id: string; messages_enabled: boolean };
    if (pref.messages_enabled === false) messagesOff[pref.user_id] = true;
  }
  const eligible = recipients.filter((uid) => !messagesOff[uid]);
  if (eligible.length === 0) {
    return {
      stats: { recipients: recipients.length, messagesQueued: 0, ticketsOk: 0, ticketErrors: [] },
    };
  }

  const { data: tokenRows, error: tokErr } = await supabase
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', eligible);
  if (tokErr) return { error: tokErr.message };

  // Title is the sender, the way every messaging app does it; the chat name alone would tell the
  // recipient which thread but not who is talking, which matters more in a group.
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('display_name, first_name, last_name')
    .eq('user_id', msg.user_id)
    .maybeSingle();

  const { data: chatRow } = await supabase
    .from('chats')
    .select('name')
    .eq('id', msg.chat_id)
    .maybeSingle();

  const senderName = displayNameFrom(senderProfile ?? {});
  const chatName = (chatRow as { name?: string | null } | null)?.name?.trim();
  const title = chatName ? `${senderName} - ${chatName}` : senderName;

  const text = msg.body?.trim() ?? '';
  const pushBody = text.length > 0 ? text : attachmentSummary(msg.attachments);

  const messages: ChatMessageExpoMessage[] = [];
  const seenToken: { [token: string]: true } = {};
  for (const tr of tokenRows ?? []) {
    const uid = tr.user_id as string;
    const to = tr.token as string;
    if (!to || seenToken[to]) continue;
    seenToken[to] = true;
    const badge = await getAppBadgeCountForUser(supabase, uid);
    messages.push({
      to,
      userId: uid,
      sound: 'default',
      title,
      // channelId is deliberately omitted: a named Android channel that was never created on
      // the device makes Android drop the notification (same note as send-group-event-created).
      body: pushBody.length > 200 ? `${pushBody.slice(0, 197)}...` : pushBody,
      priority: 'high',
      data: { type: 'chat_message', chatId: msg.chat_id, messageId: msg.id },
      badge,
    });
  }

  if (messages.length === 0) {
    return {
      stats: { recipients: recipients.length, messagesQueued: 0, ticketsOk: 0, ticketErrors: [] },
    };
  }

  const sendResult = await sendExpoPushInChunks(messages);
  const web = await sendWebPush(supabase, eligible, title, pushBody, msg);

  return {
    stats: {
      recipients: recipients.length,
      messagesQueued: messages.length,
      ticketsOk: sendResult.ticketsOk,
      ticketErrors: sendResult.ticketErrors,
      webPushSent: web.sent,
      webPushExpired: web.expired,
    },
  };
}

/**
 * Web Push, for browsers.
 *
 * Expo push does nothing on the web, so without this a closed tab never hears about a message.
 * Runs alongside the Expo send rather than instead of it: one person can have both a phone and a
 * browser subscribed, and both should ring.
 *
 * Silently does nothing when VAPID is unconfigured — a deployment without keys should behave like
 * one without web push, not fail the whole invocation and take the Expo notifications with it.
 */
async function sendWebPush(
  supabase: SupabaseClient,
  userIds: string[],
  title: string,
  body: string,
  msg: MessageRow
): Promise<{ sent: number; expired: number }> {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com';
  if (!publicKey || !privateKey || userIds.length === 0) return { sent: 0, expired: 0 };

  const { data: subs, error } = await supabase
    .from('web_push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', userIds);
  if (error || !subs || subs.length === 0) {
    if (error) console.error('web_push_subscriptions', error);
    return { sent: 0, expired: 0 };
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const payload = JSON.stringify({
    title,
    body,
    data: { type: 'chat_message', chatId: msg.chat_id, messageId: msg.id },
  });

  let sent = 0;
  const expiredEndpoints: string[] = [];

  for (const row of subs as { endpoint: string; p256dh: string; auth: string }[]) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        payload
      );
      sent += 1;
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

  return { sent, expired: expiredEndpoints.length };
}
