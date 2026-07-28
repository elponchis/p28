-- Platform super_admins may act as group admins in every group (same DB permissions as a
-- group_admins row). Client: isUserGroupAdmin also returns true for super_admin.

CREATE OR REPLACE FUNCTION public.current_user_is_effective_group_admin(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.group_admins ga
      WHERE ga.group_id = p_group_id AND ga.user_id = auth.uid()
    )
    OR public.current_user_is_super_admin();
$$;

REVOKE ALL ON FUNCTION public.current_user_is_effective_group_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_effective_group_admin(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- groups: update (edit group metadata)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Group creator or group admin can update group" ON public.groups;

CREATE POLICY "Group creator or group admin can update group"
  ON public.groups FOR UPDATE
  TO authenticated
  USING (
    created_by_user_id = auth.uid()
    OR public.current_user_is_effective_group_admin(id)
  )
  WITH CHECK (
    created_by_user_id = auth.uid()
    OR public.current_user_is_effective_group_admin(id)
  );

-- ---------------------------------------------------------------------------
-- announcements
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Group admins can insert announcements" ON public.announcements;

CREATE POLICY "Group admins can insert announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_is_effective_group_admin(announcements.group_id)
    AND created_by_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Group admins can read all announcements in group" ON public.announcements;

CREATE POLICY "Group admins can read all announcements in group"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (
    public.current_user_is_effective_group_admin(announcements.group_id)
  );

-- ---------------------------------------------------------------------------
-- group_recurring_meetings
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Group admins can insert recurring meetings" ON public.group_recurring_meetings;

CREATE POLICY "Group admins can insert recurring meetings"
  ON public.group_recurring_meetings FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by_user_id = auth.uid()
    AND public.current_user_is_effective_group_admin(group_recurring_meetings.group_id)
  );

DROP POLICY IF EXISTS "Group admins can update recurring meetings" ON public.group_recurring_meetings;

CREATE POLICY "Group admins can update recurring meetings"
  ON public.group_recurring_meetings FOR UPDATE
  TO authenticated
  USING (
    public.current_user_is_effective_group_admin(group_recurring_meetings.group_id)
  )
  WITH CHECK (
    public.current_user_is_effective_group_admin(group_recurring_meetings.group_id)
  );

DROP POLICY IF EXISTS "Group admins can delete recurring meetings" ON public.group_recurring_meetings;

CREATE POLICY "Group admins can delete recurring meetings"
  ON public.group_recurring_meetings FOR DELETE
  TO authenticated
  USING (
    public.current_user_is_effective_group_admin(group_recurring_meetings.group_id)
  );

-- ---------------------------------------------------------------------------
-- RPCs: group events (current signatures from 00044)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_group_event_with_discussion(
  p_group_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_starts_at TIMESTAMPTZ,
  p_requires_rsvp BOOLEAN,
  p_location TEXT,
  p_meeting_link TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_discussion_id UUID;
  v_event_id UUID;
  v_title TEXT;
  v_desc TEXT;
  v_body TEXT;
  v_loc TEXT;
  v_link TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.current_user_is_effective_group_admin(p_group_id) THEN
    RAISE EXCEPTION 'Not a group admin';
  END IF;

  v_title := trim(p_title);
  v_desc := trim(coalesce(p_description, ''));
  v_loc := trim(coalesce(p_location, ''));
  v_link := trim(coalesce(p_meeting_link, ''));
  IF v_title = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;

  IF p_starts_at IS NULL OR p_starts_at <= now() THEN
    RAISE EXCEPTION 'Event must be in the future';
  END IF;

  v_body := left(v_desc, 500);
  IF v_body = '' THEN
    v_body := v_title;
  END IF;

  INSERT INTO public.discussions (group_id, user_id, title, body)
  VALUES (p_group_id, v_uid, v_title, v_body)
  RETURNING id INTO v_discussion_id;

  INSERT INTO public.group_events (
    group_id,
    created_by_user_id,
    title,
    description,
    starts_at,
    requires_rsvp,
    status,
    discussion_id,
    location,
    meeting_link
  )
  VALUES (
    p_group_id,
    v_uid,
    v_title,
    v_desc,
    p_starts_at,
    coalesce(p_requires_rsvp, false),
    'active',
    v_discussion_id,
    v_loc,
    v_link
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_group_event(
  p_event_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_starts_at TIMESTAMPTZ,
  p_requires_rsvp BOOLEAN,
  p_location TEXT,
  p_meeting_link TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.group_events%ROWTYPE;
  v_title TEXT;
  v_desc TEXT;
  v_body TEXT;
  v_loc TEXT;
  v_link TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row FROM public.group_events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_row.created_by_user_id <> v_uid THEN
    RAISE EXCEPTION 'Only the creator can edit this event';
  END IF;

  IF NOT public.current_user_is_effective_group_admin(v_row.group_id) THEN
    RAISE EXCEPTION 'Not a group admin';
  END IF;

  IF v_row.status <> 'active' OR v_row.starts_at <= now() THEN
    RAISE EXCEPTION 'Cannot edit this event';
  END IF;

  v_title := trim(p_title);
  v_desc := trim(coalesce(p_description, ''));
  v_loc := trim(coalesce(p_location, ''));
  v_link := trim(coalesce(p_meeting_link, ''));
  IF v_title = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;

  IF p_starts_at IS NULL OR p_starts_at <= now() THEN
    RAISE EXCEPTION 'Event must be in the future';
  END IF;

  v_body := left(v_desc, 500);
  IF v_body = '' THEN
    v_body := v_title;
  END IF;

  UPDATE public.group_events
  SET
    title = v_title,
    description = v_desc,
    starts_at = p_starts_at,
    requires_rsvp = coalesce(p_requires_rsvp, false),
    location = v_loc,
    meeting_link = v_link
  WHERE id = p_event_id;

  UPDATE public.discussions
  SET title = v_title, body = v_body
  WHERE id = v_row.discussion_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_group_event(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.group_events%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row FROM public.group_events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF NOT public.current_user_is_effective_group_admin(v_row.group_id) THEN
    RAISE EXCEPTION 'Not a group admin';
  END IF;

  IF v_row.status <> 'active' OR v_row.starts_at <= now() THEN
    RAISE EXCEPTION 'Cannot cancel this event';
  END IF;

  UPDATE public.group_events
  SET status = 'cancelled', cancelled_at = now()
  WHERE id = p_event_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- announcement_for_viewer: super_admin can load draft / unpublished for any group
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.announcement_for_viewer(p_announcement_id uuid)
RETURNS TABLE (
  id uuid,
  group_id uuid,
  created_by_user_id uuid,
  title text,
  body text,
  meeting_link text,
  status text,
  published_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.group_id,
    a.created_by_user_id,
    a.title,
    a.body,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.group_members gm
        WHERE gm.group_id = a.group_id AND gm.user_id = auth.uid()
      )
      THEN a.meeting_link
      ELSE NULL::text
    END AS meeting_link,
    a.status,
    a.published_at,
    a.cancelled_at,
    a.created_at
  FROM public.announcements a
  WHERE a.id = p_announcement_id
    AND (
      a.status = 'published'
      OR public.current_user_is_effective_group_admin(a.group_id)
    );
$$;
