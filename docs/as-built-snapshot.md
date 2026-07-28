# p28-v2 — As-built snapshot

_Generated to align BMAD / agent context with the codebase. Last reviewed: 2026-03-24._

## Product shape (MVP)

- **Client:** React Native (0.81.5) + Expo (~54) + Expo Router (~6), TypeScript ~5.9.
- **Backend:** Supabase (Postgres, Auth, Realtime, Storage). App code uses `lib/api` facade only; Supabase client is confined to `lib/api/adapters/supabase/`.
- **Groups:** **Forums** and **ministries** as first-class group types; Super Admin / group admin patterns. Schema: `00011_simplified_groups_schema.sql` and follow-on migrations. No separate org → ministry → nested-group **admin tree** in scope.

## Major feature areas (as implemented)

| Area              | Routes / modules                                 | Notes                                                                                                                                                                                                                            |
| ----------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth & onboarding | `app/auth/*`                                     | Sign-in/up, onboarding.                                                                                                                                                                                                          |
| Home              | `app/(tabs)/index.tsx`                           | Joined groups carousel, upcoming events, announcements (including global/super-admin flows), reflection plate.                                                                                                                   |
| Groups            | `app/(tabs)/groups.tsx`, `app/group/*`           | Browse/search, detail, join/leave, create/edit group, members, leaders, super-admin, banners.                                                                                                                                    |
| Discussions       | `app/group/discussion/*`, `group/[id]/index.tsx` | Threads, posts, reactions; **file/image/video attachments** on discussion posts (storage + `attachments` JSON on posts; migration `00063_chat_discussion_attachments_and_storage.sql`).                                          |
| Events            | `app/group/event/*`                              | List, detail, RSVP, attendees, recurring meetings (per migrations).                                                                                                                                                              |
| Announcements     | `app/group/announcement/*`                       | Group announcements; global announcements (`00062_global_announcements.sql`); in-app notification hooks.                                                                                                                         |
| 1:1 & group chat  | `app/(tabs)/messages/*`                          | Chats, folders, create chat, friends, member management, edit chat; **compose attachments** (photos, videos, files) via `ComposeBar`, `lib/composeAttachments.ts`, `lib/api/messageAttachments.ts`, storage policies in `00063`. |
| Notifications tab | `app/(tabs)/notifications/*`                     | In-app notifications, friend requests entry.                                                                                                                                                                                     |
| Profile           | `app/(tabs)/profile.tsx`, `app/profile/*`        | Profile, edit, language, notifications settings, conduct.                                                                                                                                                                        |
| Push              | `lib/push.ts`, `hooks/useAppIconBadgeSync.ts`    | Expo push registration; Edge Functions under `supabase/functions/` (`send-announcement`, `send-group-event-created`, shared push gateway).                                                                                       |

## Data & API conventions (unchanged)

- Contracts: `lib/api/contracts/*`; DTOs camelCase; DB snake_case in adapter only.
- Server state: React Query hooks in `hooks/useApiQueries.ts`; **do not** call `api.data.*` from screens.
- i18n: `t()` — `en`, `ko`, `km`.
- Theming: `@/theme/tokens`; design direction evolved toward “Calm & Glass” / spacious layout (see `CLAUDE.md` and tech specs in `_bmad-output/implementation-artifacts/`).

## Migrations

- **65** SQL files under `supabase/migrations/` (latest numbered file: `00063_chat_discussion_attachments_and_storage.sql` at time of snapshot).
- Recent notable additions: chat/discussion **attachments** + storage (`00063`), global announcements (`00062`), in-app notifications, group events, friendships, chat folders, push tokens / announcement deliveries.

## Not built or deferred

- **Faith Assistant (epic 8):** Verse lookup / topic flows — **not** present in app routes as of this snapshot.

## How to use this doc

- **BMAD:** Treat this as brownfield truth; pair with `_bmad-output/planning-artifacts/as-built-delta-2026-03-24.md` for traceability to frozen PRD/architecture.
- **Agents:** Read `_bmad-output/project-context.md` first for rules; use this file for **what exists** in the repo.
