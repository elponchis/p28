-- Fix infinite recursion in app_roles RLS policies.
-- Policies that SELECT from app_roles within their own USING/WITH CHECK cause recursion.
-- Use SECURITY DEFINER functions to check role without triggering RLS.

-- =============================================================================
-- 1. Create helper functions (run as definer, bypass RLS)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin_or_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
  );
$$;

-- =============================================================================
-- 2. Drop recursive app_roles policies
-- =============================================================================

DROP POLICY IF EXISTS "Super admin can read all app roles" ON public.app_roles;
DROP POLICY IF EXISTS "Super admin can insert admin roles" ON public.app_roles;
DROP POLICY IF EXISTS "Super admin can delete admin roles" ON public.app_roles;

-- =============================================================================
-- 3. Recreate app_roles policies using SECURITY DEFINER functions
-- =============================================================================

CREATE POLICY "Super admin can insert admin roles"
  ON public.app_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    role = 'admin'
    AND public.current_user_is_super_admin()
  );

CREATE POLICY "Super admin can delete admin roles"
  ON public.app_roles FOR DELETE
  TO authenticated
  USING (public.current_user_is_super_admin());

-- =============================================================================
-- 4. Drop and recreate groups policies (they reference app_roles)
-- =============================================================================

DROP POLICY IF EXISTS "Super admin or admin can insert groups" ON public.groups;

CREATE POLICY "Super admin or admin can insert groups"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by_user_id
    AND public.current_user_is_admin_or_super_admin()
  );

-- =============================================================================
-- 5. Drop and recreate group_admins policies (they reference app_roles)
-- =============================================================================

DROP POLICY IF EXISTS "Group creator or super admin can add group admin" ON public.group_admins;
DROP POLICY IF EXISTS "Group creator or super admin can remove group admin" ON public.group_admins;

CREATE POLICY "Group creator or super admin can add group admin"
  ON public.group_admins FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_id
        AND (
          g.created_by_user_id = auth.uid()
          OR public.current_user_is_super_admin()
        )
    )
  );

CREATE POLICY "Group creator or super admin can remove group admin"
  ON public.group_admins FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_id
        AND (
          g.created_by_user_id = auth.uid()
          OR public.current_user_is_super_admin()
        )
    )
  );
