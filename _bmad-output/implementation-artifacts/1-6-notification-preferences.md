# Story 1.6: Notification preferences

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to control which notifications I receive (by type and by ministry/group),
so that I am not overwhelmed and get only relevant updates.

## Acceptance Criteria

1. **Given** Epic 1.4 is complete,
   **When** I add a way for the user to set notification preferences (which types and from which ministries/groups they receive push),
   **Then** preferences are stored (via data contract) and available for the push system to respect later,
   **And** FR9 and FR17 are satisfied.

## Tasks / Subtasks

- [x] Add notification preference contract and DTOs (AC: #1)
  - [x] Define NotificationPreferences DTO in `lib/api/contracts/dto.ts`: userId, eventsEnabled, announcementsEnabled, messagesEnabled
  - [x] Add to DataContract: getNotificationPreferences(userId), updateNotificationPreferences(userId, updates)
- [x] Create Supabase migration for notification preferences (AC: #1)
  - [x] Add `notification_preferences` table: user_id (PK, FK auth.users), events_enabled, announcements_enabled, messages_enabled, updated_at
  - [x] RLS: user can read/update own row only; create row on first access if missing
- [x] Implement Supabase data adapter for notification preferences (AC: #1)
  - [x] Implement getNotificationPreferences, updateNotificationPreferences in `lib/api/adapters/supabase/data.ts`
  - [x] Map all backend errors to ApiError; upsert on update
- [x] Add notification preferences screen UI (AC: #1)
  - [x] Create `app/profile/notifications.tsx` (or `app/settings/notifications.tsx`) with toggles for events, announcements, messages
  - [x] Use design tokens and primitives; labels always visible; 44pt touch targets; Save or auto-save with brief confirmation
  - [x] Entry point from profile screen (e.g. "Notification preferences" link/button)
  - [x] Loading/submit with isSubmitting convention; errors via getUserFacingError
- [x] Wire to facade (AC: #1)
  - [x] Facade exposes api.data.getNotificationPreferences, api.data.updateNotificationPreferences
  - [x] Screen uses only api.data; no adapter or @supabase imports

## Dev Notes

- **Scope:** Epic 1.4 delivered auth; Epic 1.5 delivered profile. This story adds notification preference CRUD via the data contract so the push system (Epic 6) can respect user choices. Ministry/group scoping (e.g. "only from Ministry X") is deferred—Epic 2–3 add org structure; Epic 6 will extend preferences when that data exists.
- **MVP preference model:** Store type-level toggles (events, announcements, messages). Default: all enabled. One row per user. Schema is extensible for future ministry/group granularity (e.g. add scope columns in later migration).
- **Existing code:** Data contract in `lib/api/contracts/data.ts`; adapter in `lib/api/adapters/supabase/data.ts`. Profile tab at `app/(tabs)/profile.tsx`; add link/button to notification preferences screen. Reuse profile patterns (useAuth, api.data, getUserFacingError, isSubmitting).

### Project Structure Notes

- **Target structure (from architecture):**
  - `lib/api/contracts/dto.ts` — add NotificationPreferences, NotificationPreferencesUpdates
  - `lib/api/contracts/data.ts` — add getNotificationPreferences, updateNotificationPreferences to DataContract
  - `lib/api/adapters/supabase/data.ts` — implement preference ops
  - `supabase/migrations/` — new migration for notification_preferences table + RLS
  - `app/profile/notifications.tsx` — notification preferences screen (or under app/settings/ if preferred)
  - `app/(tabs)/profile.tsx` — add entry point (button or link) to notifications screen
- **Do not:** Put backend SDK or adapter imports in app/, components/, hooks. Add preference ops to existing data contract; do not create new top-level folders.

### References

- [Source: _bmad-output/planning-artifacts/epics.md] — Epic 1, Story 1.6; FR9, FR17
- [Source: _bmad-output/planning-artifacts/architecture.md] — Data contract, lib/api structure, notification prefs in identity/push sections
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Guest preferences as toggles/checkboxes; labels visible; 44pt touch targets; Save or auto-save with brief confirmation

## Technical Requirements (guardrails)

- **Data adapter only in `lib/api/adapters/supabase/data.ts`:** Implement getNotificationPreferences, updateNotificationPreferences. Map all errors to ApiError. Upsert: create row if missing on first get or update.
- **Contract first:** Add DTOs and operations to data contract before implementing adapter. App uses only api.data from facade.
- **Screen uses facade only:** No `@supabase/*` or `lib/api/adapters/` in app or hooks.
- **RLS:** notification_preferences: user can SELECT/UPDATE own row only; no INSERT policy needed if adapter upserts via UPDATE with ON CONFLICT.

## Architecture Compliance

- **Backend boundary:** All preference data goes through facade; only Supabase adapter implements data contract. App must not import backend SDK or adapter.
- **Contract implementation:** DataContract extended with getNotificationPreferences, updateNotificationPreferences; return types match contract (NotificationPreferences, ApiError).
- **DTOs:** NotificationPreferences in dto.ts; camelCase in app; adapter maps snake_case from Supabase.
- **Project structure:** Preference ops in lib/api; preference UI in app/profile/ (or app/settings/); migrations in supabase/migrations/.

## Library / Framework Requirements

- **Supabase:** Use `@supabase/supabase-js` only inside adapter. Standard .from('notification_preferences').select/upsert.
- **React Native / Expo:** Use existing design tokens, Button, and primitives. Add Switch or similar for toggles (React Native Switch or Expo; ensure 44pt touch target via hitSlop or wrapper).
- **No new UI library:** Reuse theme and components from profile/edit flow.

## File Structure Requirements

- **Modify:** `lib/api/contracts/dto.ts` — add NotificationPreferences, NotificationPreferencesUpdates
- **Modify:** `lib/api/contracts/data.ts` — add getNotificationPreferences, updateNotificationPreferences to DataContract
- **Modify:** `lib/api/adapters/supabase/data.ts` — implement preference ops
- **Modify:** `lib/api/index.ts` — ensure facade exposes new data ops
- **Create:** `supabase/migrations/00005_notification_preferences.sql` (or next seq) — notification_preferences table, RLS
- **Create:** `app/profile/notifications.tsx` — notification preferences screen
- **Modify:** `app/(tabs)/profile.tsx` — add entry to notification preferences (e.g. "Notification preferences" button)
- **Modify:** `app/profile/_layout.tsx` — add notifications route if using stack
- **Do not create:** New contracts outside lib/api/contracts; no adapter imports in app/components/hooks.

## Testing Requirements

- **Adapter:** Unit tests for getNotificationPreferences (found/created), updateNotificationPreferences (success/error). Mock Supabase client. Verify errors map to ApiError.
- **Contract:** Verify DataContract includes new methods; facade exposes them.
- **Screens:** Notification preferences screen loads via api.data; toggles/Submit calls updateNotificationPreferences; no direct Supabase/adapter imports.
- **Verification:** Ensure no `@supabase/*` or `lib/api/adapters/` in app/, components/, contexts/, hooks.

## Previous Story Intelligence (1.5)

- **Profile screen:** `app/(tabs)/profile.tsx` shows profile, Edit profile, Sign out. Add "Notification preferences" as a new action (same card or actions section).
- **Profile edit:** `app/profile/edit.tsx` uses api.data, isSubmitting, getUserFacingError. Follow same patterns for notifications screen.
- **Facade pattern:** App imports from lib/api; add preference ops to api.data.
- **Forms:** Labels visible; 44pt touch targets; accessibilityLabel on interactive elements.
- **Profile stack:** `app/profile/_layout.tsx` exists; add notifications screen to stack.
- **Tests:** Adapter tests in lib/api/adapters/supabase/__tests__/; mock Supabase. Reuse pattern for data adapter tests.

## Git Intelligence Summary

- (If git available, analyze recent commits for patterns. Story 1.5 established profile contract, DTOs, adapter, migrations, profile/edit screens.)

## Latest Tech Information

- **React Native Switch:** Use `Switch` from react-native for toggles. Wrap in Pressable or use hitSlop for 44pt touch target per WCAG. Set accessibilityLabel and accessibilityRole="switch".
- **Supabase upsert:** Use .upsert({ user_id, ... }, { onConflict: 'user_id' }) for notification_preferences; ensure RLS allows the operation for auth.uid().

## Project Context Reference

- No `project-context.md` in repo. Use planning artifacts: `_bmad-output/planning-artifacts/architecture.md`, `_bmad-output/planning-artifacts/epics.md`, `_bmad-output/planning-artifacts/ux-design-specification.md` for design system, toggles, forms, and feedback patterns. FR9 and FR17 (notification preferences) are covered by this story.

## Change Log

- 2026-03-03: Code review fixes — race condition (request id), error UX (hide toggles + retry), accessibilityHint, pull-to-refresh, upsert-error test
- 2026-03-03: Story 1.6 implementation complete — notification preferences contract, migration, adapter, screen, tests

## Story Completion Status

- **Status:** done
- **Completion note:** Code review complete; fixes applied (race condition, error UX, a11y, pull-to-refresh, test coverage).

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Implemented notification preference contract, DTOs, migration, adapter, and UI per AC #1
- DTOs: NotificationPreferences and NotificationPreferencesUpdates in lib/api/contracts/dto.ts
- Migration 00005: notification_preferences table with RLS (SELECT, UPDATE, INSERT for own row)
- Adapter: getNotificationPreferences (creates row with defaults if missing), updateNotificationPreferences (upsert)
- Screen: app/profile/notifications.tsx with Switch toggles for events, announcements, messages; auto-save with "Preferences saved" feedback; 44pt touch targets
- Entry point: "Notification preferences" button on profile screen; route added to profile stack
- Unit tests: getNotificationPreferences (found, creates when missing, select error, upsert error); updateNotificationPreferences (success, error)
- Code review fixes: request id to prevent rapid-toggle race; error state hides toggles and shows retry; accessibilityHint on switches; RefreshControl for pull-to-refresh

### File List

- lib/api/contracts/dto.ts (modified)
- lib/api/contracts/data.ts (modified)
- lib/api/contracts/index.ts (modified)
- lib/api/index.ts (modified)
- lib/api/adapters/supabase/data.ts (modified)
- lib/api/adapters/supabase/__tests__/data.test.ts (modified)
- supabase/migrations/00005_notification_preferences.sql (created)
- app/profile/notifications.tsx (created)
- app/profile/_layout.tsx (modified)
- app/(tabs)/profile.tsx (modified)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)
