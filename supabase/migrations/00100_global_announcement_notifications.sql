-- A platform-wide announcement should reach the platform.
--
-- global_announcements has no trigger and no push behind it: publishing one writes a row that
-- appears at the top of the home feed and tells nobody. Someone who does not open the app that
-- week never learns it happened, which is the opposite of what "전체 공지" means. Group
-- announcements have had both since 00046; this gives the platform-wide ones the same.
--
-- Every signed-up person is a recipient, minus the author — they just wrote it — and minus anyone
-- who turned announcements off, the same switch the group ones read.

ALTER TABLE public.in_app_notifications
  ADD COLUMN IF NOT EXISTS global_announcement_id UUID
    REFERENCES public.global_announcements(id) ON DELETE CASCADE;

ALTER TABLE public.in_app_notifications DROP CONSTRAINT IF EXISTS in_app_notifications_kind_check;

ALTER TABLE public.in_app_notifications
  ADD CONSTRAINT in_app_notifications_kind_check
  CHECK (kind IN ('announcement', 'group_event', 'chat_message', 'global_announcement'));

ALTER TABLE public.in_app_notifications DROP CONSTRAINT IF EXISTS in_app_notifications_ref_check;

ALTER TABLE public.in_app_notifications
  ADD CONSTRAINT in_app_notifications_ref_check CHECK (
    (kind = 'announcement' AND announcement_id IS NOT NULL AND group_event_id IS NULL AND chat_id IS NULL AND global_announcement_id IS NULL AND group_id IS NOT NULL)
    OR (kind = 'group_event' AND group_event_id IS NOT NULL AND announcement_id IS NULL AND chat_id IS NULL AND global_announcement_id IS NULL AND group_id IS NOT NULL)
    OR (kind = 'chat_message' AND chat_id IS NOT NULL AND announcement_id IS NULL AND group_event_id IS NULL AND global_announcement_id IS NULL AND group_id IS NULL)
    OR (kind = 'global_announcement' AND global_announcement_id IS NOT NULL AND announcement_id IS NULL AND group_event_id IS NULL AND chat_id IS NULL AND group_id IS NULL)
  );

COMMENT ON COLUMN public.in_app_notifications.global_announcement_id IS
  'The platform-wide announcement this is about, for kind = global_announcement. No group: it is addressed to everyone.';

-- =============================================================================
-- Everyone hears about it
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_in_app_notifications_for_global_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary TEXT;
BEGIN
  v_summary := left(btrim(regexp_replace(NEW.description, '[[:space:]]+', ' ', 'g')), 280);
  IF v_summary = '' THEN
    v_summary := NEW.title;
  END IF;

  INSERT INTO public.in_app_notifications (
    user_id, group_id, group_name, kind, global_announcement_id, title, summary
  )
  SELECT
    p.user_id,
    NULL,
    '',
    'global_announcement',
    NEW.id,
    NEW.title,
    v_summary
  FROM public.profiles p
  LEFT JOIN public.notification_preferences np ON np.user_id = p.user_id
  WHERE p.user_id <> NEW.created_by_user_id
    AND COALESCE(np.announcements_enabled, true);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS global_announcements_in_app_notify ON public.global_announcements;

CREATE TRIGGER global_announcements_in_app_notify
  AFTER INSERT ON public.global_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.create_in_app_notifications_for_global_announcement();
