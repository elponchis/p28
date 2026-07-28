# Coding Standards — p28-v2

Practices for the React Native (Expo) app and Supabase backend. Aligns with `.cursor/rules/coding-standards.mdc` and `CLAUDE.md`. For **what the app implements today**, see [`as-built-snapshot.md`](./as-built-snapshot.md).

---

## 1. Formatting and linting

### Prettier

- **Config:** `.prettierrc` at project root.
- **Rules:** Single quotes, semicolons, 2-space indent, trailing commas (ES5), 100-character print width.
- **Commands:** `npm run format` (write), `npm run format:check` (CI).

### ESLint

- **Config:** `eslint.config.js` (flat config, Expo SDK ~54).
- **Stack:** `eslint-config-expo`, `eslint-plugin-prettier`, `eslint-config-prettier`.
- **Commands:** `npm run lint`, `npm run lint:fix`.

**Conventions:** Imports at top; no code between import groups. Prettier owns formatting; ESLint covers correctness and patterns.

---

## 2. TypeScript

- **Strict mode:** `"strict": true` — avoid `any`. Prefer `interface` for object shapes and API contracts; use `type` for unions and utilities.
- **Paths:** `@/` maps to the repo root (`@/lib/api`, `@/components/primitives`, `@/theme/tokens`). Do not use long relative `../../` chains for internal code.
- **API results:** `DataContract` methods return `T | ApiError`. Narrow with `isApiError(result)` — not `instanceof Error`.
- **DTOs:** camelCase in contracts and app code. Database columns stay snake_case; map only in `lib/api/adapters/supabase/`.
- **Null vs undefined:** Prefer `null` for “no value from API”; use `undefined` for optional fields or “not loaded” where that convention already exists.
- **Dates:** ISO 8601 strings in DTOs; format for display in the UI layer only.

---

## 3. Imports

Order groups strictly:

1. **React** (`react`, `react-native`, …)
2. **External packages** (Expo, navigation, third-party) — alphabetize when it helps readability
3. **Internal** `@/…` modules

---

## 4. React and React Native

- **Components:** Functional components and hooks only. **Default export** for Expo Router screen files; **named exports** for shared components.
- **Screens:** Keep `app/` thin — routing and composition; put logic in hooks, `lib/`, or pattern components.
- **State:** Local `useState`; auth/session via `useAuth` / `AuthContext`; locale via `LocaleContext` and `t()`.
- **Server state:** Use TanStack Query hooks from `hooks/useApiQueries.ts` only in UI — do **not** call `api.data.*` directly from screens or components.
- **Refetch on focus:** When a screen must show fresh server data after navigation, use `refetch()` inside `useFocusEffect` (see existing tab screens).
- **Loading names:** `isLoading` for queries; `creating` / `isSubmitting` (or similar) for mutations — do not mix naming conventions.
- **Immutability:** Never mutate arrays or objects in place when updating React state.
- **Images:** Use `expo-image` (`import { Image } from 'expo-image'`), not React Native’s `Image`.

---

## 5. Internationalization

- All user-visible strings go through `t()` from `@/lib/i18n`.
- Add keys to **all** locale files: `lib/i18n/locales/en.ts`, `ko.ts`, `km.ts`.
- Do not ship raw English (or other) copy in JSX for production UI.

---

## 6. Styling and accessibility

- **Tokens:** `StyleSheet.create` for component styles. Colors, spacing, radius, typography, shadow, `minTouchTarget`, `avatarSizes` — from `@/theme/tokens`. Avoid magic numbers.
- **Design intent:** `design.json` at repo root describes the visual system; prefer tokens in code, but check `design.json` for hierarchy and component intent when building new UI.
- **Aesthetic:** Product direction is “Calm & Glass” (see `CLAUDE.md`) — align with existing primitives and patterns.
- **Accessibility:** Every interactive control needs `accessibilityLabel`; add `accessibilityHint` when the action is not obvious. Respect minimum touch targets from tokens.

---

## 7. Expo Router

- Use `useRouter()`, `useLocalSearchParams()`, and file-based routes under `app/`.
- Layout and auth gating live in `_layout.tsx` files per segment; root layout redirects unauthenticated users to sign-in.

---

## 8. API layer (strict)

```
lib/api/contracts/          ← Types, DataContract, DTOs, ApiError
lib/api/adapters/supabase/  ← Only place that imports @supabase/supabase-js
lib/api/index.ts            ← Facade: api.auth, api.data, api.realtime
```

