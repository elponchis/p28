-- Two additions to assignments/submissions:
--
--   1. allow_resubmission — the instructor decides whether a student may replace a
--      submission. Defaults to true, which is what every existing assignment already
--      allowed, so nothing already created changes behaviour. Enforced in RLS, not just
--      the UI: a locked assignment rejects the UPDATE outright.
--
--   2. submissions.answer_results — per-question right/wrong, computed by the same
--      trigger that computes auto_score. The student needs to see WHICH questions they
--      got wrong, but must never receive the answer key to do it, so the server ships
--      the verdict rather than the key: a boolean per question, never the correct
--      option ids. A wrong answer stays wrong-without-saying-what-was-right.

-- =============================================================================
-- 1. Columns
-- =============================================================================

ALTER TABLE public.assignments
  ADD COLUMN allow_resubmission BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.submissions
  -- [{ "questionId": "...", "correct": true }] for keyed multiple-choice questions only.
  -- Written questions never appear here — there is nothing to auto-verdict.
  ADD COLUMN answer_results JSONB NOT NULL DEFAULT '[]'::jsonb;

-- =============================================================================
-- 2. RLS: a student may replace their own submission only while the assignment
--    still allows it. Admins keep their own separate UPDATE policy (grading), which
--    is untouched — permissive policies OR together, so grading past the lock and
--    past the due date still works.
-- =============================================================================

DROP POLICY IF EXISTS "Members can update own submission before due date" ON public.submissions;

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
        AND a.allow_resubmission
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.group_members gm ON gm.group_id = a.group_id AND gm.user_id = auth.uid()
      WHERE a.id = submissions.assignment_id
        AND (a.due_date IS NULL OR now() <= a.due_date)
        AND a.allow_resubmission
    )
  );

-- =============================================================================
-- 3. Scoring trigger, extended to record the per-question verdict alongside the
--    totals. Same SECURITY DEFINER reasoning as 00076: the key table is admin-only,
--    so the student being scored cannot read what they are scored against.
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
  v_results JSONB := '[]'::jsonb;
  q RECORD;
  v_given JSONB;
  v_correct JSONB;
  v_is_correct BOOLEAN;
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
    NEW.answer_results := '[]'::jsonb;
    RETURN NEW;
  END IF;

  FOR q IN
    SELECT qq.id, qq.points, k.correct_option_ids
    FROM public.assignment_questions qq
    JOIN public.assignment_question_keys k ON k.question_id = qq.id
    WHERE qq.assignment_id = NEW.assignment_id
      AND qq.question_type = 'multiple_choice'
      AND jsonb_array_length(k.correct_option_ids) > 0
    ORDER BY qq.sort_order
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
    v_is_correct := NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(v_correct) c
      WHERE NOT v_given @> to_jsonb(c.value)
    ) AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(v_given) g
      WHERE NOT v_correct @> to_jsonb(g.value)
    );

    IF v_is_correct THEN
      v_earned := v_earned + q.points;
    END IF;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object('questionId', q.id::text, 'correct', v_is_correct)
    );
  END LOOP;

  NEW.auto_score := v_earned;
  NEW.auto_score_max := v_max;
  NEW.answer_results := v_results;
  RETURN NEW;
END;
$$;
