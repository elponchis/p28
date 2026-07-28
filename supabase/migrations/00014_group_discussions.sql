-- Group discussions: flat posts within a group. Members can read and insert.
-- Realtime enabled for postgres_changes (INSERT) for near-real-time new posts.

-- =============================================================================
-- 1. group_discussions table
-- =============================================================================

CREATE TABLE public.group_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_group_discussions_group_id_created_at ON public.group_discussions(group_id, created_at DESC);

-- =============================================================================
-- 2. RLS: authenticated members of the group can SELECT; members can INSERT
-- =============================================================================

ALTER TABLE public.group_discussions ENABLE ROW LEVEL SECURITY;

-- Members can read discussions in groups they belong to
CREATE POLICY "Members can read group discussions"
  ON public.group_discussions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_discussions.group_id AND gm.user_id = auth.uid()
    )
  );

-- Members can insert discussions in groups they belong to
CREATE POLICY "Members can insert group discussions"
  ON public.group_discussions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_discussions.group_id AND gm.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 3. Enable Realtime for group_discussions (postgres_changes on INSERT)
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.group_discussions;
