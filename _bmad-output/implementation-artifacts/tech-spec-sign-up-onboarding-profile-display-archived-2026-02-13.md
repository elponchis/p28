---
title: 'Sign-up Onboarding with Profile Creation and Profile Tab Display'
slug: 'sign-up-onboarding-profile-display'
created: '2026-02-11'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Expo (React Native)', 'Expo Router', 'Supabase (auth + DB + storage)', 'Jest (ts-jest)']
files_to_modify: ['supabase/migrations/00002_profiles_onboarding_fields.sql', 'lib/api/contracts/dto.ts', 'lib/api/contracts/data.ts', 'lib/api/adapters/supabase/data.ts', 'app/auth/_layout.tsx', 'app/auth/sign-up.tsx', 'app/auth/onboarding.tsx', 'app/_layout.tsx', 'app/(tabs)/profile.tsx', 'app/profile/edit.tsx']
code_patterns: ['Facade-only app imports (lib/api); adapter in lib/api/adapters/supabase', 'getUserFacingError + isSubmitting for forms', 'api.data.getProfile/updateProfile/uploadProfileImage', 'Expo Router Stack + segments for auth redirect', 'Design tokens: theme/tokens (colors, spacing, typography); primitives: Input, Button, Avatar']
test_patterns: ['Jest + ts-jest; __tests__/*.test.ts co-located; contract/adapter unit tests; app/auth screen tests']
---

# Tech-Spec: Sign-up Onboarding with Profile Creation and Profile Tab Display

**Created:** 2026-02-11

## Overview

### Problem Statement

Users sign up with only email/password today. We need to collect First Name, Last Name, birth date, country of residence, and preferred language during sign-up, persist that data to a profile in the database, display it on the profile tab in a modern layout, and allow users to edit bio, profile image, and preferred language (name is read-only). Preferred language should drive in-app UI locale.

### Solution

Add an onboarding screen after email/password sign-up that collects the five fields. On submit, create/update the profile in the DB and redirect to the home tab. Extend the profiles schema with `first_name`, `last_name`, `birth_date`, `country`, `preferred_language`; derive `displayName` from first + last. Profile tab displays all profile data in a modern formatted way. Edit profile allows bio, avatar, and preferred language; name fields are read-only. Country uses a fixed picker list; preferred language drives app locale.

### Scope

**In Scope:**
- Onboarding screen after sign-up (First Name, Last Name, birth date, country, preferred language)
- Profile schema extension: `first_name`, `last_name`, `birth_date`, `country`, `preferred_language`
- Profile creation on onboarding submit; redirect to home tab
- Profile tab display of all profile data (modern layout)
- Edit profile: bio, avatar, and preferred language; name fields read-only (users can update their language)
- Country picker with fixed list
- Preferred language drives app locale

**Out of Scope:**
- Changing email/password flow structure
- Editing name fields after sign-up
- Visibility rules changes (keep existing Story 1.5 behavior)
- Full i18n implementation beyond preferred language storage and basic locale switching

## Context for Development

### Codebase Patterns

