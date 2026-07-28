# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm start            # Start Expo dev server
npm run ios          # Run on iOS simulator
npm run android      # Run on Android emulator

# Testing
npm run test:unit    # Run Jest unit tests only
npm test             # Jest + verify scripts

# Linting & formatting
npm run lint         # ESLint via expo
npm run lint:fix     # Auto-fix lint issues
npm run format       # Prettier write

# Database utilities
npm run db:delete-chats  # Requires SUPABASE_SERVICE_ROLE_KEY in .env
```

**Running a single test file:**

```bash
npx jest lib/api/__tests__/facade.test.ts
```

Tests live in `__tests__/` subdirectories under `lib/`, `app/`, and `components/`. Jest is configured with `ts-jest` and `@/` alias maps to the repo root.

## Environment

Copy `.env.example` to `.env`. Requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (or the non-`EXPO_PUBLIC_` variants).

## Architecture

This is a React Native / Expo church community platform with tabs: Home, Groups, Messages, Notifications, Profile.

### API Layer (strict layering enforced)

```
lib/api/contracts/     ← TypeScript interfaces only (DataContract, AuthContract, RealtimeContract, DTOs)
lib/api/adapters/supabase/  ← Supabase implementation; only place allowed to import @supabase/supabase-js
lib/api/index.ts       ← Facade: app code imports ONLY from here (api.auth, api.data, api.realtime)
```

- **Never import from `lib/api/adapters/`** or `@supabase/supabase-js` in app/component code.
- All server state flows through `hooks/useApiQueries.ts` — React Query hooks wrapping `api.data` calls.
- Query keys are centralized in `lib/api/queryKeys.ts`; always use `queryKeys.*` for cache invalidation.
- `DataContract` returns `T | ApiError` — use `isApiError()` to narrow. The `queryFn` helper in `useApiQueries.ts` converts errors to thrown exceptions for React Query's error state.

### Navigation

Expo Router file-based routing. Root layout (`app/_layout.tsx`) handles auth redirect: unauthenticated → `/auth/sign-in`, authenticated → `/(tabs)`. The `(tabs)` group uses a custom `FloatingTabBar`.

Realtime channel IDs follow the pattern `messages:group:{groupId}`, `messages:discussion:{discussionId}`, `messages:chat:{chatId}`.

### State & Context

- `AuthContext` — session + loading state, via `hooks/useAuth.ts`
- `LocaleContext` — drives `t()` re-renders when locale changes
- `PendingSignUpContext` — holds sign-up data between auth screens
- `QueryClientProvider` — wraps everything for React Query

### i18n

`lib/i18n.ts` exports `t(key, params?)` and `changeLanguage(locale)`. Supported locales: `en`, `ko` (Korean), `km` (Khmer). Always use `t()` for user-visible strings; add keys to all three locale files under `lib/i18n/locales/`.

### Design System

Tokens in `theme/tokens.ts` (colors, spacing, radius, typography, shadow). Aesthetic is "Calm & Glass" — pastel blue primary (`#6E9AC0`), glassmorphism surfaces, generous spacing.

Primitive components (`Button`, `Card`, `Input`, `ListItem`, `Avatar`, `StackedAvatars`, `Badge`, `IconButton`) are exported from `components/primitives/index.ts`. Pattern components (higher-level, composed) live in `components/patterns/`.

### Database

Supabase migrations are in `supabase/migrations/` numbered sequentially. The schema covers: profiles, groups (forums/ministries), discussions + posts + reactions, friendships + friend requests, chats + messages + reactions + folders.
