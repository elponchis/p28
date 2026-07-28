-- Storage bucket for group banner images (used when creating/editing groups)
-- Path: {userId}/{timestamp}.{ext} for pre-creation uploads

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'group-banners',
  'group-banners',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload to their own path (userId/filename)
CREATE POLICY "Users can upload group banner"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'group-banners'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own group banner"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'group-banners'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own group banner"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'group-banners'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read for group banners
CREATE POLICY "Group banner images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'group-banners');
