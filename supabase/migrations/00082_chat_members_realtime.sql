-- Read receipts need chat_members on the wire.
--
-- The chat channel (messages:chat:{id}) already streams chat_messages INSERTs, which is how a
-- new message appears without a refetch. A read receipt is not a new row though -- it is an
-- UPDATE of chat_members.last_read_at -- and chat_members was never added to the realtime
-- publication, so the sender's "Seen" marker would only appear the next time the screen was
-- refocused.
--
-- Only the publication changes. RLS still decides who receives a row: postgres_changes applies
-- the subscriber's SELECT policy, and chat_members' policy is is_chat_member(chat_id) from
-- 00074, so a receipt reaches exactly the people already in that chat.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_members;
  END IF;
END
$$;
