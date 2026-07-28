# Story 1.5: Profile

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to set my profile picture and personal information,
so that others in my org/ministry/group context can see the right information.

## Acceptance Criteria

1. **Given** Epic 1.4 is complete and profile data is available via the data contract,
   **When** I add profile screen(s) for setting/updating profile picture and personal info,
   **Then** profile data is stored and displayed,
   **And** FR7 is satisfied (profile picture and personal info).

## Tasks / Subtasks

- [x] Add profile data contract and DTOs (AC: #1)
  - [x] Define Profile DTO in `lib/api/contracts/dto.ts`: userId, displayName?, avatarUrl?, bio?
  - [x] Add to DataContract: getProfile(userId), updateProfile(userId, updates), uploadProfileImage(userId, imageUri) → avatarUrl
- [x] Create Supabase migration for profiles (AC: #1)
  - [x] Add `profiles` table: user_id (uuid, FK auth.users), display_name, avatar_url, bio
  - [x] RLS policies: user can read/update own profile; read others' profiles
- [x] Implement Supabase data adapter for profile (AC: #1)
  - [x] Implement getProfile, updateProfile, uploadProfileImage in `lib/api/adapters/supabase/data.ts`
  - [x] Use Supabase Storage for avatar uploads; store public URL in profiles.avatar_url
  - [x] Map all backend errors to ApiError
- [x] Add profile screen UI (AC: #1)
  - [x] Expand `app/(tabs)/profile.tsx` (or add `app/profile/edit.tsx`) for edit flow: avatar picker, display name, bio
  - [x] Use design tokens and primitives (Avatar, Input, Button); labels always visible; 44pt touch targets
  - [x] Loading/submit with isSubmitting convention; errors via getUserFacingError
- [x] Wire profile to facade (AC: #1)
  - [x] Facade exposes api.data.getProfile, api.data.updateProfile, api.data.uploadProfileImage
  - [x] Profile screen uses only api.data (facade); no adapter or @supabase imports

## Dev Notes

- **Scope:** Story 1.4 delivered auth, sign-in/sign-up, AuthContext, and a basic profile tab (email + sign out). This story adds profile CRUD (picture, display name, bio) via the data contract and Supabase adapter. The existing `app/(tabs)/profile.tsx` shows session email and sign out; expand it or add an edit screen for profile editing.
- **Profile vs User:** Auth contract's User (id, email, createdAt) comes from auth; Profile is extended user data (displayName, avatarUrl, bio) stored in `profiles` table and fetched via data contract.
- **Avatar upload:** Use Expo ImagePicker to pick image; adapter's uploadProfileImage(userId, imageUri) uploads to Supabase Storage (e.g. `avatars/{userId}`), returns public URL. Storage bucket needs RLS: user can upload/update own files.
- **Existing code:** `lib/api/contracts/data.ts` is a stub; `lib/api/adapters/supabase/data.ts` returns empty object. Add profile operations. Profile tab exists at `app/(tabs)/profile.tsx`—extend with edit form or link to edit screen.

### Project Structure Notes

- **Target structure (from architecture):**
  - `lib/api/contracts/dto.ts` — add Profile type
  - `lib/api/contracts/data.ts` — add getProfile, updateProfile, uploadProfileImage to DataContract
  - `lib/api/adapters/supabase/data.ts` — implement profile ops + Storage for avatars
  - `supabase/migrations/` — new migration for profiles table + Storage bucket + RLS
  - `app/(tabs)/profile.tsx` — expand with profile display and edit (or `app/profile/edit.tsx` for edit flow)
- **Do not:** Put backend SDK or adapter imports in app/, components/, hooks. Add profile ops to existing data contract; do not create new top-level folders.

### References

- [Source: _bmad-output/planning-artifacts/epics.md] — Epic 1, Story 1.5; FR7
- [Source: _bmad-output/planning-artifacts/architecture.md] — Data contract, DTOs, lib/api structure, profiles in identity section
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Forms, Avatar, feedback patterns, 44pt targets, labels visible
- [Source: _bmad-output/implementation-artifacts/1-4-supabase-auth-adapter-and-sign-in-sign-up.md] — Auth patterns, facade usage, getUserFacingError, isSubmitting

## Technical Requirements (guardrails)

- **Data adapter only in `lib/api/adapters/supabase/data.ts`:** Implement profile operations. Use Supabase client for DB (profiles table) and Storage (avatars bucket). Map all errors to ApiError.
- **Contract first:** Add Profile DTO and operations to data contract before implementing adapter. App uses only api.data from facade.
- **Profile screen uses facade only:** No `@supabase/*` or `lib/api/adapters/` in app or hooks. Call api.data.getProfile, api.data.updateProfile, api.data.uploadProfileImage.
- **RLS:** Profiles table RLS: user can SELECT/UPDATE own row; authenticated users can read others' profiles (MVP).
- **Storage:** Create `avatars` bucket; RLS so user can upload/update only their path (`avatars/{user_id}/*`).

## Architecture Compliance

- **Backend boundary:** All profile data goes through facade; only Supabase adapter implements data contract. App must not import backend SDK or adapter.
- **Contract implementation:** DataContract extended with getProfile, updateProfile, uploadProfileImage; return types match contract (Profile, ApiError).
- **DTOs:** Profile in dto.ts; camelCase in app; adapter maps snake_case from Supabase.
- **Project structure:** Profile operations in lib/api; profile UI in app/(tabs)/profile or app/profile/; migrations in supabase/migrations/.

## Library / Framework Requirements

- **Supabase:** Use `@supabase/supabase-js` only inside adapter. Storage: `supabase.storage.from('avatars').upload()`, `getPublicUrl()`. Follow [Supabase Storage + React Native](https://supabase.com/docs/guides/storage) for upload patterns.
- **Expo ImagePicker:** Use `expo-image-picker` for selecting profile photo. Request media library permission; use launchImageLibraryAsync. Install if not present: `npx expo install expo-image-picker`.
- **React Native / Expo:** Use existing design tokens, Avatar, Input, Button from theme and components/primitives. No new UI library.

## File Structure Requirements

- **Modify:** `lib/api/contracts/dto.ts` — add Profile
- **Modify:** `lib/api/contracts/data.ts` — add getProfile, updateProfile, uploadProfileImage to DataContract
- **Modify:** `lib/api/adapters/supabase/data.ts` — implement profile ops; Storage for avatars
- **Modify:** `lib/api/index.ts` — ensure facade exposes api.data (already does; verify profile ops available)
- **Create:** `supabase/migrations/00001_profiles.sql` (or next seq) — profiles table, avatars bucket, RLS
- **Modify:** `app/(tabs)/profile.tsx` — add profile display and edit UI (or create `app/profile/edit.tsx`)
- **Do not create:** New contracts outside lib/api/contracts; no adapter imports in app/components/hooks.

## Testing Requirements

- **Adapter:** Unit tests for getProfile (found/not found), updateProfile (success/error), uploadProfileImage (success/error). Mock Supabase client and Storage. Verify errors map to ApiError.
- **Contract:** Verify DataContract includes new methods; facade test mocks adapter.
- **Screens:** Profile screen loads profile via api.data; form submit calls updateProfile; no direct Supabase/adapter imports.
- **Verification:** Extend verify script to ensure no `@supabase/*` or `lib/api/adapters/` in app/, components/, contexts/, hooks.

## Previous Story Intelligence (1.4)

- **Auth and session:** AuthContext provides session, signOut. Profile screen can use `session?.user?.id` for current user. All auth via api.auth; no direct Supabase.
- **Facade pattern:** App imports from lib/api (facade); facade wires auth, data, realtime. Add profile ops to data; app calls api.data.getProfile(userId), etc.
- **Error handling:** getUserFacingError(ApiError) for UI; adapter maps all errors to ApiError.
- **Forms:** Labels visible; isSubmitting for loading; inline error on Input; Button/Input from primitives.
- **Files created in 1.4:** app/auth/, contexts/AuthContext, hooks/useAuth, lib/api/adapters/supabase/auth.ts. Profile tab at app/(tabs)/profile.tsx—extend, don't replace.
- **Tests:** Adapter tests in lib/api/adapters/supabase/__tests__/; mock Supabase. Reuse pattern for data adapter tests.

## Git Intelligence Summary

- (No git repository detected. If available, analyze recent commits for patterns and conventions.)

## Latest Tech Information

- **Supabase Storage + React Native:** Create bucket (e.g. `avatars`), enable RLS. Policy: users can upload/update `avatars/{auth.uid()}/*`. Use `supabase.storage.from('avatars').upload(path, file, { upsert: true })`. Get URL via `getPublicUrl(path)`.
- **Expo ImagePicker:** `import * as ImagePicker from 'expo-image-picker'`. `launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1] })`. Returns `{ uri }`. For Supabase upload, fetch blob from uri or use `decode` if base64.
- **Image upload flow:** 1) User picks image → get uri. 2) Adapter receives uri, fetches as blob (or uses FormData), uploads to Storage. 3) Get public URL, save to profiles.avatar_url. 4) UI shows new avatar.

## Project Context Reference

- No `project-context.md` in repo. Use planning artifacts: `_bmad-output/planning-artifacts/architecture.md`, `_bmad-output/planning-artifacts/epics.md`, `_bmad-output/planning-artifacts/ux-design-specification.md` for design system, forms, Avatar, and feedback patterns. FR7 (profile picture and personal info) is covered by this story.

## Story Completion Status

- **Status:** review
- **Completion note:** Story 1.5 implemented. Profile contract, DTOs, Supabase adapter (getProfile, updateProfile, uploadProfileImage), profiles migration, profile tab and edit screen. All ACs satisfied; tests and verify pass. Bottom nav spacing improved per user request.

---

## Change Log

- 2026-02-11: Story 1.5 implemented — Profile contract, DTOs, Supabase adapter, migration, profile tab and edit screen; bottom nav spacing improved.

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

- lib/api/contracts/dto.ts (Profile, ProfileUpdates)
- lib/api/contracts/data.ts (getProfile, updateProfile, uploadProfileImage)
- lib/api/contracts/index.ts (Profile, ProfileUpdates exports)
- lib/api/index.ts (Profile, ProfileUpdates, OnboardingProfileData exports)
- lib/api/adapters/supabase/data.ts (full profile implementation)
- lib/api/adapters/supabase/__tests__/data.test.ts (profile adapter tests)
- supabase/migrations/00001_profiles.sql (profiles table, avatars bucket, RLS)
- supabase/migrations/00002_profiles_onboarding_fields.sql (onboarding columns)
- supabase/migrations/00003_check_email_exists.sql (check email exists)
- supabase/migrations/00004_drop_profiles_visibility.sql (remove visibility column)
- app/(tabs)/_layout.tsx (tab bar spacing)
- app/(tabs)/profile.tsx (profile display, Edit button, loading and error state)
- app/profile/_layout.tsx (profile stack)
- app/profile/edit.tsx (profile edit form: avatar, display name, bio, preferred language; 44pt touch target, a11y)
- app/_layout.tsx (profile stack screen)
- app/auth/onboarding.tsx (onboarding flow)
- contexts/LocaleContext.tsx (locale from profile)
- contexts/PendingSignUpContext.tsx (pending sign-up state)
- scripts/verify-story-1-5.cjs (profile boundary verification)
- package.json (expo-image-picker)
