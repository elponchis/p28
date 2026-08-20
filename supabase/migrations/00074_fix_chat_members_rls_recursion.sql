-- Fix infinite recursion (SQLSTATE 42P17) in the chat_members RLS policies.
--
-- "Chat members can read chat_members" was defined as a SELECT policy on
-- chat_members whose USING clause reads chat_members. Evaluating the policy
-- requires evaluating the policy, so Postgres aborts with
--   42P17: infinite recursion detected in policy for relation "chat_members"
-- The INSERT policy had the same shape, and the chats policies inherited the
-- fault by reading chat_members.
--
-- The blast radius was much wider than chat: storage.objects carries a
-- permissive INSERT policy ("Chat members can upload chat avatar") that reads
-- chat_members, and Postgres evaluates every permissive policy on an INSERT.
-- So *every upload to every bucket* hit the recursion. Supabase Storage maps
-- 42P17 to DatabaseInvalidObjectDefinition and returns
--   {"statusCode":"503","error":"DatabaseInvalidObjectDefinition",
--    "message":"The database schema is invalid or incompatible."}
-- over HTTP 400 — which is why no file had ever uploaded successfully.
--
-- The fix is the same SECURITY DEFINER helper pattern already used by
-- public.current_user_is_effective_group_admin (00059): the function owner
-- bypasses RLS on the inner read, so the policy no longer re-enters itself.

CREATE OR REPLACE FUNCTION public.is_chat_member(p_chat_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_members cm
    WHERE cm.chat_id = p_chat_id AND cm.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_chat_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_chat_member(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- chat_members: the two self-referencing policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Chat members can read chat_members" ON public.chat_members;
CREATE POLICY "Chat members can read chat_members"
  ON public.chat_members FOR SELECT
  TO authenticated
  USING (public.is_chat_member(chat_id));

DROP POLICY IF EXISTS "Members can add chat members" ON public.chat_members;
CREATE POLICY "Members can add chat members"
  ON public.chat_members FOR INSERT
  TO authenticated
  WITH CHECK (public.is_chat_member(chat_id));

-- ---------------------------------------------------------------------------
-- chats: read chat_members through the helper instead of directly
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Chat members can read chats" ON public.chats;
CREATE POLICY "Chat members can read chats"
  ON public.chats FOR SELECT
  TO authenticated
  USING (public.is_chat_member(id));

DROP POLICY IF EXISTS "Chat members can update chat" ON public.chats;
CREATE POLICY "Chat members can update chat"
  ON public.chats FOR UPDATE
  TO authenticated
  USING (public.is_chat_member(id));

-- ---------------------------------------------------------------------------
-- storage.objects: the policy that made this break uploads to every bucket
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Chat members can upload chat avatar" ON storage.objects;
CREATE POLICY "Chat members can upload chat avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = 'avatars'
    AND public.is_chat_member(((storage.foldername(name))[2])::uuid)
  );
