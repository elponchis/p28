-- Allow one user to give one of each reaction type per post.
-- Change UNIQUE(post_id, user_id) to UNIQUE(post_id, user_id, reaction_type).

ALTER TABLE public.discussion_post_reactions
  DROP CONSTRAINT IF EXISTS discussion_post_reactions_post_id_user_id_key;

ALTER TABLE public.discussion_post_reactions
  ADD CONSTRAINT discussion_post_reactions_post_user_type_unique
  UNIQUE (post_id, user_id, reaction_type);
