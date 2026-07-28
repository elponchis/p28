-- Allow group creator to delete their group.
CREATE POLICY "Group creator can delete group"
  ON public.groups FOR DELETE
  TO authenticated
  USING (created_by_user_id = auth.uid());
