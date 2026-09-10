-- A score has to mean something out of something.
--
-- submissions.score is a bare INTEGER with no bound, so a grader can type 10000000 and the
-- database stores it — which is exactly what the reporter did, and the submission row then reads
-- "Reviewed · 10000000". A mark with no ceiling is not a mark.
--
-- So an assignment carries what it is out of, and a score has to fit inside it. The ceiling lives
-- on the assignment rather than as a fixed 100 because a quiz worth 20 points and an essay worth
-- 100 are both ordinary, and hard-coding one of them just moves the wrong number somewhere else.
--
-- Existing assignments get 100. Nothing is rejected retroactively: the trigger only fires on
-- write, so an out-of-range score already stored stays until someone edits it, and the grading
-- screen shows the range so the next save fixes it.

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS max_score INTEGER NOT NULL DEFAULT 100;

ALTER TABLE public.assignments DROP CONSTRAINT IF EXISTS assignments_max_score_check;

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_max_score_check CHECK (max_score > 0 AND max_score <= 100000);

COMMENT ON COLUMN public.assignments.max_score IS
  'What this assignment is out of. A submission score must be between 0 and this; enforced by enforce_submission_score_bounds.';

-- =============================================================================
-- The bound, enforced where it cannot be talked out of
-- =============================================================================

-- A CHECK constraint cannot reach another table, and the client is not the place for a rule that
-- decides what a grade means. A trigger can see both rows.
CREATE OR REPLACE FUNCTION public.enforce_submission_score_bounds()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max INTEGER;
BEGIN
  IF NEW.score IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT a.max_score INTO v_max FROM public.assignments a WHERE a.id = NEW.assignment_id;
  v_max := COALESCE(v_max, 100);

  IF NEW.score < 0 OR NEW.score > v_max THEN
    RAISE EXCEPTION 'Score must be between 0 and % for this assignment', v_max
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS submissions_score_bounds ON public.submissions;

-- BEFORE, and after the tampering trigger from 00068 has had its say: that one blanks the score
-- when a student is the one writing, and a blanked score has nothing to bound.
CREATE TRIGGER submissions_score_bounds
  BEFORE INSERT OR UPDATE OF score ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_submission_score_bounds();
