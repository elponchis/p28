-- Track when each member last read a chat, enabling unread message counts.

ALTER TABLE public.chat_members
  ADD COLUMN last_read_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Allow members to update their own last_read_at
CREATE POLICY "Members can update own chat_members row"
  ON public.chat_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
