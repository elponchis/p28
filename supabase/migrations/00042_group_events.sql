-- Group events with per-event discussion thread and optional RSVP.

-- =============================================================================
-- 1. Tables
-- =============================================================================

CREATE TABLE public.group_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ NOT NULL,
  requires_rsvp BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  cancelled_at TIMESTAMPTZ,
  discussion_id UUID NOT NULL UNIQUE REFERENCES public.discussions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_group_events_group_id_starts_at ON public.group_events(group_id, starts_at ASC);

CREATE TABLE public.event_rsvps (
  event_id UUID NOT NULL REFERENCES public.group_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response TEXT NOT NULL CHECK (response IN ('going', 'maybe', 'not_going')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX idx_event_rsvps_event_id ON public.event_rsvps(event_id);

CREATE OR REPLACE FUNCTION public.set_event_rsvps_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_event_rsvps_updated_at
  BEFORE UPDATE ON public.event_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION public.set_event_rsvps_updated_at();

-- =============================================================================
-- 2. RPC: create (discussion + event, admin only)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_group_event_with_discussion(
  p_group_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_starts_at TIMESTAMPTZ,
  p_requires_rsvp BOOLEAN
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
    discussion_id
  )
  VALUES (
    p_group_id,
    v_uid,
    v_title,
    v_desc,
    p_starts_at,
    coalesce(p_requires_rsvp, false),
    'active',
    v_discussion_id
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- =============================================================================
-- 3. RPC: update (creator + admin, future active event)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_group_event(
  p_event_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_starts_at TIMESTAMPTZ,
  p_requires_rsvp BOOLEAN
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
    requires_rsvp = coalesce(p_requires_rsvp, false)
  WHERE id = p_event_id;

  UPDATE public.discussions
  SET title = v_title, body = v_body
  WHERE id = v_row.discussion_id;
END;
$$;

-- =============================================================================
-- 4. RPC: cancel (any group admin, future active event)
-- =============================================================================

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

  IF NOT EXISTS (
    SELECT 1 FROM public.group_admins ga
    WHERE ga.group_id = v_row.group_id AND ga.user_id = v_uid
  ) THEN
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

GRANT EXECUTE ON FUNCTION public.create_group_event_with_discussion(UUID, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_group_event(UUID, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_group_event(UUID) TO authenticated;

-- =============================================================================
-- 5. RLS: group_events (read by members; writes via RPC only)
-- =============================================================================

ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can read group events"
  ON public.group_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_events.group_id AND gm.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 6. RLS: event_rsvps
-- =============================================================================

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can read event rsvps"
  ON public.event_rsvps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_events ge
      JOIN public.group_members gm ON gm.group_id = ge.group_id AND gm.user_id = auth.uid()
      WHERE ge.id = event_rsvps.event_id
    )
  );

CREATE POLICY "Members can insert own rsvp when allowed"
  ON public.event_rsvps FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.group_events ge
      JOIN public.group_members gm ON gm.group_id = ge.group_id AND gm.user_id = auth.uid()
      WHERE ge.id = event_rsvps.event_id
        AND ge.requires_rsvp = true
        AND ge.status = 'active'
        AND ge.starts_at > now()
    )
  );

CREATE POLICY "Members can update own rsvp when allowed"
  ON public.event_rsvps FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.group_events ge
      JOIN public.group_members gm ON gm.group_id = ge.group_id AND gm.user_id = auth.uid()
      WHERE ge.id = event_rsvps.event_id
        AND ge.requires_rsvp = true
        AND ge.status = 'active'
        AND ge.starts_at > now()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.group_events ge
      JOIN public.group_members gm ON gm.group_id = ge.group_id AND gm.user_id = auth.uid()
      WHERE ge.id = event_rsvps.event_id
        AND ge.requires_rsvp = true
        AND ge.status = 'active'
        AND ge.starts_at > now()
    )
  );

CREATE POLICY "Members can delete own rsvp when allowed"
  ON public.event_rsvps FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.group_events ge
      JOIN public.group_members gm ON gm.group_id = ge.group_id AND gm.user_id = auth.uid()
      WHERE ge.id = event_rsvps.event_id
        AND ge.requires_rsvp = true
        AND ge.status = 'active'
        AND ge.starts_at > now()
    )
  );

GRANT SELECT ON public.group_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_rsvps TO authenticated;
