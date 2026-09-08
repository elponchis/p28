-- Dismissing a notification is the reader's decision, not a side effect of reading it.
--
-- Reading marks a row read, which is what the badge counts; the row itself stays in the list.
-- Until now there was no way to get rid of one, so the list only ever grew and the only lever a
-- reader had was the one that fires by accident — opening the thing.
--
-- Two ways out, both scoped to the caller's own rows: dismiss the ones you name, or clear the
-- lot. Delete rather than a "dismissed_at" column: a notification is a nudge about something
-- that still exists elsewhere — the message, the announcement — and keeping a tombstone of a
-- nudge is keeping a record nobody will ever read.

CREATE OR REPLACE FUNCTION public.dismiss_in_app_notifications(p_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_deleted INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  DELETE FROM public.in_app_notifications
   WHERE user_id = v_uid
     AND id = ANY (p_ids);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_in_app_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_deleted INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.in_app_notifications WHERE user_id = v_uid;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

ALTER FUNCTION public.dismiss_in_app_notifications(UUID[]) OWNER TO postgres;
ALTER FUNCTION public.clear_in_app_notifications() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.dismiss_in_app_notifications(UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_in_app_notifications() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.dismiss_in_app_notifications(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_in_app_notifications() TO authenticated;
