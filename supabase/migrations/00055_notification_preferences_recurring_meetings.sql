-- App-wide toggle for recurring-meeting notifications (used with per-group settings when sends exist).

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS recurring_meetings_enabled BOOLEAN NOT NULL DEFAULT true;
