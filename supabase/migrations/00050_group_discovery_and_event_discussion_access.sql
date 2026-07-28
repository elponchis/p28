-- 1) Exclude event shadow threads from "forum" discussion lists for non-members:
--    getDiscussions used to read group_events.discussion_id via RLS, but members-only
--    SELECT on group_events returned no rows for non-members, so those IDs were not excluded.
-- 2) Published announcements + all group events readable by any authenticated user for discovery,
--    with meeting_link redacted unless the user is a group member.
-- 3) Event-linked discussion rows and their posts: require group membership to read.

-- =============================================================================
-- A. RPC: discussion IDs linked to group events (for client-side exclusion)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.discovery_group_event_discussion_ids(p_group_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ge.discussion_id
  FROM public.group_events ge
  WHERE ge.group_id = p_group_id
    AND ge.discussion_id IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.discovery_group_event_discussion_ids(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.discovery_group_event_discussion_ids(uuid) TO authenticated;

-- =============================================================================
-- B. RPCs: published announcements / events without leaking meeting_link to non-members
-- =============================================================================

CREATE OR REPLACE FUNCTION public.discovery_published_announcements_for_group(p_group_id uuid)
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
    NULL::text AS meeting_link,
    a.status,
    a.published_at,
    a.cancelled_at,
    a.created_at
  FROM public.announcements a
  WHERE a.group_id = p_group_id
    AND a.status = 'published'
  ORDER BY a.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.discovery_published_announcements_for_group(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.discovery_published_announcements_for_group(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.discovery_group_events_for_group(p_group_id uuid)
RETURNS TABLE (
  id uuid,
  group_id uuid,
  created_by_user_id uuid,
  title text,
  description text,
  starts_at timestamptz,
  requires_rsvp boolean,
  status text,
  cancelled_at timestamptz,
  discussion_id uuid,
  created_at timestamptz,
  location text,
  meeting_link text,
  going_count integer,
  maybe_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ge.id,
    ge.group_id,
    ge.created_by_user_id,
    ge.title,
    ge.description,
    ge.starts_at,
    ge.requires_rsvp,
    ge.status,
    ge.cancelled_at,
    ge.discussion_id,
    ge.created_at,
    ge.location,
    NULL::text AS meeting_link,
    (
      SELECT COUNT(*)::integer
      FROM public.event_rsvps er
      WHERE er.event_id = ge.id AND er.response = 'going'
    ) AS going_count,
    (
      SELECT COUNT(*)::integer
      FROM public.event_rsvps er
      WHERE er.event_id = ge.id AND er.response = 'maybe'
    ) AS maybe_count
  FROM public.group_events ge
  WHERE ge.group_id = p_group_id
  ORDER BY ge.starts_at ASC, ge.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.discovery_group_events_for_group(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.discovery_group_events_for_group(uuid) TO authenticated;

-- =============================================================================
-- C. Single-row viewers (meeting_link only for members; correct visibility)
-- =============================================================================

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
      OR EXISTS (
        SELECT 1
        FROM public.group_admins ga
        WHERE ga.group_id = a.group_id AND ga.user_id = auth.uid()
      )
    );
$$;

REVOKE ALL ON FUNCTION public.announcement_for_viewer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.announcement_for_viewer(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.group_event_for_viewer(p_event_id uuid)
RETURNS TABLE (
  id uuid,
  group_id uuid,
  created_by_user_id uuid,
  title text,
  description text,
  starts_at timestamptz,
  requires_rsvp boolean,
  status text,
  cancelled_at timestamptz,
  discussion_id uuid,
  created_at timestamptz,
  location text,
  meeting_link text,
  going_count integer,
  maybe_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ge.id,
    ge.group_id,
    ge.created_by_user_id,
    ge.title,
    ge.description,
    ge.starts_at,
    ge.requires_rsvp,
    ge.status,
    ge.cancelled_at,
    ge.discussion_id,
    ge.created_at,
    ge.location,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.group_members gm
        WHERE gm.group_id = ge.group_id AND gm.user_id = auth.uid()
      )
      THEN ge.meeting_link
      ELSE NULL::text
    END AS meeting_link,
    (
      SELECT COUNT(*)::integer
      FROM public.event_rsvps er
      WHERE er.event_id = ge.id AND er.response = 'going'
    ) AS going_count,
    (
      SELECT COUNT(*)::integer
      FROM public.event_rsvps er
      WHERE er.event_id = ge.id AND er.response = 'maybe'
    ) AS maybe_count
  FROM public.group_events ge
  WHERE ge.id = p_event_id;
$$;

REVOKE ALL ON FUNCTION public.group_event_for_viewer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.group_event_for_viewer(uuid) TO authenticated;

-- =============================================================================
-- D. RLS: event-linked discussions readable only by group members
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated can read discussions" ON public.discussions;

CREATE POLICY "Authenticated can read discussions"
  ON public.discussions FOR SELECT
  TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1
      FROM public.group_events ge
      WHERE ge.discussion_id = discussions.id
    )
    OR EXISTS (
      SELECT 1
      FROM public.group_members gm
      WHERE gm.group_id = discussions.group_id AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated can read discussion posts" ON public.discussion_posts;

CREATE POLICY "Authenticated can read discussion posts"
  ON public.discussion_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.discussions d
      WHERE d.id = discussion_posts.discussion_id
        AND (
          NOT EXISTS (
            SELECT 1
            FROM public.group_events ge
            WHERE ge.discussion_id = d.id
          )
          OR EXISTS (
            SELECT 1
            FROM public.group_members gm
            WHERE gm.group_id = d.group_id AND gm.user_id = auth.uid()
          )
        )
    )
  );
