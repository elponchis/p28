-- Group admins need to be able to delete OTHER students' submission files (e.g. when an
-- assignment, or an individual submission, is deleted by the admin) — the storage.objects
-- DELETE policy from 00068_assignments.sql only covers a student deleting their own file
-- (path segment [2] = auth.uid()). The DB-level ON DELETE CASCADE (submissions -> assignments)
-- only removes rows, not the actual Storage objects, so without this policy those files
-- would become orphaned in the assignment-submissions bucket whenever an admin deletes.

CREATE POLICY "Group admin can delete any submission file for their assignment"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'assignment-submissions'
    AND EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id::text = (storage.foldername(name))[1]
        AND public.current_user_is_effective_group_admin(a.group_id)
    )
  );
