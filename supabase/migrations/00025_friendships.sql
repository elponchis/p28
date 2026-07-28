-- Friendships: symmetric relationship between two users.
-- Stored as (user_id, friend_id) with user_id < friend_id for uniqueness.

CREATE TABLE IF NOT EXISTS public.friendships (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id),
  CONSTRAINT friendships_ordered CHECK (user_id < friend_id)
);

CREATE INDEX idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON public.friendships(friend_id);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can view friendships involving themselves
CREATE POLICY "Users can view own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can add friendships where they are one of the participants
CREATE POLICY "Users can insert friendships involving self"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can delete friendships involving themselves
CREATE POLICY "Users can delete own friendships"
  ON public.friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);
