-- LMS backend: courses -> lessons (2 levels), scoped to an existing group.
-- Video is an embedded YouTube/Vimeo URL (lessons.video_url text); no file upload,
-- no progress tracking (both explicitly out of scope for this pass).

-- =============================================================================
-- 1. Tables
-- =============================================================================

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_courses_group_id_sort_order ON public.courses(group_id, sort_order ASC);

CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lessons_course_id_sort_order ON public.lessons(course_id, sort_order ASC);

-- =============================================================================
-- 2. updated_at triggers (per-table function, matching existing convention
--    e.g. set_discussions_updated_at / set_event_rsvps_updated_at)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_courses_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_courses_updated_at();

CREATE OR REPLACE FUNCTION public.set_lessons_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.set_lessons_updated_at();

-- =============================================================================
-- 3. RLS: courses
--    Select  -> group members (same public.group_members EXISTS check used by
--               group_discussions / group_events).
--    Write   -> effective group admins (public.current_user_is_effective_group_admin,
--               defined in 00059_super_admin_effective_group_admin.sql; true for a
--               group_admins row OR a platform super_admin, same as groups/announcements
--               /group_recurring_meetings write policies).
-- =============================================================================

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can read courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = courses.group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can insert courses"
  ON public.courses FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_is_effective_group_admin(courses.group_id)
  );

CREATE POLICY "Group admins can update courses"
  ON public.courses FOR UPDATE
  TO authenticated
  USING (
    public.current_user_is_effective_group_admin(courses.group_id)
  )
  WITH CHECK (
    public.current_user_is_effective_group_admin(courses.group_id)
  );

CREATE POLICY "Group admins can delete courses"
  ON public.courses FOR DELETE
  TO authenticated
  USING (
    public.current_user_is_effective_group_admin(courses.group_id)
  );

-- =============================================================================
-- 4. RLS: lessons
--    Same member-read / admin-write pattern, scoped through the parent course's
--    group_id (lessons have no group_id column of their own).
-- =============================================================================

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can read lessons"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      JOIN public.group_members gm ON gm.group_id = c.group_id AND gm.user_id = auth.uid()
      WHERE c.id = lessons.course_id
    )
  );

CREATE POLICY "Group admins can insert lessons"
  ON public.lessons FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id
        AND public.current_user_is_effective_group_admin(c.group_id)
    )
  );

CREATE POLICY "Group admins can update lessons"
  ON public.lessons FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id
        AND public.current_user_is_effective_group_admin(c.group_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id
        AND public.current_user_is_effective_group_admin(c.group_id)
    )
  );

CREATE POLICY "Group admins can delete lessons"
  ON public.lessons FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id
        AND public.current_user_is_effective_group_admin(c.group_id)
    )
  );
