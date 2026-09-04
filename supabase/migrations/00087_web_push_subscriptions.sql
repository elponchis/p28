-- Web push subscriptions.
--
-- Expo push covers iOS and Android and does nothing on web, so the browser is the one place a
-- notification never arrived once the tab was closed. A Web Push subscription is the browser's
-- own equivalent of a device token: an endpoint the push service will deliver to, plus two keys
-- the sender uses to encrypt the payload.
--
-- Kept separate from push_tokens rather than folded into it. The shapes have nothing in common —
-- one is an opaque Expo token, the other is a URL plus a keypair — and the two are sent by
-- different code paths against different services.

CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
  -- The endpoint is the identity: re-subscribing in the same browser returns the same URL, and
  -- a different browser or profile is a different subscription for the same person.
  endpoint TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_user_id
  ON public.web_push_subscriptions(user_id);

ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Own rows only. The Edge Function reads every subscription it needs through the service role,
-- which bypasses RLS; nothing else has any business reading someone else's endpoint.
CREATE POLICY "Users can read own web push subscriptions"
  ON public.web_push_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own web push subscription"
  ON public.web_push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own web push subscription"
  ON public.web_push_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own web push subscription"
  ON public.web_push_subscriptions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
