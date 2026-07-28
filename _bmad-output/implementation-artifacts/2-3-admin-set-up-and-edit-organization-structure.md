# Story 2.3: Admin: set up and edit organization structure

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to create and edit the organization structure (org, ministries, groups),
So that my church has a clear hierarchy for ministries and groups.

## Acceptance Criteria

1. **Given** Stories 2.2 and Epic 1 (auth) are complete and the user has admin role,
   **When** I add admin screens to create/edit organizations (name, basic settings), add ministries to an org, and add groups to a ministry,
   **Then** an admin can set up and edit the full org → ministry → group structure; changes are persisted via the data contract,
   **And** FR31 is satisfied; UX follows architecture (e.g. OrgStructureRow pattern where specified).

## Tasks / Subtasks

- [x] Task 1: Admin role and navigation (AC: 1)
  - [x] 1.1: Extend data contract with method to fetch user's org membership/role (e.g. getOrganizationsWhereUserIsAdmin or getUserOrgMemberships)
  - [x] 1.2: Implement in Supabase adapter (query org_members)
  - [x] 1.3: Add admin entry point (e.g. Profile or tab) visible only when user is admin of ≥1 org
  - [x] 1.4: Create app/admin/ layout and route structure per architecture
- [x] Task 2: Admin org list and create (AC: 1)
  - [x] 2.1: Admin index screen: list orgs user can admin; "Create organization" action
  - [x] 2.2: Create-org flow (name); persist via api.data.createOrganization
  - [x] 2.3: Empty state and error handling via getUserFacingError
- [x] Task 3: Org detail and edit (AC: 1)
  - [x] 3.1: app/admin/[orgId]/ screen: org name, ministries list, edit org name
  - [x] 3.2: Edit org via api.data.updateOrganization; success feedback
- [x] Task 4: Ministry create/edit (AC: 1)
  - [x] 4.1: Add ministry to org: create form, api.data.createMinistry; handle duplicate-name ApiError
  - [x] 4.2: Edit ministry name via api.data.updateMinistry
  - [x] 4.3: List ministries via api.data.getMinistriesForOrg
- [x] Task 5: Group create/edit (AC: 1)
  - [x] 5.1: app/admin/[orgId]/ministry/[ministryId]/group/[groupId].tsx; groups per ministry
  - [x] 5.2: Add group to ministry: api.data.createGroup; edit via api.data.updateGroup
  - [x] 5.3: List groups via api.data.getGroupsForMinistry
- [x] Task 6: OrgStructureRow pattern and tests (AC: 1)
  - [x] 6.1: Create OrgStructureRow pattern component (name, type, edit) per UX spec
  - [x] 6.2: Wire into admin screens; contract tests for OrgStructureRow
  - [x] 6.3: Restrict RLS to admin role (migration 00009); document in supabase/README.md

## Dev Notes

### Architecture Requirements (MUST Follow)

**Routes (from architecture.md):**
- `app/admin/_layout.tsx` — admin stack layout
- `app/admin/index.tsx` — org structure overview (orgs user can admin)
- `app/admin/[orgId]/` — org detail (or ministries.tsx)
- `app/admin/[orgId]/group/[groupId].tsx` — group detail (or inline in ministries)

**Backend access:** Use `api.data.*` only. No Supabase imports in app/admin/ or components.

**Admin role:** User is admin if they have a row in org_members with role='admin' for an org. Need a contract method to fetch this (org_members not yet exposed).

### UX (from epics, architecture, UX spec)

- **OrgStructureRow:** Admin structure view; shows name, type (org/ministry/group), edit/delete. States: Default, editing. [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
- **Design tokens:** theme/tokens (colors, spacing, radius); 44pt min touch targets; accessibilityLabel/accessibilityHint.
- **Feedback:** Success (toast/confirmation), error (inline + retry), loading (skeleton/spinner).
- **Empty state:** Short copy + one suggested action.

### Data Contract Extension (Task 1)

Add to DataContract and implement in adapter:
- `getOrganizationsWhereUserIsAdmin(userId: string): Promise<Organization[] | ApiError>` — returns orgs where user has role='admin' in org_members. Or `getUserOrgMemberships(userId: string): Promise<{organizationId: string, role: 'admin'|'member'}[] | ApiError>`.
- Use to gate admin entry and filter admin index to orgs user can manage.

### RLS (Story 2.2 vs 2.3)

- 00008 allows any authenticated user to INSERT/UPDATE. Task 6.3: Add migration to restrict writes to users with org_members.role='admin' for the relevant org/ministry/group. Document in supabase/README.md.

### Project Structure Notes

- **New:** app/admin/ (layout, index, [orgId]/, [orgId]/group/[groupId].tsx or ministries)
- **New:** components/patterns/OrgStructureRow.tsx
- **Extend:** lib/api/contracts/data.ts, lib/api/adapters/supabase/data.ts, lib/api/index.ts (new method)
- **Extend:** app/(tabs)/profile.tsx or Profile screen for admin entry

### Testing Standards

- Use isApiError(), getUserFacingError(). Mock api.data in screen tests.
- Test admin screens: list, create, edit flows; error paths; empty states.
- Co-located __tests__ per coding standards.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure] — app/admin/ layout
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2, Story 2.3] — FR31
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — OrgStructureRow, feedback patterns
- [Source: _bmad-output/implementation-artifacts/2-2-data-contract-and-adapter-for-org-structure.md] — api.data methods available

---

## Developer Context (for Dev Agent)

### Story 2.3 in the Epic

- **Epic 2:** Organization structure and leadership. Stories: 2.1 (data model), 2.2 (contract/adapter — done), **2.3 (admin UI)**, 2.4 (invite/assign leads), 2.5 (admin oversight).
- **This story** builds the admin UI that uses the 2.2 data contract to create/edit org, ministry, group. Requires admin-role check and org_members query.

### Previous Story Intelligence (2.2)

- **api.data methods:** getOrganizations, createOrganization, updateOrganization; getMinistriesForOrg, createMinistry, updateMinistry; getGroupsForMinistry, createGroup, updateGroup. All accept/return camelCase DTOs.
- **Input validation:** Empty/whitespace names rejected with VALIDATION_ERROR. Duplicate ministry/group names return friendly ApiError.
- **No app/admin/ yet** — create from scratch per architecture.
- **org_members table:** user_id, organization_id, role ('admin'|'member'). Need adapter method to query it for admin check.

### Git Intelligence Summary

- Recent: Story 2.2 (data contract, RLS 00008), code review fixes (validation, README).
- Patterns: theme tokens, primitives (Button, Input, Card), api.data.* only, isApiError/getUserFacingError.

### Latest Tech Information

- Expo Router: file-based routing; [orgId] dynamic segment.
- No new frameworks. Follow existing profile/edit, auth flows for form + API patterns.

### Project Context Reference

- No project-context.md. Use epics, architecture, UX spec, previous stories.

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Data contract: getOrganizationsWhereUserIsAdmin, getGroup; createOrganization accepts createdByUserId to add creator as admin.
- Adapter: PGRST116 mapped to NOT_FOUND in toApiError.
- Admin screens: app/admin/index.tsx, [orgId]/index.tsx, [orgId]/ministry/[ministryId]/index.tsx, [orgId]/ministry/[ministryId]/group/[groupId].tsx.
- OrgStructureRow: components/patterns/OrgStructureRow.tsx with name, type badge, onPress.
- RLS migration 00009 applied via Supabase MCP.

### File List
