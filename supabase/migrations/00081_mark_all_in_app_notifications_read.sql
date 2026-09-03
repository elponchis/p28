-- mark_in_app_notifications_read: with no target given, mark every unread row for the user.
--
-- Same story as 00080. This was written as 00049b_mark_all_in_app_notifications_read.sql,
-- which `supabase db push` skips for its non-numeric prefix, so the remote function is still
-- the 00046 body. Verified rather than assumed: pg_proc.prosrc on the linked project ends at
-- the group_event branch, with no trailing catch-all UPDATE. A call with all three arguments
-- NULL therefore updates nothing.
--
-- Nothing is broken today -- all three call sites pass a specific target
-- (app/(tabs)/notifications/index.tsx:33, app/group/announcement/[id].tsx:51,
-- app/group/event/[id]/index.tsx:65) -- so this closes the gap before a "mark all read"
-- control is added and quietly does nothing.
--
-- Body is 00049b verbatim. CREATE OR REPLACE preserves the owner and the grants set in 00046.
CREATE OR REPLACE FUNCTION public.mark_in_app_notifications_read(
  p_notification_ids UUID[] DEFAULT NULL,
  p_announcement_id UUID DEFAULT NULL,
  p_group_event_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_len INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_len := COALESCE(array_length(p_notification_ids, 1), 0);
  IF v_len > 0 THEN
    UPDATE public.in_app_notifications
    SET read_at = now()
    WHERE user_id = v_uid
      AND id = ANY (p_notification_ids)
      AND read_at IS NULL;
    RETURN;
  END IF;

  IF p_announcement_id IS NOT NULL THEN
    UPDATE public.in_app_notifications
    SET read_at = now()
    WHERE user_id = v_uid
      AND kind = 'announcement'
      AND announcement_id = p_announcement_id
      AND read_at IS NULL;
    RETURN;
  END IF;

  IF p_group_event_id IS NOT NULL THEN
    UPDATE public.in_app_notifications
    SET read_at = now()
    WHERE user_id = v_uid
      AND kind = 'group_event'
      AND group_event_id = p_group_event_id
      AND read_at IS NULL;
    RETURN;
  END IF;

  UPDATE public.in_app_notifications
  SET read_at = now()
  WHERE user_id = v_uid
    AND read_at IS NULL;
END;
$$;
