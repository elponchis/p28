# Story 1.1: Initialize Expo app with tabs template

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the project initialized with Expo (tabs template) and TypeScript,
so that the app runs with a tab shell (Home, Groups, Messages, Profile) and matches the architecture.

## Acceptance Criteria

1. **Given** a clean repo or project root,
   **When** I run `npx create-expo-app@latest --template tabs` (app name e.g. p28-v2, TypeScript),
   **Then** the app runs with Expo Router and tab layout (Home, Groups, Messages, Profile),
   **And** project structure includes `app/`, `components/`, and no backend SDK in app or components.

## Tasks / Subtasks

- [x] Run create-expo-app with tabs template (AC: #1)
  - [x] Execute `npx create-expo-app@latest --template tabs` in project root (or parent folder if creating fresh)
  - [x] Use app name `p28-v2` and select TypeScript when prompted
  - [x] Verify app starts with `npx expo start`
- [x] Align tab names with architecture (AC: #1)
  - [x] Ensure bottom tabs are: **Home**, **Groups**, **Messages**, **Profile** (rename default tabs if the template uses different labels, e.g. "Explore" → "Groups")
  - [x] Tab files under `app/(tabs)/`: `index.tsx` (Home), `groups.tsx`, `messages.tsx`, `profile.tsx`
- [x] Establish project structure (AC: #1)
  - [x] Confirm `app/` exists with Expo Router layout and `(tabs)` group
  - [x] Add top-level `components/` folder (empty or with a placeholder); architecture expects `components/primitives/` and `components/patterns/` later—this story only ensures `components/` exists
  - [x] Do **not** add `lib/api/`, Supabase, or any backend SDK in this story
- [x] Verify no backend in app/components (AC: #1)
  - [x] Ensure no imports of `@supabase/supabase-js` or other backend SDKs in `app/` or `components/`
  - [x] Backend contracts and adapters are added in Story 1.3

## Dev Notes

- **Scope:** This story is **project bootstrap only**. Do not implement design tokens, auth, or API contracts here; those are Stories 1.2 and 1.3.
- **Architecture:** Per architecture doc, the starter is `create-expo-app@latest --template tabs`. Supabase is added **after** this story per the [Supabase + Expo React Native](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native) guide (Story 1.3).
- **Tab naming:** UX spec and epics require bottom nav: **Home**, **Groups**, **Messages**, **Profile**. The default Expo tabs template may use different labels (e.g. "Explore"); rename routes and tab labels to match. Minimum touch target 44pt is a UX requirement for later; no change required in this story for touch targets.
- **Expo Router:** File-based routing. Tabs live under `app/(tabs)/`. Keep route components thin; business logic and backend access will go in hooks and `lib/api` in later stories.

### Project Structure Notes

- **Target structure from architecture (for reference; this story only creates the Expo + tabs base):**
  - `app/` — Expo Router only; `app/(tabs)/_layout.tsx`, `index.tsx`, `groups.tsx`, `messages.tsx`, `profile.tsx`
  - `components/` — add folder; subfolders `primitives/` and `patterns/` can be added in Story 1.2
  - No `lib/api/`, no `theme/`, no Supabase in this story
- **Naming:** Components PascalCase; files match component name (e.g. `Groups.tsx` for screen). Folder names: `(tabs)` is Expo Router convention; use lowercase for `components/`, `app/`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md] — Epic 1, Story 1.1 acceptance criteria and user story
- [Source: _bmad-output/planning-artifacts/architecture.md] — Starter Template Evaluation (create-expo-app, tabs template), Project Structure & Boundaries, Implementation sequence
- [Source: _bmad-output/planning-artifacts/architecture.md] — Naming (PascalCase components), no backend SDK in app/components
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Bottom navigation: Home, Groups, Messages, Profile; 44pt min touch (for future stories)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Implemented Expo app via `npx create-expo-app@latest --template tabs` in temp dir, then moved app/, assets/, components/, constants/, package.json, app.json, tsconfig.json to project root. Package name set to p28-v2.
- Replaced default two-tab template with four tabs: Home (index), Groups, Messages, Profile. Added app/(tabs)/groups.tsx, messages.tsx, profile.tsx; updated _layout.tsx with titles and icons; renamed index screen to HomeScreen; removed two.tsx.
- Confirmed app/ and components/ (with primitives/ and patterns/ subdirs) present; no lib/api or backend SDK added. Verified no @supabase/supabase-js in app/ or components/.
- Added scripts/verify-story-1-1.cjs and npm run test/verify to validate structure and tab layout; all checks pass.
- Code review (adversarial): Fixed HIGH (.env in .gitignore), MEDIUM (accessibility labels on tabs and header button, File List and verify script updates). Story marked done.

### Senior Developer Review (AI)

**Review date:** 2026-02-11  
**Outcome:** Approve (after fixes)

**Findings addressed:**
- [x] **HIGH:** .gitignore did not exclude `.env` — added `.env` and comment for Supabase (Story 1.3).
- [x] **MEDIUM:** No automated evidence for "app starts" — verify script now includes optional `expo export --platform web` build check.
- [x] **MEDIUM:** File List omitted tsconfig.json and ExternalLink.tsx — added to File List.
- [x] **MEDIUM:** No accessibility labels on tab bar or Home header — added `tabBarAccessibilityLabel` for all tabs and `accessibilityLabel`/`accessibilityHint` on header info button.

**Remaining (LOW, deferred):** Template test StyledText-test.js not run by npm test; magic numbers in layout; Jest not configured (per architecture, to be added later).

### Change Log

- 2026-02-11: Code review fixes applied — .gitignore (.env), accessibility (tabs + header), File List, verify script build check. Status → done.

### File List

- app/_layout.tsx (added)
- app/(tabs)/_layout.tsx (added, updated for Home/Groups/Messages/Profile)
- app/(tabs)/index.tsx (added, updated title to Home)
- app/(tabs)/groups.tsx (added)
- app/(tabs)/messages.tsx (added)
- app/(tabs)/profile.tsx (added)
- app/(tabs)/two.tsx (removed)
- app/+html.tsx (added)
- app/+not-found.tsx (added)
- app/modal.tsx (added)
- assets/ (added)
- components/ (added; primitives/, patterns/ subdirs added)
- constants/Colors.ts (added)
- package.json (added, name p28-v2, test/verify scripts)
- app.json (added)
- tsconfig.json (added)
- .gitignore (added)
- package-lock.json (added)
- scripts/verify-story-1-1.cjs (added)
- tsconfig.json (updated: jsx "react-jsx" for TSX)
- components/ExternalLink.tsx (updated: removed unused @ts-expect-error)
- .gitignore (updated: .env, .expo-export-web; code review)
- app/(tabs)/_layout.tsx (updated: accessibility labels; code review)
