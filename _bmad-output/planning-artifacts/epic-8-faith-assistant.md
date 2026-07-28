# Epic 8: Faith Assistant (AI-powered Bible verse lookup and discovery)

**Technology note:** This epic uses **LLMs (Large Language Models)** for verse discovery and related-verse suggestions. Verse lookup by address may use a Bible API or bundled text; verse discovery from natural-language prompts is LLM-powered.

---

## Overview

Users can look up Bible verses by address (e.g., John 3:16, Romans 8:28-39) and find related verses by describing what they need in natural language (e.g., "verses about hope when life is hard"). The Faith Assistant provides a single entry point with two modes: **Look up a verse** and **Find verses by topic**.

**Out of scope for this epic:** Sermon discovery, sermon summaries, or integration with YouTube playlists. Those may be added in a future epic when sermon metadata (e.g., transcripts, topic tags) is available.

---

## Story 8.1: Faith Assistant entry point and verse lookup by address

As a user,
I want to look up a Bible verse by its address (e.g., John 3:16, Romans 8:28-39),
so that I can read specific passages quickly.

### Acceptance Criteria

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

### Technical Notes

- Bible text source: use a public Bible API (e.g., api.scripture.api.bible, bible-api.com) or bundled text. Define a contract/adapter pattern if needed to keep backend-agnostic design.
- Bible version: one default (e.g., NIV, ESV) at MVP; version selector can be a future enhancement.
- Verse reference parsing: handle common formats (Book Chapter:Verse, Book Chapter:VerseStart-VerseEnd, Psalm 23 for whole chapter).

---

## Story 8.2: Find related verses given a prompt (LLM-powered)

As a user,
I want to describe what I need (e.g., "verses about hope when life is hard") in natural language,
so that I can discover relevant Bible passages.

### Acceptance Criteria

1. **Given** the user is on the Faith Assistant screen,
   **When** they select "Find verses by topic",
   **Then** they see an input field (with placeholder like "e.g., verses about hope in hard times"),
   **And** they can submit their prompt.

2. **Given** the user submits a prompt (e.g., "verses about forgiving someone who hurt you"),
   **When** the request is processed,
   **Then** the app calls an LLM (or LLM-backed API) to identify relevant verses,
   **And** displays a list of matching verses with reference and text,
   **And** loading state is shown during the request (`isLoading`).

3. **Given** the LLM returns results,
   **When** results are displayed,
   **Then** each verse shows reference (book, chapter, verse) and text,
   **And** the user can tap a verse to view full context or copy/share per Story 8.1.

4. **Given** the prompt is ambiguous, off-topic, or returns no results,
   **When** the app cannot produce useful results,
   **Then** the app shows a user-friendly message (e.g., "Couldn't find verses for that. Try a different prompt."),
   **And** does not expose raw LLM or API errors to the user.

5. **Given** the Faith Assistant uses an LLM,
   **When** the feature is implemented,
   **Then** API keys and secrets are not hardcoded (use env/config),
   **And** the LLM call is performed via a backend/Edge Function or approved client-side SDK per architecture.

6. **Given** the Find verses flow,
   **When** the user interacts with it,
   **Then** interactive elements have `accessibilityLabel` and `accessibilityHint`,
   **And** rate limiting or UX guidance may be added to avoid excessive LLM usage.

### Technical Notes

- **LLM usage:** Explicit requirement. Use an LLM (e.g., OpenAI, Anthropic, or Supabase Edge Function with an LLM provider) to interpret the user's prompt and return relevant Bible references. The LLM should reason about Scripture and return verse references with text.
- Ensure LLM prompts are designed for faithfulness and accuracy (e.g., instruct the model to only return real Bible verses, avoid hallucinated references).
- Consider using a Bible API or bundled text to validate and fetch full verse text for references returned by the LLM.

---

## Dependencies

- Epic 1 (App foundation) must be complete.
- No dependency on Epic 2–7 for core verse lookup or discovery.
- **Epic 8 can be done in parallel with any other epic** (Epic 2, 4, 5, 6, or 7).
- Optional: Future integration with daily moment (Epic 4) could surface a verse-of-the-day or related prompt.

---

## Epic Retrospective

Optional after all stories are done.
