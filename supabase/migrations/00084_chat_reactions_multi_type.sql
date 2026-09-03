-- One person, several reactions on the same chat message.
--
-- chat_message_reactions has carried UNIQUE (message_id, user_id) since 00030, which is one
-- reaction per person per message: adding a second emoji did not sit alongside the first, it
-- replaced it, because the adapter upserts on that conflict. With twelve emoji to choose from
-- (00083) that limit is the thing standing between a message and a row of reactions.
--
-- Discussion posts settled this in 00018 with exactly this change; chat simply never got it.
-- Widening the key to include reaction_type keeps the guarantee that matters -- the same person
-- cannot react twice with the same emoji -- while allowing different ones to coexist.
--
-- Widening a unique constraint never conflicts with existing rows: every row that satisfied the
-- narrower key satisfies this one.

ALTER TABLE public.chat_message_reactions
  DROP CONSTRAINT IF EXISTS chat_message_reactions_message_id_user_id_key;

ALTER TABLE public.chat_message_reactions
  ADD CONSTRAINT chat_message_reactions_message_id_user_id_reaction_type_key
  UNIQUE (message_id, user_id, reaction_type);
