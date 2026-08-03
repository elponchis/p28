-- Chat messages: soft delete (Telegram-style tombstone) + voice message attachments.
--
-- Soft delete rides the EXISTING "Authors can update own chat messages" UPDATE policy
-- (00029_chat_messages.sql) — deleting is just an UPDATE setting deleted_at (and clearing
-- body/attachments/image_urls) scoped to `user_id = auth.uid()`, so no new RLS policy is
-- needed. Voice messages reuse the existing generic chat-images bucket + storage RLS
-- (00031/00063) — only the bucket's MIME whitelist needs widening.

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE storage.buckets
SET
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
    'application/zip',
    'audio/m4a',
    'audio/mp4',
    'audio/x-m4a',
    'audio/aac',
    'audio/webm',
    'audio/ogg',
    'audio/wav',
    'audio/mpeg'
  ]::text[]
WHERE id = 'chat-images';
