-- Allow group admins to delete recurring meeting rows.

CREATE POLICY "Group admins can delete recurring meetings"
  ON public.group_recurring_meetings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_admins ga
      WHERE ga.group_id = group_recurring_meetings.group_id AND ga.user_id = auth.uid()
    )
  );
