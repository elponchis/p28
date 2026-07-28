---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-p28-v2-2026-02-11.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/ux-design-directions.html
workflowType: 'architecture'
project_name: 'p28-v2'
user_name: 'Billy'
date: '2026-02-11'
lastStep: 8
status: 'complete'
completedAt: '2026-02-11'
---

> **As-built (2026-03-24):** Implementation details (simplified group model, Storage attachment pipelines, Edge Functions for push, 65+ migrations) extend beyond this frozen document. See `docs/as-built-snapshot.md` and `_bmad-output/planning-artifacts/as-built-delta-2026-03-24.md`.

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
Thirty-six FRs define the capability contract. Architecturally they imply: (1) a hierarchical data model (org → ministry → group) with CRUD and membership; (2) user identity, profiles, and guest/explorer mode with notification preferences; (3) discovery and onboarding (join org/ministry/group, leave); (4) push notifications with targeting by ministry/group and user preferences; (5) messaging (1:1, group/forum, small-group) with recent/relevant previews; (6) content and broadcasts (home/feed, events, announcements, RSVP) with audience targeting; (7) leader management (create/manage groups, post/target, basic engagement visibility); (8) admin (org structure, invite/assign leads, oversight); (9) trust/privacy (visibility control, conduct expectations, multi-language content). These drive backend entities, APIs, and client feature boundaries.

**Non-Functional Requirements:**
- **Performance:** Core actions < 3s (NFR-P1); push delivery < 1 min (NFR-P2); messaging real-time or near-real-time (NFR-P3).
- **Security:** Encrypt in transit and at rest (NFR-S1); access scoped by role and org/ministry/group (NFR-S2); auth/session best practices (NFR-S3).
- **Reliability:** 99% uptime target (NFR-R1); no unplanned data loss; backups and recovery (NFR-R2).
- **Accessibility:** WCAG 2.1 AA for core flows (NFR-A1); correct display and navigation for EN/KR/KH with system a11y (NFR-A2).
- **Scalability:** Multiple orgs and hundreds of concurrent users per org at MVP (NFR-SC1); design to scale ~10x without full redesign (NFR-SC2).

**Scale & Complexity:**
- Primary domain: Full-stack mobile (React Native/Expo client, backend API, push, real-time messaging).
- Complexity level: Medium (greenfield, mobile-first, multi-tenant hierarchy, real-time messaging, push, multi-language).
- Estimated architectural components: Client app (single codebase); backend via Supabase (Postgres, Auth, Realtime); push pipeline (Expo/FCM/APNs, integrated with Supabase); storage and backup.

### Technical Constraints & Dependencies

- **Backend (MVP):** Use **Supabase** for the backend. Supabase provides Postgres, Auth, Realtime, Storage, and Edge Functions—covering data, API surface, real-time messaging patterns, and auth; push can be implemented via Edge Functions or a small companion service integrating with Expo/FCM/APNs.
- **Stack:** React Native + Expo client; Supabase backend (Postgres, Auth, Realtime, and optionally Storage/Edge Functions); iOS and Android; single codebase; EAS for build/deploy; web out of scope for MVP but architecture should not block a future web client.
- **Push:** Required on both platforms; Expo push APIs (FCM/APNs); user notification preferences must be respected; delivery pipeline to be designed with Supabase (e.g. Edge Functions or background worker triggering push).
- **Offline:** Not required for MVP; all flows assume connectivity.
- **Device:** No camera, microphone, or location in MVP; only notification permission beyond baseline.
- **Multi-language:** English, Korean, Khmer for UI and content; user-selectable; affects storage, API, and client i18n.
- **Store:** Standard App Store and Google Play policies; revisit if adding payments, age gates, or sensitive data.

### Cross-Cutting Concerns Identified

- **Authentication and identity:** Sign-in, sessions, guest vs member; scoping by org/ministry/group (Supabase Auth + RLS).
- **Backend-as-a-Service (Supabase):** Schema design (org/ministry/group, RLS), Auth integration with Expo, Realtime for messaging and live updates; account for Supabase limits (e.g. connection scaling, Realtime channels) in architecture.
- **Push notifications:** Registration, targeting by audience, preferences, delivery latency; integration with Supabase (Edge Functions or worker).
- **Real-time messaging:** Delivery latency and consistency via Supabase Realtime; scaling for 1:1 and group conversations.
- **Role- and context-based access:** Member, guest, ministry lead, admin; data visibility and actions by org/ministry/group (RLS policies).
- **Internationalization (i18n):** EN/KR/KH for UI and content; layout and accessibility across languages.
- **Accessibility:** WCAG 2.1 AA, touch targets, screen readers, font scaling across flows.
- **API design:** Mobile-friendly (payload size, round-trips); Supabase client/PostgREST and Realtime subscriptions.

## Starter Template Evaluation

### Primary Technology Domain

