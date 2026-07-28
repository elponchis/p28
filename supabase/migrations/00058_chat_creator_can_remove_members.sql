-- Allow the user who created a chat to remove other members from chat_members.
-- Existing policy still allows any member to delete their own row (leave).

CREATE POLICY "Chat creator can remove chat members"
  ON public.chat_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_members.chat_id AND c.created_by_user_id = auth.uid()
    )
  );
