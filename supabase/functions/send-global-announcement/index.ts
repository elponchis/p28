/**
 * Pushes a platform-wide announcement to everyone.
 *
 * Invoke (user JWT): POST { globalAnnouncementId }. Only the announcement's author may trigger
 * it, which is the whole authorization story: creating the row already required a super admin
 * (00062), so anyone who can be an author has already been checked once.
 *
 * The in-app notification rows are written by a trigger (00100), not here — the bell should be
 * right whether or not push is configured, and a function that fails must not take the record of
 * the announcement with it. This adds the two transports on top: Expo for phones, Web Push for
 * browsers.
 *
 * Recipients are every signed-up person except the author, minus anyone who turned announcements
 * off. That is the same rule the trigger uses, and the two are meant to agree.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';

import { getAppBadgeCountForUser } from '../_shared/app-badge.ts';
import { sendWebPushToUsers } from '../_shared/web-push.ts';
import {
  json,
  optionsResponse,
  sendExpoPushInChunks,
  verifyUserFromAuthorizationHeader,
} from '../_shared/push-gateway.ts';

type GlobalAnnouncementRow = {
  id: string;
  title: string;
  description: string;
  created_by_user_id: string;
};

type GlobalAnnouncementExpoMessage = {
  to: string;
  userId: string;
  sound: 'default';
  title: string;
  body: string;
  priority: 'high';
  data: { type: 'global_announcement'; globalAnnouncementId: string };
  badge: number;
};

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
    const globalAnnouncementId =
      typeof body.globalAnnouncementId === 'string' ? body.globalAnnouncementId : undefined;
    if (!globalAnnouncementId) {
      return json({ error: 'globalAnnouncementId required' }, 400);
    }

    const verified = await verifyUserFromAuthorizationHeader({
      supabaseUrl,
      anonKey: anonKey ?? serviceKey,
      serviceKey,
      authHeader: req.headers.get('Authorization'),
    });
    if (!verified.ok) return verified.response;

    const result = await sendGlobalAnnouncement(supabase, globalAnnouncementId, verified.userId);
    if ('error' in result) return json({ error: result.error }, result.status ?? 400);
    return json({ ok: true, ...result.stats });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

async function sendGlobalAnnouncement(
  supabase: SupabaseClient,
  globalAnnouncementId: string,
  callerUserId: string
): Promise<{ error: string; status?: number } | { stats: Record<string, unknown> }> {
  const { data: row, error: rowErr } = await supabase
    .from('global_announcements')
    .select('id, title, description, created_by_user_id')
    .eq('id', globalAnnouncementId)
    .maybeSingle();
  if (rowErr) return { error: rowErr.message };
  if (!row) return { error: 'Announcement not found', status: 404 };

  const announcement = row as GlobalAnnouncementRow;
  if (announcement.created_by_user_id !== callerUserId) {
    return { error: 'Forbidden', status: 403 };
  }

  const { data: profileRows, error: profileErr } = await supabase
    .from('profiles')
    .select('user_id');
  if (profileErr) return { error: profileErr.message };

  const everyoneElse = (profileRows ?? [])
    .map((p) => (p as { user_id: string }).user_id)
    .filter((uid) => uid !== announcement.created_by_user_id);
  if (everyoneElse.length === 0) {
    return { stats: { recipients: 0, messagesQueued: 0, ticketsOk: 0, ticketErrors: [] } };
  }

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('user_id, announcements_enabled')
    .in('user_id', everyoneElse);

  const announcementsOff: { [uid: string]: true } = {};
  for (const p of prefs ?? []) {
    const pref = p as { user_id: string; announcements_enabled: boolean };
    if (pref.announcements_enabled === false) announcementsOff[pref.user_id] = true;
  }
  const eligible = everyoneElse.filter((uid) => !announcementsOff[uid]);
  if (eligible.length === 0) {
    return {
      stats: {
        recipients: everyoneElse.length,
        messagesQueued: 0,
        ticketsOk: 0,
        ticketErrors: [],
      },
    };
  }

  const { data: tokenRows, error: tokErr } = await supabase
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', eligible);
  if (tokErr) return { error: tokErr.message };

  const pushBody =
    announcement.description.length > 200
      ? `${announcement.description.slice(0, 197)}...`
      : announcement.description;

  const messages: GlobalAnnouncementExpoMessage[] = [];
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
      title: announcement.title,
      body: pushBody,
      priority: 'high',
      // channelId is deliberately omitted: a named Android channel that was never created on the
      // device makes Android drop the notification.
      data: { type: 'global_announcement', globalAnnouncementId: announcement.id },
      badge,
    });
  }

  // No Expo tokens is the normal state of a browser-only deployment, not a reason to stop.
  const { ticketsOk, ticketErrors } =
    messages.length > 0
      ? await sendExpoPushInChunks(messages)
      : { ticketsOk: 0, ticketErrors: [] as string[] };

  const web = await sendWebPushToUsers(supabase, eligible, {
    title: announcement.title,
    body: pushBody,
    data: { type: 'global_announcement', globalAnnouncementId: announcement.id },
  });

  return {
    stats: {
      recipients: eligible.length,
      messagesQueued: messages.length,
      ticketsOk,
      ticketErrors,
      webPushSent: web.sent,
      webPushExpired: web.expired,
    },
  };
}
