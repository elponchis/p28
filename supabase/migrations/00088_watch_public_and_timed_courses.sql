-- Watch: one place to see the videos you are allowed to see.
--
-- Built on the courses/lessons tables the LMS already uses rather than beside them, so a course
-- put together for a training school is the same row the Watch tab lists and nobody has to
-- publish a video twice. Three changes are enough:
--
--   1. a group can be a training school
--   2. a course can belong to no group, which is what makes it public
--   3. a course can be available only between two dates
--
-- Who may watch what then falls out of one function, used by both tables' read policies:
--   public course, window open  -> everyone signed in
--   group course, window open   -> that group's members
--   any course, any window      -> that group's admins, and platform super admins
--
-- Outside its window a course is not "locked", it is gone: the row does not come back from a
-- select at all, which is both simpler to reason about and impossible to work around from a
-- client.

-- =============================================================================
-- 1. Groups: a third kind
-- =============================================================================

ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_type_check;

ALTER TABLE public.groups
  ADD CONSTRAINT groups_type_check CHECK (type IN ('forum', 'ministry', 'training_school'));

-- =============================================================================
-- 2. Courses: optional group, optional availability window
-- =============================================================================

ALTER TABLE public.courses ALTER COLUMN group_id DROP NOT NULL;

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS available_from TIMESTAMPTZ;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS available_until TIMESTAMPTZ;

ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_available_window_check;

ALTER TABLE public.courses
  ADD CONSTRAINT courses_available_window_check
  CHECK (available_from IS NULL OR available_until IS NULL OR available_until > available_from);

-- The Watch tab's public shelf reads exactly these rows.
CREATE INDEX IF NOT EXISTS idx_courses_public_sort_order
  ON public.courses(sort_order ASC)
  WHERE group_id IS NULL;

COMMENT ON COLUMN public.courses.group_id IS
  'The group whose members may watch this course. NULL means public: anyone signed in may watch.';
COMMENT ON COLUMN public.courses.available_from IS
  'Watchable from this moment; NULL means from the start. Admins are not bound by it.';
COMMENT ON COLUMN public.courses.available_until IS
  'Watchable until this moment; NULL means indefinitely. Admins are not bound by it.';

-- =============================================================================
-- 3. The visibility rule, in one place
-- =============================================================================

-- SECURITY DEFINER so the membership lookups it makes are not themselves subject to RLS: the
-- function answers one boolean about the caller and leaks nothing else, and a policy that reads
-- a policied table is how the chat_members recursion happened.
CREATE OR REPLACE FUNCTION public.current_user_can_view_course(
  p_group_id uuid,
  p_available_from timestamptz,
  p_available_until timestamptz
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admins set the window, so the window does not apply to them.
    public.current_user_is_super_admin()
    OR (
      p_group_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.group_admins ga
        WHERE ga.group_id = p_group_id AND ga.user_id = auth.uid()
      )
    )
    OR (
      (p_available_from IS NULL OR p_available_from <= now())
      AND (p_available_until IS NULL OR p_available_until > now())
      AND (
        p_group_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.group_members gm
          WHERE gm.group_id = p_group_id AND gm.user_id = auth.uid()
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.current_user_can_view_course(uuid, timestamptz, timestamptz)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_can_view_course(uuid, timestamptz, timestamptz)
  TO authenticated;

-- =============================================================================
-- 4. Read policies follow that rule
--    Write policies are left as they are: current_user_is_effective_group_admin is false for a
--    NULL group and true for a super admin, so a public course is a super admin's to edit.
-- =============================================================================

DROP POLICY IF EXISTS "Group members can read courses" ON public.courses;

CREATE POLICY "Read courses you may watch"
  ON public.courses FOR SELECT
  TO authenticated
  USING (
    public.current_user_can_view_course(
      courses.group_id,
      courses.available_from,
      courses.available_until
    )
  );

DROP POLICY IF EXISTS "Group members can read lessons" ON public.lessons;

CREATE POLICY "Read lessons of courses you may watch"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id
        AND public.current_user_can_view_course(c.group_id, c.available_from, c.available_until)
    )
  );
