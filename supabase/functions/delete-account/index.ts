/**
 * Deletes the caller's own account (Apple guideline 5.1.1(v)).
 *
 * Two phases, run in this order deliberately:
 *  1. DB cleanup via the delete_user_account() RPC, called with the CALLER'S OWN JWT (not the
 *     service role) so that auth.uid() inside the function resolves to them and the RPC's
 *     built-in "delete only yourself" guarantee holds. This phase is atomic — see that
 *     function's own migration comments (00071_delete_user_account.sql) for the transaction
 *     boundary. If this fails (e.g. the admin-vacuum pre-check blocks it), the function returns
 *     an error immediately and does NOT touch Storage — the account still exists, so nothing
 *     should be deleted.
 *  2. Storage cleanup (avatar, submission files, chat/discussion attachment files), only after
 *     phase 1 has committed successfully. Storage has no transactional relationship to
 *     Postgres, so this is best-effort: failures are logged but do not fail the request — the
 *     account is already gone at this point, and an orphaned file is a cleanup task, not a
 *     reason to tell the caller their account deletion failed when it didn't.
 *
 * Storage targets for phase 2 that depend on DB rows the RPC's cascades will remove (submission
 * file_path; chat/discussion attachment URLs) are read with the service-role client BEFORE
 * calling the RPC, since those rows won't exist anymore afterward.
 *
 * Invoke (user JWT): POST {} — no body needed, everything operates on the caller's own auth.uid().
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';

import { json, optionsResponse, verifyUserFromAuthorizationHeader } from '../_shared/push-gateway.ts';

type MessageAttachment = {
  url?: string;
  thumbnailUrl?: string;
};

function pathFromPublicUrl(url: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const rest = url.slice(idx + marker.length);
  const path = rest.split('?')[0];
  return path?.length ? path : null;
}

function collectAttachmentPaths(
  rows: Array<{ attachments: unknown; image_urls: string[] | null }>,
  bucket: string
): string[] {
  const paths = new Set<string>();
  for (const row of rows) {
    const attachments = Array.isArray(row.attachments) ? (row.attachments as MessageAttachment[]) : [];
    for (const att of attachments) {
      if (typeof att.url === 'string') {
        const p = pathFromPublicUrl(att.url, bucket);
        if (p) paths.add(p);
      }
      if (typeof att.thumbnailUrl === 'string') {
        const p = pathFromPublicUrl(att.thumbnailUrl, bucket);
        if (p) paths.add(p);
      }
    }
    for (const url of row.image_urls ?? []) {
      const p = pathFromPublicUrl(url, bucket);
      if (p) paths.add(p);
    }
  }
  return [...paths];
}

async function removeFolderContents(supabase: SupabaseClient, bucket: string, folder: string) {
  const { data: entries, error } = await supabase.storage.from(bucket).list(folder);
  if (error || !entries?.length) return;
  const paths = entries.filter((e) => e.name).map((e) => `${folder}/${e.name}`);
  if (paths.length > 0) {
    await supabase.storage.from(bucket).remove(paths);
  }
}

async function removeStorageForDeletedUser(
  supabase: SupabaseClient,
  userId: string,
  capturedPaths: { submissionFiles: string[]; discussionImages: string[]; chatFiles: string[] }
) {
  const tasks: Promise<unknown>[] = [
    // avatars/{userId}/* — path convention alone is enough, no DB row needed.
    removeFolderContents(supabase, 'avatars', userId),
    // chat-images: messages/{userId}/* plus its thumbs/ subfolder (video poster thumbnails);
    // .list() isn't recursive, so both are listed explicitly.
    removeFolderContents(supabase, 'chat-images', `messages/${userId}`),
    removeFolderContents(supabase, 'chat-images', `messages/${userId}/thumbs`),
  ];
  if (capturedPaths.submissionFiles.length > 0) {
    tasks.push(supabase.storage.from('assignment-submissions').remove(capturedPaths.submissionFiles));
  }
  if (capturedPaths.discussionImages.length > 0) {
    tasks.push(supabase.storage.from('discussion-post-images').remove(capturedPaths.discussionImages));
  }
  if (capturedPaths.chatFiles.length > 0) {
    tasks.push(supabase.storage.from('chat-images').remove(capturedPaths.chatFiles));
  }

  const results = await Promise.allSettled(tasks);
  for (const r of results) {
    if (r.status === 'rejected') {
      console.error('delete-account: storage cleanup task failed', r.reason);
    }
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

    const authHeader = req.headers.get('Authorization');
    const verified = await verifyUserFromAuthorizationHeader({
      supabaseUrl,
      anonKey: anonKey ?? serviceKey,
      serviceKey,
      authHeader,
    });
    if (!verified.ok) return verified.response;
    const userId = verified.userId;

    const serviceClient = createClient(supabaseUrl, serviceKey);

    // ── Capture storage-cleanup targets BEFORE the RPC runs — the rows these come from are
    // cascade-deleted (submissions) or anonymized (chat_messages/discussion_posts attachments
    // cleared to '[]'/NULL) by delete_user_account(), so they won't be readable afterward.
    const [{ data: submissionRows }, { data: chatRows }, { data: discussionRows }] = await Promise.all([
      serviceClient.from('submissions').select('file_path').eq('user_id', userId),
      serviceClient.from('chat_messages').select('attachments, image_urls').eq('user_id', userId),
      serviceClient.from('discussion_posts').select('attachments, image_urls').eq('user_id', userId),
    ]);

    const capturedPaths = {
      submissionFiles: (submissionRows ?? [])
        .map((r: { file_path: string | null }) => r.file_path)
        .filter((p): p is string => !!p),
      chatFiles: collectAttachmentPaths(chatRows ?? [], 'chat-images'),
      discussionImages: collectAttachmentPaths(discussionRows ?? [], 'discussion-post-images'),
    };

    // ── Phase 1: atomic DB cleanup, run as the caller (not service role) so auth.uid() inside
    // the RPC resolves to them.
    const jwt = authHeader!.slice(7);
    const userClient = createClient(supabaseUrl, anonKey ?? serviceKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { error: rpcError } = await userClient.rpc('delete_user_account');
    if (rpcError) {
      return json({ error: rpcError.message }, 400);
    }

    // ── Phase 2: best-effort Storage cleanup, only after phase 1 succeeded.
    await removeStorageForDeletedUser(serviceClient, userId, capturedPaths);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
