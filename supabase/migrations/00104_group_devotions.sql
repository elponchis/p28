-- 오늘의 묵상 (daily devotion) for a group.
--
-- A leader sets the day's passage (reference + text); members answer one of four prompts, reply
-- to each other's answers in a thread, and heart them. Everything is visible to the whole group
-- (no private prayer requests in this version).
--
--   group_devotions        one passage per group per day
--   devotion_shares        an answer (question set, no parent) or a reply (parent set, no question)
--   devotion_share_hearts  one heart per member per share

CREATE TABLE IF NOT EXISTS public.group_devotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  -- The leader's local calendar day, sent by the client; the server's UTC date would roll over at
  -- 9am in Korea.
  devotion_date DATE NOT NULL,
  reference TEXT NOT NULL CHECK (char_length(btrim(reference)) BETWEEN 1 AND 120),
  passage TEXT NOT NULL CHECK (char_length(btrim(passage)) BETWEEN 1 AND 2000),
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, devotion_date)
);

CREATE TABLE IF NOT EXISTS public.devotion_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devotion_id UUID NOT NULL REFERENCES public.group_devotions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_share_id UUID REFERENCES public.devotion_shares(id) ON DELETE CASCADE,
  question TEXT CHECK (question IN ('who_is_god', 'lesson', 'application', 'prayer')),
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- An answer names its prompt; a reply belongs to an answer and names none.
  CONSTRAINT devotion_shares_answer_or_reply CHECK ((parent_share_id IS NULL) = (question IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS devotion_shares_devotion_idx ON public.devotion_shares (devotion_id, created_at);
CREATE INDEX IF NOT EXISTS devotion_shares_parent_idx ON public.devotion_shares (parent_share_id);

CREATE TABLE IF NOT EXISTS public.devotion_share_hearts (
  share_id UUID NOT NULL REFERENCES public.devotion_shares(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (share_id, user_id)
);

-- Membership checks, as definer so the policies below do not depend on group_members' own RLS.
CREATE OR REPLACE FUNCTION public.current_user_in_devotion_group(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id = auth.uid()
  ) OR public.current_user_is_effective_group_admin(p_group_id);
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_see_devotion(p_devotion_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_devotions d
    WHERE d.id = p_devotion_id AND public.current_user_in_devotion_group(d.group_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_in_devotion_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_can_see_devotion(UUID) TO authenticated;

ALTER TABLE public.group_devotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devotion_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devotion_share_hearts ENABLE ROW LEVEL SECURITY;

-- Passages: the group reads them; its leaders write them.
CREATE POLICY "Group members read devotions"
  ON public.group_devotions FOR SELECT TO authenticated
  USING (public.current_user_in_devotion_group(group_id));
CREATE POLICY "Group leaders add devotions"
  ON public.group_devotions FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_effective_group_admin(group_id));
CREATE POLICY "Group leaders edit devotions"
  ON public.group_devotions FOR UPDATE TO authenticated
  USING (public.current_user_is_effective_group_admin(group_id))
  WITH CHECK (public.current_user_is_effective_group_admin(group_id));
CREATE POLICY "Group leaders delete devotions"
  ON public.group_devotions FOR DELETE TO authenticated
  USING (public.current_user_is_effective_group_admin(group_id));

-- Shares: the group reads them; members write and delete their own.
CREATE POLICY "Group members read devotion shares"
  ON public.devotion_shares FOR SELECT TO authenticated
  USING (public.current_user_can_see_devotion(devotion_id));
CREATE POLICY "Group members add their own devotion shares"
  ON public.devotion_shares FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.current_user_can_see_devotion(devotion_id));
CREATE POLICY "Members delete their own devotion shares"
  ON public.devotion_shares FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Hearts: the group sees them; each member adds and removes their own.
CREATE POLICY "Group members read devotion hearts"
  ON public.devotion_share_hearts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.devotion_shares s
    WHERE s.id = share_id AND public.current_user_can_see_devotion(s.devotion_id)
  ));
CREATE POLICY "Group members heart devotion shares"
  ON public.devotion_share_hearts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.devotion_shares s
    WHERE s.id = share_id AND public.current_user_can_see_devotion(s.devotion_id)
  ));
CREATE POLICY "Members remove their own devotion hearts"
  ON public.devotion_share_hearts FOR DELETE TO authenticated
  USING (user_id = auth.uid());
