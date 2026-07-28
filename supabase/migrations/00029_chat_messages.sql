-- Chat messages: same structure as discussion_posts. Supports replies (parent_message_id), images, editing.

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  parent_message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_chat_id_created_at ON public.chat_messages(chat_id, created_at ASC);
CREATE INDEX idx_chat_messages_parent ON public.chat_messages(parent_message_id);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat members can read and insert messages
CREATE POLICY "Chat members can read chat messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = chat_messages.chat_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Chat members can insert chat messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = chat_messages.chat_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Authors can update own chat messages"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_chat_messages_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_chat_messages_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
