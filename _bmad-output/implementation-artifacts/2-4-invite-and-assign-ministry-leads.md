# Story 2.4: Invite and Assign Ministry Leads

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to invite users and assign them as ministry leads for specific ministries,
So that those users can lead and manage their ministries.

## Acceptance Criteria

1. **Given** Story 2.3 is complete and the user has admin role,
   **When** I add a flow to assign an existing user (looked up by email) as a ministry lead for a specific ministry,
   **Then** the admin can enter an email, look up the user, and assign them as ministry lead; the assignment is persisted in `ministry_leads` via the data contract,
   **And** FR5 and FR32 are satisfied.

2. **Given** the admin is on the ministry detail screen,
   **When** the admin views the "Ministry Leads" section,
   **Then** current ministry leads are listed with display name and avatar; the admin can remove a lead assignment.

3. **Given** the admin enters an email that belongs to no registered user,
   **When** they attempt to assign that email as a ministry lead,
   **Then** an inline error is shown: "No user found with that email. They must sign up first.",
   **And** no assignment is made.

4. **Given** the admin enters an email of a user who is already a ministry lead for that ministry,
   **When** they attempt to assign again,
   **Then** an inline error is shown: "User is already a ministry lead for this ministry.",
   **And** no duplicate assignment is made.

## Tasks / Subtasks

