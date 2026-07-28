-- Optional event location (address or venue name).

ALTER TABLE public.group_events
  ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '';

-- Replace RPCs: add p_location (last argument).
DROP FUNCTION IF EXISTS public.create_group_event_with_discussion(uuid, text, text, timestamptz, boolean);
DROP FUNCTION IF EXISTS public.update_group_event(uuid, text, text, timestamptz, boolean);

CREATE OR REPLACE FUNCTION public.create_group_event_with_discussion(
  p_group_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_starts_at TIMESTAMPTZ,
  p_requires_rsvp BOOLEAN,
  p_location TEXT
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
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.group_admins ga
    WHERE ga.group_id = p_group_id AND ga.user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Not a group admin';
  END IF;

  v_title := trim(p_title);
  v_desc := trim(coalesce(p_description, ''));
  v_loc := trim(coalesce(p_location, ''));
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
    location
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
    v_loc
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
  p_location TEXT
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

  IF NOT EXISTS (
    SELECT 1 FROM public.group_admins ga
    WHERE ga.group_id = v_row.group_id AND ga.user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Not a group admin';
  END IF;

  IF v_row.status <> 'active' OR v_row.starts_at <= now() THEN
    RAISE EXCEPTION 'Cannot edit this event';
  END IF;

  v_title := trim(p_title);
  v_desc := trim(coalesce(p_description, ''));
  v_loc := trim(coalesce(p_location, ''));
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
    location = v_loc
  WHERE id = p_event_id;

  UPDATE public.discussions
  SET title = v_title, body = v_body
  WHERE id = v_row.discussion_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_group_event_with_discussion(UUID, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_group_event(UUID, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT) TO authenticated;