**Mobile app (React Native + Expo)** with **Supabase** backend, based on project context and PRD.

### Starter Options Considered

- **Official Expo (`create-expo-app@latest`):** Default and tabs templates include Expo Router and TypeScript; no bundled UI library. Fits custom design system; Supabase integrated separately.
- **Expo + Supabase templates (e.g. NativeLaunch, expo-supabase-starter-pro):** Pre-configured Supabase, auth, and sometimes push/analytics. Most bundle NativeWind/Reusables, which conflicts with the UX spec's custom design system and token-first approach.

### Selected Starter: create-expo-app (tabs template)

**Rationale for Selection:**
- Aligns with PRD (React Native + Expo, single codebase, EAS).
- Leaves UI fully under our control for the custom design system and design tokens (no Tailwind/Reusables to remove).
- Tabs template provides file-based routing and a tab layout that maps directly to the app's bottom nav (Home, Groups, Messages, Profile).
- Supabase is added explicitly via the official Supabase + Expo React Native guide, keeping schema, RLS, and Realtime under our control and consistent with the Project Context.

**Initialization Command:**

```bash
npx create-expo-app@latest --template tabs
```

(When prompted, enter the app name, e.g. `p28-v2`. Use TypeScript. Add Supabase after creation per [Supabase + Expo React Native](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native).)

**Architectural Decisions Provided by Starter:**

**Language & Runtime:** TypeScript; React Native with Expo runtime.

**Styling Solution:** None bundled—we implement the custom design system (tokens, primitives, components) per UX specification.

**Build Tooling:** Metro; EAS Build for production iOS/Android.

**Testing Framework:** Not included by default; to be added (e.g. Jest + React Native Testing Library).

**Code Organization:** File-based routing via Expo Router (e.g. `app/(tabs)/` for tab screens); standard Expo project layout.

**Development Experience:** `npx expo start`; hot reload; TypeScript; Expo Dev Tools.

**Note:** Project initialization using this command should be the first implementation story. Supabase setup (project, env vars, client, auth, Realtime) is the immediate follow-on.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Backend: Supabase (Postgres, Auth, Realtime).
- Client: Expo (tabs template, TypeScript, Expo Router).
- Data access: PostgREST + Realtime; RLS for authorization.
- Auth: Supabase Auth with session persistence (AsyncStorage) and RLS.

**Important Decisions (Shape Architecture):**
- **Backend abstraction:** The app is backend-agnostic. All server-side capabilities (auth, data, realtime) are accessed only through **contracts** (TypeScript interfaces). The current backend (Supabase) is one **adapter** implementing those contracts. Migrating to a custom API means implementing the same contracts in a new adapter; app code does not change.
- State management: Backend facade + TanStack Query for server state (implemented in `hooks/useApiQueries`); React state/context for auth/session and UI state.
- Push: Expo Notifications (FCM/APNs); trigger path from backend (e.g. Supabase Edge Function or custom API webhook) to be designed in implementation.
- Migrations: Backend-specific (e.g. Supabase migrations); run via CLI or CI. Contract types and DTOs are owned by the app and stay stable across backend changes.

**Deferred Decisions (Post-MVP):**
- Dedicated API rate limiting beyond Supabase plan limits.
- Offline support and sync strategy.
- Full monitoring/observability stack (beyond basic error reporting if needed).

### Backend Abstraction (Backend-Agnostic Design)

- **Principle:** The client app must not depend on any specific backend (Supabase, custom REST, GraphQL, etc.). All backend access goes through a **contract layer** and **adapters**.
- **Contracts (interfaces):** Define TypeScript interfaces for: (1) **Auth** — signIn, signOut, getSession, getCurrentUser, onAuthStateChange; (2) **Data** — domain operations (e.g. getOrganizations, getGroupsForMinistry, getMessagesForChannel, createEvent, createAnnouncement) and a consistent error/result type; (3) **Realtime** — subscribe(channel, handlers), unsubscribe(channel). Contracts live in the app repo and define the **stable API** the UI depends on.
- **Adapters:** Each backend has an adapter (e.g. `adapters/supabase`) that implements these contracts. MVP uses a Supabase adapter; a future custom API would have e.g. `adapters/customApi` implementing the same contracts. App code imports only from the facade (e.g. `lib/api` or `lib/backend`) that exposes the current adapter.
- **Data shapes (DTOs):** Request/response shapes (e.g. Organization, Ministry, Group, Message, Event) are part of the contract or shared types. The adapter maps backend-specific responses (e.g. PostgREST snake_case) into these DTOs so the rest of the app sees one consistent shape. This keeps migration to a new backend to “new adapter, same DTOs.”
- **Error handling:** The contract defines a single **ApiError** (or equivalent) shape (e.g. message, code). Adapters map backend errors (Supabase, HTTP, etc.) into that shape. UI and hooks only handle ApiError.

### Data Architecture

