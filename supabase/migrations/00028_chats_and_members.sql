-- Chats: DMs and group chats between friends. Creator must be friends with all participants.

CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_members (
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX idx_chats_created_at ON public.chats(created_at DESC);
CREATE INDEX idx_chat_members_user_id ON public.chat_members(user_id);
CREATE INDEX idx_chat_members_chat_id ON public.chat_members(chat_id);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;

-- Chats: members can read; creator inserts; members can update (edit chat)
CREATE POLICY "Chat members can read chats"
  ON public.chats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = chats.id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Creator can insert chat"
  ON public.chats FOR INSERT
  TO authenticated
  WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Chat members can update chat"
  ON public.chats FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = chats.id AND cm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = chats.id AND cm.user_id = auth.uid()
    )
  );

-- Chat members: members can read; creator inserts when creating chat; users can delete own (leave)
CREATE POLICY "Chat members can read chat_members"
  ON public.chat_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = chat_members.chat_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Creator can insert chat members"
  ON public.chat_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_members.chat_id AND c.created_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can leave chat"
  ON public.chat_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_chats_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER chats_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW
  EXECUTE FUNCTION public.set_chats_updated_at();
