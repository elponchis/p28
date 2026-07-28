-- Add parent_post_id for reply-to-reply. Null = top-level reply.
ALTER TABLE public.discussion_posts
  ADD COLUMN parent_post_id UUID REFERENCES public.discussion_posts(id) ON DELETE CASCADE;

CREATE INDEX idx_discussion_posts_parent_post_id ON public.discussion_posts(parent_post_id);
