-- Reddit-style discussions: topics with replies.
-- discussions = one row per topic (title + body = original post)
-- discussion_posts = replies only
-- Realtime enabled for postgres_changes (INSERT) on both tables.

-- =============================================================================
-- 1. discussions table
-- =============================================================================

CREATE TABLE public.discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_discussions_group_id_created_at ON public.discussions(group_id, created_at DESC);
CREATE INDEX idx_discussions_created_at ON public.discussions(created_at DESC);

-- =============================================================================
-- 2. discussion_posts table (replies)
-- =============================================================================

CREATE TABLE public.discussion_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_discussion_posts_discussion_id_created_at ON public.discussion_posts(discussion_id, created_at ASC);

-- =============================================================================
-- 3. RLS: authenticated can read; members can INSERT
-- =============================================================================

ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_posts ENABLE ROW LEVEL SECURITY;

-- Discussions: authenticated can read (AC6: non-members can read); members can insert
CREATE POLICY "Authenticated can read discussions"
  ON public.discussions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members can insert discussions"
  ON public.discussions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = discussions.group_id AND gm.user_id = auth.uid()
    )
  );

-- Discussion posts: authenticated can read; members of the discussion's group can insert
CREATE POLICY "Authenticated can read discussion posts"
  ON public.discussion_posts FOR SELECT
  TO authenticated
  USING (true);

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
  );

-- =============================================================================
-- 4. Enable Realtime (postgres_changes on INSERT)
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.discussions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_posts;
