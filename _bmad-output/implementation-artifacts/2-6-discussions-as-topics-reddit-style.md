# Story 2.6: Discussions as Topics (Reddit-Style)

Status: review

<!-- Note: Depends on 2-5. Refactors discussion model from flat posts to topic threads. -->

## Story

As a group member,
I want to browse discussions as topics on the Groups screen and reply only within a discussion thread,
so that conversations stay organized and easy to follow.

## Acceptance Criteria

1. **Given** I am on the Groups tab (`app/(tabs)/groups.tsx`),
   **When** there are existing discussions,
   **Then** I see a list of all discussions (each showing topic, group name, author, preview),
   **And** discussions are ordered by most recent activity.

2. **Given** I am on the Groups tab,
   **When** I tap "Add discussion",
   **Then** I navigate to a create discussion screen,
   **And** I can enter a discussion topic,
   **And** I am reminded of conduct guidelines before posting.

3. **Given** I submit the create discussion form with a valid topic,
   **When** the creation succeeds,
   **Then** I am navigated to the new discussion screen,
   **And** my topic appears as the original post at the top.

4. **Given** I tap a discussion from the Groups list,
   **When** the discussion screen loads,
   **Then** I see the original post at the top (Reddit-style),
   **And** replies below in chronological order,
   **And** a compose area at the bottom to add a reply,
   **And** I cannot post or reply from the Groups screen—only from within the discussion screen.

5. **Given** I am viewing a discussion and post a reply,
   **When** the post succeeds,
   **Then** my reply appears in the list,
   **And** new replies appear in near-real-time via Realtime subscription.

6. **Given** I am not a member of the group a discussion belongs to,
   **When** I view the discussion,
   **Then** I can read the topic and replies (if RLS allows) but cannot reply,
   **And** I see a prompt to join the group to participate.

## Tasks / Subtasks

- [x] Task 1: Migration – discussions and discussion_posts tables (AC: 1–5)
  - [x] 1.1: Create `supabase/migrations/00015_discussions_and_posts.sql`:
    - `discussions` table: `id` (uuid PK), `group_id` (FK groups), `user_id` (FK auth.users), `title` (text NOT NULL), `body` (text NOT NULL, original post), `created_at` (timestamptz)
    - `discussion_posts` table: `id` (uuid PK), `discussion_id` (FK discussions), `user_id` (FK auth.users), `body` (text NOT NULL), `created_at` (timestamptz)
    - RLS: members can read discussions/posts in their groups; members can INSERT; indexes for list and realtime
    - Enable Realtime for `discussions` and `discussion_posts` (postgres_changes INSERT)
  - [x] 1.2: Apply migration via Supabase MCP

- [x] Task 2: DTOs – Discussion and DiscussionPost types (AC: 1–5)
  - [x] 2.1: Add to `lib/api/contracts/dto.ts`: `Discussion`, `CreateDiscussionInput`, `DiscussionPost`, `CreateDiscussionPostInput`
  - [x] 2.2: Export from `lib/api/index.ts`
  - [x] 2.3: Deprecate or repurpose `GroupDiscussion` / `CreateGroupDiscussionInput` per migration plan (document in Dev Notes)

- [x] Task 3: Data contract – discussion and post operations (AC: 1–5)
  - [x] 3.1: Add to `DataContract`:
    - `getDiscussions(params?: { groupId?: string }): Promise<Discussion[] | ApiError>` — all discussions or by group
    - `getDiscussion(id: string): Promise<Discussion | ApiError>`
    - `createDiscussion(groupId: string, userId: string, input: CreateDiscussionInput): Promise<Discussion | ApiError>`
    - `getDiscussionPosts(discussionId: string): Promise<DiscussionPost[] | ApiError>`
    - `createDiscussionPost(discussionId: string, userId: string, input: CreateDiscussionPostInput): Promise<DiscussionPost | ApiError>`

- [x] Task 4: Supabase adapter – implement discussion and post methods (AC: 1–5)
  - [x] 4.1: Implement all new contract methods; join profiles for author displayName/avatarUrl
  - [x] 4.2: Order discussions by `created_at` desc (or latest post if desired)
  - [x] 4.3: Order discussion posts by `created_at` asc (chronological)

- [x] Task 5: Realtime – subscribe to discussion posts (AC: 5)
  - [x] 5.1: Add channel `messages:discussion:{discussionId}` for `discussion_posts` INSERT
  - [x] 5.2: Update realtime adapter to support discussion-scoped channel format

- [x] Task 6: React Query hooks (AC: 1–5)
  - [x] 6.1: Add `discussions()`, `discussion(id)`, `discussionPosts(discussionId)` to `queryKeys.ts`
  - [x] 6.2: Add `useDiscussionsQuery`, `useDiscussionQuery`, `useDiscussionPostsQuery`, `useCreateDiscussionMutation`, `useCreateDiscussionPostMutation`

