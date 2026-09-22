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

Tokens in `theme/tokens.ts` (colors, spacing, radius, typography, shadow). Aesthetic is "Calm & Glass" — deep blue primary (`#002046`) with a warm gold secondary (`#775a19`), glassmorphism surfaces, generous spacing.

Primitive components (`Button`, `Card`, `Input`, `ListItem`, `Avatar`, `StackedAvatars`, `Badge`, `IconButton`) are exported from `components/primitives/index.ts`. Pattern components (higher-level, composed) live in `components/patterns/`.

### Database

Supabase migrations are in `supabase/migrations/` numbered sequentially. The schema covers:

- **Org**: organizations, org_members, ministries, ministry_leads, app_roles, profiles
- **Groups**: groups (forums/ministries), members, admins, member_settings, discussions, events + RSVPs, recurring_meetings
- **Discussions**: discussions + posts + reactions
- **Social**: friendships, friend_requests
- **Chat**: chats, members, messages + reactions, folders + items
- **LMS**: courses, lessons, assignments (+ questions, answer keys), submissions
- **Notifications**: announcements + deliveries, global_announcements, in_app_notifications, push_tokens

## Coding Standards

Apply these practices to every edit in this project.

### TypeScript & imports

- Use strict types; avoid `any`. Prefer `interface` for object shapes and API contracts.
- Use the `@/` path alias for project imports (e.g. `@/lib/api`, `@/components/primitives`, `@/theme/tokens`).
- Order imports: React first, then external packages, then `@/` internal modules.

### Components & UI

- Use functional components and hooks only.
- Use theme tokens from `@/theme/tokens` (colors, spacing, typography, radius, shadow) for styling; avoid magic numbers.
- Use `StyleSheet.create` for local styles; reuse shared styles (e.g. `authScreenStyles`) where they exist.
- For interactive elements (Button, Input, touchables): always set `accessibilityLabel` and, when helpful, `accessibilityHint`.

### API & errors

- Server data: use React Query hooks from `@/hooks/useApiQueries` (e.g. `useProfileQuery`, `useUpdateProfileMutation`). Do not call `api.data.*` directly in screens or components. Auth: use `auth.*` from `@/lib/api` or `useAuth`. Use `getUserFacingError()` for user-facing error messages.
- Never swallow errors: log and/or surface to the user; rethrow when the caller should handle.

### Security & data

- No secrets or API keys in source; use environment/config.
- Validate and sanitize user input before sending to API or persisting.

### Formatting & quality

- Run `npm run format` (Prettier) and `npm run lint` (ESLint) before considering code done; fix any reported issues.
- Add or update unit tests in `__tests__` when adding or changing behavior under `app/` or `lib/`.

### Examples

```tsx
// ✅ Imports: React, then external, then @/
import React, { useState } from 'react';
import { router } from 'expo-router';
import { Button } from '@/components/primitives';
import { useProfileQuery } from '@/hooks/useApiQueries';
import { colors, spacing } from '@/theme/tokens';
```

```tsx
// ✅ Interactive element with a11y
<Button
  title="Continue"
  onPress={handleSubmit}
  accessibilityLabel="Continue"
  accessibilityHint="Continues to the next step"
/>
```

```tsx
// ✅ Server data: use React Query hooks from hooks/useApiQueries
const { data: profile, isError, error, refetch } = useProfileQuery(userId);
const updateMutation = useUpdateProfileMutation();
const errorMessage = isError && error && 'message' in error ? getUserFacingError(error) : null;
```

## TypeScript & React Patterns

- **Default export** for screen components (expo-router); **named exports** for reusable components and utilities.
- **State**: Prefer `useState` for local UI state; keep async data in state and load in `useEffect` or handlers. Use `useMemo` for derived values that depend on props/state.
- **Navigation**: Use `router` from `expo-router` for imperative navigation (`router.push`, `router.replace`, `router.back`); use `useRouter()` when you need the router inside hooks or callbacks.
- **Styles**: Co-locate `StyleSheet.create` with the component; use tokens from `@/theme/tokens`. Pass style overrides via `style` or `containerStyle`/`inputStyle` props when using shared primitives.
- **Async / server state**: Use React Query hooks from `hooks/useApiQueries` for reads and mutations. Use `data`, `isLoading`, `isError`, `refetch` from queries; `mutate`, `isPending` from mutations. Handle errors with `getUserFacingError()`.

## 디자인 — 블루오션 테마

### 색과 크기는 역할 이름으로만

컴포넌트는 `@/theme/tokens` 의 역할 이름만 씁니다 — `colors.primary`,
`colors.onSurfaceVariant`, `spacing.md`, `radius.card`, `typography.body`,
`fontFamily.serif` 등. 컴포넌트 안에 hex 값이나 임의의 숫자를 적지 않습니다.

역할이 가리키는 실제 값은 `theme/tokens.ts` 가 `theme/palette.generated.ts` 에서
가져옵니다. `palette.generated.ts` 는 Claude Design 캔버스에서 자동으로 뽑은
파일이므로 **손으로 고치지 않습니다.**

### 목업보다 앱이 정답

캔버스 목업은 값의 출처일 뿐입니다. UX, 버튼 배치, 화면 흐름, 컴포넌트 구성이
목업과 다르면 **언제나 앱이 맞습니다.** 목업을 근거로 버튼을 옮기거나 추가하거나
화면 구조를 바꾸지 않습니다.

### 역할을 고르는 규칙

- 기본 동작(버튼, 선택된 탭, 링크, 안 읽음 표시) — `colors.primary`, 그 위 글자 `colors.onPrimary`.
- 앰버는 채움으로만 — `colors.secondaryContainer` / `colors.amberSoft`, 그 위 글자 `colors.onSecondaryContainer`.
- 보조 글자 — `colors.onSurfaceVariant`. 투명도로 글자를 흐리게 만들지 않습니다.
- 테두리 — `colors.outlineVariant` 1px. 그림자는 새로 추가하지 않습니다.
- 한 화면에 주 강조는 하나. 파랑과 앰버를 같은 위계로 나란히 쓰지 않습니다.
- `fontFamily.serif` 는 말씀 인용과 그룹 이름에만.
- 홈 화면 섹션 제목도 serif — 에디토리얼 헤더(2px 규칙선 + 영문 라벨 + serif 20 제목)의 일부입니다.
- 누르는 요소는 최소 44px.

### git

`git push`, `merge`, `rebase`, PR 생성은 사용자가 확인하기 전까지 하지 않습니다.

### 디자인이 바뀌었을 때

```
node scripts/normalize-artboards.mjs <아트보드 폴더>
node scripts/extract-tokens.mjs <아트보드 폴더>
node scripts/check-theme.mjs
```
