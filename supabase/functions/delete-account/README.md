# delete-account

Deletes the **caller's own** account (Apple App Store guideline 5.1.1(v): apps that support
account creation must support account/data deletion in-app).

## Invoke

- **Method:** `POST`
- **Headers:** `Authorization: Bearer <user JWT>`, `apikey: <anon or service key>`
- **Body:** none — everything operates on the caller's own `auth.uid()`. There is no way to
  pass another user's id; the `delete_user_account()` RPC it calls takes no id parameter.

**Response (success):** `{ "ok": true }`

**Response (blocked/failed):** `{ "error": "<message>" }` with `400` (blocked by a pre-check —
see below) or `500` (unexpected failure).

## What gets deleted vs. anonymized vs. left alone

- **Deleted:** the `auth.users` row (and everything with an `ON DELETE CASCADE` FK to it —
  profile, group/chat memberships, admin grants, friendships, push tokens, notification
  preferences, reactions, RSVPs, etc.), plus Storage files: avatar (`avatars/{userId}/*`),
  assignment submission files, and any images/attachments the user posted in chats/discussions.
  Groups where the user was the *only* member are deleted outright too.
- **Anonymized (not deleted):** `chat_messages` and `discussion_posts`/`discussions` the user
  authored — body cleared, attachments cleared, `deleted_at` set (same tombstone pattern
  `chat_messages` already uses for its own delete-message feature). This is deliberate: those
  rows are replied-to by other users' content (`chat_messages.parent_message_id`,
  `discussion_posts.discussion_id`), so deleting them outright would cascade away other people's
  messages/replies too.
- **Left alone:** anything the user didn't personally own even if their upload path looks
  user-scoped — group banners and chat/group avatar images belong to the group/chat, not the
  uploader personally.

## Pre-checks (can block the whole operation)

`delete_user_account()` raises an exception — surfaced here as a `400` with the exception
message, which includes the group name(s) — if the caller is the **sole `group_admins` row**
for a group that has **2 or more members**. The user needs to assign another admin (or leave/
delete the group) first. This is checked *before* anything is deleted, so a blocked attempt
changes nothing.

## Deploy

```bash
supabase functions deploy delete-account --no-verify-jwt
```

Same reasoning as `send-announcement`/`send-group-event-created`: this project's JWT signing
keys aren't compatible with the gateway's built-in `verify_jwt`, so auth is validated manually
inside the function via `auth/v1/user` (see `verifyUserFromAuthorizationHeader` in
`_shared/push-gateway.ts`).

## Env

Uses default Edge secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
(anon optional; falls back to service key for `apikey` on the auth check, same as the other two
functions in this project).

## Known follow-ups (not implemented here)

- `discussions`/`discussion_posts` gain a `deleted_at` column (mirroring `chat_messages`), but
  no client-side UI wiring was added for it in this pass — `lib/api` doesn't map it, and the
  discussion screens don't render a tombstone the way the chat screen does for
  `chat_messages.deleted_at`. Until that follow-up UI work happens, an anonymized discussion
  post/topic will render as a blank body rather than a "this content was removed" tombstone.
- Storage files belonging to a *solo-member group* that gets deleted outright (course cover
  images, that group's own assignment submission files from other now-former members, etc.)
  are not cleaned up here — out of scope for this pass, which only covers the specific storage
  targets in the confirmed policy (avatar, the deleted user's own submission files, and their
  own chat/discussion attachments).
