-- Storage bucket for chat avatars and chat message images.
-- Paths: avatars/{chatId}/{filename} for chat avatars, messages/{userId}/{filename} for message attachments.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images',
  'chat-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Chat members can upload chat avatars (path: avatars/{chatId}/...)
CREATE POLICY "Chat members can upload chat avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = 'avatars'
    AND EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = ((storage.foldername(name))[2])::uuid
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Chat members can update chat avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = 'avatars'
    AND EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = ((storage.foldername(name))[2])::uuid
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Chat members can delete chat avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = 'avatars'
    AND EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = ((storage.foldername(name))[2])::uuid
      AND cm.user_id = auth.uid()
    )
  );

-- Users can upload chat message images (path: messages/{userId}/...)
CREATE POLICY "Users can upload chat message image"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = 'messages'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can update own chat message image"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = 'messages'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can delete own chat message image"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = 'messages'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Public read for all chat images
CREATE POLICY "Chat images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-images');
