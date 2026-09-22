-- Three things people were never told about: a reply in a discussion they are part of, a friend
-- request of theirs being accepted, and a new assignment in their group.
--
-- The discussion trigger deliberately does NOT notify the whole group. A busy thread in a large
-- group would put a row on every member for every reply; the people who opened the thread or
-- wrote in it are the ones who are waiting for an answer, so they are the ones told.

-- =============================================================================
-- 1. Columns and the widened checks
-- =============================================================================

ALTER TABLE public.in_app_notifications
  ADD COLUMN IF NOT EXISTS discussion_id UUID REFERENCES public.discussions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS discussion_post_id UUID
    REFERENCES public.discussion_posts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS friend_request_id UUID
    REFERENCES public.friend_requests(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS actor_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.in_app_notifications.discussion_id IS
  'The thread a discussion_post notification opens.';
COMMENT ON COLUMN public.in_app_notifications.actor_user_id IS
  'Whoever did the thing, when the notification is about a person rather than a posting — the friend who accepted.';

ALTER TABLE public.in_app_notifications DROP CONSTRAINT IF EXISTS in_app_notifications_kind_check;

ALTER TABLE public.in_app_notifications
  ADD CONSTRAINT in_app_notifications_kind_check
  CHECK (kind IN (
    'announcement',
    'group_event',
    'chat_message',
    'global_announcement',
    'discussion_post',
    'friend_accepted',
    'assignment'
  ));

ALTER TABLE public.in_app_notifications DROP CONSTRAINT IF EXISTS in_app_notifications_ref_check;

-- Each kind names exactly the reference it uses. The older four are unchanged; the new three add
-- their own line rather than loosening the ones already there.
ALTER TABLE public.in_app_notifications
  ADD CONSTRAINT in_app_notifications_ref_check CHECK (
    (kind = 'announcement' AND announcement_id IS NOT NULL AND group_event_id IS NULL AND chat_id IS NULL AND global_announcement_id IS NULL AND group_id IS NOT NULL AND discussion_post_id IS NULL AND friend_request_id IS NULL AND assignment_id IS NULL)
    OR (kind = 'group_event' AND group_event_id IS NOT NULL AND announcement_id IS NULL AND chat_id IS NULL AND global_announcement_id IS NULL AND group_id IS NOT NULL AND discussion_post_id IS NULL AND friend_request_id IS NULL AND assignment_id IS NULL)
    OR (kind = 'chat_message' AND chat_id IS NOT NULL AND announcement_id IS NULL AND group_event_id IS NULL AND global_announcement_id IS NULL AND group_id IS NULL AND discussion_post_id IS NULL AND friend_request_id IS NULL AND assignment_id IS NULL)
    OR (kind = 'global_announcement' AND global_announcement_id IS NOT NULL AND announcement_id IS NULL AND group_event_id IS NULL AND chat_id IS NULL AND group_id IS NULL AND discussion_post_id IS NULL AND friend_request_id IS NULL AND assignment_id IS NULL)
    OR (kind = 'discussion_post' AND discussion_post_id IS NOT NULL AND discussion_id IS NOT NULL AND announcement_id IS NULL AND group_event_id IS NULL AND chat_id IS NULL AND global_announcement_id IS NULL AND friend_request_id IS NULL AND assignment_id IS NULL)
    OR (kind = 'friend_accepted' AND friend_request_id IS NOT NULL AND actor_user_id IS NOT NULL AND announcement_id IS NULL AND group_event_id IS NULL AND chat_id IS NULL AND global_announcement_id IS NULL AND group_id IS NULL AND discussion_post_id IS NULL AND assignment_id IS NULL)
    OR (kind = 'assignment' AND assignment_id IS NOT NULL AND group_id IS NOT NULL AND announcement_id IS NULL AND group_event_id IS NULL AND chat_id IS NULL AND global_announcement_id IS NULL AND discussion_post_id IS NULL AND friend_request_id IS NULL)
  );

-- =============================================================================
-- 2. A reply reaches the people in the thread
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_in_app_notifications_for_discussion_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary TEXT;
  v_group_id UUID;
  v_group_name TEXT;
  v_title TEXT;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT d.group_id, d.title INTO v_group_id, v_title
    FROM public.discussions d
   WHERE d.id = NEW.discussion_id AND d.deleted_at IS NULL;

  -- The thread is gone, or was never a group's: nothing to point at.
  IF v_group_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT g.name INTO v_group_name FROM public.groups g WHERE g.id = v_group_id;
  v_group_name := COALESCE(v_group_name, '');
  v_title := COALESCE(NULLIF(btrim(v_title), ''), v_group_name);

  v_summary := left(btrim(regexp_replace(COALESCE(NEW.body, ''), '[[:space:]]+', ' ', 'g')), 280);
  IF v_summary = '' THEN
    v_summary := v_title;
  END IF;

  INSERT INTO public.in_app_notifications (
    user_id, group_id, group_name, kind, discussion_id, discussion_post_id,
    actor_user_id, title, summary
  )
  SELECT
    r.user_id,
    v_group_id,
    v_group_name,
    'discussion_post'::TEXT,
    NEW.discussion_id,
    NEW.id,
    NEW.user_id,
    v_title,
    v_summary
  FROM (
    -- Whoever opened the thread, plus whoever has written in it.
    SELECT d.user_id FROM public.discussions d WHERE d.id = NEW.discussion_id
    UNION
    SELECT p.user_id
      FROM public.discussion_posts p
     WHERE p.discussion_id = NEW.discussion_id AND p.deleted_at IS NULL
  ) AS r
  -- Still a member: someone who left the group should not keep hearing from it.
  JOIN public.group_members gm
    ON gm.group_id = v_group_id AND gm.user_id = r.user_id
  WHERE r.user_id IS DISTINCT FROM NEW.user_id;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.create_in_app_notifications_for_discussion_post() OWNER TO postgres;

DROP TRIGGER IF EXISTS discussion_posts_in_app_notify ON public.discussion_posts;

CREATE TRIGGER discussion_posts_in_app_notify
  AFTER INSERT ON public.discussion_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_in_app_notifications_for_discussion_post();

-- =============================================================================
-- 3. The person who asked hears that it was accepted
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_in_app_notification_for_friend_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM 'accepted' OR OLD.status IS NOT DISTINCT FROM 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT NULLIF(btrim(p.display_name), '') INTO v_name
    FROM public.profiles p WHERE p.user_id = NEW.receiver_id;

  INSERT INTO public.in_app_notifications (
    user_id, group_id, group_name, kind, friend_request_id, actor_user_id, title, summary
  )
  VALUES (
    NEW.sender_id,
    NULL,
    '',
    'friend_accepted',
    NEW.id,
    NEW.receiver_id,
    COALESCE(v_name, ''),
    ''
  );

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.create_in_app_notification_for_friend_accepted() OWNER TO postgres;

DROP TRIGGER IF EXISTS friend_requests_in_app_notify ON public.friend_requests;

CREATE TRIGGER friend_requests_in_app_notify
  AFTER UPDATE OF status ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_in_app_notification_for_friend_accepted();

-- =============================================================================
-- 4. A new assignment reaches the group
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_in_app_notifications_for_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_name TEXT;
  v_summary TEXT;
BEGIN
  SELECT g.name INTO v_group_name FROM public.groups g WHERE g.id = NEW.group_id;
  v_group_name := COALESCE(v_group_name, '');

  v_summary := left(btrim(regexp_replace(COALESCE(NEW.description, ''), '[[:space:]]+', ' ', 'g')), 280);
  IF v_summary = '' THEN
    v_summary := NEW.title;
  END IF;

  INSERT INTO public.in_app_notifications (
    user_id, group_id, group_name, kind, assignment_id, actor_user_id, title, summary
  )
  SELECT
    gm.user_id,
    NEW.group_id,
    v_group_name,
    'assignment'::TEXT,
    NEW.id,
    NEW.created_by_user_id,
    NEW.title,
    v_summary
  FROM public.group_members gm
  WHERE gm.group_id = NEW.group_id
    AND gm.user_id IS DISTINCT FROM NEW.created_by_user_id;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.create_in_app_notifications_for_assignment() OWNER TO postgres;

DROP TRIGGER IF EXISTS assignments_in_app_notify ON public.assignments;

CREATE TRIGGER assignments_in_app_notify
  AFTER INSERT ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_in_app_notifications_for_assignment();
