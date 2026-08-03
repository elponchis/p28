-- Assignments backend: assignments (group-scoped) -> submissions (one per student, overwritten
-- on resubmit). Core guarantees enforced server-side, not just in the UI:
--   1. Students cannot tamper with feedback/score/reviewed_* (trigger, regardless of RLS path).
--   2. Submissions/resubmissions are blocked once an assignment's due_date has passed
--      (RLS WITH CHECK, joined through assignments) — admins can still grade past due date.

-- =============================================================================
-- 1. Tables
-- =============================================================================

CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assignments_group_id_sort_order ON public.assignments(group_id, sort_order ASC);

CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  feedback TEXT,
  score INTEGER,
  reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  UNIQUE (assignment_id, user_id)
);

CREATE INDEX idx_submissions_assignment_id ON public.submissions(assignment_id);
CREATE INDEX idx_submissions_user_id ON public.submissions(user_id);

-- =============================================================================
-- 2. updated_at trigger for assignments (matches set_courses_updated_at convention;
--    submissions has no updated_at column — submitted_at is set explicitly by the app
--    on every insert/resubmit instead).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_assignments_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_assignments_updated_at();

-- =============================================================================
-- 3. Trigger: protect submissions.feedback/score/reviewed_* from student tampering.
--    Runs on every INSERT/UPDATE regardless of which RLS policy matched — if the
--    calling user is not an effective group admin of the assignment's group, those
--    four columns are always forced to NULL. This also means a student resubmission
--    naturally clears any prior feedback (the old grading no longer applies to new
--    content), not just blocks a malicious payload.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.protect_submission_review_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = NEW.assignment_id
      AND public.current_user_is_effective_group_admin(a.group_id)
  ) THEN
    NEW.feedback := NULL;
    NEW.score := NULL;
    NEW.reviewed_by_user_id := NULL;
    NEW.reviewed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER submissions_protect_review_fields
  BEFORE INSERT OR UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_submission_review_fields();

-- =============================================================================
-- 4. RLS: assignments
--    Select -> group members. Write -> effective group admins (same pattern as
--    00067_lms.sql's courses/lessons).
-- =============================================================================

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can read assignments"
  ON public.assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = assignments.group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can insert assignments"
  ON public.assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by_user_id = auth.uid()
    AND public.current_user_is_effective_group_admin(assignments.group_id)
  );

CREATE POLICY "Group admins can update assignments"
  ON public.assignments FOR UPDATE
  TO authenticated
  USING (public.current_user_is_effective_group_admin(assignments.group_id))
  WITH CHECK (public.current_user_is_effective_group_admin(assignments.group_id));

CREATE POLICY "Group admins can delete assignments"
  ON public.assignments FOR DELETE
  TO authenticated
  USING (public.current_user_is_effective_group_admin(assignments.group_id));

-- =============================================================================
-- 5. RLS: submissions
--    Select   -> owner or the assignment's group admin.
--    Insert   -> owner, group member, and only before the assignment's due_date
--                (or no due_date at all). Review columns are handled by the
--                trigger above, not here.
--    Update   -> two separate policies (permissive; PostgreSQL ORs them):
--                (a) owner, same due-date gate as insert (resubmission)
--                (b) group admin, no due-date gate (grading after the deadline
--                    must still be possible).
--    Delete   -> owner or group admin.
-- =============================================================================

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or group admin can read submissions"
  ON public.submissions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = submissions.assignment_id
        AND public.current_user_is_effective_group_admin(a.group_id)
    )
  );

CREATE POLICY "Members can insert own submission before due date"
  ON public.submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.group_members gm ON gm.group_id = a.group_id AND gm.user_id = auth.uid()
      WHERE a.id = submissions.assignment_id
        AND (a.due_date IS NULL OR now() <= a.due_date)
    )
  );

CREATE POLICY "Members can update own submission before due date"
  ON public.submissions FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.group_members gm ON gm.group_id = a.group_id AND gm.user_id = auth.uid()
      WHERE a.id = submissions.assignment_id
        AND (a.due_date IS NULL OR now() <= a.due_date)
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.group_members gm ON gm.group_id = a.group_id AND gm.user_id = auth.uid()
      WHERE a.id = submissions.assignment_id
        AND (a.due_date IS NULL OR now() <= a.due_date)
    )
  );

CREATE POLICY "Group admins can update submission review fields"
  ON public.submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = submissions.assignment_id
        AND public.current_user_is_effective_group_admin(a.group_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = submissions.assignment_id
        AND public.current_user_is_effective_group_admin(a.group_id)
    )
  );

CREATE POLICY "Owner or group admin can delete submissions"
  ON public.submissions FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = submissions.assignment_id
        AND public.current_user_is_effective_group_admin(a.group_id)
    )
  );

-- =============================================================================
-- 6. Storage: private bucket for submission files.
--    Path convention: {assignment_id}/{user_id}/{filename} (mirrors the
--    {userId}/{filename} self-path pattern from 00013_group_banners_storage.sql,
--    with an extra assignment_id segment). Private (not public): only the owner
--    or the assignment's group admin can read (and therefore get a signed URL).
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignment-submissions',
  'assignment-submissions',
  false,
  52428800,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Students can upload own submission file"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'assignment-submissions'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Students can update own submission file"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'assignment-submissions'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Students can delete own submission file"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'assignment-submissions'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Owner or group admin can read submission file"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'assignment-submissions'
    AND (
      (storage.foldername(name))[2] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.assignments a
        WHERE a.id::text = (storage.foldername(name))[1]
          AND public.current_user_is_effective_group_admin(a.group_id)
      )
    )
  );
