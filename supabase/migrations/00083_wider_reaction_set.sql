-- More reactions than the original three.
--
-- Both reaction tables pinned reaction_type to ('prayer', 'laugh', 'thumbs_up') -- 00017 for
-- discussion posts, 00030 for chat messages. The set is now twelve: heart, thumbs_up, laugh and
-- sad as the quick picks, with prayer, wow, clap, fire, celebrate, thinking, eyes and check
-- behind the picker's + button.
--
-- Still an allowlist rather than free text. A CHECK is what keeps a typo or a client sending an
-- arbitrary string out of the table, and every value here has an emoji to render on the client
-- (PostReactionType in lib/api/contracts/dto.ts and the catalogue in
-- components/messages/constants.ts are the same list) -- an unknown key would draw a blank badge.
--
-- Nothing is removed: prayer stays valid, so every reaction already stored keeps rendering. It
-- simply moved out of the first row of the picker and into the + list.

ALTER TABLE public.discussion_post_reactions
  DROP CONSTRAINT IF EXISTS discussion_post_reactions_reaction_type_check;

ALTER TABLE public.discussion_post_reactions
  ADD CONSTRAINT discussion_post_reactions_reaction_type_check
  CHECK (
    reaction_type IN (
      'heart', 'thumbs_up', 'laugh', 'sad',
      'prayer', 'wow', 'clap', 'fire', 'celebrate', 'thinking', 'eyes', 'check'
    )
  );

ALTER TABLE public.chat_message_reactions
  DROP CONSTRAINT IF EXISTS chat_message_reactions_reaction_type_check;

ALTER TABLE public.chat_message_reactions
  ADD CONSTRAINT chat_message_reactions_reaction_type_check
  CHECK (
    reaction_type IN (
      'heart', 'thumbs_up', 'laugh', 'sad',
      'prayer', 'wow', 'clap', 'fire', 'celebrate', 'thinking', 'eyes', 'check'
    )
  );
