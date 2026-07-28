-- Discussion UPDATE and DELETE: creator, group admins, and app admins can edit/delete.

CREATE POLICY "Creator group admin or app admin can update discussions"
  ON public.discussions FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_admins ga
      WHERE ga.group_id = discussions.group_id AND ga.user_id = auth.uid()
    )
    OR public.current_user_is_admin_or_super_admin()
  );

CREATE POLICY "Creator group admin or app admin can delete discussions"
  ON public.discussions FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_admins ga
      WHERE ga.group_id = discussions.group_id AND ga.user_id = auth.uid()
    )
    OR public.current_user_is_admin_or_super_admin()
  );
