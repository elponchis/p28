-- Structured attachments (images, videos, files) on chat_messages and discussion_posts.
-- Legacy image_urls remains; app derives image_urls from image-kind attachments on write.

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.discussion_posts
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill attachments from legacy image_urls where attachments is still empty.
UPDATE public.chat_messages
SET attachments = COALESCE(
  (
    SELECT jsonb_agg(jsonb_build_object('kind', 'image', 'url', u))
    FROM unnest(image_urls) AS u
    WHERE u IS NOT NULL AND length(trim(u)) > 0
  ),
  '[]'::jsonb
)
WHERE cardinality(image_urls) > 0
  AND attachments = '[]'::jsonb;

UPDATE public.discussion_posts
SET attachments = COALESCE(
  (
    SELECT jsonb_agg(jsonb_build_object('kind', 'image', 'url', u))
    FROM unnest(image_urls) AS u
    WHERE u IS NOT NULL AND length(trim(u)) > 0
  ),
  '[]'::jsonb
)
WHERE cardinality(image_urls) > 0
  AND attachments = '[]'::jsonb;

-- Widen public attachment buckets: 50 MB, images + video + whitelisted documents.
UPDATE storage.buckets
SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip'
  ]::text[]
WHERE id IN ('chat-images', 'discussion-post-images');
