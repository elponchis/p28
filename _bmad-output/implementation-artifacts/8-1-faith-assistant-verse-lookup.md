# Story 8.1: Faith Assistant entry point and verse lookup by address

Status: backlog

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Story

As a user,
I want to look up a Bible verse by its address (e.g., John 3:16, Romans 8:28-39),
so that I can read specific passages quickly.

## Acceptance Criteria

1. **Given** the user is in the app,
   **When** they navigate to the Faith Assistant (e.g., from Home tab, Profile, or a dedicated tab),
   **Then** they see a screen with two modes: "Look up a verse" and "Find verses by topic",
   **And** the layout follows the design system (tokens, primitives).

2. **Given** the user selects "Look up a verse",
   **When** they enter a verse address (e.g., John 3:16, Psalm 23, Romans 8:28-39),
   **Then** the app fetches and displays the verse(s) text,
   **And** the reference is shown clearly (book, chapter, verse).

3. **Given** the user enters an invalid or malformed address,
   **When** the lookup is attempted,
   **Then** the app shows a user-friendly error (e.g., "Couldn't find that verse. Try a format like John 3:16."),
   **And** errors use `getUserFacingError()` per project context.

4. **Given** verse text is displayed,
   **When** the user wishes to copy or share,
   **Then** copy/share actions are available where specified by UX.

5. **Given** the Faith Assistant screen,
   **When** the user views it,
   **Then** interactive elements have `accessibilityLabel` and `accessibilityHint` per coding standards,
   **And** loading states use `isLoading` per conventions.

## Tasks / Subtasks