- **Database (MVP):** Supabase (PostgreSQL). Schema supports org → ministry → group hierarchy, profiles, membership, messages, events, announcements, and notification preferences. The **adapter** talks to Supabase; the app talks only to the data contract.
- **Data modeling:** Relational; foreign keys and constraints for hierarchy and membership; JSON or columns for i18n where needed (EN/KR/KH).
- **Data validation:** Database/backend constraints; optional client-side validation (e.g. Zod) for forms and payloads at the boundary.
- **Migrations:** Backend-specific (e.g. Supabase migrations SQL); versioned in repo; applied via CLI or CI.
- **Caching:** TanStack Query via `hooks/useApiQueries` on top of the facade; query keys in `lib/api/queryKeys.ts`. No direct backend client in UI code.

### Authentication & Security

- **Authentication (contract):** Auth contract exposes signIn, signOut, getSession, getCurrentUser, onAuthStateChange. **MVP implementation:** Supabase Auth (email/password, optional OAuth, anonymous/guest). A custom API would implement the same contract (e.g. token-based auth).
- **Session:** Persisted per adapter (e.g. Supabase: AsyncStorage, autoRefreshToken, persistSession, AppState listeners). Contract exposes “current session” and “current user”; persistence details are adapter-specific.
- **Authorization:** Enforced by the backend (e.g. Supabase RLS). The data contract only exposes operations the current user is allowed to perform; adapter translates contract calls into backend requests. No role logic in the UI beyond “what to show”; permission errors come back as ApiError.
- **API security:** Credentials and keys are adapter concern (env vars, EAS secrets). Contract has no notion of “anon key”; adapter uses whatever the backend requires (Supabase anon, custom API token, etc.).
- **Encryption:** Handled by the backend (TLS in transit, encryption at rest). Client only uses HTTPS and stores secrets via secure storage (e.g. AsyncStorage for session); no custom crypto in app.

### API & Communication Patterns

- **API surface (contract):** The app’s “API” is the **contract layer** (auth, data, realtime). MVP backend is Supabase (PostgREST + Realtime); a custom API would implement the same contract (REST/GraphQL + WebSockets or equivalent). No UI code calls PostgREST or Supabase client directly.
- **Documentation:** Contract interfaces and DTOs are the source of truth for the client. Backend-specific docs (Supabase schema, RLS, or custom API spec) document the adapter’s implementation only.
- **Error handling:** All backend errors are normalized to the contract’s ApiError shape; one helper (e.g. getUserFacingError) maps ApiError to user-facing messages and retry/offline cues.
- **Rate limiting:** Backend concern; adapter may map 429 or backend-specific errors to ApiError. Application-level rate limiting deferred.
- **Push:** Expo Notifications (FCM/APNs). Device tokens are stored via the data contract (adapter persists to current backend). Delivery is triggered by the backend (Supabase Edge Function or custom API job); exact flow TBD in implementation.

### Frontend Architecture

- **State management:** Backend **facade** (contract + adapter) for server state; **TanStack Query** in `hooks/useApiQueries` wraps the facade for caching, deduplication, and invalidation. Screens use the query/mutation hooks, not raw `api.data.*`. React state and context for auth/session and UI state.
- **Component architecture:** Custom design system per UX spec: design tokens → primitives → feature components; Expo Router for routing and layout.
- **Routing:** Expo Router file-based (tabs + stack); bottom tabs: Home, Groups, Messages, Profile; stacks for flows (e.g. event detail, thread, compose).
- **Performance:** Lazy-load tab screens where helpful; optimize images (Expo Image); avoid unnecessary Realtime subscriptions per screen.
- **Bundle:** Metro; EAS Build for production; no separate bundle optimization beyond Expo defaults for MVP.

### Infrastructure & Deployment

- **Backend hosting:** Supabase Cloud; region chosen for latency and compliance.
- **Client distribution:** EAS Build and EAS Submit for iOS and Android; optional EAS Update for OTA JS updates.
- **CI/CD:** EAS Build (and Submit) triggered from repo; Supabase migrations applied manually or via CI; env and secrets via EAS secrets and Supabase env.
- **Environments:** Separate Supabase projects (or env) for dev/staging/production; `.env` for Supabase URL and anon key in development.
- **Monitoring and logging:** Deferred to post-MVP or minimal (e.g. Expo/Sentry for critical errors); Supabase dashboard for backend metrics.

### Decision Impact Analysis

**Implementation sequence:**
1. Create Expo app (`npx create-expo-app@latest --template tabs`).
2. Define **contracts**: Auth, Data (domain operations + DTOs), Realtime, and ApiError. Add `lib/api/contracts` (or equivalent) and shared types.
3. Implement **Supabase adapter** for auth, data, and realtime; expose a single facade (e.g. `lib/api` or `lib/backend`) that the app uses. Create Supabase project and apply initial migrations.
4. Implement design tokens and core UI primitives; wire tab screens to the **facade only** (no direct Supabase in screens/hooks).
5. Add RLS (or equivalent) on the backend; Realtime for messaging and live updates via the realtime contract.
6. Implement push: token registration, storage via data contract, and trigger path from backend to Expo/FCM/APNs.
7. Add i18n (EN/KR/KH) and accessibility (WCAG 2.1 AA) across core flows.

