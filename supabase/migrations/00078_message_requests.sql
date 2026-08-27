-- Message requests: you no longer have to be friends to send someone a first message.
--
-- Reach is limited to people you already share a group with. The app checked friendship
-- in application code only (createChat in the Supabase adapter), which a direct API call
-- could skip entirely — RLS happily let a chat creator add any user. The new rule is
-- enforced by a trigger instead, so it holds no matter how the row is written.
--
-- An unaccepted conversation is a REQUEST: it sits out of the recipient's inbox until
-- they accept, and the sender may only send a few messages until then, so a request
-- cannot become a channel for harassment.

-- =============================================================================
-- 1. Per-member request state. Defaults to 'accepted', so every chat_members row
--    that already exists keeps behaving exactly as before.
-- =============================================================================

ALTER TABLE public.chat_members
  ADD COLUMN request_state TEXT NOT NULL DEFAULT 'accepted'
    CHECK (request_state IN ('accepted', 'pending', 'declined'));

-- Partial index: the requests inbox asks "which of my rows are pending", and pending
-- rows are a small minority of the table.
CREATE INDEX idx_chat_members_pending
  ON public.chat_members(user_id)
  WHERE request_state = 'pending';

-- =============================================================================
-- 2. Reachability: do these two users share at least one group?
--    SECURITY DEFINER so it can see both users' memberships regardless of the
--    caller's own RLS view, and so it cannot be defeated by a caller who can only
--    read their own group_members rows.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.users_share_a_group(p_a uuid, p_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members ga
    JOIN public.group_members gb ON gb.group_id = ga.group_id
    WHERE ga.user_id = p_a AND gb.user_id = p_b
  );
$$;

CREATE OR REPLACE FUNCTION public.users_are_friends(p_a uuid, p_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE (f.user_id = p_a AND f.friend_id = p_b)
       OR (f.user_id = p_b AND f.friend_id = p_a)
  );
$$;

-- =============================================================================
-- 3. Enforce reach on insert. Adding YOURSELF is always allowed (that is how a
--    creator joins their own chat, and how existing flows work). Adding SOMEONE
--    ELSE requires that you are friends or share a group.
--
--    Group chats are covered by the same rule, one member at a time: you can only
--    pull in people you could already have reached directly.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_chat_member_reachability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  -- auth.uid() is NULL for service-role/back-end writes (migrations, admin tooling);
  -- those are trusted and not subject to the reach rule.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.users_are_friends(auth.uid(), NEW.user_id)
     OR public.users_share_a_group(auth.uid(), NEW.user_id) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'You can only message people you share a group with'
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER chat_members_enforce_reachability
  BEFORE INSERT ON public.chat_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_chat_member_reachability();

-- =============================================================================
-- 4. Cap an unaccepted request. Until the other side accepts, the requester gets
--    a small number of messages — enough to say who they are, not enough to use
--    the thread as a megaphone. A declined request is closed outright.
--
--    Replying is accepting: a member who sends a message in a chat their own row
--    is still pending on has, by definition, engaged with it.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_chat_request_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_pending_messages CONSTANT INTEGER := 3;
  v_blocked BOOLEAN;
  v_pending BOOLEAN;
  v_sent INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.chat_members cm
    WHERE cm.chat_id = NEW.chat_id
      AND cm.user_id <> NEW.user_id
      AND cm.request_state = 'declined'
  ) INTO v_blocked;

  IF v_blocked THEN
    RAISE EXCEPTION 'This conversation was declined'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.chat_members cm
    WHERE cm.chat_id = NEW.chat_id
      AND cm.user_id <> NEW.user_id
      AND cm.request_state = 'pending'
  ) INTO v_pending;

  IF v_pending THEN
    SELECT count(*) INTO v_sent
    FROM public.chat_messages m
    WHERE m.chat_id = NEW.chat_id AND m.user_id = NEW.user_id;

    IF v_sent >= max_pending_messages THEN
      RAISE EXCEPTION 'Wait for a reply before sending more messages'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER chat_messages_enforce_request_limits
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_chat_request_limits();

CREATE OR REPLACE FUNCTION public.accept_chat_request_on_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_members
  SET request_state = 'accepted'
  WHERE chat_id = NEW.chat_id
    AND user_id = NEW.user_id
    AND request_state = 'pending';
  RETURN NULL;
END;
$$;

CREATE TRIGGER chat_messages_accept_on_reply
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.accept_chat_request_on_reply();

-- =============================================================================
-- 5. Let a member set their OWN request_state (accept / decline). The existing
--    "Members can update own chat_members row" policy from 00038 already permits
--    updating one's own row, so accepting needs no new policy — this comment
--    records that the check was made rather than overlooked.
-- =============================================================================

-- =============================================================================
-- 6. users_share_a_group is called over PostgREST (rpc) so the UI can hide a
--    message button that would fail. Granted explicitly rather than relying on the
--    default PUBLIC EXECUTE, so the intent survives a future default change.
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.users_share_a_group(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.users_are_friends(uuid, uuid) TO authenticated;
