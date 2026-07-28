-- One reaction per user per post. User can replace their reaction by choosing a different type.

-- Remove duplicate reactions, keeping one per (post_id, user_id)
DELETE FROM public.discussion_post_reactions a
USING public.discussion_post_reactions b
WHERE a.id > b.id
  AND a.post_id = b.post_id
  AND a.user_id = b.user_id;

ALTER TABLE public.discussion_post_reactions
  DROP CONSTRAINT IF EXISTS discussion_post_reactions_post_user_type_unique;

ALTER TABLE public.discussion_post_reactions
  ADD CONSTRAINT discussion_post_reactions_post_id_user_id_key
  UNIQUE (post_id, user_id);
