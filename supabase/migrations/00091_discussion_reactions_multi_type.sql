-- One person, several reactions on the same discussion reply — the rule chat has had since
-- 00084.
--
-- The two features share the emoji set (00083), the picker, the hover toolbar and the badges, and
-- differed only here: discussion_post_reactions has carried UNIQUE (post_id, user_id) since
-- 00019, so a second emoji from the same person replaced their first instead of sitting beside
-- it. Same button, same row of twelve emoji, two different behaviours depending on which screen
-- you were on — which reads as reactions disappearing rather than as a rule.
--
-- Widening the key keeps the guarantee that matters, that nobody reacts twice with the same
-- emoji, and never conflicts with existing rows: everything that satisfied the narrower key
-- satisfies this one.

ALTER TABLE public.discussion_post_reactions
  DROP CONSTRAINT IF EXISTS discussion_post_reactions_post_id_user_id_key;

ALTER TABLE public.discussion_post_reactions
  DROP CONSTRAINT IF EXISTS discussion_post_reactions_post_user_type_unique;

ALTER TABLE public.discussion_post_reactions
  ADD CONSTRAINT discussion_post_reactions_post_id_user_id_reaction_type_key
  UNIQUE (post_id, user_id, reaction_type);
