-- Reactions on chat messages. Same reaction types as discussion posts. One reaction per user per message.

CREATE TABLE public.chat_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('prayer', 'laugh', 'thumbs_up')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX idx_chat_message_reactions_message_id ON public.chat_message_reactions(message_id);

ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat members can read reactions"
  ON public.chat_message_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.chat_members cmem ON cmem.chat_id = cm.chat_id AND cmem.user_id = auth.uid()
      WHERE cm.id = chat_message_reactions.message_id
    )
  );

CREATE POLICY "Chat members can insert reaction"
  ON public.chat_message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.chat_members cmem ON cmem.chat_id = cm.chat_id AND cmem.user_id = auth.uid()
      WHERE cm.id = chat_message_reactions.message_id
    )
  );

CREATE POLICY "Users can delete own reaction"
  ON public.chat_message_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
