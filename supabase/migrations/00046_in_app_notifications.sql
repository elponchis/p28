-- In-app notifications for group announcements and events (tab list + unread badge).

CREATE TABLE public.in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('announcement', 'group_event')),
  announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
  group_event_id UUID REFERENCES public.group_events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  CONSTRAINT in_app_notifications_ref_check CHECK (
    (kind = 'announcement' AND announcement_id IS NOT NULL AND group_event_id IS NULL)
    OR (kind = 'group_event' AND group_event_id IS NOT NULL AND announcement_id IS NULL)
  )
);

CREATE INDEX idx_in_app_notifications_user_created
  ON public.in_app_notifications(user_id, created_at DESC);

CREATE INDEX idx_in_app_notifications_user_unread
  ON public.in_app_notifications(user_id)
  WHERE read_at IS NULL;

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own in-app notifications"
  ON public.in_app_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON public.in_app_notifications TO authenticated;

-- =============================================================================
-- Mark read (SECURITY DEFINER; no client UPDATE on table)
-- =============================================================================

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
END;
$$;

ALTER FUNCTION public.mark_in_app_notifications_read(UUID[], UUID, UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.mark_in_app_notifications_read(UUID[], UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_in_app_notifications_read(UUID[], UUID, UUID) TO authenticated;

-- =============================================================================
-- Triggers: notify group members (exclude author)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_in_app_notifications_for_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary TEXT;
  v_group_name TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;

  SELECT g.name INTO v_group_name FROM public.groups g WHERE g.id = NEW.group_id;
  IF v_group_name IS NULL THEN
    v_group_name := '';
  END IF;

  v_summary := left(btrim(regexp_replace(NEW.body, '[[:space:]]+', ' ', 'g')), 280);
  IF v_summary IS NULL OR v_summary = '' THEN
    v_summary := NEW.title;
  END IF;

  INSERT INTO public.in_app_notifications (
    user_id, group_id, group_name, kind, announcement_id, group_event_id, title, summary
  )
  SELECT
    gm.user_id,
    NEW.group_id,
    v_group_name,
    'announcement'::TEXT,
    NEW.id,
    NULL::UUID,
    NEW.title,
    v_summary
  FROM public.group_members gm
  WHERE gm.group_id = NEW.group_id
    AND gm.user_id IS DISTINCT FROM NEW.created_by_user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_announcements_in_app_notify
  AFTER INSERT ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.create_in_app_notifications_for_announcement();

CREATE OR REPLACE FUNCTION public.create_in_app_notifications_for_group_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary TEXT;
  v_group_name TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  SELECT g.name INTO v_group_name FROM public.groups g WHERE g.id = NEW.group_id;
  IF v_group_name IS NULL THEN
    v_group_name := '';
  END IF;

  v_summary := left(NULLIF(btrim(NEW.description), ''), 280);
  IF v_summary IS NULL OR v_summary = '' THEN
    v_summary := to_char(NEW.starts_at AT TIME ZONE 'UTC', 'Mon DD, YYYY HH24:MI') || ' UTC';
  END IF;

  INSERT INTO public.in_app_notifications (
    user_id, group_id, group_name, kind, announcement_id, group_event_id, title, summary
  )
  SELECT
    gm.user_id,
    NEW.group_id,
    v_group_name,
    'group_event'::TEXT,
    NULL::UUID,
    NEW.id,
    NEW.title,
    v_summary
  FROM public.group_members gm
  WHERE gm.group_id = NEW.group_id
    AND gm.user_id IS DISTINCT FROM NEW.created_by_user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_group_events_in_app_notify
  AFTER INSERT ON public.group_events
  FOR EACH ROW
  EXECUTE FUNCTION public.create_in_app_notifications_for_group_event();