- **Never** import `lib/api/adapters/` or `@supabase/supabase-js` from `app/`, `components/`, or `hooks/` (except adapter tests).
- **New data operations:** (1) extend `lib/api/contracts/data.ts` (and `dto.ts` as needed), (2) implement in `lib/api/adapters/supabase/data.ts`, (3) add hooks in `hooks/useApiQueries.ts` and keys in `lib/api/queryKeys.ts`, (4) use hooks in UI. Re-export new public types from `lib/api/index.ts` when appropriate.
- **Auth:** `useAuth` or `api.auth` from the facade — same error and session rules as data.
- **Errors:** Use `getUserFacingError()` for messages shown to users. Do not expose raw Supabase or stack traces in UI. Do not swallow errors — log and/or surface; rethrow when the caller must handle.

---

## 9. Realtime

- Channel naming: `messages:group:{groupId}`, `messages:discussion:{discussionId}`, `messages:chat:{chatId}` (and existing project conventions).
- If combining `useFocusEffect` with subscriptions, return a cleanup that unsubscribes on blur.

---

## 10. Supabase, env, and migrations

- **Migrations:** Add a **new** numbered SQL file under `supabase/migrations/` — never edit shipped migration files in place.
- **Secrets:** No API keys or secrets in source. Use `.env` (see `.env.example`); EAS secrets for production builds.
- **Input:** Validate and sanitize user input before API calls or persistence.

---

## 11. Message and discussion attachments

- Normalize and merge attachment payloads with `lib/api/messageAttachments.ts` (DB `attachments` JSON vs legacy `image_urls`).
- Compose UI: `components/patterns/ComposeBar.tsx`, `lib/composeAttachments.ts`; wire uploads through existing mutations and Storage policies (see migrations for chat/discussion attachments).
- Extend `lib/api/__tests__/messageAttachments.test.ts` when changing attachment mapping rules.

---

## 12. Testing

- **Runner:** `npm run test:unit` (Jest + ts-jest); `npm test` includes verify scripts.
- **Placement:** Tests in `__tests__/` **under** `lib/`, `app/`, or `components/` trees (see `package.json` `testMatch`). Example: `lib/api/__tests__/foo.test.ts`.
- **Style:** `describe` / `it`; use `@/` in test imports via Jest `moduleNameMapper`.
- **Adapters:** Prefer testing the facade/contracts; mock Supabase in adapter-focused tests.

**Single file:**

```bash
npx jest lib/api/__tests__/facade.test.ts
```

---

## 13. Project structure

| Area                     | Role                                                     |
| ------------------------ | -------------------------------------------------------- |
| `app/`                   | Routes and layouts only                                  |
| `components/primitives/` | Reusable UI building blocks (no API, no routing)         |
| `components/patterns/`   | Composed domain UI (cards, compose bar, group rows, …)   |
| `hooks/`                 | Shared hooks; `useApiQueries` for server state           |
| `contexts/`              | Providers (auth, locale, pending sign-up, …)             |
| `lib/`                   | API facade, contracts, adapters, i18n, utilities (no UI) |
| `theme/`                 | Tokens                                                   |
| `supabase/migrations/`   | Versioned SQL                                            |
| `docs/`                  | Project knowledge (this file, as-built snapshot)         |

Do not add a `components/screens/` folder or large reusable components inside `app/`.

---

## 14. Quality checklist (before merge)

1. `npm run lint` — fix errors.
2. `npm run format` (or `format:check`) — Prettier clean.
3. `npm run test:unit` (or full `npm test` as required by your workflow).
4. New or changed behavior under `app/` or `lib/`: add or update tests in `__tests__/`.
5. New UI: `accessibilityLabel` / `accessibilityHint`, loading and error states, `t()` for copy.
6. New API surface: contracts → adapter → hooks → `queryKeys`; no direct `api.data` in screens.

---

## References

- [`as-built-snapshot.md`](./as-built-snapshot.md) — implemented features and routes.
- [`../_bmad-output/project-context.md`](../_bmad-output/project-context.md) — condensed rules for AI agents.
- [Expo ESLint](https://docs.expo.dev/guides/using-eslint/)
- [React Native performance](https://reactnative.dev/docs/performance)
- [Supabase JS reference](https://supabase.com/docs/reference/javascript/introduction)
