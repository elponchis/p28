---
project_name: 'p28-v2'
user_name: 'Billy'
date: '2026-03-24'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality_rules', 'workflow_rules', 'critical_rules', 'attachments_messaging']
status: 'complete'
---

# Project Context for AI Agents

_Critical rules and patterns AI agents must follow when implementing code in this project. Focused on unobvious details agents might otherwise miss._

---

## Technology Stack & Versions

- React 19.1.0 / React Native 0.81.5 / Expo ~54.0.33
- Expo Router ~6.0.23 (file-based routing, all screens under `app/`)
- TypeScript ~5.9.2 — strict mode enabled, `@/` path alias maps to project root
- `@supabase/supabase-js` ^2.95.3 — **adapter layer only** (never import directly in `app/`, `components/`, `hooks/`, `contexts/`)
- `@tanstack/react-query` — server state caching; use hooks from `hooks/useApiQueries` (never call `api.data.*` directly in screens)
- `react-native-reanimated` ~4.1.1 — available for animations
- `expo-image` 55.0.5 — use instead of React Native's `<Image>`
- `expo-image-picker`, `expo-document-picker`, `expo-file-system`, `expo-video` / `expo-video-thumbnails` — used for message and discussion **attachments** (pick, upload, preview)
- `@expo/vector-icons` ^15.0.3 — available for icons
- Jest ^29.7.0 + ts-jest ^29.2.5 for testing
- ESLint ^9.39.2 + Prettier ^3.8.1 — run `npm run lint` and `npm run format` before done

## Language-Specific Rules (TypeScript)

- `strict: true` — no `any`; use `interface` for object shapes and API contracts
- Always use `@/` path alias for internal imports (never relative `../../`)
- Import order: React → external packages → `@/` internal modules
- Error detection: `isApiError(result)` not `instanceof Error`; display via `getUserFacingError(error)`
- Never swallow errors — log and/or surface to user; rethrow when caller should handle
- `null` for "no value from API"; `undefined` only for "not loaded" or optional TS fields
- Dates are ISO 8601 strings in DTOs; format for display in UI layer only — never store formatted strings
- DTOs use camelCase throughout the app; DB columns are snake_case (mapping happens in adapter only)

## Framework-Specific Rules (React Native / Expo)

- Functional components and hooks only; default export for route files, named exports for components
- `app/` is routes only — no business logic; use hooks and `api.*`
- Data fetching: use React Query hooks from `hooks/useApiQueries` (e.g. `useProfileQuery`, `useUpdateProfileMutation`). These wrap `api.data.*` and provide caching, deduplication, and invalidation. Use `refetch()` in `useFocusEffect` when a screen needs fresh data on focus.
- Navigation: `useRouter()` for programmatic nav; `useLocalSearchParams()` for route params
- Loading state naming: `isLoading` for fetch, `creating`/`isSubmitting` for mutations — do not mix conventions
- State updates must be immutable — never mutate arrays or objects directly
- Styling: `StyleSheet.create` only; all values from `@/theme/tokens` (colors, spacing, radius, typography, shadow, avatarSizes, minTouchTarget) — no magic numbers
- Use `expo-image`'s `<Image>` not React Native's `<Image>`
- All user-facing strings via `t()` from `@/lib/i18n` — never hardcode English in UI
- Every interactive element needs `accessibilityLabel`; add `accessibilityHint` when intent isn't obvious
- Minimum touch target: `minTouchTarget` (44px) from tokens
- Before building any new UI component or screen, read the relevant section of `design.json` to match the design language — do not invent visual styles from scratch

### Message and discussion attachments

- **DTOs and merging:** Use `lib/api/messageAttachments.ts` for normalizing DB `attachments` JSON vs legacy `image_urls`, and for payloads when creating messages/posts.
- **Compose UI:** `components/patterns/ComposeBar.tsx` and `lib/composeAttachments.ts` handle pending picks, size/type checks, and upload flow; chat screen `app/(tabs)/messages/chat/[id].tsx` and discussion screens wire them to `api.data` via existing React Query mutations.
- **Storage:** Buckets and RLS live in Supabase migrations (e.g. `00063_chat_discussion_attachments_and_storage.sql`); new attachment types or limits require **new migration** + contract updates — do not bypass RLS with client-only URLs.
- **Tests:** Extend `lib/api/__tests__/messageAttachments.test.ts` when changing attachment merge or mapping rules.

## Testing Rules