- **Auth flow:** `app/auth/sign-up.tsx` uses `auth.signUp` from facade; on success currently does `router.replace('/(tabs)')`. Must change to `router.replace('/auth/onboarding')`. Root `app/_layout.tsx` uses `useSegments()`; when `session && segments[0] === 'auth'` it does `router.replace('/(tabs)')` — must exclude `segments[1] === 'onboarding'` so users stay on onboarding until they submit.
- **Profile:** `app/(tabs)/profile.tsx` uses `api.data.getProfile(userId)`, shows displayName, email, bio, avatar; design tokens from `@/theme/tokens` (colors, spacing, typography); primitives from `@/components/primitives` (Avatar, Button). Edit at `app/profile/edit.tsx` which currently has displayName, bio, avatar; uses `api.data.updateProfile`, `api.data.uploadProfileImage`, `getUserFacingError`, `isSubmitting`.
- **Contracts:** `lib/api/contracts/dto.ts` — Profile has userId, displayName?, avatarUrl?, bio?; ProfileUpdates has displayName?, avatarUrl?, bio?. Data contract `lib/api/contracts/data.ts` has getProfile, updateProfile, uploadProfileImage only (no createProfile).
- **Adapter:** `lib/api/adapters/supabase/data.ts` — getProfile selects display_name, avatar_url, bio, updated_at; mapRow maps snake_case to camelCase; updateProfile merges updates and upserts (onConflict: user_id). Need to add createProfile (or extend updateProfile to accept onboarding payload for upsert) and new column mappings.
- **Schema:** `supabase/migrations/00001_profiles.sql` — profiles has user_id, display_name, avatar_url, bio, updated_at. New migration must add first_name, last_name, birth_date, country, preferred_language. display_name can remain for backward compatibility and be set from first_name || ' ' || last_name on insert/update, or derived in adapter only.
- **Tests:** Jest (ts-jest); tests in `lib/api/adapters/supabase/__tests__/data.test.ts`, `auth.test.ts`, `app/auth/__tests__/sign-up.test.ts`, `sign-in.test.ts`. Pattern: co-located `__tests__/*.test.ts`, mock Supabase client in adapters.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `app/auth/sign-up.tsx` | Redirect to `/auth/onboarding` on sign-up success (not tabs) |
| `app/auth/_layout.tsx` | Add Stack.Screen for onboarding |
| `app/auth/onboarding.tsx` | **New.** Form: first name, last name, birth date, country picker, preferred language; submit → create profile, redirect to home tab |
| `app/_layout.tsx` | Auth redirect: when session + in auth group, redirect to tabs only if not on onboarding (segments[1] !== 'onboarding') |
| `app/(tabs)/profile.tsx` | Display all profile fields (firstName, lastName, birthDate, country, preferredLanguage, bio, avatar) in modern layout |
| `app/profile/edit.tsx` | Remove display name input; add preferred language picker; keep bio, avatar; name read-only (do not send in updates) |
| `lib/api/contracts/dto.ts` | Profile: add firstName, lastName, birthDate?, country?, preferredLanguage?; displayName derived. ProfileUpdates: remove displayName; add preferredLanguage?; keep bio, avatarUrl |
| `lib/api/contracts/data.ts` | Add createProfile(userId, onboardingData) for initial profile creation |
| `lib/api/adapters/supabase/data.ts` | mapRow/select for new columns; derive displayName; createProfile implementation; updateProfile disallow name/birthDate/country |
| `supabase/migrations/00001_profiles.sql` | Reference; new migration adds columns |
| `contexts/AuthContext.tsx` | Session/auth state |
| `theme/tokens.ts` | Design tokens for layout/typography |

### Technical Decisions

- **displayName:** Derived from `firstName + " " + lastName` in adapter (mapRow); store first_name, last_name in DB. Keep display_name column and backfill from first_name/last_name for compatibility, or derive only in API layer.
- **Onboarding flow:** After sign-up success → navigate to `/auth/onboarding`. On submit → create profile (new createProfile contract method or updateProfile with full onboarding payload), then `router.replace('/(tabs)')` (home). Root layout must not redirect session+auth to tabs when segment is onboarding.
- **Country:** Fixed list picker (e.g. ISO 3166-1); store country code or name per product preference.
- **Preferred language:** Stored in profile; drives app locale. Editable on profile edit screen; add to ProfileUpdates.
- **createProfile:** Add to DataContract and adapter for onboarding; takes userId + { firstName, lastName, birthDate, country, preferredLanguage }. Insert or upsert profile row.

## Implementation Plan

### Tasks

- [ ] **Task 1: Add migration for profile onboarding columns**
  - File: `supabase/migrations/00002_profiles_onboarding_fields.sql`
  - Action: Add columns to `profiles`: `first_name TEXT`, `last_name TEXT`, `birth_date DATE`, `country TEXT`, `preferred_language TEXT`. Optionally keep `display_name` and backfill via trigger or leave for adapter to derive. No RLS changes required if existing policies cover the table.
  - Notes: Use `ALTER TABLE public.profiles ADD COLUMN ...` for each. Defaults optional.

