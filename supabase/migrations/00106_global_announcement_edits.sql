-- Super admins can fix or withdraw a platform-wide announcement after posting it.
-- Reading stays open to every signed-in user; only super admins may write.

CREATE POLICY "Super admins can update global announcements"
  ON public.global_announcements
  FOR UPDATE
  TO authenticated
  USING (public.current_user_is_super_admin())
  WITH CHECK (public.current_user_is_super_admin());

CREATE POLICY "Super admins can delete global announcements"
  ON public.global_announcements
  FOR DELETE
  TO authenticated
  USING (public.current_user_is_super_admin());

-- An edit keeps the author and the posting time; only the wording changes.
CREATE OR REPLACE FUNCTION public.global_announcements_guard_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.id := OLD.id;
  NEW.created_by_user_id := OLD.created_by_user_id;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

CREATE TRIGGER global_announcements_guard_edit
  BEFORE UPDATE ON public.global_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.global_announcements_guard_edit();
