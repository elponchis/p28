-- Creating a chat failed with
--   42501: new row violates row-level security policy for table "chats"
--
-- The INSERT policy ("Creator can insert chat", WITH CHECK created_by_user_id =
-- auth.uid()) was never the problem. Two SELECT-side checks were:
--
-- 1. createChat inserts the chat with `.select(...)` (PostgREST return=representation,
--    i.e. INSERT ... RETURNING). Postgres applies the table's SELECT policies to the
--    returned row as a WITH CHECK option -- deliberately, so a row cannot be inserted
--    and then hidden -- and reports a failure with the same "new row violates
--    row-level security policy" wording as an INSERT check. The SELECT policy is
--    is_chat_member(id), and at that instant the creator is not a member yet, because
--    chat_members rows are written by the very next statement.
--
-- 2. Even with RETURNING dropped, the follow-up insert into chat_members could not
--    succeed either: "Creator can insert chat members" (00028) does
--    EXISTS (SELECT 1 FROM chats c WHERE c.id = chat_id AND c.created_by_user_id = auth.uid()),
--    and that inner read is itself filtered by the chats SELECT policy, so it finds
--    nothing. The other permissive policy, "Members can add chat members" (00074),
--    checks is_chat_member(chat_id), which is false for the same bootstrap reason.
--
-- Both are the same hole: a chat's creator cannot see the chat between creating it
-- and joining it. Letting the creator read their own chats closes it, and needs no
-- new helper -- created_by_user_id is a column on the row being checked, so this adds
-- no subquery and cannot recurse.
--
-- Scope of the widening: a creator who later leaves the chat keeps reading this row
-- (name, description, image_url). Messages, members and attachments are all gated on
-- chat_members separately, so nothing said in the chat becomes visible.

DROP POLICY IF EXISTS "Chat members can read chats" ON public.chats;
CREATE POLICY "Chat members can read chats"
  ON public.chats FOR SELECT
  TO authenticated
  USING (
    created_by_user_id = auth.uid()
    OR public.is_chat_member(id)
  );
