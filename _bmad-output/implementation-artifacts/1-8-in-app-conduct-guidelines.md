# Story 1.8: In-app conduct guidelines

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see clear expectations for conduct (e.g. guidelines or code of conduct),
so that I know how to participate respectfully.

## Acceptance Criteria

1. **Given** Epic 1.4 is complete,
   **When** I add a way to display in-app conduct guidelines or code of conduct (e.g. in settings or onboarding),
   **Then** the user can view expectations for conduct in the product,
   **And** FR35 is satisfied.

## Tasks / Subtasks

- [x] Add conduct guidelines content and i18n (AC: #1)
  - [x] Define conduct guidelines copy (short, clear expectations) in EN/KO/KM via lib/i18n locales or static content
  - [x] Ensure content is appropriate for spiritual/community context (respect, safety, no harassment)
- [x] Add conduct guidelines screen (AC: #1)
  - [x] Create `app/profile/conduct.tsx` (or `app/settings/conduct.tsx`) to display guidelines
  - [x] Use design tokens and primitives; ScrollView for text; 44pt touch targets; accessibilityLabel/accessibilityHint where needed
  - [x] Entry point from profile screen (e.g. "Conduct guidelines" or "Community guidelines" link/button)
- [x] Optional: surface in onboarding (AC: #1)
  - [x] If onboarding flow exists, consider link or short summary to guidelines; not blocking for MVP

## Dev Notes

- **Scope:** Epic 1.4 delivered auth; Epic 1.5–1.7 delivered profile, notification preferences, and i18n. This story adds a **read-only** view of in-app conduct expectations so users know how to participate (FR35). No backend or new data contract—content is static (i18n strings or markdown-like content). PRD: "Expectations for conduct in groups and DMs should be clear (e.g. in-app guidelines or code of conduct). MVP can rely on org/ministry norms."
- **Content ownership:** MVP uses in-app static copy (no CMS). Future growth may add org-specific guidelines or reporting/moderation; out of scope here.
- **Existing code:** Profile tab at `app/(tabs)/profile.tsx`; profile stack has edit, notifications, language. Add conduct screen to profile stack and an entry from profile (same pattern as Notification preferences, App language). Reuse design tokens, primitives, and t() for i18n.

### Project Structure Notes

- **Target structure (from architecture):**
  - `app/profile/conduct.tsx` — conduct guidelines screen (read-only; ScrollView + typography from theme)
  - `lib/i18n/locales/` — add conduct-related keys (e.g. conduct.title, conduct.intro, conduct.bullets) for en/ko/km
  - `app/profile/_layout.tsx` — add Stack.Screen for "conduct" with title from t()
  - `app/(tabs)/profile.tsx` — add entry (e.g. "Conduct guidelines" or "Community guidelines" row/button)
- **Do not:** Add backend SDK, new API contract, or migrations. No new top-level folders. Content is static/i18n only.

### References

- [Source: _bmad-output/planning-artifacts/epics.md] — Epic 1, Story 1.8; FR35
- [Source: _bmad-output/planning-artifacts/prd.md] — Content & Conduct: in-app guidelines or code of conduct; MVP can rely on org/ministry norms
- [Source: _bmad-output/planning-artifacts/architecture.md] — app/ routes, theme tokens, no backend in app
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Trust → conduct expectations; labels visible; 44pt touch targets

## Technical Requirements (guardrails)

- **No new backend:** Conduct guidelines are static content (i18n or bundled text). Do not add data contract methods, migrations, or Supabase tables for this story.
- **Facade only:** If we ever fetch guidelines from backend later, that would be a separate story; this story is display-only using existing lib/i18n and theme.
- **Screen uses only app patterns:** No `@supabase/*` or `lib/api/adapters/` in this screen. Use t() for all user-visible strings; support EN/KO/KM per existing i18n.

## Architecture Compliance

- **Backend boundary:** No backend access required. App only displays static/i18n content. No new contracts or adapters.
- **Project structure:** New route under `app/profile/conduct.tsx`; i18n keys in existing `lib/i18n/locales/`. Aligns with profile stack (edit, notifications, language).
- **Naming:** Translation keys e.g. conduct.title, conduct.intro, conduct.section1; file conduct.tsx.

## Library / Framework Requirements

- **React Native / Expo:** Use existing design tokens, typography, and primitives (Card, spacing). ScrollView for long content. No new UI library.
- **i18n:** Use existing lib/i18n and t() for conduct copy in en/ko/km. Add keys to lib/i18n/locales/en.ts, ko.ts, km.ts.

## File Structure Requirements

- **Create:** `app/profile/conduct.tsx` — screen that renders conduct guidelines from t() keys
- **Modify:** `lib/i18n/locales/en.ts`, `ko.ts`, `km.ts` — add conduct.* keys (title, intro, sections/bullets)
- **Modify:** `app/profile/_layout.tsx` — add Stack.Screen for conduct with title t('conduct.title')
- **Modify:** `app/(tabs)/profile.tsx` — add entry to conduct guidelines (e.g. row or button "Conduct guidelines")
- **Do not create:** New API contracts, migrations, or adapter code. No new top-level directories.

## Testing Requirements

- **Screen:** Conduct guidelines screen loads and displays translated content; no direct Supabase/adapter imports. Changing language updates content (useLocale/t()).
- **Accessibility:** Screen has accessibilityLabel for main content; links/buttons have accessibilityHint. Scrollable content is accessible.
- **i18n:** All conduct strings come from t(); no hardcoded English-only copy for user-facing text.

## Previous Story Intelligence (1.7)

- **Profile stack pattern:** 1.7 added `app/profile/language.tsx` and entry from profile. Same pattern: add `app/profile/conduct.tsx`, add Stack.Screen in `app/profile/_layout.tsx` with title from t(), add profile entry (e.g. "Conduct guidelines" or "Community guidelines").
- **i18n:** All visible strings use t(). Add namespace e.g. conduct.title, conduct.intro, conduct.bullet1, etc. in en/ko/km.
- **Design:** Use theme tokens, Card or equivalent, ScrollView for long text. 44pt min touch target for any interactive element. accessibilityLabel and accessibilityHint on interactive elements.
- **No backend:** Like language selector screen, this screen does not call api.data for conduct content—content is static/i18n only.

## Git Intelligence Summary

- Recent commits: expo-image and docs; style fixes for tab and profile; initial sign-in, sign-up, profile. Profile stack already has edit, notifications, language. Add conduct screen following same layout and navigation pattern. No new dependencies required for static content screen.

## Latest Tech Information

- **Static content in React Native:** Use ScrollView + Text with theme typography. For longer formatted content, consider multiple Text blocks or a simple markdown-like renderer if needed; for MVP, plain Text with i18n is sufficient.
- **Accessibility:** Use accessibilityLabel on the screen or main content container; if there are multiple sections, ensure heading-like structure (e.g. accessible role or labels) so screen readers can navigate.

## Change Log

- 2026-03-03: Code review fixes — useLocale(), accessibilityRole="header" on section titles, i18n tests for conduct keys, profile notificationPreferencesHint and profilePhoto i18n.
- 2026-03-03: Story 1.8 implementation complete — conduct guidelines screen, i18n (EN/KO/KM), profile entry, onboarding hint, contract tests; status → review.

## Project Context Reference

- No `project-context.md` in repo. Use planning artifacts: `_bmad-output/planning-artifacts/architecture.md`, `_bmad-output/planning-artifacts/epics.md`, `_bmad-output/planning-artifacts/ux-design-specification.md`, `_bmad-output/planning-artifacts/prd.md` for FR35, conduct expectations, and Trust/conduct design implications.

## Story Completion Status

- **Status:** done
- **Completion note:** Implementation complete; code review fixes applied (useLocale, a11y headers, i18n tests, profile a11y i18n).

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Code review fixes: useLocale() in ConductScreen; accessibilityRole="header" on section titles; ScrollView accessibilityLabel/Hint; i18n tests for conduct.title/intro in en/ko/km; profile.notificationPreferencesHint and profile.profilePhoto for i18n.
- Conduct guidelines content added to lib/i18n/locales (en.ts, ko.ts, km.ts): conduct.title, intro, respect/safety/privacy/boundaries sections, openHint, onboardingHint, profile.notificationPreferencesHint.
- app/profile/conduct.tsx: read-only screen with ScrollView, theme tokens, accessible card (accessibilityLabel, accessibilityHint).
- app/profile/_layout.tsx: Stack.Screen for conduct with title from t('conduct.title').
- app/(tabs)/profile.tsx: "Conduct guidelines" button with accessibilityHint.
- app/auth/onboarding.tsx: conduct.onboardingHint text so new users see reminder to read guidelines in Profile.
- app/profile/__tests__/conduct.test.ts: contract tests for conduct i18n keys and no Supabase/adapter imports.

### File List

- lib/i18n/locales/en.ts (modified)
- lib/i18n/locales/ko.ts (modified)
- lib/i18n/locales/km.ts (modified)
- app/profile/conduct.tsx (created)
- app/profile/_layout.tsx (modified)
- app/(tabs)/profile.tsx (modified)
- app/auth/onboarding.tsx (modified)
- app/profile/__tests__/conduct.test.ts (created)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)
- _bmad-output/implementation-artifacts/1-8-in-app-conduct-guidelines.md (modified)
