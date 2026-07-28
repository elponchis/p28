-- Lock event-linked discussion threads when the event is cancelled or has started (read-only archive).

CREATE OR REPLACE FUNCTION public.is_group_event_discussion_locked(p_discussion_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_events ge
    WHERE ge.discussion_id = p_discussion_id
      AND (ge.status = 'cancelled' OR ge.starts_at <= now())
  );
$$;

REVOKE ALL ON FUNCTION public.is_group_event_discussion_locked(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_event_discussion_locked(uuid) TO authenticated;

DROP POLICY IF EXISTS "Members can insert discussion posts" ON public.discussion_posts;

CREATE POLICY "Members can insert discussion posts"
  ON public.discussion_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.discussions d
      JOIN public.group_members gm ON gm.group_id = d.group_id AND gm.user_id = auth.uid()
      WHERE d.id = discussion_posts.discussion_id
    )
    AND NOT public.is_group_event_discussion_locked(discussion_posts.discussion_id)
  );

DROP POLICY IF EXISTS "Users can update own discussion posts" ON public.discussion_posts;

CREATE POLICY "Users can update own discussion posts"
  ON public.discussion_posts FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND NOT public.is_group_event_discussion_locked(discussion_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND NOT public.is_group_event_discussion_locked(discussion_id)
  );

DROP POLICY IF EXISTS "Members can insert reaction" ON public.discussion_post_reactions;

CREATE POLICY "Members can insert reaction"
  ON public.discussion_post_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.discussion_posts dp
      JOIN public.discussions d ON d.id = dp.discussion_id
      JOIN public.group_members gm ON gm.group_id = d.group_id AND gm.user_id = auth.uid()
      WHERE dp.id = discussion_post_reactions.post_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.discussion_posts dp2
      WHERE dp2.id = discussion_post_reactions.post_id
        AND public.is_group_event_discussion_locked(dp2.discussion_id)
    )
  );

DROP POLICY IF EXISTS "Members can update own reaction" ON public.discussion_post_reactions;

CREATE POLICY "Members can update own reaction"
  ON public.discussion_post_reactions FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.discussion_posts dp
      WHERE dp.id = discussion_post_reactions.post_id
        AND public.is_group_event_discussion_locked(dp.discussion_id)
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.discussion_posts dp
      WHERE dp.id = discussion_post_reactions.post_id
        AND public.is_group_event_discussion_locked(dp.discussion_id)
    )
  );

DROP POLICY IF EXISTS "Members can delete own reaction" ON public.discussion_post_reactions;

-- Allow removing own reaction even when thread is archived (read-only for new activity only).
CREATE POLICY "Members can delete own reaction"
  ON public.discussion_post_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
