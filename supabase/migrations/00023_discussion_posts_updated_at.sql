-- Add updated_at to discussion_posts for "[edited]" indicator on replies.

ALTER TABLE public.discussion_posts ADD COLUMN updated_at TIMESTAMPTZ;

UPDATE public.discussion_posts SET updated_at = created_at;

ALTER TABLE public.discussion_posts ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.discussion_posts ALTER COLUMN updated_at SET DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_discussion_posts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER discussion_posts_updated_at
  BEFORE UPDATE ON public.discussion_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_discussion_posts_updated_at();

-- Users can update their own discussion posts (replies).
CREATE POLICY "Users can update own discussion posts"
  ON public.discussion_posts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
