# Story 2.2: Data contract and adapter for org structure

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want the app to load and save organization structure through one API,
So that I can manage orgs, ministries, and groups without touching the database directly.

## Acceptance Criteria

1. **Given** Story 2.1 is complete,
   **When** I add to the data contract and Supabase adapter: operations for organizations (e.g. getOrganizations, createOrganization, updateOrganization), ministries (getMinistriesForOrg, createMinistry, etc.), groups (getGroupsForMinistry, createGroup, etc.),
   **Then** the app uses only the facade to read/write org structure; DTOs are camelCase; adapter maps to/from backend,
   **And** FR1, FR2, FR3, and FR31 are addressable by the contract.

## Tasks / Subtasks

- [x] Task 1: DTOs and contract (AC: 1)
  - [x] 1.1: Add Organization, Ministry, Group (and create/update input types) to lib/api/contracts/dto.ts (camelCase)
  - [x] 1.2: Add org-structure methods to DataContract in lib/api/contracts/data.ts
- [x] Task 2: Supabase adapter (AC: 1)
  - [x] 2.1: Implement org operations in lib/api/adapters/supabase/data.ts (map snake_case ↔ DTOs)
  - [x] 2.2: Implement ministry operations; implement group operations
  - [x] 2.3: Map all backend errors to ApiError; no raw Supabase errors outside adapter
