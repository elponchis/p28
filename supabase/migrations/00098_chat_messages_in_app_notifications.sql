-- A new message belongs in the notifications list.
--
-- The settings screen offers a "메시지 / Messages" switch, and the bell in the header has never
-- shown one: in_app_notifications only accepted 'announcement' and 'group_event', and nothing
-- wrote a row for a chat message. So the switch governed push and nothing else, and a reader who
-- opened the notifications tab after being messaged found it empty. The promise and the screen
-- disagreed; this makes the screen keep the promise.
--
-- One live row per conversation, not one per message. Fifty messages in a group is one line in
-- the list saying that group is talking — the same coalescing the push side already does, for the
-- same reason. The row is rewritten as newer messages land and disappears when the reader opens
-- the chat.

-- =============================================================================
-- 1. The table learns about chats
-- =============================================================================

-- A chat notification has no group, and group_name carries the conversation's name instead.
ALTER TABLE public.in_app_notifications ALTER COLUMN group_id DROP NOT NULL;

ALTER TABLE public.in_app_notifications
  ADD COLUMN IF NOT EXISTS chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS chat_message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL;

ALTER TABLE public.in_app_notifications DROP CONSTRAINT IF EXISTS in_app_notifications_kind_check;

ALTER TABLE public.in_app_notifications
  ADD CONSTRAINT in_app_notifications_kind_check
  CHECK (kind IN ('announcement', 'group_event', 'chat_message'));

ALTER TABLE public.in_app_notifications DROP CONSTRAINT IF EXISTS in_app_notifications_ref_check;

ALTER TABLE public.in_app_notifications
  ADD CONSTRAINT in_app_notifications_ref_check CHECK (
    (kind = 'announcement' AND announcement_id IS NOT NULL AND group_event_id IS NULL AND chat_id IS NULL AND group_id IS NOT NULL)
    OR (kind = 'group_event' AND group_event_id IS NOT NULL AND announcement_id IS NULL AND chat_id IS NULL AND group_id IS NOT NULL)
    OR (kind = 'chat_message' AND chat_id IS NOT NULL AND announcement_id IS NULL AND group_event_id IS NULL AND group_id IS NULL)
  );

-- What makes the coalescing possible: at most one unread row per reader per conversation, which
-- the insert below upserts onto.
CREATE UNIQUE INDEX IF NOT EXISTS idx_in_app_notifications_unread_chat
  ON public.in_app_notifications(user_id, chat_id)
  WHERE kind = 'chat_message' AND read_at IS NULL;

COMMENT ON COLUMN public.in_app_notifications.chat_id IS
  'The conversation this is about, for kind = chat_message. At most one unread row per reader per chat.';

-- =============================================================================
-- 2. A message notifies the other members
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_in_app_notification_for_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender TEXT;
  v_chat_name TEXT;
  v_summary TEXT;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(
           NULLIF(btrim(p.display_name), ''),
           NULLIF(btrim(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
           'Someone'
         )
    INTO v_sender
    FROM public.profiles p
   WHERE p.user_id = NEW.user_id;
  v_sender := COALESCE(v_sender, 'Someone');

  SELECT NULLIF(btrim(c.name), '') INTO v_chat_name FROM public.chats c WHERE c.id = NEW.chat_id;

  -- The body, or what was sent instead of one. The list needs something to show either way.
  v_summary := left(btrim(regexp_replace(COALESCE(NEW.body, ''), '[[:space:]]+', ' ', 'g')), 280);
  IF v_summary = '' THEN
    v_summary := CASE
      WHEN jsonb_typeof(NEW.attachments) = 'array' AND jsonb_array_length(NEW.attachments) > 0
        THEN '📎'
      ELSE '…'
    END;
  END IF;

  INSERT INTO public.in_app_notifications (
    user_id, group_id, group_name, kind, chat_id, chat_message_id, title, summary
  )
  SELECT
    cm.user_id,
    NULL,
    COALESCE(v_chat_name, v_sender),
    'chat_message',
    NEW.chat_id,
    NEW.id,
    CASE WHEN v_chat_name IS NULL THEN v_sender ELSE v_sender || ' · ' || v_chat_name END,
    v_summary
  FROM public.chat_members cm
  LEFT JOIN public.notification_preferences np ON np.user_id = cm.user_id
  WHERE cm.chat_id = NEW.chat_id
    AND cm.user_id <> NEW.user_id
    -- Declining a conversation means not hearing from it again.
    AND COALESCE(cm.request_state, 'accepted') <> 'declined'
    -- The same switch the push side reads: off means off everywhere, not just on the phone.
    AND COALESCE(np.messages_enabled, true)
  ON CONFLICT (user_id, chat_id) WHERE kind = 'chat_message' AND read_at IS NULL
  DO UPDATE SET
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    chat_message_id = EXCLUDED.chat_message_id,
    group_name = EXCLUDED.group_name,
    created_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_messages_in_app_notify ON public.chat_messages;

CREATE TRIGGER chat_messages_in_app_notify
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_in_app_notification_for_chat_message();

-- =============================================================================
-- 3. Reading the conversation clears it
-- =============================================================================

CREATE OR REPLACE FUNCTION public.clear_in_app_notifications_on_chat_read()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_read_at IS NULL OR NEW.last_read_at IS NOT DISTINCT FROM OLD.last_read_at THEN
    RETURN NEW;
  END IF;

  UPDATE public.in_app_notifications
     SET read_at = now()
   WHERE user_id = NEW.user_id
     AND chat_id = NEW.chat_id
     AND kind = 'chat_message'
     AND read_at IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_members_clear_in_app_notifications ON public.chat_members;

CREATE TRIGGER chat_members_clear_in_app_notifications
  AFTER UPDATE OF last_read_at ON public.chat_members
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_in_app_notifications_on_chat_read();

-- =============================================================================
-- 4. The app icon badge must not count the same message twice
-- =============================================================================

-- get_app_badge_count already counts a conversation with unread messages. Now that those also
-- produce an in_app_notifications row, counting both would double every unread chat.
CREATE OR REPLACE FUNCTION public.get_app_badge_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN
    COALESCE(
      (
        SELECT COUNT(DISTINCT cm.chat_id)::int
        FROM public.chat_members cm
        WHERE cm.user_id = p_user_id
          AND cm.request_state = 'accepted'
          AND cm.last_read_at IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.chat_messages m
            WHERE m.chat_id = cm.chat_id
              AND m.user_id <> p_user_id
              AND m.created_at > cm.last_read_at
          )
      ),
      0
    )
    + COALESCE(
        (
          SELECT COUNT(*)::int
          FROM public.friend_requests fr
          WHERE fr.receiver_id = p_user_id
            AND fr.status = 'pending'
        ),
        0
      )
    + COALESCE(
        (
          SELECT COUNT(*)::int
          FROM public.in_app_notifications n
          WHERE n.user_id = p_user_id
            AND n.read_at IS NULL
            AND n.kind <> 'chat_message'
            AND (
              (
                SELECT pr.notifications_badge_cleared_at
                FROM public.profiles pr
                WHERE pr.user_id = p_user_id
              ) IS NULL
              OR n.created_at
              > (
                SELECT pr.notifications_badge_cleared_at
                FROM public.profiles pr
                WHERE pr.user_id = p_user_id
              )
            )
        ),
        0
      );
END;
$$;
