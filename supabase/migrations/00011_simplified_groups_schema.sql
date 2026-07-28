-- MVP Simplification: Replace org/ministry/group hierarchy with flat Forums and Ministries.
-- Groups are top-level. Super Admin + Admin roles. Group membership and group admins.

-- =============================================================================
-- 1. Drop old policies (must drop before dropping tables they reference)
-- =============================================================================

-- Ministry leads (Story 2.4)
DROP POLICY IF EXISTS "Org admin can assign ministry leads" ON public.ministry_leads;
DROP POLICY IF EXISTS "Org admin can remove ministry leads" ON public.ministry_leads;
DROP POLICY IF EXISTS "Authenticated can read ministry_leads" ON public.ministry_leads;

-- Org/ministry/group write policies (00008, 00009)
DROP POLICY IF EXISTS "Authenticated can insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admin can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Org admin can insert ministries" ON public.ministries;
DROP POLICY IF EXISTS "Org admin can update ministries" ON public.ministries;
DROP POLICY IF EXISTS "Org admin can insert groups" ON public.groups;
DROP POLICY IF EXISTS "Org admin can update groups" ON public.groups;
DROP POLICY IF EXISTS "User can add self to org" ON public.org_members;

-- Read policies (00006)
DROP POLICY IF EXISTS "Authenticated can read organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated can read ministries" ON public.ministries;
DROP POLICY IF EXISTS "Authenticated can read groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated can read org_members" ON public.org_members;
DROP POLICY IF EXISTS "Authenticated can read ministry_leads" ON public.ministry_leads;

-- =============================================================================
-- 2. Drop old tables (reverse dependency order)
-- =============================================================================

DROP TABLE IF EXISTS public.ministry_leads;
DROP TABLE IF EXISTS public.org_members;
DROP TABLE IF EXISTS public.groups;
DROP TABLE IF EXISTS public.ministries;
DROP TABLE IF EXISTS public.organizations;

-- =============================================================================
-- 3. App roles (super_admin, admin)
-- =============================================================================

CREATE TABLE public.app_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin')),
  assigned_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id)
);

CREATE INDEX idx_app_roles_role ON public.app_roles(role);

-- =============================================================================
-- 4. Groups (Forums and Ministries - top level)
-- =============================================================================

CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('forum', 'ministry')),
  name TEXT NOT NULL,
  description TEXT,
  banner_image_url TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  country TEXT NOT NULL DEFAULT 'Online',
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_groups_type ON public.groups(type);
CREATE INDEX idx_groups_created_by ON public.groups(created_by_user_id);
CREATE INDEX idx_groups_name ON public.groups(name);

-- =============================================================================
-- 5. Group membership (join/leave)
-- =============================================================================

CREATE TABLE public.group_members (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);

CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);

-- =============================================================================
-- 6. Group admins (creator + assigned; can post announcements/events)
-- =============================================================================

CREATE TABLE public.group_admins (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);

CREATE INDEX idx_group_admins_group_id ON public.group_admins(group_id);
CREATE INDEX idx_group_admins_user_id ON public.group_admins(user_id);

-- =============================================================================
-- 7. RLS
-- =============================================================================

ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_admins ENABLE ROW LEVEL SECURITY;

-- app_roles: only super_admins can read (to check who is admin); users can read their own role
CREATE POLICY "Users can read own app role"
  ON public.app_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admin can read all app roles"
  ON public.app_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin')
  );

CREATE POLICY "Super admin can insert admin roles"
  ON public.app_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    role = 'admin'
    AND EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin')
  );

CREATE POLICY "Super admin can delete admin roles"
  ON public.app_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin')
  );

-- groups: authenticated read all; super_admin and admin can insert; creator and group_admins can update
CREATE POLICY "Authenticated can read groups"
  ON public.groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admin or admin can insert groups"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by_user_id
    AND (
      EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin')
      OR EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'admin')
    )
  );

CREATE POLICY "Group creator or group admin can update group"
  ON public.groups FOR UPDATE
  TO authenticated
  USING (
    created_by_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.group_admins ga WHERE ga.group_id = id AND ga.user_id = auth.uid())
  )
  WITH CHECK (
    created_by_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.group_admins ga WHERE ga.group_id = id AND ga.user_id = auth.uid())
  );

-- group_members: read own memberships + members of groups user belongs to; insert/delete own
CREATE POLICY "Users can read group members"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join groups"
  ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave groups"
  ON public.group_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- group_admins: creator is auto-added by app; super_admin can add/remove
CREATE POLICY "Users can read group admins"
  ON public.group_admins FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Group creator or super admin can add group admin"
  ON public.group_admins FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_id
        AND (
          g.created_by_user_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin')
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
          OR EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin')
        )
    )
  );

-- =============================================================================
-- 8. Trigger: add creator as group_admin when group is created
-- =============================================================================

CREATE OR REPLACE FUNCTION public.add_creator_as_group_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.group_admins (user_id, group_id, assigned_at)
  VALUES (NEW.created_by_user_id, NEW.id, now())
  ON CONFLICT (user_id, group_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_add_creator_as_group_admin
  AFTER INSERT ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.add_creator_as_group_admin();

-- =============================================================================
-- 9. Seed super_admin: billyhdev@gmail.com (no-op if user does not exist yet)
-- =============================================================================

INSERT INTO public.app_roles (user_id, role, assigned_at)
SELECT id, 'super_admin', now()
FROM auth.users
WHERE LOWER(email) = 'billyhdev@gmail.com'
LIMIT 1
ON CONFLICT (user_id) DO NOTHING;