- [x] Task 7: Groups screen – discussion list and add button (AC: 1, 2)
  - [x] 7.1: Add section or tab to show discussions list (all discussions, optionally filterable by group)
  - [x] 7.2: Add "Add discussion" option (e.g. FAB or header button for members)
  - [x] 7.3: Remove or repurpose flat post UI from group detail per migration plan

- [x] Task 8: Create discussion screen (AC: 2, 3)
  - [x] 8.1: Create `app/group/discussion/create.tsx` (or `app/discussion/create.tsx` with groupId param)
  - [x] 8.2: Form: topic (title) input, body (optional initial post), submit
  - [x] 8.3: Show conduct guidelines reminder (collapsible or inline from `conduct.*` i18n)
  - [x] 8.4: On success, navigate to discussion detail screen

- [x] Task 9: Discussion detail screen – Reddit-style thread (AC: 4, 5, 6)
  - [x] 9.1: Create `app/group/discussion/[id].tsx` or `app/discussion/[id].tsx`
  - [x] 9.2: Original post at top (DiscussionRow with title + body)
  - [x] 9.3: Replies below in chronological order (DiscussionPostRow)
  - [x] 9.4: Compose area at bottom; reply only if member; Realtime subscription for new posts
  - [x] 9.5: Non-member: read-only with "Join group to reply" prompt

- [x] Task 10: Group detail – remove flat discussion UI (AC: 1, 4)
  - [x] 10.1: Remove inline discussion list and compose from `app/group/[id].tsx`
  - [x] 10.2: Replace with link/CTA to "View discussions" or redirect to Groups discussions list

- [x] Task 11: i18n keys (AC: 2, 4, 6)
  - [x] 11.1: Add `discussions.*` keys: `title`, `addDiscussion`, `topicPlaceholder`, `createDiscussion`, `conductReminder`, `joinToReply`, etc.
  - [x] 11.2: Mirror in `ko.ts` and `km.ts`

- [x] Task 12: Tests
  - [x] 12.1: Adapter unit tests for `getDiscussions`, `getDiscussion`, `createDiscussion`, `getDiscussionPosts`, `createDiscussionPost`
  - [x] 12.2: Contract tests for create discussion screen (conduct reminder, form)
  - [x] 12.3: Contract tests for discussion detail screen (Reddit layout, reply compose)

## File List

- supabase/migrations/00015_discussions_and_posts.sql (new)
- lib/api/contracts/dto.ts (modified)
- lib/api/contracts/data.ts (modified)
- lib/api/contracts/index.ts (modified)
- lib/api/index.ts (modified)
- lib/api/adapters/supabase/data.ts (modified)
- lib/api/adapters/supabase/realtime.ts (modified)
- lib/api/queryKeys.ts (modified)
- hooks/useApiQueries.ts (modified)
- app/(tabs)/groups.tsx (modified)
- app/group/[id].tsx (modified)
- app/group/discussion/create.tsx (new)
- app/group/discussion/[id].tsx (new)
- lib/i18n/locales/en.ts (modified)
- lib/i18n/locales/ko.ts (modified)
- lib/i18n/locales/km.ts (modified)
- app/group/__tests__/group-detail.test.ts (modified)
- lib/api/adapters/supabase/__tests__/data.test.ts (modified)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)

## Change Log

- 2026-03-06: Implemented Reddit-style discussions: migration, DTOs, data contract, adapter, Realtime, React Query hooks, Groups screen discussions filter, create/detail screens, group detail CTA, i18n, tests. All ACs satisfied.

## Dev Notes

### Data model (replaces flat group_discussions)

- **discussions**: One row per topic. `title` = topic, `body` = original post.
- **discussion_posts**: Replies only. Original post lives in `discussions.body`.
- Migration strategy: New tables. `group_discussions` (from 2-5) can be deprecated; optionally migrate existing rows into `discussions` with `title = body` or "Untitled" and `body = body` for data preservation.

### UX flow

1. **Groups tab** → Discussions list (all) + "Add discussion" button
2. **Add discussion** → Create screen (topic + body + conduct reminder) → On success → Discussion detail
3. **Tap discussion** → Discussion detail (original post top, replies below, compose at bottom)
4. **Group detail** → No inline compose; CTA to browse discussions

### Architecture

- Realtime: `messages:discussion:{discussionId}` for `discussion_posts` INSERT
- React Query hooks only; no direct `api.data.*` in screens
- Conduct reminder: reuse `t('conduct.*')` keys; consider `conductReminder` shorthand for create flow
- Routes: `app/group/discussion/create.tsx` (groupId from params or picker), `app/group/discussion/[id].tsx`

### References

- Story 2-5: Current flat discussion implementation (to refactor/deprecate)
- `app/profile/conduct.tsx`: Conduct guidelines structure
- Architecture: Realtime channel naming, RLS patterns
