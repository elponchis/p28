-- Course content belongs to the app's administrators.
--
-- Writing a course was a group admin's right: whoever ran a group could add courses and lessons
-- to it. That made sense while a course was a thing a group made for itself. It is not what a
-- course is now — content arrives in bulk from a video library, one course can serve a training
-- school for a term, and who may watch it is a decision about the whole platform's audience
-- rather than one group's.
--
-- So writing moves to app admins, and reading does not move at all: the group-member and
-- availability rules from 00088 and 00092 are untouched. A group admin still runs their group —
-- members, announcements, events, discussions — they just do not author the video library.
--
-- A side effect worth naming: an 'admin' can now edit a course with no group, which the previous
-- rule reserved for 'super_admin' because current_user_is_effective_group_admin(NULL) is false.
-- Unassigned courses are exactly what an import produces, so the people meant to assign them
-- could not touch them.

-- =============================================================================
-- courses
-- =============================================================================

DROP POLICY IF EXISTS "Group admins can insert courses" ON public.courses;
DROP POLICY IF EXISTS "Group admins can update courses" ON public.courses;
DROP POLICY IF EXISTS "Group admins can delete courses" ON public.courses;

CREATE POLICY "App admins can insert courses"
  ON public.courses FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_admin_or_super_admin());

CREATE POLICY "App admins can update courses"
  ON public.courses FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin_or_super_admin())
  WITH CHECK (public.current_user_is_admin_or_super_admin());

CREATE POLICY "App admins can delete courses"
  ON public.courses FOR DELETE
  TO authenticated
  USING (public.current_user_is_admin_or_super_admin());

-- =============================================================================
-- lessons
-- =============================================================================

DROP POLICY IF EXISTS "Group admins can insert lessons" ON public.lessons;
DROP POLICY IF EXISTS "Group admins can update lessons" ON public.lessons;
DROP POLICY IF EXISTS "Group admins can delete lessons" ON public.lessons;

CREATE POLICY "App admins can insert lessons"
  ON public.lessons FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_admin_or_super_admin());

CREATE POLICY "App admins can update lessons"
  ON public.lessons FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin_or_super_admin())
  WITH CHECK (public.current_user_is_admin_or_super_admin());

CREATE POLICY "App admins can delete lessons"
  ON public.lessons FOR DELETE
  TO authenticated
  USING (public.current_user_is_admin_or_super_admin());