- Tests go in `__tests__/` subdirectory **within** the feature folder (e.g. `lib/api/__tests__/`, `components/patterns/__tests__/`) — not co-located next to the source file
- Jest testMatch covers `lib/`, `app/`, and `components/` — keep tests within those trees
- Use `@/` path alias in test files (mapped via `moduleNameMapper`)
- Add or update tests when adding or changing behavior in `app/` or `lib/`
- Mock the Supabase client in adapter tests — never test Supabase internals directly
- Test what the facade exposes (contracts), not implementation details of the adapter
- `npm run test:unit` for Jest only; `npm run test` also runs verify scripts

## Code Quality & Style Rules

**Naming:**
- Component files: `PascalCase.tsx` matching the component name; hook/util files: `camelCase.ts`
- Components: `PascalCase`; hooks: `camelCase` with `use` prefix; types/interfaces: `PascalCase`
- DB tables: `snake_case` plural; DB columns/FKs: `snake_case`; DTOs: `camelCase`
- Realtime channel IDs: `scope:entity:{id}` (e.g. `messages:group:{groupId}`)

**Structure:**
- `components/primitives/` — reusable UI building blocks (no API, no routing)
- `components/patterns/` — domain blocks (EventCard, GroupRow, etc.)
- `hooks/` — shared hooks; `useApiQueries` for server state (queries/mutations via React Query); `useAuth` for session
- `utils/` — pure helpers with no API or React dependencies
- `supabase/migrations/` — numbered SQL files (e.g. `00003_description.sql`)
- Never put components in `app/`; no `components/screens/` folder
- Export from `index.ts` barrel files in each folder

**Formatting:**
- `npm run format` (Prettier) and `npm run lint` (ESLint) must pass before code is done
- `npm run lint:fix` and `npm run format` to auto-fix issues

**Design System Reference:**
- `design.json` at project root is the source of truth for the visual design system (Pastel Productivity)
- `@/theme/tokens` is derived from it — use tokens for values, but consult `design.json` for component intent, visual hierarchy, spacing rationale, and motion/animation guidelines
- When building new UI components or screens, read the relevant section of `design.json` first — do not invent visual styles from scratch

## Development Workflow Rules

- New DB changes: add a new numbered SQL file in `supabase/migrations/` (e.g. `00004_description.sql`) — never modify existing migration files
- Apply migrations immediately using the Supabase MCP `apply_migration` tool — do not leave migrations unapplied
- Supabase URL + anon key live in `.env` (never committed); document new env vars in `.env.example`
- No secrets or API keys in source; use EAS secrets for production
- To add a new data operation: (1) add to `lib/api/contracts/data.ts`, (2) implement in `lib/api/adapters/supabase/data.ts`, (3) add query/mutation hooks in `hooks/useApiQueries.ts` and keys in `lib/api/queryKeys.ts`, (4) call via the hooks in screens — never call `api.data.*` directly in `app/` or `components/`
- `lib/api/index.ts` is the single backend entry point — `api.auth`, `api.data`, `api.realtime`

## Critical Don't-Miss Rules

**Never do these:**
- Import `@supabase/supabase-js` (or any backend SDK) outside `lib/api/adapters/supabase/`
- Do not call `api.data.*` directly in screens — use React Query hooks from `hooks/useApiQueries`; call `refetch()` in `useFocusEffect` when screen needs fresh data on focus
- Pass raw error messages to UI — always use `getUserFacingError(error)`
- Hardcode English strings in UI — always use `t()` from `@/lib/i18n`
- Use magic numbers in styles — always use `@/theme/tokens`
- Import `<Image>` from `react-native` — use `expo-image`
- Modify existing migration files — always add a new numbered one
- Define a new DTO only in the adapter — define in `lib/api/contracts/dto.ts` first

**Easy-to-miss details:**
- RLS enforces authorization on the backend — don't replicate role checks in UI; handle `ApiError` instead
- New types/interfaces in `lib/api/contracts/dto.ts` must also be re-exported from `lib/api/index.ts`
- If using `useFocusEffect` with a realtime subscription, return a cleanup function to unsubscribe on blur. For React Query, call `refetch()` in the focus effect when the screen needs fresh data.
- `isLoading` = fetch in progress; `creating`/`isSubmitting` = mutation in progress — never mix these names

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code in this project
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge during implementation

**For Humans:**
- Keep this file lean and focused on agent needs
- Update when technology stack or patterns change
- Review periodically to remove rules that become obvious over time

_Last Updated: 2026-03-24 — see also `docs/as-built-snapshot.md`._
