-- Upload enhancements: multi-file assignment submissions + instructor-uploaded
-- assignment materials. Additive only (no columns dropped) so existing rows and
-- any code still reading the legacy single-file columns keep working.

-- =============================================================================
-- 1. submissions.files: JSONB array of {path, name, size} for multi-file
--    submissions. Legacy file_path/file_name/file_size stay populated with the
--    first file on every write for backward compatibility; the app reads `files`.
-- =============================================================================

ALTER TABLE public.submissions
  ADD COLUMN files JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.submissions
SET files = jsonb_build_array(
  jsonb_build_object('path', file_path, 'name', file_name, 'size', file_size)
)
WHERE file_path IS NOT NULL;

-- =============================================================================
-- 2. assignments.materials: JSONB array of {path, name, size} for reference
--    material an instructor attaches at assignment create/edit time.
-- =============================================================================

ALTER TABLE public.assignments
  ADD COLUMN materials JSONB NOT NULL DEFAULT '[]'::jsonb;

-- =============================================================================
-- 3. Storage: public bucket for assignment materials (course content, not
--    sensitive submission data -- mirrors the group-banners public-bucket
--    pattern from 00013). Path: {groupId}/{userId}/{timestamp}-{filename}.
--    groupId leads the path (rather than assignmentId) so an instructor can
--    upload material while still on the "create assignment" screen, before
--    the assignment row exists yet -- same reason group-banners/discussion
--    images are keyed by userId instead of the not-yet-created group/post id.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignment-materials',
  'assignment-materials',
  true,
  52428800,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
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
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Group admins can upload assignment material"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'assignment-materials'
    AND public.current_user_is_effective_group_admin(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Group admins can update assignment material"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'assignment-materials'
    AND public.current_user_is_effective_group_admin(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Group admins can delete assignment material"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'assignment-materials'
    AND public.current_user_is_effective_group_admin(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Assignment materials are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assignment-materials');
