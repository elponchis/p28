-- Let authors delete their own discussion replies.
--
-- discussion_posts had INSERT, SELECT and UPDATE policies but no DELETE, so the
-- UI had an edit action and no delete. This mirrors the existing
-- "Users can update own discussion posts" policy exactly: the author only, and
-- not once the thread is locked (event discussions lock after the event).

DROP POLICY IF EXISTS "Users can delete own discussion posts" ON public.discussion_posts;
CREATE POLICY "Users can delete own discussion posts"
  ON public.discussion_posts FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND NOT public.is_group_event_discussion_locked(discussion_id)
  );
