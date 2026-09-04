-- Chat schema, consolidated.
--
-- Everything the chat feature needs in one file: four tables, their constraints and indexes,
-- the RLS policies, the helper and trigger functions, and the realtime publication entries.
--
-- Generated from a database where this schema had settled after a dozen incremental migrations
-- rather than hand-merged from that history, so it is the end state -- including the fixes that
-- history contains (the RLS recursion in chat_members, the creator being unable to read the chat
-- it had just created, one reaction per person per message).
--
-- PREREQUISITES in the target project. This file does not create them and will fail without:
--   * auth.users                      -- Supabase Auth
--   * public.profiles(user_id, ...)   -- display names and avatars on messages
--   * public.friendships              -- who may open a conversation with whom
--   * public.group_members            -- the same question, answered by a shared group
--
-- Also expected, and NOT created here: a 'chat-images' storage bucket, plus a policy letting
-- chat members write to it. Attachments fail without one.
--
-- If the target has no friends-or-groups model, drop chat_members_enforce_reachability and the
-- two helpers it calls (users_are_friends, users_share_a_group). Everything else stands alone --
-- but note that removing it removes the only server-side limit on who can be added to a chat.


-- ============================================================================
-- Tables
-- ============================================================================

CREATE TABLE public.chat_members (
  chat_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  last_read_at timestamp with time zone NOT NULL DEFAULT now(),
  request_state text NOT NULL DEFAULT 'accepted'::text
);

CREATE TABLE public.chat_message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  user_id uuid NOT NULL,
  body text NOT NULL,
  image_urls text[] DEFAULT '{}'::text[],
  parent_message_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  deleted_at timestamp with time zone
);

CREATE TABLE public.chats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by_user_id uuid NOT NULL,
  name text,
  description text,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);


-- ============================================================================
-- Constraints
-- ============================================================================

ALTER TABLE public.chat_members ADD CONSTRAINT chat_members_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE;

ALTER TABLE public.chat_members ADD CONSTRAINT chat_members_pkey PRIMARY KEY (chat_id, user_id);

ALTER TABLE public.chat_members ADD CONSTRAINT chat_members_request_state_check CHECK ((request_state = ANY (ARRAY['accepted'::text, 'pending'::text, 'declined'::text])));

ALTER TABLE public.chat_members ADD CONSTRAINT chat_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.chat_message_reactions ADD CONSTRAINT chat_message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE;

ALTER TABLE public.chat_message_reactions ADD CONSTRAINT chat_message_reactions_message_id_user_id_reaction_type_key UNIQUE (message_id, user_id, reaction_type);

ALTER TABLE public.chat_message_reactions ADD CONSTRAINT chat_message_reactions_pkey PRIMARY KEY (id);

ALTER TABLE public.chat_message_reactions ADD CONSTRAINT chat_message_reactions_reaction_type_check CHECK ((reaction_type ~ '^[a-z][a-z0-9_]{0,31}$'::text));

ALTER TABLE public.chat_message_reactions ADD CONSTRAINT chat_message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE;

ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_parent_message_id_fkey FOREIGN KEY (parent_message_id) REFERENCES chat_messages(id) ON DELETE CASCADE;

ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);

ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.chats ADD CONSTRAINT chats_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.chats ADD CONSTRAINT chats_pkey PRIMARY KEY (id);


-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_chat_members_chat_id ON public.chat_members USING btree (chat_id);

CREATE INDEX idx_chat_members_pending ON public.chat_members USING btree (user_id) WHERE (request_state = 'pending'::text);

CREATE INDEX idx_chat_members_user_id ON public.chat_members USING btree (user_id);

CREATE INDEX idx_chat_message_reactions_message_id ON public.chat_message_reactions USING btree (message_id);

CREATE INDEX idx_chat_messages_chat_id_created_at ON public.chat_messages USING btree (chat_id, created_at);

CREATE INDEX idx_chat_messages_parent ON public.chat_messages USING btree (parent_message_id);

CREATE INDEX idx_chats_created_at ON public.chats USING btree (created_at DESC);


-- ============================================================================
-- Functions
-- Helpers first: the policies and triggers below call them.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_chat_request_on_reply()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.chat_members
  SET request_state = 'accepted'
  WHERE chat_id = NEW.chat_id
    AND user_id = NEW.user_id
    AND request_state = 'pending';
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_chat_member_reachability()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_chat_request_limits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_chat_shared_content(p_chat_id uuid)
 RETURNS TABLE(id uuid, created_at timestamp with time zone, body text, attachments jsonb, image_urls text[])
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT m.id, m.created_at, m.body, m.attachments, m.image_urls
  FROM public.chat_messages m
  WHERE m.chat_id = p_chat_id
    AND (
      jsonb_array_length(COALESCE(m.attachments, '[]'::jsonb)) > 0
      OR cardinality(COALESCE(m.image_urls, ARRAY[]::text[])) > 0
      OR m.body ~* 'https?://'
    )
  ORDER BY m.created_at DESC;
