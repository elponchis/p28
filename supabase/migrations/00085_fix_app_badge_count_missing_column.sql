-- get_app_badge_count has never run. It raises
--   42703: column cm.archived_at does not exist
--
-- 00061 wrote the unread-conversations term against chat_members.archived_at, and no migration
-- ever added that column -- chat_members is (chat_id, user_id, joined_at, last_read_at,
-- request_state). PL/pgSQL only resolves the reference when the body executes, so the function
-- created cleanly and then failed on every call.
--
-- What that cost: the RPC answers 400 over PostgREST, so the app icon badge never updated, and
-- every push notification carried badge 0 -- getAppBadgeCountForUser in the Edge Functions logs
-- the error and falls back to zero, which is why nothing ever looked broken.
--
-- The fix is to drop the condition rather than add the column: there is no archive feature, and
-- inventing a column to satisfy a filter nothing sets would be worse than deleting the filter.
-- request_state is a real column and does belong here, though: a conversation still sitting in
-- the requests inbox should not inflate the badge on the tab bar.

CREATE OR REPLACE FUNCTION public.get_app_badge_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Authenticated users may only query their own count; service_role (null auth.uid()) used from Edge Functions.
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN
    COALESCE(
      (
        SELECT COUNT(DISTINCT cm.chat_id)::int
        FROM public.chat_members cm
        WHERE cm.user_id = p_user_id
          AND cm.request_state = 'accepted'
          AND cm.last_read_at IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.chat_messages m
            WHERE m.chat_id = cm.chat_id
              AND m.user_id <> p_user_id
              AND m.created_at > cm.last_read_at
          )
      ),
      0
    )
    + COALESCE(
        (
          SELECT COUNT(*)::int
          FROM public.friend_requests fr
          WHERE fr.receiver_id = p_user_id
            AND fr.status = 'pending'
        ),
        0
      )
    + COALESCE(
        (
          SELECT COUNT(*)::int
          FROM public.in_app_notifications n
          WHERE n.user_id = p_user_id
            AND n.read_at IS NULL
            AND (
              (
                SELECT pr.notifications_badge_cleared_at
                FROM public.profiles pr
                WHERE pr.user_id = p_user_id
              ) IS NULL
              OR n.created_at
              > (
                SELECT pr.notifications_badge_cleared_at
                FROM public.profiles pr
                WHERE pr.user_id = p_user_id
              )
            )
        ),
        0
      );
END;
$$;

ALTER FUNCTION public.get_app_badge_count(uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.get_app_badge_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_app_badge_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_app_badge_count(uuid) TO service_role;
