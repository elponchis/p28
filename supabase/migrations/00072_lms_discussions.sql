-- LMS discussions: reuse the existing discussions/discussion_posts (Reddit-style topics +
-- replies) for two new scopes, via nullable course_id/lesson_id columns on discussions:
--   - course_id set, lesson_id null -> one shared discussion board per course
--   - course_id + lesson_id set     -> Q&A thread(s) under a specific lesson
--   - both null                     -> unchanged: general group discussion (today's behavior)
--
-- group_id stays NOT NULL and must still match the course's group_id (validated by trigger
-- below), so every existing group-membership-based RLS check on discussions/discussion_posts
-- keeps working unmodified. Only the SELECT policies gain a course/lesson visibility clause,
-- mirroring the existing group_events-linked-discussion clause added in 00050.

-- =============================================================================
-- 1. Columns + indexes
-- =============================================================================

ALTER TABLE public.discussions
  ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  ADD COLUMN lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE;

CREATE INDEX idx_discussions_course_id_created_at
  ON public.discussions(course_id, created_at DESC)
  WHERE course_id IS NOT NULL;

CREATE INDEX idx_discussions_lesson_id_created_at
  ON public.discussions(lesson_id, created_at DESC)
  WHERE lesson_id IS NOT NULL;

-- =============================================================================
-- 2. Trigger: keep course_id/lesson_id/group_id mutually consistent.
--    - lesson_id set -> course_id must match (or is auto-filled if omitted)
--    - course_id set -> group_id must match the course's group_id
--    Runs BEFORE INSERT OR UPDATE so bad data can never land in the table, regardless of
--    which app-layer path constructs the row.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_discussion_course_lesson_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_lesson_course_id UUID;
  v_course_group_id UUID;
BEGIN
  IF NEW.lesson_id IS NOT NULL THEN
    SELECT course_id INTO v_lesson_course_id FROM public.lessons WHERE id = NEW.lesson_id;
    IF v_lesson_course_id IS NULL THEN
      RAISE EXCEPTION 'lesson_id % does not reference an existing lesson', NEW.lesson_id;
    END IF;
    IF NEW.course_id IS NULL THEN
      NEW.course_id := v_lesson_course_id;
    ELSIF NEW.course_id <> v_lesson_course_id THEN
      RAISE EXCEPTION 'course_id does not match lesson''s parent course';
    END IF;
  END IF;

  IF NEW.course_id IS NOT NULL THEN
    SELECT group_id INTO v_course_group_id FROM public.courses WHERE id = NEW.course_id;
    IF v_course_group_id IS NULL THEN
      RAISE EXCEPTION 'course_id % does not reference an existing course', NEW.course_id;
    END IF;
    IF NEW.group_id <> v_course_group_id THEN
      RAISE EXCEPTION 'group_id does not match course''s group';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER discussions_validate_course_lesson_scope
  BEFORE INSERT OR UPDATE ON public.discussions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_discussion_course_lesson_scope();

-- =============================================================================
-- 3. RLS: restrict course/lesson-scoped discussions (and their posts) to group members,
--    same as event-linked discussions. Non-members can't see the parent course/lesson
--    (00067's RLS) so they must not be able to read discussions scoped to one either.
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated can read discussions" ON public.discussions;

CREATE POLICY "Authenticated can read discussions"
  ON public.discussions FOR SELECT
  TO authenticated
  USING (
    (
      NOT EXISTS (
        SELECT 1 FROM public.group_events ge WHERE ge.discussion_id = discussions.id
      )
      AND discussions.course_id IS NULL
      AND discussions.lesson_id IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
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
          (
            NOT EXISTS (
              SELECT 1 FROM public.group_events ge WHERE ge.discussion_id = d.id
            )
            AND d.course_id IS NULL
            AND d.lesson_id IS NULL
          )
          OR EXISTS (
            SELECT 1 FROM public.group_members gm
            WHERE gm.group_id = d.group_id AND gm.user_id = auth.uid()
          )
        )
    )
  );
