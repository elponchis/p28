/**
 * Sends Expo push notifications for a published group announcement and records deliveries.
 * Service role is used for DB reads/writes (RLS blocks broad client access to deliveries).
 *
 * Invoke (user JWT): POST { announcementId } — caller must be an effective group admin, platform
 * super_admin, or the announcement author (see user_is_effective_group_admin_by_id RPC).
 * Idempotent per user: skips users who already have an announcement_deliveries row; retries can complete partial sends.
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

type AnnouncementRow = {
  id: string;
  group_id: string;
  title: string;
  body: string;
  meeting_link?: string | null;
};

type AnnouncementExpoMessage = {
  to: string;
  userId: string;
  sound: 'default';
  title: string;
  body: string;
  data: { groupId: string; announcementId: string; meetingLink?: string };
  channelId: string;
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
    const announcementId =
      typeof body.announcementId === 'string' ? body.announcementId : undefined;

    if (!announcementId) {
      return json({ error: 'announcementId required' }, 400);
    }

    const verified = await verifyUserFromAuthorizationHeader({
      supabaseUrl,
      anonKey: anonKey ?? serviceKey,
      serviceKey,
      authHeader: req.headers.get('Authorization'),
    });
    if (!verified.ok) return verified.response;

    const { data: annMeta, error: metaErr } = await supabase
      .from('announcements')
      .select('id, group_id, status, created_by_user_id')
      .eq('id', announcementId)
      .maybeSingle();
    if (metaErr || !annMeta) {
      return json({ error: 'Announcement not found' }, 404);
    }
    if (annMeta.status !== 'published') {
      return json({ error: 'Announcement is not published' }, 400);
    }

    const { data: isEffectiveAdmin, error: effErr } = await supabase.rpc(
      'user_is_effective_group_admin_by_id',
      {
        p_user_id: verified.userId,
        p_group_id: annMeta.group_id,
      }
    );
    if (effErr) {
      console.error('user_is_effective_group_admin_by_id', effErr);
      return json({ error: 'Authorization check failed' }, 500);
    }
    const isAnnouncementCreator = annMeta.created_by_user_id === verified.userId;
    if (isEffectiveAdmin !== true && !isAnnouncementCreator) {
      return json({ error: 'Forbidden' }, 403);
    }

    const err = await sendAnnouncementPushes(supabase, announcementId);
    if (err) return json({ error: err }, 400);
    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

async function sendAnnouncementPushes(supabase: SupabaseClient, announcementId: string) {
  const { data: ann, error: fetchErr } = await supabase
    .from('announcements')
    .select('id, group_id, title, body, meeting_link')
    .eq('id', announcementId)
    .eq('status', 'published')
    .maybeSingle();

  if (fetchErr) return fetchErr.message;
  if (!ann) return 'Announcement not found';

  const row = ann as AnnouncementRow;

  const { data: members, error: mErr } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', row.group_id);
  if (mErr) return mErr.message;

  const userIds = (members ?? []).map((m: { user_id: string }) => m.user_id);
  if (userIds.length === 0) return null;

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('user_id, announcements_enabled')
    .in('user_id', userIds);

  const prefMap: { [uid: string]: boolean } = {};
  for (const p of prefs ?? []) {
    const pr = p as { user_id: string; announcements_enabled: boolean };
    prefMap[pr.user_id] = pr.announcements_enabled;
  }

  const { data: gmSettings } = await supabase
    .from('group_member_settings')
    .select('user_id, announcements_enabled')
    .eq('group_id', row.group_id)
    .in('user_id', userIds);

  const gmsMap: { [uid: string]: boolean } = {};
  for (const r of gmSettings ?? []) {
    const gr = r as { user_id: string; announcements_enabled: boolean };
    gmsMap[gr.user_id] = gr.announcements_enabled;
  }

  const eligible = userIds.filter((uid) => {
    const globalOn = prefMap[uid] ?? true;
    const groupOn = gmsMap[uid] ?? true;
    return globalOn && groupOn;
  });

  if (eligible.length === 0) return null;

  const { data: tokenRows, error: tErr } = await supabase
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', eligible);
  if (tErr) return tErr.message;

  const { data: deliveredRows } = await supabase
    .from('announcement_deliveries')
    .select('user_id')
    .eq('announcement_id', announcementId)
    .in('user_id', eligible);

  const alreadyDelivered = new Set(
    (deliveredRows ?? []).map((d: { user_id: string }) => d.user_id)
  );

  const messages: AnnouncementExpoMessage[] = [];

  const seenToken: { [token: string]: true } = {};
  for (const tr of tokenRows ?? []) {
    const uid = tr.user_id as string;
    const to = tr.token as string;
    if (alreadyDelivered.has(uid)) continue;
    if (!to || seenToken[to]) continue;
    seenToken[to] = true;
    const link = row.meeting_link?.trim();
    const badge = await getAppBadgeCountForUser(supabase, uid);
    messages.push({
      to,
      userId: uid,
      sound: 'default',
      title: row.title,
      body: row.body.length > 200 ? `${row.body.slice(0, 197)}...` : row.body,
      data: {
        groupId: row.group_id,
        announcementId: row.id,
        ...(link ? { meetingLink: link } : {}),
      },
      channelId: 'announcements',
      badge,
    });
  }

  if (messages.length === 0) {
    return null;
  }

  const now = new Date().toISOString();
  const { successfulUserIds: sentUserIds } = await sendExpoPushInChunks(messages);

  const sentIdsList = [...sentUserIds];
  if (sentIdsList.length === 0) {
    console.error('send-announcement: no successful Expo tickets for', announcementId);
    return null;
  }

  const deliveryRows = sentIdsList.map((user_id) => ({
    announcement_id: row.id,
    user_id,
    status: 'sent' as const,
    delivered_at: now,
  }));

  const { error: delErr } = await supabase.from('announcement_deliveries').upsert(deliveryRows, {
    onConflict: 'announcement_id,user_id',
  });
  if (delErr) console.error('announcement_deliveries upsert', delErr);

  return null;
}