**Cross-component dependencies:**
- Auth and backend authorization drive what each role can read/write; Realtime and push use the same auth/session from the auth contract.
- Design system and Expo Router underpin all screens. **All backend access goes through the contract/facade** so that swapping Supabase for a custom API only requires a new adapter; app code stays unchanged.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical conflict points addressed:** Naming (database, API, code), project structure, data/response formats, Realtime/events, error and loading patterns—so all agents produce consistent, compatible code.

### Naming Patterns

**Database naming (Supabase/Postgres):**
- Tables: **snake_case**, plural where it reads naturally (e.g. `organizations`, `ministries`, `group_members`, `announcements`).
- Columns: **snake_case** (e.g. `user_id`, `created_at`, `ministry_id`).
- Primary keys: `id` (uuid or bigint). Foreign keys: `{table_singular}_id` (e.g. `organization_id`, `ministry_id`).
- Indexes: `idx_{table}_{columns}` (e.g. `idx_messages_channel_id_created_at`).

**API / backend contract usage:**
- The **contract** (interfaces and DTOs) uses one consistent casing in the app (e.g. **camelCase** for DTOs). Adapters translate to/from backend (e.g. Supabase/PostgREST snake_case) at the boundary only.
- Realtime channel names (in contract): **kebab-case** with scope, e.g. `messages:group:{groupId}`, `presence:org:{orgId}`. Adapters map these to backend-specific channels (e.g. Supabase Realtime channel names).
- Event names in contract: **camelCase** or **snake_case** consistently; pick one (e.g. `message:new`, `typing:start`). Adapters translate if the backend uses different naming.

**Code naming (TypeScript/React):**
- Components: **PascalCase** (e.g. `EventCard`, `GroupRow`, `MinistryNav`). File name matches component: `EventCard.tsx`.
- Hooks and utilities: **camelCase** (e.g. `useAuth`, `useSupabaseClient`, `formatEventDate`).
- Variables and props: **camelCase**. Constants (env, config): **UPPER_SNAKE_CASE** or **camelCase** per team; document in repo.
- Types/interfaces: **PascalCase** (e.g. `Organization`, `MinistryRole`). Suffix with `Type` only if needed to avoid clash (e.g. `MessageType`).

### Structure Patterns

**Project organization:**
- **Routes:** Expo Router owns `app/` (e.g. `app/(tabs)/index.tsx`, `app/(tabs)/groups.tsx`, `app/(tabs)/messages.tsx`, `app/(tabs)/profile.tsx`). Stack routes under `app/` for modals/detail screens.
- **Components:** Under `components/` — either `components/primitives/`, `components/patterns/` (e.g. EventCard, GroupRow), and `components/screens/` for screen-specific pieces, or flat by feature; choose one and document. No components inside `app/` except small route-specific wrappers if needed.
- **Design system:** `theme/` or `design-system/` for tokens (colors, spacing, typography); primitives in `components/primitives/`.
- **State / data:** Single **backend facade** (e.g. `lib/api/index.ts` or `lib/backend.ts`) that exposes auth, data, and realtime via **contracts**. Implementations live under `lib/api/adapters/` (e.g. `adapters/supabase/`). Auth context/hooks in `contexts/` or `hooks/` use the facade only (e.g. `useAuth` → facade.auth). **No direct backend SDK imports** (e.g. no `@supabase/supabase-js`) in app code outside the adapter layer.
- **Utils and helpers:** `lib/` or `utils/` at project root; shared only. Feature-specific helpers live next to the feature.
- **Tests:** Co-located `*.test.ts` / `*.test.tsx` next to the file under test, or a single `__tests__/` per major folder; choose one and document.

**File structure:**
- Config: `app.json` / `app.config.*` for Expo; `.env` (and `.env.example`) for Supabase URL/anon key; do not commit secrets.
- Static assets: `assets/` (images, fonts). Reference via Expo’s asset system.

### Format Patterns

**API / contract response and data:**
- **DTOs** (data transfer objects) used by the app are defined in the contract layer and use one casing project-wide (e.g. **camelCase**). Adapters convert from backend format (e.g. PostgREST snake_case) to DTOs; the rest of the app only sees DTOs. 
- Backend (e.g. PostgREST) may use snake_case; adapters map to DTOs. (e.g. “We use snake_case from Supabase through the app” or “We map to camelCase in `lib/supabase-types.ts`”).
- Dates: **ISO 8601** strings in DTOs and JSON. Display/format in the UI layer only.
- Booleans: **true/false**. No 1/0 for booleans.
- Null/undefined: Use `null` for “no value” from API; use `undefined` only where “not loaded” or “optional” is intentional in TS.

