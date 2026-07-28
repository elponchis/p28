# Story 8.2: Find related verses given a prompt (LLM-powered)

Status: backlog

## Story

As a user,
I want to describe what I need (e.g., "verses about hope when life is hard") in natural language,
so that I can discover relevant Bible passages.

## Acceptance Criteria

1. **Given** the user is on the Faith Assistant screen,
   **When** they select "Find verses by topic",
   **Then** they see an input field (with placeholder like "e.g., verses about hope in hard times"),
   **And** they can submit their prompt.

2. **Given** the user submits a prompt (e.g., "verses about forgiving someone who hurt you"),
   **When** the request is processed,
   **Then** the app calls an **LLM** (or LLM-backed API) to identify relevant verses,
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

## Technical Notes

- **LLM usage:** Explicit requirement. Use an LLM (e.g., OpenAI, Anthropic, or Supabase Edge Function with an LLM provider) to interpret the user's prompt and return relevant Bible references.
- Ensure LLM prompts are designed for faithfulness and accuracy (only return real Bible verses, avoid hallucinated references).
- Consider using a Bible API or bundled text to validate and fetch full verse text for references returned by the LLM.
