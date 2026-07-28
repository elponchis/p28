-- App icon badge: persist Notifications-tab visit time for server/push parity; RPC for total unread badge.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notifications_badge_cleared_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.notifications_badge_cleared_at IS
  'When the user last focused the Notifications tab; in-app notification tab badge counts rows created after this.';

-- Total unread for app icon: unread conversations + pending friend requests + in-app rows (same semantics as client).
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
          AND cm.archived_at IS NULL
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