**Error handling:**
- **Contract:** All backend failures are represented as **ApiError** (e.g. `{ message: string, code?: string }`). Adapters map backend-specific errors (Supabase, HTTP, etc.) into ApiError before returning to callers.
- **UI:** One helper (e.g. `getUserFacingError(error: ApiError)`) for user-facing messages and retry. Screens and hooks only handle ApiError; they never handle raw backend errors.
- Do not expose raw backend errors or stack traces to the user. Log full error in dev or server-side only.

### Communication Patterns

**Realtime:**
- **Contract:** subscribe(channelId, handlers), unsubscribe(channelId). Channel IDs follow the naming pattern (e.g. `messages:group:{id}`, `presence:org:{id}`). Event payloads are **plain objects** with known keys (documented in contract types). Adapters translate to backend-specific subscriptions (e.g. Supabase Realtime channels).
- Subscribe in a single place per screen or feature (e.g. one subscription per open group thread); clean up on unmount. App code uses only the realtime contract; no backend-specific channel APIs in UI.

**State updates:**
- **Immutable updates** for React state (no direct mutation). When realtime or a mutation returns new data, set state with the new object/array, or update via a reducer/functional setState.
- Optimistic updates: Allowed if we document the pattern (e.g. “optimistic update then revert on error”); use one shared pattern, not different ones per feature.

### Process Patterns

**Error handling:**
- **User-facing:** One component or pattern for inline errors (e.g. banner or inline message) and one for full-screen error (e.g. “Something went wrong” + retry). Use the same copy/style across flows.
- **Retry:** One pattern (e.g. “Retry” button that re-runs the same query or mutation). Do not invent new retry UX per screen.
- **Logging:** In development, log ApiError or adapter-level errors for debugging. Do not log PII or tokens.

**Loading states:**
- Naming: Use a single convention, e.g. `isLoading` for “fetch in progress” and `isSubmitting` for “mutation in progress”. Avoid mixing `loading`, `isLoading`, `fetching`, `busy` without a single documented choice.
- UI: Per UX spec use skeletons or spinners consistently (e.g. skeleton for lists, spinner for buttons). Document in design system or architecture.
- Do not block the whole app for a single request; use local/screen-level loading only.

### Enforcement Guidelines

**All agents MUST:**
- **Backend access only via contract/facade.** No imports of backend SDKs (e.g. `@supabase/supabase-js`) in `app/`, `components/`, `contexts/`, or hooks used by the UI. Only the adapter layer (e.g. `lib/api/adapters/supabase/`) may use the backend client. Screens and hooks call `api.*`, `auth.*`, or realtime contract methods only.
- Use the single backend facade instance (injected or provided via context); env/config for the backend is consumed only inside the adapter.
- Follow the chosen naming (contract DTOs: one casing, e.g. camelCase; DB/backend: snake_case in adapter; Realtime channel IDs as above).
- Use the single error-mapping helper (ApiError → user message) and loading naming convention.
- Place new components and routes according to the chosen project structure; add to this doc if introducing a new top-level folder.

**Pattern enforcement:**
- This architecture doc is the source of truth. When adding a pattern (e.g. “all Realtime channels use prefix `p28:`”), add it here.
- Code review and lint rules (e.g. path aliases, naming) can enforce structure and naming where possible.

### Pattern Examples

**Backend contracts & adapter layer:**
- **Contracts** live in `lib/api/contracts/` (or equivalent): `AuthContract`, `DataContract`, `RealtimeContract`, `ApiError`, and shared DTOs (Organization, Ministry, Group, Message, Event, etc.). No backend types (e.g. Supabase generated types) outside the adapter.
- **Facade** (e.g. `lib/api/index.ts`) exports `auth`, `data`, `realtime` (and optionally `push`) that implement the contracts. It wires the active adapter (e.g. Supabase) so the app has one entry point.
- **Adapters** (e.g. `lib/api/adapters/supabase/`) implement the contracts using the backend SDK. They map backend responses to DTOs and backend errors to ApiError. Only adapter code imports the backend client.
- **Migration path:** To switch to a custom API, add `lib/api/adapters/customApi/` implementing the same contracts, then swap the facade to use it; app and hooks remain unchanged.

**Good:**
- Table `group_members` (in DB) with columns `group_id`, `user_id`, `role`, `joined_at`; adapter maps to DTO `GroupMember` (camelCase) for the app.
- Screen calls `api.data.getGroupsForMinistry(ministryId)`; no `supabase.from(...)` in the screen.
- Realtime: `api.realtime.subscribe(\`messages:group:${groupId}\`, { onMessage: (payload) => ... })`; cleanup on unmount.
- Error handling: `const userMessage = getUserFacingError(error); setError(userMessage);` (error is ApiError).

