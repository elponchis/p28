-- The bell should light up while you are looking at it.
--
-- in_app_notifications is read by two queries and refreshed by neither: nothing polls it and it
-- was not in the realtime publication, so a notification that arrived while the app was open sat
-- there unseen until the next navigation or reload. From the user's side that is a bell that does
-- not work, which is exactly how it was reported.
--
-- Row level security still applies to realtime, so a subscriber is only sent the rows its own
-- SELECT policy would return: their own notifications, nobody else's.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'in_app_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;
  END IF;
END
$$;

-- UPDATE payloads carry the old row too, which is what lets a subscriber tell "this was just
-- marked read" from "this is new" without refetching first.
ALTER TABLE public.in_app_notifications REPLICA IDENTITY FULL;
