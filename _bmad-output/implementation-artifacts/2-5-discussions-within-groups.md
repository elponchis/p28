# Story 2.5: Discussions Within Groups

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a member,
I want to participate in discussions within a group I have joined,
so that I can connect with others and share ideas in community.

## Acceptance Criteria

1. **Given** I am a member of a group (forum or ministry),
   **When** I open the group detail screen (`app/group/[id].tsx`),
   **Then** I see a list of discussion posts from that group,
   **And** I can compose and post a new discussion message,
   **And** new posts appear in near-real-time (NFR-P3: within seconds) via Realtime subscription.

2. **Given** I am not a member of the group,
   **When** I open the group detail screen,
   **Then** I do not see the discussion list or compose UI,
   **And** I see the Join button (existing behavior).

3. **Given** I am viewing the discussion list,
   **When** another member posts a new message,
   **Then** the new message appears in the list without manual refresh,
   **And** Realtime channel `messages:group:{groupId}` is used per architecture.

4. **Given** I post a discussion message,
   **When** the post succeeds,
   **Then** my message appears in the list immediately,
   **And** I see success feedback (e.g. toast or inline confirmation).

5. **Given** the group has no discussion posts yet,
   **When** I am a member viewing the group,
   **Then** I see an empty state with short copy and one suggested action (e.g. "Start the conversation").

## Tasks / Subtasks

- [x] Task 1: Migration – group_discussions table (AC: 1, 3, 4)
  - [x] 1.1: Create `supabase/migrations/00014_group_discussions.sql`:
    - `group_discussions` table: `id` (uuid PK), `group_id` (FK groups), `user_id` (FK auth.users), `body` (text NOT NULL), `created_at` (timestamptz)
    - RLS: authenticated members of the group can SELECT; members can INSERT
    - Indexes: `idx_group_discussions_group_id_created_at`
  - [x] 1.2: Enable Realtime for `group_discussions` table (Supabase Dashboard or migration)
  - [x] 1.3: Apply migration via Supabase MCP `apply_migration`

- [x] Task 2: DTOs – GroupDiscussion type (AC: 1)
  - [x] 2.1: Add to `lib/api/contracts/dto.ts`: `GroupDiscussion`, `CreateGroupDiscussionInput`
  - [x] 2.2: Export from `lib/api/index.ts`

- [x] Task 3: Data contract – discussion operations (AC: 1, 4)
  - [x] 3.1: Add to `DataContract` in `lib/api/contracts/data.ts`:
    - `getGroupDiscussions(groupId: string): Promise<GroupDiscussion[] | ApiError>`
    - `createGroupDiscussion(groupId: string, userId: string, input: CreateGroupDiscussionInput): Promise<GroupDiscussion | ApiError>`

- [x] Task 4: Supabase adapter – implement discussion methods (AC: 1, 4)
  - [x] 4.1: Implement `getGroupDiscussions`: query `group_discussions` by `group_id`, order by `created_at` desc, join profiles for author displayName/avatarUrl
  - [x] 4.2: Implement `createGroupDiscussion`: insert, return mapped row
  - [x] 4.3: Verify RLS allows members only

- [x] Task 5: Realtime contract – subscribe to group discussions (AC: 3)
  - [x] 5.1: Ensure `api.realtime.subscribe('messages:group:{groupId}', { onMessage })` maps to Supabase Realtime channel for `group_discussions` table
  - [x] 5.2: Document payload shape for `postgres_changes` on INSERT

- [x] Task 6: React Query hooks – useGroupDiscussionsQuery, useCreateGroupDiscussionMutation (AC: 1, 4)
  - [x] 6.1: Add `groupDiscussions(groupId)` to `lib/api/queryKeys.ts`
  - [x] 6.2: Add `useGroupDiscussionsQuery(groupId, options)` and `useCreateGroupDiscussionMutation()` in `hooks/useApiQueries.ts`
  - [x] 6.3: Invalidation: on create success, invalidate `groupDiscussions(groupId)` and optionally refetch

- [x] Task 7: Group detail screen – discussion list and compose UI (AC: 1, 2, 4, 5)
  - [x] 7.1: Replace placeholder "Announcements, events, and discussions will appear here" with Discussion section (only when `isMember`)
  - [x] 7.2: Use `useGroupDiscussionsQuery(id)` for list; FlatList or ScrollView with `GroupDiscussionRow` or equivalent
  - [x] 7.3: Add compose area: Input (multiline) + Button "Post"; use `useCreateGroupDiscussionMutation`; call `refetch()` or rely on Realtime for new posts
  - [x] 7.4: Subscribe to `messages:group:{id}` in `useFocusEffect`; return cleanup to `api.realtime.unsubscribe` on blur/unmount
  - [x] 7.5: On Realtime `INSERT` payload, invalidate `groupDiscussions(id)` to refresh list
  - [x] 7.6: Empty state: short copy + "Post a message" CTA per UX spec

- [x] Task 8: i18n keys (AC: 4, 5)
  - [x] 8.1: Add `groups.discussions`, `groups.postMessage`, `groups.emptyDiscussions`, `groups.emptyDiscussionsHint`, etc. to `lib/i18n/locales/en.ts`
  - [x] 8.2: Mirror in `ko.ts` and `km.ts`

- [x] Task 9: Tests (AC: 1, 2, 4)
  - [x] 9.1: Unit tests for adapter: `getGroupDiscussions`, `createGroupDiscussion` (mock Supabase)
  - [x] 9.2: Screen test: discussion list renders for members; compose flow; empty state; non-members do not see discussion section

## Dev Notes