**Avoid:**
- Importing `createClient` from `@supabase/supabase-js` (or any backend SDK) in `app/`, `components/`, or UI hooks.
- Mixing backend snake_case and app camelCase without a single mapping in the adapter.
- Ad-hoc channel names or event payloads not defined in the contract.
- Different loading prop names (`loading` vs `isLoading`) in different components.

---

## Project Structure & Boundaries

### Design principles

- **One place for backend:** All backend access lives under `lib/api/` (contracts, adapters, facade). New backends = new adapter folder; app code unchanged.
- **Routes by concern:** `app/` uses Expo Router; tabs are top-level; stack routes grouped by feature (auth, events, groups, messages, admin) so developers can find screens quickly.
- **UI in layers:** `theme/` → `components/primitives/` → `components/patterns/`; no backend or routing in primitives.
- **Discoverability:** Key folders have a single, obvious purpose; nesting is shallow where it doesn’t add clarity.

### Complete project directory structure

```
p28-v2/
├── README.md
├── package.json
├── app.json
├── app.config.ts
├── tsconfig.json
├── .env
├── .env.example
├── .gitignore
├── .easignore
│
├── app/                          # Routes only (Expo Router). No business logic; use hooks + api.
│   ├── _layout.tsx
│   ├── +not-found.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Home
│   │   ├── groups.tsx
│   │   ├── messages.tsx
│   │   └── profile.tsx
│   ├── auth/
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   ├── join/
│   │   └── index.tsx             # Onboarding / join org
│   ├── event/
│   │   └── [id].tsx
│   ├── group/
│   │   └── [id].tsx
│   ├── message/
│   │   └── [id].tsx
│   ├── announcement/
│   │   └── [id].tsx
│   └── admin/
│       ├── _layout.tsx
│       ├── index.tsx             # Org structure
│       └── [orgId]/
│           ├── ministries.tsx
│           └── group/[groupId].tsx
│
├── components/
│   ├── primitives/               # Buttons, inputs, cards, avatars. No api, no router.
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── Avatar.tsx
│   └── patterns/                 # Domain blocks: EventCard, GroupRow, MinistryNav, etc.
│       ├── EventCard.tsx
│       ├── GroupRow.tsx
│       ├── AnnouncementCard.tsx
│       ├── MessagePreviewRow.tsx
│       ├── MinistryNav.tsx
│       ├── AudienceSelector.tsx
│       └── ComposeCard.tsx
│
├── lib/
│   ├── api/                      # Backend boundary. Only folder that may import backend SDKs (in adapters).
│   │   ├── index.ts              # Facade: exports auth, data, realtime (and push). App imports only from here.
│   │   ├── contracts/            # Types and interfaces. No implementation.
│   │   │   ├── auth.ts
│   │   │   ├── data.ts
│   │   │   ├── realtime.ts
│   │   │   ├── errors.ts         # ApiError
│   │   │   └── dto.ts            # Organization, Ministry, Group, Message, Event, etc.
│   │   └── adapters/
│   │       └── supabase/         # Supabase implementation of contracts. Add adapters/customApi/ later.
│   │           ├── index.ts      # Wires auth, data, realtime for this backend
│   │           ├── auth.ts
│   │           ├── data.ts
│   │           └── realtime.ts
│   ├── errors.ts                 # getUserFacingError(ApiError) for UI
│   ├── push.ts                   # Expo push registration, token storage (calls api if stored in backend)
│   └── i18n.ts                   # EN/KR/KH strings and locale
│
├── hooks/                        # App and data-fetching hooks. Use api facade only.
│   ├── useAuth.ts
│   ├── useRealtimeChannel.ts
│   └── ...
│
├── contexts/
│   └── AuthContext.tsx           # Session and user; uses api.auth
│
├── theme/
│   ├── tokens.ts                 # Colors, spacing, typography (design system)
│   └── index.ts
│
├── types/                        # App-only types (e.g. nav params). DTOs live in lib/api/contracts/dto.ts
│   └── ...
│
├── utils/                        # Pure helpers. No api, no React.
│   └── ...
│
├── assets/
│   ├── images/
│   ├── fonts/
│   └── icons/
│
├── supabase/                     # Backend-specific. Migrations only; no app code.
│   └── migrations/
│       ├── 00001_initial.sql
│       └── ...
│
└── __tests__/                    # Co-located *.test.ts(x) next to files, or mirror structure here
    ├── lib/
    │   └── api/
    └── components/
```

### Folder purposes (quick reference)

