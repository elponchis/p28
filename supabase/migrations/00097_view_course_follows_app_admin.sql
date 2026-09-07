-- The last reader of group_admins.
--
-- 00095 folded running a group into being an app admin and said nothing reads group_admins any
-- more. That was true of every policy, and untrue of one function: current_user_can_view_course
-- still asked the table whether the caller runs this course's group, which left a stale row from
-- the old world quietly granting sight of unpublished courses and courses outside their term.
--
-- It also left read and write disagreeing. Since 00093 a plain admin may edit any course, but
-- only a super admin could see one before it was published — so the Watch admin screen, which
-- lists exactly what the read policy returns, would have been empty for the very people it is
-- for. Nobody hit it because both admins today are super admins.
--
-- One clause, then: an app admin sees every course, and everyone else sees what they are allowed
-- to watch. The policies calling this are untouched.

CREATE OR REPLACE FUNCTION public.current_user_can_view_course(
  p_group_id uuid,
  p_available_from timestamptz,
  p_available_until timestamptz,
  p_is_published boolean DEFAULT true
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admins set the window and decide when to publish, so neither applies to them.
    public.current_user_is_admin_or_super_admin()
    OR (
      COALESCE(p_is_published, true)
      AND (p_available_from IS NULL OR p_available_from <= now())
      AND (p_available_until IS NULL OR p_available_until > now())
      AND (
        p_group_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.group_members gm
          WHERE gm.group_id = p_group_id AND gm.user_id = auth.uid()
        )
      )
    );
$$;
