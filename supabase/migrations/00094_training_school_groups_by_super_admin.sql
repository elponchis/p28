-- A training school is a super admin's to create.
--
-- Every kind of group has been creatable by any app admin. That was fine while a group was a
-- place to talk: make a wrong forum and you delete it. A training school is not that. It carries
-- access to content — courses attach to it, terms open on it, and every member of it can watch
-- what the term opens. Creating one is closer to granting an audience than to opening a room.
--
-- So the two kinds part company:
--
--   forum, ministry     -> any app admin
--   training_school     -> super admins
--
-- Nothing else about groups changes, and no existing group is affected: this governs INSERT
-- only, and a training school that already exists stays as it is.

DROP POLICY IF EXISTS "Admins can insert groups" ON public.groups;
DROP POLICY IF EXISTS "App admins can insert groups" ON public.groups;

CREATE POLICY "App admins can insert groups"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by_user_id
    AND (
      CASE
        WHEN type = 'training_school' THEN public.current_user_is_super_admin()
        ELSE public.current_user_is_admin_or_super_admin()
      END
    )
  );

-- Changing an existing group's kind is the same decision as creating one of that kind, so it
-- goes through the same gate: a plain admin cannot turn a forum into a training school.
CREATE OR REPLACE FUNCTION public.enforce_training_school_type_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'training_school'
     AND OLD.type IS DISTINCT FROM 'training_school'
     AND NOT public.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only a super admin may make a group a training school';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS groups_training_school_type_change ON public.groups;

CREATE TRIGGER groups_training_school_type_change
  BEFORE UPDATE OF type ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_training_school_type_change();
