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

색·크기·간격은 `theme/tokens.ts` 에서만 가져옵니다. 컴포넌트 안에 hex 값이나
임의의 숫자를 직접 적지 않습니다.

```ts
import { color, space, radius, fontSize } from '@/theme/tokens';
```

`theme/tokens.ts` 와 `theme/tokens.json` 은 Claude Design 캔버스에서 자동으로
뽑아낸 파일입니다. **손으로 고치지 마세요.** 값을 바꾸려면 캔버스를 고친 뒤
다시 뽑습니다.

캔버스의 목업은 **값의 출처일 뿐입니다.** UX, 버튼 배치, 화면 흐름, 컴포넌트
구성이 목업과 앱에서 다르면 **언제나 앱이 맞습니다.** 목업을 근거로 버튼을
옮기거나 추가하거나 화면 구조를 바꾸지 마세요.

### 색을 고르는 규칙

- 기본 동작(버튼, 선택된 탭, 링크, 안 읽음 표시)은 `color.brandDeep`. 그 위 글자는 흰색.
- `color.brand` 는 로고와 큰 강조 면적에만. 이 위에 흰 글자를 올리면 대비가 4.5:1을 겨우 넘으니 본문에는 쓰지 않습니다.
- 파란 면 위의 보조 글자는 `color.onBrandMuted`. 흰색에 투명도를 주지 않습니다.
- `color.sand` 계열은 채움색으로만. 그 위 글자는 `color.sandInk`. 검정이나 회색을 올리지 않습니다.
- 한 화면에 주 강조는 하나. 파랑과 앰버를 같은 위계로 나란히 쓰지 않습니다.
- 보조 글자는 `color.muted`. 투명도로 글자를 흐리게 만들지 않습니다.

### 서체

- `font.serif`(Gowun Batang)는 말씀 인용과 그룹 이름에만.
- 나머지는 전부 `font.sans`(IBM Plex Sans KR), 굵기는 400 / 500 / 600 셋뿐입니다.
- 700 이상이나 ALL CAPS는 쓰지 않습니다.

### 모양

- 여백은 `space` 의 값만 씁니다 (0 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48).
- 모서리는 `radius` 의 값만 씁니다 — `xs` 8, `control` 10, `field` 12, `card` 16, `feature` 18, `pill` 999.
- 테두리는 `color.line` 1px. 그림자는 쓰지 않습니다.
- 카드 한쪽에만 두꺼운 테두리를 두는 형태(left border accent)는 쓰지 않습니다.
- 누르는 요소는 최소 44px(`hitSize`).

### 작업 순서

1. 화면을 고치기 전에 `git commit` 을 하나 만듭니다.
2. 고친 뒤 `node scripts/check-theme.mjs` 를 돌립니다.
3. 0건이 될 때까지 고칩니다. 레이아웃은 바꾸지 않고 값만 치환합니다.

### 디자인이 바뀌었을 때

캔버스에서 아트보드를 고쳤다면, 아트보드 파일을 내려받아 순서대로 돌립니다.

```
node scripts/normalize-artboards.mjs <아트보드 폴더>   # 값을 스케일에 맞춤
node scripts/extract-tokens.mjs <아트보드 폴더>        # tokens.ts / tokens.json 재생성
node scripts/check-theme.mjs                          # 소스에서 어긋난 곳 찾기
```

캔버스에 없던 색을 새로 썼다면 `extract-tokens.mjs` 가 "이름 없는 값"으로
보고합니다. 그 파일의 `NAMES` 에 이름을 한 줄 추가한 뒤 다시 돌리세요.

### 이 규칙이 적용되지 않는 곳

- `supabase/functions/**` (서버 코드)
- 사용자가 올린 사진·영상 썸네일 원본
