-- Friend requests: sender_id sends a request to receiver_id.
-- Status: pending → accepted | declined.
-- On accept, a row is inserted into friendships by the app layer.

CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT friend_requests_no_self CHECK (sender_id <> receiver_id),
  CONSTRAINT friend_requests_unique_pending UNIQUE (sender_id, receiver_id)
);

CREATE INDEX idx_friend_requests_sender ON public.friend_requests(sender_id);
CREATE INDEX idx_friend_requests_receiver ON public.friend_requests(receiver_id);
CREATE INDEX idx_friend_requests_status ON public.friend_requests(status);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view friend requests involving self"
  ON public.friend_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests"
  ON public.friend_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update friend requests they received"
  ON public.friend_requests FOR UPDATE
  USING (auth.uid() = receiver_id);

CREATE POLICY "Sender can cancel own pending requests"
  ON public.friend_requests FOR DELETE
  USING (auth.uid() = sender_id AND status = 'pending');

-- Trigger to auto-update updated_at on status change
CREATE OR REPLACE FUNCTION update_friend_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER friend_requests_updated_at
  BEFORE UPDATE ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_friend_request_updated_at();
