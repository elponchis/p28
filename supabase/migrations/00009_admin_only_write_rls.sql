-- Story 2.3 Task 6.3: Restrict writes to org/ministry/group to admins only.
-- Drop permissive policies from 00008 and replace with admin-scoped ones.
-- Org INSERT remains authenticated (creator becomes admin via app logic).
-- org_members: allow users to add themselves (used when creating org).

DROP POLICY IF EXISTS "Authenticated can insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated can insert ministries" ON public.ministries;
DROP POLICY IF EXISTS "Authenticated can update ministries" ON public.ministries;
DROP POLICY IF EXISTS "Authenticated can insert groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated can update groups" ON public.groups;

-- Organizations: INSERT stays open (creator is added as admin by app). UPDATE only admins.
CREATE POLICY "Authenticated can insert organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can update organizations"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.organization_id = id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.organization_id = id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  );

-- Ministries: only org admins can insert/update
CREATE POLICY "Org admin can insert ministries"
  ON public.ministries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.organization_id = organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  );

CREATE POLICY "Org admin can update ministries"
  ON public.ministries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.organization_id = organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.organization_id = organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  );

-- Groups: only admins of the ministry's org can insert/update
CREATE POLICY "Org admin can insert groups"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ministries m
      JOIN public.org_members om ON om.organization_id = m.organization_id
      WHERE m.id = ministry_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  );

CREATE POLICY "Org admin can update groups"
  ON public.groups FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ministries m
      JOIN public.org_members om ON om.organization_id = m.organization_id
      WHERE m.id = ministry_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ministries m
      JOIN public.org_members om ON om.organization_id = m.organization_id
      WHERE m.id = ministry_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  );

-- org_members: allow user to add themselves (used when creating org)
CREATE POLICY "User can add self to org"
  ON public.org_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