- [ ] Task 1 (AC: #1) — Faith Assistant entry point and layout
  - [ ] Add route `app/faith-assistant/index.tsx` (stack route, not tab)
  - [ ] Add navigation entry: Profile screen link/card OR Home link per UX; use `router.push('/faith-assistant')`
  - [ ] Build layout with two mode cards: "Look up a verse" and "Find verses by topic" (latter is placeholder for Story 8.2)
  - [ ] Use `@/theme/tokens`, `@/components/primitives` (Card, Button, Input); no magic numbers
- [ ] Task 2 (AC: #2, #3) — Verse lookup by address
  - [ ] Add `lib/bible/` module: contract + API.Bible adapter (see Technical Requirements)
  - [ ] Implement verse reference parser: "John 3:16", "Romans 8:28-39", "Psalm 23" → API.Bible verse IDs
  - [ ] Add env: `EXPO_PUBLIC_BIBLE_API_KEY` (or similar); document in `.env.example`
  - [ ] Display verse(s) with clear reference; show user-friendly error on invalid address via `getUserFacingError()`
- [ ] Task 3 (AC: #4) — Copy/share
  - [ ] Add copy action (expo-clipboard or Share API); add share action if UX specifies
- [ ] Task 4 (AC: #5) — Accessibility and loading
  - [ ] Set `accessibilityLabel` and `accessibilityHint` on all interactive elements
  - [ ] Use `isLoading` for fetch; use `isSubmitting` or similar for mutations

## Dev Notes

### Technical Requirements

**Bible API — API.Bible (api.scripture.api.bible)**

- **Source:** Use [API.Bible](https://scripture.api.bible/) for verse text. Free for non-commercial use.
- **Auth:** API key required. Header: `api-key: <key>`. Store in env (e.g. `EXPO_PUBLIC_BIBLE_API_KEY`). Create account at https://scripture.api.bible/signup.
- **Verse lookup endpoint:**
  ```
  GET https://api.scripture.api.bible/v1/bibles/{bibleVersionID}/verses/{bibleVerseID}
  ```
- **Verse ID format (OSIS-style):** `JHN.3.16`, `ROM.8.28-39`, `PSA.23.1` (Psalm 23:1). For whole chapters, use range (e.g. `PSA.23.1-6` or full chapter).
- **Default Bible version:** Use one version at MVP (e.g. `61fd76eafa1577c4-01` for NIV — verify current IDs at API.Bible).
- **Usage limits:** Max 500 consecutive verses per request; must include copyright with displayed content.

**Contract / adapter pattern for Bible service**

- Add `lib/bible/contract.ts`: interface `BibleContract` with `lookupVerse(reference: string): Promise<VerseResult | ApiError>`.
- Add `lib/bible/api-bible-adapter.ts`: implementation using `fetch()`; map HTTP errors to `ApiError`.
- Define `VerseResult` in `lib/bible/contract.ts`: `{ reference: string; text: string; copyright?: string }`.
- App and screens import from `lib/bible/` facade (not raw fetch). Keeps Bible source swappable.

**Verse reference parsing**

- Accept: "John 3:16", "Romans 8:28-39", "Psalm 23", "Psalm 23:1-6", "1 John 1:9".
- Map book names to OSIS abbreviations (e.g. John→JHN, Romans→ROM, Psalm/Psalms→PSA).
- Use a small lookup table for common books; handle "1 John", "2 Timothy", etc.
- Validate and return user-friendly error if unparseable.

### Architecture Compliance

- **No backend SDK in UI:** Bible API is an external HTTP service. Use `lib/bible/` as a dedicated module (similar spirit to contracts; not in `lib/api` since it's not Supabase).
- **Design system:** All styles from `@/theme/tokens` (colors, spacing, typography, radius). Use `StyleSheet.create`. No magic numbers.
- **Components:** Use `components/primitives` (Button, Input, Card). Add `VerseDisplayCard` in `components/patterns` if needed.
- **i18n:** All UI strings via `t()` from `@/lib/i18n`. Add keys for Faith Assistant (e.g. `faithAssistant.*`).
- **Error display:** Use `getUserFacingError(error)` from `@/lib/api`; never expose raw API errors.

### Library / Framework Requirements

- **HTTP:** Use native `fetch` in the Bible adapter (no extra deps for MVP).
- **Clipboard:** `expo-clipboard` for copy; `expo-sharing` or React Native `Share` for share (if needed).
- **Env:** `EXPO_PUBLIC_*` vars for client-visible config (API key). Document in `.env.example`.

### File Structure Requirements

```
lib/
  bible/
    contract.ts          # BibleContract, VerseResult, types
    api-bible-adapter.ts # API.Bible implementation
    verse-parser.ts      # reference string → OSIS verse ID
    index.ts             # exports
app/
  faith-assistant/
    index.tsx            # Faith Assistant screen (two modes)
```

- Add navigation link from Profile (or Home) in `app/(tabs)/profile.tsx` or `app/(tabs)/index.tsx` (per UX choice).
- Stack route: ensure `app/_layout.tsx` or group layout includes `faith-assistant` in stack.

### Testing Requirements

- **Unit tests:** `lib/bible/__tests__/verse-parser.test.ts` — parse "John 3:16", "Romans 8:28-39", invalid input.
- **Adapter tests:** `lib/bible/__tests__/api-bible-adapter.test.ts` — mock `fetch`; test success and error mapping to ApiError.
- **Screen tests:** Optional — `app/faith-assistant/__tests__/faith-assistant.test.tsx` for basic render and a11y.
- Use `@/` path alias. Jest `moduleNameMapper` already maps it.

### Project Context Reference

- [Source: _bmad-output/project-context.md] — Tech stack: React Native, Expo, TypeScript, `@/theme/tokens`, `getUserFacingError`, `accessibilityLabel`/`accessibilityHint`, `isLoading` convention, `t()` for i18n.
- [Source: _bmad-output/planning-artifacts/architecture.md] — Backend facade, no SDK in UI, contract/adapter pattern, design tokens, `lib/api` for app data. Bible is external; use dedicated `lib/bible/` module.
- [Source: design.json] — Consult for visual hierarchy, spacing, and component intent when building Faith Assistant UI.

### References

- API.Bible docs: https://docs.api.bible/
- Verse lookup: https://docs.api.bible/tutorials/getting-a-specific-verse/
- OSIS book abbreviations: https://wiki.crosswire.org/OSIS_Book_Names

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
