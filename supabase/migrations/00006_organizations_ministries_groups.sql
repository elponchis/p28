-- Story 2.1: Data model and migrations for org, ministry, group
-- Hierarchy: Organization → Ministry → Group (one-to-many).
-- Membership: org_members (org membership/roles), ministry_leads (ministry lead assignment).
-- RLS: Placeholder policies (authenticated read) until Story 2.2 implements scoped access.

-- =============================================================================
-- Organizations
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Ministries (belong to one organization)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ministries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ministries_organization_id ON public.ministries(organization_id);

-- =============================================================================
-- Groups (belong to one ministry)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_groups_ministry_id ON public.groups(ministry_id);

-- =============================================================================
-- Org membership and roles (admin, member, etc.)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.org_members (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id)
);

CREATE INDEX idx_org_members_organization_id ON public.org_members(organization_id);
CREATE INDEX idx_org_members_user_id ON public.org_members(user_id);

-- =============================================================================
-- Ministry leads (users assigned as leads for a ministry)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ministry_leads (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ministry_id)
);

CREATE INDEX idx_ministry_leads_ministry_id ON public.ministry_leads(ministry_id);
CREATE INDEX idx_ministry_leads_user_id ON public.ministry_leads(user_id);

-- =============================================================================
-- RLS: Placeholder policies — authenticated users can read structure.
-- Story 2.2 will add data contract and adapter with scoped access.
-- =============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministry_leads ENABLE ROW LEVEL SECURITY;

-- Organizations: authenticated read (placeholder)
CREATE POLICY "Authenticated can read organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (true);

-- Ministries: authenticated read (placeholder)
CREATE POLICY "Authenticated can read ministries"
  ON public.ministries FOR SELECT
  TO authenticated
  USING (true);

-- Groups: authenticated read (placeholder)
CREATE POLICY "Authenticated can read groups"
  ON public.groups FOR SELECT
  TO authenticated
  USING (true);

-- Org members: authenticated read (placeholder)
CREATE POLICY "Authenticated can read org_members"
  ON public.org_members FOR SELECT
  TO authenticated
  USING (true);

-- Ministry leads: authenticated read (placeholder)
CREATE POLICY "Authenticated can read ministry_leads"
  ON public.ministry_leads FOR SELECT
  TO authenticated
  USING (true);