- Relevant architecture patterns: Realtime channel `messages:group:{groupId}`; DTOs camelCase; RLS for members-only; React Query hooks via `useApiQueries`; no direct `api.data.*` in screens.
- Source tree: `supabase/migrations/`, `lib/api/contracts/`, `lib/api/adapters/supabase/`, `hooks/useApiQueries.ts`, `lib/api/queryKeys.ts`, `app/group/[id].tsx`, `lib/i18n/locales/`.

### Project Structure Notes

- `app/group/[id].tsx` is route-only; use hooks. Add Discussion section inside existing ScrollView.
- New DTOs in `lib/api/contracts/dto.ts`; re-export from `lib/api/index.ts`.
- Query keys: add `groupDiscussions(groupId)` to `queryKeys.ts`.
- Tests: `lib/api/adapters/supabase/__tests__/data.test.ts`; `app/group/__tests__/group-detail.test.tsx` or similar.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#FR19, FR20] — Member participates in group/forum discussions
- [Source: _bmad-output/planning-artifacts/architecture.md#Realtime] — Channel naming `messages:group:{id}`
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-05.md] — Forums = Reddit-style discussions; group detail includes discussions
- [Source: docs/project-context.md] — React Query hooks, `getUserFacingError`, `t()`, theme tokens

---

## Developer Context (for Dev Agent)

### Architecture Requirements (MUST Follow)

- **Backend access:** Use React Query hooks from `hooks/useApiQueries`. Do NOT call `api.data.*` directly in screens. Add new contract methods and implement in adapter; add hooks.
- **Realtime:** Subscribe via `api.realtime.subscribe('messages:group:' + groupId, handlers) in `useFocusEffect`; return cleanup calling `api.realtime.unsubscribe(channelId)`.
- **No Supabase SDK in app:** Only `lib/api/adapters/supabase/` may import `@supabase/supabase-js`.
- **Error handling:** `getUserFacingError(error)` for user-facing messages. `isApiError()` for checks.
- **i18n:** All user-facing strings via `t()` from `@/lib/i18n`. Never hardcode English.
- **Styling:** `StyleSheet.create`; tokens from `@/theme/tokens`. No magic numbers.
- **Accessibility:** `accessibilityLabel` and `accessibilityHint` on interactive elements.

### Technical Requirements

- **Table:** `group_discussions` — `id`, `group_id`, `user_id`, `body` (text), `created_at`. RLS: members can read and insert.
- **Realtime:** Enable `postgres_changes` for `group_discussions` INSERT. Channel name in contract: `messages:group:{groupId}`. Adapter maps to Supabase Realtime channel.
- **DTO shape:** `GroupDiscussion`: `id`, `groupId`, `userId`, `body`, `createdAt`, `authorDisplayName?`, `authorAvatarUrl?` (from joined profiles).
- **NFR-P3:** Near-real-time delivery — Realtime subscription ensures new posts appear within seconds.

### Previous Story Intelligence (2-4-group-creation-admin)

- **Group detail screen** (`app/group/[id].tsx`): Uses `useGroupQuery`, `useGroupsForUserQuery`, `useJoinGroupMutation`, `useLeaveGroupMutation`. `isMember` derived from `memberGroups.some(g => g.id === id)`. `useFocusEffect` for refetch on focus.
- **Group create screen** (`app/group/create.tsx`): Uses `useCreateGroupMutation`, `useUploadGroupBannerImageMutation`. Form state with `useState`; `getUserFacingError` for errors.
- **Query invalidation:** Mutations invalidate `queryKeys.groups()`, `queryKeys.groupsForUser(userId)`, `queryKeys.group(id)` as needed.
- **Design tokens:** `colors`, `spacing`, `typography` from `@/theme/tokens`; `spacing.screenHorizontal`, `spacing.lg`, etc.

### Git Intelligence

- Recent commits: "redesign to light blue, flush out group component"; "Group refactor and course correction to simplify MVP"; "Add design system and admin interface".
- Patterns: `@/lib/api` facade; `@/hooks/useApiQueries` for data; `@/lib/i18n` for `t()`; `@/components/primitives` for UI; `expo-image` for images.

### Scope Boundaries

- **In scope:** Group discussions (flat posts); compose and list; Realtime for new posts; members-only visibility.
- **Out of scope:** Replies/threading; edit/delete; announcements and events (separate stories); 1:1 messaging.

### Supabase Realtime Setup

- Enable Realtime for `group_discussions` table (Supabase Dashboard → Database → Replication, or via migration with `supabase_realtime` publication).
- Adapter: use Supabase Realtime `channel('messages:group:' + groupId)` with `postgres_changes` filter for `group_discussions` table, `INSERT` events.
- Payload shape: `{ new: { id, group_id, user_id, body, created_at } }`. Map to `GroupDiscussion` and invalidate query to refresh list.

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- All 9 tasks completed. Migration 00014 applied via Supabase MCP. Realtime adapter subscribes to postgres_changes on group_discussions with filter by group_id. Group detail screen shows Discussion section for members with compose, list, and empty state. Non-members see placeholder. Contract tests and adapter unit tests pass.

### File List

- supabase/migrations/00014_group_discussions.sql
- lib/api/contracts/dto.ts
- lib/api/contracts/data.ts
- lib/api/contracts/index.ts
- lib/api/adapters/supabase/data.ts
- lib/api/adapters/supabase/realtime.ts
- lib/api/queryKeys.ts
- hooks/useApiQueries.ts
- app/group/[id].tsx
- lib/i18n/locales/en.ts
- lib/i18n/locales/ko.ts
- lib/i18n/locales/km.ts
- lib/api/adapters/supabase/__tests__/data.test.ts
- app/group/__tests__/group-detail.test.ts

### Change Log

- 2026-03-06: Implemented story 2-5 discussions within groups. Added group_discussions table, DTOs, data contract, Supabase adapter, Realtime subscription, React Query hooks, group detail Discussion section, i18n keys, and tests.