$function$
;

CREATE OR REPLACE FUNCTION public.is_chat_member(p_chat_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_members cm
    WHERE cm.chat_id = p_chat_id AND cm.user_id = auth.uid()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.set_chat_messages_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_chats_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.users_are_friends(p_a uuid, p_b uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE (f.user_id = p_a AND f.friend_id = p_b)
       OR (f.user_id = p_b AND f.friend_id = p_a)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.users_share_a_group(p_a uuid, p_b uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members ga
    JOIN public.group_members gb ON gb.group_id = ga.group_id
    WHERE ga.user_id = p_a AND gb.user_id = p_b
  );
$function$
;


-- ============================================================================
-- Triggers
-- ============================================================================

CREATE TRIGGER chat_members_enforce_reachability BEFORE INSERT ON public.chat_members FOR EACH ROW EXECUTE FUNCTION enforce_chat_member_reachability();

CREATE TRIGGER chat_messages_accept_on_reply AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION accept_chat_request_on_reply();

CREATE TRIGGER chat_messages_enforce_request_limits BEFORE INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION enforce_chat_request_limits();

CREATE TRIGGER chat_messages_set_chats_updated_at AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION set_chats_updated_at_on_message();

CREATE TRIGGER chat_messages_updated_at BEFORE UPDATE ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION set_chat_messages_updated_at();

CREATE TRIGGER chats_updated_at BEFORE UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION set_chats_updated_at();


-- ============================================================================
-- Row level security
-- ============================================================================

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can update own chat messages" ON public.chat_messages FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Chat creator can remove chat members" ON public.chat_members FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM chats c
  WHERE ((c.id = chat_members.chat_id) AND (c.created_by_user_id = auth.uid())))));

CREATE POLICY "Chat members can insert chat messages" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM chat_members cm
  WHERE ((cm.chat_id = chat_messages.chat_id) AND (cm.user_id = auth.uid()))))));

CREATE POLICY "Chat members can insert reaction" ON public.chat_message_reactions FOR INSERT TO authenticated
  WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (chat_messages cm
     JOIN chat_members cmem ON (((cmem.chat_id = cm.chat_id) AND (cmem.user_id = auth.uid()))))
  WHERE (cm.id = chat_message_reactions.message_id)))));

CREATE POLICY "Chat members can read chat messages" ON public.chat_messages FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM chat_members cm
  WHERE ((cm.chat_id = chat_messages.chat_id) AND (cm.user_id = auth.uid())))));

CREATE POLICY "Chat members can read chat_members" ON public.chat_members FOR SELECT TO authenticated
  USING (is_chat_member(chat_id));

CREATE POLICY "Chat members can read chats" ON public.chats FOR SELECT TO authenticated
  USING (((created_by_user_id = auth.uid()) OR is_chat_member(id)));

CREATE POLICY "Chat members can read reactions" ON public.chat_message_reactions FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (chat_messages cm
     JOIN chat_members cmem ON (((cmem.chat_id = cm.chat_id) AND (cmem.user_id = auth.uid()))))
  WHERE (cm.id = chat_message_reactions.message_id))));

CREATE POLICY "Chat members can update chat" ON public.chats FOR UPDATE TO authenticated
  USING (is_chat_member(id));

CREATE POLICY "Creator can insert chat members" ON public.chat_members FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM chats c
  WHERE ((c.id = chat_members.chat_id) AND (c.created_by_user_id = auth.uid())))));

CREATE POLICY "Creator can insert chat" ON public.chats FOR INSERT TO authenticated
  WITH CHECK ((created_by_user_id = auth.uid()));

CREATE POLICY "Members can add chat members" ON public.chat_members FOR INSERT TO authenticated
  WITH CHECK (is_chat_member(chat_id));

CREATE POLICY "Members can update own chat_members row" ON public.chat_members FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Users can delete own reaction" ON public.chat_message_reactions FOR DELETE TO authenticated
  USING ((user_id = auth.uid()));

CREATE POLICY "Users can leave chat" ON public.chat_members FOR DELETE TO authenticated
  USING ((user_id = auth.uid()));

CREATE POLICY "Users can update own reaction" ON public.chat_message_reactions FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));


-- ============================================================================
-- Realtime
-- ============================================================================
-- chat_messages carries new messages. chat_members carries read receipts: last_read_at moves as
-- people read, and that is what makes the unread count fall without a refetch.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_members;
  END IF;
END
$$;
