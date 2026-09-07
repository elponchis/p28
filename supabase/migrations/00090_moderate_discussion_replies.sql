-- Moderating discussion replies.
--
-- A group admin could delete a whole thread (00021) but not one reply inside it: the reply
-- policies name the author and nobody else. So removing one offensive comment meant deleting the
-- conversation it sat in, and ten people's words went with it. The precise tool was the missing
-- one; only the blunt one existed.
--
-- Two changes:
--
--   1. removal becomes a tombstone, not a disappearance. A reply that vanishes leaves nothing to
--      answer "why is my comment gone?" with, and takes the replies hanging off it with it.
--   2. the tombstone records who did it, so a removal by someone other than the author can say
--      so, and so the person who made that call is on the record.
--
-- Moderators are not bound by the lock an event thread gets when its event ends: a reply worth
-- removing is worth removing after the conversation closes.

-- =============================================================================
-- 1. Who removed it
-- =============================================================================

ALTER TABLE public.discussion_posts
  ADD COLUMN IF NOT EXISTS deleted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.discussion_posts.deleted_by_user_id IS
  'Who removed this reply. Equal to user_id when the author removed their own; a different id means a moderator did, and the thread says so.';

-- =============================================================================
-- 2. Removal is an UPDATE now, so the row survives to be a tombstone
--
--    The author keeps the rule they had -- their own reply, not in a locked thread. A moderator
--    is the group's admin (current_user_is_effective_group_admin covers platform super admins
--    too) or a platform admin, and the lock does not apply to them.
--
--    Both are written as one policy per role rather than one combined predicate, so a reader can
--    tell which right applies to them without untangling an OR chain.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.current_user_can_moderate_discussion(p_discussion_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.current_user_is_admin_or_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.discussions d
      WHERE d.id = p_discussion_id
        AND d.group_id IS NOT NULL
        AND public.current_user_is_effective_group_admin(d.group_id)
    );
$$;

REVOKE ALL ON FUNCTION public.current_user_can_moderate_discussion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_can_moderate_discussion(uuid) TO authenticated;

DROP POLICY IF EXISTS "Moderators can remove discussion posts" ON public.discussion_posts;

CREATE POLICY "Moderators can remove discussion posts"
  ON public.discussion_posts FOR UPDATE
  TO authenticated
  USING (public.current_user_can_moderate_discussion(discussion_id))
  WITH CHECK (public.current_user_can_moderate_discussion(discussion_id));

-- =============================================================================
-- 3. The hard DELETE policy goes
--
--    Removal is a tombstone now. Leaving DELETE in place would keep a second way to remove a
--    reply that skips the record of who did it -- and the client no longer uses it.
-- =============================================================================

DROP POLICY IF EXISTS "Users can delete own discussion posts" ON public.discussion_posts;
