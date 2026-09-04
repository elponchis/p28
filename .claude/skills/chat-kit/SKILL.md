---
name: chat-kit
description: Scaffold a complete one-to-one and group chat feature into an Expo/React Native +
  Supabase project — messages, attachments, reactions, replies, read receipts, typing indicator
  and push notifications — then adapt it to the host project's theme, i18n and API layer. Use
  when asked to add chat, direct messages, or a messaging feature to an app.
metadata:
  version: '1.1.0'
---

# chat-kit

Copies a working chat feature into this project and adapts it, rather than writing one. The code
in `files/source/` is a snapshot of a chat that runs in production; the job is to graft it onto
whatever conventions this project already has.

## When to use

Asked to add chat, direct messages, or messaging to an Expo / React Native app backed by
Supabase.

**Do not use** if the project is not React Native, or not on Supabase. The data layer assumes
Postgres RLS, Supabase Realtime and Supabase Storage; porting it elsewhere is a rewrite, not a
scaffold, and pretending otherwise wastes the user's time.

## What it brings

Messages with text, photos, video, files and voice notes. Reactions (twelve emoji, several per
person). Replies that jump to the original. KakaoTalk-style unread counts. Typing indicator.
Message requests for people who are not friends. Push notifications, coalesced so a busy group
sends one push rather than one per message. Paste-to-attach, hover actions and Enter-to-send on
desktop web. A switcher listing the conversations someone has open, ordered by who last wrote,
foldable, and remembered across reloads.

## Before touching anything: read the host

The whole value of this kit is that it lands in _this_ project's idiom. Find these first and
write down what you found — the numbered steps below refer back to them.

| Look for             | How                                            | If missing                                                                         |
| -------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| Design tokens        | `theme/`, `constants/Colors`, a `styled` theme | Ask. Do not invent a palette.                                                      |
| Translation function | `t(`, `i18n`, `react-i18next`                  | If the app has no i18n, inline English and say so.                                 |
| API layer            | `lib/api`, a `supabase` client module          | Note whether screens call Supabase directly or through a facade.                   |
| Current user         | `useAuth`, `AuthContext`, `useSession`         | Ask. Chat cannot work without a user id.                                           |
| UI primitives        | `Avatar`, `Button`, `Input`                    | Copy the kit's usages to plain RN components.                                      |
| Routing              | expo-router (file paths) vs React Navigation   | Screens are written for expo-router; converting them is real work — tell the user. |

Read `MANIFEST.md` next. Every file has a role — **copy**, **merge** or **expect** — and merging
a file marked `expect` is how you end up with two theme systems.

## Steps

### 1. Schema

Apply `files/supabase/chat_schema.sql`. Read its header first: it names four prerequisites it
does not create (`auth.users`, `profiles`, `friendships`, `group_members`) and will fail without
them. If the host has no friends-or-groups model, drop the reachability trigger and its two
helpers as the header describes — and tell the user that removes the only server-side limit on
who may be added to a chat.

Create a `chat-images` storage bucket and a policy letting chat members write to it. Attachments
fail silently-ish without one.

### 2. Copy the `copy` files

From `files/source/`, preserving paths. If the host puts screens somewhere else, move them and
fix the route references in `_layout.tsx`.

Two of them are not just files, and are easy to copy and then forget to wire:

- `contexts/OpenChatsContext.tsx` — wrap the app in `OpenChatsProvider`, below whatever provides
  the session, since it keys its storage by user id.
- `components/messages/OpenChatsList.tsx` — render `<OpenChatsList />` wherever the host's
  navigation lives. The source app puts it under the Messages item of its desktop sidebar and
  nowhere else, because a bottom tab bar has no room for it; a host with a persistent side nav on
  every platform can render it everywhere.

The chat screen registers itself with `openChat({ id, title })` once its query resolves — that
call is already in `chat/[id].tsx`, and it is what puts a conversation in the list.

### 3. Merge the `merge` files

Never overwrite. Open the host's version and move only the chat parts in, in this order —
contracts, then adapter, then query keys, then hooks — so each step compiles before the next.

### 4. Rewrite imports

Every copied file imports `@/theme/tokens`, `@/lib/i18n`, `@/lib/dialogs` and friends. Point them
at the host's equivalents from the table above. This is mechanical and it is most of the work.

### 5. Strings

Merge the `message.*` namespace into the host's locales. If the host has one language, keep one.
`lib/i18n/__tests__/translationKeys.test.ts` is included for a reason: `t()` returns the key when
it finds nothing, so a missed string ships as a literal `message.sheetReply` on screen.

### 6. Push notifications (optional)

Deploy the Edge Function: `supabase functions deploy send-chat-message --no-verify-jwt`. It needs
`push_tokens` and `notification_preferences` tables and an EAS project id. Skip the whole step if
the app is web-only — Expo push does not work on web, and saying so up front is better than
shipping a dead button.

### 7. Verify — actually run these

- `npx tsc --noEmit` — expect errors only in `supabase/functions/**`, which is Deno.
- `npx jest` — the bundled tests cover read receipts, upload errors, the push invoke, the
  open-chats ordering rules and the JWT clock-skew retry.
- Build the app. On web, `npx expo export --platform web`.
- Open a chat with two accounts. Read receipts and typing are the two features that look fine in
  a single window and are broken in two.

## Re-skinning

Point `theme/tokens` at the host's palette and most of it follows. What does not:

- `MessageRow.tsx` — bubble shape, alignment, grouping. The file to edit for a different look.
- `OpenChatsList.tsx` — the switcher's chrome: the indent rule, the fold header, the unread pill.
  Its styles are local to the file, so re-skinning it touches nothing else.
- `components/messages/constants.ts` — which emoji, and which four are the quick picks.
- `lib/reactions.ts` — the catalogue. Adding an emoji is a one-file change; the column validates
  shape, not membership.

## Known limits

Say these out loud rather than letting the user find them.

- **No pagination beyond a growing window.** A chat opens on the most recent 50 and grows on
  request — `useChatMessagesQuery` holds that window in a ref and widens it through `loadOlder`,
  because the whole thread is one cache entry that optimistic sends write into by exact key. If
  you move the window into the query key, move those writers to `getQueriesData` in the same
  breath. There is no cursor; a very long thread walks back a page at a time.
- **A deep link to a message outside the loaded window does nothing.**
- **HEVC video needs Cloudinary.** Phone cameras record it, browsers cannot decode it, and
  without `EXPO_PUBLIC_CLOUDINARY_*` set the upload falls back to storing the original — which
  plays as a black rectangle on web.
- **Native clipboard image paste is missing.** Paste-to-attach is web only; native would need
  `expo-clipboard` and a dev-client rebuild.
- **The open-chats switcher assumes a persistent side nav.** It renders inline wherever it is
  put, but there is no drawer or overflow behaviour; on a phone layout the host has to decide
  where — if anywhere — it belongs.
- **The discussion screen in the source project shares components with chat.** Only chat is in
  this kit; ignore discussion references if you meet them.