| Folder | Purpose | Extend by |
|--------|--------|-----------|
| `app/` | Routes and layout only | Add new `(tabs)` or stack routes under `app/` |
| `components/primitives/` | Reusable UI building blocks | New primitive components |
| `components/patterns/` | Domain-specific blocks (cards, rows, selectors) | New pattern components |
| `lib/api/contracts/` | Auth, Data, Realtime interfaces + DTOs + ApiError | New operations in contracts; new DTOs |
| `lib/api/adapters/` | Backend implementations | New adapter folder (e.g. `customApi/`) implementing contracts |
| `lib/api/index.ts` | Single facade; wires active adapter | Switching adapter (e.g. env-driven) |
| `hooks/` | Shared React hooks (auth, realtime, etc.) | New hooks that use `api` only |
| `contexts/` | React context (e.g. auth/session) | New contexts if needed |
| `theme/` | Design tokens | New tokens or theme variants |
| `supabase/migrations/` | DB schema and RLS | New migration files |

### Architectural boundaries

- **API boundary:** The app’s only backend entry point is `lib/api/index.ts`. All auth, data, and realtime go through the facade. External systems (Supabase, future custom API) are used only inside `lib/api/adapters/`.
- **Component boundary:** `app/` and `components/` do not import from `lib/api/adapters/` or any backend SDK. They import from `lib/api` (facade), `hooks/`, and `contexts/`.
- **Data boundary:** DTOs and ApiError are defined in `lib/api/contracts/`. Adapters map backend responses into these types. Rest of the app depends only on contracts and DTOs.

### Requirements → structure mapping

- **Org & hierarchy (FR1–5):** `lib/api/contracts/dto.ts` + `adapters/supabase/data.ts`; `app/admin/` for org/ministry/group structure.
- **Identity & profiles (FR6–10):** `lib/api/contracts/auth.ts` + `adapters/supabase/auth.ts`; `contexts/AuthContext`; `app/(tabs)/profile`, `app/auth/`.
- **Discovery & onboarding (FR11–14):** `app/join/`; `app/(tabs)/groups`; pattern components `GroupRow`, `MinistryNav`.
- **Notifications & push (FR15–17):** `lib/push.ts`; token storage via api if needed; backend trigger (Supabase or custom) for delivery.
- **Messaging (FR18–21):** `app/(tabs)/messages`, `app/message/[id].tsx`; `lib/api/contracts/realtime.ts` + adapter; pattern `MessagePreviewRow`.
- **Content & broadcasts (FR22–26):** `app/(tabs)/index.tsx` (Home); patterns `EventCard`, `AnnouncementCard`, `DailyMomentCard`.
- **Leader & admin (FR27–33):** Same tabs + leader-only UI; `ComposeCard`, `AudienceSelector`; `app/admin/`.
- **Trust, privacy, i18n (FR34–36):** `theme/`, `lib/i18n.ts`; profile and notification prefs in profile/settings (FR34 profile visibility deferred).

### Rationale for revisions

- **`lib/api/` as single backend root:** Contracts, adapters, and facade live together so “where does backend live?” and “where do I add a new backend?” are obvious. New developers open `lib/api/` and see the boundary.
- **Flat stack routes under `app/`:** `app/event/[id].tsx`, `app/group/[id].tsx`, etc., instead of a single `(stack)/` with many files. Easier to find a screen by domain (event, group, message, admin).
- **Contract files split by concern:** `contracts/auth.ts`, `data.ts`, `realtime.ts`, `errors.ts`, `dto.ts` so each contract is easy to locate and extend without touching others.
- **Adapters as one folder per backend:** `adapters/supabase/` (and later `adapters/customApi/`) keeps backend-specific code isolated and makes swapping backends a single place to change (facade).
- **No `components/screens/`:** Screen-level composition stays in `app/` route files; shared screen chunks can live in `components/patterns/` to avoid ambiguity between “screen” and “route.”
- **Tests:** Documented as either co-located `*.test.ts(x)` or `__tests__/` mirror; team picks one and sticks to it for consistency.

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision compatibility:** Technology choices are consistent: Expo (tabs, TypeScript, Expo Router) + Supabase as the MVP backend, with a backend-agnostic contract/adapter layer. No conflicting versions or stack choices. Patterns (naming, structure, DTOs, ApiError) align with the contract-first design and with Expo/Supabase usage confined to adapters.

**Pattern consistency:** Naming (snake_case DB, camelCase DTOs, PascalCase components), structure (single facade, `lib/api/contracts` + `adapters/`), and communication (Realtime channel IDs, ApiError, loading conventions) are defined and consistent. Error handling and loading patterns support the architecture.

**Structure alignment:** Project structure supports the architecture: `lib/api/` holds contracts, adapters, and facade; `app/` is route-only; components are layered (primitives, patterns); boundaries (no backend SDK in UI, single facade) are reflected in the directory layout.

### Requirements Coverage Validation ✅

