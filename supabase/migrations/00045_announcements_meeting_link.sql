-- Optional online meeting link for announcements (separate from message body).

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS meeting_link TEXT NOT NULL DEFAULT '';
