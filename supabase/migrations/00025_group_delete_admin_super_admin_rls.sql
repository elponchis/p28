-- Allow group creator, group admins, and super admins to delete a group.
DROP POLICY IF EXISTS "Group creator can delete group" ON public.groups;
CREATE POLICY "Creator, group admin, or super admin can delete group"
  ON public.groups FOR DELETE
  TO authenticated
  USING (
    created_by_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.group_admins ga WHERE ga.group_id = id AND ga.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin')
  );
