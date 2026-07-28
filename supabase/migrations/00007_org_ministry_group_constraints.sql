-- Story 2.1 code review: data integrity constraints
-- Adds role enum constraint on org_members and unique names per parent for ministries/groups.

-- Restrict org_members.role to known values (extend list as product adds roles)
ALTER TABLE public.org_members
  ADD CONSTRAINT org_members_role_check CHECK (role IN ('admin', 'member'));

-- Ministry names unique per organization
ALTER TABLE public.ministries
  ADD CONSTRAINT ministries_organization_id_name_key UNIQUE (organization_id, name);

-- Group names unique per ministry
ALTER TABLE public.groups
  ADD CONSTRAINT groups_ministry_id_name_key UNIQUE (ministry_id, name);