- [ ] **Task 2: Extend Profile and ProfileUpdates in DTOs**
  - File: `lib/api/contracts/dto.ts`
  - Action: Add to Profile: `firstName?: string`, `lastName?: string`, `birthDate?: string` (ISO date), `country?: string`, `preferredLanguage?: string`; keep `displayName?` (derived). In ProfileUpdates remove `displayName`; add `preferredLanguage?: string`; keep `avatarUrl?`, `bio?`.
  - Notes: Export a type for onboarding payload if desired, e.g. `OnboardingProfileData`.

- [ ] **Task 3: Add createProfile to DataContract**
  - File: `lib/api/contracts/data.ts`
  - Action: Add `createProfile(userId: string, data: { firstName: string; lastName: string; birthDate?: string; country?: string; preferredLanguage?: string }): Promise<Profile | ApiError>` to DataContract. Document that it creates or upserts the profile row with onboarding data.
  - Notes: Facade and adapter will implement; app uses only via api.data.

- [ ] **Task 4: Implement createProfile and extend getProfile/updateProfile in Supabase adapter**
  - File: `lib/api/adapters/supabase/data.ts`
  - Action: (1) Extend select list and mapRow to include first_name, last_name, birth_date, country, preferred_language; derive displayName as `[first_name, last_name].filter(Boolean).join(' ')`. (2) Implement createProfile: upsert into profiles with user_id and onboarding fields; set display_name from first_name + last_name if column exists. (3) In updateProfile, only allow merging bio, avatarUrl, preferredLanguage — do not accept or write firstName, lastName, birthDate, country.
  - Notes: Map all errors to ApiError. Existing getProfile/updateProfile tests will need updates; add createProfile tests.

- [ ] **Task 5: Add onboarding screen to auth layout**
  - File: `app/auth/_layout.tsx`
  - Action: Add `<Stack.Screen name="onboarding" />` (or equivalent so route is `auth/onboarding`). Ensure onboarding is part of the auth stack so segments are `['auth', 'onboarding']` when on that screen.
  - Notes: Expo Router file-based; create `app/auth/onboarding.tsx` and ensure layout includes it (Stack.Screen name from file).

- [ ] **Task 6: Update root layout auth redirect to exclude onboarding segment**
  - File: `app/_layout.tsx`
  - Action: In the effect that does `router.replace('/(tabs)')` when session and inAuthGroup, add condition: only redirect when `segments[1] !== 'onboarding'` (so when user is on auth/onboarding, do not redirect to tabs until they submit).
  - Notes: Use useSegments(); segment order may be ['auth', 'onboarding'] for auth/onboarding route.

- [ ] **Task 7: Redirect sign-up success to onboarding**
  - File: `app/auth/sign-up.tsx`
  - Action: Where on success currently `router.replace('/(tabs)')`, change to `router.replace('/auth/onboarding')`. Keep email confirmation flow (success message and no redirect) unchanged.
  - Notes: After onboarding submit (separate task) user will go to (tabs).

- [ ] **Task 8: Create onboarding screen**
  - File: `app/auth/onboarding.tsx` (new)
  - Action: Build form with: First Name, Last Name (Input), Birth date (date picker or input), Country (fixed list picker, e.g. Picker or modal list), Preferred language (fixed list picker). Use api.data.createProfile(session.user.id, { firstName, lastName, birthDate, country, preferredLanguage }) on submit. Use getUserFacingError, isSubmitting. On success call `router.replace('/(tabs)')`. Use design tokens and Input/Button from primitives. Labels visible; 44pt touch targets per UX.
  - Notes: Get session from useAuth(); if no session redirect to sign-in. Validate required fields (first name, last name at minimum). Country/language lists can be constants (e.g. ISO countries, supported locales).

- [ ] **Task 9: Profile tab — display all profile fields in modern layout**
  - File: `app/(tabs)/profile.tsx`
  - Action: After getProfile, display: avatar, full name (firstName + lastName or displayName), email (session), birth date (formatted), country, preferred language, bio. Use typography and spacing from theme/tokens for a clean, modern card or section layout. Keep Edit profile and Sign out buttons.
  - Notes: Handle missing profile (e.g. legacy user without onboarding) by showing placeholder or prompting to complete profile; optionally redirect to onboarding if profile has no firstName.

