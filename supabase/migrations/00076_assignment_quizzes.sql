-- Quiz assignments. An assignment is now either 'file' (upload something, the original
-- behaviour) or 'quiz' (answer questions the instructor wrote). Existing rows keep the
-- file behaviour via the column default, so nothing already created changes shape.
--
-- Two guarantees are enforced here rather than in the UI:
--   1. Students can never read the answer key. Postgres RLS filters rows, not columns, so
--      the correct answers live in their own table (assignment_question_keys) whose SELECT
--      policy is admin-only -- a student's query returns zero rows instead of the answers.
--   2. Auto-scoring of multiple-choice answers happens in a trigger, so a student cannot
--      submit a payload claiming a perfect score.

-- =============================================================================
-- 1. assignments.assignment_type
-- =============================================================================

ALTER TABLE public.assignments
  ADD COLUMN assignment_type TEXT NOT NULL DEFAULT 'file'
    CHECK (assignment_type IN ('file', 'quiz'));

-- =============================================================================
-- 2. Questions. Group members read them (they have to, to answer); group admins write.
--    No correct-answer data lives here -- see assignment_question_keys below.
-- =============================================================================

CREATE TABLE public.assignment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  question_type TEXT NOT NULL
    CHECK (question_type IN ('multiple_choice', 'short_answer', 'essay')),
  -- [{ "id": "...", "text": "..." }]; empty for short_answer/essay.
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Multiple-choice only: whether more than one option may be picked.
  allow_multiple BOOLEAN NOT NULL DEFAULT false,
  points INTEGER NOT NULL DEFAULT 1 CHECK (points >= 0),
  required BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assignment_questions_assignment_id_sort_order
  ON public.assignment_questions(assignment_id, sort_order ASC);

CREATE TRIGGER assignment_questions_updated_at
  BEFORE UPDATE ON public.assignment_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_assignments_updated_at();

ALTER TABLE public.assignment_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can read assignment questions"
  ON public.assignment_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.group_members gm ON gm.group_id = a.group_id AND gm.user_id = auth.uid()
      WHERE a.id = assignment_questions.assignment_id
    )
  );

CREATE POLICY "Group admins can insert assignment questions"
  ON public.assignment_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_questions.assignment_id
        AND public.current_user_is_effective_group_admin(a.group_id)
    )
  );

CREATE POLICY "Group admins can update assignment questions"
  ON public.assignment_questions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_questions.assignment_id
        AND public.current_user_is_effective_group_admin(a.group_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_questions.assignment_id
        AND public.current_user_is_effective_group_admin(a.group_id)
    )
  );

CREATE POLICY "Group admins can delete assignment questions"
  ON public.assignment_questions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_questions.assignment_id
        AND public.current_user_is_effective_group_admin(a.group_id)
    )
  );

-- =============================================================================
-- 3. Answer key, admin-only. assignment_id is denormalised from the question so the
--    app can fetch a whole assignment's keys in one filtered query, and so this
--    table's policies don't have to join through assignment_questions.
-- =============================================================================

CREATE TABLE public.assignment_question_keys (
  question_id UUID PRIMARY KEY REFERENCES public.assignment_questions(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  -- ["optionId", ...]; a multiple-choice answer scores only if it matches this set exactly.
  correct_option_ids JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX idx_assignment_question_keys_assignment_id
  ON public.assignment_question_keys(assignment_id);

ALTER TABLE public.assignment_question_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group admins can read assignment answer keys"
  ON public.assignment_question_keys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_question_keys.assignment_id
        AND public.current_user_is_effective_group_admin(a.group_id)
    )
  );

CREATE POLICY "Group admins can insert assignment answer keys"
  ON public.assignment_question_keys FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_question_keys.assignment_id
        AND public.current_user_is_effective_group_admin(a.group_id)
    )
  );

CREATE POLICY "Group admins can update assignment answer keys"
  ON public.assignment_question_keys FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_question_keys.assignment_id
        AND public.current_user_is_effective_group_admin(a.group_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_question_keys.assignment_id
        AND public.current_user_is_effective_group_admin(a.group_id)
    )
  );

CREATE POLICY "Group admins can delete assignment answer keys"
  ON public.assignment_question_keys FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_question_keys.assignment_id
        AND public.current_user_is_effective_group_admin(a.group_id)
    )
  );

-- =============================================================================
-- 4. Submissions gain answers + auto-scoring. A quiz submission has no file at all,
--    so the legacy single-file columns (kept in 00073 for backward compatibility)
--    must become nullable.
-- =============================================================================

ALTER TABLE public.submissions
  ALTER COLUMN file_path DROP NOT NULL,
  ALTER COLUMN file_name DROP NOT NULL;

ALTER TABLE public.submissions
  -- [{ "questionId": "...", "optionIds": [...], "text": "..." }]
  ADD COLUMN answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Points earned on auto-scorable (multiple-choice, keyed) questions, and the total
  -- available from them. Kept apart from `score` so an instructor's manual grade for the
  -- written questions is never silently overwritten by the machine.
  ADD COLUMN auto_score INTEGER,
  ADD COLUMN auto_score_max INTEGER;

-- =============================================================================
-- 5. Auto-scoring, folded into the existing review-field protection trigger rather than
--    added as a second one: both need to run BEFORE the write and both overwrite columns
--    a student might have put in the payload, so a single function avoids depending on
--    trigger firing order.
--
--    SECURITY DEFINER because the key table is admin-only -- the student writing the
--    submission cannot read the answers they are being scored against.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.protect_submission_review_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment_type TEXT;
  v_earned INTEGER := 0;
  v_max INTEGER := 0;
  q RECORD;
  v_given JSONB;
  v_correct JSONB;
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

  SELECT a.assignment_type INTO v_assignment_type
  FROM public.assignments a WHERE a.id = NEW.assignment_id;

  IF v_assignment_type IS DISTINCT FROM 'quiz' THEN
    NEW.auto_score := NULL;
    NEW.auto_score_max := NULL;
    RETURN NEW;
  END IF;

  -- Only multiple-choice questions that actually have a key are scorable; written
  -- answers stay out of both totals so "3/4" always means "3 of the 4 machine-gradable
  -- points", never a silent zero for an unread essay.
  FOR q IN
    SELECT qq.id, qq.points, k.correct_option_ids
    FROM public.assignment_questions qq
    JOIN public.assignment_question_keys k ON k.question_id = qq.id
    WHERE qq.assignment_id = NEW.assignment_id
      AND qq.question_type = 'multiple_choice'
      AND jsonb_array_length(k.correct_option_ids) > 0
  LOOP
    v_max := v_max + q.points;

    v_given := NULL;
    SELECT COALESCE(ans -> 'optionIds', '[]'::jsonb) INTO v_given
    FROM jsonb_array_elements(NEW.answers) AS ans
    WHERE ans ->> 'questionId' = q.id::text
    LIMIT 1;

    v_given := COALESCE(v_given, '[]'::jsonb);
    v_correct := q.correct_option_ids;

    -- Set equality: every correct option chosen, and nothing extra.
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(v_correct) c
      WHERE NOT v_given @> to_jsonb(c.value)
    ) AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(v_given) g
      WHERE NOT v_correct @> to_jsonb(g.value)
    ) THEN
      v_earned := v_earned + q.points;
    END IF;
  END LOOP;

  NEW.auto_score := v_earned;
  NEW.auto_score_max := v_max;
  RETURN NEW;
END;
$$;
