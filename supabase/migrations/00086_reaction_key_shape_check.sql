-- Adding an emoji should not need a database deploy.
--
-- reaction_type has been validated against a list of allowed values since 00017 and 00030,
-- widened to twelve in 00083. That made the set of reactions a schema decision: adding a smiley
-- meant editing the API contract, the UI catalogue AND writing a migration, and shipping the
-- three in the right order or the client would write rows the column rejects.
--
-- The column now checks shape instead of membership. A key must be short, lowercase ASCII with
-- underscores -- enough to keep junk, free text and accidental emoji-as-key out of the column,
-- while leaving which keys exist to the client catalogue in lib/reactions.ts.
--
-- Nothing that was valid becomes invalid: every key in the previous list satisfies the pattern,
-- so no row needs migrating and no reaction stops rendering. A key the running build does not
-- recognise is dropped when read (isKnownReaction), so a row written by a newer client shows as
-- nothing rather than a blank badge.

ALTER TABLE public.discussion_post_reactions
  DROP CONSTRAINT IF EXISTS discussion_post_reactions_reaction_type_check;

ALTER TABLE public.discussion_post_reactions
  ADD CONSTRAINT discussion_post_reactions_reaction_type_check
  CHECK (reaction_type ~ '^[a-z][a-z0-9_]{0,31}$');

ALTER TABLE public.chat_message_reactions
  DROP CONSTRAINT IF EXISTS chat_message_reactions_reaction_type_check;

ALTER TABLE public.chat_message_reactions
  ADD CONSTRAINT chat_message_reactions_reaction_type_check
  CHECK (reaction_type ~ '^[a-z][a-z0-9_]{0,31}$');