- [x] Task 1: Migration – RLS + email lookup RPC (AC: 1, 2)
  - [x] 1.1: Create `supabase/migrations/00010_ministry_leads_rls_and_lookup.sql`:
    - Admin-only INSERT/DELETE on `ministry_leads` (check org_members for admin role of the ministry's org)
    - RPC `get_user_id_by_email(lookup_email text) RETURNS uuid` — SECURITY DEFINER, reads `auth.users`, returns `id` or `NULL` if not found
  - [x] 1.2: Apply migration via Supabase MCP `apply_migration`

- [x] Task 2: DTOs – `MinistryLead` type (AC: 1, 2)
  - [x] 2.1: Add to `lib/api/contracts/dto.ts`:
    ```ts
    export interface MinistryLead {
      userId: string;
      ministryId: string;
      assignedAt?: string;
      displayName?: string;
      avatarUrl?: string;
    }
    ```

- [x] Task 3: Data contract – ministry lead operations (AC: 1, 2)
  - [x] 3.1: Add to `DataContract` in `lib/api/contracts/data.ts`:
    ```ts
    /** Fetch ministry leads for a ministry, including profile info. */
    getMinistryLeads(ministryId: string): Promise<MinistryLead[] | ApiError>;
    /** Assign a user as a ministry lead. Returns ALREADY_EXISTS error if already assigned. */
    assignMinistryLead(ministryId: string, userId: string): Promise<MinistryLead | ApiError>;
    /** Remove a ministry lead assignment. */
    removeMinistryLead(ministryId: string, userId: string): Promise<void | ApiError>;
    /** Look up a user's UUID by email via RPC. Returns null if no user found. */
    getUserIdByEmail(email: string): Promise<string | null | ApiError>;
    ```

- [x] Task 4: Supabase adapter – implement ministry lead methods (AC: 1, 2)
  - [x] 4.1: Implement `getMinistryLeads` in `lib/api/adapters/supabase/data.ts`:
    - Query `ministry_leads` joined with `profiles` (left join on user_id) for `ministryId`
    - Map to `MinistryLead[]` (camelCase)
  - [x] 4.2: Implement `assignMinistryLead`:
    - Insert into `ministry_leads`; on `23505` (duplicate) return `{ message: 'User is already a ministry lead for this ministry', code: 'ALREADY_EXISTS' }`
  - [x] 4.3: Implement `removeMinistryLead`:
    - Delete from `ministry_leads` by `ministryId` + `userId`
  - [x] 4.4: Implement `getUserIdByEmail`:
    - Call Supabase RPC `get_user_id_by_email(lookup_email: email)`, return `string | null | ApiError`
  - [x] 4.5: Export `MinistryLead` from `lib/api/index.ts`

- [x] Task 5: Ministry detail screen – Ministry Leads section (AC: 1, 2, 3, 4)
  - [x] 5.1: In `app/admin/[orgId]/ministry/[ministryId]/index.tsx`, add state: `leads`, `leadEmail`, `assigningLead`, `leadError`
  - [x] 5.2: Load ministry leads on `useFocusEffect` via `api.data.getMinistryLeads(ministryId)`
  - [x] 5.3: Render "Ministry Leads" section after groups:
    - Email `Input` + "Add lead" `Button` (inline row, like add-ministry pattern from 2.3)
    - On submit: call `getUserIdByEmail` → if null show inline error "No user found with that email. They must sign up first." → else call `assignMinistryLead` → on ALREADY_EXISTS show inline error → on success refresh leads list
    - List of current leads: `Avatar` (or placeholder) + display name (or userId truncated) + "Remove" `Button`
  - [x] 5.4: Remove lead handler: call `api.data.removeMinistryLead`, update local state on success

- [x] Task 6: i18n keys (AC: 1, 2, 3, 4)
  - [x] 6.1: Add to `lib/i18n/locales/en.ts` (`admin` section):
    ```
    ministryLeads: 'Ministry leads',
    addMinistryLead: 'Add lead',
    addMinistryLeadHint: 'Enter email address to assign a ministry lead',
    noMinistryLeads: 'No ministry leads assigned',
    leadEmailPlaceholder: 'Enter email address',
    userNotFound: 'No user found with that email. They must sign up first.',
    leadAlreadyAssigned: 'User is already a ministry lead for this ministry.',
    removeLeadLabel: 'Remove lead',
    removeLead: 'Remove',
    ```
  - [x] 6.2: Mirror keys in `lib/i18n/locales/ko.ts` and `lib/i18n/locales/km.ts`

- [x] Task 7: Tests (AC: 1, 2, 3, 4)
  - [x] 7.1: Unit tests for new adapter methods (mock Supabase client):
    - `getMinistryLeads`: returns mapped list
    - `assignMinistryLead`: success + ALREADY_EXISTS error on 23505
    - `removeMinistryLead`: success path
    - `getUserIdByEmail`: returns userId string, null if not found, ApiError on RPC error
  - [x] 7.2: Screen test for ministry detail screen: leads section renders, add lead flow (success + user-not-found error + already-assigned error), remove lead

## Dev Notes

### Architecture Requirements (MUST Follow)

**Backend access:** Use `api.data.*` only. No `@supabase/supabase-js` imports in `app/` or `components/`. All new methods go through the facade (`lib/api/index.ts`).

**Contract location:** `lib/api/contracts/data.ts` and `lib/api/contracts/dto.ts`

**Adapter location:** `lib/api/adapters/supabase/data.ts`

**Facade exports:** `lib/api/index.ts` — export `MinistryLead` DTO type alongside `Ministry`, `Group`, `Organization`.

**Error handling:** Use `isApiError()` + `getUserFacingError()`. Add ALREADY_EXISTS code handling to `getUserFacingError` in `lib/errors.ts` if not already handled (map it to the lead-specific message in the screen, not globally).

**No admin SDK:** `get_user_id_by_email` RPC uses SECURITY DEFINER in Postgres — the standard anon/authenticated Supabase JS client can call it via `.rpc('get_user_id_by_email', { lookup_email: email })`.

### Database Schema (Existing — Already Applied)

```sql
-- ministry_leads (from 00006_organizations_ministries_groups.sql)
CREATE TABLE public.ministry_leads (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ministry_id)
);
-- RLS: authenticated read only (placeholder). Story 2.4 (Task 1) adds admin INSERT/DELETE.
```

### New Migration (00010) — Full SQL Reference

```sql
-- Story 2.4: ministry_leads RLS (admin-only writes) + email lookup RPC

-- Admin-only INSERT on ministry_leads (org admin of the ministry's org)
CREATE POLICY "Org admin can assign ministry leads"
  ON public.ministry_leads FOR INSERT
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

-- Admin-only DELETE on ministry_leads
CREATE POLICY "Org admin can remove ministry leads"
  ON public.ministry_leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ministries m
      JOIN public.org_members om ON om.organization_id = m.organization_id
      WHERE m.id = ministry_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  );

-- RPC: look up user_id by email (SECURITY DEFINER to access auth.users)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(lookup_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE LOWER(email) = LOWER(lookup_email) LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO authenticated;
```

### getMinistryLeads Implementation Approach

`ministry_leads` must be joined with `profiles` to get display name and avatar. Use a PostgREST nested select:

```ts
const { data, error } = await getClient()
  .from('ministry_leads')
  .select('user_id, ministry_id, assigned_at, profiles(display_name, avatar_url)')
  .eq('ministry_id', ministryId)
  .order('assigned_at');
```

Map each row: `displayName = row.profiles?.display_name ?? undefined`, `avatarUrl = row.profiles?.avatar_url ?? undefined`.

### UI Pattern — Ministry Detail Screen

Follow existing admin screen patterns exactly (from 2.3):
- `useFocusEffect` + `useCallback` for loading leads alongside existing ministry + groups load
- Inline error for lead-specific errors (use a separate `leadError` state, not the main `error` state)
- Add lead row: email `Input` (flex: 1) + "Add lead" `Button` — same flex pattern as `addMinistryRow` in `[orgId]/index.tsx`
- Lead list item: `View` row with `Avatar` (if exists) + `Text` (displayName or "Unknown user") + "Remove" `Button`
- "Remove" button: `variant="secondary"` with `accessibilityLabel={t('admin.removeLeadLabel')}`
- Empty state: `<Text style={styles.emptyText}>{t('admin.noMinistryLeads')}</Text>`

### Avatar Component

The `Avatar` primitive is in `components/primitives/Avatar.tsx`. Use it for lead list items. Check its props signature before use — likely accepts `uri?: string`, `name?: string`, `size?: number`.

### Error Code Handling

In `lib/api/adapters/supabase/data.ts`, the existing `toApiError` maps `23505` (unique violation) to a generic duplicate message. For ministry leads specifically, detect `23505` with context:
```ts
if (code === '23505') {
  if (message.includes('ministry_leads_pkey')) {
    return { message: 'User is already a ministry lead for this ministry', code: 'ALREADY_EXISTS' };
  }
  // ... existing checks ...
}
```

In the screen, check `result.code === 'ALREADY_EXISTS'` to show the right inline error.

### Project Structure Notes

**Files to modify:**
- `supabase/migrations/00010_ministry_leads_rls_and_lookup.sql` — **NEW**
- `lib/api/contracts/dto.ts` — add `MinistryLead` interface
- `lib/api/contracts/data.ts` — add 4 new contract methods
- `lib/api/adapters/supabase/data.ts` — implement 4 new methods, update `toApiError` for ALREADY_EXISTS
- `lib/api/index.ts` — export `MinistryLead` type
- `app/admin/[orgId]/ministry/[ministryId]/index.tsx` — add ministry leads section
- `lib/i18n/locales/en.ts` — add 9 new admin keys
- `lib/i18n/locales/ko.ts` — mirror new keys
- `lib/i18n/locales/km.ts` — mirror new keys

**No new routes needed** — ministry lead management lives within the existing ministry detail screen (`[ministryId]/index.tsx`).

**No new pattern components needed** — use existing `OrgStructureRow`, `Button`, `Input`, `Avatar` primitives.

### Testing Standards

- Use `isApiError()`, `getUserFacingError()`. Mock `api.data` in screen tests.
- Test adapter methods: mock Supabase client, test success + error paths for each new method.
- Test screen: mock `api.data.getMinistryLeads`, `api.data.getUserIdByEmail`, `api.data.assignMinistryLead`, `api.data.removeMinistryLead`. Cover:
  - Leads list renders with data
  - Add lead: success → leads refreshed
  - Add lead: `getUserIdByEmail` returns null → "No user found" error shown
  - Add lead: `assignMinistryLead` returns ALREADY_EXISTS → inline error shown
  - Remove lead: success → lead removed from list
- Co-locate tests in `__tests__/` next to source files (established pattern from 2.3).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2, Story 2.4] — FR5, FR32
- [Source: _bmad-output/planning-artifacts/architecture.md#Backend Abstraction] — contract/adapter pattern, facade-only rule
- [Source: supabase/migrations/00006_organizations_ministries_groups.sql] — existing ministry_leads schema
- [Source: supabase/migrations/00009_admin_only_write_rls.sql] — RLS pattern for admin-only writes (replicate for ministry_leads)
- [Source: supabase/migrations/00003_check_email_exists.sql] — SECURITY DEFINER RPC pattern for auth.users access
- [Source: _bmad-output/implementation-artifacts/2-3-admin-set-up-and-edit-organization-structure.md] — UI patterns, screen structure, error handling, i18n usage

---

## Developer Context (for Dev Agent)

### Story 2.4 in the Epic

- **Epic 2:** Organization structure and leadership. Stories: 2.1 (data model — done), 2.2 (contract/adapter — done), 2.3 (admin structure UI — done), **2.4 (invite/assign leads)**, 2.5 (admin oversight view — backlog).
- **This story** adds ministry lead assignment to the admin UI. The `ministry_leads` table already exists (from 2.1). The contract and adapter need new methods. The ministry detail screen needs a new section.

### Previous Story Intelligence (2.3)

- **Admin UI patterns**: `useFocusEffect` + `useCallback` for loading; inline `error` banner; separate `loading`/`saving` states; `ScrollView` with `styles.scrollContent` padding.
- **api.data methods available**: `getOrganizationsWhereUserIsAdmin`, `getMinistriesForOrg`, `updateMinistry`, `getGroupsForMinistry`, `createGroup`, `updateGroup`, `getGroup`.
- **Primitives in use**: `Button` (primary/secondary variant), `Input` (with label + containerStyle), `ActivityIndicator` for loading.
- **OrgStructureRow**: `name`, `type` ('org'|'ministry'|'group'), `onPress` — for structure items. NOT needed for lead items (use a custom row with Avatar + name + remove button instead).
- **RLS migration pattern (00009)**: JOIN `org_members` in the WITH CHECK / USING clause to enforce admin-only writes — replicate this exact pattern for `ministry_leads`.
- **Completion notes from 2.3**: `getOrganizationsWhereUserIsAdmin`, `getGroup` are in the contract; `createOrganization` adds creator as admin via `createdByUserId`; `PGRST116` maps to `NOT_FOUND`; admin screens are at `app/admin/index.tsx`, `[orgId]/index.tsx`, `[orgId]/ministry/[ministryId]/index.tsx`, `[orgId]/ministry/[ministryId]/group/[groupId].tsx`.

### Git Intelligence

- Most recent commit: "Add design system and admin interface for organization management" (Story 2.3).
- Pattern: theme tokens from `@/theme/tokens`; `@/lib/api` facade; `@/lib/i18n` for `t()`; `@/components/primitives` for UI; no direct Supabase SDK in screens.

### Scope Boundaries (MVP)

- **In scope**: Assign existing users by email lookup; list and remove ministry leads on the ministry detail screen.
- **Out of scope for this story**: Email invite to users who haven't signed up yet (deferred — `getUserIdByEmail` returns null and shows error); push notification to the assigned lead; complex invite-link flow.
- The `org_members` table role column already supports `'ministry-lead'` conceptually but this story uses the dedicated `ministry_leads` table (already designed in 2.1 for this purpose). Do NOT add a `ministry-lead` row to `org_members` — use `ministry_leads` only.

---

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (2026-03-04)

### Debug Log References

No blocking issues encountered. Fixed `Input` missing required `label` prop and removed non-existent `loading` prop from `Button` after linter check.

### Completion Notes List

- ✅ Migration `00010_ministry_leads_rls_and_lookup.sql` created and applied via Supabase MCP. Adds admin-only INSERT/DELETE RLS policies on `ministry_leads` and `get_user_id_by_email` SECURITY DEFINER RPC.
- ✅ `MinistryLead` DTO added to `lib/api/contracts/dto.ts` and exported through `lib/api/contracts/index.ts` and `lib/api/index.ts`.
- ✅ Four new methods added to `DataContract` and implemented in Supabase adapter: `getMinistryLeads`, `assignMinistryLead`, `removeMinistryLead`, `getUserIdByEmail`.
- ✅ `toApiError` updated to return `ALREADY_EXISTS` code for `ministry_leads_pkey` duplicate key violations.
- ✅ Ministry detail screen updated with leads section: email input, add lead handler (with user-not-found + already-assigned error paths), leads list with Avatar + displayName + Remove button.
- ✅ i18n keys added to en.ts, ko.ts, and km.ts (9 new keys in `admin` section).
- ✅ 120 tests pass (11 test suites). No lint errors, formatting clean.

### File List

- `supabase/migrations/00010_ministry_leads_rls_and_lookup.sql` (new)
- `lib/api/contracts/dto.ts` (modified — added `MinistryLead` interface)
- `lib/api/contracts/data.ts` (modified — added 4 new contract methods)
- `lib/api/contracts/index.ts` (modified — export `MinistryLead`)
- `lib/api/adapters/supabase/data.ts` (modified — `mapMinistryLeadRow`, 4 new methods, ALREADY_EXISTS handling in `toApiError`)
- `lib/api/index.ts` (modified — export `MinistryLead`)
- `app/admin/[orgId]/ministry/[ministryId]/index.tsx` (modified — ministry leads section)
- `lib/i18n/locales/en.ts` (modified — 9 new admin keys)
- `lib/i18n/locales/ko.ts` (modified — 9 new admin keys)
- `lib/i18n/locales/km.ts` (modified — 9 new admin keys)
- `lib/api/adapters/supabase/__tests__/data.test.ts` (modified — ministry lead adapter tests)
- `app/admin/[orgId]/ministry/[ministryId]/__tests__/ministry-detail.test.ts` (new — screen source inspection tests)

### Change Log

- 2026-03-04: Story 2.4 implemented — ministry lead invite/assign/remove flow with RLS migration, contract/adapter methods, UI section on ministry detail screen, i18n keys, and tests.
