-- A private note on the day's verse — one per person per day, seen by nobody else.
--
-- This is not the group's 오늘의 묵상: that is a shared passage with four prompts and threaded
-- answers (group_devotions / devotion_shares). This table is the reader's own line about the
-- verse the home screen showed them, and nothing here is ever visible to another account.

CREATE TABLE public.personal_verse_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  /** The Seoul calendar day the note belongs to, the same day the verse rotates on. */
  note_date DATE NOT NULL,
  /** The verse that was showing when the note was written, e.g. '로마서 10:17'. */
  verse_ref TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT personal_verse_notes_verse_ref_nonempty CHECK (length(trim(verse_ref)) > 0),
  CONSTRAINT personal_verse_notes_body_nonempty CHECK (length(trim(body)) > 0),
  CONSTRAINT personal_verse_notes_one_per_day UNIQUE (user_id, note_date)
);

-- The card reads one week at a time, newest first.
CREATE INDEX idx_personal_verse_notes_user_date
  ON public.personal_verse_notes (user_id, note_date DESC);

ALTER TABLE public.personal_verse_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Readers see only their own verse notes"
  ON public.personal_verse_notes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Readers write only their own verse notes"
  ON public.personal_verse_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Readers edit only their own verse notes"
  ON public.personal_verse_notes
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Readers delete only their own verse notes"
  ON public.personal_verse_notes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Rewriting a note keeps the day it belongs to and who wrote it; only the words change.
CREATE OR REPLACE FUNCTION public.set_personal_verse_notes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.id := OLD.id;
  NEW.user_id := OLD.user_id;
  NEW.note_date := OLD.note_date;
  NEW.created_at := OLD.created_at;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER personal_verse_notes_set_updated_at
  BEFORE UPDATE ON public.personal_verse_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_personal_verse_notes_updated_at();
