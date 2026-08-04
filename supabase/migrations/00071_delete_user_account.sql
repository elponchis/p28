-- Account deletion backend (Apple guideline 5.1.1(v)).
--
-- Policy (confirmed with the app owner):
--   - Personal data (profile row, avatar file, submission files) -> actually deleted.
--   - Content authored in shared/public spaces (chat_messages, discussion_posts) -> anonymized
--     in place (placeholder body, attachments cleared, deleted_at tombstone) rather than
--     deleted outright, so replies/threads other users wrote don't lose their context.
--   - groups.created_by_user_id: RESTRICT -> SET NULL, so account deletion is never blocked
--     just because the user happens to be listed as a group's creator (pure provenance, not
--     something that should block deletion).
--   - Admin-vacuum guard: if the user is the *sole* group_admins row for a group that has 2+
--     members, deletion is blocked up front (with the group names in the error) rather than
--     silently leaving that group with zero admins.
--   - Groups where the user is the *only* member are deleted outright (nothing left behind to
--     orphan).

-- =============================================================================
-- 1. groups.created_by_user_id: RESTRICT -> SET NULL (nullable)
-- =============================================================================

ALTER TABLE public.groups
  ALTER COLUMN created_by_user_id DROP NOT NULL;

ALTER TABLE public.groups
  DROP CONSTRAINT groups_created_by_user_id_fkey;

ALTER TABLE public.groups
  ADD CONSTRAINT groups_created_by_user_id_fkey
  FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- =============================================================================
-- 2. discussions / discussion_posts gain deleted_at, mirroring chat_messages (00069).
--
--    Scope note: the app owner's confirmed policy named chat_messages + discussion_posts
--    explicitly. discussions (the topic/OP row) was NOT named, but discussion_posts.discussion_id
--    is ON DELETE CASCADE from discussions — if a topic-starter's account deletion were left to
--    plain FK cascade, deleting their `discussions` row would cascade-delete every reply OTHER
--    users wrote in that thread too, which directly contradicts the stated goal of not breaking
--    other users' conversation context. So `discussions` is anonymized the same way as
--    discussion_posts below, not left to cascade. Flagging this in case that wasn't the intent.
-- =============================================================================

ALTER TABLE public.discussions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.discussion_posts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- =============================================================================
-- 3. delete_user_account(): SECURITY DEFINER, operates on auth.uid() only (no user-id
--    parameter, so it can never be used to delete someone else's account). Every statement in
--    a PL/pgSQL function body runs inside the calling transaction — if any RAISE EXCEPTION
--    fires, everything in this function (including the final DELETE FROM auth.users) rolls
--    back atomically. No explicit BEGIN/COMMIT needed or possible inside a function body.
--
--    Storage objects (avatar, submission files, discussion/chat attachments) are NOT touched
--    here — Storage has no transactional relationship to Postgres, so that cleanup happens in
--    the delete-account Edge Function, after this RPC has already committed successfully.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_blocking_groups text;
  v_solo_group_ids uuid[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- ── Pre-check: block if v_uid is the ONLY group_admins row for a group with 2+ members ──
  SELECT string_agg(g.name, ', ')
  INTO v_blocking_groups
  FROM public.groups g
  WHERE EXISTS (
    SELECT 1 FROM public.group_admins ga
    WHERE ga.group_id = g.id AND ga.user_id = v_uid
  )
  AND (SELECT count(*) FROM public.group_members gm WHERE gm.group_id = g.id) >= 2
  AND (SELECT count(*) FROM public.group_admins ga2 WHERE ga2.group_id = g.id) = 1;

  IF v_blocking_groups IS NOT NULL THEN
    RAISE EXCEPTION
      'You are the only admin of these groups, which still have other members: %. Assign another admin (or leave the group) before deleting your account.',
      v_blocking_groups;
  END IF;

  -- ── Groups where v_uid is the only member: delete the group outright ──
  -- (cascades group_admins, group_members, courses/lessons, assignments/submissions,
  -- discussions/discussion_posts/group_discussions, announcements, group_events,
  -- event_rsvps, group_recurring_meetings for that group — all group_id FKs are
  -- ON DELETE CASCADE from public.groups.)
  SELECT array_agg(g.id)
  INTO v_solo_group_ids
  FROM public.groups g
  WHERE EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = g.id AND gm.user_id = v_uid
  )
  AND (SELECT count(*) FROM public.group_members gm2 WHERE gm2.group_id = g.id) = 1;

  IF v_solo_group_ids IS NOT NULL THEN
    DELETE FROM public.groups WHERE id = ANY(v_solo_group_ids);
  END IF;

  -- ── Anonymize shared conversation content (thread-preserving soft delete) ──
  UPDATE public.chat_messages
  SET body = '',
      attachments = '[]'::jsonb,
      image_urls = NULL,
      deleted_at = COALESCE(deleted_at, now())
  WHERE user_id = v_uid;

  UPDATE public.discussion_posts
  SET body = '',
      attachments = '[]'::jsonb,
      image_urls = NULL,
      deleted_at = COALESCE(deleted_at, now())
  WHERE user_id = v_uid;

  UPDATE public.discussions
  SET title = '',
      body = '',
      deleted_at = COALESCE(deleted_at, now())
  WHERE user_id = v_uid;

  -- ── Delete the auth user. Every remaining FK is ON DELETE CASCADE or SET NULL:
  -- profiles, group_members, group_admins, friendships, friend_requests, push_tokens,
  -- notification_preferences, chat_folders, chat_members, chat_message_reactions,
  -- group_discussions, discussion_post_reactions, announcements, announcement_deliveries,
  -- global_announcements, group_events, event_rsvps, group_recurring_meetings,
  -- in_app_notifications, app_roles, assignments, submissions (reviewed_by_user_id -> SET
  -- NULL, preserving grading history), groups.created_by_user_id (-> SET NULL, part 1
  -- above). No explicit handling needed for any of them.
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