**Functional requirements coverage:** All 36 FRs are mapped to the architecture. Org/hierarchy (FR1–5) → data contract + RLS + admin routes. Identity/profiles (FR6–10) → auth contract + profiles + profile/join routes. Discovery/onboarding (FR11–14) → join flow + GroupRow, MinistryNav. Notifications/push (FR15–17) → push lib + data contract for tokens/preferences + backend trigger. Messaging (FR18–21) → realtime contract + message routes + MessagePreviewRow. Content/broadcasts (FR22–26) → data contract + Home + EventCard, AnnouncementCard. Leader/admin (FR27–33) → same data contract + leader UI + admin routes. Trust/privacy/i18n (FR34–36) → theme, i18n lib, profile and notification prefs (FR34 deferred). No FR category is missing architectural support.

**Non-functional requirements coverage:** Performance (NFR-P1–P3) → contract/facade and backend choices (Supabase, Realtime); no blocking decisions. Security (NFR-S1–S3) → auth contract, RLS, TLS/encryption at rest. Reliability (NFR-R1–R2) → backend and backup strategy. Accessibility (NFR-A1–A2) → theme and implementation patterns. Scalability (NFR-SC1–SC2) → multi-tenant design, adapter pattern for future backend scale. All NFRs are addressed at the architectural level.

### Implementation Readiness Validation ✅

**Decision completeness:** Critical decisions are documented (backend abstraction, Supabase as MVP, contracts, adapters, facade). Implementation sequence and cross-component dependencies are stated. Versions are implied (Expo, Supabase, TypeScript) where needed; specific version pinning can be done at implementation time.

**Structure completeness:** Project structure is fully specified: `app/`, `components/`, `lib/api/` (contracts, adapters, facade), `hooks/`, `contexts/`, `theme/`, `types/`, `utils/`, `assets/`, `supabase/migrations/`, `__tests__/`. Folder-purpose table and FR→structure mapping are included. Integration points (facade only, no SDK in UI) are clear.

**Pattern completeness:** Naming (DB, contract, code), structure (facade, adapters, no SDK in app), format (DTOs, ApiError, dates), communication (Realtime contract), and process (error handling, loading) are defined. Enforcement guidelines and good/avoid examples are present. Potential conflict points (backend boundary, DTOs, errors) are addressed.

### Gap Analysis Results

**Critical gaps:** None. The architecture is sufficient to start implementation.

**Important gaps:** (1) Push trigger path (Supabase Edge Function vs custom webhook) is TBD in implementation—acceptable for MVP. (2) Testing strategy (co-located vs `__tests__/`) is “choose one and document”—team should decide early. (3) Exact Supabase client/Expo SDK versions can be pinned when scaffolding.

**Nice-to-have:** (1) A short `lib/api/README.md` in the repo describing contracts vs adapters for new developers. (2) Optional OpenAPI or schema export from the data contract for external docs. (3) EAS Update and CI for migrations can be detailed during implementation.

### Validation Issues Addressed

No blocking issues were found. The backend-agnostic design, contract/adapter layer, and project structure were validated as coherent and complete for implementation.

### Architecture Completeness Checklist

**✅ Requirements analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural decisions**
- [x] Critical decisions documented (backend abstraction, Supabase MVP, contracts, adapters)
- [x] Technology stack specified (Expo, TypeScript, Supabase, EAS)
- [x] Integration patterns defined (facade, auth, data, realtime contracts)
- [x] Performance, security, reliability, accessibility, scalability addressed

**✅ Implementation patterns**
- [x] Naming conventions established (DB, contract, code)
- [x] Structure patterns defined (lib/api, app, components, theme)
- [x] Communication patterns specified (Realtime, ApiError, DTOs)
- [x] Process patterns documented (error handling, loading)

**✅ Project structure**
- [x] Complete directory structure defined
- [x] Component and API boundaries established
- [x] Integration points and facade-only rule mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall status:** READY FOR IMPLEMENTATION

**Confidence level:** High — validation confirms coherence, full FR/NFR coverage, and clear patterns and structure for consistent implementation.

**Key strengths:** Backend-agnostic contracts and adapters (easy migration path); single facade and no backend SDK in UI (clear boundary); project structure and folder-purpose table (good discoverability); implementation sequence and enforcement rules (reduced agent conflict).

**Areas for future enhancement:** Pin exact dependency versions at scaffold; document push trigger flow when implemented; add `lib/api/README.md` if helpful; expand monitoring/observability post-MVP.

### Implementation Handoff

**AI agent guidelines:**
- Follow all architectural decisions in this document.
- Use implementation patterns consistently (naming, structure, DTOs, ApiError, loading).
- Respect project structure and boundaries: no backend SDK imports outside `lib/api/adapters/`; app and components use only the facade.
- Use this document as the single source of truth for architectural questions.

**First implementation priority:** Create Expo app (`npx create-expo-app@latest --template tabs`), then define contracts in `lib/api/contracts/` (Auth, Data, Realtime, ApiError, DTOs), then implement the Supabase adapter and facade in `lib/api/`.
