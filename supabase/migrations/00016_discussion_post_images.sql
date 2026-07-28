-- Add image_urls support to discussion_posts and storage for discussion post images.

-- 1. Add image_urls column to discussion_posts (array of public URLs)
ALTER TABLE public.discussion_posts
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- 2. Storage bucket for discussion post images (attachments in replies)
-- Path: {userId}/{timestamp}.{ext}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'discussion-post-images',
  'discussion-post-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload to their own path (userId/filename)
CREATE POLICY "Users can upload discussion post image"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'discussion-post-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own discussion post image"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'discussion-post-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own discussion post image"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'discussion-post-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read for discussion post images
CREATE POLICY "Discussion post images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'discussion-post-images');
