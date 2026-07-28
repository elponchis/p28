-- Add missing UPDATE policy so users can change their reaction via upsert.

CREATE POLICY "Users can update own reaction"
  ON public.chat_message_reactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
