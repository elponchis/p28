-- Remove viewer bypass: platform super_admins previously saw full member/admin lists via
-- current_user_is_super_admin() in the display RPCs, so leader stacks still showed hidden
-- super_admins. Lists are always community-filtered; use getGroupAdminsAll (table read) +
-- isUserGroupAdmin on the client for management and permission checks.

CREATE OR REPLACE FUNCTION public.group_members_for_display(p_group_id uuid)
RETURNS TABLE (user_id uuid, group_id uuid, joined_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gm.user_id, gm.group_id, gm.joined_at
  FROM public.group_members gm
  INNER JOIN public.groups g ON g.id = gm.group_id
  WHERE gm.group_id = p_group_id
    AND (
      NOT EXISTS (
        SELECT 1
        FROM public.app_roles ar
        WHERE ar.user_id = gm.user_id AND ar.role = 'super_admin'
      )
      OR (
        NOT EXISTS (
          SELECT 1
          FROM public.group_admins ga
          WHERE ga.group_id = p_group_id AND ga.user_id = gm.user_id
        )
        AND gm.user_id <> g.created_by_user_id
      )
    )
  ORDER BY gm.joined_at;
$$;

CREATE OR REPLACE FUNCTION public.group_admins_for_display(p_group_id uuid)
RETURNS TABLE (user_id uuid, group_id uuid, assigned_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ga.user_id, ga.group_id, ga.assigned_at
  FROM public.group_admins ga
  INNER JOIN public.groups g ON g.id = ga.group_id
  WHERE ga.group_id = p_group_id
    AND (
      NOT EXISTS (
        SELECT 1
        FROM public.app_roles ar
        WHERE ar.user_id = ga.user_id AND ar.role = 'super_admin'
      )
      OR ga.user_id = g.created_by_user_id
      OR EXISTS (
        SELECT 1
        FROM public.group_members gm
        WHERE gm.group_id = p_group_id AND gm.user_id = ga.user_id
      )
    )
  ORDER BY ga.assigned_at;
$$;
