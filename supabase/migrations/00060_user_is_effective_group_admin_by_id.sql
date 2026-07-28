-- Authoritative check for Edge push functions (same logic as current_user_is_effective_group_admin).
-- SECURITY DEFINER: evaluates using definer privileges so service_role RPC calls are not affected
-- by table-level RLS quirks on direct selects.

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
  SELECT
    EXISTS (
      SELECT 1
      FROM public.group_admins ga
      WHERE ga.group_id = p_group_id AND ga.user_id = p_user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.app_roles ar
      WHERE ar.user_id = p_user_id AND ar.role = 'super_admin'
    );
$$;

REVOKE ALL ON FUNCTION public.user_is_effective_group_admin_by_id(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_effective_group_admin_by_id(uuid, uuid) TO service_role;
