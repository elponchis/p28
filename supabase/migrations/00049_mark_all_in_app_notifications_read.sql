-- When mark_in_app_notifications_read is called with no specific target, mark all unread rows for the user.

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
