/**
 * Sends Expo push notifications when a group event is created.
 * Service role is used for DB reads. Caller must be an effective group admin, platform super_admin,
 * or the event creator (see user_is_effective_group_admin_by_id RPC).
 *
 * Invoke (user JWT): POST { eventId } — best-effort Expo send; no delivery log (v1).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';

import { getAppBadgeCountForUser } from '../_shared/app-badge.ts';
import {
  json,
  optionsResponse,
  sendExpoPushInChunks,
  verifyUserFromAuthorizationHeader,
} from './_shared/push-gateway.ts';

type GroupEventRow = {
  id: string;
  group_id: string;
  title: string;
  starts_at: string;
  created_by_user_id: string;
  status: string;
};

type GroupEventExpoMessage = {
  to: string;
  userId: string;
  sound: 'default';
  title: string;
  body: string;
  priority: 'high';
  data: { [key: string]: string };
  badge: number;
};

function formatEventStart(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
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
    const eventId = typeof body.eventId === 'string' ? body.eventId : undefined;

    if (!eventId) {
      return json({ error: 'eventId required' }, 400);
    }

    const verified = await verifyUserFromAuthorizationHeader({
      supabaseUrl,
      anonKey: anonKey ?? serviceKey,
      serviceKey,
      authHeader: req.headers.get('Authorization'),
    });
    if (!verified.ok) return verified.response;

    const { data: evMeta, error: metaErr } = await supabase
      .from('group_events')
      .select('id, group_id, status, created_by_user_id')
      .eq('id', eventId)
      .maybeSingle();
    if (metaErr || !evMeta) {
      return json({ error: 'Event not found' }, 404);
    }
    if (evMeta.status !== 'active') {
      return json({ error: 'Event is not active' }, 400);
    }

    const { data: isEffectiveAdmin, error: effErr } = await supabase.rpc(
      'user_is_effective_group_admin_by_id',
      {
        p_user_id: verified.userId,
        p_group_id: evMeta.group_id,
      }
    );
    if (effErr) {
      console.error('user_is_effective_group_admin_by_id', effErr);
      return json({ error: 'Authorization check failed' }, 500);
    }
    const isEventCreator = evMeta.created_by_user_id === verified.userId;
    if (isEffectiveAdmin !== true && !isEventCreator) {
      return json({ error: 'Forbidden' }, 403);
    }

    const result = await sendGroupEventCreatedPushes(supabase, eventId);
    if ('error' in result) return json({ error: result.error }, 400);
    return json({ ok: true, ...result.stats });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

async function sendGroupEventCreatedPushes(supabase: SupabaseClient, eventId: string) {
  const { data: row, error: fetchErr } = await supabase
    .from('group_events')
    .select('id, group_id, title, starts_at, created_by_user_id, status')
    .eq('id', eventId)
    .eq('status', 'active')
    .maybeSingle();

  if (fetchErr) return { error: fetchErr.message };
  if (!row) return { error: 'Event not found' };

  const ev = row as GroupEventRow;

  const { data: members, error: mErr } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', ev.group_id);
  if (mErr) return { error: mErr.message };

  const userIds = (members ?? []).map((m: { user_id: string }) => m.user_id);
  if (userIds.length === 0) {
    return {
      stats: {
        eligibleMembers: 0,
        messagesQueued: 0,
        ticketsOk: 0,
        ticketErrors: [],
      },
    };
  }

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('user_id, events_enabled')
    .in('user_id', userIds);

  const prefMap: { [uid: string]: boolean } = {};
  for (const p of prefs ?? []) {
    const row = p as { user_id: string; events_enabled: boolean };
    prefMap[row.user_id] = row.events_enabled;
  }

  const { data: gmSettings } = await supabase
    .from('group_member_settings')
    .select('user_id, events_enabled')
    .eq('group_id', ev.group_id)
    .in('user_id', userIds);

  const gmsMap: { [uid: string]: boolean } = {};
  for (const r of gmSettings ?? []) {
    const row = r as { user_id: string; events_enabled: boolean };
    gmsMap[row.user_id] = row.events_enabled;
  }

  const eligible = userIds.filter((uid) => {
    const globalOn = prefMap[uid] ?? true;
    const groupOn = gmsMap[uid] ?? true;
    return globalOn && groupOn;
  });
  if (eligible.length === 0) {
    return {
      stats: {
        eligibleMembers: 0,
        messagesQueued: 0,
        ticketsOk: 0,
        ticketErrors: [],
      },
    };
  }

  const { data: tokenRows, error: tErr } = await supabase
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', eligible);
  if (tErr) return { error: tErr.message };

  const when = formatEventStart(ev.starts_at);
  const pushTitle = 'New group event';
  const pushBody = when.length > 0 ? `${ev.title}\nStarts ${when}` : ev.title;

  /**
   * Omit channelId: Expo uses a default channel that always exists. A named channel
   * (e.g. "events") that was never created on the device causes Android to drop the notification.
   */
  const dataPayload = {
    type: 'group_event',
    eventId: ev.id,
    groupId: ev.group_id,
  } as const;

  const messages: GroupEventExpoMessage[] = [];

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
      title: pushTitle,
      body: pushBody.length > 200 ? `${pushBody.slice(0, 197)}...` : pushBody,
      priority: 'high',
      data: {
        type: dataPayload.type,
        eventId: String(dataPayload.eventId),
        groupId: String(dataPayload.groupId),
      },
      badge,
    });
  }

  if (messages.length === 0) {
    return {
      stats: {
        eligibleMembers: eligible.length,
        messagesQueued: 0,
        ticketsOk: 0,
        ticketErrors: [],
      },
    };
  }

  const { ticketsOk, ticketErrors } = await sendExpoPushInChunks(messages);

  return {
    stats: {
      eligibleMembers: eligible.length,
      messagesQueued: messages.length,
      ticketsOk,
      ticketErrors,
    },
  };
}
