# Story 1.7: App language (i18n)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to choose my preferred app language (English, Korean, or Khmer),
so that the UI and content are in a language I understand.

## Acceptance Criteria

1. **Given** Epic 1.2 is complete,
   **When** I implement i18n (e.g. `lib/i18n.ts`) and language selector and ensure UI and content use the selected locale,
   **Then** the user can choose EN, KR, or KH and see the app in that language; content is stored/displayed in the chosen language where available,
   **And** FR10 and FR36 are satisfied; supported languages work with system accessibility (NFR-A2).

## Tasks / Subtasks

- [x] Implement i18n core and translation resources (AC: #1)
  - [x] Add `lib/i18n.ts` (or i18n module) with EN, KO (Korean), KM (Khmer) string resources; expose t(key) and changeLanguage(locale)
  - [x] Use supported locale codes: en, ko, km (match profile.preferredLanguage and NFR-A2)
  - [x] Fallback to 'en' for missing keys or unsupported device locale
- [x] Integrate locale with profile and existing context (AC: #1)
  - [x] Hydrate LocaleContext from profile.preferredLanguage on load (via api.data.getProfile); persist choice via api.data.updateProfile({ preferredLanguage }) when user changes language
  - [x] Ensure LocaleProvider / useLocale drive i18n locale (single source of truth: profile + context)
- [x] Add language selector UI (AC: #1)
  - [x] Language selector on profile or settings (e.g. "App language" with EN / Korean / Khmer options); 44pt touch targets; accessibilityLabel and accessibilityHint
  - [x] On change: update context, call api.data.updateProfile({ preferredLanguage }), then apply locale to i18n
- [x] Apply translations to UI (AC: #1)
  - [x] Replace hardcoded strings in tab labels, profile, auth, and key screens with t(key); ensure selected locale applies app-wide
- [x] Verify accessibility for supported languages (AC: #1, NFR-A2)
  - [x] Support system font scaling and screen reader for EN/KO/KM; no RTL required for these languages; document any font or layout considerations for Khmer/Korean

## Dev Notes

- **Scope:** Epic 1.2 delivered design tokens and primitives. This story adds app-wide i18n and a language selector; user choice is persisted in profile.preferredLanguage (already in contract and adapter). FR10 (user chooses app language), FR36 (content in chosen language where available), NFR-A2 (languages work with system accessibility).
- **Existing code:** `contexts/LocaleContext.tsx` provides locale state and setLocale; `app/_layout.tsx` wraps with LocaleProvider. Profile contract and adapter already have `preferredLanguage` (camelCase) / `preferred_language` (DB). `app/profile/edit.tsx` and `app/auth/onboarding.tsx` use useLocale/setLocale—wire these to i18n and profile persistence.
- **Do not:** Add backend SDK or adapter imports in app/components. Use api.data for profile read/update. Keep translation resources in lib/ or assets; no new top-level folders.

### Project Structure Notes

- **Target structure (from architecture):**
  - `lib/i18n.ts` — init i18n, resources (EN/KO/KM), t(), changeLanguage; optional expo-localization for device locale detection
  - Translation resources: e.g. `lib/i18n/locales/en.ts`, `ko.ts`, `km.ts` (or JSON) with namespaced keys (tabs, profile, auth, common)
  - `contexts/LocaleContext.tsx` — extend to sync with i18n and profile (load preferredLanguage on mount; setLocale updates context + i18n + api.data.updateProfile)
  - Profile/settings screen — add "App language" selector (e.g. in profile or new app/profile/language.tsx); use design tokens and primitives
  - Replace hardcoded strings in app/(tabs), app/profile, app/auth with t(...)
- **Do not:** Put backend SDK in app/components. Do not duplicate LocaleContext; extend it to drive i18n and persist to profile.

### References

- [Source: _bmad-output/planning-artifacts/epics.md] — Epic 1, Story 1.7; FR10, FR36; NFR-A2
- [Source: _bmad-output/planning-artifacts/architecture.md] — lib/i18n.ts, EN/KR/KH, theme, accessibility; project structure
- [Source: _bmad-output/planning-artifacts/architecture.md] — Implementation sequence item 7: "Add i18n (EN/KR/KH) and accessibility (WCAG 2.1 AA) across core flows"

## Technical Requirements (guardrails)

- **Single source of truth for locale:** Profile.preferredLanguage (persisted) + LocaleContext (runtime). On app load: getProfile → set context + i18n locale. On user change: setLocale → update context, i18n.changeLanguage(locale), api.data.updateProfile({ preferredLanguage: locale }).
- **Locale codes:** Use 'en', 'ko', 'km' consistently (ISO 639-1). Map "KR" in UI labels to 'ko' in code if needed.
- **Contract/facade:** Profile already has preferredLanguage; use api.data.getProfile and api.data.updateProfile only. No direct Supabase or adapter in app.
- **Accessibility:** accessibilityLabel and accessibilityHint on language selector; support system text scaling and screen reader (NFR-A2). No RTL required for EN/KO/KM.

## Architecture Compliance

- **Backend boundary:** Only profile read/update via api.data. No new backend tables; preferredLanguage already in profiles. No backend SDK in app or components.
- **Project structure:** i18n in lib/; locale context in contexts/; language selector in app/profile (or settings). Routes and components use t() and useLocale; no adapter imports.
- **Naming:** Locale codes lowercase (en, ko, km); translation keys camelCase or namespaced (e.g. tabs.home, profile.edit).

## Library / Framework Requirements

- **i18n:** Use expo-localization for device locale detection (optional); use i18next + react-i18next, or i18n-js, or minimal custom lib/i18n.ts with resource objects and t(key). Expo docs recommend expo-localization + i18next/react-i18next. Ensure interpolation/escapeValue set correctly for React Native.
- **React Native / Expo:** Use existing design tokens and primitives for language selector. 44pt min touch targets; labels always visible. No new UI library.
- **Persistence:** preferredLanguage stored via existing profile contract/adapter; no new migrations for this story (profiles.preferred_language already exists).

## File Structure Requirements

- **Create:** `lib/i18n.ts` — init, resources (or load from lib/i18n/locales/), t(), changeLanguage(locale)
- **Create (optional):** `lib/i18n/locales/en.ts`, `ko.ts`, `km.ts` (or single file with namespace) — translation keys for tabs, profile, auth, common
- **Modify:** `contexts/LocaleContext.tsx` — sync with i18n and profile: init from profile.preferredLanguage; setLocale updates context, i18n, and api.data.updateProfile
- **Create or extend:** Language selector screen or section — e.g. `app/profile/language.tsx` or section in profile/settings; entry from profile tab
- **Modify:** `app/(tabs)/_layout.tsx` — tab labels via t(); other key screens (profile, auth, notifications) use t() for visible strings
- **Modify:** `app/profile/_layout.tsx` — add language route if new screen
- **Modify:** `app/(tabs)/profile.tsx` — add "App language" or "Language" entry point
- **Do not create:** New API contracts or migrations; use existing profile and preferredLanguage.

## Testing Requirements

- **i18n:** Unit test t() returns correct string for en/ko/km; fallback to 'en' for unknown key or locale.
- **LocaleContext + profile:** When user changes language, verify updateProfile called with preferredLanguage; context and i18n reflect new locale.
- **Screens:** Language selector visible and selects EN/KO/KM; no direct adapter imports. Key screens render translated strings after locale change.
- **Accessibility:** Language selector has accessibilityLabel and accessibilityHint; no regression on existing a11y.

## Previous Story Intelligence (1.6)

- **Profile and settings pattern:** Notification preferences live at `app/profile/notifications.tsx` with entry from profile tab. Add "App language" (or "Language") similarly—either new `app/profile/language.tsx` or a section on profile. Use same patterns: api.data only, design tokens, 44pt touch targets, accessibilityLabel.
- **Facade only:** App never imports adapter or @supabase; use api.data.getProfile and api.data.updateProfile for preferredLanguage.
- **State and feedback:** Use isSubmitting and getUserFacingError for updateProfile; show brief success feedback after language change (e.g. "Language updated" or toast).
- **Profile stack:** `app/profile/_layout.tsx` has stack; add language route if new screen. Follow 1.6 file structure (notifications as reference).

## Git Intelligence Summary

- Recent work: Story 1.6 added notification preferences (contract, migration, adapter, app/profile/notifications.tsx). Same profile stack and facade patterns apply. Profile contract already includes preferredLanguage; adapter and tests use it—no new profile schema work for 1.7.

## Latest Tech Information

- **Expo + i18n:** expo-localization (getLocales()) for device language; i18next + react-i18next common. Use `npx expo install expo-localization`; add "expo-localization" to app.config plugins if using. Set interpolation.escapeValue: false for React Native.
- **Locale codes:** ISO 639-1: en (English), ko (Korean), km (Khmer). UI can show "English", "한국어", "ភាសាខ្មែរ" or "Korean", "Khmer"; store 'en', 'ko', 'km' in profile.
- **Profile update:** api.data.updateProfile(userId, { preferredLanguage: 'ko' }) already supported; ensure ProfileUpdates includes preferredLanguage (already in dto.ts).

## Change Log

- 2026-03-03: Code review fixes — profile edit i18n (t() for all strings), language screen a11y key (profile.appLanguageHint), tab layout and auth screens t(), profile preferredLanguage display as translated label; added app/profile/__tests__/language.test.ts; File List updated.
- 2026-03-03: Story 1.7 implementation complete — i18n core (lib/i18n.ts, en/ko/km locales), LocaleContext integration, language selector screen, translations applied to tabs/profile/auth/notifications; unit tests added.

## Project Context Reference

- Planning artifacts: `_bmad-output/planning-artifacts/architecture.md`, `_bmad-output/planning-artifacts/epics.md`. Architecture specifies lib/i18n.ts and EN/KR/KH; FR10, FR36, NFR-A2. No project-context.md; use epics and architecture as source of truth.

## Story Completion Status

- **Status:** done
- **Completion note:** Implementation complete; code review fixes applied (edit/auth/tab i18n, a11y key, preferredLanguage label, language screen contract test). All AC satisfied.

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Implemented lib/i18n.ts with t(), changeLanguage(locale), getLocale(); fallback to 'en' for unknown key or locale.
- Added lib/i18n/locales/en.ts, ko.ts, km.ts with namespaced keys (tabs, profile, auth, language, common, notifications).
- LocaleContext syncs with i18n: setLocale calls changeLanguage and normalizes locale; root layout hydrates from profile.preferredLanguage.
- Language selector at app/profile/language.tsx: EN/Korean/Khmer options, 44pt touch targets, accessibilityLabel/Hint; on select updates context, i18n, and api.data.updateProfile; success feedback.
- Applied t() to tab labels, profile screen, profile stack titles, auth (sign-out alert), notifications screen; layouts use useLocale() so labels re-render on locale change.
- Unit tests: lib/i18n/__tests__/i18n.test.ts for t() and changeLanguage (en/ko/km, fallback). app/profile/__tests__/language.test.ts verifies updateProfile(preferredLanguage) contract.
- Code review: profile edit and auth screens use t(); language screen a11y uses profile.appLanguageHint; tab app info and profile preferredLanguage label translated; File List includes edit and auth screens.

### File List

- lib/i18n.ts (created)
- lib/i18n/locales/en.ts (created, modified for new keys)
- lib/i18n/locales/ko.ts (created, modified for new keys)
- lib/i18n/locales/km.ts (created, modified for new keys)
- lib/i18n/__tests__/i18n.test.ts (created)
- app/profile/__tests__/language.test.ts (created)
- contexts/LocaleContext.tsx (modified)
- app/profile/language.tsx (created)
- app/profile/edit.tsx (modified)
- app/profile/_layout.tsx (modified)
- app/profile/notifications.tsx (modified)
- app/(tabs)/_layout.tsx (modified)
- app/(tabs)/profile.tsx (modified)
- app/_layout.tsx (modified)
- app/auth/sign-in.tsx (modified)
- app/auth/sign-up.tsx (modified)
- app/auth/onboarding.tsx (modified)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)
- _bmad-output/implementation-artifacts/1-7-app-language-i18n.md (modified)
