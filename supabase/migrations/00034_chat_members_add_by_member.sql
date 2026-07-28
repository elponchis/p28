-- Allow any chat member to add new members (not just creator).
-- Used when converting 1-1 chat to group chat.
CREATE POLICY "Members can add chat members"
  ON public.chat_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = chat_members.chat_id AND cm.user_id = auth.uid()
    )
  );
