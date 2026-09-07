-- A course that exists but has not been opened yet.
--
-- Until now a course said who may watch it with one field: a group id, or NULL meaning everyone.
-- That conflated two different states. Importing a term's worth of video leaves courses that are
-- assembled but not yet assigned to anyone, and under the old rule those land as NULL — which is
-- to say, published to the entire congregation the moment the rows are written.
--
-- So publication becomes its own answer. An unpublished course is visible to admins only, at any
-- date, which is what makes an import safe and gives the person assigning groups and terms
-- something to do before anyone else can see the result.
--
--   is_published = false  -> admins only, whatever the group and dates say
--   is_published = true   -> the rule 00088 already describes: public or group, inside the window
--
-- Existing rows are published: they were visible before this migration and nothing about them
-- has changed.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.courses
  ALTER COLUMN is_published SET DEFAULT false;

COMMENT ON COLUMN public.courses.is_published IS
  'False while a course is being assembled: admins can see it, nobody else can, regardless of group or dates. Set true to open it.';

-- =============================================================================
-- The visibility rule gains one clause. Everything else about it is unchanged.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.current_user_can_view_course(
  p_group_id uuid,
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
    public.current_user_is_super_admin()
    OR (
      p_group_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.group_admins ga
        WHERE ga.group_id = p_group_id AND ga.user_id = auth.uid()
      )
    )
    OR (
      COALESCE(p_is_published, true)
      AND (p_available_from IS NULL OR p_available_from <= now())
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

REVOKE ALL ON FUNCTION public.current_user_can_view_course(uuid, timestamptz, timestamptz, boolean)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_can_view_course(uuid, timestamptz, timestamptz, boolean)
  TO authenticated;

DROP POLICY IF EXISTS "Read courses you may watch" ON public.courses;

CREATE POLICY "Read courses you may watch"
  ON public.courses FOR SELECT
  TO authenticated
  USING (
    public.current_user_can_view_course(
      courses.group_id,
      courses.available_from,
      courses.available_until,
      courses.is_published
    )
  );

DROP POLICY IF EXISTS "Read lessons of courses you may watch" ON public.lessons;

CREATE POLICY "Read lessons of courses you may watch"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id
        AND public.current_user_can_view_course(
          c.group_id,
          c.available_from,
          c.available_until,
          c.is_published
        )
    )
  );

-- The three-argument version is what the policies used before this migration; nothing should
-- call it now, and leaving it would be a second answer to the same question.
DROP FUNCTION IF EXISTS public.current_user_can_view_course(uuid, timestamptz, timestamptz);
