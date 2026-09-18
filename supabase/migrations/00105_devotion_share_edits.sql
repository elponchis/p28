-- Authors edit their own devotion answers and replies.
--
-- 00104 let members add and delete their own shares; this adds editing. Only the text changes: a
-- trigger keeps the author, the devotion, the thread and the prompt fixed, and stamps edited_at so
-- the card can say an answer was changed.

ALTER TABLE public.devotion_shares ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.devotion_shares_guard_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.devotion_id IS DISTINCT FROM OLD.devotion_id
     OR NEW.parent_share_id IS DISTINCT FROM OLD.parent_share_id
     OR NEW.question IS DISTINCT FROM OLD.question
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only the text of a devotion share can be edited';
  END IF;
  IF NEW.body IS DISTINCT FROM OLD.body THEN
    NEW.edited_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS devotion_shares_guard_edit ON public.devotion_shares;
CREATE TRIGGER devotion_shares_guard_edit
  BEFORE UPDATE ON public.devotion_shares
  FOR EACH ROW EXECUTE FUNCTION public.devotion_shares_guard_edit();

DROP POLICY IF EXISTS "Members edit their own devotion shares" ON public.devotion_shares;
CREATE POLICY "Members edit their own devotion shares"
  ON public.devotion_shares FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND public.current_user_can_see_devotion(devotion_id));
