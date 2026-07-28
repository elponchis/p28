-- Allow senders to re-send a friend request that was previously declined
-- or left in a stale 'accepted' state (e.g. friendship insert failed).
-- The sender can update their own non-pending request back to 'pending'.

CREATE POLICY "Sender can re-send declined requests"
  ON public.friend_requests FOR UPDATE
  USING (auth.uid() = sender_id AND status IN ('declined', 'accepted'))
  WITH CHECK (auth.uid() = sender_id AND status = 'pending');
