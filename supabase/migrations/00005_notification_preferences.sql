-- Story 1.6: Notification preferences table
-- MVP preference model: type-level toggles (events, announcements, messages). Default: all enabled.
-- One row per user. Schema is extensible for future ministry/group granularity.

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  events_enabled BOOLEAN NOT NULL DEFAULT true,
  announcements_enabled BOOLEAN NOT NULL DEFAULT true,
  messages_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: user can read/update own row only; adapter upserts via ON CONFLICT, so no INSERT policy needed
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow insert for upsert (create row on first access); RLS restricts to own user_id
CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);