- [ ] **Task 10: Profile edit — remove display name input, add preferred language; restrict updates**
  - File: `app/profile/edit.tsx`
  - Action: Remove the Display name Input and its state. Add preferred language picker (fixed list); include preferredLanguage in ProfileUpdates when saving. Do not send firstName, lastName, birthDate, or country in updateProfile. Keep bio, avatar (Change photo). Show first + last name as read-only text if desired.
  - Notes: ProfileUpdates type no longer has displayName; adapter ignores name fields on update.

- [ ] **Task 11: Wire preferred language to app locale**
  - File: App-level locale context or root layout / i18n hook
  - Action: When profile is loaded (e.g. in AuthContext or a small LocaleProvider), read profile.preferredLanguage and apply to app locale (e.g. I18nManager or expo-localization if used). If no i18n library yet, store preferred language and document where to plug in locale switching when i18n is added.
  - Notes: Out of scope is full i18n; this task is “store and apply preferred language” so that changing it in edit profile takes effect (e.g. re-fetch profile and set locale).

### Acceptance Criteria

- [ ] **AC1:** Given a new user has just signed up (email/password), when they are redirected to the onboarding screen, then they see a form with First Name, Last Name, birth date, country, and preferred language, and can submit to create their profile and land on the home tab.
- [ ] **AC2:** Given the user has completed onboarding, when they navigate to the profile tab, then they see their first name, last name, birth date, country, preferred language, bio (if set), and avatar in a clear, modern layout.
- [ ] **AC3:** Given the user is on the profile edit screen, when they change bio, profile image, or preferred language and save, then the profile is updated and the name (first/last) is not editable and not changed.
- [ ] **AC4:** Given the user updates their preferred language on the profile edit screen, when they save, then the app’s locale reflects the new preferred language (where locale is wired).
- [ ] **AC5:** Given the user is signed up and on the onboarding screen, when the root layout evaluates redirect, then the user is not redirected to tabs until they have submitted onboarding (onboarding segment is excluded from auth→tabs redirect).
- [ ] **AC6:** Given createProfile is called with valid onboarding data, when the adapter runs, then a profile row exists with first_name, last_name, birth_date, country, preferred_language set, and getProfile returns them with displayName derived from first + last name.
- [ ] **AC7:** Given the user submits onboarding with missing required fields (e.g. first name), when validation runs, then the user sees an error and the profile is not created.
- [ ] **AC8:** Given an existing user without onboarding data (legacy profile), when they open the profile tab, then the app shows available profile data and does not crash; optional: prompt or link to complete profile.

## Additional Context

### Dependencies

- Story 1.4 (auth) and 1.5 (profile) are complete; this story extends both flows and schema.
- Supabase project and migrations run against the same database; run new migration after deployment.
- No new npm packages required for core flow; date/country/language pickers can use React Native Picker or a simple modal list; if expo-localization is added for locale, add as dependency.

### Testing Strategy

- **Unit (adapter):** In `lib/api/adapters/supabase/__tests__/data.test.ts` add tests for createProfile (success, error mapping); extend getProfile/updateProfile tests for new fields and for updateProfile not updating first_name/last_name when passed. Mock Supabase client.
- **Unit (contract/facade):** Ensure DataContract type and facade expose createProfile; add a simple facade test that createProfile is callable if desired.
- **Screen/flow:** In `app/auth/__tests__/` add or extend tests for sign-up redirecting to onboarding (e.g. mock router.replace and assert called with '/auth/onboarding'). Optional: shallow test for onboarding screen that it calls createProfile on submit.
- **Manual:** Sign up → complete onboarding → open profile tab and verify all fields; edit profile (bio, avatar, language) and verify name unchanged; change language and verify locale effect.

### Notes

- Profile tab shows info when user navigates there; no forced redirect to profile after sign-up. Redirect goes to home tab.
- Legacy users (profile without first_name/last_name): profile tab and edit should not break; displayName may be empty or from old display_name column; consider backfill or “Complete your profile” prompt.
- Full i18n (translations for all UI strings) is out of scope; preferred language drives locale so that when you add i18n, the chosen language is already stored and applied.
- Country/language lists: use a fixed list (e.g. ISO 3166-1 for countries, and a short list of supported app languages) to keep scope bounded.