- [x] Task 3: Facade and exports (AC: 1)
  - [x] 3.1: Export new DTOs from lib/api/index.ts (and contracts) so app uses only facade
  - [x] 3.2: Verify no app/ or components/ code imports from adapters or @supabase/*
- [x] Task 4: Tests and RLS (AC: 1)
  - [x] 4.1: Add unit tests for adapter org/ministry/group methods (and contract guards if added)
  - [x] 4.2: Extend RLS policies if needed for create/update/delete (per architecture: scoped by role/context)

## Dev Notes

### Architecture Requirements (MUST Follow)

**Contract and adapter (from architecture.md):**
- **Contracts** in `lib/api/contracts/`: DataContract extends with org/ministry/group operations; DTOs in dto.ts use **camelCase** (e.g. `organizationId`, `createdAt`). No backend types outside adapter.
- **Adapter** in `lib/api/adapters/supabase/data.ts`: Implements new methods; maps PostgREST **snake_case** (e.g. `organization_id`, `created_at`) to/from DTOs at boundary only.
- **Facade** `lib/api/index.ts`: App and components import only from here (`api.data.getOrganizations()`, etc.). No `@supabase/supabase-js` in app/, components/, or UI hooks.

**Error handling:**
- All backend failures → **ApiError** (e.g. `{ message: string, code?: string }`). Use existing `toApiError()` in adapter; UI uses `getUserFacingError(error)` from facade.

**Naming:**
- DB/PostgREST: snake_case (already in migrations). Contract/DTOs: camelCase. Realtime channel IDs: kebab-case with scope (not needed for this story).

### Database Schema (Story 2.1 — DO NOT CHANGE)

Tables and columns to map in adapter (from `00006_organizations_ministries_groups.sql`, `00007_org_ministry_group_constraints.sql`):

- **organizations**: id (uuid), name, created_at, updated_at
- **ministries**: id, organization_id (FK), name, created_at, updated_at. UNIQUE(organization_id, name).
- **groups**: id, ministry_id (FK), name, created_at, updated_at. UNIQUE(ministry_id, name).
- **org_members**: user_id, organization_id, role ('admin'|'member'), joined_at. Composite PK (user_id, organization_id).
- **ministry_leads**: user_id, ministry_id, assigned_at. Composite PK (user_id, ministry_id).

RLS: Placeholder policies allow authenticated read. This story may add INSERT/UPDATE/DELETE policies scoped by role (e.g. admin for org/ministry/group CRUD) per architecture; document in completion notes.

### Contract Methods to Add (minimum)

- **Organizations:** getOrganizations(), createOrganization(params), updateOrganization(id, params). Optionally getOrganization(id) if needed.
- **Ministries:** getMinistriesForOrg(organizationId), createMinistry(organizationId, params), updateMinistry(id, params). Optionally getMinistry(id).
- **Groups:** getGroupsForMinistry(ministryId), createGroup(ministryId, params), updateGroup(id, params). Optionally getGroup(id).

Params for create/update: at least `name`; align with DB columns (no created_at/updated_at in create input; backend sets them). Return full DTO on create/update.

### Project Structure Notes

- **Extend existing files:** `lib/api/contracts/dto.ts` (new DTOs), `lib/api/contracts/data.ts` (new methods), `lib/api/adapters/supabase/data.ts` (implementations), `lib/api/index.ts` (re-export new types).
- **No new top-level folders.** Tests: co-located `__tests__` or next to adapter (e.g. `adapters/supabase/__tests__/data.test.ts` already exists — add org/ministry/group tests there or in a focused describe block).
- **References:** [Source: _bmad-output/planning-artifacts/architecture.md#Backend Abstraction], [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns], [Source: _bmad-output/planning-artifacts/epics.md#Epic 2 — Story 2.2].

### Testing Standards

- Use existing patterns: `isApiError()` for result checks; mock Supabase client in adapter tests. Test success and error paths (e.g. duplicate name → ApiError with clear message).
- No backend SDK in app: lint/import checks; manual spot-check that screens/hooks use `api.data.*` only.
- If Supabase MCP available: optional integration check (e.g. createOrganization then getOrganizations) against real DB; not required for AC.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — DTOs camelCase, DB snake_case
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — contract + adapter, migrations
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2, Story 2.2] — FR1, FR2, FR3, FR31
- [Source: _bmad-output/implementation-artifacts/2-1-data-model-and-migrations-for-org-ministry-group.md] — schema and migration file names

---

## Developer Context (for Dev Agent)

### Story 2.2 in the Epic

- **Epic 2:** Organization structure and leadership. Stories: 2.1 (data model — done), **2.2 (data contract and adapter)**, 2.3 (admin UI), 2.4 (invite/assign leads), 2.5 (admin oversight).
- **This story** is backend-boundary only: contract + Supabase adapter for org/ministry/group CRUD. No UI; admin screens come in 2.3.

### Previous Story Intelligence (2.1)

- **Migrations:** `00006_organizations_ministries_groups.sql` created tables; `00007_org_ministry_group_constraints.sql` added role CHECK, unique ministry name per org, unique group name per ministry. Schema is fixed; do not add migrations in this story.
- **Patterns:** Data contract lives in `lib/api/contracts/data.ts`; adapter in `lib/api/adapters/supabase/data.ts` with `toApiError()`, snake_case ↔ DTO mapping (see getProfile/updateProfile). DTOs in `lib/api/contracts/dto.ts`; facade in `lib/api/index.ts` exports `data` and types.
- **Files created in 2.1:** Only under `supabase/migrations/` and `supabase/README.md`. No app or lib/api contract changes.
- **Takeaways:** Follow same adapter pattern (map row to camelCase DTO); use existing RLS placeholder (authenticated read); consider adding RLS for write (admin-only) in this story or leave for 2.3 if product defers.

### Git Intelligence Summary

- Recent commits: "Complete Data Model for Orgs, Ministries, Groups", "Add in-app conduct guidelines...", "Add expo-image...", "Style fixes...", "Initial Commit: sign-in, sign-up, profile".
- **Relevant:** Org/ministry/group schema and migrations are in place. Codebase uses Expo, Supabase adapter, design tokens, and `lib/api` facade consistently. No new libraries required for 2.2; stay within existing contract/adapter patterns.

### Latest Tech Information

- **Supabase:** Use existing Supabase client in adapter; PostgREST returns snake_case. Use `.from('organizations')`, `.from('ministries')`, `.from('groups')` with correct column names. Unique constraint violations will surface as Postgres errors — map to ApiError with a clear message (e.g. "Ministry name already exists in this organization").
- **No new frameworks.** TypeScript strict types; avoid `any`. Use existing `ApiError` and `isApiError()` from contracts.

### Project Context Reference

- No `project-context.md` found in repo. All context is from epics.md, architecture.md, and previous story 2.1.

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Task 1: Added Organization, Ministry, Group and create/update input DTOs in dto.ts (camelCase). Extended DataContract in data.ts with getOrganizations, createOrganization, updateOrganization; getMinistriesForOrg, createMinistry, updateMinistry; getGroupsForMinistry, createGroup, updateGroup.
- Task 2: Implemented all org/ministry/group methods in Supabase data adapter with snake_case ↔ DTO mapping; toApiError enhanced to map unique constraint 23505 to friendly messages for ministry/group duplicate names.
- Task 3: Exported new DTOs from lib/api/contracts/index.ts and lib/api/index.ts; verified no app/ or components/ import from adapters or @supabase/*.
- Task 4: Added unit tests in data.test.ts for getOrganizations, createOrganization, updateOrganization; getMinistriesForOrg, createMinistry, updateMinistry (including duplicate-name ApiError); getGroupsForMinistry, createGroup, updateGroup (including duplicate-name ApiError); updateMinistry, updateGroup. Generalized isApiError in guards.ts to accept unknown so it works for all result types. Created migration 00008_org_ministry_group_write_rls.sql for INSERT/UPDATE policies (authenticated) on organizations, ministries, groups.
- Code review (AI) fixes: (1) Input validation for create org/ministry/group—reject empty/whitespace names with VALIDATION_ERROR; (2) Updated supabase/README.md with RLS 00008 documentation; (3) Updated adapter comment; (4) isApiError JSDoc note; (5) Migration 00008 comment; (6) Added tests for empty-name validation.

### File List

- lib/api/contracts/dto.ts (modified)
- lib/api/contracts/data.ts (modified)
- lib/api/contracts/guards.ts (modified)
- lib/api/contracts/index.ts (modified)
- lib/api/adapters/supabase/data.ts (modified)
- lib/api/index.ts (modified)
- lib/api/adapters/supabase/__tests__/data.test.ts (modified)
- supabase/migrations/00008_org_ministry_group_write_rls.sql (new)
- supabase/README.md (modified)

## Change Log

- 2026-03-04: Story 2.2 implemented. Data contract and Supabase adapter for org/ministry/group CRUD; DTOs camelCase; facade exports; unit tests and RLS write policies added.
- 2026-03-04: Code review fixes—input validation for empty names, README RLS docs, adapter/guard comments, validation tests.
