-- Per-group member toggles for recurring meeting visibility and event notifications (with announcements).

ALTER TABLE public.group_member_settings
  ADD COLUMN IF NOT EXISTS recurring_meetings_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS events_enabled BOOLEAN NOT NULL DEFAULT true;
