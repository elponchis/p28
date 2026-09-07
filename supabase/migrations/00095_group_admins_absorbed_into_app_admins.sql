-- Running a group is an app admin's job.
--
-- There were two ways to be in charge of a group: a row in group_admins, or a platform role.
-- The first was granted by whoever created the group — not by a role, by an accident of who
-- clicked the button, and it outlived any role that person later lost. The second could do
-- everything anyway. So the per-group grant added a second answer to "who runs this?" that
-- nobody was maintaining, and it decided nothing that the platform roles did not already decide
-- in practice: at the time of writing there is exactly one group_admins row, and that person is
-- a super admin.
--
-- So the two collapse into one. An app admin runs every group; there is no per-group
-- appointment to make, forget, or inherit.
--
-- The change is one function. Thirteen migrations and fifty-six policies ask
-- current_user_is_effective_group_admin whether the caller runs a group, and they all follow
-- this new answer without being touched — which is why the name stays even though "effective"
-- and "group" have stopped meaning much.
--
-- group_admins keeps its rows. Nothing reads them now, but deleting a record of who used to run
-- what, to save a table, is a trade nobody asked for; it also makes this reversible.

CREATE OR REPLACE FUNCTION public.current_user_is_effective_group_admin(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  -- p_group_id is ignored: administering the app now means administering every group. The
  -- argument stays so the policies that pass it keep compiling.
  SELECT public.current_user_is_admin_or_super_admin();
$$;

CREATE OR REPLACE FUNCTION public.user_is_effective_group_admin_by_id(
  p_user_id uuid,
  p_group_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_roles ar
    WHERE ar.user_id = p_user_id AND ar.role IN ('super_admin', 'admin')
  );
$$;

COMMENT ON TABLE public.group_admins IS
  'Historic. Nothing reads this since 00095: administering a group means holding an app_roles row. Kept so the record of who ran what is not lost.';

-- Appointing is gone, so the ways to appoint go with it. The rows stay; new ones stop arriving.
DROP POLICY IF EXISTS "Group creator or super admin can add group admin" ON public.group_admins;
DROP POLICY IF EXISTS "Group creator or super admin can remove group admin" ON public.group_admins;
