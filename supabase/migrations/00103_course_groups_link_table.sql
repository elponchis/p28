-- A course can belong to more than one group.
--
-- Groups here are split by language and culture, and the same course is taught in several of
-- them — the material does not change because the room does. courses.group_id could only ever
-- name one, so putting a course in a second group meant taking it out of the first.
--
-- So the link becomes its own table, and group_id stops being read. The pattern is the one
-- 00095 used for group_admins: move the answer, leave the old column in place unread, and drop
-- it later once nothing has referred to it for a while.
--
-- "Public" changes shape but not meaning: it was group_id IS NULL, and it is now "no links at
-- all". The backfill preserves both — a course with a group gets one link, a course without
-- gets none — so every course is visible to exactly the same people after this as before.

-- =============================================================================
-- 1. The link
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.course_groups (
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_course_groups_group_id ON public.course_groups(group_id);

COMMENT ON TABLE public.course_groups IS
  'Which groups a course is taught in. No rows means public: anyone signed in may watch it.';

ALTER TABLE public.course_groups ENABLE ROW LEVEL SECURITY;

-- Reading a link tells you nothing you could not learn from the course itself, and the course's
-- own read policy still decides whether you see the course.
DROP POLICY IF EXISTS "Authenticated can read course groups" ON public.course_groups;
CREATE POLICY "Authenticated can read course groups"
  ON public.course_groups FOR SELECT
  TO authenticated
  USING (true);

-- Linking a course to a group decides who may watch it, so it is an app admin's to do — the same
-- people who may edit the course (00093).
DROP POLICY IF EXISTS "App admins can link courses to groups" ON public.course_groups;
CREATE POLICY "App admins can link courses to groups"
  ON public.course_groups FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_admin_or_super_admin());

DROP POLICY IF EXISTS "App admins can unlink courses from groups" ON public.course_groups;
CREATE POLICY "App admins can unlink courses from groups"
  ON public.course_groups FOR DELETE
  TO authenticated
  USING (public.current_user_is_admin_or_super_admin());

GRANT SELECT, INSERT, DELETE ON public.course_groups TO authenticated;

-- =============================================================================
-- 2. Backfill, before anything reads the new table
-- =============================================================================

INSERT INTO public.course_groups (course_id, group_id)
SELECT c.id, c.group_id
FROM public.courses c
WHERE c.group_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 3. The visibility rule asks the link table
-- =============================================================================

-- The function takes the course rather than a group id now: with several groups possible there
-- is no single group to hand it. Policies must be dropped first — they depend on the old one,
-- and the parameter name changes, which CREATE OR REPLACE will not do.
DROP POLICY IF EXISTS "Read courses you may watch" ON public.courses;
DROP POLICY IF EXISTS "Read lessons of courses you may watch" ON public.lessons;
DROP FUNCTION IF EXISTS public.current_user_can_view_course(uuid, timestamptz, timestamptz, boolean);

CREATE FUNCTION public.current_user_can_view_course(
  p_course_id uuid,
  p_available_from timestamptz,
  p_available_until timestamptz,
  p_is_published boolean DEFAULT true
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admins set the window and decide when to publish, so neither applies to them.
    public.current_user_is_admin_or_super_admin()
    OR (
      COALESCE(p_is_published, true)
      AND (p_available_from IS NULL OR p_available_from <= now())
      AND (p_available_until IS NULL OR p_available_until > now())
      AND (
        -- Linked to nothing is public, the way a NULL group_id used to be.
        NOT EXISTS (
          SELECT 1 FROM public.course_groups cg WHERE cg.course_id = p_course_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.course_groups cg
          JOIN public.group_members gm
            ON gm.group_id = cg.group_id AND gm.user_id = auth.uid()
          WHERE cg.course_id = p_course_id
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.current_user_can_view_course(uuid, timestamptz, timestamptz, boolean)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_can_view_course(uuid, timestamptz, timestamptz, boolean)
  TO authenticated;

CREATE POLICY "Read courses you may watch"
  ON public.courses FOR SELECT
  TO authenticated
  USING (
    public.current_user_can_view_course(
      courses.id,
      courses.available_from,
      courses.available_until,
      courses.is_published
    )
  );

CREATE POLICY "Read lessons of courses you may watch"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id
        AND public.current_user_can_view_course(
          c.id,
          c.available_from,
          c.available_until,
          c.is_published
        )
    )
  );

-- =============================================================================
-- 4. group_id stops being the answer
-- =============================================================================

COMMENT ON COLUMN public.courses.group_id IS
  'Historic. Nothing reads this since 00103: which groups a course belongs to lives in course_groups. Kept so the move is reversible; drop it once nothing has needed it for a while.';
