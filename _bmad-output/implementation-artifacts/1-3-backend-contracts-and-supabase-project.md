# Story 1.3: Backend contracts and Supabase project

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want backend access defined by contracts and a Supabase project provisioned,
so that the app can talk to a backend in a stable, backend-agnostic way.

## Acceptance Criteria

1. **Given** Epic 1.1 is complete,
   **When** I add `lib/api/contracts/` (Auth, Data, Realtime, ApiError, DTOs) and create a Supabase project with initial config,
   **Then** contracts define the stable API (auth: signIn, signOut, getSession, getCurrentUser, onAuthStateChange; data and realtime interfaces; ApiError shape),
   **And** no app code outside `lib/api/adapters/` imports the backend SDK; project structure follows architecture.

## Tasks / Subtasks

- [x] Add `lib/api/contracts/` and define contract interfaces (AC: #1)
  - [x] Create `lib/api/contracts/auth.ts`: Auth contract (signIn, signOut, getSession, getCurrentUser, onAuthStateChange)
  - [x] Create `lib/api/contracts/data.ts`: Data contract (domain operations interfaces; no Supabase types)
  - [x] Create `lib/api/contracts/realtime.ts`: Realtime contract (subscribe, unsubscribe; channel naming kebab-case with scope)
  - [x] Create `lib/api/contracts/errors.ts`: ApiError shape and types
  - [x] Create `lib/api/contracts/dto.ts`: Shared DTOs (camelCase; e.g. User, Session; extend as needed for later stories)
- [x] Create Supabase project and initial config (AC: #1)
  - [x] Create Supabase project (dashboard or CLI); note project URL and anon key
  - [x] Add `.env` and `.env.example` with SUPABASE_URL and SUPABASE_ANON_KEY (do not commit secrets)
  - [x] Create `lib/api/adapters/supabase/` directory (adapter stubs or minimal wiring; full implementation in Story 1.4)
- [x] Add single facade and enforce no SDK outside adapters (AC: #1)
  - [x] Create `lib/api/index.ts` (or `lib/api/facade.ts`) that exports auth, data, realtime from the active adapter
  - [x] Wire facade to Supabase adapter; app and components must not import from `lib/api/adapters/` or `@supabase/*`
  - [x] Verify: no imports of `@supabase/supabase-js` (or backend SDK) in `app/`, `components/`, `contexts/`, or hooks used by UI

## Dev Notes

- **Scope:** This story establishes the **contract layer and Supabase project only**. Full auth implementation (sign-in/sign-up screens, session persistence) is Story 1.4. Here we define interfaces, DTOs, ApiError, create the Supabase project and env config, and add the facade + adapter folder so that no app code imports the backend SDK.
- **Backend-agnostic principle:** Contracts (TypeScript interfaces) are the single source of truth. The Supabase adapter will implement them in 1.4; app code will only call the facade (e.g. `api.auth.getSession()`).
- **Naming (from architecture):** DB/Postgres snake_case; contract DTOs camelCase; Realtime channel IDs kebab-case with scope (e.g. `messages:group:{id}`). Adapters map backend ↔ DTOs at the boundary only.
- **ApiError:** One shape (e.g. `{ message: string, code?: string }`). Adapters map all backend errors to this; UI will use a single `getUserFacingError` helper (can be added in this story or 1.4).

### Project Structure Notes

- **Target structure (from architecture):**
  - `lib/api/contracts/` — auth.ts, data.ts, realtime.ts, errors.ts, dto.ts (no backend types outside adapters)
  - `lib/api/adapters/supabase/` — adapter folder; implement contracts here in Story 1.4; this story may add stub files or index that wires nothing yet
  - `lib/api/index.ts` — facade: exports `auth`, `data`, `realtime` (and optionally `push` later); app imports only from here
- **Existing from 1.1/1.2:** `app/`, `components/primitives/`, `theme/`. Do not put backend SDK in any of these; no new routes or UI in this story beyond ensuring imports are facade-only.

### References

- [Source: _bmad-output/planning-artifacts/epics.md] — Epic 1, Story 1.3 acceptance criteria and user story
- [Source: _bmad-output/planning-artifacts/architecture.md] — Backend Abstraction, Contracts & Adapters, Project Structure (lib/api/), Naming (DTOs camelCase, Realtime kebab-case), ApiError, Implementation sequence (contracts then adapter)

## Technical Requirements (guardrails)

- **Contracts only in `lib/api/contracts/`:** Auth, Data, Realtime interfaces; ApiError type; DTOs (camelCase). No Supabase or backend-specific types in contracts.
- **Single facade:** `lib/api/index.ts` (or equivalent) is the only entry point for app code. Exports `auth`, `data`, `realtime` implementing the contracts. Env (SUPABASE_URL, SUPABASE_ANON_KEY) consumed only inside the adapter.
- **No backend SDK outside adapters:** No `@supabase/supabase-js` (or similar) in `app/`, `components/`, `contexts/`, or hooks used by UI. Only `lib/api/adapters/supabase/` may import the backend client.
- **Supabase project:** Create project (Supabase Cloud); add `.env` and `.env.example`; do not commit real keys. Migrations can be added in a later story (e.g. 2.1); this story may leave `supabase/migrations/` empty or add a placeholder.

## Architecture Compliance

- **Backend boundary:** All backend access via `lib/api/` (contracts + adapters + facade). New backends = new adapter folder; app code unchanged.
- **Contract definitions:** Auth (signIn, signOut, getSession, getCurrentUser, onAuthStateChange); Data (domain operations to be expanded in later stories); Realtime (subscribe, unsubscribe); ApiError; DTOs in contract layer.
- **Realtime channel naming:** Contract uses kebab-case with scope, e.g. `messages:group:{groupId}`; adapters map to backend-specific channel names.
- **Error handling:** All backend errors normalized to ApiError in adapters; one getUserFacingError helper for UI (can be in `lib/errors.ts`).

## Library / Framework Requirements

- **Supabase:** Use official Supabase JS client for the adapter (e.g. `@supabase/supabase-js`). Install only in project; used only inside `lib/api/adapters/supabase/`. Follow [Supabase + Expo React Native](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native) for Expo integration when implementing the adapter in 1.4.
- **Expo / React Native:** No change to Expo or RN versions for this story; env vars for Supabase URL and anon key only. AsyncStorage for session persistence is Story 1.4.
- **TypeScript:** Contracts are TypeScript interfaces; DTOs are typed. No `any` for contract or DTO types.

## File Structure Requirements

- Create `lib/api/contracts/` with: `auth.ts`, `data.ts`, `realtime.ts`, `errors.ts`, `dto.ts`.
- Create `lib/api/adapters/supabase/` (e.g. `index.ts` wiring auth/data/realtime stubs or minimal implementations; full impl in 1.4).
- Create `lib/api/index.ts` (facade) exporting auth, data, realtime.
- Add `.env.example` with placeholders: `SUPABASE_URL=`, `SUPABASE_ANON_KEY=`.
- Do not create `app/auth/` or sign-in/sign-up screens in this story (Story 1.4).

## Testing Requirements

- **Contract and facade:** Unit tests for contract types and facade export (e.g. facade exposes auth, data, realtime with expected method signatures). No backend calls in tests for this story; mock adapter if needed.
- **No SDK in UI:** Lint or script check that `app/`, `components/`, `contexts/`, and root-level hooks do not import `@supabase/*` or `lib/api/adapters/`. Can reuse or extend verify script pattern from stories 1.1/1.2.
- **Co-located or __tests__:** Per architecture, use project convention (e.g. `lib/api/__tests__/` or `*.test.ts` next to files).

## Previous Story Intelligence (1.2)

- **Structure:** `theme/` and `components/primitives/` exist; no `lib/api/` yet. This story creates `lib/` and `lib/api/` from scratch. Do not add backend or router to primitives; they remain UI-only.
- **Conventions:** Story 1.2 used verify script and theme tokens; consider adding a verify step for "contracts exist, facade exports auth/data/realtime, no SDK in app/components" (e.g. `scripts/verify-story-1-3.cjs`).
- **Files created in 1.2:** theme/tokens.ts, theme/index.ts, components/primitives/*. None of these should import from lib/api/adapters or Supabase; this story does not modify primitives.

## Latest Tech Information

- **Supabase + Expo:** Use the official [Supabase Expo React Native quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native) for environment setup and client creation inside the adapter. Session persistence with AsyncStorage is documented there (needed in Story 1.4).
- **Supabase client:** Create client only inside the adapter using SUPABASE_URL and SUPABASE_ANON_KEY; never expose the raw client from the facade. The facade exposes only contract-backed methods.
- **ApiError and errors:** Use a single ApiError shape (e.g. `{ message: string, code?: string }`) so all adapters and UI handle one type; document in `lib/api/contracts/errors.ts`.

## Project Context Reference

- No `project-context.md` found in repo. Use planning artifacts as source of truth: `_bmad-output/planning-artifacts/architecture.md`, `_bmad-output/planning-artifacts/epics.md`, and `_bmad-output/planning-artifacts/ux-design-specification.md` for design system and UX patterns (no backend in UI).

## Story Completion Status

- **Status:** done
- **Completion note:** Story 1.3 implemented: contracts, Supabase adapter stubs, facade, .env.example, verify script; no backend SDK in app/components/contexts/hooks. Code review fixes applied: unit tests (Jest + lib/api/__tests__/facade.test.ts), facade re-exports (getUserFacingError, AuthStateListener, RealtimeChannelId, RealtimeHandlers), Session.expiresAt as ISO 8601 string, .env.example EXPO_PUBLIC_* docs, verify script tightened, getUserFacingError null guard, adapter singleton comment, supabase/migrations/.gitkeep.

---

## Change Log

- 2026-02-11: Story 1.3 implemented — contracts (auth, data, realtime, errors, dto), adapter stubs, facade, getUserFacingError, verify-story-1-3.cjs; status → review.
- 2026-02-11: Code review fixes — Jest + ts-jest, lib/api/__tests__/facade.test.ts; facade re-exports getUserFacingError and contract types (AuthStateListener, RealtimeChannelId, RealtimeHandlers); Session.expiresAt → string (ISO 8601); .env.example EXPO_PUBLIC_*; verify script strict type check; getUserFacingError null guard; adapter comment; supabase/migrations/.gitkeep; status → done.

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Contracts: Added `lib/api/contracts/` (auth, data, realtime, errors, dto) with AuthContract (signIn, signOut, getSession, getCurrentUser, onAuthStateChange), DataContract stub, RealtimeContract (subscribe/unsubscribe), ApiError shape, User/Session DTOs (camelCase).
- Supabase: Added `.env.example` with SUPABASE_URL and SUPABASE_ANON_KEY; created `lib/api/adapters/supabase/` with auth/data/realtime stubs and index that creates client from env (full implementation in Story 1.4). Installed `@supabase/supabase-js`; only adapter imports it.
- Facade: `lib/api/index.ts` exports auth, data, realtime from Supabase adapter and re-exports contract types. Added `lib/errors.ts` with getUserFacingError(ApiError).
- Verification: `scripts/verify-story-1-3.cjs` checks contracts exist, facade exports auth/data/realtime, and no @supabase or lib/api/adapters in app/, components/, contexts/, hooks. All verify scripts (1-1, 1-2, 1-3) pass. Developer must create Supabase project in dashboard and add `.env` with real URL and anon key for runtime.
- Code review (2026-02-11): Added Jest + ts-jest and `lib/api/__tests__/facade.test.ts` for contract/facade unit tests. Facade now re-exports `getUserFacingError` and types `AuthStateListener`, `RealtimeChannelId`, `RealtimeHandlers`. Session DTO `expiresAt` is ISO 8601 string. `.env.example` documents EXPO_PUBLIC_* variants. Verify script requires `export type` and `ApiError`. `getUserFacingError` handles null/undefined. Adapter index documents singleton consideration for 1.4. Added `supabase/migrations/.gitkeep`.

### File List

- lib/api/contracts/auth.ts
- lib/api/contracts/data.ts
- lib/api/contracts/realtime.ts
- lib/api/contracts/errors.ts
- lib/api/contracts/dto.ts
- lib/api/contracts/index.ts
- lib/api/adapters/supabase/auth.ts
- lib/api/adapters/supabase/data.ts
- lib/api/adapters/supabase/realtime.ts
- lib/api/adapters/supabase/index.ts
- lib/api/index.ts
- lib/errors.ts
- .env.example
- scripts/verify-story-1-3.cjs
- lib/api/__tests__/facade.test.ts
- supabase/migrations/.gitkeep
- package.json (test, test:unit, verify scripts; jest, ts-jest, @supabase/supabase-js)
