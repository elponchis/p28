-- Reactions on discussion post replies. One reaction per user per post.
-- reaction_type: prayer (🙏), laugh (😂), thumbs_up (👍)

CREATE TABLE public.discussion_post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.discussion_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('prayer', 'laugh', 'thumbs_up')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX idx_discussion_post_reactions_post_id ON public.discussion_post_reactions(post_id);

ALTER TABLE public.discussion_post_reactions ENABLE ROW LEVEL SECURITY;

-- Authenticated can read; members of the discussion's group can insert/update/delete
CREATE POLICY "Authenticated can read reactions"
  ON public.discussion_post_reactions FOR SELECT
  TO authenticated
  USING (true);

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
  );

CREATE POLICY "Members can update own reaction"
  ON public.discussion_post_reactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members can delete own reaction"
  ON public.discussion_post_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
